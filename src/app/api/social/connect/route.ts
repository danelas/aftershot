import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {
  ensureProfile,
  startConnect,
  uploadPostConfigured,
  isSocialPlatform,
  ProfileLimitError,
} from '@/lib/uploadPost';

// GET /api/social/connect?platform=instagram&t=<upload_token>
// Sends the owner to upload-post's OAuth screen for ONE platform and lands them
// back on /account. A plain link (not fetch + redirect) so the browser carries
// them through the handshake without us proxying any platform credentials.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const token = (q.get('t') || '').trim();
  const platform = (q.get('platform') || '').trim();
  const base = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
  const back = (status: string, extra = '') =>
    NextResponse.redirect(`${base}/account?connect_status=${status}${extra}`, {status: 303});

  if (!token || !isSocialPlatform(platform)) return back('error');
  if (!uploadPostConfigured()) return back('unconfigured');

  const sb = serviceClient();
  const {data: c} = await sb
    .from('customers')
    .select('id, upload_token, upload_post_profile')
    .eq('upload_token', token)
    .maybeSingle();
  if (!c) return back('error');

  // The upload token doubles as the upload-post username: unique, stable, and
  // not personally identifying.
  const username = c.upload_post_profile || c.upload_token;

  try {
    await ensureProfile(username);
    if (c.upload_post_profile !== username) {
      await sb.from('customers').update({upload_post_profile: username}).eq('id', c.id);
    }
    const url = await startConnect({
      platform,
      username,
      redirectUrl: `${base}/account?connect_status=success&platform=${platform}`,
    });
    return NextResponse.redirect(url, {status: 303});
  } catch (e: any) {
    console.error('social connect failed', {token, platform, message: e?.message});
    if (e instanceof ProfileLimitError) return back('limit');
    return back('error');
  }
}
