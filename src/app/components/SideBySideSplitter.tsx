'use client';

// Turn one side-by-side collage into the before/after pair.
//
// A blind 50/50 cut is wrong often enough to matter — collage apps draw a
// divider bar, and plenty of pairs aren't symmetric — so the split line is
// draggable, the seam is trimmable, and the halves can be swapped.
import {useEffect, useMemo, useRef, useState} from 'react';
import {detectLabelBand, loadImage, splitImage, MAX_TRIM, type LoadedImage, type SplitAxis} from '@/lib/splitImage';

export default function SideBySideSplitter({
  file, onCancel, onDone,
}: {
  file: File;
  onCancel: () => void;
  onDone: (before: File, after: File, opts: {labelsBakedIn: boolean}) => void;
}) {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [err, setErr] = useState('');
  const [ratio, setRatio] = useState(0.5);
  const [gap, setGap] = useState(0);
  const [axis, setAxis] = useState<SplitAxis>('horizontal');
  const [swapped, setSwapped] = useState(false);
  const [busy, setBusy] = useState(false);
  // Collage apps burn their own "BEFORE"/"AFTER" plate into the photo. Cut it
  // off with these, or keep it and switch ours off below — two labels on one
  // shot is the thing to avoid.
  const [trimTop, setTrimTop] = useState(0);
  const [trimBottom, setTrimBottom] = useState(0);
  const [keepTheirLabels, setKeepTheirLabels] = useState(false);
  const [detected, setDetected] = useState<'top' | 'bottom' | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    let dead = false;
    loadImage(file)
      .then((l) => {
        if (dead) { URL.revokeObjectURL(l.objectUrl); return; }
        urlRef.current = l.objectUrl;
        setImg(l);
        setAxis(l.axis);
        // Pre-set the trim when the collage looks like it has a caption strip.
        // It's a starting point, not a decision — the preview shows the result
        // and both sliders go back to zero.
        const band = detectLabelBand(l);
        if (band) {
          setDetected(band.edge);
          if (band.edge === 'top') setTrimTop(band.fraction);
          else setTrimBottom(band.fraction);
        }
      })
      .catch((e) => setErr(e.message));
    return () => {
      dead = true;
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    };
  }, [file]);

  const horizontal = axis === 'horizontal';

  // Clip each half out of the same <img> so the preview matches the real cut,
  // label trim included.
  const halfStyle = (which: 'a' | 'b'): React.CSSProperties => {
    const first = which === 'a';
    const start = first ? 0 : Math.min(0.95, ratio + gap);
    const end = first ? Math.max(0.05, ratio - gap) : 1;
    // Box of this half in whole-image fractions.
    let x0 = 0, x1 = 1, y0 = 0, y1 = 1;
    if (horizontal) { x0 = start; x1 = end; } else { y0 = start; y1 = end; }
    // Trims are fractions of the half, matching splitImage().
    const h = y1 - y0;
    y0 += h * trimTop;
    y1 -= h * trimBottom;
    const pct = (n: number) => `${n * 100}%`;
    return {
      clipPath: `inset(${pct(y0)} ${pct(1 - x1)} ${pct(1 - y1)} ${pct(x0)})`,
      transform: `translate(${pct(-x0)}, ${pct(-y0)})`,
    };
  };

  const labels = useMemo(
    () => (swapped ? {a: 'After', b: 'Before'} : {a: 'Before', b: 'After'}),
    [swapped],
  );

  async function apply() {
    if (!img) return;
    setBusy(true); setErr('');
    try {
      const [first, second] = await splitImage(img, {ratio, axis, gap, trimTop, trimBottom});
      onDone(swapped ? second : first, swapped ? first : second, {labelsBakedIn: keepTheirLabels});
    } catch (e: any) {
      setErr(e?.message || 'Could not cut that image.');
      setBusy(false);
    }
  }

  return (
    <div className="sbs-backdrop" role="dialog" aria-modal="true">
      <div className="sbs-panel">
        <p className="acct-label" style={{marginBottom: 4}}>SPLIT YOUR SIDE-BY-SIDE</p>
        <p className="acct-muted" style={{fontSize: 13, marginTop: 0}}>
          Drag the line to where the two shots meet. We&apos;ll cut it into a
          before and an after.
        </p>

        {err && <p className="checkout-msg">{err}</p>}

        {img && (
          <>
            <div className={`sbs-preview ${horizontal ? 'h' : 'v'}`}>
              {(['a', 'b'] as const).map((which) => (
                <div className="sbs-half" key={which}>
                  <div className="sbs-clip">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.objectUrl} alt="" style={halfStyle(which)} />
                  </div>
                  <span className="sbs-tag">{labels[which]}</span>
                </div>
              ))}
            </div>

            <label className="sbs-row">
              <span>Split point</span>
              <input
                type="range" min={0.1} max={0.9} step={0.005}
                value={ratio} onChange={(e) => setRatio(Number(e.target.value))}
              />
              <b>{Math.round(ratio * 100)}%</b>
            </label>

            <label className="sbs-row">
              <span>Trim seam</span>
              <input
                type="range" min={0} max={0.06} step={0.002}
                value={gap} onChange={(e) => setGap(Number(e.target.value))}
              />
              <b>{gap ? `${(gap * 200).toFixed(0)}%` : 'off'}</b>
            </label>

            {/* The burned-in "BEFORE"/"AFTER" plate most collage apps add. */}
            <p className="acct-label" style={{margin: '16px 0 6px'}}>ALREADY SAYS BEFORE / AFTER?</p>
            <p className="acct-muted" style={{fontSize: 12.5, margin: '0 0 8px'}}>
              {detected
                ? `Looks like there's a caption strip along the ${detected} — trimmed it off. Drag back to 0% if that's part of the photo.`
                : 'If the words are printed on the photo, trim them off here — otherwise your reel ends up labelled twice.'}
            </p>

            <label className="sbs-row">
              <span>Trim top</span>
              <input
                type="range" min={0} max={MAX_TRIM} step={0.005}
                value={trimTop} onChange={(e) => setTrimTop(Number(e.target.value))}
              />
              <b>{trimTop ? `${Math.round(trimTop * 100)}%` : 'off'}</b>
            </label>

            <label className="sbs-row">
              <span>Trim bottom</span>
              <input
                type="range" min={0} max={MAX_TRIM} step={0.005}
                value={trimBottom} onChange={(e) => setTrimBottom(Number(e.target.value))}
              />
              <b>{trimBottom ? `${Math.round(trimBottom * 100)}%` : 'off'}</b>
            </label>

            {/* The other way out: keep their words and drop ours. */}
            <label className="sbs-check">
              <input
                type="checkbox" checked={keepTheirLabels}
                onChange={(e) => {
                  setKeepTheirLabels(e.target.checked);
                  // Keeping their plate means not cutting it off.
                  if (e.target.checked) { setTrimTop(0); setTrimBottom(0); }
                }}
              />
              <span>
                Keep the words that are on the photo — <b>don&apos;t add ours</b>
              </span>
            </label>

            <div className="sbs-actions">
              <button className="acct-copy" onClick={() => setSwapped((s) => !s)}>
                Swap before / after
              </button>
              <button className="acct-copy" onClick={() => setAxis(horizontal ? 'vertical' : 'horizontal')}>
                {horizontal ? 'Stacked instead' : 'Side-by-side instead'}
              </button>
            </div>

            <button className="btn checkout-btn" onClick={apply} disabled={busy}>
              {busy ? 'Cutting…' : 'Use these two'}
            </button>
          </>
        )}

        <button className="acct-signout" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
