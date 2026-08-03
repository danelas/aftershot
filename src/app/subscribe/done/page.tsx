'use client';

// Stripe redirects here after confirmSetup. It appends redirect_status, and a
// failed setup lands here too — so check it before claiming the trial started.
import {Suspense} from 'react';
import {useSearchParams} from 'next/navigation';

export default function Done() {
  return (
    <Suspense>
      <DoneInner />
    </Suspense>
  );
}

function DoneInner() {
  const status = useSearchParams().get('redirect_status');
  const failed = status != null && status !== 'succeeded';

  return (
    <main className="checkout">
      <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
      <div className="checkout-card" style={{textAlign: 'center'}}>
        {failed ? (
          <>
            <div style={{fontSize: 54}}>😕</div>
            <h1>Card wasn&apos;t saved</h1>
            <p style={{color: 'var(--muted)', lineHeight: 1.6}}>
              Your bank didn&apos;t complete the setup, so the trial hasn&apos;t started
              — and nothing was charged. Give it another go, or email{' '}
              <a href="mailto:hello@theaftershot.com" style={{color: 'var(--ink)'}}>hello@theaftershot.com</a>{' '}
              and we&apos;ll sort it out.
            </p>
            <a href="/subscribe" className="btn checkout-btn" style={{textDecoration: 'none'}}>Try again</a>
          </>
        ) : (
          <>
            <div style={{fontSize: 54}}>🎉</div>
            <h1>Trial started</h1>
            <p style={{color: 'var(--muted)', lineHeight: 1.6}}>
              Your 7-day free trial is live — you won&apos;t be charged until it ends,
              and you can cancel anytime. Keep the upload link from setup handy:
              after every job, tap it and drop a before + after, and we&apos;ll handle
              the rest.
            </p>
            <a href="/" className="btn checkout-btn" style={{textDecoration: 'none'}}>Back to AfterShot</a>
          </>
        )}
      </div>
    </main>
  );
}
