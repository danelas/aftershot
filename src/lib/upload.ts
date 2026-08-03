// Upload helpers for the Studio, ported from PeekScout. Uploads go directly to
// Supabase Storage via a server-minted signed URL (so multi-MB renders never
// hit Vercel's request-body cap). Auth = the customer's upload token.

// Grab a still frame from a video File to use as its cover/poster. The File is
// a local blob (e.g. a studio render), so the canvas is never CORS-tainted.
export function capturePoster(file: File, atSeconds = 1.2): Promise<File | null> {
  return new Promise((resolve) => {
    try {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.playsInline = true;
      const url = URL.createObjectURL(file);
      const done = (out: File | null) => {
        URL.revokeObjectURL(url);
        resolve(out);
      };
      v.onloadedmetadata = () => {
        const dur = Number.isFinite(v.duration) ? v.duration : 0;
        v.currentTime = dur ? Math.min(atSeconds, dur / 2) : 0;
      };
      v.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = v.videoWidth;
          canvas.height = v.videoHeight;
          const ctx = canvas.getContext("2d");
          if (!ctx || !canvas.width) return done(null);
          ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (b) => done(b ? new File([b], "cover.jpg", { type: "image/jpeg" }) : null),
            "image/jpeg",
            0.85,
          );
        } catch {
          done(null);
        }
      };
      v.onerror = () => done(null);
      v.src = url;
    } catch {
      resolve(null);
    }
  });
}

export function readVideoDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      const el = document.createElement("video");
      el.preload = "metadata";
      el.onloadedmetadata = () => {
        const d = Number.isFinite(el.duration) ? Math.round(el.duration) : null;
        URL.revokeObjectURL(el.src);
        resolve(d);
      };
      el.onerror = () => resolve(null);
      el.src = URL.createObjectURL(file);
    } catch {
      resolve(null);
    }
  });
}

// A low-level network failure vs. an HTTP/app error. `fetch` rejects with a
// TypeError when the request is blocked or the connection drops — worth
// retrying. App errors (4xx/5xx bodies) should surface immediately.
function isNetworkError(err: unknown): boolean {
  if (err instanceof TypeError) return true;
  const m = (err instanceof Error ? err.message : String(err ?? "")).toLowerCase();
  return (
    m.includes("failed to fetch") ||
    m.includes("load failed") ||
    m.includes("networkerror") ||
    m.includes("network error") ||
    m.includes("network request failed")
  );
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const UPLOAD_ATTEMPTS = 3;

export type UploadOpts = {
  onProgress?: (msg: string) => void;
  duration?: number | null;
};

// Upload a file directly to Supabase Storage via a server-minted signed URL.
// `token` is the customer's upload token (authorizes the sign call). Retries
// transient network failures with backoff. Returns the public URL.
export async function uploadToStorage(
  file: File,
  kind: "video" | "image",
  token: string,
  opts: UploadOpts = {},
): Promise<{ url: string; duration: number | null }> {
  const { onProgress } = opts;

  if (kind === "image" && file.size > 10 * 1024 * 1024) {
    throw new Error("That image is over 10MB. Use a smaller image.");
  }
  if (kind === "video" && file.size > 50 * 1024 * 1024) {
    throw new Error("That video is over 50MB. Trim it shorter and try again.");
  }

  const duration =
    opts.duration !== undefined
      ? opts.duration
      : kind === "video"
      ? await readVideoDuration(file)
      : null;

  const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase();

  // Re-mint a fresh signed URL each attempt so a retry is fully independent
  // (signed-upload tokens are single-shot).
  let lastErr: unknown;
  for (let attempt = 1; attempt <= UPLOAD_ATTEMPTS; attempt++) {
    try {
      onProgress?.(
        attempt === 1
          ? "Uploading… (this can take a moment)"
          : `Upload interrupted — retrying (${attempt}/${UPLOAD_ATTEMPTS})…`,
      );

      const signRes = await fetch("/api/upload/sign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, ext, token }),
      });
      const sign = await signRes.json();
      if (!signRes.ok) throw new Error(sign.error || `sign HTTP ${signRes.status}`);

      const putRes = await fetch(sign.uploadUrl, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || (kind === "video" ? "video/mp4" : "image/jpeg"),
          "x-upsert": "false",
        },
        body: file,
      });
      if (!putRes.ok) {
        const body = await putRes.text().catch(() => "");
        throw new Error(`upload HTTP ${putRes.status}${body ? `: ${body.slice(0, 100)}` : ""}`);
      }

      return { url: sign.publicUrl, duration };
    } catch (err) {
      lastErr = err;
      if (!isNetworkError(err) || attempt === UPLOAD_ATTEMPTS) break;
      await sleep(attempt * 800);
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error("Upload failed. Please try again.");
}
