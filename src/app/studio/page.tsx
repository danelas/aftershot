'use client';

// The Studio surface: pick one of your rendered reels, edit it in the ported
// PeekScout editor (text, emojis, stickers, QR, music, trim, brand kit), then
// download/share it or save it back so auto-posting uses the edited version.
// Auth = the same upload token as the /u upload page: /studio?t=<token>
import {Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {Clapperboard, Download, Share2, TriangleAlert, Wand2, X} from 'lucide-react';
import VideoStudio from '@/components/VideoStudio';
import {uploadToStorage} from '@/lib/upload';
import type {AutoDirectResult, BrandKit} from '@/lib/studio';
import type {CaptionSegment} from '@/lib/captions';

type Clip = {
  id: string;
  url: string;
  createdAt: string;
  // 'rendering' and 'failed' have no url yet and render as placeholders.
  state: 'ready' | 'rendering' | 'failed';
  error?: string | null;
};
type Customer = {
  businessName: string; trade: string; serviceArea: string | null; phone: string | null;
  rating: number; reviewCount: number; priceFrom: string | null; brandKit: BrandKit | null;
};

const TRADE_LABELS: Record<string, string> = {
  pressure_washing: 'Pressure washing',
  detailing: 'Auto detailing',
  landscaping: 'Landscaping',
  painting: 'Painting',
  roof_cleaning: 'Roof cleaning',
  epoxy_floors: 'Epoxy floors',
  remodeling: 'Remodeling',
  junk_removal: 'Junk removal',
  cleaning: 'Cleaning',
  pool_care: 'Pool care',
  carpet_tile: 'Carpet & tile',
  window_cleaning: 'Window cleaning',
  other: 'Local services',
};

export default function Studio() {
  return (
    <Suspense>
      <StudioInner />
    </Suspense>
  );
}

function StudioInner() {
  const params = useSearchParams();
  const token = params.get('t') || '';
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  // Keyed by clip id, not array index: polling can prepend a new clip while
  // the editor is open, and an index would then point at a different reel.
  const [openId, setOpenId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  // A finished render waiting for the tap that opens the share sheet.
  const [ready, setReady] = useState<File | null>(null);

  useEffect(() => {
    if (!token) { setState('error'); return; }
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;

    const load = async () => {
      try {
        const r = await fetch(`/api/studio/clips?t=${encodeURIComponent(token)}`);
        if (!r.ok) throw new Error();
        const d = await r.json();
        if (stop) return;
        setCustomer(d.customer);
        setClips(d.clips);
        setState('ready');
        // Keep checking only while something is still rendering, so the
        // placeholder turns into the real reel without a manual refresh.
        if (d.clips.some((c: Clip) => c.state === 'rendering')) {
          timer = setTimeout(load, 15000);
        }
      } catch {
        if (!stop) setState('error');
      }
    };

    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [token]);

  async function saveToChannel(file: File, jobId: string) {
    setNote(null);
    const {url} = await uploadToStorage(file, 'video', token);
    const res = await fetch('/api/studio/save-clip', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token, jobId, newUrl: url}),
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(d.error || "Couldn't save. Try again.");
    setClips((cs) => cs.map((c) => (c.id === jobId ? {...c, url} : c)));
    setNote('Saved — this edited version now represents that job.');
  }

  async function saveBrand(kit: BrandKit) {
    setCustomer((c) => (c ? {...c, brandKit: kit} : c));
    await fetch('/api/studio/brand', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({token, brandKit: kit}),
    }).catch(() => {});
  }

  async function uploadLogo(file: File): Promise<string> {
    // Route through the account endpoint so one upload sets BOTH the Studio
    // watermark and customers.logo_url (the auto-posted reel's end card).
    // Uploading here used to touch only the Studio kit, so the logo silently
    // never appeared on the reels that post themselves.
    const fd = new FormData();
    fd.append('t', token);
    fd.append('logo', file);
    const res = await fetch('/api/account/logo', {method: 'POST', body: fd});
    const d = await res.json().catch(() => ({}));
    if (!res.ok || !d.logoUrl) throw new Error(d.error || "Couldn't save that logo.");
    return d.logoUrl;
  }

  // AI Auto-Director (Magic edit) — included with every plan, no credits.
  async function autoDirect(args: {captions: CaptionSegment[] | null; hasWords: boolean}): Promise<AutoDirectResult> {
    try {
      const res = await fetch('/api/studio/direct', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({token, captions: args.captions, hasWords: args.hasWords}),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || !d.ok) {
        return {
          ok: false,
          message: d.reason === 'not_configured' ? 'AI edits aren’t available right now.' : d.error || 'Couldn’t auto-edit — try again.',
        };
      }
      return {
        ok: true,
        overlays: d.overlays,
        captionStyle: d.captionStyle,
        music: d.music ?? null,
        rationale: d.rationale || '',
        freeRemaining: 999,
        credits: 0,
      };
    } catch {
      return {ok: false, message: 'Couldn’t auto-edit — try again.'};
    }
  }

  function save(file: File) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(file);
    a.download = file.name;
    a.click();
    URL.revokeObjectURL(a.href);
    setNote('Video downloaded — post it anywhere.');
  }

  // Two things used to send Share straight to a download.
  //
  // It sniffed the user agent for a phone, so desktop never even asked the
  // browser — but Chrome and Edge on Windows do have a native share sheet, and
  // that's where most people open Studio.
  //
  // And navigator.share() needs transient user activation. The click that
  // starts an export is long gone by the time brandClip finishes rendering
  // seconds later, so calling share() there throws NotAllowedError — which the
  // old .catch(() => {}) swallowed, leaving the button doing nothing at all.
  // So the render hands back a finished file and the user taps Share on it,
  // which is a fresh gesture the browser will honour.
  function deliver(file: File) {
    if (navigator.canShare?.({files: [file]})) setReady(file);
    else save(file);
  }

  async function shareReady() {
    if (!ready) return;
    try {
      await navigator.share({files: [ready]});
      setReady(null);
    } catch (e) {
      // Dismissing the sheet is a choice, not a failure — leave the card up so
      // they can try again. Anything else means the sheet never opened.
      if ((e as Error)?.name === 'AbortError') return;
      setReady(null);
      save(ready);
    }
  }

  if (state === 'loading') {
    return <main className="flex min-h-dvh items-center justify-center bg-ink-950 text-mist-300">Loading your Studio…</main>;
  }
  if (state === 'error' || !customer) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-2 bg-ink-950 px-6 text-center">
        <Clapperboard className="h-7 w-7 text-mist-400" />
        <p className="font-bold text-mist-100">Studio needs your personal link</p>
        <p className="max-w-sm text-sm text-mist-300">
          Open the Studio from your AfterShot upload page, or use the link we emailed you.
        </p>
      </main>
    );
  }

  const priceMin = customer.priceFrom ? Number(customer.priceFrom.replace(/[^0-9.]/g, '')) || null : null;
  // Resolved by id so a poll that reorders the list can't swap what's open.
  const openClip = openId ? clips.find((c) => c.id === openId && c.state === 'ready') ?? null : null;

  return (
    <main className="min-h-dvh bg-ink-950 px-5 py-8 text-mist-100">
      <div className="mx-auto max-w-3xl">
        <p className="flex items-center gap-2 text-xl font-extrabold">
          <Wand2 className="h-5 w-5 text-accent-400" /> Studio
        </p>
        <p className="mt-1 text-sm text-mist-300">
          {customer.businessName} — tap a reel and hit <b style={{color: 'var(--mist-100)'}}>Magic edit</b> to
          have AI direct it, or do it yourself: text, stickers, your live Google rating, a tap-to-call QR,
          music, and trim. Save it back and the edited version is what gets posted.
        </p>

        {clips.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-white/10 bg-ink-900 p-8 text-center">
            <Clapperboard className="mx-auto h-6 w-6 text-mist-400" />
            <p className="mt-2 font-semibold">No reels yet</p>
            <p className="mt-1 text-sm text-mist-300">
              Upload a before + after from your upload link — your first reel will show up here
              a few minutes later.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4">
            {clips.map((c, i) => {
              // A queued job has no video to play yet — show its state instead
              // of hiding it, so a just-created reel doesn't look like it failed.
              if (c.state !== 'ready') {
                const failed = c.state === 'failed';
                return (
                  <div key={c.id} className="text-left">
                    <span
                      className={`relative flex aspect-[9/16] flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-2 text-center ${
                        failed ? 'border-red-500/40 bg-red-500/5' : 'border-white/15 bg-ink-900'
                      }`}
                    >
                      {failed ? (
                        <>
                          <TriangleAlert size={18} className="text-red-300" />
                          <span className="text-[11px] font-semibold text-red-300">Didn&apos;t render</span>
                        </>
                      ) : (
                        <>
                          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-accent-400" />
                          <span className="text-[11px] font-semibold text-mist-300">Rendering…</span>
                          <span className="text-[10px] text-mist-400">a few minutes</span>
                        </>
                      )}
                    </span>
                    <span className="mt-1 block text-[11px] text-mist-400">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                );
              }
              return (
                <button key={c.id} type="button" onClick={() => setOpenId(c.id)} className="group text-left">
                  <span className="relative block aspect-[9/16] overflow-hidden rounded-xl bg-black ring-2 ring-transparent transition group-hover:ring-accent-500">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={`${c.url}#t=0.1`} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                      <span className="rounded-full bg-accent-500 px-3 py-1.5 text-[11px] font-bold text-white">Edit</span>
                    </span>
                  </span>
                  <span className="mt-1 block text-[11px] text-mist-400">
                    {new Date(c.createdAt).toLocaleDateString()}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {note && <p className="mt-4 text-sm font-medium text-accent-300">{note}</p>}
      </div>

      {ready && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-ink-900/95 px-5 py-4 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">Your reel is ready</p>
              <p className="truncate text-xs text-mist-300">
                Share it straight to Instagram, TikTok, or anywhere else on this device.
              </p>
            </div>
            <button
              type="button"
              onClick={() => { save(ready); setReady(null); }}
              className="flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-2 text-xs font-bold text-mist-200 hover:border-white/35"
            >
              <Download className="h-4 w-4" /> Save
            </button>
            <button
              type="button"
              onClick={shareReady}
              className="flex items-center gap-1.5 rounded-full bg-accent-500 px-4 py-2 text-xs font-bold text-white hover:brightness-110"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button
              type="button"
              onClick={() => setReady(null)}
              aria-label="Dismiss"
              className="rounded-full p-2 text-mist-400 hover:text-mist-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {openClip && (
        <VideoStudio
          clipUrl={openClip.url}
          slug={token}
          name={customer.businessName}
          category={TRADE_LABELS[customer.trade] || customer.trade}
          city={customer.serviceArea || ''}
          phone={customer.phone}
          rating={customer.rating}
          reviewCount={customer.reviewCount}
          priceMin={priceMin}
          introOffer={null}
          storedCaptions={null}
          brandKit={customer.brandKit}
          onAutoDirect={autoDirect}
          onSaveBrand={saveBrand}
          onUploadLogo={uploadLogo}
          onSaveToChannel={(file) => saveToChannel(file, openClip.id)}
          reviews={[]}
          onClose={() => setOpenId(null)}
          onShare={(file) => { setOpenId(null); deliver(file); }}
        />
      )}
    </main>
  );
}
