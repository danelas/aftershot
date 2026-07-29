// Seed one test customer + one pending job using the real driveway photos, so
// the worker has something to pick up. Proves the loop without any UI.
//   node scripts/seed-test.mjs
import {createClient} from '@supabase/supabase-js';
import {readFile} from 'node:fs/promises';
import 'dotenv/config';

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Reuse or create the test customer.
let {data: customer} = await sb.from('customers').select('*').eq('email', 'test@aftershot.app').maybeSingle();
if (!customer) {
  ({data: customer} = await sb
    .from('customers')
    .insert({
      business_name: 'AquaShine Pressure Washing',
      trade: 'pressure_washing',
      city: 'Jupiter, FL',
      brand_color: '#0EA5E9',
      email: 'test@aftershot.app',
      upload_post_profile: process.env.UPLOAD_POST_USER || 'test',
      platforms: ['instagram', 'tiktok', 'youtube'],
    })
    .select('*')
    .single());
  console.log('created test customer', customer.id);
}

// Upload the two real photos into the intake bucket.
const put = async (file, tag) => {
  const buf = await readFile(new URL(`../public/${file}`, import.meta.url));
  const path = `${customer.upload_token}/${Date.now()}-${tag}.jpg`;
  const {error} = await sb.storage.from('intake').upload(path, buf, {contentType: 'image/jpeg', upsert: true});
  if (error) throw error;
  return path;
};
const before = await put('real-before.jpg', 'before');
const after = await put('real-after.jpg', 'after');

const {data: job} = await sb
  .from('jobs')
  .insert({
    customer_id: customer.id,
    before_url: before,
    after_url: after,
    hook: 'This driveway hadn’t been cleaned in 10 years',
    status: 'pending',
  })
  .select('id')
  .single();

console.log('queued job', job.id, '— start the worker: npm run worker');
