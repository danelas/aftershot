'use client';

// Onboarding: everything the reel sell-card needs, collected once. The Google
// Places picker auto-fills the real rating + review count. Styled to match the
// dark landing page; trade is a chip grid covering every transformation trade.
import {useEffect, useState} from 'react';
import {saveToken} from '@/lib/session';
import {authClient} from '@/lib/supabase-browser';
import SocialAuth from '../components/SocialAuth';
import {
  Building2, Palette as PaletteIcon, Droplets, Car, Leaf, Paintbrush, Home as HomeIcon,
  Layers, Hammer, Trash2, Sparkles, Waves, LayoutGrid, Sun, MoreHorizontal,
  Check, CircleCheck, Mail, Star,
} from 'lucide-react';

type Match = {id: string; name: string; address: string; rating: number | null; reviewCount: number | null};

const TRADES = [
  {value: 'pressure_washing', label: 'Pressure washing', icon: Droplets},
  {value: 'detailing', label: 'Auto detailing', icon: Car},
  {value: 'landscaping', label: 'Landscaping & lawn', icon: Leaf},
  {value: 'painting', label: 'Painting', icon: Paintbrush},
  {value: 'roof_cleaning', label: 'Roof & gutter cleaning', icon: HomeIcon},
  {value: 'epoxy_floors', label: 'Epoxy & garage floors', icon: Layers},
  {value: 'remodeling', label: 'Remodeling & reno', icon: Hammer},
  {value: 'junk_removal', label: 'Junk removal', icon: Trash2},
  {value: 'cleaning', label: 'Home & office cleaning', icon: Sparkles},
  {value: 'pool_care', label: 'Pool cleaning', icon: Waves},
  {value: 'carpet_tile', label: 'Carpet & tile cleaning', icon: LayoutGrid},
  {value: 'window_cleaning', label: 'Window cleaning', icon: Sun},
  {value: 'other', label: 'Something else', icon: MoreHorizontal},
];

export default function Start() {
  const [f, setF] = useState({
    businessName: '', email: '', trade: 'pressure_washing', phone: '',
    serviceArea: '', handle: '', priceFrom: '', brandColor: '#0EA5E9',
    ctaText: 'Free Quote', licensedInsured: true,
    placeId: '', rating: '' as string | number, reviewCount: '' as string | number,
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [searching, setSearching] = useState(false);
  // '' = not searched yet. Anything else is shown under the picker so a failed
  // or unconfigured lookup never looks like "no results".
  const [lookupNote, setLookupNote] = useState('');
  const [manualRating, setManualRating] = useState(false);
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{
    uploadUrl?: string; uploadToken?: string; emailed?: boolean; existing?: boolean;
  } | null>(null);
  const [msg, setMsg] = useState('');

  // Set once we know this browser has a Google/Facebook session. The email then
  // comes from the provider rather than the keyboard, so it can't be typo'd —
  // and it's the address that has to match for sign-in to find them again.
  const [authEmail, setAuthEmail] = useState<string | null>(null);

  const set = (k: string, v: any) => setF((p) => ({...p, [k]: v}));

  // /auth/callback sends people here when they signed in but have no account
  // yet. Pick up whatever the provider told us so they retype as little as
  // possible.
  useEffect(() => {
    authClient().auth.getUser().then(({data}) => {
      const u = data.user;
      if (!u?.email) return;
      setAuthEmail(u.email);
      const suggested = (u.user_metadata?.name || u.user_metadata?.full_name || '') as string;
      setF((p) => ({
        ...p,
        email: u.email!,
        businessName: p.businessName || suggested,
      }));
    }).catch(() => { /* not signed in — the form works exactly as before */ });
  }, []);

  async function findBusiness() {
    if (!f.businessName.trim()) return;
    setSearching(true);
    setLookupNote('');
    try {
      const r = await fetch(`/api/places/search?q=${encodeURIComponent(f.businessName)}`);
      const d = await r.json();
      const found: Match[] = d.matches || [];
      setMatches(found);
      if (d.configured === false) {
        setLookupNote('Google lookup isn’t switched on yet — add your rating below and we’ll sync it later.');
        setManualRating(true);
      } else if (d.error) {
        setLookupNote(d.error);
        setManualRating(true);
      } else if (found.length === 0) {
        setLookupNote('No Google listing found for that name. Try the name exactly as it appears on Google Maps, or enter your rating below.');
        setManualRating(true);
      }
    } catch {
      setMatches([]);
      setLookupNote('Couldn’t reach Google just now. Enter your rating below and carry on.');
      setManualRating(true);
    }
    setSearching(false);
  }

  function pick(m: Match) {
    setF((p) => ({
      ...p,
      businessName: m.name || p.businessName,
      placeId: m.id,
      rating: m.rating ?? '',
      reviewCount: m.reviewCount ?? '',
    }));
    setMatches([]);
    setLookupNote('');
    setManualRating(false);
  }

  async function submit() {
    if (!f.businessName.trim() || !f.email.trim()) {
      setMsg('Business name and email are required.'); setState('error'); return;
    }
    setState('saving');
    try {
      const fd = new FormData();
      Object.entries(f).forEach(([k, v]) => fd.append(k, String(v)));
      if (logo) fd.append('logo', logo);
      const r = await fetch('/api/onboard', {method: 'POST', body: fd});
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'failed');
      // Remember the token so the nav and /account work from here on — this is
      // the only "session" AfterShot has.
      if (d.uploadToken) saveToken(d.uploadToken, f.businessName);
      setResult(d); setState('done');
    } catch (e: any) { setMsg(e?.message || 'Something went wrong'); setState('error'); }
  }

  // They already had an account under this email. We never put the link on
  // screen in that case (see /api/onboard) — it only goes to the inbox that owns
  // it, so this can't be used to walk into someone else's account.
  // Signed in with a provider and the address already had an account: no email
  // round-trip needed, they're already back in.
  if (state === 'done' && result?.existing && result.uploadToken) {
    return (
      <main className="onb">
        <div className="onb-inner onb-done">
          <div className="big"><CircleCheck size={54} strokeWidth={1.5} /></div>
          <h1>Welcome back</h1>
          <p className="onb-sub">
            <b style={{color: 'var(--ink)'}}>{f.email}</b> already has an AfterShot account, and
            you&apos;re signed into it now. Nothing changed.
          </p>
          <a href="/account" className="btn checkout-btn" style={{textDecoration: 'none'}}>
            Open my account
          </a>
        </div>
      </main>
    );
  }

  if (state === 'done' && result?.existing) {
    return (
      <main className="onb">
        <div className="onb-inner onb-done">
          <div className="big"><Mail size={54} strokeWidth={1.5} /></div>
          <h1>You already have an account</h1>
          <p className="onb-sub">
            {result.emailed
              ? <>We&apos;ve emailed your link to <b style={{color: 'var(--ink)'}}>{f.email}</b>. Open it on your
                phone and you&apos;re straight back in — nothing on your account changed.</>
              : <>There&apos;s already an AfterShot account on <b style={{color: 'var(--ink)'}}>{f.email}</b>, but we
                couldn&apos;t send the email just now. Reply to your original welcome email, or
                write to hello@theaftershot.com and we&apos;ll get you back in.</>}
          </p>
          <a href="/account" className="btn checkout-btn" style={{textDecoration: 'none'}}>
            Open my account
          </a>
          <button className="acct-copy" onClick={() => { setState('idle'); setResult(null); }}>
            Use a different email
          </button>
        </div>
      </main>
    );
  }

  if (state === 'done' && result?.uploadUrl) {
    const uploadUrl = result.uploadUrl;
    return (
      <main className="onb">
        <div className="onb-inner onb-done">
          <div className="big"><CircleCheck size={54} strokeWidth={1.5} /></div>
          <h1>You&apos;re set up!</h1>
          <p className="onb-sub">
            This is your upload link. Open it on your phone and <b style={{color: 'var(--ink)'}}>Add to
            Home Screen</b> — after every job, tap it and drop a before + after. That&apos;s the whole routine.
          </p>
          <div className="onb-link-card">{result.uploadUrl}</div>
          <a
            href={`/subscribe?email=${encodeURIComponent(f.email)}${planParam()}${result.uploadToken ? `&t=${result.uploadToken}` : ''}`}
            className="btn checkout-btn"
            style={{textDecoration: 'none'}}
          >
            Start your 7-day free trial →
          </a>
          <button
            className="acct-copy"
            onClick={() => navigator.clipboard?.writeText(uploadUrl)}
          >
            Copy link
          </button>
          <p className="onb-fine">
            No card required. Plans from $19/mo only if you continue.
            <br />
            {result.emailed
              ? `We've emailed this link to ${f.email} too.`
              : 'Save this link now — copy it somewhere safe before you close this page.'}
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="onb">
      <div className="onb-inner">
        <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
        <h1>Set up AfterShot</h1>
        <p className="onb-sub">Takes 2 minutes. This is what shows on your reels.</p>

        {/* Signing in first is optional, but it's what lets them get back into
            the account from a new phone without digging out the welcome email. */}
        {!authEmail && (
          <>
            <SocialAuth note="Sign in first and you'll never need to hunt for your upload link." />
            <p className="oauth-or">or just fill this in</p>
          </>
        )}

        <div className="onb-card">
          <p className="sec-title"><Building2 size={15} /> YOUR BUSINESS</p>
          <div className="onb-row">
            {/* basis, not `flex:1` (= 1 1 0%): a zero basis let this collapse to
                86px on a 320px screen. Below that the button wraps instead. */}
            <input className="onb-input" style={{flex: '1 1 170px'}} placeholder="Business name" value={f.businessName} onChange={(e) => set('businessName', e.target.value)} />
            <button type="button" className="onb-find" onClick={findBusiness}>{searching ? '…' : 'Find on Google'}</button>
          </div>
          {matches.length > 0 && (
            <div className="onb-matches">
              {matches.map((m) => (
                <button key={m.id} type="button" onClick={() => pick(m)} className="onb-match">
                  <b>{m.name}</b> <span className="addr">{m.address}</span>
                  {m.rating != null && (
                    <span className="stars">
                      {' · '}<Star size={12} fill="currentColor" style={{verticalAlign: -1}} /> {m.rating} ({m.reviewCount})
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
          {f.placeId && (
            <p className="onb-linked">
              <Check size={13} strokeWidth={3} style={{verticalAlign: -1}} />{' '}
              {f.rating === ''
                // Real case: newer trades are on Google with zero reviews. Still
                // worth linking — the rating syncs itself once they get some.
                ? 'Linked to Google — no reviews there yet, so the reel skips the rating for now'
                : `Linked to Google — live rating ${f.rating} (${f.reviewCount} reviews)`}
            </p>
          )}
          {lookupNote && !f.placeId && <p className="onb-note">{lookupNote}</p>}
          {manualRating && !f.placeId && (
            <div className="onb-row">
              <input
                className="onb-input" style={{flex: '1 1 130px'}} inputMode="decimal"
                placeholder="Rating (e.g. 4.9)"
                value={String(f.rating)}
                onChange={(e) => set('rating', e.target.value)}
              />
              <input
                className="onb-input" style={{flex: '1 1 130px'}} inputMode="numeric"
                placeholder="# of reviews (e.g. 127)"
                value={String(f.reviewCount)}
                onChange={(e) => set('reviewCount', e.target.value)}
              />
            </div>
          )}
          <input
            className="onb-input" type="email" placeholder="Email"
            value={f.email}
            readOnly={!!authEmail}
            onChange={(e) => set('email', e.target.value)}
          />
          {authEmail && (
            <p className="onb-linked">
              <Check size={13} strokeWidth={3} style={{verticalAlign: -1}} /> Signed in as {authEmail} — this is how you&apos;ll get back in
            </p>
          )}
          <input className="onb-input" placeholder="Phone (shown as the Call/Text CTA)" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
          <input className="onb-input" placeholder="Service area (e.g. Jupiter & Palm Beach County)" value={f.serviceArea} onChange={(e) => set('serviceArea', e.target.value)} />
        </div>

        <div className="onb-card">
          <p className="sec-title"><Sparkles size={15} /> WHAT DO YOU DO?</p>
          <div className="trade-grid">
            {TRADES.map((t) => (
              <button
                key={t.value}
                type="button"
                className={`trade-chip${f.trade === t.value ? ' sel' : ''}`}
                onClick={() => set('trade', t.value)}
              >
                <span className="t-ico"><t.icon size={16} /></span>
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="onb-card">
          <p className="sec-title"><PaletteIcon size={15} /> BRANDING &amp; OFFER</p>
          <input className="onb-input" placeholder="Instagram/TikTok handle (e.g. @aquashinefl)" value={f.handle} onChange={(e) => set('handle', e.target.value)} />
          <input className="onb-input" placeholder="Starting price (e.g. $199) — optional" value={f.priceFrom} onChange={(e) => set('priceFrom', e.target.value)} />
          <label className="onb-color">
            <span>Brand color</span>
            <input type="color" value={f.brandColor} onChange={(e) => set('brandColor', e.target.value)} />
          </label>
          <label className="onb-toggle">
            <span>Licensed &amp; Insured badge</span>
            <input type="checkbox" checked={f.licensedInsured} onChange={(e) => set('licensedInsured', e.target.checked)} />
          </label>
          <label className="onb-logo">
            <span className="l-title">Logo (optional)</span>
            <span className="l-hint">{logo ? logo.name : 'Tap to upload'}</span>
            <input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => e.target.files?.[0] && setLogo(e.target.files[0])} />
          </label>
        </div>

        {state === 'error' && <p className="onb-err">{msg}</p>}
        <button className="btn checkout-btn" disabled={state === 'saving'} onClick={submit}>
          {state === 'saving' ? 'Setting up…' : 'Create my account'}
        </button>
        <p className="onb-fine" style={{textAlign: 'center'}}>Free to set up · 7-day free trial · no card required</p>
      </div>
    </main>
  );
}

// Carries ?plan= from the pricing card through to checkout. Only rendered
// after user interaction, so no SSR/hydration mismatch.
function planParam() {
  if (typeof window === 'undefined') return '';
  const plan = new URLSearchParams(window.location.search).get('plan');
  return plan ? `&plan=${encodeURIComponent(plan)}` : '';
}
