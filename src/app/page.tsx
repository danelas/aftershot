import DemoShowcase from './components/DemoShowcase';
import Reveal from './components/Reveal';
import SiteNav from './components/SiteNav';
import {InstagramMark, TikTokMark, YouTubeMark} from './components/BrandIcons';
import {
  Camera, Wand, Send, Star, Phone, Shield, MapPin, Palette, Music,
  Scissors, Check, Zap, Smartphone, ArrowRight, Play,
} from './components/Icons';

const TIERS = [
  {
    id: 'starter', name: 'Starter', price: 19, videos: '6 reels / month',
    tagline: 'For getting your pages active again',
    perks: [
      'Auto-posting to Instagram, TikTok & YouTube',
      'Branded sell-card with live Google rating',
      'Home-screen upload link — no app',
      'Studio editing + AI Magic edit',
    ],
  },
  {
    id: 'pro', name: 'Pro', price: 49, videos: '20 reels / month', popular: true,
    tagline: 'For crews posting most jobs they finish',
    perks: [
      'Everything in Starter',
      'Priority rendering — reels ready faster',
      'Job reminders so nothing goes unposted',
      'Multiple music styles & reveal effects',
    ],
  },
  {
    id: 'max', name: 'Max', price: 99, videos: 'Unlimited reels',
    tagline: 'For high-volume operators & multi-crew teams',
    perks: [
      'Everything in Pro',
      'Unlimited jobs — post every single one',
      'Up to 3 team upload links',
      'Priority support',
    ],
  },
];

export default function Home() {
  return (
    <>
      <SiteNav />

      <div className="hero-wrap">
        <span className="glow glow-hero" />
        <span className="glow glow-hero-2" />
        <section className="container hero">
          <div>
            <span className="hero-badge"><Zap size={14} /> Post every job without lifting a finger</span>
            <h1>Your before &amp; afters, <em>posted for you.</em></h1>
            <p className="sub">
              You already take the photos. AfterShot turns each job&apos;s before + after
              into a <b>branded reel</b> and posts it to your Instagram, TikTok, and
              YouTube — automatically. You never open an editor.
            </p>
            <div className="cta-row">
              <a href="/start" className="btn">Start free trial <ArrowRight size={18} /></a>
              <a href="#how" className="btn btn-ghost">See how it works</a>
            </div>
            <p className="fine">7 days free · no card required · plans from $19/mo</p>
            <div className="posts-to">
              <span className="posts-to-label">Posts to</span>
              <span className="pill-row">
                <span className="p-pill"><InstagramMark size={15} />Reels</span>
                <span className="p-pill"><TikTokMark size={15} />TikTok</span>
                <span className="p-pill"><YouTubeMark size={15} />Shorts</span>
              </span>
            </div>
          </div>
          <DemoShowcase />
        </section>
      </div>

      <section className="section alt" id="how">
        <div className="container">
          <Reveal>
            <span className="kicker">HOW IT WORKS</span>
            <h2>Two taps per job. That&apos;s the whole workflow.</h2>
            <p className="lead">
              Built for pressure washers, detailers, landscapers, painters — any trade
              whose work speaks for itself, run by people who&apos;d rather be working
              than editing video.
            </p>
          </Reveal>
          <div className="steps">
            <Reveal delay={0}>
              <div className="step">
                <div className="step-ico"><Camera /></div>
                <div className="num">STEP 1</div>
                <h3>Snap before &amp; after</h3>
                <p>
                  Finish the job, open your AfterShot link from your home screen, and
                  drop in the two photos you were already taking. Ten seconds, done.
                </p>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="step">
                <div className="step-ico"><Wand /></div>
                <div className="num">STEP 2</div>
                <h3>We build the reel</h3>
                <p>
                  Our engine turns them into a scroll-stopping vertical reel — motion,
                  music, a satisfying transformation reveal, and your branding on every
                  frame.
                </p>
              </div>
            </Reveal>
            <Reveal delay={240}>
              <div className="step">
                <div className="step-ico"><Send /></div>
                <div className="num">STEP 3</div>
                <h3>It posts itself</h3>
                <p>
                  The finished reel goes out to your Instagram, TikTok, and YouTube.
                  Your pages stay active on every platform without you touching any of
                  them.
                </p>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="section" id="reels">
        <div className="container">
          <Reveal>
            <span className="kicker">BUILT TO CONVERT</span>
            <h2>Every reel sells for you</h2>
            <p className="lead">
              These aren&apos;t generic slideshows. Each reel ends with a card built to
              turn viewers into booked jobs.
            </p>
          </Reveal>
          <div className="features">
            {[
              {ico: <Star />, t: 'Your live Google rating', d: 'We link your Google Business Profile and show your real star rating and review count — refreshed automatically.'},
              {ico: <Phone />, t: 'Call / Text button', d: 'Your phone number front and center as the call to action, so the next customer is one tap away.'},
              {ico: <Shield />, t: 'Licensed & Insured badge', d: 'The trust signal homeowners look for, on every single post.'},
              {ico: <MapPin />, t: 'Your service area', d: 'Area pills tell local viewers you work where they live.'},
              {ico: <Palette />, t: 'Your brand, your colors', d: 'Logo, brand color, handle, and starting price — set once, on every reel forever.'},
              {ico: <Music />, t: 'Music & motion built in', d: 'Licensed tracks, satisfying reveals, and polish that makes your work look as good as it is.'},
            ].map((f, i) => (
              <Reveal key={f.t} delay={(i % 3) * 100}>
                <div className="feature">
                  <div className="ico">{f.ico}</div>
                  <h3>{f.t}</h3>
                  <p>{f.d}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="section alt" id="studio">
        <div className="container studio-band">
          <Reveal>
            <div>
              <span className="kicker">THE STUDIO</span>
              <h2>Want it your way? Open Studio.</h2>
              <p className="lead">
                Every reel is ready to post as-is — but when you want control, each
                video opens in Studio for quick edits before it goes out.
              </p>
              <ul className="studio-list">
                {[
                  ['Magic edit (AI)', 'One tap and AI directs the whole edit — writes the hook, drops in your rating and call stickers, picks the music.'],
                  ['Trim & reorder', 'Cut the clip, change the reveal timing, swap which shot leads.'],
                  ['Swap the music', 'Pick from our licensed track library until it feels right.'],
                  ['Captions & text', 'Add a hook line or price callout with clean, readable styling.'],
                  ['Branding on tap', 'Adjust colors, logo placement, and the sell-card in seconds.'],
                ].map(([t, d]) => (
                  <li key={t}>
                    <span className="tick"><Check size={15} /></span>
                    <span><b>{t}</b> — {d}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <div className="studio-visual" aria-hidden="true">
              <div className="bar"><span className="dot" /><span className="dot" /><span className="dot" /></div>
              <div className="studio-row"><span className="sicon"><Wand size={17} /></span> Magic edit — AI-directed <span className="meter"><i style={{width: '92%'}} /></span></div>
              <div className="studio-row"><span className="sicon"><Play size={17} /></span> driveway-job-14.mp4 <span className="meter"><i style={{width: '68%'}} /></span></div>
              <div className="studio-row"><span className="sicon"><Scissors size={17} /></span> Trim <span className="meter"><i style={{width: '42%'}} /></span></div>
              <div className="studio-row"><span className="sicon"><Music size={17} /></span> Track: Uplift <span className="meter"><i style={{width: '80%'}} /></span></div>
              <div className="studio-row"><span className="sicon"><Palette size={17} /></span> Brand color · Logo · Sell-card</div>
              <div className="studio-row"><span className="sicon"><Send size={17} /></span> Post to IG · TikTok · YouTube</div>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="section" id="pricing">
        <span className="glow glow-pricing" />
        <div className="container">
          <Reveal>
            <span className="kicker">PRICING</span>
            <h2>Pick your pace</h2>
            <p className="lead">
              Every plan is the full product — auto-posting, branded reels, Studio
              editing, and a 7-day free trial. Just choose how many jobs you post.
            </p>
          </Reveal>
          <div className="tiers">
            {TIERS.map((t, i) => (
              <Reveal key={t.id} delay={i * 110}>
                <div className={`tier${t.popular ? ' popular' : ''}`}>
                  {t.popular && <span className="pop-badge">MOST POPULAR</span>}
                  <h3>{t.name}</h3>
                  <p className="tier-for">{t.tagline}</p>
                  <div className="amount">${t.price}<small>/mo</small></div>
                  <div className="videos">{t.videos}</div>
                  <ul>
                    {t.perks.map((p) => (
                      <li key={p}><span className="tick"><Check size={16} /></span>{p}</li>
                    ))}
                  </ul>
                  <a href={`/start?plan=${t.id}`} className={`btn${t.popular ? '' : ' btn-ghost'}`}>
                    Start 7-day free trial
                  </a>
                  <p className="fine">No card required · $0 today</p>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="pricing-note">
            All plans include every platform, every feature, and Studio editing. No contracts, no setup fees.
          </p>
        </div>
      </section>

      <section className="section alt">
        <div className="container">
          <Reveal>
            <span className="kicker">FAQ</span>
            <h2>Questions</h2>
            <p className="lead" />
          </Reveal>
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
              <summary>Can I change a reel before it posts?</summary>
              <p>
                Yes. Every reel is ready to go automatically, but you can open any
                video in Studio to trim it, swap the music, add captions, or tweak
                your branding — then send it out when it&apos;s right.
              </p>
            </details>
            <details>
              <summary>Which trades does this work for?</summary>
              <p>
                Any work with a dramatic before and after: pressure washing, auto
                detailing, landscaping, painting, roof &amp; gutter cleaning, epoxy
                floors, remodeling, junk removal, pool care, carpet &amp; tile,
                window cleaning — if your results speak for themselves in two
                photos, AfterShot will make them loud.
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
            <details>
              <summary>What happens after my free trial?</summary>
              <p>
                The trial needs no card at all, so there is nothing to cancel and
                no way for it to bill you by accident. Near the end of the 7 days
                we&apos;ll email you — add a card then if you want to keep posting,
                and if you don&apos;t, it simply stops.
              </p>
            </details>
          </div>
        </div>
      </section>

      <section className="final">
        <span className="glow-final" />
        <div className="container">
          <Reveal>
            <h2>Your next job is <em>your next ad.</em></h2>
            <p>Set up once. Then just keep doing great work — we&apos;ll make sure everyone sees it.</p>
            <a href="/start" className="btn">Start your free trial <ArrowRight size={18} /></a>
          </Reveal>
        </div>
      </section>

      <footer className="container footer">
        <span>© {new Date().getFullYear()} AfterShot</span>
        <span><a href="/start">Get started</a></span>
      </footer>
    </>
  );
}
