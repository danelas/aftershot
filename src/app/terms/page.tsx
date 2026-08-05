import type {Metadata} from 'next';
import Legal from '../components/Legal';

export const metadata: Metadata = {
  title: 'Terms of Service — AfterShot',
  description:
    'The agreement between you and AfterShot: what the service does, what you are responsible for, billing, and cancellation.',
};

export default function Terms() {
  return (
    <Legal title="Terms of Service" updated="August 5, 2026">
      <p>
        These terms are the agreement between you and AfterShot. By setting up an
        account or using the service you accept them. They are written to be read,
        so please read them.
      </p>

      <h2>1. What AfterShot does</h2>
      <p>
        You upload a before and an after photo from a job. We turn them into a
        short branded video and, if you have connected your accounts, post it to
        Instagram, TikTok, YouTube and your Facebook Page for you. That is the
        service.
      </p>

      <h2>2. Your account</h2>
      <p>
        You must be at least 18 and using AfterShot for a business. You are
        responsible for what happens under your account.
      </p>
      <p>
        There are two ways in: signing in with Google or Facebook, and your secret
        upload link. <b>That upload link is a credential</b> — anyone who has it
        can reach your account, so do not post it publicly. Tell us straight away
        if you think someone else has it.
      </p>

      <h2>3. Your content, and the rights you give us</h2>
      <p>
        <b>Your photos, videos and logo stay yours.</b> We claim no ownership of
        them.
      </p>
      <p>
        You give us permission to store your files, edit and process them into
        videos, add your branding, and publish the result to the social accounts
        you have connected. That permission exists purely so we can run the
        service for you, and it ends when you delete the content or your account
        — apart from posts already published to a platform, which live there under
        your own account.
      </p>
      <p>By uploading, you confirm that:</p>
      <ul>
        <li>The photos are yours, or you have permission to use and publish them</li>
        <li>
          You have the necessary permission from any property owner or person who
          appears in them
        </li>
        <li>
          The claims in them are truthful — the after really is the result of the
          work you did
        </li>
        <li>
          Nothing you upload is unlawful, misleading, hateful, or infringes anyone
          else&apos;s rights
        </li>
      </ul>
      <p>
        We may refuse or remove content that breaks these rules or that would put
        us in breach of a platform&apos;s policies.
      </p>

      <h2>4. Connected social accounts</h2>
      <p>
        Connecting an account is optional and entirely your choice. When you do,
        you authorise AfterShot to publish videos on your behalf to that account
        until you disconnect it.
      </p>
      <p>
        Your use of Instagram, TikTok, YouTube and Facebook is governed by those
        platforms&apos; own terms, and you must follow them. Facebook reels go to a
        Page you manage, not a personal profile. Platforms can change their rules,
        rate-limit us, reject a post, or suspend accounts at any time, and we have
        no control over that. <b>We cannot guarantee that any given post will
        publish, stay up, or reach anyone.</b> You can disconnect everything at any
        time from your account page.
      </p>

      <h2>5. Free trial, plans and billing</h2>
      <ul>
        <li>New accounts get a <b>7-day free trial</b>. No card is required to start it.</li>
        <li>
          If you add a card, your plan begins automatically when the trial ends and
          renews each month until you cancel. If you never add a card, nothing can
          bill you — the service simply stops at the end of the trial.
        </li>
        <li>
          Payments are processed by Stripe. Prices are in US dollars and exclude
          any taxes that may apply.
        </li>
        <li>
          <b>Cancel any time</b> and you keep access to the end of the period you
          have already paid for. We do not pro-rate part-months.
        </li>
        <li>
          Plans include a set number of videos. We will tell you before changing
          your price, and you can cancel if you do not want to continue.
        </li>
      </ul>
      <p>
        If a payment fails we may pause your account until it is settled. Refunds
        are not automatic, but if something went genuinely wrong on our side,
        email us — we would rather sort it out than argue.
      </p>

      <h2>6. Acceptable use</h2>
      <p>Do not use AfterShot to:</p>
      <ul>
        <li>Post work that is not yours, or misrepresent results</li>
        <li>Upload anything unlawful, or anything you lack the rights to</li>
        <li>Spam platforms, or break their terms through us</li>
        <li>Resell or white-label the service without our written agreement</li>
        <li>Attack, scrape, reverse engineer, or attempt to break into the service</li>
      </ul>
      <p>We can suspend or close accounts that do these things.</p>

      <h2>7. Availability</h2>
      <p>
        We work to keep AfterShot running, but it is provided <b>as is</b>, without
        a guaranteed uptime. Rendering and posting depend on services we do not
        control, and they can fail or be delayed. We may change or discontinue
        features; if we ever discontinue the service entirely we will give you
        reasonable notice and a chance to download your videos.
      </p>

      <h2>8. Ending the agreement</h2>
      <p>
        You can stop at any time — cancel your plan, or ask us to delete your
        account (see the <a href="/data-deletion">data deletion page</a>). We can
        suspend or end an account that breaks these terms, or with reasonable
        notice for any other reason, in which case we will refund any unused
        prepaid period.
      </p>

      <h2>9. Liability</h2>
      <p>
        To the extent the law allows: AfterShot is not liable for indirect or
        consequential losses, lost profits, lost business, or lost data. Our total
        liability for any claim is limited to what you paid us in the twelve
        months before it arose. Nothing here excludes liability that cannot
        legally be excluded.
      </p>
      <p>
        You agree to cover us against claims arising from content you uploaded or
        published through the service, or from your breach of these terms.
      </p>

      <h2>10. Changes to these terms</h2>
      <p>
        We may update these terms. We will change the date at the top and email
        you about anything significant. Continuing to use AfterShot after a change
        means you accept it.
      </p>

      <h2>11. Governing law</h2>
      <p>
        These terms are governed by the laws of the State of Florida, USA, and the
        courts there have jurisdiction — without affecting any mandatory rights
        you have where you live.
      </p>

      <h2>12. Contact</h2>
      <p>
        AfterShot — <a href="mailto:hello@theaftershot.com">hello@theaftershot.com</a>
      </p>
      <p>
        See also our <a href="/privacy">Privacy Policy</a>, which forms part of
        this agreement.
      </p>
    </Legal>
  );
}
