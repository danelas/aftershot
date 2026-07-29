export default function Home() {
  return (
    <main style={{fontFamily: 'system-ui, sans-serif', maxWidth: 720, margin: '0 auto', padding: '80px 24px'}}>
      <h1 style={{fontSize: 48, lineHeight: 1.05, margin: 0}}>
        Your before/afters, posted for you.
      </h1>
      <p style={{fontSize: 20, opacity: 0.7, marginTop: 20}}>
        Text-free reels for pressure washers, detailers, and landscapers. Drop a
        before + after from each job — we make the reel and post it to your
        Instagram, TikTok, and YouTube. You never open an editor.
      </p>
      <a
        href="/start"
        style={{display: 'inline-block', marginTop: 32, background: '#0EA5E9', color: '#fff', padding: '16px 28px', borderRadius: 14, fontWeight: 700, textDecoration: 'none', fontSize: 18}}
      >
        Start free
      </a>
      <p style={{marginTop: 16, opacity: 0.5, fontSize: 14}}>$79/mo founding rate · cancel anytime</p>
    </main>
  );
}
