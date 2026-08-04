import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';

// Nudge the render worker so a new job doesn't sit until the next cron tick.
// The schedule is a 5-minute floor (GitHub's minimum, and it drifts under
// load), which is too slow for a create-then-review loop.
//
// Best-effort by design: with no token set this is a no-op and the cron still
// picks the job up, so a missing secret slows rendering rather than breaking it.
async function kickWorker() {
  const token = process.env.GITHUB_DISPATCH_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim() || 'danelas/aftershot';
  if (!token) return;
  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/dispatches`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
        'User-Agent': 'aftershot',
      },
      body: JSON.stringify({event_type: 'render-now'}),
    });
    if (!res.ok) {
      console.error('worker dispatch failed', res.status, (await res.text()).slice(0, 200));
    }
  } catch (e: any) {
    console.error('worker dispatch threw', e?.message);
  }
}

// POST /api/jobs  — the upload page calls this after putting the two files in
// the 'intake' bucket. Body: { uploadToken, beforePath, afterPath, hook?,
// beforeIsVideo?, afterIsVideo? }. Creates a pending job for the worker.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.uploadToken || !body?.beforePath || !body?.afterPath) {
    return NextResponse.json({error: 'missing fields'}, {status: 400});
  }
  const sb = serviceClient();

  const {data: customer} = await sb
    .from('customers')
    .select('id, status')
    .eq('upload_token', body.uploadToken)
    .maybeSingle();
  if (!customer) return NextResponse.json({error: 'unknown upload link'}, {status: 404});
  if (customer.status !== 'active') {
    return NextResponse.json({error: 'account paused'}, {status: 403});
  }

  const {data: job, error} = await sb
    .from('jobs')
    .insert({
      customer_id: customer.id,
      before_url: body.beforePath,
      after_url: body.afterPath,
      before_is_video: !!body.beforeIsVideo,
      after_is_video: !!body.afterIsVideo,
      hook: body.hook || null,
      // Capped server-side too — the client limit is a convenience, not a rule.
      extra_urls: Array.isArray(body.extraPaths)
        ? body.extraPaths.filter((p: unknown) => typeof p === 'string' && p).slice(0, 3)
        : [],
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  await sb.from('reminders').upsert({customer_id: customer.id, last_job_at: new Date().toISOString()});
  await kickWorker();
  return NextResponse.json({ok: true, jobId: job.id});
}
