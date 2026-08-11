// AfterShot social agent — posts AfterShot's own ad, once a day.
//
//   node src/social/run.mjs --list                 what's in the rotation
//   node src/social/run.mjs --dry-run              render today's ad, don't post
//   node src/social/run.mjs --variant agency-price --scale 0.75
//   SOCIAL_POST=1 node src/social/run.mjs          render + publish
//
// Render-only by default. Publishing needs SOCIAL_POST=1 *and* an explicit
// AFTERSHOT_SOCIAL_PROFILE — the same "opt in before it goes public" shape the
// other agents use, so a test run can never surprise-post.
import path from 'node:path';
import {writeFile} from 'node:fs/promises';
import {loadVariants, pickForDay, findVariant} from './variants.mjs';
import {renderVariant} from './render.mjs';
import {postAd, socialProfile, wantedPlatforms} from './post.mjs';

function arg(name, fallback = null) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const flag = (name) => process.argv.includes(`--${name}`);

const variants = await loadVariants();

if (flag('list')) {
  const today = pickForDay(variants);
  for (const v of variants) {
    console.log(`${v.id === today.id ? '→' : ' '} ${v.id.padEnd(24)} ${v.title}`);
  }
  process.exit(0);
}

const variant = arg('variant') ? findVariant(variants, arg('variant')) : pickForDay(variants);
const stamp = new Date().toISOString().slice(0, 10);
const out = arg('out', path.join('out', 'social', `${stamp}-${variant.id}.mp4`));
const scale = Number(arg('scale', '1'));

const shouldPost = !flag('dry-run') && (flag('post') || process.env.SOCIAL_POST === '1');

console.log(`Variant: ${variant.id}  (${variants.length} in rotation)`);
console.log(`Post:    ${shouldPost ? `yes → ${socialProfile() || '(no profile set!)'} ${wantedPlatforms().join(',')}` : 'no (render only)'}`);

// Fail before spending five minutes on a render we then can't publish.
if (shouldPost && !socialProfile()) {
  console.error('AFTERSHOT_SOCIAL_PROFILE is not set — nothing to post to. Aborting before the render.');
  process.exit(1);
}

const rendered = await renderVariant(variant, out, {scale});

// Sidecar for the CI artifact: what got built, and what the caption would be —
// enough to review the ad without digging up the variant file.
await writeFile(
  out.replace(/\.mp4$/, '.json'),
  JSON.stringify({date: stamp, ...variant, rendered: {...rendered, path: out}}, null, 2)
);

if (!shouldPost) {
  console.log('\nRender only. Re-run with SOCIAL_POST=1 (or --post) to publish.');
  process.exit(0);
}

await postAd(rendered.path, variant);
