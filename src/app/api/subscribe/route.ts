import {NextRequest, NextResponse} from 'next/server';
import {stripe, planPriceId, isPlanId, TRIAL_DAYS} from '@/lib/stripe';

// Starts a 7-day trial with NO card. The subscription is created straight into
// `trialing` with no payment method attached, and
// trial_settings.missing_payment_method = 'cancel' means Stripe cancels it at
// trial end instead of issuing an invoice — so a trial can never turn into a
// charge on its own. Collecting a card is a separate, later, opt-in step.
export async function POST(req: NextRequest) {
  const {email, businessName, plan} = await req.json().catch(() => ({}));
  const planId = isPlanId(plan) ? plan : 'pro';
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({error: 'A valid email is required.'}, {status: 400});
  }
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({error: 'Trials are not configured yet.'}, {status: 503});
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

    if (active) {
      // Already on a trial or a paid plan. Let them switch tier while still
      // trialing, but never create a second subscription.
      const wantPrice = await planPriceId(planId);
      const item = active.items.data[0];
      if (active.status === 'trialing' && item && item.price.id !== wantPrice) {
        const moved = await s.subscriptions.update(active.id, {
          items: [{id: item.id, price: wantPrice}],
          proration_behavior: 'none',
        });
        return NextResponse.json({ok: true, trialEnd: moved.trial_end, switched: true});
      }
      return NextResponse.json({
        ok: true,
        alreadySubscribed: active.status !== 'trialing',
        trialEnd: active.trial_end,
      });
    }

    const sub = await s.subscriptions.create({
      customer: customer.id,
      items: [{price: await planPriceId(planId)}],
      trial_period_days: TRIAL_DAYS,
      // The safety net: no card at trial end => cancel, never invoice.
      trial_settings: {end_behavior: {missing_payment_method: 'cancel'}},
    });

    return NextResponse.json({ok: true, trialEnd: sub.trial_end});
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
    return NextResponse.json({error: 'Could not start your trial. Try again.'}, {status: 500});
  }
}
