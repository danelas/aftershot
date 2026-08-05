// Shared shell for /privacy, /terms and /data-deletion.
//
// Google and Meta both crawl these before approving an app, so they have to be
// reachable without a login and without JavaScript — hence a plain server
// component, no 'use client'.
export default function Legal({
  title, updated, children,
}: {title: string; updated: string; children: React.ReactNode}) {
  return (
    <main className="legal">
      <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
      <h1>{title}</h1>
      <p className="legal-updated">Last updated {updated}</p>
      {children}
      <p className="legal-foot">
        Questions about anything here? Email{' '}
        <a href="mailto:hello@theaftershot.com">hello@theaftershot.com</a> and a
        person will answer.
      </p>
      <p className="legal-foot">
        <a href="/privacy">Privacy Policy</a> · <a href="/terms">Terms of Service</a> ·{' '}
        <a href="/data-deletion">Delete your data</a> · <a href="/">Home</a>
      </p>
    </main>
  );
}
