import BeforeAfterSlider from './components/BeforeAfterSlider';

export default function Home() {
  return (
    <>
      <header className="container">
        <nav className="nav">
          <a href="/" className="logo">After<span>Shot</span></a>
          <div className="nav-links">
            <a href="#how">How it works</a>
            <a href="#reels">What&apos;s on your reels</a>
            <a href="#pricing">Pricing</a>
            <a href="/start" className="btn btn-sm">Start free</a>
          </div>
        </nav>
      </header>

      <section className="container hero">
        <div>
          <h1>Your before &amp; afters, <em>posted for you.</em></h1>
          <p className="sub">
            You already take the photos. AfterShot turns each job&apos;s before + after
            into a branded reel and posts it to your Instagram, TikTok, and YouTube —
            automatically. You never open an editor.
          </p>
          <a href="/start" className="btn">Start free — set up in 2 minutes</a>
          <p className="fine">$79/mo founding rate · normally $99–149 · cancel anytime</p>
        </div>
        <BeforeAfterSlider />
      </section>

      <section className="section alt" id="how">
        <div className="container">
          <h2>Two taps per job. That&apos;s the whole workflow.</h2>
          <p className="lead">
            Built for pressure washers, detailers, and landscapers who&apos;d rather be
            working than editing video.
          </p>
          <div className="steps">
            <div className="step">
              <div className="num">1</div>
              <h3>Snap before &amp; after</h3>
              <p>
                Finish the job, open your AfterShot link from your home screen, and
                drop in the two photos you were already taking. Done in ten seconds.
              </p>
            </div>
            <div className="step">
              <div className="num">2</div>
              <h3>We build the reel</h3>
              <p>
                Our engine turns them into a scroll-stopping vertical reel — motion,
                music, a satisfying transformation reveal, and your branding on every
                frame.
              </p>
            </div>
            <div className="step">
              <div className="num">3</div>
              <h3>It posts itself</h3>
              <p>
                The finished reel goes out to your Instagram, TikTok, and YouTube.
                Your pages stay active on every platform without you touching any of
                them.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="reels">
        <div className="container">
          <h2>Every reel sells for you</h2>
          <p className="lead">
            These aren&apos;t generic slideshows. Each reel ends with a card built to
            turn viewers into booked jobs.
          </p>
          <div className="features">
            <div className="feature">
              <div className="ico">⭐</div>
              <h3>Your live Google rating</h3>
              <p>We link your Google Business Profile and show your real star rating and review count — refreshed automatically.</p>
            </div>
            <div className="feature">
              <div className="ico">📞</div>
              <h3>Call / Text button</h3>
              <p>Your phone number front and center as the call to action, so the next customer is one tap away.</p>
            </div>
            <div className="feature">
              <div className="ico">🛡️</div>
              <h3>Licensed &amp; Insured badge</h3>
              <p>The trust signal homeowners look for, on every single post.</p>
            </div>
            <div className="feature">
              <div className="ico">📍</div>
              <h3>Your service area</h3>
              <p>Area pills tell local viewers you work where they live.</p>
            </div>
            <div className="feature">
              <div className="ico">🎨</div>
              <h3>Your brand, your colors</h3>
              <p>Logo, brand color, handle, and starting price — set once, on every reel forever.</p>
            </div>
            <div className="feature">
              <div className="ico">🎵</div>
              <h3>Music &amp; motion built in</h3>
              <p>Licensed tracks, satisfying reveals, and polish that makes your work look as good as it is.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section alt" id="pricing">
        <div className="container">
          <h2>Simple pricing</h2>
          <p className="lead">One plan. Everything included. Lock the founding rate before it&apos;s gone.</p>
          <div className="price-card">
            <div className="badge">FOUNDING RATE</div>
            <div>
              <span className="price">$79<small>/mo</small></span>
              <span className="was">$99–149</span>
            </div>
            <ul>
              <li>Unlimited before/after reels</li>
              <li>Auto-posting to Instagram, TikTok &amp; YouTube</li>
              <li>Branded sell-card with live Google rating</li>
              <li>Home-screen upload link — no app to install</li>
              <li>Reminders so no job goes unposted</li>
            </ul>
            <a href="/start" className="btn" style={{width: '100%'}}>Start free</a>
            <p className="fine">No contract. Cancel anytime.</p>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2>Questions</h2>
          <p className="lead" />
          <div className="faq">
            <details>
              <summary>Do I need to install an app?</summary>
              <p>
                No. You get a personal upload link you add to your phone&apos;s home
                screen once. After every job, tap it and drop in your two photos —
                that&apos;s the entire routine.
              </p>
            </details>
            <details>
              <summary>What if I&apos;m terrible at social media?</summary>
              <p>
                Perfect — that&apos;s who this is for. You never write captions, pick
                music, edit clips, or open Instagram. Your only job is the two photos
                you were already taking to cover yourself anyway.
              </p>
            </details>
            <details>
              <summary>Which trades does this work for?</summary>
              <p>
                Any work with a dramatic before and after: pressure washing, auto
                detailing, and landscaping are where we started. If your results
                speak for themselves in two photos, AfterShot will make them loud.
              </p>
            </details>
            <details>
              <summary>How does posting to my accounts work?</summary>
              <p>
                During setup you securely connect your Instagram, TikTok, and YouTube
                once. From then on, finished reels publish straight to your pages. You
                can pause or disconnect any platform whenever you want.
              </p>
            </details>
            <details>
              <summary>Do reels actually bring in jobs?</summary>
              <p>
                Before/after content is the highest-performing format in the trades —
                it&apos;s satisfying, shareable, and proves your work. Every reel ends
                with your rating, service area, and a Call/Text button so viewers can
                become customers on the spot.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="final">
        <div className="container">
          <h2>Your next job is your next ad.</h2>
          <p>Set up once. Then just keep doing great work — we&apos;ll make sure everyone sees it.</p>
          <a href="/start" className="btn">Start free — lock in $79/mo</a>
        </div>
      </section>

      <footer className="container footer">
        <span>© {new Date().getFullYear()} AfterShot</span>
        <span><a href="/start">Get started</a></span>
      </footer>
    </>
  );
}
