'use client';

// Create a reel without leaving /account. This used to be a button that sent
// you off to /u/<token> — an extra hop for the thing people came to do.
//
// Adds up to 3 extra shots on top of the before/after pair; they play after the
// reveal and before the sell card. The reel is NOT auto-published from here:
// the button says "Create reel" and lands you in Studio to review and share.
import {useRef, useState} from 'react';
import {anonClient} from '@/lib/supabase';
import SideBySideSplitter from './SideBySideSplitter';

const MAX_EXTRAS = 3;

type Slot = {file: File; url: string};

export default function JobUploader({token, studioUrl}: {token: string; studioUrl: string}) {
  const [before, setBefore] = useState<Slot | null>(null);
  const [after, setAfter] = useState<Slot | null>(null);
  const [extras, setExtras] = useState<Slot[]>([]);
  const [hook, setHook] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [msg, setMsg] = useState('');
  // The collage awaiting a split, if any.
  const [splitting, setSplitting] = useState<File | null>(null);

  const ready = Boolean(before && after) && state !== 'sending';

  // Object URLs are revoked when a slot is replaced or cleared so previews
  // don't leak across a long session.
  const setSlot = (cur: Slot | null, set: (s: Slot | null) => void) => (f: File | null) => {
    if (cur) URL.revokeObjectURL(cur.url);
    set(f ? {file: f, url: URL.createObjectURL(f)} : null);
  };

  function addExtras(files: FileList) {
    const room = MAX_EXTRAS - extras.length;
    if (room <= 0) return;
    const next = [...files].slice(0, room).map((f) => ({file: f, url: URL.createObjectURL(f)}));
    setExtras((e) => [...e, ...next]);
  }
  function removeExtra(i: number) {
    setExtras((e) => {
      URL.revokeObjectURL(e[i].url);
      return e.filter((_, n) => n !== i);
    });
  }

  async function createReel() {
    if (!before || !after) return;
    setState('sending'); setMsg('');
    try {
      const stamp = Date.now();
      const put = async (f: File, tag: string) => {
        const ext = f.name.split('.').pop() || 'jpg';
        const path = `${token}/${stamp}-${tag}.${ext}`;
        const {error} = await anonClient().storage.from('intake').upload(path, f, {upsert: false});
        if (error) throw error;
        return {path, isVideo: f.type.startsWith('video/')};
      };
      const b = await put(before.file, 'before');
      const a = await put(after.file, 'after');
      const ex = [];
      for (let i = 0; i < extras.length; i++) ex.push((await put(extras[i].file, `extra${i + 1}`)).path);

      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          uploadToken: token,
          beforePath: b.path,
          afterPath: a.path,
          beforeIsVideo: b.isVideo,
          afterIsVideo: a.isVideo,
          extraPaths: ex,
          hook: hook.trim() || undefined,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not start your reel.');
      setState('done');
    } catch (e: any) {
      setMsg(e?.message || 'Something went wrong.');
      setState('idle');
    }
  }

  if (state === 'done') {
    return (
      <div className="acct-card">
        <p className="acct-label">CREATE A REEL</p>
        <p className="acct-muted" style={{marginTop: 0}}>
          <b style={{color: 'var(--ink)'}}>Your reel is rendering.</b> It takes a
          few minutes. Open Studio to watch for it, make any edits, then share it.
        </p>
        <a href={studioUrl} className="btn checkout-btn" style={{textDecoration: 'none'}}>
          Open Studio
        </a>
        <button
          className="acct-copy"
          onClick={() => {
            if (before) URL.revokeObjectURL(before.url);
            if (after) URL.revokeObjectURL(after.url);
            extras.forEach((e) => URL.revokeObjectURL(e.url));
            setBefore(null); setAfter(null); setExtras([]); setHook(''); setState('idle');
          }}
        >
          Create another
        </button>
      </div>
    );
  }

  return (
    <div className="acct-card">
      <p className="acct-label">CREATE A REEL</p>

      <div className="up-pair">
        <Picker label="Before" slot={before} onPick={setSlot(before, setBefore)} />
        <Picker label="After" slot={after} onPick={setSlot(after, setAfter)} />
      </div>

      {/* Lots of trades already have one combined collage — their phone app
          makes them. Cut it here instead of asking for the originals. */}
      <label className="up-sbs">
        Already have a side-by-side? <b>Split it for me</b>
        <input
          type="file" accept="image/*" style={{display: 'none'}}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) setSplitting(f); e.target.value = ''; }}
        />
      </label>

      <p className="acct-muted" style={{fontSize: 13, margin: '14px 0 8px'}}>
        Extra shots (optional, up to {MAX_EXTRAS}) — detail views that play after
        the before &amp; after.
      </p>
      <div className="up-extras">
        {extras.map((e, i) => (
          <div className="up-extra" key={e.url}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={e.url} alt={`Extra ${i + 1}`} />
            <button type="button" onClick={() => removeExtra(i)} aria-label="Remove">×</button>
          </div>
        ))}
        {extras.length < MAX_EXTRAS && (
          <label className="up-extra up-add">
            <span>+</span>
            <input
              type="file" accept="image/*" multiple style={{display: 'none'}}
              onChange={(ev) => { if (ev.target.files) addExtras(ev.target.files); ev.target.value = ''; }}
            />
          </label>
        )}
      </div>

      <input
        className="onb-input" style={{marginTop: 14}}
        placeholder="Caption / hook (optional)"
        value={hook}
        onChange={(e) => setHook(e.target.value)}
      />

      <button className="btn checkout-btn" disabled={!ready} onClick={createReel}
        style={{opacity: ready ? 1 : 0.45}}>
        {state === 'sending' ? 'Uploading…' : 'Create reel'}
      </button>
      {!before || !after ? (
        <p className="acct-muted" style={{fontSize: 12.5, textAlign: 'center', marginBottom: 0}}>
          Add a before and an after to continue.
        </p>
      ) : null}
      {msg && <p className="checkout-msg">{msg}</p>}

      {splitting && (
        <SideBySideSplitter
          file={splitting}
          onCancel={() => setSplitting(null)}
          onDone={(b, a) => {
            setSlot(before, setBefore)(b);
            setSlot(after, setAfter)(a);
            setSplitting(null);
          }}
        />
      )}
    </div>
  );
}

function Picker({label, slot, onPick}: {label: string; slot: Slot | null; onPick: (f: File | null) => void}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <label className={`up-slot${slot ? ' filled' : ''}`}>
      {slot ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slot.url} alt={label} />
      ) : (
        <span className="up-plus">+</span>
      )}
      <span className="up-label">{label}</span>
      <input
        ref={input} type="file" accept="image/*,video/*" style={{display: 'none'}}
        onChange={(e) => { const f = e.target.files?.[0] || null; onPick(f); e.target.value = ''; }}
      />
    </label>
  );
}
