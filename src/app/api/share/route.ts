import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {buildCaption} from '@/lib/caption';
import {publishReel, uploadPostConfigured, isSocialPlatform} from '@/lib/uploadPost';

// Pulling the mp4 down and handing it to upload-post takes longer than the
// default serverless slice on a slow render.
export const runtime = 'nodejs';
export const maxDuration = 60;

// POST /api/share  { t, jobId, platforms: ['instagram', ...] }
// The owner picked which accounts to send a finished reel to, from the share
// row under the video on /account. Publishing is per-platform and idempotent:
// a platform that already has a posted row is skipped rather than duplicated.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = String(body?.t || '').trim();
  const jobId = String(body?.jobId || '').trim();
  const wanted: unknown[] = Array.isArray(body?.platforms) ? body.platforms : [];
  const platforms = wanted.filter(isSocialPlatform);
  const facebookPageId = String(body?.facebookPageId || '').trim() || null;
  if (!token || !jobId) return NextResponse.json({error: 'missing token or job'}, {status: 400});
  if (!platforms.length) return NextResponse.json({error: 'Pick at least one account.'}, {status: 400});
  if (!uploadPostConfigured()) {
    return NextResponse.json({error: 'Posting isn’t switched on for your account yet.'}, {status: 400});
  }

  const sb = serviceClient();
  const {data: customer} = await sb
    .from('customers')
    .select('id, business_name, city, trade, upload_token, upload_post_profile')
    .eq('upload_token', token)
    .maybeSingle();
  if (!customer) return NextResponse.json({error: 'not found'}, {status: 404});

  const {data: job} = await sb
    .from('jobs')
    .select('id, reel_url, hook')
    .eq('id', jobId)
    .eq('customer_id', customer.id)
    .maybeSingle();
  if (!job) return NextResponse.json({error: 'not found'}, {status: 404});
  if (!job.reel_url) return NextResponse.json({error: 'That reel is still rendering.'}, {status: 409});

  const {data: existing} = await sb
    .from('posts')
    .select('platform, status')
    .eq('job_id', job.id);
  const already = new Set((existing || []).filter((p) => p.status !== 'failed').map((p) => p.platform));
  const todo = platforms.filter((p) => !already.has(p));
  if (!todo.length) {
    return NextResponse.json({ok: true, posted: [], skipped: platforms});
  }

  // Mark them in flight first, so a retry while this request is still running
  // can't fire a second upload for the same platform. Anything here is either
  // absent or a previous failure, so clear then insert — posts has no unique
  // (job_id, platform) constraint to upsert against.
  await sb.from('posts').delete().eq('job_id', job.id).in('platform', todo);
  await sb.from('posts').insert(todo.map((p) => ({job_id: job.id, platform: p, status: 'pending'})));

  try {
    const {requestId} = await publishReel({
      username: customer.upload_post_profile || customer.upload_token,
      platforms: todo,
      videoUrl: job.reel_url,
      title: `${customer.business_name} — before & after`,
      caption: buildCaption({
        businessName: customer.business_name,
        city: customer.city,
        trade: customer.trade,
        hook: job.hook,
      }),
      facebookPageId,
    });
    // upload-post has accepted it; the platforms finish ingesting on their own
    // clock. Recording 'posted' here matches what the owner sees ("sent"), and
    // the worker's poll path is unchanged for auto-posted reels.
    for (const p of todo) {
      await sb
        .from('posts')
        .update({status: 'posted', external_id: requestId})
        .eq('job_id', job.id)
        .eq('platform', p);
    }
    return NextResponse.json({ok: true, posted: todo, skipped: platforms.filter((p) => already.has(p))});
  } catch (e: any) {
    const message = e?.message || 'Could not send that reel.';
    for (const p of todo) {
      await sb
        .from('posts')
        .update({status: 'failed', error: String(message).slice(0, 500)})
        .eq('job_id', job.id)
        .eq('platform', p);
    }
    console.error('share failed', {jobId, platforms: todo, message});
    return NextResponse.json({error: 'Could not send that reel — try again in a minute.'}, {status: 502});
  }
}
