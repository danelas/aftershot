// Google Places API (New) — pull a business's real Google rating + review count
// so every reel shows their live rating instead of a self-reported number.
// Gated on GOOGLE_MAPS_API_KEY; callers treat a null return as "not configured".

const KEY = () => process.env.GOOGLE_MAPS_API_KEY?.trim() || '';

export type PlaceMatch = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  reviewCount: number | null;
};

// Onboarding picker: business types their name, we show matches to choose from.
export async function searchPlaces(query: string): Promise<PlaceMatch[]> {
  if (!KEY() || !query.trim()) return [];
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': KEY(),
      'X-Goog-FieldMask':
        'places.id,places.displayName,places.formattedAddress,places.rating,places.userRatingCount',
    },
    body: JSON.stringify({textQuery: query, maxResultCount: 5}),
  });
  if (!res.ok) throw new Error(`Places searchText ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return (data.places ?? []).map((p: any) => ({
    id: p.id,
    name: p.displayName?.text ?? '',
    address: p.formattedAddress ?? '',
    rating: typeof p.rating === 'number' ? p.rating : null,
    reviewCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
  }));
}

// Refresh: given a stored place id, fetch the current rating + count.
export async function getPlaceRating(
  placeId: string,
): Promise<{rating: number | null; reviewCount: number | null; name: string} | null> {
  if (!KEY() || !placeId) return null;
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {
      'X-Goog-Api-Key': KEY(),
      'X-Goog-FieldMask': 'id,displayName,rating,userRatingCount',
    },
  });
  if (!res.ok) throw new Error(`Places details ${res.status}: ${await res.text()}`);
  const p = await res.json();
  return {
    rating: typeof p.rating === 'number' ? p.rating : null,
    reviewCount: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
    name: p.displayName?.text ?? '',
  };
}
