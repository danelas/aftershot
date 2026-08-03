'use client';

// Without this, any client-side exception renders Next's bare white
// "Application error" screen — which reads as "the site crashed" and leaves no
// trace in the logs. Show something useful and log the real error.
import {useEffect} from 'react';

export default function Error({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  useEffect(() => {
    console.error('AfterShot client error:', error, error.digest);
  }, [error]);

  return (
    <main className="checkout">
      <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
      <div className="checkout-card" style={{textAlign: 'center'}}>
        <div style={{fontSize: 54}}>⚠️</div>
        <h1>Something broke on our end</h1>
        <p style={{color: 'var(--muted)', lineHeight: 1.6}}>
          Sorry about that — nothing you did caused it, and if you were signing
          up you have not been charged. Try again, and if it keeps happening
          email{' '}
          <a href="mailto:hello@theaftershot.com" style={{color: 'var(--ink)'}}>hello@theaftershot.com</a>.
        </p>
        {error.digest && (
          <p style={{color: 'var(--faint)', fontSize: 12, marginTop: 10}}>Reference: {error.digest}</p>
        )}
        <button className="btn checkout-btn" onClick={reset}>Try again</button>
        <a href="/" className="btn checkout-btn" style={{textDecoration: 'none', marginTop: 10}}>Back to home</a>
      </div>
    </main>
  );
}
