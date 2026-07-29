// One-time: create the two storage buckets. Run after applying schema.sql.
//   node scripts/setup-storage.mjs
import {createClient} from '@supabase/supabase-js';
import 'dotenv/config';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function ensure(name, opts) {
  const {error} = await sb.storage.createBucket(name, opts);
  if (error && !/exist/i.test(error.message)) throw error;
  console.log(`bucket '${name}' ${error ? 'already existed' : 'created'}`);
}

await ensure('intake', {public: false, allowedMimeTypes: ['image/*', 'video/*']});
await ensure('reels', {public: true, allowedMimeTypes: ['video/*', 'image/*']});
console.log('storage ready.');
