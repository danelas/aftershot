import Stripe from 'stripe';

// Lazy so importing this module doesn't throw at build time when env is unset.
let _stripe: Stripe | null = null;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  _stripe ??= new Stripe(key);
  return _stripe;
}

export const PLAN = {
  lookupKey: 'aftershot_monthly_49',
  amount: 4900,
  currency: 'usd',
  trialDays: 7,
  label: '$49/mo',
};

// Self-provisioning price: find by lookup_key, create on first ever call.
// Avoids hand-creating products in the dashboard for every environment.
let _priceId: string | null = null;
export async function monthlyPriceId(): Promise<string> {
  if (_priceId) return _priceId;
  if (process.env.STRIPE_PRICE_MONTHLY) return (_priceId = process.env.STRIPE_PRICE_MONTHLY);
  const s = stripe();
  const existing = await s.prices.list({lookup_keys: [PLAN.lookupKey], limit: 1});
  if (existing.data[0]) return (_priceId = existing.data[0].id);
  const price = await s.prices.create({
    lookup_key: PLAN.lookupKey,
    unit_amount: PLAN.amount,
    currency: PLAN.currency,
    recurring: {interval: 'month'},
    product_data: {name: 'AfterShot'},
  });
  return (_priceId = price.id);
}
