'use client';

// Owner dashboard. Finds the account from ?t=<token> (so the emailed link works
// on any device) or from this browser's remembered token.
import {Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {loadToken, saveToken, clearToken} from '@/lib/session';

type Account = {
  businessName: string; email: string; uploadUrl: string; studioUrl: string;
  rating: number | null; reviewCount: number | null; linkedToGoogle: boolean;
  planName: string | null; planLabel: string | null; planVideos: string | null;
  onTrial: boolean; status: string; trialEnd: number | null; hasCard: boolean;
  jobCount: number;
};

export default function AccountPage() {
  return (
    <Suspense>
      <AccountInner />
    </Suspense>
  );
}

function AccountInner() {
  const qsToken = useSearchParams().get('t');
  const [token, setToken] = useState<string | null>(null);
  const [acct, setAcct] = useState<Account | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'none' | 'error'>('loading');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t = qsToken || loadToken();
    if (!t) { setState('none'); return; }
    setToken(t);
    // Arriving with ?t= (e.g. from the welcome email) also signs this browser in.
    if (qsToken) saveToken(qsToken);
    fetch(`/api/account?t=${encodeURIComponent(t)}`)
      .then(async (r) => {
        if (r.status === 404) { clearToken(); setState('none'); return; }
        if (!r.ok) throw new Error('failed');
        const d = await r.json();
        setAcct(d); saveToken(t, d.businessName); setState('ready');
      })
      .catch(() => setState('error'));
  }, [qsToken]);

  if (state === 'loading') {
    return <Shell><p className="acct-muted">Loading your account…</p></Shell>;
  }

  if (state === 'none') {
    return (
      <Shell>
        <h1>No account on this device</h1>
        <p className="acct-muted">
          AfterShot doesn&apos;t use passwords — your upload link is your account.
          Open the link we emailed you and you&apos;ll land right back here.
        </p>
        <a href="/start" className="btn checkout-btn" style={{textDecoration: 'none'}}>Set up AfterShot</a>
      </Shell>
    );
  }

  if (state === 'error' || !acct) {
    return (
      <Shell>
        <h1>Couldn&apos;t load your account</h1>
        <p className="acct-muted">Please refresh, or email hello@theaftershot.com and we&apos;ll sort it out.</p>
      </Shell>
    );
  }

  const trialDays = acct.trialEnd
    ? Math.max(0, Math.ceil((acct.trialEnd * 1000 - Date.now()) / 86400000))
    : null;

  return (
    <Shell>
      <h1 style={{marginBottom: 4}}>{acct.businessName}</h1>
      <p className="acct-muted" style={{marginTop: 0}}>{acct.email}</p>

      <div className="acct-card">
        <p className="acct-label">POST A JOB</p>
        <p className="acct-muted" style={{marginTop: 0}}>
          This is the whole routine — open it on your phone, add it to your home
          screen, and drop a before + after after every job.
        </p>
        <a href={acct.uploadUrl} className="btn checkout-btn" style={{textDecoration: 'none', marginTop: 4}}>
          Upload a before &amp; after
        </a>
        <button
          className="acct-copy"
          onClick={() => { navigator.clipboard?.writeText(acct.uploadUrl); setCopied(true); setTimeout(() => setCopied(false), 1800); }}
        >
          {copied ? '✓ Copied' : 'Copy my upload link'}
        </button>
      </div>

      <div className="acct-card">
        <p className="acct-label">PLAN</p>
        {/* Legacy rows store plan as bare "trial" with no tier, so only show
            these when we actually know the tier — an empty "—" row is noise. */}
        {acct.planName && (
          <div className="acct-row"><span>Plan</span><b>{acct.planName}{acct.planLabel ? ` · ${acct.planLabel}` : ''}</b></div>
        )}
        {acct.planVideos && <div className="acct-row"><span>Included</span><b>{acct.planVideos}</b></div>}
        <div className="acct-row">
          <span>Status</span>
          <b>{acct.onTrial ? (trialDays != null ? `Free trial — ${trialDays} day${trialDays === 1 ? '' : 's'} left` : 'Free trial') : acct.status}</b>
        </div>
        <div className="acct-row"><span>Card on file</span><b>{acct.hasCard ? 'Yes' : 'No'}</b></div>
        {!acct.hasCard && (
          <p className="acct-muted" style={{fontSize: 13, marginBottom: 0}}>
            No card, so nothing can bill you. When you want to keep going past the
            trial, email <a href="mailto:hello@theaftershot.com" style={{color: 'var(--brand-bright)'}}>hello@theaftershot.com</a> and
            we&apos;ll send a secure link to add one.
          </p>
        )}
      </div>

      <div className="acct-card">
        <p className="acct-label">YOUR REELS</p>
        <div className="acct-row"><span>Jobs posted</span><b>{acct.jobCount}</b></div>
        <div className="acct-row">
          <span>Google rating</span>
          <b>{acct.linkedToGoogle && acct.rating != null ? `★ ${acct.rating} (${acct.reviewCount})` : acct.linkedToGoogle ? 'Linked — no reviews yet' : 'Not linked'}</b>
        </div>
        <a href={acct.studioUrl} className="btn btn-ghost checkout-btn" style={{textDecoration: 'none'}}>
          Open Studio
        </a>
      </div>

      <button className="acct-signout" onClick={() => { clearToken(); location.href = '/'; }}>
        Forget this device
      </button>
    </Shell>
  );
}

function Shell({children}: {children: React.ReactNode}) {
  return (
    <main className="checkout">
      <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
      <div className="checkout-card acct-wrap">{children}</div>
    </main>
  );
}
