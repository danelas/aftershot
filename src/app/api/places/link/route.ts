import {NextRequest, NextResponse} from 'next/server';
import {serviceClient} from '@/lib/supabase';
import {getPlaceRating} from '@/lib/places';

// POST /api/places/link  { uploadToken, placeId }
// Onboarding: the business picked their Google listing → store the place id and
// pull the current rating/count onto their record. Later refreshed weekly.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.uploadToken || !body?.placeId) {
    return NextResponse.json({error: 'missing fields'}, {status: 400});
  }
  const info = await getPlaceRating(body.placeId).catch((e) => {
    throw e;
  });
  if (!info) return NextResponse.json({error: 'Places not configured'}, {status: 503});

  const sb = serviceClient();
  const {error} = await sb
    .from('customers')
    .update({
      google_place_id: body.placeId,
      rating: info.rating,
      review_count: info.reviewCount,
    })
    .eq('upload_token', body.uploadToken);
  if (error) return NextResponse.json({error: error.message}, {status: 500});

  return NextResponse.json({ok: true, rating: info.rating, reviewCount: info.reviewCount});
}
