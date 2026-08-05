import {NextResponse} from 'next/server';
import {authServerClient} from '@/lib/supabase-server';
import {serviceClient, findCustomerByEmail} from '@/lib/supabase';

// Where Google / Facebook land after the customer approves.
//
// Cookies can only be written from a route handler, so the PKCE exchange has to
// happen here rather than in a server component.
export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  // PUBLIC_BASE_URL is set in dev too (it points at production), which would
  // bounce a local sign-in onto the live site. The request's own origin is the
  // right answer whenever we're running locally.
  const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
  const base = (local ? '' : process.env.PUBLIC_BASE_URL) || url.origin;
  const code = url.searchParams.get('code');

  // The customer hit "Cancel" on the provider's screen, or Supabase rejected
  // the handshake. Say so instead of dumping them on an empty account page.
  if (url.searchParams.get('error') || !code) {
    return NextResponse.redirect(new URL('/account?signin=failed', base));
  }

  const sb = await authServerClient();
  const {error} = await sb.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(new URL('/account?signin=failed', base));

  const {data: {user}} = await sb.auth.getUser();
  if (!user) return NextResponse.redirect(new URL('/account?signin=failed', base));

  const token = await resolveUploadToken(user.id, user.email || '');

  // Signed in fine, but there's no AfterShot account behind this email yet.
  // /start reads the session and prefills the form from it.
  if (!token) return NextResponse.redirect(new URL('/start?signedin=1', base));

  // ?t= is what every page and API route already understands, and /account
  // writes it to localStorage on arrival — so one sign-in restores the token
  // session too, and the nav/upload links work as they always have.
  return NextResponse.redirect(new URL(`/account?t=${token}`, base));
}

// Match the auth identity to a customer row. The link is made once, on the
// first sign-in, by matching the provider-verified email against the address
// they signed up with — the same thing /api/account/recover already trusts to
// mail out the token, so this grants nothing new, just faster.
async function resolveUploadToken(userId: string, email: string) {
  const sb = serviceClient();

  const {data: linked} = await sb
    .from('customers')
    .select('upload_token')
    .eq('auth_user_id', userId)
    .maybeSingle();
  if (linked) return (linked as {upload_token: string}).upload_token;

  if (!email) return null;
  const existing = await findCustomerByEmail(email);
  if (!existing) return null;

  // Best-effort: a failed write costs a re-match by email next time, which is
  // exactly what just happened. Not worth failing the sign-in over.
  await sb
    .from('customers')
    .update({auth_user_id: userId})
    .eq('id', existing.id)
    .is('auth_user_id', null);

  return existing.upload_token;
}
