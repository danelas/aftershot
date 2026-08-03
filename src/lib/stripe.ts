import Stripe from 'stripe';

// Lazy so importing this module doesn't throw at build time when env is unset.
let _stripe: Stripe | null = null;
export function stripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');
  _stripe ??= new Stripe(key);
  return _stripe;
}

export const TRIAL_DAYS = 7;

export type PlanId = 'starter' | 'pro' | 'max';

// Tiers differ by volume only — every plan gets the full product.
export const PLANS: Record<PlanId, {
  lookupKey: string; amount: number; label: string; videos: string; name: string;
}> = {
  starter: {lookupKey: 'aftershot_starter_19', amount: 1900, label: '$19/mo', videos: '6 reels / month', name: 'Starter'},
  pro:     {lookupKey: 'aftershot_pro_49',     amount: 4900, label: '$49/mo', videos: '20 reels / month', name: 'Pro'},
  max:     {lookupKey: 'aftershot_max_99',     amount: 9900, label: '$99/mo', videos: 'Unlimited reels', name: 'Max'},
};

export function isPlanId(x: unknown): x is PlanId {
  return x === 'starter' || x === 'pro' || x === 'max';
}

// Self-provisioning prices: find by lookup_key, create on first ever call.
// Avoids hand-creating products in the dashboard for every environment.
const _priceIds: Partial<Record<PlanId, string>> = {};
export async function planPriceId(plan: PlanId): Promise<string> {
  const cached = _priceIds[plan];
  if (cached) return cached;
  const s = stripe();
  const {lookupKey, amount} = PLANS[plan];
  const existing = await s.prices.list({lookup_keys: [lookupKey], limit: 1});
  if (existing.data[0]) return (_priceIds[plan] = existing.data[0].id);
  const price = await s.prices.create({
    lookup_key: lookupKey,
    unit_amount: amount,
    currency: 'usd',
    recurring: {interval: 'month'},
    product_data: {name: `AfterShot ${PLANS[plan].name}`},
  });
  return (_priceIds[plan] = price.id);
}
