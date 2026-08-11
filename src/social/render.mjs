// Render one ad variant to an mp4. No Supabase, no queue — this is our own
// marketing, not a customer job (that's worker/index.mjs).
import path from 'node:path';
import fs from 'node:fs';
import {bundle} from '@remotion/bundler';
import {selectComposition, renderMedia} from '@remotion/renderer';

let cachedServeUrl = null;

/**
 * @param {object} variant  a loaded variants/*.json
 * @param {string} outPath  where to write the mp4
 * @param {number} scale    1 on CI. Full 1080x1920 libx264 OOMs on the Windows
 *                          box, so local renders pass 0.75 (same as
 *                          scripts/render-local.mjs).
 */
export async function renderVariant(variant, outPath, {scale = 1} = {}) {
  const out = path.resolve(outPath);
  fs.mkdirSync(path.dirname(out), {recursive: true});

  if (!cachedServeUrl) {
    process.stdout.write('Bundling Remotion…');
    cachedServeUrl = await bundle({
      entryPoint: path.resolve('remotion/index.tsx'),
      publicDir: path.resolve('public'),
      onProgress: (p) => process.stdout.write(`\r  bundle ${p}%   `),
    });
    process.stdout.write('\n');
  }

  const inputProps = variant.props;
  // Remotion merges these over the composition's defaultProps, so a variant only
  // has to name what it changes — the scene list and footage come from
  // productAdDefaults unless it overrides `scenes` outright.
  const composition = await selectComposition({
    serveUrl: cachedServeUrl,
    id: 'ProductAd',
    inputProps,
  });

  console.log(
    `Rendering ${variant.id} — ${composition.width}x${composition.height}, ` +
      `${(composition.durationInFrames / composition.fps).toFixed(1)}s @ scale ${scale}`
  );

  // A missing clip renders as a black hole in the middle of the ad without
  // failing the process. Treat any load error as fatal so a broken ad can never
  // reach the poster.
  let loadError = null;
  await renderMedia({
    composition,
    serveUrl: cachedServeUrl,
    codec: 'h264',
    scale,
    outputLocation: out,
    inputProps,
    imageFormat: 'jpeg',
    // Parallel tabs pulling frames from these screen-recording cuts makes the
    // compositor throw "No frame found at position" partway into the second
    // clip, every time. Serial rendering is the same fix remotion-ui applies
    // (Config.setConcurrency(1)) — that config file only reaches the CLI, so it
    // has to be set here too. ~30s of 1080x1920 still renders in a few minutes.
    concurrency: Number(process.env.SOCIAL_RENDER_CONCURRENCY || 1),
    onBrowserLog: (log) => {
      if (/Could not load|Not allowed to load local resource|failed to load|no frame found/i.test(log.text)) {
        loadError = log.text;
      }
    },
    onProgress: ({progress}) => process.stdout.write(`\r  render ${Math.round(progress * 100)}%   `),
  });
  process.stdout.write('\n');
  if (loadError) {
    throw new Error(`Asset failed to load, so the ad is incomplete: ${loadError}`);
  }

  const {size} = fs.statSync(out);
  console.log(`→ ${out} (${(size / 1e6).toFixed(1)} MB)`);
  return {path: out, bytes: size, seconds: composition.durationInFrames / composition.fps};
}
