'use client';

// Card-free trial: plan → email → done. Nothing to collect, so there is no
// Stripe.js on this page at all — which also removes the blocked-third-party-
// script failure mode that made the old card step look like a crash.
import {Suspense, useState} from 'react';
import {useRouter, useSearchParams} from 'next/navigation';
import {Lock} from '../components/Icons';

const PLANS = [
  {id: 'starter', name: 'Starter', price: 19, videos: '6 reels/mo'},
  {id: 'pro', name: 'Pro', price: 49, videos: '20 reels/mo'},
  {id: 'max', name: 'Max', price: 99, videos: 'Unlimited'},
] as const;

export default function Subscribe() {
  return (
    <Suspense>
      <SubscribeInner />
    </Suspense>
  );
}

function SubscribeInner() {
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState(params.get('email') || '');
  const [plan, setPlan] = useState(
    PLANS.some((p) => p.id === params.get('plan')) ? (params.get('plan') as string) : 'pro',
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const sel = PLANS.find((p) => p.id === plan)!;

  async function begin() {
    if (!email.includes('@')) { setMsg('Enter your email to start.'); return; }
    setBusy(true); setMsg('');
    try {
      const r = await fetch('/api/subscribe', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({email, plan}),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || `Couldn’t start your trial (${r.status}). Please try again.`);
      if (d.alreadySubscribed) {
        setMsg('You already have an active plan — you’re all set.');
        return;
      }
      router.push('/subscribe/done');
    } catch (e: any) {
      console.error('trial start failed', e);
      setMsg(e?.message || 'Something went wrong. Please try again.');
    } finally { setBusy(false); }
  }

  return (
    <main className="checkout">
      <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
      <div className="checkout-card">
        <h1>Start your free trial</h1>
        <div className="plan-picker">
          {PLANS.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`plan-opt${plan === p.id ? ' sel' : ''}`}
              onClick={() => setPlan(p.id)}
            >
              <div className="p-name">{p.name}</div>
              <div className="p-price">${p.price}<span style={{fontSize: 11, fontWeight: 600}}>/mo</span></div>
              <div className="p-videos">{p.videos}</div>
            </button>
          ))}
        </div>
        <p className="trial-note">
          <b>7 days free</b> on {sel.name} ({sel.videos}, ${sel.price}/mo after).
          <b> No card needed.</b> If you don’t add one before the trial ends,
          it just stops — we can’t charge you.
        </p>
        <input
          className="checkout-input"
          type="email"
          placeholder="you@business.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button className="btn checkout-btn" onClick={begin} disabled={busy}>
          {busy ? 'Starting…' : 'Start my 7 free days'}
        </button>
        {msg && <p className="checkout-msg">{msg}</p>}
        <p className="secure"><Lock size={14} /> No card · No charge · Nothing to cancel</p>
      </div>
    </main>
  );
}
