'use client';

// The whole friction-killer: one screen, two photos, done. Owners add this to
// their home screen (PWA) so it's a one-tap icon. No editor, no account, no app.
import {useEffect, useState} from 'react';
import {Clapperboard, CircleCheck} from 'lucide-react';
import {anonClient} from '@/lib/supabase';
import {use} from 'react';
import {saveToken} from '@/lib/session';
import StylePicker, {type ReelStyle} from '@/app/components/StylePicker';

export default function UploadPage({params}: {params: Promise<{token: string}>}) {
  const {token} = use(params);
  // Opening the emailed link on a new device is how you "sign in" here.
  useEffect(() => { if (token) saveToken(token); }, [token]);
  const [before, setBefore] = useState<File | null>(null);
  const [after, setAfter] = useState<File | null>(null);
  const [hook, setHook] = useState('');
  const [style, setStyle] = useState<ReelStyle>('wipe');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [msg, setMsg] = useState('');

  // Object URLs for the style previews, so the mock shows their actual shots.
  // Revoked on replace/unmount so a long session doesn't leak them.
  const [urls, setUrls] = useState<{before?: string; after?: string}>({});
  useEffect(() => {
    const u = before ? URL.createObjectURL(before) : undefined;
    setUrls((p) => ({...p, before: u}));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [before]);
  useEffect(() => {
    const u = after ? URL.createObjectURL(after) : undefined;
    setUrls((p) => ({...p, after: u}));
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [after]);

  async function submit() {
    if (!before || !after) return;
    setState('sending');
    try {
      const stamp = Date.now();
      const put = async (f: File, tag: string) => {
        const ext = f.name.split('.').pop() || 'jpg';
        const path = `${token}/${stamp}-${tag}.${ext}`;
        const {error} = await anonClient().storage.from('intake').upload(path, f, {upsert: false});
        if (error) throw error;
        return {path, isVideo: f.type.startsWith('video/')};
      };
      const b = await put(before, 'before');
      const a = await put(after, 'after');
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          uploadToken: token,
          beforePath: b.path,
          afterPath: a.path,
          beforeIsVideo: b.isVideo,
          afterIsVideo: a.isVideo,
          hook: hook.trim() || undefined,
          style,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error || 'failed');
      setState('done');
    } catch (e: any) {
      setMsg(e?.message || 'Something went wrong');
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <main style={wrap}>
        <CircleCheck size={64} strokeWidth={1.5} color="#0EA5E9" />
        <h1 style={{fontSize: 28, margin: '12px 0'}}>Got it!</h1>
        <p style={{opacity: 0.7, textAlign: 'center'}}>
          Your reel is being made and will post automatically. Send another after your next job.
        </p>
        <button style={btn} onClick={() => {setBefore(null); setAfter(null); setHook(''); setStyle('wipe'); setState('idle');}}>
          Send another
        </button>
        <a href={`/studio?t=${token}`} style={studioLink}>
          <Clapperboard size={15} style={{verticalAlign: -3}} /> Edit your reels in Studio →
        </a>
      </main>
    );
  }

  return (
    <main style={wrap}>
      <h1 style={{fontSize: 26, marginBottom: 4}}>Today&apos;s before &amp; after</h1>
      <p style={{opacity: 0.6, marginBottom: 24, fontSize: 15}}>Two photos or clips. That&apos;s it.</p>

      <Picker label="BEFORE" file={before} onPick={setBefore} />
      <Picker label="AFTER" file={after} onPick={setAfter} />

      <StylePicker
        value={style}
        onChange={setStyle}
        before={before ? {url: urls.before, isVideo: before.type.startsWith('video/')} : undefined}
        after={after ? {url: urls.after, isVideo: after.type.startsWith('video/')} : undefined}
      />

      <input
        placeholder="Caption (optional)"
        value={hook}
        onChange={(e) => setHook(e.target.value)}
        style={input}
      />

      {state === 'error' ? <p style={{color: '#dc2626'}}>{msg}</p> : null}

      <button style={{...btn, opacity: before && after ? 1 : 0.4}} disabled={!before || !after || state === 'sending'} onClick={submit}>
        {state === 'sending' ? 'Sending…' : 'Post it'}
      </button>
      <a href={`/studio?t=${token}`} style={studioLink}>🎬 Edit your reels in Studio →</a>
    </main>
  );
}

function Picker({label, file, onPick}: {label: string; file: File | null; onPick: (f: File) => void}) {
  return (
    <label style={picker}>
      <span style={{fontWeight: 800, letterSpacing: 1, color: '#0EA5E9'}}>{label}</span>
      <span style={{opacity: 0.6, fontSize: 14}}>{file ? file.name : 'Tap to choose photo or video'}</span>
      <input
        type="file"
        accept="image/*,video/*"
        capture="environment"
        style={{display: 'none'}}
        onChange={(e) => e.target.files?.[0] && onPick(e.target.files[0])}
      />
    </label>
  );
}

const wrap: React.CSSProperties = {maxWidth: 440, margin: '0 auto', padding: 24, display: 'flex', flexDirection: 'column', minHeight: '100dvh', justifyContent: 'center', fontFamily: 'system-ui, sans-serif'};
const picker: React.CSSProperties = {display: 'flex', flexDirection: 'column', gap: 6, border: '2px dashed #cbd5e1', borderRadius: 16, padding: 20, marginBottom: 14, cursor: 'pointer'};
const input: React.CSSProperties = {padding: 14, borderRadius: 12, border: '1px solid #e2e8f0', margin: '10px 0 20px', fontSize: 16};
const btn: React.CSSProperties = {background: '#0EA5E9', color: '#fff', border: 0, borderRadius: 14, padding: '16px 20px', fontSize: 18, fontWeight: 700, cursor: 'pointer'};
// display:block + padding so the thumb target clears ~44px — this page lives on
// a phone home screen and is used one-handed after a job.
const studioLink: React.CSSProperties = {
  display: 'block', marginTop: 12, padding: '13px 10px', textAlign: 'center',
  color: '#0EA5E9', fontWeight: 700, fontSize: 15, textDecoration: 'none',
};
