import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {
  getConnectedAccounts,
  getFacebookPages,
  disconnectAll,
  uploadPostConfigured,
  SOCIAL_PLATFORMS,
} from '@/lib/uploadPost';

async function findCustomer(token: string) {
  const sb = serviceClient();
  const {data} = await sb
    .from('customers')
    .select('id, upload_token, upload_post_profile')
    .eq('upload_token', token)
    .maybeSingle();
  return data;
}

// GET /api/social/status?t=<upload_token>
// Which of the customer's socials are linked. Never throws the page — an
// upload-post outage should degrade to "unknown", not break /account.
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get('t') || '').trim();
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});

  if (!uploadPostConfigured()) {
    return NextResponse.json({configured: false, accounts: [], platforms: SOCIAL_PLATFORMS});
  }

  const c = await findCustomer(token);
  if (!c) return NextResponse.json({error: 'not found'}, {status: 404});

  const username = c.upload_post_profile || c.upload_token;
  try {
    const accounts = await getConnectedAccounts(username);
    // Only worth a second call once Facebook is actually linked.
    const facebookPages = accounts.some((a) => a.platform === 'facebook')
      ? await getFacebookPages(username)
      : [];
    return NextResponse.json({configured: true, accounts, facebookPages, platforms: SOCIAL_PLATFORMS});
  } catch (e: any) {
    console.error('social status failed', {token, message: e?.message});
    return NextResponse.json({
      configured: true,
      accounts: [],
      facebookPages: [],
      unavailable: true,
      platforms: SOCIAL_PLATFORMS,
    });
  }
}

// DELETE /api/social/status?t=<upload_token>
// Unlinks every connected account. upload-post has no per-platform unlink, so
// this is all-or-nothing by their design, not by ours.
export async function DELETE(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get('t') || '').trim();
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});
  if (!uploadPostConfigured()) return NextResponse.json({error: 'not configured'}, {status: 503});

  const c = await findCustomer(token);
  if (!c) return NextResponse.json({error: 'not found'}, {status: 404});

  try {
    await disconnectAll(c.upload_post_profile || c.upload_token);
    return NextResponse.json({ok: true});
  } catch (e: any) {
    console.error('social disconnect failed', {token, message: e?.message});
    return NextResponse.json({error: 'Could not disconnect. Try again.'}, {status: 502});
  }
}
