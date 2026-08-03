import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {parseBrandKit} from '@/lib/studio';

// Logo management for an existing customer. The signup form takes a logo but
// it's optional, and until now there was no way to add or change one
// afterwards — so anyone who skipped it was stuck with unbranded reels.
//
// Writes BOTH customers.logo_url (the auto-posted reel's end card) and
// brand_kit.logoUrl (Studio's watermark overlay). They were separate fields
// with the same name and no sync, which meant uploading in one place silently
// did nothing in the other.

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'];

async function customerFor(token: string) {
  const sb = serviceClient();
  const {data} = await sb
    .from('customers')
    .select('id, upload_token, logo_url, brand_kit')
    .eq('upload_token', token)
    .maybeSingle();
  return {sb, customer: data};
}

// Keep the Studio kit pointing at the same image (or clear it alongside).
async function syncBrandKit(sb: any, id: string, existingKit: unknown, logoUrl: string | null) {
  const kit = parseBrandKit(existingKit);
  if (logoUrl) kit.logoUrl = logoUrl;
  else delete kit.logoUrl;
  await sb.from('customers').update({brand_kit: kit}).eq('id', id);
}

// POST /api/account/logo   multipart: t=<upload_token>, logo=<file>
export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({error: 'bad form'}, {status: 400});

  const token = (form.get('t')?.toString() || '').trim();
  const file = form.get('logo');
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});
  if (!file || typeof file === 'string' || file.size === 0) {
    return NextResponse.json({error: 'No file received.'}, {status: 400});
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({error: 'That file is over 5MB — try a smaller PNG.'}, {status: 413});
  }
  if (file.type && !ALLOWED.includes(file.type)) {
    return NextResponse.json({error: 'Use a PNG, JPG, WEBP or SVG.'}, {status: 415});
  }

  const {sb, customer} = await customerFor(token);
  if (!customer) return NextResponse.json({error: 'not found'}, {status: 404});

  const ext = (file.name.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '');
  const key = `logos/${customer.upload_token}.${ext}`;
  const {error: upErr} = await sb.storage
    .from('reels')
    .upload(key, Buffer.from(await file.arrayBuffer()), {
      contentType: file.type || 'image/png',
      upsert: true,
    });
  if (upErr) {
    console.error('logo upload failed', upErr.message);
    return NextResponse.json({error: 'Could not save that image. Try again.'}, {status: 500});
  }

  // Cache-bust: the key is stable per customer, so a replacement would
  // otherwise keep serving the old image from CDN/browser cache.
  const base = sb.storage.from('reels').getPublicUrl(key).data.publicUrl;
  const url = `${base}?v=${Date.now()}`;

  const {error} = await sb.from('customers').update({logo_url: url}).eq('id', customer.id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  await syncBrandKit(sb, customer.id, customer.brand_kit, url);

  return NextResponse.json({ok: true, logoUrl: url});
}

// DELETE /api/account/logo?t=<upload_token>
export async function DELETE(req: NextRequest) {
  const token = (req.nextUrl.searchParams.get('t') || '').trim();
  if (!token) return NextResponse.json({error: 'missing token'}, {status: 400});

  const {sb, customer} = await customerFor(token);
  if (!customer) return NextResponse.json({error: 'not found'}, {status: 404});

  const {error} = await sb.from('customers').update({logo_url: null}).eq('id', customer.id);
  if (error) return NextResponse.json({error: error.message}, {status: 500});
  await syncBrandKit(sb, customer.id, customer.brand_kit, null);

  // The stored object is left in place deliberately — it costs nothing and
  // an accidental removal stays recoverable.
  return NextResponse.json({ok: true, logoUrl: null});
}
