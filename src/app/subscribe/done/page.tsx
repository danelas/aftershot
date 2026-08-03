'use client';

// The moment right after signup is when someone is most ready to post their
// first job — so the primary action here is "upload", not "back to homepage".
import {Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {loadToken, saveToken} from '@/lib/session';

export default function Done() {
  return (
    <Suspense>
      <DoneInner />
    </Suspense>
  );
}

function DoneInner() {
  const qsToken = useSearchParams().get('t');
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    if (qsToken) saveToken(qsToken);
    setToken(qsToken || loadToken());
  }, [qsToken]);

  return (
    <main className="checkout">
      <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
      <div className="checkout-card" style={{textAlign: 'center'}}>
        <div style={{fontSize: 54}}>🎉</div>
        <h1>Trial started</h1>
        <p style={{color: 'var(--muted)', lineHeight: 1.6}}>
          You have 7 free days, and we don&apos;t have a card on file — so there is
          nothing to cancel and no way for this to bill you.
        </p>
        {token ? (
          <>
            <p style={{color: 'var(--ink)', lineHeight: 1.6, fontWeight: 600}}>
              Post your first job now — grab a before and after photo and drop
              them in.
            </p>
            <a href={`/u/${token}`} className="btn checkout-btn" style={{textDecoration: 'none'}}>
              Upload a before &amp; after →
            </a>
            <a
              href="/account"
              className="btn btn-ghost checkout-btn"
              style={{textDecoration: 'none', marginTop: 10}}
            >
              My account
            </a>
          </>
        ) : (
          <>
            <p style={{color: 'var(--muted)', lineHeight: 1.6}}>
              Open the upload link from your setup email to post your first job.
            </p>
            <a href="/account" className="btn checkout-btn" style={{textDecoration: 'none'}}>My account</a>
          </>
        )}
        <p style={{color: 'var(--faint)', fontSize: 13, lineHeight: 1.6, marginTop: 16}}>
          Near the end of the trial we&apos;ll email you. Add a card then if you
          want to keep going.
        </p>
      </div>
    </main>
  );
}
