import {NextRequest, NextResponse} from 'next/server';
import Stripe from 'stripe';
import {stripe, planPriceId, isPlanId, TRIAL_DAYS} from '@/lib/stripe';

// Creates a trialing subscription and returns the SetupIntent client secret so
// the card can be collected on-page. No charge until the 7-day trial ends.
export async function POST(req: NextRequest) {
  const {email, businessName, plan} = await req.json().catch(() => ({}));
  const planId = isPlanId(plan) ? plan : 'pro';
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({error: 'A valid email is required.'}, {status: 400});
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({error: 'Payments are not configured yet.'}, {status: 503});
  }
  try {
    const s = stripe();
    const found = await s.customers.list({email, limit: 1});
    const customer =
      found.data[0] ??
      (await s.customers.create({email, name: businessName || undefined}));

    // One live subscription per customer — reuse instead of double-billing.
    const existing = await s.subscriptions.list({customer: customer.id, status: 'all', limit: 10});
    const active = existing.data.find((x) => ['trialing', 'active', 'past_due'].includes(x.status));
    let sub = active ?? null;
    if (sub && !sub.pending_setup_intent) {
      return NextResponse.json({alreadySubscribed: true});
    }
    // Returning visitor who picked a different tier before ever adding a card:
    // move the unconfirmed subscription to the newly chosen price.
    if (sub) {
      const wantPrice = await planPriceId(planId);
      const item = sub.items.data[0];
      if (item && item.price.id !== wantPrice) {
        sub = await s.subscriptions.update(sub.id, {
          items: [{id: item.id, price: wantPrice}],
          proration_behavior: 'none',
          expand: ['pending_setup_intent'],
        });
      }
    }
    sub ??= await s.subscriptions.create({
      customer: customer.id,
      items: [{price: await planPriceId(planId)}],
      trial_period_days: TRIAL_DAYS,
      payment_behavior: 'default_incomplete',
      payment_settings: {save_default_payment_method: 'on_subscription'},
      trial_settings: {end_behavior: {missing_payment_method: 'cancel'}},
      expand: ['pending_setup_intent'],
    });
    const si =
      typeof sub.pending_setup_intent === 'string'
        ? await s.setupIntents.retrieve(sub.pending_setup_intent)
        : (sub.pending_setup_intent as Stripe.SetupIntent | null);
    if (!si?.client_secret) throw new Error('No setup intent on subscription');
    return NextResponse.json({
      clientSecret: si.client_secret,
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
      subscriptionId: sub.id,
    });
  } catch (e: any) {
    // Log enough to diagnose from `vercel logs` — a bare message left the last
    // failed signup with no trace of why.
    console.error('subscribe error', {
      email,
      plan: planId,
      type: e?.type,
      code: e?.code,
      status: e?.statusCode,
      message: e?.message,
    });
    return NextResponse.json({error: 'Could not start checkout. Try again.'}, {status: 500});
  }
}
