// Video-studio overlay model + canvas renderer. One coordinate system shared
// by the DOM editor (VideoStudio) and the export pipeline (brandClip): sizes
// are in "design units" where the video is 1080px wide, positions are the
// overlay's CENTER as a 0..1 fraction of the frame. The editor previews with
// CSS built from the same constants, so what the pro drags is what gets burned.

export const DESIGN_W = 1080;

export type OverlayKind = "text" | "emoji" | "sticker" | "qr" | "logo" | "review";
export type TextStyle = "plain" | "pill" | "outline";
export type OverlayTiming = "all" | "intro" | "outro";
export type StickerKind =
  | "rating" | "price" | "book" | "offer" | "promo" | "beforeafter" | "urgency" | "cta" | "refer";
export type AnimKind = "none" | "pop" | "pulse" | "bounce" | "float" | "wiggle" | "flash";

export type Overlay = {
  id: string;
  kind: OverlayKind;
  /** Text content, the emoji character, sticker label, QR/logo URL, or review quote. */
  text: string;
  sticker?: StickerKind;
  /** Review-card star rating (1–5) and author, when kind === "review". */
  stars?: number;
  by?: string;
  font: FontKey;
  color: string;
  style: TextStyle;
  /** Center position, 0..1 of the video frame. */
  x: number;
  y: number;
  scale: number;
  /** Radians. */
  rotation: number;
  timing: OverlayTiming;
  anim: AnimKind;
};

// What the AI Auto-Director hands back to the studio (see /api/studio/direct).
export type AutoDirectResult =
  | {
      ok: true;
      overlays: Overlay[];
      captionStyle: CaptionStyle;
      /** Soundtrack the director picked (a STUDIO_TRACKS id), or null for silent. */
      music: string | null;
      rationale: string;
      freeRemaining: number;
      credits: number;
    }
  | { ok: false; needCredits?: boolean; message: string };

export const PALETTE = [
  "#ffffff",
  "#0a0a0c",
  "#a78bfa", // brand violet
  "#f472b6",
  "#fbbf24",
  "#34d399",
  "#38bdf8",
  "#f87171",
] as const;

export type FontKey = "sans" | "serif" | "mono" | "script";
export const FONTS: Record<FontKey, { label: string; family: string; weight: number }> = {
  sans: { label: "Bold", family: "system-ui, -apple-system, sans-serif", weight: 800 },
  serif: { label: "Serif", family: "Georgia, 'Times New Roman', serif", weight: 700 },
  mono: { label: "Mono", family: "'Courier New', monospace", weight: 700 },
  script: { label: "Script", family: "'Segoe Script', 'Brush Script MT', cursive", weight: 700 },
};

// One-tap "looks" — restyle every text overlay (font/style/color) and the
// caption style + accent in a single move, so a clip can go from Bold to Luxe
// without touching each layer. Stickers keep their branded chrome.
export type LookKey = "classic" | "luxe" | "bold" | "minimal";
export const LOOKS: {
  key: LookKey;
  label: string;
  font: FontKey;
  textStyle: TextStyle;
  color: string;
  captionStyle: CaptionStyle;
  accent: string;
}[] = [
  { key: "classic", label: "Classic", font: "sans", textStyle: "pill", color: "#ffffff", captionStyle: "clean", accent: "#a78bfa" },
  { key: "bold", label: "Bold", font: "sans", textStyle: "pill", color: "#fbbf24", captionStyle: "karaoke", accent: "#f472b6" },
  { key: "luxe", label: "Luxe", font: "serif", textStyle: "plain", color: "#fbbf24", captionStyle: "clean", accent: "#fbbf24" },
  { key: "minimal", label: "Minimal", font: "sans", textStyle: "outline", color: "#ffffff", captionStyle: "wordpop", accent: "#ffffff" },
];

// Per-pro brand kit: colors, font, and a logo the studio remembers across every
// clip, so a pro's content looks like one brand without re-setting it each time.
export type BrandKit = {
  primary?: string; // main text color
  accent?: string; // caption highlight / secondary
  font?: FontKey;
  logoUrl?: string | null; // watermark image (public URL)
};

// What an edit did, captured when a pro saves it to their trailer — the input
// to the conversion feedback loop (which edit style actually drove watch-through
// + bookings). Only reliably-detectable choices, so the loop never guesses.
export type EditRecipe = {
  captions: boolean;
  captionStyle: CaptionStyle | null;
  music: boolean;
  qr: boolean;
  logo: boolean;
  hooks: number; // number of text overlays
  stickers: string[]; // pro-sticker kinds used
  trimmed: boolean;
  aiDirected: boolean; // built with the AI Auto-Director
};

const CAP_STYLE_SET = new Set<CaptionStyle>(["clean", "karaoke", "wordpop"]);
/** Coerce arbitrary JSON into a clean EditRecipe (server-side sanitize). */
export function parseRecipe(json: unknown): EditRecipe {
  const r = (json && typeof json === "object" ? json : {}) as Record<string, unknown>;
  const cs = r.captionStyle;
  return {
    captions: r.captions === true,
    captionStyle: typeof cs === "string" && CAP_STYLE_SET.has(cs as CaptionStyle) ? (cs as CaptionStyle) : null,
    music: r.music === true,
    qr: r.qr === true,
    logo: r.logo === true,
    hooks: Number.isFinite(Number(r.hooks)) ? Math.max(0, Math.min(20, Math.round(Number(r.hooks)))) : 0,
    stickers: Array.isArray(r.stickers) ? r.stickers.filter((s): s is string => typeof s === "string").slice(0, 12) : [],
    trimmed: r.trimmed === true,
    aiDirected: r.aiDirected === true,
  };
}

const HEX = /^#[0-9a-fA-F]{6}$/;
/** Coerce arbitrary JSON (DB/request) into a clean brand kit. */
export function parseBrandKit(json: unknown): BrandKit {
  if (!json || typeof json !== "object") return {};
  const r = json as Record<string, unknown>;
  const kit: BrandKit = {};
  if (typeof r.primary === "string" && HEX.test(r.primary)) kit.primary = r.primary;
  if (typeof r.accent === "string" && HEX.test(r.accent)) kit.accent = r.accent;
  if (typeof r.font === "string" && r.font in FONTS) kit.font = r.font as FontKey;
  if (typeof r.logoUrl === "string" && r.logoUrl.length < 600) kit.logoUrl = r.logoUrl;
  return kit;
}

// Base sizes in design units (video = 1080 wide).
export const TEXT_BASE = 56;
export const EMOJI_BASE = 110;
export const STICKER_BASE = 40;
export const QR_BASE = 300; // QR card width in design units — big enough to scan
export const LOGO_BASE = 220; // logo watermark width in design units
export const REVIEW_BASE = 560; // review testimonial-card width in design units
const LINE_H = 1.25;
const PILL_PAD_X = 30;
const PILL_PAD_Y = 18;
const PILL_RADIUS = 22;

// Sticker chrome: background/foreground per kind. `text` carries the label.
export const STICKER_CHROME: Record<StickerKind, { bg: string; fg: string; dashed?: boolean }> = {
  rating: { bg: "#ffffff", fg: "#0a0a0c" },
  price: { bg: "#7c3aed", fg: "#ffffff" },
  book: { bg: "#0a0a0c", fg: "#ffffff" },
  offer: { bg: "#fbbf24", fg: "#0a0a0c", dashed: true },
  promo: { bg: "#f87171", fg: "#ffffff", dashed: true },
  beforeafter: { bg: "#ffffff", fg: "#0a0a0c" },
  urgency: { bg: "#dc2626", fg: "#ffffff" },
  cta: { bg: "#7c3aed", fg: "#ffffff" },
  refer: { bg: "#ffffff", fg: "#7c3aed" },
};

export const ANIMS: { key: AnimKind; label: string }[] = [
  { key: "none", label: "Still" },
  { key: "pop", label: "Pop in" },
  { key: "pulse", label: "Pulse" },
  { key: "bounce", label: "Bounce" },
  { key: "float", label: "Float" },
  { key: "wiggle", label: "Wiggle" },
  { key: "flash", label: "Flash" },
];

/** Category-matched emoji packs for the "For you" row (matched on category name). */
export function categoryEmojis(category: string): string[] {
  const c = category.toLowerCase();
  if (/pet|groom|dog|cat/.test(c)) return ["🐶", "🐱", "🐾", "🛁", "✂️", "✨"];
  if (/hair|barber/.test(c)) return ["✂️", "💇‍♀️", "💈", "🔥", "✨", "😍"];
  if (/nail/.test(c)) return ["💅", "✨", "💎", "🎨", "😍", "🔥"];
  if (/clean/.test(c)) return ["🧽", "🧼", "✨", "🫧", "🏠", "😮"];
  if (/auto|detail|car|wash/.test(c)) return ["🚗", "✨", "🫧", "🧽", "🔥", "😮"];
  if (/photo|video/.test(c)) return ["📸", "🎞️", "✨", "🌅", "😍", "🖼️"];
  if (/train|fit|gym|coach/.test(c)) return ["💪", "🏋️", "🔥", "⏱️", "🥇", "😤"];
  if (/massage|spa|wellness/.test(c)) return ["💆‍♀️", "🧖‍♀️", "🕯️", "🌿", "😌", "✨"];
  if (/lash|brow|makeup|facial|skin|aesthet|med/.test(c)) return ["✨", "💄", "🌸", "😍", "🪞", "💫"];
  if (/real estate|mortgage|home|stag|interior/.test(c)) return ["🏠", "🔑", "📈", "🤝", "📍", "✨"];
  return ["✨", "🔥", "😍", "💯", "👏", "🎉"];
}

/** One-tap hook lines — scroll-stopping openers pros rarely write themselves. */
export function hookLines(category: string): string[] {
  const e = categoryEmojis(category)[0];
  return [
    `Wait for the after ${e}`,
    "POV: you finally booked a real pro",
    "This took 45 minutes ⏱️",
    "Real result — no filter",
    `Save this for when you need it 📌`,
    "Watch till the end 👀",
  ];
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Contrasting text color for a pill of the given background. */
export function pillText(bg: string): string {
  return bg === "#ffffff" || bg === "#fbbf24" || bg === "#34d399" ? "#0a0a0c" : "#ffffff";
}

const INTRO_S = 3;
const OUTRO_S = 3;

function easeOutBack(x: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

/**
 * Animation state at `tt` seconds after the overlay appeared. `sizePx` is the
 * overlay's rendered base size — amplitudes scale with it (the CSS preview
 * uses em units the same way). Returns pixel offsets, a scale multiplier,
 * a rotation offset, and an alpha multiplier.
 */
export function animState(anim: AnimKind, tt: number, sizePx: number): {
  dx: number; dy: number; scale: number; rot: number; alpha: number;
} {
  const none = { dx: 0, dy: 0, scale: 1, rot: 0, alpha: 1 };
  switch (anim) {
    case "pop": {
      if (tt >= 0.45) return none;
      const x = Math.max(0, tt / 0.45);
      return { ...none, scale: easeOutBack(x), alpha: Math.min(1, x * 3) };
    }
    case "pulse":
      return { ...none, scale: 1 + 0.08 * Math.sin((tt / 1.2) * Math.PI * 2) };
    case "bounce":
      return { ...none, dy: -Math.abs(Math.sin((tt / 0.6) * Math.PI)) * sizePx * 0.35 };
    case "float":
      return { ...none, dy: Math.sin((tt / 2) * Math.PI * 2) * sizePx * 0.15 };
    case "wiggle":
      return { ...none, rot: 0.08 * Math.sin((tt / 0.5) * Math.PI * 2) };
    case "flash":
      return { ...none, alpha: 0.6 + 0.4 * (0.5 + 0.5 * Math.sin((tt / 0.8) * Math.PI * 2)) };
    default:
      return none;
  }
}

/** Rendered base size (design units × scale) — amplitude reference for anims. */
export function overlayBaseSize(o: Overlay): number {
  const base =
    o.kind === "emoji"
      ? EMOJI_BASE
      : o.kind === "sticker"
      ? STICKER_BASE
      : o.kind === "qr"
      ? QR_BASE
      : o.kind === "logo"
      ? LOGO_BASE
      : o.kind === "review"
      ? REVIEW_BASE
      : TEXT_BASE;
  return base * o.scale;
}

/** Seconds into the clip at which this overlay appears. */
export function overlayAppearTime(o: Overlay, dur: number): number {
  return o.timing === "outro" ? Math.max(0, dur - OUTRO_S) : 0;
}

/** Is this overlay visible at time `t` (seconds into the — possibly trimmed — clip of length `dur`)? */
export function overlayVisible(o: Overlay, t: number, dur: number): boolean {
  if (o.timing === "intro") return t <= INTRO_S;
  if (o.timing === "outro") return dur > 0 && t >= dur - OUTRO_S;
  return true;
}

function fontFor(o: Overlay, sizePx: number): string {
  const f = FONTS[o.font] || FONTS.sans;
  return `${f.weight} ${sizePx}px ${f.family}`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function drawTextOverlay(ctx: CanvasRenderingContext2D, o: Overlay, u: number) {
  const size = TEXT_BASE * o.scale * u;
  const lines = o.text.split("\n").filter((l, i, a) => l.trim() || i < a.length - 1);
  if (!lines.length) return;
  ctx.font = fontFor(o, size);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const lineH = size * LINE_H;
  const totalH = lineH * lines.length;
  const maxW = Math.max(...lines.map((l) => ctx.measureText(l).width));

  if (o.style === "pill") {
    const padX = (PILL_PAD_X / TEXT_BASE) * size;
    const padY = (PILL_PAD_Y / TEXT_BASE) * size;
    ctx.fillStyle = o.color;
    roundRect(ctx, -maxW / 2 - padX, -totalH / 2 - padY, maxW + padX * 2, totalH + padY * 2, (PILL_RADIUS / TEXT_BASE) * size);
    ctx.fill();
    ctx.fillStyle = pillText(o.color);
  } else if (o.style === "outline") {
    ctx.lineWidth = size * 0.14;
    ctx.lineJoin = "round";
    ctx.strokeStyle = o.color === "#0a0a0c" ? "#ffffff" : "#0a0a0c";
    ctx.fillStyle = o.color;
  } else {
    ctx.shadowColor = "rgba(0,0,0,0.55)";
    ctx.shadowBlur = size * 0.18;
    ctx.fillStyle = o.color;
  }

  lines.forEach((line, i) => {
    const y = -totalH / 2 + lineH * (i + 0.5);
    if (o.style === "outline") ctx.strokeText(line, 0, y);
    ctx.fillText(line, 0, y);
  });
  ctx.shadowBlur = 0;
}

function drawEmojiOverlay(ctx: CanvasRenderingContext2D, o: Overlay, u: number) {
  const size = EMOJI_BASE * o.scale * u;
  ctx.font = `${size}px system-ui, -apple-system, "Segoe UI Emoji", sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(o.text, 0, 0);
}

function drawStickerOverlay(ctx: CanvasRenderingContext2D, o: Overlay, u: number) {
  const chrome = STICKER_CHROME[o.sticker || "book"];
  const size = STICKER_BASE * o.scale * u;
  ctx.font = `800 ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const w = ctx.measureText(o.text).width;
  const padX = size * 0.65;
  const padY = size * 0.45;
  const boxW = w + padX * 2;
  const boxH = size + padY * 2;
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = size * 0.3;
  ctx.fillStyle = chrome.bg;
  roundRect(ctx, -boxW / 2, -boxH / 2, boxW, boxH, boxH / 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  if (chrome.dashed) {
    ctx.setLineDash([size * 0.28, size * 0.22]);
    ctx.lineWidth = Math.max(2, size * 0.07);
    ctx.strokeStyle = chrome.fg;
    roundRect(ctx, -boxW / 2 + size * 0.18, -boxH / 2 + size * 0.18, boxW - size * 0.36, boxH - size * 0.36, (boxH - size * 0.36) / 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = chrome.fg;
  ctx.fillText(o.text, 0, 0);
}

// Booking-QR card: white rounded card + QR modules + a "SCAN TO BOOK" label.
// `matrix` is the precomputed dark-module grid (see brandClip / lib/qr) so we
// don't re-encode the QR on every frame.
function drawQrOverlay(ctx: CanvasRenderingContext2D, o: Overlay, u: number, matrix: boolean[][] | undefined) {
  const cardW = QR_BASE * o.scale * u;
  const pad = cardW * 0.09;
  const labelH = cardW * 0.15;
  const qrSize = cardW - pad * 2;
  const cardH = qrSize + pad * 2 + labelH;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = cardW * 0.07;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cardW * 0.09);
  ctx.fill();
  ctx.shadowBlur = 0;

  if (matrix && matrix.length) {
    const n = matrix.length;
    const cell = qrSize / n;
    const ox = -cardW / 2 + pad;
    const oy = -cardH / 2 + pad;
    ctx.fillStyle = "#0a0a0c";
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        // +0.5 overdraw closes hairline seams between modules on the canvas.
        if (matrix[r][c]) ctx.fillRect(ox + c * cell, oy + r * cell, cell + 0.5, cell + 0.5);
      }
    }
  }

  ctx.fillStyle = "#0a0a0c";
  ctx.font = `800 ${labelH * 0.52}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SCAN TO BOOK", 0, cardH / 2 - pad - labelH / 2 + labelH * 0.15);
  ctx.restore();
}

// Logo watermark: draw the preloaded brand image at LOGO_BASE width, aspect
// preserved. `img` is a CORS-clean HTMLImageElement (see brandClip); if it's
// missing (failed to load) we draw nothing rather than taint the canvas.
function drawLogoOverlay(ctx: CanvasRenderingContext2D, o: Overlay, u: number, img: CanvasImageSource | undefined) {
  if (!img) return;
  const natW = (img as HTMLImageElement).naturalWidth || (img as { width?: number }).width || 1;
  const natH = (img as HTMLImageElement).naturalHeight || (img as { height?: number }).height || 1;
  const w = LOGO_BASE * o.scale * u;
  const h = w * (natH / natW);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.3)";
  ctx.shadowBlur = w * 0.05;
  ctx.drawImage(img, -w / 2, -h / 2, w, h);
  ctx.restore();
}

// Review pull-quote: a testimonial card with gold stars, the quote, and the
// author — a real 5-star review from the pro's channel. Pure text, so no
// preload; both the DOM preview and this share the same layout constants.
function drawReviewOverlay(ctx: CanvasRenderingContext2D, o: Overlay, u: number) {
  const cardW = REVIEW_BASE * o.scale * u;
  const pad = cardW * 0.06;
  const innerW = cardW - pad * 2;
  const starSize = cardW * 0.07;
  const quoteSize = cardW * 0.062;
  const authorSize = cardW * 0.05;
  const lineH = quoteSize * 1.32;
  const stars = Math.max(1, Math.min(5, Math.round(o.stars || 5)));

  ctx.font = `italic 600 ${quoteSize}px Georgia, 'Times New Roman', serif`;
  let lines = wrapLines(ctx, `“${o.text}”`, innerW);
  const MAXL = 4;
  if (lines.length > MAXL) {
    lines = lines.slice(0, MAXL);
    let last = lines[MAXL - 1];
    while (last.length > 1 && ctx.measureText(last + "…”").width > innerW) last = last.slice(0, -1);
    lines[MAXL - 1] = last + "…”";
  }

  const starsH = starSize * 1.5;
  const authorH = authorSize * 1.8;
  const cardH = pad * 2 + starsH + lines.length * lineH + authorH;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.32)";
  ctx.shadowBlur = cardW * 0.05;
  ctx.fillStyle = "#ffffff";
  roundRect(ctx, -cardW / 2, -cardH / 2, cardW, cardH, cardW * 0.06);
  ctx.fill();
  ctx.shadowBlur = 0;

  const left = -cardW / 2 + pad;
  let y = -cardH / 2 + pad;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  // stars: light row, gold-filled to the rating
  ctx.font = `${starSize}px system-ui, -apple-system, "Segoe UI Emoji", sans-serif`;
  ctx.fillStyle = "#e5e7eb";
  ctx.fillText("★★★★★", left, y);
  ctx.fillStyle = "#fbbf24";
  ctx.fillText("★★★★★".slice(0, stars), left, y);
  y += starsH;
  // quote
  ctx.fillStyle = "#0a0a0c";
  ctx.font = `italic 600 ${quoteSize}px Georgia, 'Times New Roman', serif`;
  for (const line of lines) {
    ctx.fillText(line, left, y);
    y += lineH;
  }
  // author
  ctx.fillStyle = "#6b7280";
  ctx.font = `700 ${authorSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillText(`— ${o.by || ""}`, left, y + authorSize * 0.25);
  ctx.restore();
}

// ---- timed captions (TikTok-style bottom pills) ----
// One coordinate rule shared with the editor preview: the caption block is
// centered at CAPTION_Y design units above the bottom edge.

import type { CaptionSegment, CaptionWord } from "@/lib/captions";

export const CAPTION_Y = 420; // design units above the bottom edge
export const CAPTION_SIZE = 40; // font size, design units
const CAPTION_MAX_W = 0.86; // of frame width

// Caption look. "clean" = the whole line on a dark pill (original). "karaoke" =
// the whole line, active word lit in the accent color as it's spoken. "wordpop"
// = one big accent word at a time. karaoke/wordpop need per-word timings (only
// present on clips transcribed after word-granularity shipped); both fall back
// to "clean" when a segment has no words.
export type CaptionStyle = "clean" | "karaoke" | "wordpop";

export const CAPTION_STYLES: { key: CaptionStyle; label: string }[] = [
  { key: "clean", label: "Clean" },
  { key: "karaoke", label: "Karaoke" },
  { key: "wordpop", label: "Word pop" },
];

// Accent used to light the active word in karaoke/wordpop.
export const CAPTION_ACCENTS = ["#a78bfa", "#f472b6", "#fbbf24", "#34d399", "#38bdf8", "#f87171"] as const;
export const CAPTION_ACCENT_DEFAULT = "#a78bfa";

export function activeCaption(caps: CaptionSegment[], t: number): string | null {
  const seg = caps.find((s) => t >= s.start && t < s.end);
  return seg ? seg.text : null;
}

/** The caption segment active at time `t`, or null. */
export function activeSegment(caps: CaptionSegment[], t: number): CaptionSegment | null {
  return caps.find((s) => t >= s.start && t < s.end) || null;
}

/**
 * Index of the word being spoken at `t` within a segment: the last word whose
 * start has passed, so the highlight holds through gaps and to the line's end.
 * Returns -1 before the first word (or when the segment has no word timings).
 */
export function activeWordIndex(seg: CaptionSegment, t: number): number {
  const words = seg.words;
  if (!words?.length) return -1;
  let idx = -1;
  for (let i = 0; i < words.length; i++) {
    if (t >= words[i].start) idx = i;
    else break;
  }
  return idx;
}

/** True when karaoke/wordpop can actually render this segment (has word timings). */
export function segmentHasWords(seg: CaptionSegment | null): boolean {
  return !!seg?.words?.length;
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && ctx.measureText(next).width > maxW) {
      lines.push(cur);
      cur = w;
    } else {
      cur = next;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

// Lay word tokens into centered lines that fit `maxW`, each keeping its index
// into the segment's word list (so karaoke can find the active token).
function layoutTokens(
  ctx: CanvasRenderingContext2D,
  words: CaptionWord[],
  maxW: number,
): { text: string; i: number }[][] {
  const spaceW = ctx.measureText(" ").width;
  const lines: { text: string; i: number }[][] = [];
  let cur: { text: string; i: number }[] = [];
  let curW = 0;
  words.forEach((w, i) => {
    const wW = ctx.measureText(w.text).width;
    const add = cur.length ? spaceW + wW : wW;
    if (cur.length && curW + add > maxW) {
      lines.push(cur);
      cur = [];
      curW = 0;
    }
    cur.push({ text: w.text, i });
    curW += cur.length === 1 ? wW : add;
  });
  if (cur.length) lines.push(cur);
  return lines;
}

/**
 * Draw the caption active at absolute video time `t` (untrimmed timeline) in the
 * chosen style. `accent` lights the spoken word in karaoke/wordpop.
 */
export function drawCaptions(
  ctx: CanvasRenderingContext2D,
  caps: CaptionSegment[],
  W: number,
  H: number,
  t: number,
  style: CaptionStyle = "clean",
  accent: string = CAPTION_ACCENT_DEFAULT,
) {
  const seg = activeSegment(caps, t);
  if (!seg) return;
  const u = W / DESIGN_W;
  const size = CAPTION_SIZE * u;
  const centerY = H - CAPTION_Y * u;
  ctx.save();
  ctx.textBaseline = "middle";

  // wordpop: one big accent word at a time.
  if (style === "wordpop" && seg.words?.length) {
    const idx = Math.max(0, activeWordIndex(seg, t));
    const word = seg.words[idx]?.text || "";
    const wSize = size * 1.7;
    ctx.font = `800 ${wSize}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "center";
    const w = ctx.measureText(word).width;
    const padX = wSize * 0.42;
    const padY = wSize * 0.28;
    const boxH = wSize + padY * 2;
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = wSize * 0.35;
    ctx.fillStyle = accent;
    roundRect(ctx, W / 2 - w / 2 - padX, centerY - boxH / 2, w + padX * 2, boxH, boxH * 0.32);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = pillText(accent);
    ctx.fillText(word, W / 2, centerY);
    ctx.restore();
    return;
  }

  // karaoke: full line on a dark pill, active word lit in the accent.
  if (style === "karaoke" && seg.words?.length) {
    const active = activeWordIndex(seg, t);
    ctx.font = `800 ${size}px system-ui, -apple-system, sans-serif`;
    ctx.textAlign = "left";
    const spaceW = ctx.measureText(" ").width;
    const lines = layoutTokens(ctx, seg.words, W * CAPTION_MAX_W);
    const lineH = size * 1.5;
    const padX = size * 0.4;
    const startY = centerY - (lineH * (lines.length - 1)) / 2;
    lines.forEach((line, li) => {
      const y = startY + li * lineH;
      const lineW = line.reduce((acc, tok, ti) => acc + ctx.measureText(tok.text).width + (ti ? spaceW : 0), 0);
      // dark pill behind the whole line for legibility
      ctx.fillStyle = "rgba(0,0,0,0.62)";
      roundRect(ctx, W / 2 - lineW / 2 - padX, y - lineH / 2, lineW + padX * 2, lineH, size * 0.35);
      ctx.fill();
      let x = W / 2 - lineW / 2;
      line.forEach((tok, ti) => {
        if (ti) x += spaceW;
        const wW = ctx.measureText(tok.text).width;
        ctx.fillStyle = tok.i === active ? accent : "#ffffff";
        ctx.fillText(tok.text, x, y);
        x += wW;
      });
    });
    ctx.restore();
    return;
  }

  // clean (also the fallback when a segment lacks word timings).
  ctx.font = `800 ${size}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  const lines = wrapLines(ctx, seg.text, W * CAPTION_MAX_W);
  const lineH = size * 1.35;
  const padX = size * 0.45;
  const startY = centerY - (lineH * (lines.length - 1)) / 2;
  lines.forEach((line, i) => {
    const y = startY + i * lineH;
    const w = ctx.measureText(line).width;
    ctx.fillStyle = "rgba(0,0,0,0.65)";
    roundRect(ctx, W / 2 - w / 2 - padX, y - lineH / 2, w + padX * 2, lineH, size * 0.35);
    ctx.fill();
    ctx.fillStyle = "#ffffff";
    ctx.fillText(line, W / 2, y);
  });
  ctx.restore();
}

/**
 * Draw every overlay visible at time `t` onto the canvas. `W`/`H` are the
 * canvas size; `dur` is the (trimmed) clip length used for intro/outro timing.
 */
export function drawStudioOverlays(
  ctx: CanvasRenderingContext2D,
  overlays: Overlay[],
  W: number,
  H: number,
  t: number,
  dur: number,
  // url → precomputed QR module matrix (keeps us from re-encoding per frame).
  qrMatrices?: Map<string, boolean[][]>,
  // url → preloaded, CORS-clean logo image for watermark overlays.
  logoImages?: Map<string, CanvasImageSource>,
) {
  const u = W / DESIGN_W;
  for (const o of overlays) {
    if (!overlayVisible(o, t, dur)) continue;
    const tt = t - overlayAppearTime(o, dur);
    const a = animState(o.anim || "none", Math.max(0, tt), overlayBaseSize(o) * u);
    ctx.save();
    ctx.globalAlpha = a.alpha;
    ctx.translate(o.x * W + a.dx, o.y * H + a.dy);
    ctx.rotate(o.rotation + a.rot);
    ctx.scale(a.scale, a.scale);
    if (o.kind === "text") drawTextOverlay(ctx, o, u);
    else if (o.kind === "emoji") drawEmojiOverlay(ctx, o, u);
    else if (o.kind === "qr") drawQrOverlay(ctx, o, u, qrMatrices?.get(o.text));
    else if (o.kind === "logo") drawLogoOverlay(ctx, o, u, logoImages?.get(o.text));
    else if (o.kind === "review") drawReviewOverlay(ctx, o, u);
    else drawStickerOverlay(ctx, o, u);
    ctx.restore();
  }
}
