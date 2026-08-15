// Send prospect reels to Telegram for jobs that finished AFTER run.mjs gave up
// waiting (renders can outlast its 15-minute window — e.g. when the worker was
// down and the queue only drained later). Explicit job ids only: there is no
// "sent" flag anywhere, so a blanket resweep would re-send old prospects.
//
//   node src/prospect/requeue.mjs --jobs <id>,<id>,...
//
// Env: same as run.mjs (Supabase + Telegram).

import 'dotenv/config';
import {createClient} from '@supabase/supabase-js';

const args = process.argv.slice(2);
const i = args.indexOf('--jobs');
const jobIds = (i >= 0 && args[i + 1] ? args[i + 1] : '').split(',').map((s) => s.trim()).filter(Boolean);
if (!jobIds.length) {
  console.error('usage: node src/prospect/requeue.mjs --jobs <id>,<id>,...');
  process.exit(1);
}

const dmText = () =>
  `Hey! Loved your before/after work, so I ran your photos through AfterShot — ` +
  `it made you this free reel, yours to keep and post. It can do this for every ` +
  `job you finish. No pressure either way.`;

async function telegram(method, payload) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) throw new Error('Telegram env missing');
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: {'content-type': 'application/json'},
    body: JSON.stringify({chat_id: chat, ...payload}),
  });
  if (!res.ok) console.error(`[telegram] ${method} ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return res.ok;
}

const store = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const {data: jobs, error} = await store
  .from('jobs')
  .select('id, status, reel_url, customer_id')
  .in('id', jobIds);
if (error) throw error;

for (const job of jobs) {
  if (!job.reel_url) {
    console.log(`[skip] ${job.id} — status ${job.status}, no reel yet`);
    continue;
  }
  const {data: cust} = await store
    .from('customers')
    .select('business_name, email, phone')
    .eq('id', job.customer_id)
    .single();
  const handle = (cust?.email || '').replace(/^prospect-/, '').replace(/@theaftershot\.com$/, '');
  const lines = [
    `🧲 AfterShot prospect: ${cust?.business_name || handle} (@${handle})`,
    cust?.phone ? `📞 ${cust.phone}` : `📞 no phone found`,
    `🔗 https://instagram.com/${handle}`,
    ``,
    `DM to send (attach this video):`,
    dmText(),
  ];
  const sent = await telegram('sendVideo', {video: job.reel_url, caption: lines.join('\n')});
  if (!sent) await telegram('sendMessage', {text: lines.join('\n') + `\n\nReel: ${job.reel_url}`});
  console.log(`[queue] @${handle} → ${job.reel_url}`);
}
