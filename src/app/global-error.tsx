'use client';

// Last resort: an error thrown in the root layout replaces <html>/<body>, so
// this can't reuse globals.css classes. Keep it self-contained.
import {useEffect} from 'react';

export default function GlobalError({error, reset}: {error: Error & {digest?: string}; reset: () => void}) {
  useEffect(() => {
    console.error('AfterShot fatal error:', error, error.digest);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0, minHeight: '100dvh', display: 'grid', placeItems: 'center',
          background: '#070b12', color: '#e6edf7', padding: 24,
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif', textAlign: 'center',
        }}
      >
        <div style={{maxWidth: 420}}>
          <div style={{fontSize: 48}}>⚠️</div>
          <h1 style={{fontSize: 24, margin: '10px 0'}}>AfterShot hit an error</h1>
          <p style={{color: '#9fb0c7', lineHeight: 1.6}}>
            Sorry — please try again. If you were starting a trial, nothing was charged.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 18, padding: '13px 22px', borderRadius: 12, border: 0,
              background: '#0ea5e9', color: '#fff', fontSize: 16, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
