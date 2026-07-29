// AfterShot poster — publishes a rendered reel to a customer's connected social
// accounts via upload-post.com. Mirrors showcase-social-agent/ad-forge/src/post.ts
// (Apikey auth, async request_id + status poll, pending-is-not-failure). Each
// customer has their OWN upload-post profile (they connected their accounts).
import {readFile} from 'node:fs/promises';
import {basename} from 'node:path';

const API_BASE = 'https://api.upload-post.com/api';

function authHeader() {
  const key = (process.env.UPLOAD_POST_API_KEY ?? '').trim();
  if (!key) throw new Error('UPLOAD_POST_API_KEY not set');
  return {Authorization: `Apikey ${key}`};
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const POLL_MAX_MS = 10 * 60 * 1000;
const POLL_INTERVAL_MS = 6 * 1000;
const TERMINAL = new Set([
  'completed', 'complete', 'success', 'succeeded',
  'failed', 'error', 'rejected', 'posted', 'published',
]);

async function pollStatus(requestId) {
  const url = `${API_BASE}/uploadposts/status?request_id=${encodeURIComponent(requestId)}`;
  const start = Date.now();
  let last = null;
  while (Date.now() - start < POLL_MAX_MS) {
    await sleep(POLL_INTERVAL_MS);
    const resp = await fetch(url, {headers: authHeader()});
    if (!resp.ok) continue;
    try { last = JSON.parse(await resp.text()); } catch { last = null; }
    const o = last && typeof last === 'object' ? last : {};
    if (TERMINAL.has(String(o.status ?? o.state ?? '').toLowerCase())) {
      return {pending: false, body: last};
    }
  }
  // Accepted but unconfirmed — NOT a failure (learned from PeekScout).
  return {pending: true, last};
}

// profile: the customer's upload-post profile name. platforms: e.g.
// ['instagram','tiktok','youtube']. Returns the upload-post response body.
export async function postReel({mediaPath, title, caption, platforms, profile}) {
  if (!platforms?.length) throw new Error('No platforms to post to.');
  if (!profile) throw new Error('No upload-post profile for this customer.');

  const fileBuf = await readFile(mediaPath);
  const form = new FormData();
  form.append('user', profile);
  for (const p of platforms) form.append('platform[]', p);
  form.append('video', new Blob([fileBuf]), basename(mediaPath));
  form.append('title', title.slice(0, 90));
  form.append('description', caption);
  form.append('caption', caption);
  if (platforms.includes('instagram')) form.append('media_type', 'REELS');
  if (platforms.includes('tiktok')) {
    form.append('privacy_level', process.env.TIKTOK_PRIVACY_LEVEL || 'PUBLIC_TO_EVERYONE');
  }
  if (platforms.includes('facebook') && process.env.FACEBOOK_PAGE_ID) {
    form.append('facebook_page_id', process.env.FACEBOOK_PAGE_ID.trim());
    form.append('facebook_media_type', 'REELS');
  }

  const resp = await fetch(`${API_BASE}/upload`, {method: 'POST', headers: authHeader(), body: form});
  const text = await resp.text();
  if (!resp.ok) throw new Error(`upload-post HTTP ${resp.status}: ${text}`);
  let body;
  try { body = JSON.parse(text); } catch { body = text; }

  if (body && typeof body === 'object' && typeof body.request_id === 'string') {
    const result = await pollStatus(body.request_id);
    if (result.pending) return {submitted: true, request_id: body.request_id};
    body = result.body;
  }
  return body;
}

// Simple caption for a trade before/after. Later: AI-varied hooks per platform.
export function buildCaption({businessName, city, trade, hook}) {
  const svc = ({pressure_washing: 'Pressure washing', detailing: 'Auto detailing', landscaping: 'Landscaping'})[trade] || 'Transformation';
  const loc = city ? ` in ${city}` : '';
  const tags = ({
    pressure_washing: '#pressurewashing #satisfying #beforeandafter #cleaning #powerwashing',
    detailing: '#autodetailing #cardetailing #satisfying #beforeandafter',
    landscaping: '#landscaping #lawncare #transformation #beforeandafter',
  })[trade] || '#beforeandafter #satisfying';
  return `${hook || 'Look at this transformation'} 😳\n\n${svc}${loc} by ${businessName}. Book yours today!\n\n${tags}`;
}
