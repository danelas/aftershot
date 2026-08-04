import {NextRequest, NextResponse} from 'next/server';
import {serviceClient, findCustomerByEmail} from '@/lib/supabase';
import {sendEmail, welcomeEmail, recoveryEmail} from '@/lib/email';

// POST /api/onboard  (multipart form)
// Creates a customer from the signup form and returns their upload link.
// Logo is uploaded server-side (service role) so we don't need storage RLS.
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({error: 'bad form'}, {status: 400});

  const str = (k: string) => (form.get(k)?.toString() || '').trim();
  const businessName = str('businessName');
  const email = str('email');
  if (!businessName || !email) {
    return NextResponse.json({error: 'Business name and email are required'}, {status: 400});
  }

  // Rating/reviews can now be hand-typed (Places fallback), so reject junk
  // rather than sending NaN to Postgres and 500ing the whole signup.
  const num = (k: string) => {
    const n = Number(str(k));
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  // Re-running /start is what people actually do when they've lost their link,
  // and a plain insert gave them a second account with a second token — the
  // first one's jobs, plan and connected socials silently orphaned. Treat it as
  // recovery instead: mail the existing link and change nothing.
  //
  // Deliberately does NOT return the token or the business name in the response.
  // Typing a stranger's email would otherwise hand you their account, since the
  // token is the only credential there is.
  const existing = await findCustomerByEmail(email);
  if (existing) {
    const base = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
    const {ok} = await sendEmail({
      to: existing.email,
      ...recoveryEmail(existing.business_name, `${base}/account?t=${existing.upload_token}`),
    });
    return NextResponse.json({ok: true, existing: true, emailed: ok});
  }

  const sb = serviceClient();
  const {data: customer, error} = await sb
    .from('customers')
    .insert({
      business_name: businessName,
      email,
      trade: str('trade') || 'pressure_washing',
      phone: str('phone') || null,
      service_area: str('serviceArea') || null,
      handle: str('handle') || null,
      price_from: str('priceFrom') || null,
      brand_color: str('brandColor') || '#0EA5E9',
      cta_text: str('ctaText') || 'Free Quote',
      licensed_insured: str('licensedInsured') === 'true',
      google_place_id: str('placeId') || null,
      rating: num('rating'),
      review_count: num('reviewCount'),
    })
    .select('id, upload_token')
    .single();
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  // Optional logo → public 'reels' bucket.
  const logo = form.get('logo');
  if (logo && typeof logo !== 'string' && logo.size > 0) {
    const ext = (logo.name.split('.').pop() || 'png').toLowerCase();
    const key = `logos/${customer.upload_token}.${ext}`;
    const buf = Buffer.from(await logo.arrayBuffer());
    const {error: upErr} = await sb.storage
      .from('reels')
      .upload(key, buf, {contentType: logo.type || 'image/png', upsert: true});
    if (!upErr) {
      const url = sb.storage.from('reels').getPublicUrl(key).data.publicUrl;
      await sb.from('customers').update({logo_url: url}).eq('id', customer.id);
    }
  }

  await sb.from('reminders').upsert({customer_id: customer.id});

  const base = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
  const uploadUrl = `${base}/u/${customer.upload_token}`;

  // The on-screen link is the only other copy, so this is what saves anyone who
  // closes the tab. Best-effort: never fail a signup over email.
  const {ok: emailed} = await sendEmail({to: email, ...welcomeEmail(businessName, uploadUrl)});

  return NextResponse.json({
    ok: true,
    uploadToken: customer.upload_token,
    uploadUrl,
    emailed,
  });
}
