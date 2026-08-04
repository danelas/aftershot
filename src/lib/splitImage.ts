// Split one side-by-side before/after photo into the two halves the reel needs.
//
// Plenty of trades already post a single collage — it's the format their phone
// apps produce. Making them find the originals is friction, so accept the
// collage and cut it here, in the browser, before anything uploads.

export type SplitAxis = 'horizontal' | 'vertical';

export type LoadedImage = {
  el: HTMLImageElement;
  width: number;
  height: number;
  /** Side-by-side collages are wide; stacked ones are tall. */
  axis: SplitAxis;
  objectUrl: string;
};

export function loadImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const el = new Image();
    el.onload = () => {
      const {naturalWidth: width, naturalHeight: height} = el;
      resolve({
        el, width, height, objectUrl,
        // A collage is wider than tall when the halves sit side by side.
        axis: width >= height ? 'horizontal' : 'vertical',
      });
    };
    el.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("That file couldn't be read as an image."));
    };
    el.src = objectUrl;
  });
}

function toFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) { reject(new Error('Could not cut that image.')); return; }
        resolve(new File([blob], name, {type: 'image/jpeg'}));
      },
      'image/jpeg',
      0.92,
    );
  });
}

export const MAX_TRIM = 0.25;
const clampTrim = (n: number | undefined) => Math.min(MAX_TRIM, Math.max(0, n ?? 0));

/**
 * Cut `img` into two halves at `ratio` (0..1) along `axis`.
 * `gap` trims that fraction off the inside edge of each half, to drop the
 * divider line collage apps draw between the two shots.
 * `trimTop`/`trimBottom` shave that fraction off the top/bottom of EACH half —
 * that's where collage apps burn in their own "BEFORE"/"AFTER" strip, which
 * would otherwise collide with the reel's animated label.
 */
export async function splitImage(
  img: LoadedImage,
  opts: {ratio?: number; axis?: SplitAxis; gap?: number; trimTop?: number; trimBottom?: number} = {},
): Promise<[File, File]> {
  const axis = opts.axis ?? img.axis;
  const ratio = Math.min(0.9, Math.max(0.1, opts.ratio ?? 0.5));
  const gap = Math.min(0.1, Math.max(0, opts.gap ?? 0));
  const trimTop = clampTrim(opts.trimTop);
  const trimBottom = clampTrim(opts.trimBottom);

  const cut = (start: number, end: number, name: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable in this browser.');

    // The half's own box, before the label strip comes off it.
    let sx = 0, sy = 0, sw = img.width, sh = img.height;
    if (axis === 'horizontal') {
      sx = Math.round(img.width * start);
      sw = Math.max(1, Math.round(img.width * (end - start)));
    } else {
      sy = Math.round(img.height * start);
      sh = Math.max(1, Math.round(img.height * (end - start)));
    }
    // Trims are fractions of the half, so a stacked collage trims each shot's
    // own strip rather than a slice of the whole picture.
    const top = Math.round(sh * trimTop);
    const bottom = Math.round(sh * trimBottom);
    sy += top;
    sh = Math.max(1, sh - top - bottom);

    canvas.width = sw; canvas.height = sh;
    ctx.drawImage(img.el, sx, sy, sw, sh, 0, 0, sw, sh);
    return toFile(canvas, name);
  };

  return Promise.all([
    cut(0, Math.max(0.05, ratio - gap), 'before.jpg'),
    cut(Math.min(0.95, ratio + gap), 1, 'after.jpg'),
  ]) as Promise<[File, File]>;
}

/**
 * Guess whether the collage has a burned-in caption strip along the top or the
 * bottom, and how deep it is (as a fraction of the image's height).
 *
 * Deliberately conservative: it only fires on a band that is BOTH far off the
 * picture's own brightness AND full of horizontal edges (i.e. text on a flat
 * plate). A dark sky is off-brightness but smooth, so it doesn't match. The
 * answer only pre-sets a slider the owner can see and drag back to zero.
 */
export function detectLabelBand(img: LoadedImage): {edge: 'top' | 'bottom'; fraction: number} | null {
  const W = 64, H = 128;
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d', {willReadFrequently: true});
  if (!ctx) return null;
  ctx.drawImage(img.el, 0, 0, W, H);

  let data: Uint8ClampedArray;
  try {
    data = ctx.getImageData(0, 0, W, H).data;
  } catch {
    return null; // tainted canvas — no guess is better than a wrong one
  }

  const lum: number[] = [];   // per-row mean brightness
  const edge: number[] = [];  // per-row mean horizontal contrast (text reads high)
  for (let y = 0; y < H; y++) {
    let sum = 0, diff = 0, prev = 0;
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      sum += l;
      if (x) diff += Math.abs(l - prev);
      prev = l;
    }
    lum.push(sum / W);
    edge.push(diff / (W - 1));
  }

  // Baseline from the middle of the picture, which a caption strip never covers.
  const mid = (arr: number[]) => {
    const s = arr.slice(Math.floor(H * 0.35), Math.ceil(H * 0.65)).sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  const baseLum = mid(lum);
  const baseEdge = mid(edge);

  const MAX_ROWS = Math.floor(H * MAX_TRIM);
  const isBand = (y: number) => Math.abs(lum[y] - baseLum) > 45 && edge[y] > baseEdge * 1.6 + 2;

  const scan = (from: 'top' | 'bottom') => {
    let rows = 0;
    for (let n = 0; n < MAX_ROWS; n++) {
      const y = from === 'top' ? n : H - 1 - n;
      if (!isBand(y)) break;
      rows = n + 1;
    }
    return rows;
  };

  const top = scan('top');
  const bottom = scan('bottom');
  const rows = Math.max(top, bottom);
  // Under ~3% of the height is noise, not a caption plate.
  if (rows < H * 0.03) return null;
  return {
    edge: top >= bottom ? 'top' : 'bottom',
    // A little margin so the strip's soft edge doesn't survive the cut.
    fraction: Math.min(MAX_TRIM, (rows / H) * 1.15),
  };
}
