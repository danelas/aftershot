// Publish an ad to AfterShot's OWN social accounts.
//
// Deliberately does NOT fall back to UPLOAD_POST_USER: that env var is the
// customer-job plumbing, and a fallback here would quietly publish our
// marketing to a customer's Instagram. The brand profile must be named
// explicitly in AFTERSHOT_SOCIAL_PROFILE.
//
// Heads up on upload-post seats: 1 profile = 1 account set, and the basic plan
// caps at 5. The brand profile spends one of those slots — the same limit that
// silently broke customer social connects before.
import {postReel, connectedPlatforms} from '../../worker/poster.mjs';

const DEFAULT_PLATFORMS = ['instagram', 'tiktok', 'youtube'];

export function socialProfile() {
  return (process.env.AFTERSHOT_SOCIAL_PROFILE ?? '').trim();
}

export function wantedPlatforms() {
  const raw = (process.env.SOCIAL_PLATFORMS ?? '').trim();
  if (!raw) return DEFAULT_PLATFORMS;
  return raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
}

/**
 * @param {string} mediaPath rendered mp4
 * @param {object} variant   the variants/*.json it came from
 */
export async function postAd(mediaPath, variant) {
  const profile = socialProfile();
  if (!profile) {
    throw new Error('AFTERSHOT_SOCIAL_PROFILE not set — refusing to guess which upload-post profile is ours.');
  }

  const wanted = wantedPlatforms();
  // Posting to a platform this profile hasn't linked fails the whole request,
  // taking the linked platforms down with it. Intersect first.
  const linked = await connectedPlatforms(profile);
  const platforms = wanted.filter((p) => linked.includes(p));
  const skipped = wanted.filter((p) => !linked.includes(p));
  if (skipped.length) console.log(`Not linked on ${profile}, skipping: ${skipped.join(', ')}`);
  if (!platforms.length) {
    throw new Error(
      `Profile "${profile}" has none of ${wanted.join(', ')} linked. Connect them at upload-post.com.`
    );
  }

  console.log(`Posting ${variant.id} to ${platforms.join(', ')} as ${profile}…`);
  const body = await postReel({
    mediaPath,
    title: variant.title,
    caption: variant.caption,
    platforms,
    profile,
    facebookPageId: (process.env.AFTERSHOT_FACEBOOK_PAGE_ID ?? '').trim() || null,
    // 2.5s in: hook + punchline fully revealed (punch spring lands ~1.85s and
    // every hook runs ≥3.6s). Without this IG covers the reel with frame 0,
    // which is black.
    thumbOffsetMs: Number(process.env.SOCIAL_THUMB_OFFSET_MS || 2500),
  });
  // upload-post accepts asynchronously; "submitted, unconfirmed" after the poll
  // window is not a failure (learned the hard way on PeekScout).
  if (body?.submitted) console.log(`Accepted, still processing (request_id ${body.request_id}).`);
  else console.log('Posted.');
  return {platforms, body};
}
