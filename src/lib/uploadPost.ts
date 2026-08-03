// upload-post.com — the piece that lets a customer connect their OWN
// Instagram / TikTok / YouTube.
//
// We never handle platform OAuth or tokens ourselves. upload-post hosts a
// branded linking page; we mint a short-lived URL to it (`access_url`, valid
// 48h) and send the customer there. They come back to /account and the worker
// can then publish as them via worker/poster.mjs.
//
// Contract from https://docs.upload-post.com/openapi.json:
//   POST /uploadposts/users              {username}            -> {profile}
//   GET  /uploadposts/users/{username}                         -> {profile}
//   POST /uploadposts/users/generate-jwt {username, ...brand}  -> {access_url}
// Auth on all of them: `Authorization: Apikey <KEY>`.

const API_BASE = 'https://api.upload-post.com/api';

const KEY = () => process.env.UPLOAD_POST_API_KEY?.trim() || '';
export const uploadPostConfigured = () => Boolean(KEY());

// Platforms AfterShot publishes to. Keep in sync with customers.platforms.
export const SOCIAL_PLATFORMS = ['instagram', 'tiktok', 'youtube'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

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

  throw new Error(
    `upload-post create profile failed (${created.status}): ${JSON.stringify(created.body).slice(0, 300)}`,
  );
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

// The hosted, branded page where they actually link accounts. Valid ~48h.
export async function createConnectUrl(opts: {
  username: string;
  redirectUrl: string;
  businessName?: string | null;
  logoUrl?: string | null;
}): Promise<string> {
  const res = await call('/uploadposts/users/generate-jwt', {
    method: 'POST',
    headers: headers(true),
    body: JSON.stringify({
      username: opts.username,
      redirect_url: opts.redirectUrl,
      ...(opts.logoUrl ? {logo_image: opts.logoUrl} : {}),
      platforms: [...SOCIAL_PLATFORMS],
      connect_title: 'Connect your accounts to AfterShot',
      connect_description:
        `Link the accounts you want your before & after reels posted to${
          opts.businessName ? `, ${opts.businessName}` : ''
        }. You can disconnect any time.`,
      redirect_button_text: 'Back to AfterShot',
    }),
  });
  if (!res.ok || !res.body?.access_url) {
    throw new Error(
      `upload-post generate-jwt failed (${res.status}): ${JSON.stringify(res.body).slice(0, 300)}`,
    );
  }
  return res.body.access_url as string;
}
