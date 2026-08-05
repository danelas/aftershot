'use client';

// "Continue with Google / Facebook".
//
// Supabase holds the client ids and secrets (Dashboard → Authentication →
// Providers), so there's nothing to configure here — signInWithOAuth just
// redirects to the provider and comes back at /auth/callback.
import {useState} from 'react';
import {authClient} from '@/lib/supabase-browser';

type Provider = 'google' | 'facebook';

export default function SocialAuth({note}: {note?: string}) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [err, setErr] = useState('');

  async function go(provider: Provider) {
    setErr('');
    setBusy(provider);
    try {
      const {error} = await authClient().auth.signInWithOAuth({
        provider,
        options: {redirectTo: `${window.location.origin}/auth/callback`},
      });
      if (error) throw error;
      // On success the browser leaves for the provider — nothing after this runs.
    } catch {
      setErr('Couldn’t start that sign-in. Try again, or use your emailed link.');
      setBusy(null);
    }
  }

  return (
    <div className="oauth-wrap">
      <button type="button" className="oauth-btn oauth-google" disabled={!!busy} onClick={() => go('google')}>
        <GoogleMark />
        {busy === 'google' ? 'Opening Google…' : 'Continue with Google'}
      </button>
      <button type="button" className="oauth-btn oauth-facebook" disabled={!!busy} onClick={() => go('facebook')}>
        <FacebookMark />
        {busy === 'facebook' ? 'Opening Facebook…' : 'Continue with Facebook'}
      </button>
      {note && <p className="oauth-note">{note}</p>}
      {err && <p className="onb-err" style={{textAlign: 'center'}}>{err}</p>}
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62z" />
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18z" />
      <path fill="#FBBC05" d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33z" />
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58z" />
    </svg>
  );
}

function FacebookMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}
