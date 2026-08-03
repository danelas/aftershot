import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';

// GET /api/studio/clips?t=<upload_token>
// The customer's profile + their rendered reels, for the Studio picker.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('t') || '';
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});
  const sb = serviceClient();
  const {data: customer} = await sb
    .from('customers')
    .select('id, business_name, trade, service_area, phone, rating, review_count, price_from, brand_kit, logo_url, upload_token')
    .eq('upload_token', token)
    .maybeSingle();
  if (!customer) return NextResponse.json({error: 'not found'}, {status: 404});
  const {data: jobs} = await sb
    .from('jobs')
    .select('id, created_at, reel_url, status')
    .eq('customer_id', customer.id)
    .not('reel_url', 'is', null)
    .order('created_at', {ascending: false})
    .limit(30);
  return NextResponse.json({
    customer: {
      businessName: customer.business_name,
      trade: customer.trade,
      serviceArea: customer.service_area,
      phone: customer.phone,
      rating: customer.rating != null ? Number(customer.rating) : 0,
      reviewCount: customer.review_count ?? 0,
      priceFrom: customer.price_from,
      // Fall back to the signup logo when the Studio kit has none of its own.
      // These were separate fields with no sync, so a logo uploaded at signup
      // looked like it had never been uploaded once you opened Studio.
      brandKit: (() => {
        const kit = {...(customer.brand_kit || {})} as {logoUrl?: string};
        if (!kit.logoUrl && customer.logo_url) kit.logoUrl = customer.logo_url;
        return Object.keys(kit).length ? kit : null;
      })(),
    },
    clips: (jobs || []).map((j) => ({id: j.id, url: j.reel_url, createdAt: j.created_at})),
  });
}
