// Renders a customer's edited reel fully client-side: plays the video into a
// <canvas>, burns the Studio overlays/captions on top, mixes an optional
// soundtrack, and records the canvas (plus the original audio) with
// MediaRecorder. Runs in real time (a 30s clip takes ~30s) — callers should
// show progress. Throws when the browser can't do it (no captureStream /
// MediaRecorder, CORS-tainted video); callers fall back to the raw clip.
//
// Ported from PeekScout's brandClip; the PeekScout name/booking-bar layer is
// removed — AfterShot reels already carry the customer's own sell-card.

import { drawCaptions, drawStudioOverlays, type CaptionStyle, type Overlay } from "@/lib/studio";
import { qrModules } from "@/lib/qr";
import type { CaptionSegment } from "@/lib/captions";

type BrandOpts = {
  url: string;
  /** Output filename stem. */
  slug: string;
  /** Studio overlays (text/emoji/stickers) to burn on top. */
  overlays?: Overlay[];
  /** Trim window in seconds; omit to render the whole clip. */
  trim?: { start: number; end: number } | null;
  /** Timed captions (absolute clip timeline) to burn near the bottom. */
  captions?: CaptionSegment[] | null;
  /** Caption look — "clean" | "karaoke" | "wordpop". */
  captionStyle?: CaptionStyle;
  /** Accent color for the karaoke/wordpop spoken word. */
  captionAccent?: string;
  /** Soundtrack to mix under the clip. src is a public path or an object URL. */
  music?: { src: string; volume: number; muteOriginal: boolean } | null;
  onProgress?: (pct: number) => void;
};

const MIMES = [
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm",
];

export function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of MIMES) if (MediaRecorder.isTypeSupported(m)) return m;
  return null;
}

export async function brandClip({ url, slug, overlays, trim, captions, captionStyle = "clean", captionAccent, music, onProgress }: BrandOpts): Promise<File> {
  const mime = pickMime();
  if (!mime) throw new Error("This browser can't render edited clips");

  // Source video (CORS-clean so the canvas isn't tainted).
  const video = document.createElement("video");
  video.crossOrigin = "anonymous";
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  await new Promise<void>((res, rej) => {
    video.onloadedmetadata = () => res();
    video.onerror = () => rej(new Error("Couldn't load the clip"));
  });

  const W = Math.min(1080, video.videoWidth || 720);
  const H = Math.round((W / (video.videoWidth || 720)) * (video.videoHeight || 1280));
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas unavailable");

  // Audio: route the element through an AudioContext so we capture the track
  // without playing it out loud. (Muting the element would mute the capture.)
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ac = new AC();
  const dest = ac.createMediaStreamDestination();
  // Original clip audio flows through its own gain so a soundtrack can duck or
  // fully mute it (mute is handy for silent clips that only want the music).
  const originalGain = ac.createGain();
  originalGain.gain.value = music?.muteOriginal ? 0 : 1;
  originalGain.connect(dest);
  try {
    ac.createMediaElementSource(video).connect(originalGain);
  } catch {
    /* no audio track — record video-only */
  }

  // Soundtrack bed: a looping audio element routed through the same graph, so it
  // never plays out loud but is captured into the recording. Best-effort — if it
  // can't load we render without music rather than failing the whole export.
  let musicEl: HTMLAudioElement | null = null;
  if (music?.src) {
    musicEl = document.createElement("audio");
    musicEl.src = music.src;
    musicEl.loop = true;
    musicEl.crossOrigin = "anonymous";
    musicEl.preload = "auto";
    try {
      const mgain = ac.createGain();
      mgain.gain.value = Math.max(0, Math.min(1, music.volume));
      ac.createMediaElementSource(musicEl).connect(mgain).connect(dest);
      await new Promise<void>((res) => {
        musicEl!.oncanplaythrough = () => res();
        musicEl!.oncanplay = () => res();
        musicEl!.onerror = () => res();
        setTimeout(res, 4000); // don't hang the export on a slow track
      });
    } catch {
      musicEl = null;
    }
  }

  // Precompute a QR matrix per distinct URL so the draw loop doesn't re-encode
  // the QR 30×/second.
  const qrMatrices = new Map<string, boolean[][]>();
  for (const o of overlays || []) {
    if (o.kind === "qr" && o.text && !qrMatrices.has(o.text)) {
      try {
        qrMatrices.set(o.text, qrModules(o.text));
      } catch {
        /* skip an unencodable URL rather than fail the whole render */
      }
    }
  }

  // Preload logo watermarks (CORS-clean, from our own storage) once. A logo that
  // fails to load is left out of the map so drawLogoOverlay skips it — never
  // draw a tainted image, which would break the whole export.
  const logoImages = new Map<string, CanvasImageSource>();
  const logoUrls = Array.from(new Set((overlays || []).filter((o) => o.kind === "logo" && o.text).map((o) => o.text)));
  await Promise.all(
    logoUrls.map(
      (src) =>
        new Promise<void>((res) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            if (img.naturalWidth > 0) logoImages.set(src, img);
            res();
          };
          img.onerror = () => res();
          img.src = src;
          setTimeout(res, 4000); // don't hang the export on a slow/broken logo
        }),
    ),
  );

  // Effective render window (trim or the whole clip).
  const t0 = trim ? Math.max(0, Math.min(trim.start, video.duration || 0)) : 0;
  const t1 = trim ? Math.min(trim.end, video.duration || trim.end) : video.duration || 0;
  const effDur = Math.max(0.5, t1 - t0);

  // Timer-driven draw loop, NOT requestAnimationFrame: rAF freezes in
  // backgrounded/throttled tabs, which would record a black video while the
  // customer waits. Timers still fire (worst case ~1fps when hidden).
  function drawFrame() {
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, W, H);
    if (captions?.length) drawCaptions(ctx, captions, W, H, video.currentTime, captionStyle, captionAccent);
    if (overlays?.length) drawStudioOverlays(ctx, overlays, W, H, video.currentTime - t0, effDur, qrMatrices, logoImages);
    if (onProgress) {
      onProgress(Math.min(99, Math.round(((video.currentTime - t0) / effDur) * 100)));
    }
  }
  const ticker = setInterval(drawFrame, 1000 / 30);

  // Recorder: canvas frames + captured audio.
  const stream = canvas.captureStream(30);
  for (const t of dest.stream.getAudioTracks()) stream.addTrack(t);
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const doneRecording = new Promise<void>((res, rej) => {
    rec.onstop = () => res();
    rec.onerror = () => rej(new Error("Recording failed"));
  });

  await ac.resume().catch(() => {});
  if (t0 > 0) {
    video.currentTime = t0;
    await new Promise<void>((res) => {
      video.onseeked = () => res();
      setTimeout(res, 3000); // seek stall backstop — start from wherever we are
    });
  }
  if (musicEl) {
    musicEl.currentTime = 0;
    await musicEl.play().catch(() => {}); // best-effort; render continues silent if blocked
  }
  await video.play(); // caller is in a click handler, so this is gesture-blessed
  // Draw one frame BEFORE starting: a tainted canvas throws here, not after
  // the user waited through the whole clip.
  ctx.drawImage(video, 0, 0, W, H);
  ctx.getImageData(0, 0, 1, 1);
  rec.start(1000);
  drawFrame();

  // Finish on 'ended' (or when playback crosses the trim end), with a hard
  // timeout backstop (duration + 15s) so a stalled decode can't hang forever.
  let endWatch: ReturnType<typeof setInterval> | null = null;
  await new Promise<void>((res, rej) => {
    video.onended = () => res();
    if (trim) {
      endWatch = setInterval(() => {
        if (video.currentTime >= t1) res();
      }, 100);
    }
    setTimeout(
      () => rej(new Error("Rendering took too long — try again")),
      effDur * 1000 + 15000,
    );
  }).finally(() => {
    clearInterval(ticker);
    if (endWatch) clearInterval(endWatch);
  });
  video.pause();
  musicEl?.pause();
  // Final frame + flush.
  drawFrame();
  rec.stop();
  await doneRecording;
  await ac.close().catch(() => {});

  const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
  const blob = new Blob(chunks, { type: mime.split(";")[0] });
  if (blob.size === 0) throw new Error("Recording came out empty");
  onProgress?.(100);
  return new File([blob], `${slug}-aftershot.${ext}`, { type: blob.type });
}
