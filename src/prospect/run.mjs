// AfterShot prospector: find before/after posts on Instagram, render a reel
// branded with the poster's own logo + phone, and queue it to Telegram so a
// human can DM it.
//
//   discover (Apify hashtag scrape)
//     → filter (carousel + "before"/"after" caption)
//     → brand (profile pic = logo, phone from bio/business contact)
//     → render (the normal customer pipeline: onboard → intake → job)
//     → queue (Telegram message with the reel + ready-to-paste DM text)
//
// The DM itself is deliberately manual. Instagram has no API for cold DMs and
// third-party senders get accounts banned; the whole design is "machine makes
// the asset, a thumb sends it".
//
// "Already contacted" is derived from the customers table itself: every
// prospect is onboarded as prospect-<handle>@theaftershot.com, so a handle
// whose customer row exists has been done. No state file, no migration, and
// every machine that runs this shares one memory. (A run that failed before
// onboarding retries next time — which is what you want.)
//
// Usage:
//   node src/prospect/run.mjs                 # full run (default 5 prospects)
//   node src/prospect/run.mjs --dry-run       # discover + filter only, no spend beyond the scrape
//   node src/prospect/run.mjs --limit 10
//   node src/prospect/run.mjs --hashtags pressurewashing,roofcleaning
//
// Env (.env / .env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
// APIFY_TOKEN, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID. Optional: PUBLIC_BASE_URL.

import 'dotenv/config';
import {createClient} from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';

const BASE = process.env.PUBLIC_BASE_URL || 'https://theaftershot.com';
const PROSPECT_EMAIL = (handle) => `prospect-${handle}@theaftershot.com`;
const HASHTAG_ACTOR = 'apify~instagram-hashtag-scraper';
const PROFILE_ACTOR = 'apify~instagram-profile-scraper';

// One entry per trade on /start — the hashtags are how each trade's work shows
// up on Instagram, and the trade value is what /api/onboard records so the reel
// copy fits. Caption keywords (below) decide which trade a found post belongs to.
const TRADE_HASHTAGS = {
  pressure_washing: ['pressurewashing', 'softwash', 'drivewaycleaning'],
  roof_cleaning: ['roofcleaning', 'roofwashing', 'guttercleaning'],
  detailing: ['autodetailing', 'cardetailing'],
  landscaping: ['landscaping', 'lawncare'],
  painting: ['housepainting', 'exteriorpainting'],
  epoxy_floors: ['epoxyflooring', 'epoxyfloors'],
  remodeling: ['bathroomremodel', 'kitchenremodel'],
  junk_removal: ['junkremoval'],
  cleaning: ['housecleaning', 'deepcleaning'],
  pool_care: ['poolcleaning'],
  carpet_tile: ['carpetcleaning', 'groutcleaning'],
  window_cleaning: ['windowcleaning'],
};
const DEFAULT_HASHTAGS = Object.values(TRADE_HASHTAGS).flat();

// The hashtag actor doesn't say which hashtag surfaced a post, so the caption
// decides the trade; first match wins, pressure washing is the fallback.
const TRADE_KEYWORDS = [
  ['roof_cleaning', /roof|gutter/],
  ['detailing', /detail|ceramic coat/],
  ['landscaping', /landscap|lawn|sod|mulch/],
  ['painting', /paint/],
  ['epoxy_floors', /epoxy|garage floor/],
  ['remodeling', /remodel|renovat|kitchen|bathroom/],
  ['junk_removal', /junk|haul/],
  ['pool_care', /pool/],
  ['carpet_tile', /carpet|grout|tile clean/],
  ['window_cleaning', /window/],
  ['cleaning', /house clean|deep clean|maid|office clean/],
  ['pressure_washing', /pressure|power wash|soft ?wash|driveway|paver/],
];

function tradeOf(post) {
  const cap = (post.caption || '').toLowerCase();
  for (const [trade, re] of TRADE_KEYWORDS) {
    if (re.test(cap)) return trade;
  }
  return 'pressure_washing';
}

// AfterShot-positioned, per Dan: the tool made the reel, not "I".
const dmText = (handle) =>
  `Hey! Loved your before/after work, so I ran your photos through AfterShot — ` +
  `it made you this free reel, yours to keep and post. It can do this for every ` +
  `job you finish. No pressure either way.`;

const args = process.argv.slice(2);
const flag = (name) => args.includes(`--${name}`);
const opt = (name, dflt) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : dflt;
};

const DRY = flag('dry-run');
const LIMIT = Number(opt('limit', '5'));
const HASHTAGS = opt('hashtags', DEFAULT_HASHTAGS.join(',')).split(',').map((h) => h.trim()).filter(Boolean);

function sb() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase env missing');
  return createClient(url, key);
}

// ── Apify ────────────────────────────────────────────────────────────────────

async function runActor(actor, input) {
  const token = process.env.APIFY_TOKEN;
  if (!token) throw new Error('APIFY_TOKEN missing');
  const url = `https://api.apify.com/v2/acts/${actor}/run-sync-get-dataset-items?token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify(input),
  });
  if (res.status === 402) throw new Error('Apify credit exhausted');
  if (!res.ok) throw new Error(`Apify ${actor} failed: HTTP ${res.status}`);
  const items = await res.json();
  return Array.isArray(items) ? items : [];
}

// A usable prospect post is a carousel whose caption says before & after and
// that has at least two still images — those two stills become the reel.
function isBeforeAfter(item) {
  const cap = (item.caption || '').toLowerCase();
  if (!/before/.test(cap) || !/after/.test(cap)) return false;
  const images = (item.childPosts || []).filter((c) => c.type === 'Image' && c.displayUrl);
  return item.type === 'Sidecar' && images.length >= 2;
}

async function discover() {
  console.log(`[discover] hashtags: ${HASHTAGS.join(', ')}`);
  const items = await runActor(HASHTAG_ACTOR, {
    hashtags: HASHTAGS,
    resultsLimit: 15, // per hashtag; the full trade list is ~24 tags, keep the sweep bounded
  });
  const posts = items.filter(isBeforeAfter);
  // One prospect per account per run — the first qualifying post wins.
  const byOwner = new Map();
  for (const p of posts) {
    const owner = p.ownerUsername;
    if (owner && !byOwner.has(owner)) byOwner.set(owner, p);
  }
  console.log(`[discover] ${items.length} posts → ${posts.length} before/after → ${byOwner.size} accounts`);
  return byOwner;
}

// Phone: IG business profiles sometimes expose it as a field; otherwise fish
// it out of the bio text.
function findPhone(profile) {
  if (profile?.publicPhoneNumber) return String(profile.publicPhoneNumber);
  const bio = profile?.biography || '';
  const m = bio.match(/\+?1?[\s.\-(]{0,2}\d{3}[\s.\-)]{0,2}\d{3}[\s.\-]?\d{4}/);
  return m ? m[0].trim() : null;
}

async function profileDetails(usernames) {
  if (!usernames.length) return new Map();
  const items = await runActor(PROFILE_ACTOR, {usernames});
  const map = new Map();
  for (const p of items) {
    if (p.username) map.set(p.username, p);
  }
  return map;
}

// ── Render (the normal customer pipeline, driven from outside) ───────────────

async function fetchBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${res.status}: ${url.slice(0, 80)}`);
  return Buffer.from(await res.arrayBuffer());
}

// Carousel order is only a guess at which shot is the before, and many trades
// post photos with BEFORE/AFTER already printed on them (the reel must not
// draw its own labels on top of those). One vision call answers both;
// on any failure we fall back to carousel order with labels off.
async function analyzePair(bytesA, bytesB) {
  const fallback = {before_index: 0, labels_baked_in: false};
  if (!process.env.ANTHROPIC_API_KEY) return fallback;
  try {
    const anthropic = new Anthropic();
    const img = (b) => ({
      type: 'image',
      source: {type: 'base64', media_type: 'image/jpeg', data: b.toString('base64')},
    });
    const response = await anthropic.messages.create({
      model: 'claude-opus-5',
      max_tokens: 1024,
      output_config: {
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              before_index: {
                type: 'integer',
                enum: [0, 1],
                description: 'Index of the BEFORE photo (worse/dirtier condition)',
              },
              labels_baked_in: {
                type: 'boolean',
                description: 'true if either photo already has BEFORE/AFTER text printed on it',
              },
            },
            required: ['before_index', 'labels_baked_in'],
            additionalProperties: false,
          },
        },
      },
      messages: [{
        role: 'user',
        content: [
          img(bytesA),
          img(bytesB),
          {
            type: 'text',
            text:
              'These are two photos from a home-services company\'s before/after post ' +
              '(cleaning, washing, painting, or similar). Image 0 is first, image 1 is second. ' +
              'Which image shows the BEFORE state (dirtier, more worn, pre-work)? ' +
              'And does either photo already have "BEFORE" or "AFTER" text printed on the image itself?',
          },
        ],
      }],
    });
    if (response.stop_reason === 'refusal') return fallback;
    const text = response.content.find((b) => b.type === 'text')?.text;
    if (!text) return fallback;
    const d = JSON.parse(text);
    return {
      before_index: d.before_index === 1 ? 1 : 0,
      labels_baked_in: !!d.labels_baked_in,
    };
  } catch (e) {
    console.error(`[vision] analysis failed, using carousel order: ${e.message}`);
    return fallback;
  }
}

async function createCustomer(handle, profile, trade) {
  const form = new FormData();
  form.set('businessName', profile?.fullName || handle);
  // Unique per handle — this row's existence is also the "already contacted" record.
  form.set('email', PROSPECT_EMAIL(handle));
  const phone = findPhone(profile);
  if (phone) form.set('phone', phone);
  form.set('trade', trade);
  form.set('ctaText', 'Free Quote');
  const pic = profile?.profilePicUrlHD || profile?.profilePicUrl;
  if (pic) {
    try {
      form.set('logo', new File([await fetchBytes(pic)], 'logo.jpg', {type: 'image/jpeg'}));
    } catch {
      // No logo beats no reel.
    }
  }
  const res = await fetch(`${BASE}/api/onboard`, {method: 'POST', body: form});
  const d = await res.json().catch(() => null);
  if (!res.ok || !d?.uploadToken) throw new Error(`onboard failed: ${JSON.stringify(d)}`);
  return {token: d.uploadToken, phone};
}

async function createJob(store, token, post) {
  const images = post.childPosts.filter((c) => c.type === 'Image' && c.displayUrl);
  const stamp = Date.now();
  const bytesA = await fetchBytes(images[0].displayUrl);
  const bytesB = await fetchBytes(images[1].displayUrl);
  const analysis = await analyzePair(bytesA, bytesB);
  const [beforeBytes, afterBytes] =
    analysis.before_index === 1 ? [bytesB, bytesA] : [bytesA, bytesB];

  const put = async (bytes, tag) => {
    const path = `${token}/${stamp}-${tag}.jpg`;
    const {error} = await store.storage.from('intake')
      .upload(path, bytes, {contentType: 'image/jpeg'});
    if (error) throw new Error(`intake upload: ${error.message}`);
    return path;
  };
  const before = await put(beforeBytes, 'before');
  const after = await put(afterBytes, 'after');
  const res = await fetch(`${BASE}/api/jobs`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({
      uploadToken: token,
      beforePath: before,
      afterPath: after,
      labelsBakedIn: analysis.labels_baked_in,
      style: 'wipe',
    }),
  });
  const d = await res.json().catch(() => null);
  if (!res.ok || !d?.jobId) throw new Error(`job create failed: ${JSON.stringify(d)}`);
  return d.jobId;
}

async function waitForReels(store, jobIds, timeoutMs = 15 * 60 * 1000) {
  const done = new Map();
  const start = Date.now();
  while (done.size < jobIds.length && Date.now() - start < timeoutMs) {
    const pending = jobIds.filter((id) => !done.has(id));
    const {data} = await store.from('jobs').select('id, status, reel_url').in('id', pending);
    for (const j of data || []) {
      if (j.reel_url) done.set(j.id, j.reel_url);
      else if (j.status === 'failed' || j.status === 'error') done.set(j.id, null);
    }
    if (done.size < jobIds.length) await new Promise((r) => setTimeout(r, 30000));
  }
  return done;
}

// ── Contacted-set + Telegram ─────────────────────────────────────────────────

async function contactedHandles(store) {
  const {data, error} = await store
    .from('customers')
    .select('email')
    .like('email', 'prospect-%@theaftershot.com');
  if (error) throw new Error(`customers query: ${error.message}`);
  return new Set(
    (data || []).map((r) => r.email.replace(/^prospect-/, '').replace(/@theaftershot\.com$/, '')),
  );
}

async function telegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    console.log('[telegram] not configured — skipping notify');
    return false;
  }
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({chat_id: chat, ...payload}),
  });
  if (!res.ok) console.error(`[telegram] ${method} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.ok;
}

async function queueToTelegram(p) {
  const lines = [
    `🧲 AfterShot prospect: ${p.name} (@${p.handle})`,
    p.phone ? `📞 ${p.phone}` : `📞 no phone found`,
    `🔗 https://instagram.com/${p.handle}`,
    ``,
    `DM to send (attach this video):`,
    dmText(p.handle),
  ];
  // sendVideo by URL keeps us under Telegram's upload limits and does no work.
  const sent = await telegram('sendVideo', {
    video: p.reelUrl,
    caption: lines.join('\n'),
  });
  // Some renders are too large for URL-side fetch; fall back to a plain message.
  if (!sent) await telegram('sendMessage', {text: lines.join('\n') + `\n\nReel: ${p.reelUrl}`});
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const store = sb();
  const seen = await contactedHandles(store);

  const byOwner = await discover();
  const fresh = [...byOwner.entries()].filter(([handle]) => !seen.has(handle)).slice(0, LIMIT);
  console.log(`[filter] ${fresh.length} new prospects (cap ${LIMIT}, ${seen.size} already contacted)`);
  if (DRY) {
    for (const [handle, post] of fresh) {
      console.log(`  @${handle} — ${(post.caption || '').slice(0, 80).replace(/\n/g, ' ')}`);
    }
    return;
  }
  if (!fresh.length) return;

  const profiles = await profileDetails(fresh.map(([h]) => h));

  const prospects = [];
  for (const [handle, post] of fresh) {
    try {
      const profile = profiles.get(handle);
      const {token, phone} = await createCustomer(handle, profile, tradeOf(post));
      const jobId = await createJob(store, token, post);
      prospects.push({handle, name: profile?.fullName || handle, phone, token, jobId, post: post.url});
      console.log(`[render] @${handle} → job ${jobId}`);
    } catch (e) {
      console.error(`[render] @${handle} failed: ${e.message}`);
    }
  }

  const reels = await waitForReels(store, prospects.map((p) => p.jobId));
  for (const p of prospects) {
    const reelUrl = reels.get(p.jobId);
    if (!reelUrl) {
      console.error(`[reel] @${p.handle} did not render in time`);
      continue;
    }
    p.reelUrl = reelUrl;
    await queueToTelegram(p);
    console.log(`[queue] @${p.handle} → ${reelUrl}`);
  }

  console.log(`[done] ${prospects.filter((p) => p.reelUrl).length}/${fresh.length} queued`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
