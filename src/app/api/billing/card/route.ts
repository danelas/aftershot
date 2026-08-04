import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {stripe} from '@/lib/stripe';

// POST /api/billing/card  {t: <upload_token>}
// Returns a Stripe Checkout URL that collects a card and nothing else
// (mode: 'setup' — no charge is made here). This is what someone clicks to keep
// going past the free trial; before it existed the account page told them to
// email support, which is a terrible thing to do to the one moment a customer
// has decided to pay you.
//
// The card is attached to the live subscription by the webhook on
// setup_intent.succeeded — see api/stripe/webhook.
export async function POST(req: NextRequest) {
  const {t} = await req.json().catch(() => ({}) as {t?: string});
  const token = (t || '').trim();
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({error: 'Billing is not configured yet.'}, {status: 503});
  }

  const sb = serviceClient();
  const {data: c} = await sb
    .from('customers')
    .select('id, business_name, email, upload_token, stripe_customer_id')
    .eq('upload_token', token)
    .maybeSingle();
  if (!c) return NextResponse.json({error: 'not found'}, {status: 404});

  try {
    const s = stripe();

    // The row can predate billing (created at /start), so fall back to the
    // email — and only create a Stripe customer as a last resort.
    let cid = c.stripe_customer_id as string | null;
    if (!cid) {
      const found = await s.customers.list({email: c.email, limit: 1});
      cid = found.data[0]?.id ?? (await s.customers.create({email: c.email, name: c.business_name})).id;
      await sb.from('customers').update({stripe_customer_id: cid}).eq('id', c.id);
    }

    // A card with no subscription behind it bills nobody and confuses everybody.
    // Send them to pick a plan first; that flow already starts the trial.
    const subs = await s.subscriptions.list({customer: cid, status: 'all', limit: 10});
    const live = subs.data.find((x) => ['trialing', 'active', 'past_due'].includes(x.status));
    if (!live) return NextResponse.json({needsPlan: true});

    const base = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
    const back = `${base}/account?t=${encodeURIComponent(token)}`;
    const session = await s.checkout.sessions.create({
      mode: 'setup',
      customer: cid,
      // Which subscription to put the card on, read back by the webhook. The
      // customer may have older canceled subs, so don't make it guess.
      setup_intent_data: {metadata: {subscription_id: live.id}},
      success_url: `${back}&card=added`,
      cancel_url: back,
    });

    if (!session.url) throw new Error('no checkout url');
    return NextResponse.json({url: session.url});
  } catch (e: any) {
    console.error('card setup failed', {token, type: e?.type, code: e?.code, message: e?.message});
    return NextResponse.json({error: 'Could not open the card form. Try again.'}, {status: 500});
  }
}
