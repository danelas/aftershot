import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';

// POST {token, jobId, newUrl} — swap a job's reel for the studio-edited render.
// The first edit stashes the worker's original in reel_url_original so an edit
// is never destructive.
export async function POST(req: NextRequest) {
  const {token, jobId, newUrl} = await req.json().catch(() => ({}));
  if (!token || !jobId || typeof newUrl !== 'string' || !newUrl.startsWith('https://')) {
    return NextResponse.json({error: 'bad request'}, {status: 400});
  }
  const sb = serviceClient();
  const {data: customer} = await sb
    .from('customers').select('id').eq('upload_token', token).maybeSingle();
  if (!customer) return NextResponse.json({error: 'invalid token'}, {status: 403});

  const {data: job} = await sb
    .from('jobs').select('id, customer_id, reel_url, reel_url_original')
    .eq('id', jobId).maybeSingle();
  if (!job || job.customer_id !== customer.id) {
    return NextResponse.json({error: 'job not found'}, {status: 404});
  }

  const {error} = await sb
    .from('jobs')
    .update({
      reel_url: newUrl,
      reel_url_original: job.reel_url_original || job.reel_url,
    })
    .eq('id', job.id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({ok: true});
}
