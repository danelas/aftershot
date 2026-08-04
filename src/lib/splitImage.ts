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

/**
 * Cut `img` into two halves at `ratio` (0..1) along `axis`.
 * `gap` trims that fraction off the inside edge of each half, to drop the
 * divider line collage apps draw between the two shots.
 */
export async function splitImage(
  img: LoadedImage,
  opts: {ratio?: number; axis?: SplitAxis; gap?: number} = {},
): Promise<[File, File]> {
  const axis = opts.axis ?? img.axis;
  const ratio = Math.min(0.9, Math.max(0.1, opts.ratio ?? 0.5));
  const gap = Math.min(0.1, Math.max(0, opts.gap ?? 0));

  const cut = (start: number, end: number, name: string) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas unavailable in this browser.');

    if (axis === 'horizontal') {
      const sx = Math.round(img.width * start);
      const sw = Math.max(1, Math.round(img.width * (end - start)));
      canvas.width = sw; canvas.height = img.height;
      ctx.drawImage(img.el, sx, 0, sw, img.height, 0, 0, sw, img.height);
    } else {
      const sy = Math.round(img.height * start);
      const sh = Math.max(1, Math.round(img.height * (end - start)));
      canvas.width = img.width; canvas.height = sh;
      ctx.drawImage(img.el, 0, sy, img.width, sh, 0, 0, img.width, sh);
    }
    return toFile(canvas, name);
  };

  return Promise.all([
    cut(0, Math.max(0.05, ratio - gap), 'before.jpg'),
    cut(Math.min(0.95, ratio + gap), 1, 'after.jpg'),
  ]) as Promise<[File, File]>;
}
