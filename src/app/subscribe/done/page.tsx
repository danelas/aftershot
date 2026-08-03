export default function Done() {
  return (
    <main className="checkout">
      <a href="/" className="logo"><img src="/logo-mark.png" alt="" />After<span>Shot</span></a>
      <div className="checkout-card" style={{textAlign: 'center'}}>
        <div style={{fontSize: 54}}>🎉</div>
        <h1>Trial started</h1>
        <p style={{color: 'var(--muted)', lineHeight: 1.6}}>
          You have 7 free days, and we don&apos;t have a card on file — so there is
          nothing to cancel and no way for this to bill you. Keep the upload link
          from setup handy: after every job, tap it and drop a before + after,
          and we&apos;ll handle the rest.
        </p>
        <p style={{color: 'var(--faint)', fontSize: 13, lineHeight: 1.6, marginTop: 14}}>
          Near the end of the trial we&apos;ll email you. Add a card then if you
          want to keep going.
        </p>
        <a href="/" className="btn checkout-btn" style={{textDecoration: 'none'}}>Back to AfterShot</a>
      </div>
    </main>
  );
}
