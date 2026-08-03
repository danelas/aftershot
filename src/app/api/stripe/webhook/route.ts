import {NextRequest, NextResponse} from 'next/server';
import Stripe from 'stripe';
import {stripe, PLANS} from '@/lib/stripe';
import {serviceClient} from '@/lib/supabase';
import {sendEmail, trialStartedEmail} from '@/lib/email';

// Stripe → app sync. Keeps customers.plan/status current so the worker knows
// who to render for. Safe before Supabase exists: verifies, logs, acks.
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({error: 'webhook not configured'}, {status: 503});

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(
      await req.text(),
      req.headers.get('stripe-signature') || '',
      secret,
    );
  } catch {
    return NextResponse.json({error: 'bad signature'}, {status: 400});
  }

  if (event.type.startsWith('customer.subscription.')) {
    const sub = event.data.object as Stripe.Subscription;
    try {
      await syncSubscription(sub);
    } catch (e: any) {
      // Ack anyway — Stripe retries 4xx/5xx and the state will converge on the
      // next subscription event; don't let a missing DB cause retry storms.
      console.error('webhook sync skipped:', e?.message);
    }
    // A subscription is 'trialing' from the moment it's created, before any
    // card exists — so the confirmation waits for a payment method to land.
    if (sub.default_payment_method) {
      await announceTrial(typeof sub.customer === 'string' ? sub.customer : sub.customer.id)
        .catch((e) => console.error('trial email skipped:', e?.message));
    }
  }

  // Fires exactly once when the card is saved, whichever events this endpoint
  // is subscribed to. Deduped against the Stripe customer's metadata.
  if (event.type === 'setup_intent.succeeded') {
    const si = event.data.object as Stripe.SetupIntent;
    const cid = typeof si.customer === 'string' ? si.customer : si.customer?.id;
    if (cid) await announceTrial(cid).catch((e) => console.error('trial email skipped:', e?.message));
  }

  return NextResponse.json({received: true});
}

// Send the "your trial is live" email once per customer.
async function announceTrial(customerId: string) {
  const s = stripe();
  const cust = await s.customers.retrieve(customerId);
  if ((cust as Stripe.DeletedCustomer).deleted) return;
  const c = cust as Stripe.Customer;
  if (!c.email || c.metadata?.trial_email_sent === '1') return;

  const subs = await s.subscriptions.list({customer: customerId, status: 'all', limit: 5});
  const sub = subs.data.find((x) => ['trialing', 'active'].includes(x.status));
  if (!sub) return;

  const lookup = sub.items.data[0]?.price?.lookup_key;
  const tier = Object.entries(PLANS).find(([, p]) => p.lookupKey === lookup)?.[1] ?? PLANS.pro;

  let uploadUrl: string | null = null;
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const {data} = await serviceClient()
      .from('customers').select('upload_token').eq('email', c.email).limit(1).maybeSingle();
    const base = process.env.PUBLIC_BASE_URL || 'https://theaftershot.com';
    if (data?.upload_token) uploadUrl = `${base}/u/${data.upload_token}`;
  }

  const {ok} = await sendEmail({
    to: c.email,
    ...trialStartedEmail(tier.name, tier.label, uploadUrl),
  });
  // Only latch on a real send, so a transient Resend failure can retry on the
  // next event rather than silently swallowing the only confirmation.
  if (ok) await s.customers.update(customerId, {metadata: {...c.metadata, trial_email_sent: '1'}});
}

async function syncSubscription(sub: Stripe.Subscription) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('supabase not configured; subscription', sub.id, sub.status);
    return;
  }
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const lookup = sub.items.data[0]?.price?.lookup_key;
  const tier = (Object.entries(PLANS).find(([, p]) => p.lookupKey === lookup)?.[0]) ?? 'pro';
  const plan = sub.status === 'trialing' ? `trial:${tier}` : tier;
  const status =
    ['trialing', 'active'].includes(sub.status) ? 'active'
    : ['past_due', 'unpaid', 'paused'].includes(sub.status) ? 'paused'
    : 'canceled';

  const sb = serviceClient();
  const patch = {
    stripe_customer_id: customerId,
    stripe_subscription_id: sub.id,
    plan,
    status,
  };
  // Row may predate billing (created at /start), so match on stripe id first,
  // then fall back to the Stripe customer's email.
  const byId = await sb.from('customers').update(patch).eq('stripe_customer_id', customerId).select('id');
  if (byId.data?.length) return;
  const cust = await stripe().customers.retrieve(customerId);
  const email = (cust as Stripe.Customer).email;
  if (email) await sb.from('customers').update(patch).eq('email', email);
}
