import {NextRequest, NextResponse} from 'next/server';
import {searchPlaces} from '@/lib/places';

// GET /api/places/search?q=aquashine+pressure+washing+jupiter
// Onboarding picker: returns up to 5 Google Business matches to choose from.
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q') ?? '';
  if (!q.trim()) return NextResponse.json({matches: []});
  try {
    return NextResponse.json({matches: await searchPlaces(q)});
  } catch (err: any) {
    return NextResponse.json({error: err?.message || 'search failed'}, {status: 500});
  }
}
