// Transactional email via Resend.
//
// Raw fetch rather than the SDK, with an explicit User-Agent: Resend sits
// behind Cloudflare, which 403s requests that don't send one.
//
// Every send is best-effort — a signup must never fail because email did.

const KEY = () => process.env.RESEND_API_KEY?.trim() || '';
const FROM = () => process.env.REMINDER_FROM_EMAIL?.trim() || 'AfterShot <hello@theaftershot.com>';

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ok: boolean; error?: string}> {
  if (!KEY()) {
    console.warn('email skipped (RESEND_API_KEY unset):', opts.subject, '->', opts.to);
    return {ok: false, error: 'not configured'};
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KEY()}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (compatible; AfterShot/1.0; +https://theaftershot.com)',
      },
      body: JSON.stringify({
        from: FROM(),
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text,
      }),
    });
    if (!res.ok) {
      const body = await res.text();
      console.error('resend send failed', res.status, body.slice(0, 400));
      return {ok: false, error: `${res.status}`};
    }
    return {ok: true};
  } catch (e: any) {
    console.error('resend send threw', e?.message);
    return {ok: false, error: e?.message};
  }
}

const shell = (heading: string, body: string, cta?: {href: string; label: string}) => `
<div style="background:#070b12;padding:32px 16px;font-family:system-ui,-apple-system,'Segoe UI',sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#0e1520;border:1px solid #1e2a3a;border-radius:16px;padding:32px 28px;color:#e6edf7">
    <p style="margin:0 0 22px;font-size:19px;font-weight:800;letter-spacing:-.02em">After<span style="color:#38bdf8">Shot</span></p>
    <h1 style="margin:0 0 14px;font-size:22px;line-height:1.3;color:#fff">${heading}</h1>
    ${body}
    ${cta ? `<p style="margin:26px 0 0"><a href="${cta.href}" style="display:inline-block;background:#0ea5e9;color:#fff;text-decoration:none;padding:13px 22px;border-radius:12px;font-weight:700;font-size:15px">${cta.label}</a></p>` : ''}
    <p style="margin:28px 0 0;font-size:12.5px;color:#6b7d94">
      Questions? Just reply to this email.
    </p>
  </div>
</div>`;

// Sent the moment a business finishes /start. This is the only copy of their
// upload link that survives closing the tab.
export function welcomeEmail(businessName: string, uploadUrl: string) {
  return {
    subject: 'Your AfterShot upload link',
    text:
      `You're set up, ${businessName}.\n\n` +
      `This is your upload link — it's the whole routine:\n${uploadUrl}\n\n` +
      `Open it on your phone and add it to your home screen. After every job, tap it and drop a before + after photo. We turn them into a reel and post it for you.\n\n` +
      `Keep this email — it's the only copy of your link.\n\n— AfterShot`,
    html: shell(
      `You're set up, ${escapeHtml(businessName)}.`,
      `<p style="margin:0 0 16px;color:#9fb0c7;line-height:1.65;font-size:15px">
         This is your upload link — and it's the whole routine. Open it on your
         phone and <b style="color:#e6edf7">Add to Home Screen</b>. After every
         job, tap it and drop a before + after. We do the rest.
       </p>
       <p style="margin:0;padding:13px 15px;background:#070b12;border:1px solid #1e2a3a;border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13.5px;color:#38bdf8;word-break:break-all">${escapeHtml(uploadUrl)}</p>
       <p style="margin:18px 0 0;color:#6b7d94;font-size:13px;line-height:1.6">
         Keep this email — it's the only copy of your link.
       </p>`,
      {href: uploadUrl, label: 'Open my upload link'},
    ),
  };
}

// Sent from the Stripe webhook once the card is on file and the trial is live.
export function trialStartedEmail(planName: string, amountLabel: string, uploadUrl: string | null) {
  return {
    subject: `Your AfterShot ${planName} trial has started`,
    text:
      `Your 7-day free trial is live on ${planName}.\n\n` +
      `You won't be charged until it ends, then it's ${amountLabel}. Cancel anytime before then and you pay nothing.\n\n` +
      (uploadUrl ? `Your upload link:\n${uploadUrl}\n\n` : '') +
      `— AfterShot`,
    html: shell(
      'Your free trial is live.',
      `<p style="margin:0 0 16px;color:#9fb0c7;line-height:1.65;font-size:15px">
         You're on <b style="color:#e6edf7">${escapeHtml(planName)}</b>. Nothing is
         charged for 7 days — after that it's ${escapeHtml(amountLabel)}, and you can
         cancel anytime before then and pay nothing.
       </p>
       ${uploadUrl
        ? `<p style="margin:0;padding:13px 15px;background:#070b12;border:1px solid #1e2a3a;border-radius:10px;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13.5px;color:#38bdf8;word-break:break-all">${escapeHtml(uploadUrl)}</p>`
        : ''}`,
      uploadUrl ? {href: uploadUrl, label: 'Open my upload link'} : undefined,
    ),
  };
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!,
  );
}
