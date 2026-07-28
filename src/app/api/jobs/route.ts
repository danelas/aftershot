import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';

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
      status: 'pending',
    })
    .select('id')
    .single();
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  await sb.from('reminders').upsert({customer_id: customer.id, last_job_at: new Date().toISOString()});
  return NextResponse.json({ok: true, jobId: job.id});
}
