import {NextRequest, NextResponse} from 'next/server';
import {findCustomerByEmail} from '@/lib/supabase';
import {sendEmail, recoveryEmail} from '@/lib/email';

// POST /api/account/recover  {email}
// The whole password-reset flow, for an app with no passwords: mail the upload
// link back to the address that owns it. Without this, anyone who lost the
// welcome email and cleared their browser had no way back in but support.
//
// Always answers {ok:true} whether or not the account exists — the response must
// not turn this into a "does this business use AfterShot?" oracle. The link only
// ever goes to the address already on the account, so knowing an email gets you
// nothing you couldn't already do by emailing that person.
export async function POST(req: NextRequest) {
  const {email} = await req.json().catch(() => ({}) as {email?: string});
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return NextResponse.json({error: 'Enter the email you signed up with.'}, {status: 400});
  }

  try {
    const c = await findCustomerByEmail(email);
    if (c) {
      const base = process.env.PUBLIC_BASE_URL || new URL(req.url).origin;
      await sendEmail({
        to: c.email,
        ...recoveryEmail(c.business_name, `${base}/account?t=${c.upload_token}`),
      });
    }
  } catch (e: any) {
    // Same generic answer on failure — but log it, or a broken Resend key looks
    // identical to "no account" and nobody ever finds out.
    console.error('recover failed', e?.message);
  }

  return NextResponse.json({ok: true});
}
