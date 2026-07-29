// AfterShot worker — polls Supabase for pending jobs, renders the BeforeAfter
// reel headless via Remotion, uploads to Storage, then hands off to the poster.
// Runs as a Render cron/background worker (mirrors pro-email-extractor). Retries
// with backoff — learned from PeekScout's upload-post poll-timeout failures.
import {createClient} from '@supabase/supabase-js';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const sb = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const MAX_ATTEMPTS = 4;
let bundleUrl = null;

async function getBundle() {
  if (bundleUrl) return bundleUrl;
  bundleUrl = await bundle({entryPoint: path.resolve('remotion/index.tsx')});
  return bundleUrl;
}

async function claimNextJob() {
  // Grab one pending job and mark it rendering (naive lock; fine at low volume).
  const {data} = await sb
    .from('jobs')
    .select('*, customers(*)')
    .eq('status', 'pending')
    .order('created_at', {ascending: true})
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  await sb.from('jobs').update({status: 'rendering', attempts: data.attempts + 1}).eq('id', data.id);
  return data;
}

async function publicUrl(bucket, storagePath) {
  return sb.storage.from(bucket).getPublicUrl(storagePath).data.publicUrl;
}

async function renderJob(job) {
  const c = job.customers;
  const serveUrl = await getBundle();
  const inputProps = {
    beforeUrl: await publicUrl('intake', job.before_url),
    afterUrl: await publicUrl('intake', job.after_url),
    beforeIsVideo: job.before_is_video,
    afterIsVideo: job.after_is_video,
    businessName: c.business_name,
    hook: job.hook || "You won't believe the difference",
    brandColor: c.brand_color || '#0EA5E9',
    logoUrl: c.logo_url || null,
    musicSrc: null, // TODO: pick a track from public/music per trade
  };
  const composition = await selectComposition({serveUrl, id: 'BeforeAfter', inputProps});
  const outPath = path.join(os.tmpdir(), `aftershot-${job.id}.mp4`);
  await renderMedia({
    composition,
    serveUrl,
    codec: 'h264',
    outputLocation: outPath,
    inputProps,
    // This box: h264_mf + downscale (see ffmpeg-encoder memory). On Render's
    // Linux workers libx264 is fine — keep default codec there.
  });

  const mp4 = await readFile(outPath);
  const key = `${c.id}/${job.id}.mp4`;
  await sb.storage.from('reels').upload(key, mp4, {contentType: 'video/mp4', upsert: true});
  const reelUrl = await publicUrl('reels', key);
  await sb.from('jobs').update({status: 'rendered', reel_url: reelUrl}).eq('id', job.id);
  return reelUrl;
}

async function tick() {
  const job = await claimNextJob();
  if (!job) return false;
  try {
    await renderJob(job);
    // TODO(week2): enqueue posting — insert `posts` rows + call poster (upload-post).
    console.log(`[render] job ${job.id} → rendered`);
  } catch (err) {
    const failed = job.attempts + 1 >= MAX_ATTEMPTS;
    await sb
      .from('jobs')
      .update({status: failed ? 'failed' : 'pending', error: String(err?.message || err)})
      .eq('id', job.id);
    console.error(`[render] job ${job.id} failed (attempt ${job.attempts + 1})`, err);
  }
  return true;
}

// Poll loop.
const POLL_MS = 15000;
async function main() {
  console.log('AfterShot worker up.');
  for (;;) {
    let worked = false;
    try {
      worked = await tick();
    } catch (e) {
      console.error('tick error', e);
    }
    await new Promise((r) => setTimeout(r, worked ? 500 : POLL_MS));
  }
}
main();
