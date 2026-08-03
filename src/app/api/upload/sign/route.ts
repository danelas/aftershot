import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';

// POST {token, kind, ext} → single-shot signed upload URL into the public
// reels bucket, so multi-MB studio renders bypass Vercel's body-size cap.
export async function POST(req: NextRequest) {
  const {token, kind, ext} = await req.json().catch(() => ({}));
  if (!token || !['video', 'image'].includes(kind)) {
    return NextResponse.json({error: 'bad request'}, {status: 400});
  }
  const safeExt = String(ext || (kind === 'video' ? 'mp4' : 'jpg')).replace(/[^a-z0-9]/gi, '').slice(0, 5) || 'bin';
  const sb = serviceClient();
  const {data: customer} = await sb
    .from('customers').select('id').eq('upload_token', token).maybeSingle();
  if (!customer) return NextResponse.json({error: 'invalid token'}, {status: 403});

  const key = `${customer.id}/studio/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
  const {data, error} = await sb.storage.from('reels').createSignedUploadUrl(key);
  if (error || !data) return NextResponse.json({error: error?.message || 'sign failed'}, {status: 500});
  return NextResponse.json({
    uploadUrl: data.signedUrl,
    publicUrl: sb.storage.from('reels').getPublicUrl(key).data.publicUrl,
  });
}
