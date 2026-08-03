import {NextRequest, NextResponse} from 'next/server';
import {searchPlaces, placesConfigured} from '@/lib/places';

// GET /api/places/search?q=aquashine+pressure+washing+jupiter
// Onboarding picker: returns up to 5 Google Business matches to choose from.
// `configured: false` tells the UI to offer the manual rating fields instead of
// silently showing zero matches.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!placesConfigured()) {
    return NextResponse.json({matches: [], configured: false}, {status: 200});
  }
  if (!q.trim()) return NextResponse.json({matches: [], configured: true});
  try {
    return NextResponse.json({matches: await searchPlaces(q), configured: true});
  } catch (err: any) {
    console.error('places search failed:', err?.message);
    return NextResponse.json(
      {matches: [], configured: true, error: 'Google lookup failed. Enter your rating below instead.'},
      {status: 200},
    );
  }
}
