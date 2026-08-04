import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';

// GET /api/jobs/status?t=<upload_token>&id=<job_id>
// Polled by the uploader on /account while a reel renders, so the finished
// video can appear right under the Create reel button instead of sending the
// owner off to Studio to look for it.
export async function GET(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get('t') || '').trim();
  const id = (req.nextUrl.searchParams.get('id') || '').trim();
  if (!token || !id) return NextResponse.json({error: 'missing token or id'}, {status: 400});

  const sb = serviceClient();
  const {data: customer} = await sb
    .from('customers')
    .select('id')
    .eq('upload_token', token)
    .maybeSingle();
  if (!customer) return NextResponse.json({error: 'not found'}, {status: 404});

  const {data: job} = await sb
    .from('jobs')
    .select('id, reel_url, status, error')
    .eq('id', id)
    // Scoped to this customer so a token can only ever poll its own jobs.
    .eq('customer_id', customer.id)
    .maybeSingle();
  if (!job) return NextResponse.json({error: 'not found'}, {status: 404});

  // Which platforms this reel already went to (auto-post, or an earlier share),
  // so the share row can say "Posted" instead of offering a duplicate.
  const {data: posts} = await sb
    .from('posts')
    .select('platform, status')
    .eq('job_id', job.id);

  return NextResponse.json({
    id: job.id,
    state: job.reel_url ? 'ready' : job.status === 'failed' ? 'failed' : 'rendering',
    url: job.reel_url || null,
    error: job.reel_url ? null : job.error || null,
    posts: (posts || []).map((p) => ({platform: p.platform, status: p.status})),
  });
}
