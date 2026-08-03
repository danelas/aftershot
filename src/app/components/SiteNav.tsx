'use client';

// AfterShot has no login — the upload token is the credential. So "signed in"
// just means: this browser has completed onboarding and remembered the token.
// Until then the nav is the marketing one; after, it points at the real app.
import {useEffect, useState} from 'react';
import {loadToken} from '@/lib/session';

export default function SiteNav() {
  const [token, setToken] = useState<string | null>(null);
  // Read after mount only — localStorage doesn't exist during SSR, and reading
  // it during render would produce a hydration mismatch.
  useEffect(() => setToken(loadToken()), []);

  return (
    <div className="nav-shell">
      <header className="container">
        <nav className="nav">
          <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
          {token ? (
            <div className="nav-links">
              <a href={`/u/${token}`}>Upload</a>
              <a href={`/studio?t=${token}`}>Studio</a>
              <a href="/account" className="btn btn-sm">My account</a>
            </div>
          ) : (
            <div className="nav-links">
              <a href="#how">How it works</a>
              <a href="#studio">Studio</a>
              <a href="#pricing">Pricing</a>
              <a href="/start" className="btn btn-sm">Start free trial</a>
            </div>
          )}
        </nav>
      </header>
    </div>
  );
}
