import type {Metadata} from 'next';
import Legal from '../components/Legal';

// Meta requires a reachable "user data deletion instructions" URL for any app
// using Facebook Login, and checks it during review. Google doesn't demand a
// separate page, but links here from the privacy policy all the same.
export const metadata: Metadata = {
  title: 'Delete Your Data — AfterShot',
  description:
    'How to delete your AfterShot account and everything in it, including data received through Google or Facebook sign-in.',
};

export default function DataDeletion() {
  return (
    <Legal title="Delete Your Data" updated="August 5, 2026">
      <p>
        You can have your AfterShot account and everything in it deleted at any
        time. Here is exactly how, and exactly what happens.
      </p>

      <h2>Ask us to delete it</h2>
      <p>
        Email{' '}
        <a href="mailto:hello@theaftershot.com?subject=Delete%20my%20AfterShot%20data">
          hello@theaftershot.com
        </a>{' '}
        from the email address on your account, with the subject{' '}
        <b>&quot;Delete my AfterShot data&quot;</b>. Tell us your business name so we can
        find the right record.
      </p>
      <p>
        We ask you to write from the account&apos;s own address because that is how
        we confirm the request is really yours — we are not going to delete
        somebody&apos;s business history because a stranger asked us to. If you no
        longer have access to that inbox, email us anyway and we will find another
        way to verify you.
      </p>
      <p>
        You will get a confirmation once it is done. This is normally within a few
        days and always within <b>30 days</b>. There is no charge.
      </p>

      <h2>What gets deleted</h2>
      <ul>
        <li>Your account and business details — name, email, phone, service area, handle, pricing, branding and logo</li>
        <li>Every photo and video you uploaded</li>
        <li>Every reel we rendered for you, and its cover image</li>
        <li>Your publishing connections, so nothing further can be posted</li>
        <li>Your reminder settings and any push notification subscription</li>
        <li>
          The link between your account and your <b>Google or Facebook sign-in</b>,
          along with the name, email and account ID we received from that provider
        </li>
      </ul>

      <h2>What we may keep, and why</h2>
      <p>
        We keep the minimum billing and transaction records that tax and
        accounting law requires us to hold. These are financial records, not your
        photos or videos. Short-lived server logs age out on their own.
      </p>

      <h2>Posts that are already published</h2>
      <p>
        Reels that were already posted to Instagram, TikTok, YouTube or your
        Facebook Page live on those platforms under <b>your own account</b>, not
        ours. Deleting your AfterShot data does not remove them, and we have no
        way to reach in and delete them for you. Remove those from within each
        platform&apos;s own app.
      </p>

      <h2>Removing AfterShot from the Facebook side</h2>
      <p>
        If you signed in with Facebook, you can also revoke our access from your
        Facebook account directly, which is independent of anything we do:
      </p>
      <ul>
        <li>Open Facebook and go to <b>Settings &amp; Privacy → Settings</b></li>
        <li>Choose <b>Apps and Websites</b></li>
        <li>Find <b>AfterShot</b> in the list</li>
        <li>Select it and choose <b>Remove</b></li>
      </ul>
      <p>
        Removing the app there stops Facebook sharing anything further with us.
        Note that it does not by itself delete the data already stored in your
        AfterShot account — for that, email us as described above.
      </p>

      <h2>Removing AfterShot from the Google side</h2>
      <p>
        If you signed in with Google, visit{' '}
        <a
          href="https://myaccount.google.com/permissions"
          target="_blank"
          rel="noopener noreferrer"
        >
          your Google account permissions
        </a>
        , find <b>AfterShot</b>, and choose <b>Remove access</b>. The same caveat
        applies: it stops future sharing, but the deletion request above is what
        clears the data we already hold.
      </p>

      <h2>Just want to stop being billed?</h2>
      <p>
        If you only want to stop paying and keep your videos, you do not need to
        delete anything. Cancel your plan and email us — we will keep your account
        where it is.
      </p>

      <p>
        More detail on what we collect in the first place is in our{' '}
        <a href="/privacy">Privacy Policy</a>.
      </p>
    </Legal>
  );
}
