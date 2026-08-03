'use client';

// The Studio surface: pick one of your rendered reels, edit it in the ported
// PeekScout editor (text, emojis, stickers, QR, music, trim, brand kit), then
// download/share it or save it back so auto-posting uses the edited version.
// Auth = the same upload token as the /u upload page: /studio?t=<token>
import {Suspense, useEffect, useState} from 'react';
import {useSearchParams} from 'next/navigation';
import {Clapperboard, Wand2} from 'lucide-react';
import VideoStudio from '@/components/VideoStudio';
import {uploadToStorage} from '@/lib/upload';
import type {BrandKit} from '@/lib/studio';

type Clip = {id: string; url: string; createdAt: string};
type Customer = {
  businessName: string; trade: string; serviceArea: string | null; phone: string | null;
  rating: number; reviewCount: number; priceFrom: string | null; brandKit: BrandKit | null;
};

const TRADE_LABELS: Record<string, string> = {
  pressure_washing: 'Pressure washing',
  detailing: 'Auto detailing',
  landscaping: 'Landscaping',
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
  const [open, setOpen] = useState<number | null>(null);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!token) { setState('error'); return; }
    fetch(`/api/studio/clips?t=${encodeURIComponent(token)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { setCustomer(d.customer); setClips(d.clips); setState('ready'); })
      .catch(() => setState('error'));
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
    const {url} = await uploadToStorage(file, 'image', token);
    return url;
  }

  function deliver(file: File) {
    const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
    if (mobile && navigator.canShare?.({files: [file]})) {
      navigator.share({files: [file]}).catch(() => {});
    } else {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(file);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
      setNote('Video downloaded — post it anywhere.');
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

  return (
    <main className="min-h-dvh bg-ink-950 px-5 py-8 text-mist-100">
      <div className="mx-auto max-w-3xl">
        <p className="flex items-center gap-2 text-xl font-extrabold">
          <Wand2 className="h-5 w-5 text-accent-400" /> Studio
        </p>
        <p className="mt-1 text-sm text-mist-300">
          {customer.businessName} — tap a reel to edit it: text, stickers, your live Google rating,
          a tap-to-call QR, music, and trim. Save it back and the edited version is what gets posted.
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
            {clips.map((c, i) => (
              <button key={c.id} type="button" onClick={() => setOpen(i)} className="group text-left">
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
            ))}
          </div>
        )}

        {note && <p className="mt-4 text-sm font-medium text-accent-300">{note}</p>}
      </div>

      {open !== null && clips[open] && (
        <VideoStudio
          clipUrl={clips[open].url}
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
          onSaveBrand={saveBrand}
          onUploadLogo={uploadLogo}
          onSaveToChannel={(file) => saveToChannel(file, clips[open].id)}
          reviews={[]}
          onClose={() => setOpen(null)}
          onShare={(file) => { setOpen(null); deliver(file); }}
        />
      )}
    </main>
  );
}
