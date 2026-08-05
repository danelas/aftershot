import {NextResponse} from 'next/server';
import {authUser} from '@/lib/supabase-server';
import {serviceClient, findCustomerByEmail} from '@/lib/supabase';

// GET /api/account/resolve
// "Which account does the signed-in Google/Facebook user own?" — returns the
// upload token, which is what the rest of the app is keyed on.
//
// This is what makes the sign-in stick: the cookie session outlives a cleared
// localStorage, so /account can recover the token without another email.
export const dynamic = 'force-dynamic';

export async function GET() {
  const user = await authUser();
  if (!user) return NextResponse.json({signedIn: false}, {status: 401});

  const sb = serviceClient();
  const {data: linked} = await sb
    .from('customers')
    .select('upload_token, business_name')
    .eq('auth_user_id', user.id)
    .maybeSingle();
  if (linked) {
    const c = linked as {upload_token: string; business_name: string};
    return NextResponse.json({signedIn: true, token: c.upload_token, businessName: c.business_name});
  }

  const existing = user.email ? await findCustomerByEmail(user.email) : null;
  if (!existing) {
    // Signed in, but no AfterShot account yet — /start finishes the job.
    return NextResponse.json({signedIn: true, token: null, email: user.email ?? null});
  }

  await sb
    .from('customers')
    .update({auth_user_id: user.id})
    .eq('id', existing.id)
    .is('auth_user_id', null);

  return NextResponse.json({
    signedIn: true,
    token: existing.upload_token,
    businessName: existing.business_name,
  });
}
