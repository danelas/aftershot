'use client';

// Onboarding: everything the reel sell-card needs, collected once. The Google
// Places picker auto-fills the real rating + review count. Styled to match the
// dark landing page; trade is a chip grid covering every transformation trade.
import {useState} from 'react';
import {
  Building2, Palette as PaletteIcon, Droplets, Car, Leaf, Paintbrush, Home as HomeIcon,
  Layers, Hammer, Trash2, Sparkles, Waves, LayoutGrid, Sun, MoreHorizontal,
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
  const [state, setState] = useState<'idle' | 'saving' | 'done' | 'error'>('idle');
  const [result, setResult] = useState<{uploadUrl: string} | null>(null);
  const [msg, setMsg] = useState('');

  const set = (k: string, v: any) => setF((p) => ({...p, [k]: v}));

  async function findBusiness() {
    if (!f.businessName.trim()) return;
    setSearching(true);
    try {
      const r = await fetch(`/api/places/search?q=${encodeURIComponent(f.businessName)}`);
      const d = await r.json();
      setMatches(d.matches || []);
    } catch { setMatches([]); }
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
      setResult(d); setState('done');
    } catch (e: any) { setMsg(e?.message || 'Something went wrong'); setState('error'); }
  }

  if (state === 'done' && result) {
    return (
      <main className="onb">
        <div className="onb-inner onb-done">
          <div className="big">🎉</div>
          <h1>You&apos;re set up!</h1>
          <p className="onb-sub">
            This is your upload link. Open it on your phone and <b style={{color: 'var(--ink)'}}>Add to
            Home Screen</b> — after every job, tap it and drop a before + after. That&apos;s the whole routine.
          </p>
          <div className="onb-link-card">{result.uploadUrl}</div>
          <button className="btn checkout-btn" onClick={() => navigator.clipboard?.writeText(result.uploadUrl)}>
            Copy link
          </button>
          <a
            href={`/subscribe?email=${encodeURIComponent(f.email)}${planParam()}`}
            className="btn checkout-btn"
            style={{marginTop: 12, textDecoration: 'none'}}
          >
            Start your 7-day free trial →
          </a>
          <p className="onb-fine">
            $0 today. Plans from $19/mo, cancel anytime.
            <br />(We&apos;ll also email {f.email} the next steps.)
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

        <div className="onb-card">
          <p className="sec-title"><Building2 size={15} /> YOUR BUSINESS</p>
          <div className="onb-row">
            <input className="onb-input" style={{flex: 1}} placeholder="Business name" value={f.businessName} onChange={(e) => set('businessName', e.target.value)} />
            <button type="button" className="onb-find" onClick={findBusiness}>{searching ? '…' : 'Find on Google'}</button>
          </div>
          {matches.length > 0 && (
            <div className="onb-matches">
              {matches.map((m) => (
                <button key={m.id} type="button" onClick={() => pick(m)} className="onb-match">
                  <b>{m.name}</b> <span className="addr">{m.address}</span>
                  {m.rating != null && <span className="stars"> · ★ {m.rating} ({m.reviewCount})</span>}
                </button>
              ))}
            </div>
          )}
          {f.placeId && <p className="onb-linked">✓ Linked to Google — live rating {String(f.rating)} ({String(f.reviewCount)} reviews)</p>}
          <input className="onb-input" type="email" placeholder="Email" value={f.email} onChange={(e) => set('email', e.target.value)} />
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
        <p className="onb-fine" style={{textAlign: 'center'}}>Free to set up · 7-day free trial when you subscribe</p>
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
