'use client';

// Minimal on-page checkout: plan → email → card (Stripe Payment Element) →
// trialing subscription. Card saved via SetupIntent; first charge after trial.
import {Suspense, useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {loadStripe, type Stripe, type StripeElements} from '@stripe/stripe-js';
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
  const [email, setEmail] = useState(params.get('email') || '');
  const [plan, setPlan] = useState(
    PLANS.some((p) => p.id === params.get('plan')) ? (params.get('plan') as string) : 'pro',
  );
  const [step, setStep] = useState<'email' | 'card'>('email');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const stripeRef = useRef<Stripe | null>(null);
  const elementsRef = useRef<StripeElements | null>(null);
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
      const d = await r.json();
      if (d.alreadySubscribed) { setMsg('You already have an active plan — you’re all set.'); return; }
      if (!r.ok) throw new Error(d.error || 'failed');
      const stripe = await loadStripe(d.publishableKey);
      if (!stripe) throw new Error('Stripe failed to load');
      stripeRef.current = stripe;
      elementsRef.current = stripe.elements({
        clientSecret: d.clientSecret,
        appearance: {variables: {colorPrimary: '#0EA5E9', borderRadius: '12px'}},
      });
      setStep('card');
    } catch (e: any) {
      setMsg(e?.message || 'Something went wrong.');
    } finally { setBusy(false); }
  }

  // Mount once the card step's container is actually in the DOM.
  useEffect(() => {
    if (step === 'card' && elementsRef.current) {
      elementsRef.current.create('payment').mount('#payment-el');
    }
  }, [step]);

  async function confirm() {
    const stripe = stripeRef.current, elements = elementsRef.current;
    if (!stripe || !elements) return;
    setBusy(true); setMsg('');
    const {error} = await stripe.confirmSetup({
      elements,
      confirmParams: {return_url: `${window.location.origin}/subscribe/done`},
    });
    if (error) { setMsg(error.message || 'Card was not accepted.'); setBusy(false); }
  }

  return (
    <main className="checkout">
      <a href="/" className="logo">After<span>Shot</span></a>
      <div className="checkout-card">
        <h1>Start your free trial</h1>
        {step === 'email' && (
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
        )}
        <p className="trial-note">
          <b>7 days free</b> on {sel.name} ({sel.videos}, ${sel.price}/mo after).
          Card required, charged nothing today. Cancel anytime before the trial
          ends and you pay $0.
        </p>
        {step === 'email' ? (
          <>
            <input
              className="checkout-input"
              type="email"
              placeholder="you@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="btn checkout-btn" onClick={begin} disabled={busy}>
              {busy ? 'One sec…' : 'Continue'}
            </button>
          </>
        ) : (
          <>
            <div id="payment-el" />
            <button className="btn checkout-btn" onClick={confirm} disabled={busy}>
              {busy ? 'Starting…' : 'Start 7-day free trial'}
            </button>
          </>
        )}
        {msg && <p className="checkout-msg">{msg}</p>}
        <p className="secure"><Lock size={14} /> Secured by Stripe · No charge for 7 days · Cancel anytime</p>
      </div>
    </main>
  );
}
