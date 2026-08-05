"use client";

// TikTok-style mini studio for a customer's reel (ported from PeekScout).
// Fullscreen editor: drag / pinch / rotate text, emojis, and pro stickers
// (live Google rating, starting price, call/text CTA, promo) onto the video,
// trim it, then render everything client-side (brandClip) and share or save.
// The DOM preview and the canvas export share the same model + constants
// (lib/studio), so the burn matches what the customer laid out.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  Image as ImageIcon,
  ImagePlus,
  Layers,
  Magnet,
  Music,
  SwatchBook,
  Palette,
  Pause,
  QrCode,
  Quote,
  Pencil,
  Play,
  Redo2,
  RotateCw,
  Scissors,
  Share2,
  Smile,
  Sparkles,
  Star,
  Subtitles,
  Tag,
  Trash2,
  Type,
  Undo2,
  Upload,
  Download,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { brandClip } from "@/lib/brandClip";
import type { CaptionSegment } from "@/lib/captions";
import {
  ANIMS,
  CAPTION_ACCENTS,
  CAPTION_ACCENT_DEFAULT,
  CAPTION_SIZE,
  CAPTION_STYLES,
  CAPTION_Y,
  DESIGN_W,
  activeSegment,
  activeWordIndex,
  segmentHasWords,
  EMOJI_BASE,
  FONTS,
  PALETTE,
  STICKER_BASE,
  STICKER_CHROME,
  TEXT_BASE,
  categoryEmojis,
  hookLines,
  LOOKS,
  newId,
  overlayVisible,
  pillText,
  QR_BASE,
  LOGO_BASE,
  REVIEW_BASE,
  type BrandKit,
  type EditRecipe,
  type AnimKind,
  type AutoDirectResult,
  type CaptionStyle,
  type FontKey,
  type Overlay,
  type OverlayTiming,
  type StickerKind,
  type TextStyle,
} from "@/lib/studio";
import { STUDIO_TRACKS, MUSIC_VOLUME_DEFAULT, type StudioMusic } from "@/lib/studioMusic";
import { telUrl, qrSvgDataUrl } from "@/lib/qr";

const EMOJIS = [
  "🔥", "✨", "💅", "💇‍♀️", "💆‍♀️", "🧖‍♀️", "💪", "🐶", "🐱", "🚗", "📸", "🏠",
  "😍", "🤩", "😎", "🥰", "💯", "👀", "👇", "👆", "✅", "❌", "⭐", "🌟",
  "💖", "💜", "💰", "💵", "🎉", "🎁", "📅", "📍", "☎️", "💬", "⏰", "🏆",
  "👑", "💎", "🌸", "🌴", "☀️", "🍑", "🫶", "🙌", "👏", "🚨", "‼️", "➡️",
];

const TIMINGS: { key: OverlayTiming; label: string }[] = [
  { key: "all", label: "Whole video" },
  { key: "intro", label: "First 3s" },
  { key: "outro", label: "Last 3s" },
];

const STYLES: TextStyle[] = ["plain", "pill", "outline"];
const FONT_KEYS = Object.keys(FONTS) as FontKey[];

type Panel = "none" | "emoji" | "sticker" | "trim" | "hooks" | "captions" | "music" | "looks" | "layers" | "brand" | "reviews";

// CSS twins of the canvas anims (lib/studio animState). Amplitudes are in em
// so they scale with the overlay's font size, like the canvas math does.
const ANIM_CSS: Record<AnimKind, string> = {
  none: "",
  pop: "ps-pop 0.45s ease-out both",
  pulse: "ps-pulse 1.2s ease-in-out infinite",
  bounce: "ps-bounce 0.6s ease-in-out infinite",
  float: "ps-float 2s ease-in-out infinite",
  wiggle: "ps-wiggle 0.5s ease-in-out infinite",
  flash: "ps-flash 0.8s ease-in-out infinite",
};

const ANIM_KEYFRAMES = `
@keyframes ps-pop { 0% { transform: scale(0); opacity: 0; } 60% { transform: scale(1.18); opacity: 1; } 100% { transform: scale(1); } }
@keyframes ps-pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.08); } }
@keyframes ps-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-0.35em); } }
@keyframes ps-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(0.15em); } }
@keyframes ps-wiggle { 0%, 100% { transform: rotate(-4.5deg); } 50% { transform: rotate(4.5deg); } }
@keyframes ps-flash { 0%, 100% { opacity: 1; } 50% { opacity: 0.6; } }
`;

type Props = {
  clipUrl: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  /** Call/Text number — powers the QR (tap-to-call) and the CTA sticker. */
  phone: string | null;
  rating: number;
  reviewCount: number;
  priceMin: number | null;
  introOffer: string | null;
  /** Stored whisper captions for this clip, if the video already has them. */
  storedCaptions?: CaptionSegment[] | null;
  onClose: () => void;
  /** Hand the rendered file back (caption + share sheet handled by the caller). */
  onShare: (file: File) => void;
  /** Whether this channel is connected to TikTok (shows the "To TikTok" button). */
  tiktokConnected?: boolean;
  /** Upload the render + push it to the pro's TikTok drafts. Resolves on success. */
  onSendTikTok?: (file: File) => Promise<void>;
  /** Save the render back onto the channel (replaces the edited clip). */
  onSaveToChannel?: (file: File, recipe: EditRecipe) => Promise<void>;
  /** AI Auto-Director: given the current captions, return a full overlay layout. */
  onAutoDirect?: (args: { captions: CaptionSegment[] | null; hasWords: boolean }) => Promise<AutoDirectResult>;
  /** Send the pro to Stripe Checkout to buy a Magic-edit credit pack. */
  onBuyCredits?: () => void;
  /** Current Magic-edit allowance, for the button label + buy prompt. */
  creditInfo?: { freeRemaining: number; credits: number } | null;
  /** The pro's saved brand kit (colors/font/logo), loaded async. */
  brandKit?: BrandKit | null;
  /** Persist the brand kit to the pro's channel. */
  onSaveBrand?: (kit: BrandKit) => Promise<void> | void;
  /** Upload a logo image; resolves to its public URL. */
  onUploadLogo?: (file: File) => Promise<string>;
  /** The pro's real 5-star pull-quotes, for the review sticker. */
  reviews?: { id: string; quote: string; stars: number; author: string }[];
};

export default function VideoStudio({
  clipUrl, slug, name, category, city, phone, rating, reviewCount, priceMin, introOffer, storedCaptions, onClose, onShare,
  tiktokConnected, onSendTikTok, onSaveToChannel, onAutoDirect, onBuyCredits, creditInfo,
  brandKit, onSaveBrand, onUploadLogo, reviews,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const [overlays, setOverlays] = useState<Overlay[]>([]);
  // Undo/redo history. Live drag/resize updates go straight to `overlays`; only
  // discrete actions (and the end of a drag) push a snapshot, so history is one
  // step per meaningful change, not one per pointer move.
  const [past, setPast] = useState<Overlay[][]>([]);
  const [future, setFuture] = useState<Overlay[][]>([]);
  const overlaysRef = useRef<Overlay[]>([]);
  useEffect(() => { overlaysRef.current = overlays; }, [overlays]);
  const [snap, setSnap] = useState(true);
  const [guide, setGuide] = useState<{ v: boolean; h: boolean }>({ v: false, h: false });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [panel, setPanel] = useState<Panel>("none");
  const [aspect, setAspect] = useState(9 / 16);
  const [dur, setDur] = useState(0);
  const [trim, setTrim] = useState<{ start: number; end: number } | null>(null);
  const [t, setT] = useState(0);
  const [frameW, setFrameW] = useState(0);
  const [exporting, setExporting] = useState<{ pct: number; mode: "share" | "save" | "tiktok" | "channel" } | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [playing, setPlaying] = useState(true);
  const [caps, setCaps] = useState<CaptionSegment[] | null>(storedCaptions || null);
  const [capStyle, setCapStyle] = useState<CaptionStyle>("clean");
  const [capAccent, setCapAccent] = useState<string>(CAPTION_ACCENT_DEFAULT);
  const [music, setMusic] = useState<StudioMusic | null>(null);
  // Audition player for the music library — one shared <audio> element.
  const auditionRef = useRef<HTMLAudioElement | null>(null);
  const [auditioning, setAuditioning] = useState<string | null>(null);
  // AI Auto-Director ("Magic edit").
  const [magicBusy, setMagicBusy] = useState(false);
  const [magicNote, setMagicNote] = useState<string | null>(null);
  const [needCredits, setNeedCredits] = useState(false);
  const [usedMagic, setUsedMagic] = useState(false); // this edit was AI-directed
  // Brand kit (colors/font/logo) — editable copy of the saved kit.
  const [kit, setKit] = useState<BrandKit>(brandKit || {});
  const [kitSaving, setKitSaving] = useState(false);
  const [logoBusy, setLogoBusy] = useState(false);
  useEffect(() => { if (brandKit) setKit(brandKit); }, [brandKit]);

  // Preview playback control. Autoplay makes the clip loop forever, which is
  // useless when you're trying to place an overlay on a specific frame.
  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().then(() => setPlaying(true)).catch(() => {});
    } else {
      v.pause();
      setPlaying(false);
    }
  }
  const [capsOn, setCapsOn] = useState(!!storedCaptions?.length);
  const [capsBusy, setCapsBusy] = useState(false);

  // Captions button: if the clip is already transcribed, open the style panel;
  // otherwise transcribe it via Whisper first, then open the panel.
  async function captionsButton() {
    setErr(null);
    if (caps?.length) {
      setCapsOn(true);
      setPanel((p) => (p === "captions" ? "none" : "captions"));
      return;
    }
    setCapsBusy(true);
    try {
      const res = await fetch("/api/videos/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clipUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && Array.isArray(data.segments) && data.segments.length) {
        setCaps(data.segments);
        setCapsOn(true);
        setPanel("captions");
      } else {
        setErr(
          data.reason === "not_configured"
            ? "Captions aren't available right now."
            : "Couldn't caption this clip — it may have no speech.",
        );
      }
    } catch {
      setErr("Couldn't caption this clip — try again.");
    } finally {
      setCapsBusy(false);
    }
  }

  // Force a fresh transcription (with word timing) even if captions already
  // exist — the path older clips take to unlock karaoke/word-pop.
  async function reCaption() {
    setErr(null);
    setCapsBusy(true);
    try {
      const res = await fetch("/api/videos/captions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: clipUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok && Array.isArray(data.segments) && data.segments.length) {
        setCaps(data.segments);
        setCapsOn(true);
      } else {
        setErr("Couldn't re-caption this clip — try again.");
      }
    } catch {
      setErr("Couldn't re-caption this clip — try again.");
    } finally {
      setCapsBusy(false);
    }
  }

  // True once the current captions carry per-word timing (needed for the
  // karaoke/word-pop styles). Clips captioned before word timing shipped lack it
  // and fall back to the clean look.
  const capsHaveWords = !!caps?.some((s) => segmentHasWords(s));

  // AI Auto-Director: replace the layout with a full AI-directed edit. Applies
  // the returned overlays + caption style; prompts to buy credits when the
  // allowance is spent.
  async function runMagic() {
    if (!onAutoDirect || magicBusy) return;
    setErr(null);
    setMagicNote(null);
    setMagicBusy(true);
    try {
      const res = await onAutoDirect({ captions: caps, hasWords: capsHaveWords });
      if (res.ok) {
        commit(res.overlays);
        setSelectedId(null);
        setEditingId(null);
        setPanel("none");
        setCapStyle(res.captionStyle);
        if (caps?.length) setCapsOn(true); // the director's edit assumes captions on
        // Auto-soundtrack: drop in the mood-matched track the director chose.
        if (res.music) {
          const tr = STUDIO_TRACKS.find((t) => t.id === res.music);
          if (tr) setMusic({ src: tr.src, label: tr.label, volume: MUSIC_VOLUME_DEFAULT, muteOriginal: false });
        }
        setUsedMagic(true);
        setMagicNote(res.rationale || "Your AI edit is ready — tweak anything you like.");
      } else if (res.needCredits) {
        setNeedCredits(true);
      } else {
        setErr(res.message);
      }
    } catch {
      setErr("Couldn't auto-edit this clip — try again.");
    } finally {
      setMagicBusy(false);
    }
  }

  // Short allowance label for the Magic button ("3 free" / "12 left").
  const magicAllowance = creditInfo
    ? creditInfo.freeRemaining > 0
      ? `${creditInfo.freeRemaining} free`
      : creditInfo.credits > 0
      ? `${creditInfo.credits} left`
      : "get more"
    : null;

  // ---- music: audition + selection ----
  function stopAudition() {
    auditionRef.current?.pause();
    setAuditioning(null);
  }
  function toggleAudition(id: string, src: string) {
    if (auditioning === id) {
      stopAudition();
      return;
    }
    let el = auditionRef.current;
    if (!el) {
      el = new Audio();
      el.loop = true;
      el.onended = () => setAuditioning(null);
      auditionRef.current = el;
    }
    el.src = src;
    el.currentTime = 0;
    el.play().then(() => setAuditioning(id)).catch(() => setAuditioning(null));
  }
  function pickTrack(id: string, label: string, src: string) {
    setMusic((m) => ({
      src,
      label,
      volume: m?.volume ?? MUSIC_VOLUME_DEFAULT,
      muteOriginal: m?.muteOriginal ?? false,
    }));
  }
  function onUploadTrack(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const src = URL.createObjectURL(file);
    setMusic((m) => ({
      src,
      label: file.name.replace(/\.[^.]+$/, "").slice(0, 40) || "My track",
      volume: m?.volume ?? MUSIC_VOLUME_DEFAULT,
      muteOriginal: m?.muteOriginal ?? false,
    }));
    toggleAudition("upload", src);
  }
  // Stop auditioning whenever the music panel closes or the editor unmounts.
  useEffect(() => {
    if (panel !== "music") stopAudition();
  }, [panel]);
  useEffect(() => () => auditionRef.current?.pause(), []);

  // Keyboard undo/redo (desktop). Ignored while typing in the text editor.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (editingId) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) return;
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== "z") return;
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId, past, future]);

  const selected = overlays.find((o) => o.id === selectedId) || null;
  const editing = overlays.find((o) => o.id === editingId) || null;
  const trimStart = trim?.start ?? 0;
  const trimEnd = trim?.end ?? dur;
  const effDur = Math.max(0.5, trimEnd - trimStart);
  const trimmed = !!trim && (trim.start > 0.2 || trim.end < dur - 0.2);

  // Design-unit → preview-px factor. All overlay sizes multiply by this.
  const k = frameW > 0 ? frameW / DESIGN_W : 0;

  // Track the rendered frame width (the video box overlays are positioned in).
  // Measured directly + on resize, with ResizeObserver as a bonus — some
  // embedded browsers never deliver the RO callback.
  const measure = useCallback(() => {
    const el = frameRef.current;
    if (el) setFrameW(el.getBoundingClientRect().width);
  }, []);
  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined" && frameRef.current) {
      ro = new ResizeObserver(measure);
      ro.observe(frameRef.current);
    }
    return () => {
      window.removeEventListener("resize", measure);
      ro?.disconnect();
    };
  }, [measure]);
  // Panels and aspect changes reflow the stage without a window resize.
  useEffect(() => {
    measure();
  }, [aspect, panel, selectedId, editingId, measure]);

  // Loop preview inside the trim window; track time for intro/outro preview.
  const onTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (trim && (v.currentTime >= trim.end || v.currentTime < trim.start - 0.4)) {
      v.currentTime = trim.start;
    }
    setT(v.currentTime);
  }, [trim]);

  // ---- history ----
  const HIST_MAX = 60;
  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  // Record a discrete change: snapshot the current layout, apply the next one,
  // and drop any redo tail.
  function commit(next: Overlay[] | ((prev: Overlay[]) => Overlay[])) {
    const prev = overlaysRef.current;
    const resolved = typeof next === "function" ? (next as (p: Overlay[]) => Overlay[])(prev) : next;
    setPast((p) => {
      const np = [...p, prev];
      return np.length > HIST_MAX ? np.slice(np.length - HIST_MAX) : np;
    });
    setFuture([]);
    setOverlays(resolved);
  }
  function commitUpdate(id: string, patch: Partial<Overlay>) {
    commit((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function undo() {
    if (!past.length) return;
    const prev = past[past.length - 1];
    setFuture((f) => [overlaysRef.current, ...f]);
    setPast((p) => p.slice(0, -1));
    setOverlays(prev);
    setSelectedId(null);
    setEditingId(null);
  }
  function redo() {
    if (!future.length) return;
    const nextState = future[0];
    setPast((p) => {
      const np = [...p, overlaysRef.current];
      return np.length > HIST_MAX ? np.slice(np.length - HIST_MAX) : np;
    });
    setFuture((f) => f.slice(1));
    setOverlays(nextState);
    setSelectedId(null);
    setEditingId(null);
  }

  // Live mutation used by drag/pinch — NOT recorded per move (see gesture end).
  function update(id: string, patch: Partial<Overlay>) {
    setOverlays((os) => os.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }
  function remove(id: string) {
    commit((os) => os.filter((o) => o.id !== id));
    if (selectedId === id) setSelectedId(null);
    if (editingId === id) setEditingId(null);
  }

  function addText(text = "", anim: AnimKind = "none") {
    const o: Overlay = {
      id: newId(), kind: "text", text, font: "sans", color: "#ffffff",
      style: "pill", x: 0.5, y: text ? 0.2 : 0.4, scale: 1, rotation: 0, timing: "all", anim,
    };
    commit((os) => [...os, o]);
    setSelectedId(o.id);
    setPanel("none");
    if (!text) {
      setEditingId(o.id);
      setDraft("");
    }
  }

  function addEmoji(e: string, anim: AnimKind = "none") {
    const o: Overlay = {
      id: newId(), kind: "emoji", text: e, font: "sans", color: "#ffffff",
      style: "plain", x: 0.5, y: 0.5, scale: 1, rotation: 0, timing: "all", anim,
    };
    commit((os) => [...os, o]);
    setSelectedId(o.id);
    setPanel("none");
  }

  function addSticker(kind: StickerKind, text: string) {
    const anim: AnimKind = kind === "urgency" ? "flash" : kind === "cta" ? "bounce" : kind === "offer" || kind === "promo" ? "pulse" : "none";
    const o: Overlay = {
      id: newId(), kind: "sticker", sticker: kind, text, font: "sans", color: "#ffffff",
      style: "pill", x: 0.5, y: kind === "book" || kind === "cta" ? 0.72 : 0.3, scale: 1, rotation: 0, timing: "all", anim,
    };
    commit((os) => [...os, o]);
    setSelectedId(o.id);
    setPanel("none");
    if (kind === "promo" || kind === "urgency") {
      setEditingId(o.id);
      setDraft(text);
    }
  }

  // Tap-to-call QR — scans straight into the dialer with the customer's number.
  // A CTA that still works after the clip is downloaded and reposted anywhere.
  const qrLink = phone ? telUrl(phone) : "https://theaftershot.com";
  const qrDataUrl = useMemo(() => {
    try {
      return qrSvgDataUrl(qrLink);
    } catch {
      return "";
    }
  }, [qrLink]);
  function addQr() {
    const o: Overlay = {
      id: newId(), kind: "qr", text: qrLink, font: "sans", color: "#ffffff",
      style: "plain", x: 0.78, y: 0.68, scale: 1, rotation: 0, timing: "all", anim: "pop",
    };
    commit((os) => [...os, o]);
    setSelectedId(o.id);
    setPanel("none");
  }

  function addReview(quote: string, stars: number, author: string) {
    const o: Overlay = {
      id: newId(), kind: "review", text: quote, stars, by: author, font: "serif", color: "#0a0a0c",
      style: "plain", x: 0.5, y: 0.42, scale: 1, rotation: 0, timing: "all", anim: "pop",
    };
    commit((os) => [...os, o]);
    setSelectedId(o.id);
    setPanel("none");
  }

  // ---- brand kit ----
  function addLogo(url?: string) {
    const src = url || kit.logoUrl;
    if (!src) return;
    const existing = overlaysRef.current.find((o) => o.kind === "logo" && o.text === src);
    if (existing) {
      setSelectedId(existing.id);
      return;
    }
    const o: Overlay = {
      id: newId(), kind: "logo", text: src, font: "sans", color: "#ffffff",
      style: "plain", x: 0.16, y: 0.12, scale: 0.7, rotation: 0, timing: "all", anim: "none",
    };
    commit((os) => [...os, o]);
    setSelectedId(o.id);
  }
  async function onLogoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !onUploadLogo) return;
    setErr(null);
    setLogoBusy(true);
    try {
      const url = await onUploadLogo(file);
      const nextKit = { ...kit, logoUrl: url };
      setKit(nextKit);
      await onSaveBrand?.(nextKit);
    } catch {
      setErr("Couldn't upload that logo — try a PNG under 10MB.");
    } finally {
      setLogoBusy(false);
    }
  }
  async function saveBrand(next?: BrandKit) {
    const k = next || kit;
    setKit(k);
    if (!onSaveBrand) return;
    setKitSaving(true);
    try {
      await onSaveBrand(k);
    } finally {
      setKitSaving(false);
    }
  }
  // One-tap: dress the whole clip in the pro's brand (colors + font on all text,
  // caption accent, and their logo watermark).
  function applyBrand() {
    commit((os) =>
      os.map((o) =>
        o.kind === "text"
          ? { ...o, color: kit.primary || o.color, font: kit.font || o.font }
          : o,
      ),
    );
    if (kit.accent) setCapAccent(kit.accent);
    if (kit.logoUrl) addLogo(kit.logoUrl);
    setPanel("none");
    setMagicNote("Applied your brand — colors, font, and logo.");
  }

  // Color rows with the pro's brand colors pinned first (one tap).
  const brandColors = [kit.primary, kit.accent].filter((c): c is string => !!c);
  const textColorRow = Array.from(new Set([...brandColors, ...PALETTE]));
  const accentRow = Array.from(new Set([kit.accent, kit.primary, ...CAPTION_ACCENTS].filter((c): c is string => !!c)));

  // ---- looks / layers ----
  function applyLook(key: (typeof LOOKS)[number]["key"]) {
    const look = LOOKS.find((l) => l.key === key);
    if (!look) return;
    commit((os) =>
      os.map((o) => (o.kind === "text" ? { ...o, font: look.font, style: look.textStyle, color: look.color } : o)),
    );
    setCapStyle(look.captionStyle);
    setCapAccent(look.accent);
    if (caps?.length) setCapsOn(true);
  }
  function reorder(id: string, dir: 1 | -1) {
    commit((os) => {
      const i = os.findIndex((o) => o.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= os.length) return os;
      const next = [...os];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }
  function duplicate(id: string) {
    const src = overlaysRef.current.find((o) => o.id === id);
    if (!src) return;
    const copy: Overlay = { ...src, id: newId(), x: Math.min(1.05, src.x + 0.04), y: Math.min(1.05, src.y + 0.04) };
    commit((os) => {
      const i = os.findIndex((o) => o.id === id);
      const next = [...os];
      next.splice(i + 1, 0, copy);
      return next;
    });
    setSelectedId(copy.id);
  }

  const stickerMenu: { kind: StickerKind; text: string; note: string }[] = [
    ...(rating > 0 && reviewCount > 0
      ? [{ kind: "rating" as const, text: `★ ${rating.toFixed(1)} · ${reviewCount} reviews`, note: "Your real Google rating" }]
      : []),
    ...(priceMin ? [{ kind: "price" as const, text: `From $${priceMin}`, note: "Your starting price" }] : []),
    ...(phone ? [{ kind: "book" as const, text: `📞 Call/Text ${phone}`, note: "Your call/text CTA" }] : []),
    ...(introOffer ? [{ kind: "offer" as const, text: `🎁 ${introOffer}`, note: "Your new-client offer" }] : []),
    { kind: "promo", text: "20% OFF THIS WEEK", note: "Promo badge — tap to edit the text" },
    { kind: "urgency", text: "🔥 2 SPOTS LEFT THIS WEEK", note: "Urgency badge (flashes) — tap to edit" },
    { kind: "cta", text: "👇 Call below", note: "Bouncing call-to-action" },
    { kind: "beforeafter", text: "BEFORE ➜ AFTER", note: "Label a transformation clip" },
  ];

  // ---- pointer gestures: drag (1 finger), pinch to scale+rotate (2) ----
  const gesture = useRef<{
    id: string;
    pointers: Map<number, { x: number; y: number }>;
    start: { x: number; y: number; scale: number; rotation: number; dist: number; ang: number };
  } | null>(null);
  // Snapshot the layout at the START of a drag/resize; record it as one history
  // entry when the gesture ends, but only if it actually moved something.
  const gesturePre = useRef<Overlay[] | null>(null);
  const gestureMoved = useRef(false);
  function beginGesture() {
    if (!gesturePre.current) {
      gesturePre.current = overlaysRef.current;
      gestureMoved.current = false;
    }
  }
  function recordGestureEnd() {
    if (gestureMoved.current && gesturePre.current) {
      const snapshot = gesturePre.current;
      setPast((p) => {
        const np = [...p, snapshot];
        return np.length > HIST_MAX ? np.slice(np.length - HIST_MAX) : np;
      });
      setFuture([]);
    }
    gesturePre.current = null;
    gestureMoved.current = false;
    setGuide({ v: false, h: false });
  }
  const SNAP_LINES = [0.5];
  const SNAP_T = 0.02;
  // Snap a dragged center toward the frame center when close; returns the
  // possibly-snapped value plus whether it snapped (for the guide line).
  function snapAxis(v: number): { v: number; hit: boolean } {
    if (!snap) return { v, hit: false };
    for (const line of SNAP_LINES) if (Math.abs(v - line) < SNAP_T) return { v: line, hit: true };
    return { v, hit: false };
  }

  function framePoint(e: React.PointerEvent) {
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return { x: 0, y: 0, w: 1, h: 1 };
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  }

  function onOverlayDown(e: React.PointerEvent, o: Overlay) {
    e.stopPropagation();
    setSelectedId(o.id);
    beginGesture();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const p = framePoint(e);
    const g = gesture.current?.id === o.id ? gesture.current : {
      id: o.id,
      pointers: new Map(),
      start: { x: o.x, y: o.y, scale: o.scale, rotation: o.rotation, dist: 0, ang: 0 },
    };
    g.pointers.set(e.pointerId, { x: p.x, y: p.y });
    if (g.pointers.size === 2) {
      const [a, b] = Array.from(g.pointers.values());
      g.start = {
        x: o.x, y: o.y, scale: o.scale, rotation: o.rotation,
        dist: Math.hypot(b.x - a.x, b.y - a.y),
        ang: Math.atan2(b.y - a.y, b.x - a.x),
      };
    } else {
      g.start = { ...g.start, x: o.x, y: o.y, scale: o.scale, rotation: o.rotation };
    }
    gesture.current = g;
  }

  function onOverlayMove(e: React.PointerEvent, o: Overlay) {
    const g = gesture.current;
    if (!g || g.id !== o.id || !g.pointers.has(e.pointerId)) return;
    const p = framePoint(e);
    const prev = g.pointers.get(e.pointerId)!;
    g.pointers.set(e.pointerId, { x: p.x, y: p.y });
    gestureMoved.current = true;
    if (g.pointers.size === 1) {
      const sx = snapAxis(Math.min(1.05, Math.max(-0.05, o.x + (p.x - prev.x) / p.w)));
      const sy = snapAxis(Math.min(1.05, Math.max(-0.05, o.y + (p.y - prev.y) / p.h)));
      setGuide({ v: sx.hit, h: sy.hit });
      update(o.id, { x: sx.v, y: sy.v });
    } else if (g.pointers.size === 2) {
      const [a, b] = Array.from(g.pointers.values());
      const dist = Math.hypot(b.x - a.x, b.y - a.y);
      const ang = Math.atan2(b.y - a.y, b.x - a.x);
      update(o.id, {
        scale: Math.min(6, Math.max(0.25, g.start.scale * (dist / (g.start.dist || 1)))),
        rotation: g.start.rotation + (ang - g.start.ang),
      });
    }
  }

  function onOverlayUp(e: React.PointerEvent) {
    const g = gesture.current;
    if (!g) return;
    g.pointers.delete(e.pointerId);
    if (g.pointers.size === 0) {
      gesture.current = null;
      recordGestureEnd();
    }
  }

  // Corner handle: drag to scale + rotate (desktop-friendly pinch stand-in).
  const handleStart = useRef<{ id: string; dist: number; ang: number; scale: number; rotation: number } | null>(null);
  function onHandleDown(e: React.PointerEvent, o: Overlay) {
    e.stopPropagation();
    beginGesture();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + o.x * r.width;
    const cy = r.top + o.y * r.height;
    handleStart.current = {
      id: o.id,
      dist: Math.hypot(e.clientX - cx, e.clientY - cy) || 1,
      ang: Math.atan2(e.clientY - cy, e.clientX - cx),
      scale: o.scale,
      rotation: o.rotation,
    };
  }
  function onHandleMove(e: React.PointerEvent, o: Overlay) {
    const h = handleStart.current;
    if (!h || h.id !== o.id) return;
    const r = frameRef.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + o.x * r.width;
    const cy = r.top + o.y * r.height;
    const dist = Math.hypot(e.clientX - cx, e.clientY - cy);
    const ang = Math.atan2(e.clientY - cy, e.clientX - cx);
    gestureMoved.current = true;
    update(o.id, {
      scale: Math.min(6, Math.max(0.25, h.scale * (dist / h.dist))),
      rotation: h.rotation + (ang - h.ang),
    });
  }

  // ---- export ----
  async function doExport(mode: "share" | "save" | "tiktok" | "channel") {
    setErr(null);
    setExporting({ pct: 0, mode });
    videoRef.current?.pause();
    stopAudition();
    try {
      const file = await brandClip({
        url: clipUrl, slug,
        overlays: overlays.filter((o) => o.text.trim() || o.kind !== "text"),
        trim: trimmed && trim ? trim : null,
        captions: capsOn && caps?.length ? caps : null,
        captionStyle: capStyle,
        captionAccent: capAccent,
        music,
        onProgress: (pct) => setExporting({ pct, mode }),
      });
      if (mode === "tiktok") {
        // Uploads the render + pushes it to the pro's TikTok drafts; the caller
        // shows the success/failure note. Keep the modal open until it's done.
        setExporting({ pct: 100, mode });
        await onSendTikTok?.(file);
        onClose();
      } else if (mode === "channel") {
        // Uploads the render + replaces the edited clip on the channel, tagging
        // it with what this edit did (feeds the conversion feedback loop).
        setExporting({ pct: 100, mode });
        const recipe: EditRecipe = {
          captions: capsOn && !!caps?.length,
          captionStyle: capsOn && caps?.length ? capStyle : null,
          music: !!music,
          qr: overlays.some((o) => o.kind === "qr"),
          logo: overlays.some((o) => o.kind === "logo"),
          hooks: overlays.filter((o) => o.kind === "text" && o.text.trim()).length,
          stickers: overlays.filter((o) => o.kind === "sticker").map((o) => o.sticker || "").filter(Boolean),
          trimmed,
          aiDirected: usedMagic,
        };
        await onSaveToChannel?.(file, recipe);
        onClose();
      } else if (mode === "share") {
        onShare(file);
      } else {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(file);
        a.download = file.name;
        a.click();
        URL.revokeObjectURL(a.href);
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Rendering failed — try again.");
    } finally {
      setExporting(null);
      videoRef.current?.play().catch(() => {});
    }
  }

  // ---- per-overlay DOM styles (same constants as the canvas renderer). Split
  // into a position wrapper and an animated visual inner so CSS animations
  // don't fight the drag/rotate transform. ----
  function posStyle(o: Overlay): React.CSSProperties {
    return {
      position: "absolute",
      left: `${o.x * 100}%`,
      top: `${o.y * 100}%`,
      transform: `translate(-50%, -50%) rotate(${o.rotation}rad)`,
      touchAction: "none",
      userSelect: "none",
      cursor: "grab",
    };
  }

  function visualStyle(o: Overlay): React.CSSProperties {
    const base: React.CSSProperties = {
      display: "inline-block",
      whiteSpace: "pre",
      textAlign: "center",
      lineHeight: 1.25,
      animation: ANIM_CSS[o.anim || "none"] || undefined,
    };
    if (o.kind === "emoji") {
      return { ...base, fontSize: EMOJI_BASE * o.scale * k };
    }
    if (o.kind === "qr" || o.kind === "logo" || o.kind === "review") {
      // The card/image is rendered in the overlay map; keep the wrapper plain
      // so the CSS entrance animation still applies.
      return base;
    }
    if (o.kind === "sticker") {
      const c = STICKER_CHROME[o.sticker || "book"];
      const size = STICKER_BASE * o.scale * k;
      return {
        ...base,
        fontSize: size,
        fontWeight: 800,
        fontFamily: FONTS.sans.family,
        background: c.bg,
        color: c.fg,
        padding: "0.45em 0.65em",
        borderRadius: 999,
        boxShadow: "0 2px 12px rgba(0,0,0,0.35)",
        ...(c.dashed ? { outline: `${Math.max(1.5, size * 0.07)}px dashed ${c.fg}`, outlineOffset: -Math.max(3, size * 0.22) } : {}),
      };
    }
    const f = FONTS[o.font];
    const size = TEXT_BASE * o.scale * k;
    const style: React.CSSProperties = {
      ...base,
      fontSize: size,
      fontWeight: f.weight,
      fontFamily: f.family,
    };
    if (o.style === "pill") {
      style.background = o.color;
      style.color = pillText(o.color);
      style.padding = `${(18 / 56) * size}px ${(30 / 56) * size}px`;
      style.borderRadius = (22 / 56) * size;
    } else if (o.style === "outline") {
      style.color = o.color;
      style.WebkitTextStroke = `${size * 0.07}px ${o.color === "#0a0a0c" ? "#ffffff" : "#0a0a0c"}`;
    } else {
      style.color = o.color;
      style.textShadow = "0 2px 10px rgba(0,0,0,0.55)";
    }
    return style;
  }

  const chip = "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors";

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black">
      <style>{ANIM_KEYFRAMES}</style>
      {/* top bar */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1.5 px-3 py-2.5">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onClose} aria-label="Close studio" className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
            <X className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"
          >
            <Undo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 disabled:opacity-30"
          >
            <Redo2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setSnap((s) => !s)}
            aria-label={snap ? "Snapping on" : "Snapping off"}
            className={`rounded-full p-2 ${snap ? "bg-accent-500 text-white" : "bg-white/10 text-white/60"} hover:opacity-90`}
          >
            <Magnet className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-2 gap-y-1.5">
          {onAutoDirect && (
            <button
              type="button"
              onClick={runMagic}
              disabled={magicBusy || !!exporting}
              className={`${chip} inline-flex items-center gap-1.5 bg-gradient-to-r from-accent-500 to-fuchsia-500 text-white shadow-sm disabled:opacity-60`}
            >
              <Wand2 className="h-3.5 w-3.5" />
              {magicBusy ? "Directing…" : "Magic edit"}
              {!magicBusy && magicAllowance && (
                <span className="rounded-full bg-white/25 px-1.5 text-[10px] font-bold">{magicAllowance}</span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? "Pause preview" : "Play preview"}
            className={`${chip} inline-flex items-center gap-1.5 bg-white/10 text-white`}
          >
            {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            {playing ? "Pause" : "Play"}
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "trim" ? "none" : "trim")}
            className={`${chip} inline-flex items-center gap-1.5 ${panel === "trim" || trimmed ? "bg-white text-black" : "bg-white/10 text-white"}`}
          >
            <Scissors className="h-3.5 w-3.5" /> {trimmed ? `${(effDur).toFixed(0)}s` : "Trim"}
          </button>
        </div>
      </div>

      {/* stage */}
      <div className="relative flex min-h-0 flex-1 items-center justify-center" onPointerDown={() => setSelectedId(null)}>
        <div
          ref={frameRef}
          className="relative max-h-full overflow-hidden rounded-xl bg-ink-900"
          style={{ aspectRatio: `${aspect}`, maxWidth: "100%", height: "100%" }}
        >
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            ref={videoRef}
            src={clipUrl}
            muted
            loop
            playsInline
            autoPlay
            crossOrigin="anonymous"
            className="h-full w-full object-cover"
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              if (v.videoWidth && v.videoHeight) setAspect(v.videoWidth / v.videoHeight);
              setDur(v.duration || 0);
              setTrim((cur) => cur ?? { start: 0, end: v.duration || 0 });
            }}
            onTimeUpdate={onTimeUpdate}
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />

          {capsOn && caps && (() => {
            const seg = activeSegment(caps, t);
            if (!seg) return null;
            const hasWords = segmentHasWords(seg);
            const wrap = "pointer-events-none absolute left-1/2 z-[1] w-[86%] -translate-x-1/2 -translate-y-1/2 text-center";
            // word pop: one big accent word at a time.
            if (capStyle === "wordpop" && hasWords) {
              const word = seg.words![Math.max(0, activeWordIndex(seg, t))]?.text || "";
              return (
                <div className={wrap} style={{ top: `calc(100% - ${CAPTION_Y * k}px)` }}>
                  <span
                    className="rounded-xl px-3 py-1 font-extrabold"
                    style={{ background: capAccent, color: pillText(capAccent), fontSize: CAPTION_SIZE * 1.7 * k, lineHeight: 1.2 }}
                  >
                    {word}
                  </span>
                </div>
              );
            }
            // karaoke: full line, active word lit in the accent.
            if (capStyle === "karaoke" && hasWords) {
              const active = activeWordIndex(seg, t);
              return (
                <div className={wrap} style={{ top: `calc(100% - ${CAPTION_Y * k}px)` }}>
                  <span
                    className="box-decoration-clone rounded-lg bg-black/60 px-2 py-0.5 font-extrabold"
                    style={{ fontSize: CAPTION_SIZE * k, lineHeight: 1.5, WebkitBoxDecorationBreak: "clone" }}
                  >
                    {seg.words!.map((w, i) => (
                      <span key={i} style={{ color: i === active ? capAccent : "#ffffff" }}>
                        {w.text}
                        {i < seg.words!.length - 1 ? " " : ""}
                      </span>
                    ))}
                  </span>
                </div>
              );
            }
            // clean (and fallback when a clip has no word timing).
            return (
              <div className={wrap} style={{ top: `calc(100% - ${CAPTION_Y * k}px)` }}>
                <span
                  className="box-decoration-clone rounded-lg bg-black/65 px-2 py-0.5 font-extrabold text-white"
                  style={{ fontSize: CAPTION_SIZE * k, lineHeight: 1.35, WebkitBoxDecorationBreak: "clone" }}
                >
                  {seg.text}
                </span>
              </div>
            );
          })()}

          {/* snap guides — shown while a drag is snapped to the frame center */}
          {guide.v && <span className="pointer-events-none absolute inset-y-0 left-1/2 z-[2] w-px -translate-x-1/2 bg-accent-400/80" />}
          {guide.h && <span className="pointer-events-none absolute inset-x-0 top-1/2 z-[2] h-px -translate-y-1/2 bg-accent-400/80" />}

          {overlays.map((o) => {
            const visible = overlayVisible(o, t - trimStart, effDur);
            const isSel = o.id === selectedId;
            return (
              <div
                key={o.id}
                role="button"
                tabIndex={0}
                style={{ ...posStyle(o), opacity: visible ? 1 : 0.25 }}
                onPointerDown={(e) => onOverlayDown(e, o)}
                onPointerMove={(e) => onOverlayMove(e, o)}
                onPointerUp={onOverlayUp}
                onPointerCancel={onOverlayUp}
                onDoubleClick={() => {
                  if (o.kind === "text" || o.sticker === "promo" || o.sticker === "urgency") {
                    setEditingId(o.id);
                    setDraft(o.text);
                  }
                }}
              >
                {/* Keyed on visibility so entrance anims (pop) replay when the
                    intro/outro timing window opens, matching the export. */}
                <span key={visible ? "on" : "off"} style={visualStyle(o)}>
                  {o.kind === "review" ? (
                    (() => {
                      const cardW = REVIEW_BASE * o.scale * k;
                      const pad = cardW * 0.06;
                      const stars = Math.max(1, Math.min(5, Math.round(o.stars || 5)));
                      return (
                        <span
                          className="flex flex-col gap-1 bg-white text-left"
                          style={{ width: cardW, padding: pad, borderRadius: cardW * 0.06, boxShadow: "0 2px 16px rgba(0,0,0,0.32)" }}
                        >
                          <span style={{ fontSize: cardW * 0.07, lineHeight: 1, letterSpacing: cardW * 0.004 }}>
                            <span style={{ color: "#fbbf24" }}>{"★".repeat(stars)}</span>
                            <span style={{ color: "#e5e7eb" }}>{"★".repeat(5 - stars)}</span>
                          </span>
                          <span
                            className="italic"
                            style={{ fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: 600, color: "#0a0a0c", fontSize: cardW * 0.062, lineHeight: 1.32 }}
                          >
                            {`“${o.text}”`}
                          </span>
                          <span style={{ fontWeight: 700, color: "#6b7280", fontSize: cardW * 0.05 }}>— {o.by}</span>
                        </span>
                      );
                    })()
                  ) : o.kind === "logo" ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={o.text}
                      alt="Logo"
                      style={{ width: LOGO_BASE * o.scale * k, height: "auto", display: "block", filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.3))" }}
                      draggable={false}
                    />
                  ) : o.kind === "qr" ? (
                    (() => {
                      const cardW = QR_BASE * o.scale * k;
                      const pad = cardW * 0.09;
                      const labelH = cardW * 0.15;
                      const qrSize = cardW - pad * 2;
                      return (
                        <span
                          className="flex flex-col items-center bg-white"
                          style={{ width: cardW, padding: pad, paddingBottom: 0, borderRadius: cardW * 0.09, boxShadow: "0 2px 14px rgba(0,0,0,0.35)" }}
                        >
                          {qrDataUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={qrDataUrl} alt="Booking QR" width={qrSize} height={qrSize} style={{ display: "block", imageRendering: "pixelated" }} draggable={false} />
                          ) : (
                            <span style={{ width: qrSize, height: qrSize }} />
                          )}
                          <span
                            className="font-extrabold text-ink-900"
                            style={{ fontSize: labelH * 0.52, lineHeight: 1, paddingTop: labelH * 0.28, paddingBottom: labelH * 0.34 }}
                          >
                            SCAN TO BOOK
                          </span>
                        </span>
                      );
                    })()
                  ) : o.kind === "text" && !o.text.trim() ? (
                    <span className="opacity-50">Tap to type</span>
                  ) : (
                    o.text
                  )}
                </span>
                {isSel && (
                  <>
                    <span className="pointer-events-none absolute -inset-2 rounded-lg border-2 border-dashed border-white/80" />
                    <button
                      type="button"
                      aria-label="Delete"
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => { e.stopPropagation(); remove(o.id); }}
                      className="absolute -left-4 -top-4 rounded-full bg-black/80 p-1.5 text-white"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {(o.kind === "text" || o.sticker === "promo" || o.sticker === "urgency") && (
                      <button
                        type="button"
                        aria-label="Edit text"
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => { e.stopPropagation(); setEditingId(o.id); setDraft(o.text); }}
                        className="absolute -right-4 -top-4 rounded-full bg-black/80 p-1.5 text-white"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <span
                      role="button"
                      aria-label="Resize and rotate"
                      onPointerDown={(e) => onHandleDown(e, o)}
                      onPointerMove={(e) => onHandleMove(e, o)}
                      onPointerUp={() => { handleStart.current = null; recordGestureEnd(); }}
                      className="absolute -bottom-4 -right-4 cursor-nwse-resize rounded-full bg-white p-1.5 text-black shadow"
                      style={{ touchAction: "none" }}
                    >
                      <RotateCw className="h-3.5 w-3.5" />
                    </span>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* selected-overlay options */}
      {selected && (
        <div className="flex flex-wrap items-center justify-center gap-2 px-3 py-2">
          {selected.kind === "text" && (
            <>
              <button
                type="button"
                onClick={() => commitUpdate(selected.id, { style: STYLES[(STYLES.indexOf(selected.style) + 1) % STYLES.length] })}
                className={`${chip} bg-white/10 text-white`}
              >
                Style: {selected.style}
              </button>
              <button
                type="button"
                onClick={() => commitUpdate(selected.id, { font: FONT_KEYS[(FONT_KEYS.indexOf(selected.font) + 1) % FONT_KEYS.length] })}
                className={`${chip} bg-white/10 text-white`}
              >
                {FONTS[selected.font].label}
              </button>
              <span className="flex items-center gap-1.5">
                {textColorRow.map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c}`}
                    onClick={() => commitUpdate(selected.id, { color: c })}
                    className={`relative h-6 w-6 rounded-full border-2 ${selected.color === c ? "border-white" : "border-white/25"}`}
                    style={{ background: c }}
                  >
                    {brandColors.includes(c) && i < brandColors.length && (
                      <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-accent-400 ring-1 ring-black/40" />
                    )}
                  </button>
                ))}
              </span>
            </>
          )}
          <span className="flex items-center gap-1">
            {TIMINGS.map((tm) => (
              <button
                key={tm.key}
                type="button"
                onClick={() => commitUpdate(selected.id, { timing: tm.key })}
                className={`${chip} ${selected.timing === tm.key ? "bg-white text-black" : "bg-white/10 text-white/80"}`}
              >
                {tm.label}
              </button>
            ))}
          </span>
          <span className="flex w-full flex-wrap items-center justify-center gap-1">
            {ANIMS.map((a) => (
              <button
                key={a.key}
                type="button"
                onClick={() => commitUpdate(selected.id, { anim: a.key })}
                className={`${chip} ${(selected.anim || "none") === a.key ? "bg-accent-500 text-white" : "bg-white/10 text-white/70"}`}
              >
                {a.label}
              </button>
            ))}
          </span>
        </div>
      )}

      {/* trim panel */}
      {panel === "trim" && trim && dur > 0 && (
        <div className="px-5 py-2">
          <div className="flex items-center justify-between text-xs font-semibold text-white/80">
            <span>Start {trim.start.toFixed(1)}s</span>
            <span>End {trim.end.toFixed(1)}s</span>
          </div>
          <input
            type="range" min={0} max={dur} step={0.1} value={trim.start}
            onChange={(e) => {
              const v = Math.min(Number(e.target.value), trim.end - 1);
              setTrim({ ...trim, start: v });
              if (videoRef.current) videoRef.current.currentTime = v;
            }}
            className="w-full accent-accent-500"
          />
          <input
            type="range" min={0} max={dur} step={0.1} value={trim.end}
            onChange={(e) => setTrim({ ...trim, end: Math.max(Number(e.target.value), trim.start + 1) })}
            className="w-full accent-accent-500"
          />
        </div>
      )}

      {/* emoji panel */}
      {panel === "emoji" && (
        <div className="max-h-56 overflow-y-auto px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
            For {category.toLowerCase()} — added animated
          </p>
          <div className="mt-1 flex gap-1">
            {categoryEmojis(category).map((e) => (
              <button key={`cat-${e}`} type="button" onClick={() => addEmoji(e, "pulse")} className="rounded-lg bg-accent-500/15 p-1.5 text-2xl hover:bg-accent-500/30">
                {e}
              </button>
            ))}
          </div>
          <div className="mt-2 grid grid-cols-8 gap-1">
            {EMOJIS.map((e) => (
              <button key={e} type="button" onClick={() => addEmoji(e)} className="rounded-lg p-1.5 text-2xl hover:bg-white/10">
                {e}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* hooks panel — one-tap scroll-stopper lines */}
      {panel === "hooks" && (
        <div className="max-h-56 space-y-1.5 overflow-y-auto px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
            Hooks — lines that stop the scroll. Tap to add, then drag into place.
          </p>
          {hookLines(category).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => addText(h, "pop")}
              className="block w-full rounded-xl bg-white/[0.06] px-3 py-2 text-left text-sm font-bold text-white hover:bg-white/10"
            >
              {h}
            </button>
          ))}
        </div>
      )}

      {/* reviews panel */}
      {panel === "reviews" && (
        <div className="max-h-56 space-y-1.5 overflow-y-auto px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
            Your real reviews — tap to add as a testimonial
          </p>
          {reviews && reviews.length === 0 && (
            <p className="rounded-xl bg-white/[0.04] px-3 py-2 text-xs text-white/50">
              Your published 4★+ reviews show up here as one-tap testimonials once you have some.
            </p>
          )}
          {reviews?.map((rv) => (
            <button
              key={rv.id}
              type="button"
              onClick={() => addReview(rv.quote, rv.stars, rv.author)}
              className="flex w-full items-start gap-2 rounded-lg bg-white/[0.06] px-3 py-2 text-left hover:bg-white/10"
            >
              <span className="shrink-0 text-xs text-amber-400">{"★".repeat(Math.min(5, rv.stars))}</span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-sm text-white">“{rv.quote}”</span>
                <span className="text-xs text-white/50">— {rv.author}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* sticker panel */}
      {panel === "sticker" && (
        <div className="max-h-56 space-y-2 overflow-y-auto px-4 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
            Rating · price · offer · promos — tap to add
          </p>
          {stickerMenu.map((s) => (
            <button
              key={s.kind}
              type="button"
              onClick={() => addSticker(s.kind, s.text)}
              className="flex w-full items-center justify-between gap-3 rounded-xl bg-white/[0.06] px-3 py-2 text-left hover:bg-white/10"
            >
              <span
                className="rounded-full px-3 py-1 text-sm font-extrabold"
                style={{ background: STICKER_CHROME[s.kind].bg, color: STICKER_CHROME[s.kind].fg }}
              >
                {s.text}
              </span>
              <span className="shrink-0 text-xs text-white/60">{s.note}</span>
            </button>
          ))}
        </div>
      )}

      {/* captions style panel */}
      {panel === "captions" && caps?.length && (
        <div className="max-h-56 space-y-3 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">Captions</p>
            <button
              type="button"
              onClick={() => setCapsOn((v) => !v)}
              className={`${chip} ${capsOn ? "bg-accent-500 text-white" : "bg-white/10 text-white/70"}`}
            >
              {capsOn ? "On" : "Off"}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {CAPTION_STYLES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => { setCapStyle(s.key); setCapsOn(true); }}
                className={`${chip} ${capStyle === s.key ? "bg-white text-black" : "bg-white/10 text-white/80"}`}
              >
                {s.label}
              </button>
            ))}
          </div>
          {(capStyle === "karaoke" || capStyle === "wordpop") && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-white/60">Highlight</span>
              {accentRow.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Accent ${c}`}
                  onClick={() => setCapAccent(c)}
                  className={`h-6 w-6 rounded-full border-2 ${capAccent === c ? "border-white" : "border-white/25"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          )}
          {(capStyle === "karaoke" || capStyle === "wordpop") && !capsHaveWords && (
            <div className="flex items-center justify-between gap-2 rounded-lg bg-white/[0.06] px-3 py-2">
              <span className="text-xs text-white/60">
                This clip’s captions have no word timing — showing the clean look.
              </span>
              <button
                type="button"
                onClick={reCaption}
                disabled={capsBusy}
                className="shrink-0 rounded-full bg-accent-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
              >
                {capsBusy ? "Listening…" : "Re-caption"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* music panel */}
      {panel === "music" && (
        <div className="max-h-64 space-y-1.5 overflow-y-auto px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
            Soundtrack — mixed under your clip on export
          </p>
          {STUDIO_TRACKS.map((tr) => {
            const selected = music?.src === tr.src;
            return (
              <div
                key={tr.id}
                className={`flex items-center gap-3 rounded-xl px-3 py-2 ${selected ? "bg-accent-500/15 ring-1 ring-accent-500/40" : "bg-white/[0.06]"}`}
              >
                <button
                  type="button"
                  aria-label={auditioning === tr.id ? "Stop preview" : "Preview track"}
                  onClick={() => toggleAudition(tr.id, tr.src)}
                  className="shrink-0 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
                >
                  {auditioning === tr.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </button>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{tr.label}</span>
                  <span className="block truncate text-xs text-white/50">{tr.mood}</span>
                </span>
                <button
                  type="button"
                  onClick={() => pickTrack(tr.id, tr.label, tr.src)}
                  className={`${chip} shrink-0 ${selected ? "bg-white text-black" : "bg-white/10 text-white"}`}
                >
                  {selected ? "Selected" : "Use"}
                </button>
              </div>
            );
          })}

          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/[0.06] px-3 py-2 text-sm font-semibold text-white hover:bg-white/10">
            <Upload className="h-4 w-4 text-accent-300" /> Upload your own track
            <input type="file" accept="audio/*" className="hidden" onChange={onUploadTrack} />
          </label>

          {music && (
            <div className="space-y-2 rounded-xl bg-white/[0.06] px-3 py-3">
              <div className="flex items-center justify-between">
                <span className="truncate text-sm font-semibold text-white">♪ {music.label}</span>
                <button
                  type="button"
                  onClick={() => { stopAudition(); setMusic(null); }}
                  className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-white/20"
                >
                  Remove
                </button>
              </div>
              <label className="flex items-center gap-2 text-xs text-white/70">
                <span className="w-14 shrink-0">Volume</span>
                <input
                  type="range" min={0} max={1} step={0.05} value={music.volume}
                  onChange={(e) => setMusic({ ...music, volume: Number(e.target.value) })}
                  className="w-full accent-accent-500"
                />
                <span className="w-8 shrink-0 text-right tabular-nums">{Math.round(music.volume * 100)}%</span>
              </label>
              <button
                type="button"
                onClick={() => setMusic({ ...music, muteOriginal: !music.muteOriginal })}
                className={`${chip} ${music.muteOriginal ? "bg-accent-500 text-white" : "bg-white/10 text-white/70"}`}
              >
                {music.muteOriginal ? "Original audio muted" : "Keep original audio"}
              </button>
            </div>
          )}
          <p className="pt-1 text-[11px] leading-snug text-white/40">
            Preview plays here; the track is baked into the video when you export.
          </p>
        </div>
      )}

      {/* looks panel — one-tap restyle of every text overlay + captions */}
      {panel === "looks" && (
        <div className="max-h-56 space-y-2 overflow-y-auto px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
            Looks — restyle all your text + captions in one tap
          </p>
          <div className="grid grid-cols-2 gap-2">
            {LOOKS.map((l) => (
              <button
                key={l.key}
                type="button"
                onClick={() => applyLook(l.key)}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/[0.06] px-3 py-2.5 text-left hover:bg-white/10"
              >
                <span
                  className="rounded-md px-2 py-1 text-sm font-extrabold"
                  style={{
                    fontFamily: FONTS[l.font].family,
                    ...(l.textStyle === "pill"
                      ? { background: l.color, color: pillText(l.color) }
                      : l.textStyle === "outline"
                      ? { color: l.color, WebkitTextStroke: `1px ${l.color === "#0a0a0c" ? "#fff" : "#0a0a0c"}` }
                      : { color: l.color }),
                  }}
                >
                  {l.label}
                </span>
                <span className="h-4 w-4 shrink-0 rounded-full" style={{ background: l.accent }} />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* brand kit panel — the pro's colors/font/logo, remembered across clips */}
      {panel === "brand" && (
        <div className="max-h-64 space-y-3 overflow-y-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">Your brand kit</p>
            <button
              type="button"
              onClick={() => saveBrand()}
              disabled={kitSaving}
              className={`${chip} bg-white/10 text-white disabled:opacity-60`}
            >
              {kitSaving ? "Saving…" : "Save kit"}
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <label className="flex items-center gap-2 text-xs text-white/70">
              <span className="w-14">Primary</span>
              <input
                type="color"
                value={kit.primary || "#ffffff"}
                onChange={(e) => saveBrand({ ...kit, primary: e.target.value })}
                className="h-7 w-9 cursor-pointer rounded border border-white/20 bg-transparent p-0"
              />
            </label>
            <label className="flex items-center gap-2 text-xs text-white/70">
              <span className="w-14">Accent</span>
              <input
                type="color"
                value={kit.accent || "#a78bfa"}
                onChange={(e) => saveBrand({ ...kit, accent: e.target.value })}
                className="h-7 w-9 cursor-pointer rounded border border-white/20 bg-transparent p-0"
              />
            </label>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-1 text-xs text-white/60">Font</span>
            {FONT_KEYS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => saveBrand({ ...kit, font: f })}
                className={`${chip} ${kit.font === f ? "bg-white text-black" : "bg-white/10 text-white/80"}`}
                style={{ fontFamily: FONTS[f].family }}
              >
                {FONTS[f].label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {kit.logoUrl ? (
              <span className="flex items-center gap-2 rounded-lg bg-white/10 p-1.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={kit.logoUrl} alt="Logo" className="h-8 w-auto max-w-[96px] object-contain" />
              </span>
            ) : (
              <span className="text-xs text-white/50">No logo yet</span>
            )}
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20">
              <ImagePlus className="h-3.5 w-3.5" /> {logoBusy ? "Uploading…" : kit.logoUrl ? "Replace" : "Upload logo"}
              <input type="file" accept="image/*" className="hidden" onChange={onLogoFile} disabled={logoBusy} />
            </label>
            {kit.logoUrl && (
              <button
                type="button"
                onClick={() => addLogo(kit.logoUrl!)}
                className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/20"
              >
                Add to clip
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={applyBrand}
            className="w-full rounded-full bg-gradient-to-r from-accent-500 to-fuchsia-500 px-4 py-2.5 text-sm font-bold text-white"
          >
            Apply my brand to this clip
          </button>
          <p className="text-[11px] leading-snug text-white/40">
            Restyles your text + captions in your colors and font, and drops your logo on the clip.
          </p>
        </div>
      )}

      {/* layers panel — reorder, duplicate, delete every overlay */}
      {panel === "layers" && (
        <div className="max-h-56 space-y-1.5 overflow-y-auto px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
            Layers — top of the list sits in front
          </p>
          {overlays.length === 0 && <p className="py-2 text-sm text-white/50">Nothing on the clip yet.</p>}
          {overlays
            .map((o, i) => ({ o, i }))
            .reverse()
            .map(({ o, i }) => {
              const label =
                o.kind === "emoji"
                  ? o.text
                  : o.kind === "qr"
                  ? "Booking QR"
                  : o.kind === "logo"
                  ? "Logo"
                  : o.kind === "review"
                  ? "Review"
                  : o.kind === "sticker"
                  ? (o.sticker || "sticker").replace(/^\w/, (c) => c.toUpperCase())
                  : o.text.trim() || "Text";
              const isSel = o.id === selectedId;
              return (
                <div
                  key={o.id}
                  className={`flex items-center gap-2 rounded-xl px-2.5 py-1.5 ${isSel ? "bg-accent-500/15 ring-1 ring-accent-500/40" : "bg-white/[0.06]"}`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedId(o.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="leading-none text-mist-300">
                      {o.kind === "emoji" ? <Smile size={16} />
                        : o.kind === "qr" ? <QrCode size={16} />
                        : o.kind === "logo" ? <ImageIcon size={16} />
                        : o.kind === "review" ? <Star size={16} />
                        : o.kind === "sticker" ? <Tag size={16} />
                        : <Type size={16} />}
                    </span>
                    <span className="truncate text-sm font-medium text-white">{label}</span>
                  </button>
                  <button
                    type="button"
                    aria-label="Bring forward"
                    onClick={() => reorder(o.id, 1)}
                    disabled={i === overlays.length - 1}
                    className="rounded-md bg-white/10 p-1 text-white/80 hover:bg-white/20 disabled:opacity-30"
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Send back"
                    onClick={() => reorder(o.id, -1)}
                    disabled={i === 0}
                    className="rounded-md bg-white/10 p-1 text-white/80 hover:bg-white/20 disabled:opacity-30"
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Duplicate"
                    onClick={() => duplicate(o.id)}
                    className="rounded-md bg-white/10 p-1 text-white/80 hover:bg-white/20"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Delete layer"
                    onClick={() => remove(o.id)}
                    className="rounded-md bg-white/10 p-1 text-red-300 hover:bg-white/20"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
        </div>
      )}

      {/* bottom bar */}
      <div className="flex flex-col gap-2.5 px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:items-center sm:justify-between sm:gap-2">
        <div className="flex items-center gap-2 overflow-x-auto [&>button]:shrink-0">
          <button type="button" onClick={() => addText()} className="flex flex-col items-center gap-0.5 rounded-xl bg-white/10 px-3 py-2 text-white hover:bg-white/20">
            <Type className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Text</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "looks" ? "none" : "looks")}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${panel === "looks" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Palette className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Looks</span>
          </button>
          {onSaveBrand && (
            <button
              type="button"
              onClick={() => setPanel(panel === "brand" ? "none" : "brand")}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${panel === "brand" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
            >
              <SwatchBook className="h-5 w-5" />
              <span className="text-[10px] font-semibold">Brand</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setPanel(panel === "hooks" ? "none" : "hooks")}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${panel === "hooks" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Zap className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Hooks</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "emoji" ? "none" : "emoji")}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${panel === "emoji" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Smile className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Emoji</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "sticker" ? "none" : "sticker")}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${panel === "sticker" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Stickers</span>
          </button>
          <button
            type="button"
            onClick={addQr}
            className="flex flex-col items-center gap-0.5 rounded-xl bg-white/10 px-3 py-2 text-white hover:bg-white/20"
          >
            <QrCode className="h-5 w-5" />
            <span className="text-[10px] font-semibold">QR</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "reviews" ? "none" : "reviews")}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${panel === "reviews" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Quote className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Reviews</span>
          </button>
          <button
            type="button"
            onClick={captionsButton}
            disabled={capsBusy}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${panel === "captions" ? "bg-white text-black" : capsOn ? "bg-accent-500 text-white" : "bg-white/10 text-white hover:bg-white/20"} disabled:opacity-60`}
          >
            <Subtitles className="h-5 w-5" />
            <span className="text-[10px] font-semibold">{capsBusy ? "Listening…" : "Captions"}</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "music" ? "none" : "music")}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${panel === "music" ? "bg-white text-black" : music ? "bg-accent-500 text-white" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Music className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Music</span>
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "layers" ? "none" : "layers")}
            className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 ${panel === "layers" ? "bg-white text-black" : "bg-white/10 text-white hover:bg-white/20"}`}
          >
            <Layers className="h-5 w-5" />
            <span className="text-[10px] font-semibold">Layers</span>
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          {onSaveToChannel && (
            <button
              type="button"
              onClick={() => doExport("channel")}
              disabled={!!exporting}
              className="col-span-2 inline-flex items-center justify-center gap-1.5 rounded-full bg-accent-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-400 disabled:opacity-50 sm:col-span-1"
            >
              <Check className="h-4 w-4" /> Save to channel
            </button>
          )}
          <button
            type="button"
            onClick={() => doExport("share")}
            disabled={!!exporting}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            <Share2 className="h-4 w-4" /> Share
          </button>
          <button
            type="button"
            onClick={() => doExport("save")}
            disabled={!!exporting}
            className="inline-flex items-center justify-center gap-1.5 rounded-full bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/20 disabled:opacity-50"
          >
            <Download className="h-4 w-4" /> Download
          </button>
        </div>
      </div>

      {err && <p className="px-4 pb-2 text-center text-xs font-medium text-red-400">{err}</p>}
      {magicNote && !err && (
        <p className="inline-flex items-center justify-center gap-1.5 px-4 pb-2 text-center text-xs font-medium text-accent-300">
          <Wand2 className="h-3.5 w-3.5" /> {magicNote}
        </p>
      )}

      {/* out-of-credits sheet */}
      {needCredits && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-black/85 p-8 text-center">
          <span className="rounded-full bg-gradient-to-r from-accent-500 to-fuchsia-500 p-3">
            <Wand2 className="h-6 w-6 text-white" />
          </span>
          <p className="text-base font-bold text-white">You’re out of Magic edits</p>
          <p className="max-w-xs text-sm text-white/70">
            You get {creditInfo ? "" : "a few "}free AI edits every month. Grab a credit pack to keep the
            AI directing your clips — 20 edits for $5.
          </p>
          <div className="mt-1 flex gap-3">
            <button
              type="button"
              onClick={() => setNeedCredits(false)}
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white"
            >
              Not now
            </button>
            {onBuyCredits && (
              <button
                type="button"
                onClick={() => { setNeedCredits(false); onBuyCredits(); }}
                className="rounded-full bg-gradient-to-r from-accent-500 to-fuchsia-500 px-6 py-2 text-sm font-bold text-white"
              >
                Get 20 for $5
              </button>
            )}
          </div>
        </div>
      )}

      {/* text editor sheet */}
      {editing && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/80 p-6">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            placeholder="Type something…"
            className="w-full max-w-md rounded-xl border border-white/20 bg-ink-900 p-4 text-center text-xl font-bold text-white outline-none focus:border-accent-500"
          />
          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => { if (!editing.text.trim() && !draft.trim()) remove(editing.id); setEditingId(null); }}
              className="rounded-full bg-white/10 px-5 py-2 text-sm font-semibold text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const v = draft.trim();
                if (v) commitUpdate(editing.id, { text: v });
                else remove(editing.id);
                setEditingId(null);
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-accent-500 px-6 py-2 text-sm font-bold text-white"
            >
              <Check className="h-4 w-4" /> Done
            </button>
          </div>
        </div>
      )}

      {/* export progress */}
      {exporting && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/85 p-8">
          <p className="text-sm font-semibold text-white">
            {exporting.pct >= 100 && exporting.mode === "tiktok"
              ? "Sending to your TikTok drafts…"
              : exporting.pct >= 100 && exporting.mode === "channel"
              ? "Saving to your channel…"
              : `Rendering your video… ${exporting.pct}%`}
          </p>
          <div className="h-2 w-full max-w-xs overflow-hidden rounded-full bg-white/15">
            <div className="h-full rounded-full bg-accent-500 transition-all" style={{ width: `${exporting.pct}%` }} />
          </div>
          <p className="text-xs text-white/60">Renders in real time — a 30s clip takes about 30s. Keep this tab open.</p>
        </div>
      )}
    </div>
  );
}
