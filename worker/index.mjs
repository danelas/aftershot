// AfterShot worker — polls Supabase for pending jobs, renders the BeforeAfter
// reel headless via Remotion, uploads to Storage, then hands off to the poster.
// Runs as a GitHub Actions cron (WORKER_ONCE=1: drain the queue, then exit —
// see .github/workflows/worker.yml) or as a long-lived local loop.
import 'dotenv/config';
import {createClient} from '@supabase/supabase-js';
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import {readFile} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {postReel, buildCaption} from './poster.mjs';

// Safety gate: posting publishes to real accounts. Off by default so live
// render tests never post. Flip AUTOPOST=1 only when you mean to publish.
const AUTOPOST = process.env.AUTOPOST === '1';

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

// intake is a PRIVATE bucket — public URLs 400. Sign a short-lived read URL.
async function signedUrl(bucket, storagePath, expiresIn = 3600) {
  const {data, error} = await sb.storage.from(bucket).createSignedUrl(storagePath, expiresIn);
  if (error) throw new Error(`sign ${bucket}/${storagePath}: ${error.message}`);
  return data.signedUrl;
}

async function renderJob(job) {
  const c = job.customers;
  const serveUrl = await getBundle();
  const inputProps = {
    beforeUrl: await signedUrl('intake', job.before_url),
    afterUrl: await signedUrl('intake', job.after_url),
    beforeIsVideo: job.before_is_video,
    afterIsVideo: job.after_is_video,
    // Extra shots play after the reveal; each one lengthens the reel, which is
    // why the composition computes its duration from these.
    extraUrls: await Promise.all((job.extra_urls || []).map((p) => signedUrl('intake', p))),
    businessName: c.business_name,
    hook: job.hook || "You won't believe the difference",
    brandColor: c.brand_color || '#0EA5E9',
    logoUrl: c.logo_url || null,
    musicSrc: null, // TODO: pick a track from public/music per trade
    phone: c.phone || null,
    handle: c.handle || null,
    serviceArea: c.service_area || null,
    rating: c.rating != null ? Number(c.rating) : null,
    reviewCount: c.review_count != null ? Number(c.review_count) : null,
    licensedInsured: !!c.licensed_insured,
    priceFrom: c.price_from || null,
    ctaText: c.cta_text || 'Free Quote',
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
  return {reelUrl, localPath: outPath};
}

// Publish the rendered reel to the customer's connected accounts.
async function postJob(job, localPath) {
  const c = job.customers;
  const platforms = c.platforms?.length ? c.platforms : ['instagram', 'tiktok', 'youtube'];
  const caption = buildCaption({
    businessName: c.business_name,
    city: c.city,
    trade: c.trade,
    hook: job.hook,
  });
  // One posts row per platform for tracking.
  await sb.from('posts').insert(platforms.map((p) => ({job_id: job.id, platform: p, status: 'pending'})));
  await sb.from('jobs').update({status: 'posting'}).eq('id', job.id);

  const body = await postReel({
    mediaPath: localPath,
    title: `${c.business_name} — before & after`,
    caption,
    platforms,
    profile: c.upload_post_profile,
  });

  // Record per-platform outcome (best-effort; upload-post shape varies).
  for (const p of platforms) {
    const r = body && typeof body === 'object' ? body[p] : null;
    const ok = !(r && (r.error || /fail|error|reject/i.test(String(r.status ?? ''))));
    await sb
      .from('posts')
      .update({status: ok ? 'posted' : 'failed', error: ok ? null : JSON.stringify(r)})
      .eq('job_id', job.id)
      .eq('platform', p);
  }
  await sb.from('jobs').update({status: 'done'}).eq('id', job.id);
}

async function tick() {
  const job = await claimNextJob();
  if (!job) return false;
  try {
    const {localPath} = await renderJob(job);
    console.log(`[render] job ${job.id} → rendered`);
    if (!AUTOPOST) {
      console.log(`[post] job ${job.id} SKIPPED (AUTOPOST off) — reel ready, not published`);
    } else if (!job.customers?.upload_post_profile) {
      // They haven't linked any socials yet. The reel rendered fine and is
      // waiting in Studio — marking the job failed would be a lie.
      await sb.from('jobs').update({status: 'done'}).eq('id', job.id);
      console.log(`[post] job ${job.id} SKIPPED — no connected accounts yet; reel ready in Studio`);
    } else {
      await postJob(job, localPath);
      console.log(`[post] job ${job.id} → published`);
    }
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

// A job stuck in 'rendering' means a previous run crashed mid-render (e.g. a
// killed CI runner). Put anything older than 15 minutes back in the queue.
async function reclaimStale() {
  const cutoff = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const {data} = await sb
    .from('jobs')
    .update({status: 'pending'})
    .eq('status', 'rendering')
    .lt('created_at', cutoff)
    .select('id');
  for (const j of data || []) console.log(`[reclaim] job ${j.id} back to pending`);
}

const POLL_MS = 15000;
async function main() {
  console.log('AfterShot worker up.');
  await reclaimStale();
  // Drain mode (CI cron): render until the queue is empty, then exit.
  if (process.env.WORKER_ONCE === '1') {
    let n = 0;
    while (await tick()) n++;
    console.log(`drained — ${n} job(s) processed.`);
    return;
  }
  // Long-lived poll loop (local dev / a persistent host).
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
