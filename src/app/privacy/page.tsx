import type {Metadata} from 'next';
import Legal from '../components/Legal';

export const metadata: Metadata = {
  title: 'Privacy Policy — AfterShot',
  description:
    'What AfterShot collects, what we do with it, and how to get it deleted. Covers Google and Facebook sign-in, job photos, and social publishing.',
};

export default function Privacy() {
  return (
    <Legal title="Privacy Policy" updated="August 5, 2026">
      <p>
        AfterShot turns the before and after photos from your jobs into short
        branded videos and posts them to your social accounts. This page explains
        exactly what we collect to do that, who we share it with, and how to get
        it deleted. It is written for the person actually using AfterShot — the
        owner of a trade business — not for lawyers.
      </p>
      <p>
        AfterShot is operated from the United States. If you use the service, your
        information is processed there.
      </p>

      <h2>1. Signing in with Google or Facebook</h2>
      <p>
        You can create or get back into an AfterShot account with <b>Sign in with
        Google</b> or <b>Sign in with Facebook</b>. When you do, that provider
        sends us a small, fixed set of information:
      </p>
      <ul>
        <li>Your <b>email address</b> (and whether the provider has verified it)</li>
        <li>Your <b>name</b> and, if the provider supplies one, your <b>profile picture</b></li>
        <li>A <b>provider account ID</b> — an opaque identifier for your Google or Facebook account</li>
      </ul>
      <p>
        We ask for nothing else. The permission scopes we request are limited to
        basic profile and email. We do not receive your password, your friends or
        contacts, your posts, your photos, your ad data, or your messages.
      </p>
      <p>
        We use this information for one purpose: to work out which AfterShot
        account is yours. We match the verified email address from Google or
        Facebook against the email on your AfterShot account and store the
        provider account ID so we recognise you next time. That is the whole job.
        Signing in with Facebook does <b>not</b> give us the ability to post
        anything to your personal Facebook profile.
      </p>

      <div className="legal-callout">
        <p>
          <b>Signing in is separate from publishing.</b> Connecting Instagram,
          TikTok, YouTube or a Facebook Page so AfterShot can post your reels is a
          different, optional step that you take from your account page, and it
          asks for its own permissions at that time. Section 3 covers it. You can
          use Facebook only to sign in and never connect it for posting, and
          nothing will be published anywhere.
        </p>
      </div>

      <h2>2. What you give us directly</h2>
      <ul>
        <li>
          <b>Business details</b> from setup: business name, email, phone number,
          trade, service area, social handle, starting price, brand colour, call
          to action, whether you are licensed and insured, and your logo. Most of
          this is printed onto your videos, so treat it as information you intend
          to be public.
        </li>
        <li>
          <b>Job photos and videos</b> — the before and after shots you upload
          after a job, any extra shots, and any caption or hook you type.
        </li>
        <li>
          <b>Your Google Business listing</b>, if you link one. We store the place
          ID and re-read the public star rating and review count from Google so
          your videos stay current.
        </li>
        <li>
          <b>Billing details</b> handled by Stripe. We store your Stripe customer
          and subscription IDs and your plan status. <b>We never see or store your
          full card number.</b>
        </li>
        <li>
          <b>Push notification subscription</b>, only if you allow notifications,
          so we can remind you to post a job.
        </li>
      </ul>
      <p>
        Please do not upload photos of the inside of a customer&apos;s home, of
        people, or of anything showing an address, licence plate, or document, if
        you have not been given permission to publish it. Videos AfterShot makes
        are intended to be posted publicly.
      </p>

      <h2>3. Connecting accounts for publishing</h2>
      <p>
        If you want AfterShot to post for you, you link your Instagram, TikTok,
        YouTube or Facebook Page from your account page. That handshake is run by{' '}
        <a href="https://www.upload-post.com" target="_blank" rel="noopener noreferrer">
          upload-post.com
        </a>
        , our publishing provider. You authorise the platform directly; the access
        tokens are held by upload-post, and <b>AfterShot never sees or stores your
        platform passwords</b>.
      </p>
      <p>
        From that point we send finished videos, captions and your business
        details to those platforms on your behalf, and we store what came back —
        the connected handle or page name, the post ID, and the permalink. We do
        not read your existing posts, followers, messages or analytics.
      </p>
      <p>
        Facebook reels are published to a <b>Facebook Page</b> you manage, never to
        a personal profile. You can disconnect every linked account at once from
        your account page, which revokes our ability to publish. Anything already
        posted stays on the platform until you delete it there.
      </p>

      <h2>4. What we collect automatically</h2>
      <p>
        Standard server logs (IP address, browser type, pages requested, and time)
        kept for security and debugging, and a session cookie that keeps you
        signed in. We do not run advertising trackers and we do not sell or rent
        your information to anyone, for any purpose.
      </p>

      <h2>5. Who we share it with</h2>
      <p>
        Only the companies needed to run the service, and only for that purpose:
      </p>
      <ul>
        <li><b>Supabase</b> — database, file storage, and the sign-in system</li>
        <li><b>Vercel</b> — hosting</li>
        <li><b>Stripe</b> — payments and card handling</li>
        <li><b>Resend</b> — the emails we send you</li>
        <li><b>upload-post.com</b> — publishing to your connected social accounts</li>
        <li><b>Google Maps Platform</b> — looking up your public business listing</li>
        <li>
          <b>Instagram, TikTok, YouTube and Facebook</b> — the videos and captions
          you have asked us to publish there
        </li>
      </ul>
      <p>
        We will also disclose information if the law requires it, or to
        investigate fraud or abuse of the service.
      </p>

      <h2>6. Where your files live</h2>
      <p>
        Photos you upload are stored in a <b>private</b> bucket that is not
        publicly browsable. Finished videos and their cover images are stored at{' '}
        <b>public, unguessable URLs</b> — this is a technical requirement, because
        the social platforms have to be able to fetch a video by link in order to
        post it. Anyone given one of those links can view that video. Since these
        videos are made to be posted publicly, that is the intent, but it is worth
        knowing.
      </p>
      <p>
        Your upload link (<code>/u/&lt;token&gt;</code>) contains a secret token
        and works as a key to your account. Treat it like a password and do not
        share it publicly.
      </p>

      <h2>7. How long we keep things</h2>
      <p>
        We keep your account details, jobs and videos for as long as your account
        is open, so your history stays available to you. Server logs are kept for
        a short period for security. When you delete your account we remove your
        data as described in section 8. We may keep billing records where tax or
        accounting law requires it.
      </p>

      <h2>8. Getting your data deleted</h2>
      <p>
        Email <a href="mailto:hello@theaftershot.com">hello@theaftershot.com</a>{' '}
        from the address on your account and ask us to delete it. We will remove
        your account, your business details, your uploaded photos, your rendered
        videos, your publishing connections and your Google or Facebook sign-in
        link, and confirm when it is done — normally within a few days, and within
        30 days at the outside.
      </p>
      <p>
        Full step-by-step instructions, including how to disconnect Facebook from
        the Facebook side, are on the{' '}
        <a href="/data-deletion">data deletion page</a>.
      </p>
      <p>
        Posts already published to Instagram, TikTok, YouTube or Facebook live on
        those platforms under your own account. We cannot remove them for you —
        you delete those in the platform&apos;s own app.
      </p>

      <h2>9. Your choices and rights</h2>
      <ul>
        <li>See or correct your details from your account page, or ask us and we will send you a copy</li>
        <li>Disconnect any or all linked social accounts at any time</li>
        <li>Turn off push notifications in your browser, and unsubscribe from emails</li>
        <li>Delete your account and everything in it (section 8)</li>
      </ul>
      <p>
        Depending on where you live you may have additional rights over your
        personal information, including access, correction, deletion, and the
        right to complain to a regulator. Write to us and we will honour them. We
        do not sell personal information.
      </p>

      <h2>10. Children</h2>
      <p>
        AfterShot is a tool for businesses and is not intended for anyone under
        18. We do not knowingly collect information from children. If you believe
        a child has given us information, email us and we will delete it.
      </p>

      <h2>11. Security</h2>
      <p>
        Traffic is encrypted in transit, files sit behind access controls, and
        card details never touch our servers. No system is perfect, so if we ever
        discover a breach affecting your information we will tell you.
      </p>

      <h2>12. Changes</h2>
      <p>
        If we change this policy we will update the date at the top, and for
        anything significant we will email you. Continuing to use AfterShot after
        a change means you accept the updated policy.
      </p>

      <h2>13. Contact</h2>
      <p>
        AfterShot — <a href="mailto:hello@theaftershot.com">hello@theaftershot.com</a>
      </p>
    </Legal>
  );
}
