export default function Done() {
  return (
    <main className="checkout">
      <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
      <div className="checkout-card" style={{textAlign: 'center'}}>
        <div style={{fontSize: 54}}>🎉</div>
        <h1>Trial started</h1>
        <p style={{color: 'var(--muted)', lineHeight: 1.6}}>
          Your 7-day free trial is live — you won&apos;t be charged until it ends,
          and you can cancel anytime. Check your email for your upload link and
          next steps. After every job: tap the link, drop the before + after,
          and we&apos;ll handle the rest.
        </p>
        <a href="/" className="btn checkout-btn" style={{textDecoration: 'none'}}>Back to AfterShot</a>
      </div>
    </main>
  );
}
