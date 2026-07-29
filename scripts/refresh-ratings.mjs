// Weekly cron: re-pull each customer's live Google rating + review count so
// reels never show a stale number. Run on a schedule (Render cron / GH Actions).
//   node scripts/refresh-ratings.mjs
import {createClient} from '@supabase/supabase-js';
import 'dotenv/config';

const KEY = process.env.GOOGLE_MAPS_API_KEY?.trim();
if (!KEY) {
  console.log('GOOGLE_MAPS_API_KEY not set — nothing to refresh.');
  process.exit(0);
}
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function rating(placeId) {
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: {'X-Goog-Api-Key': KEY, 'X-Goog-FieldMask': 'rating,userRatingCount'},
  });
  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  const p = await res.json();
  return {
    rating: typeof p.rating === 'number' ? p.rating : null,
    review_count: typeof p.userRatingCount === 'number' ? p.userRatingCount : null,
  };
}

const {data: customers} = await sb
  .from('customers')
  .select('id, business_name, google_place_id')
  .not('google_place_id', 'is', null);

let updated = 0;
for (const c of customers ?? []) {
  try {
    const r = await rating(c.google_place_id);
    await sb.from('customers').update(r).eq('id', c.id);
    console.log(`✓ ${c.business_name}: ${r.rating} (${r.review_count})`);
    updated++;
  } catch (e) {
    console.warn(`✗ ${c.business_name}: ${e.message}`);
  }
}
console.log(`refreshed ${updated}/${customers?.length ?? 0} customers.`);
