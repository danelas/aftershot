import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {stripe, PLANS, isPlanId} from '@/lib/stripe';

// GET /api/account?t=<upload_token>
// There is no login in AfterShot — the upload token IS the credential, the same
// one that guards /u/<token>. Returns only what the owner's own dashboard needs.
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get('t') || '').trim();
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});

  const sb = serviceClient();
  const {data: c, error} = await sb
    .from('customers')
    .select('id, business_name, email, upload_token, plan, status, logo_url, rating, review_count, google_place_id, stripe_customer_id')
    .eq('upload_token', token)
    .maybeSingle();

  if (error) return NextResponse.json({error: error.message}, {status: 500});
  if (!c) return NextResponse.json({error: 'not found'}, {status: 404});

  // plan is stored as "trial:starter" | "starter" | ... — split it apart.
  const onTrial = (c.plan || '').startsWith('trial');
  const tierId = (c.plan || '').replace('trial:', '');
  const tier = isPlanId(tierId) ? PLANS[tierId] : null;

  // Trial end lives in Stripe, not our DB. Best-effort: never fail the page.
  let trialEnd: number | null = null;
  let hasCard = false;
  if (c.stripe_customer_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const s = stripe();
      const subs = await s.subscriptions.list({customer: c.stripe_customer_id, status: 'all', limit: 5});
      const live = subs.data.find((x) => ['trialing', 'active', 'past_due'].includes(x.status));
      if (live) {
        trialEnd = live.trial_end ?? null;
        hasCard = Boolean(live.default_payment_method);
      }
    } catch (e: any) {
      console.error('account: stripe lookup failed', e?.message);
    }
  }

  const jobs = await sb
    .from('jobs')
    .select('id', {count: 'exact', head: true})
    .eq('customer_id', c.id);

  const base = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
  return NextResponse.json({
    businessName: c.business_name,
    email: c.email,
    uploadUrl: `${base}/u/${c.upload_token}`,
    studioUrl: `${base}/studio?t=${c.upload_token}`,
    logoUrl: c.logo_url,
    rating: c.rating,
    reviewCount: c.review_count,
    linkedToGoogle: Boolean(c.google_place_id),
    planName: tier?.name ?? null,
    planLabel: tier?.label ?? null,
    planVideos: tier?.videos ?? null,
    onTrial,
    status: c.status,
    trialEnd,
    hasCard,
    jobCount: jobs.count ?? 0,
  });
}
