// Load + validate the ad variants, and decide which one today gets.
//
// A variant is a JSON file in src/social/variants/: some copy overrides for the
// `ProductAd` composition plus the caption that goes out with it. Adding an ad
// is adding a file — no code change, no new footage.
import {readdir, readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const VARIANT_DIR = path.join(HERE, 'variants');
const PUBLIC_DIR = path.resolve(HERE, '..', '..', 'public');

/** Every key a variant is allowed to set on the composition. */
const PROP_KEYS = new Set([
  'hookKicker', 'hookLine1', 'hookLine2', 'hookPunch', 'hookSeconds',
  'scenes',
  'endLine1', 'endLine2', 'endSub', 'endSeconds',
  'musicFile', 'musicVolume',
]);

function validate(v, file) {
  const die = (msg) => {
    throw new Error(`${path.basename(file)}: ${msg}`);
  };
  if (!v.id) die('missing "id"');
  if (v.id !== path.basename(file, '.json')) die(`"id" must match the filename (got "${v.id}")`);
  if (!v.title) die('missing "title" (the YouTube/post title)');
  if (!v.caption) die('missing "caption"');
  if (!v.props || typeof v.props !== 'object') die('missing "props"');

  // A typo'd prop key is invisible at render time — the ad just comes out with
  // the default copy — so reject unknown keys instead of merging them.
  for (const k of Object.keys(v.props)) {
    if (!PROP_KEYS.has(k)) die(`unknown prop "${k}". Allowed: ${[...PROP_KEYS].join(', ')}`);
  }

  // Same for a scene pointing at footage that isn't there: Remotion renders the
  // frame black rather than failing, which is how you post an ad with a hole in
  // it and never notice.
  for (const s of v.props.scenes ?? []) {
    if (!s.clipFile) die('a scene is missing "clipFile"');
    if (!existsSync(path.join(PUBLIC_DIR, s.clipFile))) {
      die(`scene clip not found: public/${s.clipFile}`);
    }
    if (!(s.seconds > 0)) die(`scene ${s.clipFile} needs a positive "seconds"`);
  }
  if (v.props.musicFile && !existsSync(path.join(PUBLIC_DIR, v.props.musicFile))) {
    die(`musicFile not found: public/${v.props.musicFile}`);
  }
  return v;
}

/** All variants, sorted by id so the rotation below is stable across machines. */
export async function loadVariants() {
  const files = (await readdir(VARIANT_DIR)).filter((f) => f.endsWith('.json')).sort();
  if (!files.length) throw new Error(`No variants in ${VARIANT_DIR}`);
  const out = [];
  for (const f of files) {
    const full = path.join(VARIANT_DIR, f);
    out.push(validate(JSON.parse(await readFile(full, 'utf8')), full));
  }
  return out;
}

/**
 * Today's variant. Day-index rotation rather than stored state: the schedule is
 * reproducible from the date alone, a missed day can't wedge a cursor, and a
 * re-run of the same day re-renders the same ad instead of burning the next one.
 * (Adding a variant does reshuffle which day lands where. That's fine — it's an
 * ad rotation, not a calendar.)
 */
export function pickForDay(variants, date = new Date()) {
  const dayIndex = Math.floor(date.getTime() / 86_400_000);
  return variants[dayIndex % variants.length];
}

export function findVariant(variants, id) {
  const hit = variants.find((v) => v.id === id);
  if (!hit) {
    throw new Error(`No variant "${id}". Have: ${variants.map((v) => v.id).join(', ')}`);
  }
  return hit;
}
