'use client';

// Onboarding: everything the reel sell-card needs, collected once. The Google
// Places picker auto-fills the real rating + review count.
import {useState} from 'react';

type Match = {id: string; name: string; address: string; rating: number | null; reviewCount: number | null};

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
      <main style={wrap}>
        <div style={{fontSize: 56}}>🎉</div>
        <h1 style={{fontSize: 30, margin: '10px 0'}}>You&apos;re set up!</h1>
        <p style={{opacity: 0.7, textAlign: 'center', marginBottom: 20}}>
          This is your upload link. Open it on your phone and <b>Add to Home Screen</b> — after every
          job, tap it and drop a before + after. That&apos;s the whole routine.
        </p>
        <div style={{...card, wordBreak: 'break-all', fontFamily: 'monospace', fontSize: 15}}>{result.uploadUrl}</div>
        <button style={btn} onClick={() => navigator.clipboard?.writeText(result.uploadUrl)}>Copy link</button>
        <a
          href={`/subscribe?email=${encodeURIComponent(f.email)}${planParam()}`}
          style={{...btn, marginTop: 12, textAlign: 'center', textDecoration: 'none', display: 'block'}}
        >
          Start your 7-day free trial →
        </a>
        <p style={{marginTop: 18, fontSize: 14, opacity: 0.6, textAlign: 'center'}}>
          $0 today. Plans from $19/mo, cancel anytime.
          <br />(We&apos;ll also email {f.email} the next steps.)
        </p>
      </main>
    );
  }

  return (
    <main style={{...wrap, justifyContent: 'flex-start', paddingTop: 40, paddingBottom: 60}}>
      <h1 style={{fontSize: 30, marginBottom: 4}}>Set up AfterShot</h1>
      <p style={{opacity: 0.6, marginBottom: 24, fontSize: 15}}>Takes 2 minutes. This is what shows on your reels.</p>

      <Section title="Your business">
        <div style={{display: 'flex', gap: 8}}>
          <input style={{...input, flex: 1}} placeholder="Business name" value={f.businessName} onChange={(e) => set('businessName', e.target.value)} />
          <button type="button" style={{...btn, padding: '0 16px', fontSize: 15}} onClick={findBusiness}>{searching ? '…' : 'Find on Google'}</button>
        </div>
        {matches.length > 0 && (
          <div style={{border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', marginBottom: 12}}>
            {matches.map((m) => (
              <button key={m.id} type="button" onClick={() => pick(m)} style={matchRow}>
                <b>{m.name}</b> <span style={{opacity: 0.6}}>{m.address}</span>
                {m.rating != null && <span style={{color: '#0EA5E9'}}> · ★ {m.rating} ({m.reviewCount})</span>}
              </button>
            ))}
          </div>
        )}
        {f.placeId && <p style={{fontSize: 13, color: '#059669', margin: '0 0 12px'}}>✓ Linked to Google — live rating {String(f.rating)} ({String(f.reviewCount)} reviews)</p>}
        <input style={input} placeholder="Email" value={f.email} onChange={(e) => set('email', e.target.value)} />
        <select style={input} value={f.trade} onChange={(e) => set('trade', e.target.value)}>
          <option value="pressure_washing">Pressure washing</option>
          <option value="detailing">Auto detailing</option>
          <option value="landscaping">Landscaping</option>
        </select>
        <input style={input} placeholder="Phone (shown as the Call/Text CTA)" value={f.phone} onChange={(e) => set('phone', e.target.value)} />
        <input style={input} placeholder="Service area (e.g. Jupiter & Palm Beach County)" value={f.serviceArea} onChange={(e) => set('serviceArea', e.target.value)} />
      </Section>

      <Section title="Branding &amp; offer">
        <input style={input} placeholder="Instagram/TikTok handle (e.g. @aquashinefl)" value={f.handle} onChange={(e) => set('handle', e.target.value)} />
        <input style={input} placeholder="Starting price (e.g. $199) — optional" value={f.priceFrom} onChange={(e) => set('priceFrom', e.target.value)} />
        <label style={{...rowBetween}}>
          <span>Brand color</span>
          <input type="color" value={f.brandColor} onChange={(e) => set('brandColor', e.target.value)} style={{width: 56, height: 36, border: 0, background: 'none'}} />
        </label>
        <label style={{...rowBetween}}>
          <span>Licensed &amp; Insured badge</span>
          <input type="checkbox" checked={f.licensedInsured} onChange={(e) => set('licensedInsured', e.target.checked)} style={{width: 22, height: 22}} />
        </label>
        <label style={picker}>
          <span style={{fontWeight: 700, color: '#0EA5E9'}}>Logo (optional)</span>
          <span style={{opacity: 0.6, fontSize: 14}}>{logo ? logo.name : 'Tap to upload'}</span>
          <input type="file" accept="image/*" style={{display: 'none'}} onChange={(e) => e.target.files?.[0] && setLogo(e.target.files[0])} />
        </label>
      </Section>

      {state === 'error' && <p style={{color: '#dc2626'}}>{msg}</p>}
      <button style={{...btn, marginTop: 10}} disabled={state === 'saving'} onClick={submit}>
        {state === 'saving' ? 'Setting up…' : 'Create my account'}
      </button>
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

function Section({title, children}: {title: string; children: React.ReactNode}) {
  return (
    <div style={{width: '100%', marginBottom: 8}}>
      <h2 style={{fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, opacity: 0.5, margin: '18px 0 10px'}} dangerouslySetInnerHTML={{__html: title}} />
      {children}
    </div>
  );
}

const wrap: React.CSSProperties = {maxWidth: 460, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', minHeight: '100dvh', justifyContent: 'center', fontFamily: 'system-ui, sans-serif'};
const input: React.CSSProperties = {width: '100%', padding: 13, borderRadius: 12, border: '1px solid #e2e8f0', marginBottom: 10, fontSize: 16, boxSizing: 'border-box'};
const btn: React.CSSProperties = {background: '#0EA5E9', color: '#fff', border: 0, borderRadius: 14, padding: '15px 20px', fontSize: 17, fontWeight: 700, cursor: 'pointer'};
const card: React.CSSProperties = {background: '#f1f5f9', color: '#0f172a', borderRadius: 12, padding: 16, marginBottom: 14, width: '100%', boxSizing: 'border-box'};
const picker: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: 4, border: '2px dashed #cbd5e1', borderRadius: 12, padding: 16, marginBottom: 10, cursor: 'pointer'};
const rowBetween: React.CSSProperties = {display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 2px', marginBottom: 6, fontSize: 16};
const matchRow: React.CSSProperties = {display: 'block', width: '100%', textAlign: 'left', padding: 12, border: 0, borderBottom: '1px solid #f1f5f9', background: '#fff', color: '#0f172a', cursor: 'pointer', fontSize: 14};
