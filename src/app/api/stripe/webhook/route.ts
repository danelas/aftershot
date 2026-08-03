import {NextRequest, NextResponse} from 'next/server';
import Stripe from 'stripe';
import {stripe} from '@/lib/stripe';
import {serviceClient} from '@/lib/supabase';

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
  }
  return NextResponse.json({received: true});
}

async function syncSubscription(sub: Stripe.Subscription) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('supabase not configured; subscription', sub.id, sub.status);
    return;
  }
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const plan = sub.status === 'trialing' ? 'trial' : 'founding';
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
