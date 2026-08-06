'use client';

// Create a reel without leaving /account. This used to be a button that sent
// you off to /u/<token> — an extra hop for the thing people came to do.
//
// Adds up to 3 extra shots on top of the before/after pair; they play after the
// reveal and before the sell card. The reel is NOT auto-published from here:
// the button says "Create reel" and lands you in Studio to review and share.
import {useEffect, useRef, useState} from 'react';
import {Check, Sparkles} from 'lucide-react';
import {anonClient} from '@/lib/supabase';
import SideBySideSplitter from './SideBySideSplitter';
import StylePicker, {type ReelStyle} from './StylePicker';
import {PLATFORM_META, PLATFORM_LABEL, ALL_PLATFORMS, connectHref, tileStyle} from './PlatformBrand';

const MAX_EXTRAS = 3;

type Slot = {file: File; url: string};

// A blank caption box is where people stall — so offer three lines to tap
// instead of a cursor to stare at. Whatever they've already typed is sent along
// as a steer, so this refines a half-written idea rather than overwriting it.
function HookHelper({
  draft, token, onPick,
}: {draft: string; token: string; onPick: (v: string) => void}) {
  const [ideas, setIdeas] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  async function suggest() {
    setBusy(true);
    try {
      const r = await fetch('/api/hooks', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({t: token, draft}),
      });
      const d = await r.json().catch(() => ({}));
      setIdeas(Array.isArray(d.hooks) ? d.hooks : []);
    } catch {
      setIdeas([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="hook-ai">
      <button type="button" className="hook-ai-btn" onClick={suggest} disabled={busy}>
        <Sparkles size={15} />
        {busy ? 'Thinking…' : ideas.length ? 'More ideas' : 'Write one for me'}
      </button>
      {ideas.map((h) => (
        <button key={h} type="button" className="hook-ai-pick" onClick={() => onPick(h)}>
          {h}
        </button>
      ))}
    </div>
  );
}

export default function JobUploader({token, studioUrl}: {token: string; studioUrl: string}) {
  const [before, setBefore] = useState<Slot | null>(null);
  const [after, setAfter] = useState<Slot | null>(null);
  const [extras, setExtras] = useState<Slot[]>([]);
  const [hook, setHook] = useState('');
  // Their photos already carry a printed BEFORE/AFTER (most collage apps add
  // one). The reel then skips its own label instead of stacking a second one.
  const [labelsBakedIn, setLabelsBakedIn] = useState(false);
  // Reel format. 'wipe' is the house style; 'stacked' keeps both shots on
  // screen the whole time (works best when the two are framed from one spot).
  const [style, setStyle] = useState<ReelStyle>('wipe');
  const [state, setState] = useState<'idle' | 'sending' | 'done'>('idle');
  const [msg, setMsg] = useState('');
  // The job we just created — polled so the finished video shows up here.
  const [jobId, setJobId] = useState<string | null>(null);
  // The collage awaiting a split, if any.
  const [splitting, setSplitting] = useState<File | null>(null);

  // Hitting "Create reel" swaps a ~700px form for a ~230px status card, and the
  // browser keeps scrollTop where it was — so the page appears to slide down by
  // the difference and you lose the thing you just did. Pull the card back to
  // the top of the viewport instead.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state !== 'done') return;
    cardRef.current?.scrollIntoView({block: 'start', behavior: 'smooth'});
  }, [state]);

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
          labelsBakedIn,
          style,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error || 'Could not start your reel.');
      setJobId(d.jobId || null);
      setState('done');
    } catch (e: any) {
      setMsg(e?.message || 'Something went wrong.');
      setState('idle');
    }
  }

  function reset() {
    if (before) URL.revokeObjectURL(before.url);
    if (after) URL.revokeObjectURL(after.url);
    extras.forEach((e) => URL.revokeObjectURL(e.url));
    setBefore(null); setAfter(null); setExtras([]); setHook('');
    setLabelsBakedIn(false); setStyle('wipe'); setJobId(null); setState('idle');
  }

  if (state === 'done') {
    return (
      <div className="acct-card" ref={cardRef}>
        <p className="acct-label">CREATE A REEL</p>
        <ReelResult token={token} jobId={jobId} studioUrl={studioUrl} onAnother={reset} />
      </div>
    );
  }

  return (
    <div className="acct-card" ref={cardRef}>
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
      <HookHelper draft={hook} token={token} onPick={setHook} />

      <StylePicker
        value={style}
        onChange={setStyle}
        before={before ? {url: before.url, isVideo: before.file.type.startsWith('video/')} : undefined}
        after={after ? {url: after.url, isVideo: after.file.type.startsWith('video/')} : undefined}
      />

      {/* Also reachable from the splitter, but plenty of people upload two
          shots their phone app already stamped. */}
      <label className="sbs-check" style={{marginTop: 12}}>
        <input
          type="checkbox" checked={labelsBakedIn}
          onChange={(e) => setLabelsBakedIn(e.target.checked)}
        />
        <span>
          These photos already say Before / After — <b>don&apos;t add ours</b>
        </span>
      </label>

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
          onDone={(b, a, opts) => {
            setSlot(before, setBefore)(b);
            setSlot(after, setAfter)(a);
            if (opts.labelsBakedIn) setLabelsBakedIn(true);
            setSplitting(null);
          }}
        />
      )}
    </div>
  );
}

type JobStatus = {
  state: 'rendering' | 'ready' | 'failed';
  url: string | null;
  error: string | null;
  posts: {platform: string; status: string}[];
};

// What happens after "Create reel": the render is watched here and the finished
// video plays in this same card, with the accounts to send it to right under it.
// Before this, a new reel only existed in Studio — a second page you had to go
// find, which is why finished reels sat unshared.
function ReelResult({
  token, jobId, studioUrl, onAnother,
}: {token: string; jobId: string | null; studioUrl: string; onAnother: () => void}) {
  const [job, setJob] = useState<JobStatus | null>(null);
  const [accounts, setAccounts] = useState<{platform: string; handle: string | null}[] | null>(null);
  const [platforms, setPlatforms] = useState<string[]>(ALL_PLATFORMS);
  // Facebook reels land on a Page. One page needs no question; several do.
  const [fbPages, setFbPages] = useState<{id: string; name: string}[]>([]);
  const [fbPageId, setFbPageId] = useState('');
  const [picked, setPicked] = useState<string[]>([]);
  const [sharing, setSharing] = useState(false);
  const [sent, setSent] = useState<string[]>([]);
  const [err, setErr] = useState('');

  // Poll until the worker has a video (or gives up). 8s: fast enough that the
  // reel appears while they're still looking at the page, slow enough to be
  // free.
  useEffect(() => {
    if (!jobId) return;
    let stop = false;
    let timer: ReturnType<typeof setTimeout>;
    const load = async () => {
      try {
        const r = await fetch(`/api/jobs/status?t=${encodeURIComponent(token)}&id=${encodeURIComponent(jobId)}`);
        if (!r.ok) throw new Error();
        const d: JobStatus = await r.json();
        if (stop) return;
        setJob(d);
        if (d.state === 'rendering') timer = setTimeout(load, 8000);
      } catch {
        if (!stop) timer = setTimeout(load, 15000);
      }
    };
    load();
    return () => { stop = true; clearTimeout(timer); };
  }, [token, jobId]);

  // Their linked accounts, so the share row offers real destinations.
  useEffect(() => {
    fetch(`/api/social/status?t=${encodeURIComponent(token)}`)
      .then((r) => r.json())
      .then((d) => {
        setAccounts(d.accounts ?? []);
        if (d.platforms?.length) setPlatforms(d.platforms);
        const pages = Array.isArray(d.facebookPages) ? d.facebookPages : [];
        setFbPages(pages);
        setFbPageId(pages[0]?.id || '');
        // Pre-select everything they've connected — the common case is "post it
        // everywhere", and an empty selection would need an extra tap first.
        setPicked((d.accounts ?? []).map((a: {platform: string}) => a.platform));
      })
      .catch(() => setAccounts([]));
  }, [token]);

  async function share() {
    if (!jobId || !targets.length) return;
    setSharing(true); setErr('');
    try {
      const r = await fetch('/api/share', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          t: token,
          jobId,
          platforms: targets,
          facebookPageId: targets.includes('facebook') ? fbPageId || undefined : undefined,
        }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || 'Could not share that reel.');
      setSent((s) => [...new Set([...s, ...targets])]);
      setPicked([]);
    } catch (e: any) {
      setErr(e?.message || 'Something went wrong.');
    } finally { setSharing(false); }
  }

  // "Somewhere else" — hand the file to the phone's share sheet, or download it
  // on desktop.
  async function shareFile(url: string) {
    setErr('');
    try {
      const blob = await (await fetch(url)).blob();
      const file = new File([blob], 'aftershot-reel.mp4', {type: 'video/mp4'});
      if (navigator.canShare?.({files: [file]})) {
        await navigator.share({files: [file]});
        return;
      }
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      // A cancelled share sheet lands here too — a link they can hit is a
      // better fallback than an error.
      window.open(url, '_blank');
    }
  }

  const linked = new Set((accounts ?? []).map((a) => a.platform));
  const done = new Set([...sent, ...(job?.posts ?? []).filter((p) => p.status === 'posted').map((p) => p.platform)]);
  // Pre-selection happens before we know which platforms this reel already went
  // to, so a re-share would otherwise offer to post somewhere it already is.
  const targets = picked.filter((p) => !done.has(p));

  if (!jobId || !job || job.state === 'rendering') {
    return (
      <>
        <p className="acct-muted" style={{marginTop: 0}}>
          <b style={{color: 'var(--ink)'}}>Your reel is rendering.</b> It takes a
          few minutes — leave this page open and it&apos;ll appear right here,
          ready to share.
        </p>
        <div className="reel-wait">
          <span className="reel-spin" />
          <span>Rendering…</span>
        </div>
        <button className="acct-copy" onClick={onAnother}>Create another</button>
      </>
    );
  }

  if (job.state === 'failed') {
    return (
      <>
        <p className="checkout-msg" style={{marginTop: 0}}>
          That reel didn&apos;t render{job.error ? ` — ${job.error}` : ''}. Try again with
          the same photos, or email hello@theaftershot.com and we&apos;ll look at it.
        </p>
        <button className="btn checkout-btn" onClick={onAnother}>Try again</button>
      </>
    );
  }

  return (
    <>
      <p className="acct-muted" style={{marginTop: 0}}>
        <b style={{color: 'var(--ink)'}}>Your reel is ready.</b> Pick where it goes.
      </p>

      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video className="reel-video" src={job.url!} controls playsInline preload="metadata" />

      <p className="acct-label" style={{margin: '16px 0 8px'}}>SHARE TO</p>
      {accounts === null ? (
        <p className="acct-muted" style={{margin: 0}}>Checking your connected accounts…</p>
      ) : (
        <>
          {/* An unconnected platform used to be a dead grey chip telling you to
              go find another card. It's a brand tile that links the account
              right here instead — same look as "Where we post". */}
          <div className="soc-grid">
            {platforms.map((p) => {
              const meta = PLATFORM_META[p];
              if (!meta) return null;
              const {label, Icon, solid, tint, ink} = meta;
              const isDone = done.has(p);
              const on = picked.includes(p);

              if (!linked.has(p)) {
                return (
                  <a key={p} className="soc-tile" style={tileStyle(meta)} href={connectHref(p, token)}>
                    <span className="soc-ic"><Icon /></span>
                    {label}
                  </a>
                );
              }
              return (
                <button
                  type="button"
                  key={p}
                  className={`soc-chip soc-pick${on ? ' on' : ''}`}
                  style={on || isDone ? {background: tint, borderColor: ink} : undefined}
                  disabled={isDone || sharing}
                  onClick={() => setPicked((s) => (on ? s.filter((x) => x !== p) : [...s, p]))}
                >
                  <span className="soc-ic" style={{color: ink}}><Icon /></span>
                  <span className="soc-name">{label}</span>
                  <span className="soc-tick">{isDone ? 'Posted' : on ? <Check size={14} strokeWidth={3} /> : ''}</span>
                </button>
              );
            })}
          </div>

          {targets.includes('facebook') && fbPages.length > 1 && (
            <label className="acct-muted" style={{fontSize: 13, display: 'block'}}>
              Which Facebook Page
              <select
                className="checkout-input"
                value={fbPageId}
                onChange={(e) => setFbPageId(e.target.value)}
                style={{marginTop: 6}}
              >
                {fbPages.map((p) => (
                  <option key={p.id} value={p.id}>{p.name || p.id}</option>
                ))}
              </select>
            </label>
          )}

          {linked.size === 0 && (
            <p className="acct-muted" style={{fontSize: 13}}>
              Tap a platform above to link it — takes a few seconds, and from then on
              your reels post there on their own. Or share the file straight from your phone.
            </p>
          )}

          {linked.size > 0 && (
            <button className="btn checkout-btn" disabled={!targets.length || sharing}
              style={{opacity: targets.length && !sharing ? 1 : 0.45}} onClick={share}>
              {sharing
                ? 'Sending…'
                : targets.length
                  ? `Share to ${targets.map((p) => PLATFORM_LABEL[p] ?? p).join(' + ')}`
                  : done.size ? 'Shared' : 'Pick an account'}
            </button>
          )}
        </>
      )}

      <button className="acct-copy" onClick={() => shareFile(job.url!)}>Share somewhere else</button>
      <a href={studioUrl} className="acct-copy" style={{display: 'block', textAlign: 'center', textDecoration: 'none'}}>
        Edit in Studio
      </a>
      <button className="acct-copy" onClick={onAnother}>Create another</button>
      {err && <p className="checkout-msg">{err}</p>}
    </>
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
