import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {parseBrandKit} from '@/lib/studio';

// The customer's saved brand kit (colors/font/logo), remembered across clips.
export async function POST(req: NextRequest) {
  const {token, brandKit} = await req.json().catch(() => ({}));
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});
  const sb = serviceClient();
  const {data: customer} = await sb
    .from('customers').select('id').eq('upload_token', token).maybeSingle();
  if (!customer) return NextResponse.json({error: 'invalid token'}, {status: 403});
  const kit = parseBrandKit(brandKit);
  const {error} = await sb.from('customers').update({brand_kit: kit}).eq('id', customer.id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  return NextResponse.json({ok: true, brandKit: kit});
}
