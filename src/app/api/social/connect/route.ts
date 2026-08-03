import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {ensureProfile, createConnectUrl, uploadPostConfigured} from '@/lib/uploadPost';

// POST /api/social/connect  { t: <upload_token> }
// Mints the hosted upload-post linking URL for this customer, creating their
// profile on first use. Returns { url } for the browser to navigate to.
export async function POST(req: NextRequest) {
  if (!uploadPostConfigured()) {
    return NextResponse.json(
      {error: 'Social posting isn’t switched on yet. Email hello@theaftershot.com and we’ll connect your accounts by hand.'},
      {status: 503},
    );
  }

  const body = await req.json().catch(() => null);
  const token = (body?.t || '').toString().trim();
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});

  const sb = serviceClient();
  const {data: c, error} = await sb
    .from('customers')
    .select('id, business_name, logo_url, upload_token, upload_post_profile')
    .eq('upload_token', token)
    .maybeSingle();
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  if (!c) return NextResponse.json({error: 'not found'}, {status: 404});

  // The upload token doubles as the upload-post username: unique, stable, and
  // not personally identifying.
  const username = c.upload_post_profile || c.upload_token;

  try {
    await ensureProfile(username);
    if (c.upload_post_profile !== username) {
      await sb.from('customers').update({upload_post_profile: username}).eq('id', c.id);
    }

    const base = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
    const url = await createConnectUrl({
      username,
      redirectUrl: `${base}/account?connected=1`,
      businessName: c.business_name,
      logoUrl: c.logo_url,
    });
    return NextResponse.json({url});
  } catch (e: any) {
    console.error('social connect failed', {token, message: e?.message});
    return NextResponse.json({error: 'Could not start the connection. Please try again.'}, {status: 502});
  }
}
