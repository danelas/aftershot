import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {getConnectedAccounts, uploadPostConfigured, SOCIAL_PLATFORMS} from '@/lib/uploadPost';

// GET /api/social/status?t=<upload_token>
// Which of the customer's socials are linked. Never throws the page — an
// upload-post outage should degrade to "unknown", not break /account.
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get('t') || '').trim();
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});

  if (!uploadPostConfigured()) {
    return NextResponse.json({configured: false, accounts: [], platforms: SOCIAL_PLATFORMS});
  }

  const sb = serviceClient();
  const {data: c} = await sb
    .from('customers')
    .select('upload_token, upload_post_profile')
    .eq('upload_token', token)
    .maybeSingle();
  if (!c) return NextResponse.json({error: 'not found'}, {status: 404});

  const username = c.upload_post_profile || c.upload_token;
  try {
    const accounts = await getConnectedAccounts(username);
    return NextResponse.json({configured: true, accounts, platforms: SOCIAL_PLATFORMS});
  } catch (e: any) {
    console.error('social status failed', {token, message: e?.message});
    return NextResponse.json({configured: true, accounts: [], unavailable: true, platforms: SOCIAL_PLATFORMS});
  }
}
