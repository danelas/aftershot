// upload-post.com — the piece that lets a customer connect their OWN
// Instagram / TikTok / YouTube.
//
// We never handle platform OAuth or tokens ourselves. upload-post hosts a
// branded linking page; we mint a short-lived URL to it (`access_url`, valid
// 48h) and send the customer there. They come back to /account and the worker
// can then publish as them via worker/poster.mjs.
//
// Contract from https://docs.upload-post.com/openapi.json:
//   POST /uploadposts/users                 {username}              -> {profile}
//   GET  /uploadposts/users/{username}                              -> {profile}
//   POST /uploadposts/oauth/{platform}/start {profile, redirect_url} -> {authorize_url}
//   GET  /uploadposts/facebook/pages?profile=…                      -> {pages}
//   DELETE /uploadposts/users               {username}
// Auth on all of them: `Authorization: Apikey <KEY>`.

const API_BASE = 'https://api.upload-post.com/api';

const KEY = () => process.env.UPLOAD_POST_API_KEY?.trim() || '';
export const uploadPostConfigured = () => Boolean(KEY());

// Platforms AfterShot publishes to. Keep in sync with customers.platforms.
export const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const PLATFORM_LABEL: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  facebook: 'Facebook',
};

export const isSocialPlatform = (v: unknown): v is SocialPlatform =>
  typeof v === 'string' && (SOCIAL_PLATFORMS as readonly string[]).includes(v);

// upload-post caps profiles by plan tier. Hitting that ceiling looks like a
// generic 403, but it is the one failure the owner can actually fix — so it
// gets its own type all the way out to the UI instead of "try again".
export class ProfileLimitError extends Error {
  readonly limit: number;
  constructor(limit: number) {
    super(`upload-post plan allows ${limit} connected profiles and they are all in use.`);
    this.name = 'ProfileLimitError';
    this.limit = limit;
  }
}

export type ConnectedAccount = {
  platform: string;
  handle: string | null;
  displayName: string | null;
  avatar: string | null;
  reauthRequired: boolean;
};

function headers(json = false): Record<string, string> {
  if (!KEY()) throw new Error('UPLOAD_POST_API_KEY is not set');
  return {
    Authorization: `Apikey ${KEY()}`,
    ...(json ? {'Content-Type': 'application/json'} : {}),
  };
}

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`${API_BASE}${path}`, init);
  const text = await res.text();
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return {ok: res.ok, status: res.status, body};
}

// Idempotent: creating a profile that already exists is success for us.
export async function ensureProfile(username: string): Promise<void> {
  const created = await call('/uploadposts/users', {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({username}),
  });
  if (created.ok) return;

  // Already-exists shows up as a 4xx; confirm by reading it back rather than
  // pattern-matching their error copy.
  const existing = await call(`/uploadposts/users/${encodeURIComponent(username)}`, {headers: headers()});
  if (existing.ok) return;

  // The profile really is new and the plan has no room for it.
  if (created.body?.error_code === 'PROFILE_LIMIT_REACHED') {
    throw new ProfileLimitError(Number(created.body?.profile_limit) || 0);
  }

  throw new Error(
    `upload-post create profile failed (${created.status}): ${JSON.stringify(created.body).slice(0, 300)}`,
  );
}

// Start the OAuth handshake for a single platform. Returns the URL to send the
// owner to; they come back to redirectUrl with ?connected=<platform>.
//
// One button per platform rather than one hosted page for all of them: the
// owner sees exactly which accounts are linked and links the rest in place.
export async function startConnect(opts: {
  platform: SocialPlatform;
  username: string;
  redirectUrl: string;
}): Promise<string> {
  const res = await call(`/uploadposts/oauth/${opts.platform}/start`, {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({profile: opts.username, redirect_url: opts.redirectUrl}),
  });
  const url = res.body?.authorize_url;
  if (!res.ok || typeof url !== 'string' || !url) {
    throw new Error(
      `upload-post oauth start failed (${res.status}): ${JSON.stringify(res.body).slice(0, 300)}`,
    );
  }
  return url;
}

export type FacebookPage = {id: string; name: string};

// Facebook publishes to a Page, not to the person, and the page list lives
// behind its own endpoint rather than in social_accounts. upload-post picks the
// page itself when there is exactly one; several means the owner has to choose.
export async function getFacebookPages(username: string): Promise<FacebookPage[]> {
  const res = await call(`/uploadposts/facebook/pages?profile=${encodeURIComponent(username)}`, {
    headers: headers(),
  });
  if (!res.ok) return [];
  const pages = Array.isArray(res.body?.pages) ? res.body.pages : [];
  return pages
    .map((p: any) => ({id: String(p?.id ?? ''), name: String(p?.name ?? '')}))
    .filter((p: FacebookPage) => p.id);
}

// upload-post exposes no per-platform unlink — only profile deletion. So
// "disconnect" drops the profile and recreates it empty, unlinking everything
// at once. The UI says so plainly rather than implying it's per-account.
export async function disconnectAll(username: string): Promise<void> {
  const res = await call('/uploadposts/users', {
    method: 'DELETE',
    headers: headers(true),
    body: JSON.stringify({username}),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`upload-post delete profile failed (${res.status})`);
  }
  await ensureProfile(username);
}

// Which of their socials are actually linked right now.
export async function getConnectedAccounts(username: string): Promise<ConnectedAccount[]> {
  const res = await call(`/uploadposts/users/${encodeURIComponent(username)}`, {headers: headers()});
  if (!res.ok) {
    if (res.status === 404) return [];
    throw new Error(`upload-post profile lookup failed (${res.status})`);
  }
  const accounts = res.body?.profile?.social_accounts ?? {};
  const out: ConnectedAccount[] = [];
  for (const [platform, raw] of Object.entries<any>(accounts)) {
    // social_accounts values are polymorphic: object | string | null.
    if (!raw) continue;
    if (typeof raw === 'string') {
      if (!raw.trim()) continue;
      out.push({platform, handle: raw, displayName: null, avatar: null, reauthRequired: false});
      continue;
    }
    const handle = raw.handle || raw.username || null;
    if (!handle && !raw.display_name) continue;
    out.push({
      platform,
      handle,
      displayName: raw.display_name ?? null,
      avatar: raw.social_images ?? null,
      reauthRequired: Boolean(raw.reauth_required),
    });
  }
  return out;
}

// Publish a rendered reel to the platforms the owner picked, from the web app
// (the "Share" buttons under a finished reel on /account). The worker has its
// own copy of this in worker/poster.mjs — that one posts a local file and can
// afford to poll for ten minutes; a request-scoped route can't, so this hands
// the upload off and returns the request_id without waiting for the platforms
// to finish ingesting. Accepted-but-unconfirmed is not a failure.
export async function publishReel(opts: {
  username: string;
  platforms: string[];
  videoUrl: string;
  title: string;
  caption: string;
  facebookPageId?: string | null;
}): Promise<{requestId: string | null; body: any}> {
  if (!opts.platforms.length) throw new Error('No platforms selected.');

  const media = await fetch(opts.videoUrl);
  if (!media.ok) throw new Error(`Could not read the rendered reel (${media.status}).`);
  const blob = await media.blob();

  const form = new FormData();
  form.append('user', opts.username);
  for (const p of opts.platforms) form.append('platform[]', p);
  form.append('video', blob, 'reel.mp4');
  form.append('title', opts.title.slice(0, 90));
  form.append('description', opts.caption);
  form.append('caption', opts.caption);
  if (opts.platforms.includes('instagram')) form.append('media_type', 'REELS');
  if (opts.platforms.includes('tiktok')) {
    // MEDIA_UPLOAD drops the reel into the creator's TikTok drafts inbox, where
    // nothing but the phone app can finish it — there is no API to publish a
    // draft. Always ask for DIRECT_POST so a stray default can't strand a post.
    form.append('post_mode', 'DIRECT_POST');
    form.append('privacy_level', process.env.TIKTOK_PRIVACY_LEVEL || 'PUBLIC_TO_EVERYONE');
  }
  if (opts.platforms.includes('facebook')) {
    form.append('facebook_media_type', 'REELS');
    if (opts.caption) form.append('facebook_description', opts.caption);
    // Omitted when the owner has a single Page — upload-post auto-detects it.
    if (opts.facebookPageId) form.append('facebook_page_id', opts.facebookPageId);
  }

  const res = await fetch(`${API_BASE}/upload`, {method: 'POST', headers: headers(), body: form});
  const text = await res.text();
  if (!res.ok) throw new Error(`upload-post HTTP ${res.status}: ${text.slice(0, 300)}`);
  let body: any = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  const requestId = body && typeof body === 'object' && typeof body.request_id === 'string' ? body.request_id : null;
  return {requestId, body};
}
