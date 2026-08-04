'use client';

// Owner dashboard. Finds the account from ?t=<token> (so the emailed link works
// on any device) or from this browser's remembered token.
import {Suspense, useCallback, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {loadToken, saveToken, clearToken} from '@/lib/session';
import JobUploader from '../components/JobUploader';
import {PLATFORM_META, PLATFORM_LABEL, ALL_PLATFORMS, connectHref} from '../components/PlatformBrand';

type Account = {
  businessName: string; email: string; uploadUrl: string; studioUrl: string;
  rating: number | null; reviewCount: number | null; linkedToGoogle: boolean;
  planName: string | null; planLabel: string | null; planVideos: string | null;
  onTrial: boolean; status: string; trialEnd: number | null; hasCard: boolean;
  jobCount: number; logoUrl: string | null;
};

export default function AccountPage() {
  return (
    <Suspense>
      <AccountInner />
    </Suspense>
  );
}

function AccountInner() {
  const params = useSearchParams();
  const qsToken = params.get('t');
  // Set by Stripe's success_url. The webhook that records the card may not have
  // landed yet, so this is what tells them it worked — not acct.hasCard.
  const cardAdded = params.get('card') === 'added';
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
        <RecoverCard />
        <a href="/start" className="btn btn-ghost checkout-btn" style={{textDecoration: 'none'}}>
          I&apos;m new — set up AfterShot
        </a>
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
      <BusinessName
        token={token!}
        name={acct.businessName}
        onSaved={(businessName) => {
          setAcct((a) => (a ? {...a, businessName} : a));
          saveToken(token!, businessName);
        }}
      />

      {/* The thing people came here to do goes first. */}
      <JobUploader token={token!} studioUrl={acct.studioUrl} />

      <div className="acct-card">
        <p className="acct-label">ON YOUR PHONE</p>
        <p className="acct-muted" style={{marginTop: 0}}>
          Add this link to your phone&apos;s home screen and you can post a job in
          two taps, straight from the driveway.
        </p>
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
        {/* There's no login, so this is the address that can recover the
            account — it belongs on the record, just not in the headline. */}
        <div className="acct-row"><span>Email</span><b>{acct.email}</b></div>
        {!acct.hasCard && <CardCard token={token!} justAdded={cardAdded} />}
      </div>

      <LogoCard
        token={token!}
        logoUrl={acct.logoUrl}
        onChange={(logoUrl) => setAcct((a) => (a ? {...a, logoUrl} : a))}
      />

      <SocialCard token={token!} />

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

// Keeping going past the trial used to mean emailing support and waiting for a
// link — a manual step in the exact moment someone has decided to pay. This is
// a Stripe Checkout session in setup mode: it saves a card and charges nothing.
function CardCard({token, justAdded}: {token: string; justAdded: boolean}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [needsPlan, setNeedsPlan] = useState(false);

  if (justAdded) {
    return (
      <p className="acct-muted" style={{fontSize: 13, marginBottom: 0}}>
        ✓ Card saved — it can take a moment to show above. Your plan now continues
        automatically when the trial ends.
      </p>
    );
  }

  async function add() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/billing/card', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({t: token}),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not open the card form.');
      // No plan behind the card yet — pick one first, that flow starts the trial.
      if (d.needsPlan) { setNeedsPlan(true); setBusy(false); return; }
      window.location.href = d.url;
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
      setBusy(false);
    }
  }

  if (needsPlan) {
    return (
      <>
        <p className="acct-muted" style={{fontSize: 13}}>
          You don&apos;t have a plan running yet — choose one and your 7 free days start there.
        </p>
        <a href={`/subscribe?t=${encodeURIComponent(token)}`} className="btn checkout-btn" style={{textDecoration: 'none'}}>
          Choose a plan
        </a>
      </>
    );
  }

  return (
    <>
      <p className="acct-muted" style={{fontSize: 13}}>
        No card, so nothing can bill you — and when the trial ends, it just stops.
        Add one to keep your reels going. You&apos;re not charged until the trial is over.
      </p>
      <button className="btn checkout-btn" onClick={add} disabled={busy}>
        {busy ? 'Opening…' : 'Add a card'}
      </button>
      {err && <p className="checkout-msg">{err}</p>}
    </>
  );
}

// The password-reset box for an app with no passwords. New phone, cleared
// browser, deleted welcome email — before this, all three ended at "email
// support", which for a $19/mo trade business means they just don't come back.
function RecoverCard() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [err, setErr] = useState('');

  async function send() {
    if (!email.includes('@')) { setErr('Enter the email you signed up with.'); return; }
    setState('sending'); setErr('');
    try {
      const r = await fetch('/api/account/recover', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({email}),
      });
      if (!r.ok) throw new Error('failed');
      setState('sent');
    } catch {
      setErr('Couldn’t send that just now. Try again, or email hello@theaftershot.com.');
      setState('idle');
    }
  }

  if (state === 'sent') {
    return (
      <div className="acct-card">
        <p className="acct-label">CHECK YOUR EMAIL</p>
        <p className="acct-muted" style={{margin: 0}}>
          If <b style={{color: 'var(--ink)'}}>{email}</b> has an AfterShot account, your link is on
          its way. Open it on this device and you&apos;re signed back in.
        </p>
      </div>
    );
  }

  return (
    <div className="acct-card">
      <p className="acct-label">LOST YOUR LINK?</p>
      <p className="acct-muted" style={{marginTop: 0}}>
        Enter the email you signed up with and we&apos;ll send it again.
      </p>
      <input
        className="checkout-input"
        type="email"
        placeholder="you@business.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send()}
      />
      <button className="btn checkout-btn" onClick={send} disabled={state === 'sending'}>
        {state === 'sending' ? 'Sending…' : 'Email me my link'}
      </button>
      {err && <p className="checkout-msg">{err}</p>}
    </div>
  );
}

// Signup takes a logo but it's optional, and there was no way to add or swap
// one later — so anyone who skipped it had permanently unbranded reels.
function LogoCard({
  token, logoUrl, onChange,
}: {token: string; logoUrl: string | null; onChange: (u: string | null) => void}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function upload(file: File) {
    setBusy(true); setErr('');
    try {
      const fd = new FormData();
      fd.append('t', token);
      fd.append('logo', file);
      const r = await fetch('/api/account/logo', {method: 'POST', body: fd});
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not save that image.');
      onChange(d.logoUrl);
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
    } finally { setBusy(false); }
  }

  async function remove() {
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/account/logo?t=${encodeURIComponent(token)}`, {method: 'DELETE'});
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not remove it.');
      onChange(null);
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
    } finally { setBusy(false); }
  }

  return (
    <div className="acct-card">
      <p className="acct-label">YOUR LOGO</p>
      {logoUrl ? (
        <>
          <div className="acct-logo-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Your logo" className="acct-logo" />
          </div>
          <p className="acct-muted" style={{fontSize: 13}}>
            Shown on every reel&apos;s end card, and available as a watermark in Studio.
          </p>
        </>
      ) : (
        <p className="acct-muted" style={{marginTop: 0}}>
          No logo yet — your reels end with just your business name. Add one and
          it appears on every reel from here on.
        </p>
      )}

      <label className="btn checkout-btn" style={{cursor: busy ? 'default' : 'pointer', opacity: busy ? 0.6 : 1}}>
        {busy ? 'Saving…' : logoUrl ? 'Replace logo' : 'Upload a logo'}
        <input
          type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
          style={{display: 'none'}} disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ''; }}
        />
      </label>
      {logoUrl && (
        <button className="acct-signout" style={{marginTop: 10}} onClick={remove} disabled={busy}>
          Remove logo
        </button>
      )}
      {err && <p className="checkout-msg">{err}</p>}
    </div>
  );
}

// The name is stamped on every reel's end card, so a signup typo rides along on
// every video. Editing it in place beats emailing support about it.
function BusinessName({
  token, name, onSaved,
}: {token: string; name: string; onSaved: (name: string) => void}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  async function save() {
    const next = draft.trim();
    if (!next || next === name) { setEditing(false); return; }
    setBusy(true); setErr('');
    try {
      const r = await fetch(`/api/account?t=${encodeURIComponent(token)}`, {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({businessName: next}),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not save that name.');
      onSaved(d.businessName);
      setEditing(false);
    } catch (e: any) {
      setErr(e?.message || 'Could not save that name.');
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <h1 style={{marginBottom: 4, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap'}}>
        {name}
        <button
          type="button"
          className="name-edit"
          onClick={() => { setDraft(name); setErr(''); setEditing(true); }}
        >
          Edit
        </button>
      </h1>
    );
  }

  return (
    <div style={{marginBottom: 4}}>
      <input
        className="onb-input"
        value={draft}
        maxLength={60}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') save();
          if (e.key === 'Escape') setEditing(false);
        }}
      />
      <div style={{display: 'flex', gap: 8, marginTop: 8}}>
        <button type="button" className="acct-copy" style={{marginTop: 0}} onClick={save} disabled={busy}>
          {busy ? 'Saving…' : 'Save name'}
        </button>
        <button
          type="button"
          className="acct-copy"
          style={{marginTop: 0}}
          onClick={() => setEditing(false)}
          disabled={busy}
        >
          Cancel
        </button>
      </div>
      <p className="acct-muted" style={{fontSize: 12.5, marginBottom: 0}}>
        {err ? <span style={{color: '#f87171'}}>{err}</span> : 'This is the name on every reel’s end card.'}
      </p>
    </div>
  );
}

type Social = {
  configured: boolean;
  unavailable?: boolean;
  platforms: string[];
  facebookPages?: {id: string; name: string}[];
  accounts: {platform: string; handle: string | null; displayName: string | null; reauthRequired: boolean}[];
};

// Where a customer links their own Instagram / TikTok / YouTube / Facebook. We
// never see their platform credentials — upload-post owns the OAuth apps and we
// only send them to the right authorize screen.
function SocialCard({token}: {token: string}) {
  const [social, setSocial] = useState<Social | null>(null);
  const [note, setNote] = useState<{kind: 'ok' | 'bad'; text: string} | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/social/status?t=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then(setSocial)
      .catch(() => setSocial({configured: true, unavailable: true, platforms: [], accounts: []}));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    load();
  }, [token, load]);

  // The ?connect_status= the OAuth round-trip lands back with. Read it once,
  // then strip it so a later reload can't resurface a stale note.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('connect_status');
    if (!status) return;
    const platform = params.get('platform');
    const url = new URL(window.location.href);
    url.searchParams.delete('connect_status');
    url.searchParams.delete('platform');
    window.history.replaceState({}, '', url.toString());

    if (status === 'success') {
      setNote({kind: 'ok', text: `${PLATFORM_LABEL[platform || ''] || 'Account'} connected.`});
    } else if (status === 'limit') {
      setNote({
        kind: 'bad',
        text: 'We’ve hit our posting provider’s account limit. Email hello@theaftershot.com and we’ll raise it — usually within the hour.',
      });
    } else if (status !== 'unconfigured') {
      setNote({kind: 'bad', text: 'Couldn’t connect that account — please try again.'});
    }
  }, []);

  async function disconnect() {
    if (!confirm('This unlinks every connected account. Continue?')) return;
    setBusy(true);
    setNote(null);
    try {
      const r = await fetch(`/api/social/status?t=${encodeURIComponent(token)}`, {method: 'DELETE'});
      if (!r.ok) throw new Error();
      setNote({kind: 'ok', text: 'Disconnected. We no longer have access to your accounts.'});
      load();
    } catch {
      setNote({kind: 'bad', text: 'Couldn’t disconnect. Try again.'});
    } finally {
      setBusy(false);
    }
  }

  const linked = new Map((social?.accounts ?? []).map((a) => [a.platform, a]));
  const platforms = social?.platforms?.length
    ? social.platforms
    : ALL_PLATFORMS;
  const anyLinked = linked.size > 0;
  const fbPages = social?.facebookPages ?? [];

  return (
    <div className="acct-card">
      <p className="acct-label">WHERE WE POST</p>
      {social === null ? (
        <p className="acct-muted" style={{margin: 0}}>Checking your connected accounts…</p>
      ) : social.configured === false ? (
        <p className="acct-muted" style={{margin: 0}}>
          Auto-posting isn&apos;t switched on for your account yet. Email{' '}
          <a href="mailto:hello@theaftershot.com" style={{color: 'var(--brand-bright)'}}>hello@theaftershot.com</a>{' '}
          and we&apos;ll connect your accounts by hand.
        </p>
      ) : (
        <>
          <div className="soc-grid">
            {platforms.map((p) => {
              const meta = PLATFORM_META[p];
              if (!meta) return null;
              const a = linked.get(p);
              const {label, Icon, solid, tint, ink} = meta;
              return a ? (
                <span key={p} className="soc-chip" style={{background: tint, borderColor: ink}}>
                  <span className="soc-ic" style={{color: ink}}><Icon /></span>
                  <span className="soc-name">{a.handle ? `@${a.handle}` : a.displayName || label}</span>
                  {a.reauthRequired ? (
                    <a className="soc-redo" href={connectHref(p, token)}>
                      Reconnect
                    </a>
                  ) : (
                    <span className="soc-tick" aria-label="connected">✓</span>
                  )}
                </span>
              ) : (
                <a
                  key={p}
                  className="soc-tile"
                  style={{background: solid}}
                  href={connectHref(p, token)}
                >
                  <span className="soc-ic"><Icon /></span>
                  {label}
                </a>
              );
            })}
          </div>

          {social.unavailable && (
            <p className="acct-muted" style={{fontSize: 13, marginBottom: 0}}>
              Couldn&apos;t reach the posting service just now — this list may be out of date.
            </p>
          )}

          <p className="acct-muted" style={{fontSize: 13, marginBottom: 0}}>
            {anyLinked
              ? 'Reels post automatically to the accounts above after every job.'
              : 'Tap a platform to link it once, and we’ll post your reels there automatically after every job. Instagram needs a Professional account (Business or Creator) — free to switch in the app under Settings → Account type.'}
          </p>

          {/* A personal Facebook account with no Page can't receive a Reel. */}
          {linked.has('facebook') && fbPages.length === 0 && (
            <p className="acct-muted" style={{fontSize: 13, marginBottom: 0}}>
              Facebook reels go to a <b>Page</b>, and none is linked to your account yet. Create a Page
              for your business, then reconnect Facebook.
            </p>
          )}

          {anyLinked && (
            <p className="acct-muted" style={{fontSize: 12.5, marginBottom: 0}}>
              <button type="button" className="soc-unlink" onClick={disconnect} disabled={busy}>
                Disconnect
              </button>{' '}
              unlinks every connected account at once.
            </p>
          )}

          {note && (
            <p style={{fontSize: 13, marginBottom: 0, color: note.kind === 'ok' ? '#34d399' : '#f87171'}}>
              {note.text}
            </p>
          )}
        </>
      )}
    </div>
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
