// Render a BeforeAfter reel from two local files — no Supabase, no job queue.
// For making a reel by hand (demos, sales samples, a customer who emailed you
// photos) without going through the upload PWA.
//
//   node scripts/render-local.mjs --before ./before.jpg --after ./after.jpg \
//     --name "Sunshine Demolition" --phone "(954) 871-9578" \
//     --color "#E8B907" --hook "Two truckloads later" --out ./reel.mp4
//
// NOTE on this Windows box: full 1080x1920 libx264 OOMs, so --scale defaults to
// 0.75 here. On Linux CI leave it at 1.
import path from 'node:path';
import fs from 'node:fs';
import http from 'node:http';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia} from '@remotion/renderer';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
function flag(name) {
  return process.argv.includes(`--${name}`);
}

const beforePath = arg('before');
const afterPath = arg('after');
if (!beforePath || !afterPath) {
  console.error('Required: --before <file> --after <file>');
  console.error('Remember: BEFORE is the messy shot, AFTER is the finished one.');
  process.exit(1);
}
for (const [label, p] of [['before', beforePath], ['after', afterPath]]) {
  if (!fs.existsSync(p)) {
    console.error(`--${label} not found: ${p}`);
    process.exit(1);
  }
}

const out = path.resolve(arg('out', './reel.mp4'));
const scale = Number(arg('scale', '0.75'));

// Chrome refuses file:// URLs inside the headless renderer ("Not allowed to
// load local resource") and renders blank photos without failing. Serving the
// two files over plain HTTP is the one approach that doesn't depend on where
// the bundler decides to mount public/.
const MIME = {'.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.mp4': 'video/mp4', '.mov': 'video/quicktime'};
// --music takes a track name (energy, sport, epic, hiphop, pop, uplift) or a
// path to your own file.
const musicArg = arg('music');
let musicPath = null;
// http(s) values pass through untouched. A bundle-relative path can NOT be
// hand-written: Remotion serves public/ under a hashed prefix, so only
// staticFile() inside the composition can address it.
const musicPassthrough = musicArg && /^https?:\/\//.test(musicArg) ? musicArg : null;
if (musicArg && !musicPassthrough) {
  const builtin = path.resolve('public/music', `${musicArg}.mp3`);
  musicPath = fs.existsSync(builtin) ? builtin : path.resolve(musicArg);
  if (!fs.existsSync(musicPath)) {
    const have = fs.readdirSync(path.resolve('public/music')).filter((f) => f.endsWith('.mp3')).map((f) => f.replace('.mp3', ''));
    console.error(`--music "${musicArg}" not found. Built-in tracks: ${have.join(', ')}`);
    process.exit(1);
  }
}

// --logo is a local file too, so it needs serving rather than a file:// URL.
const logoArg = arg('logo');
const logoPath = logoArg && !/^https?:\/\//.test(logoArg) ? path.resolve(logoArg) : null;
if (logoPath && !fs.existsSync(logoPath)) {
  console.error(`--logo not found: ${logoPath}`);
  process.exit(1);
}

// --extra can be repeated, up to 3. These play after the reveal.
const extraPaths = [];
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === '--extra' && process.argv[i + 1]) {
    const p = path.resolve(process.argv[i + 1]);
    if (!fs.existsSync(p)) { console.error(`--extra not found: ${p}`); process.exit(1); }
    extraPaths.push(p);
  }
}
if (extraPaths.length > 3) { console.error('At most 3 --extra shots.'); process.exit(1); }

const served = {
  '/before': path.resolve(beforePath),
  '/after': path.resolve(afterPath),
  ...Object.fromEntries(extraPaths.map((p, i) => [`/extra${i}`, p])),
  ...(musicPath ? {'/music': musicPath} : {}),
  ...(logoPath ? {'/logo': logoPath} : {}),
};
const server = http.createServer((req, res) => {
  const file = served[(req.url || '').split('?')[0]];
  if (!file || !fs.existsSync(file)) { res.writeHead(404).end(); return; }
  res.writeHead(200, {'Content-Type': MIME[path.extname(file).toLowerCase()] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const inputProps = {
  beforeUrl: `${origin}/before`,
  afterUrl: `${origin}/after`,
  extraUrls: extraPaths.map((_, i) => `${origin}/extra${i}`),
  beforeIsVideo: flag('before-video'),
  afterIsVideo: flag('after-video'),
  businessName: arg('name', 'Your Business'),
  hook: arg('hook', "You won't believe the difference"),
  brandColor: arg('color', '#0EA5E9'),
  logoUrl: logoPath ? `${origin}/logo` : (logoArg || null),
  musicSrc: musicPassthrough ?? (musicPath ? `${origin}/music` : null),
  phone: arg('phone', null),
  handle: arg('handle', null),
  serviceArea: arg('area', null),
  rating: arg('rating') ? Number(arg('rating')) : null,
  reviewCount: arg('reviews') ? Number(arg('reviews')) : null,
  licensedInsured: flag('licensed'),
  priceFrom: arg('price', null),
  ctaText: arg('cta', 'Free Quote'),
};

console.log('Bundling Remotion…');
const serveUrl = await bundle({
  entryPoint: path.resolve('remotion/index.tsx'),
  // Explicit rather than relying on Remotion walking up to find the root.
  publicDir: path.resolve('public'),
  onProgress: (p) => process.stdout.write(`\r  bundle ${p}%   `),
});
console.log('\nSelecting composition…');
const composition = await selectComposition({serveUrl, id: 'BeforeAfter', inputProps});

console.log(`Rendering ${composition.width}x${composition.height} @ scale ${scale} → ${out}`);
// A photo that fails to load renders a blank frame without failing the job —
// exactly how you ship an empty reel and don't notice. Treat it as fatal.
let imageError = null;
await renderMedia({
  composition,
  serveUrl,
  codec: 'h264',
  scale,
  outputLocation: out,
  inputProps,
  onBrowserLog: (log) => {
    if (/Could not load image|Not allowed to load local resource|failed to load/i.test(log.text)) {
      imageError = log.text;
    }
  },
  onProgress: ({progress}) => process.stdout.write(`\r  render ${Math.round(progress * 100)}%   `),
});
if (imageError) {
  const what = /\/logo\b|logo\./i.test(imageError) ? 'The logo' : 'A photo';
  console.error(`\n\nFAILED: ${what} never loaded, so the reel is missing it.\n  ${imageError}`);
  process.exit(1);
}

server.close();
const {size} = fs.statSync(out);
console.log(`\nDone → ${out} (${(size / 1e6).toFixed(1)} MB)`);
