'use client';

// Reel-format picker, shared by both upload surfaces (/u/[token] and the
// fuller uploader on /account).
//
// Words alone don't land here — "wipe" and "split screen" mean nothing until
// you watch them — so each option is a looping phone-framed mock built from
// the shots the owner just picked. They judge the format on their own job.

export type ReelStyle = 'wipe' | 'stacked';

const OPTIONS: {id: ReelStyle; name: string; note: string}[] = [
  {id: 'wipe', name: 'Reveal', note: 'Before, then wipe to the after'},
  {id: 'stacked', name: 'Split screen', note: 'Both at once, top and bottom'},
];

export type Shot = {url?: string; isVideo?: boolean};

// Until the owner has picked their own shots the phones run a real job — the
// driveway wash that fronts the marketing page. A grey plate reading "Before"
// shows the layout but not the effect; the actual pair sells the format.
const SAMPLE = {before: '/real-before.jpg', after: '/real-after.jpg'};

function Plate({shot, fallback, tag}: {shot?: Shot; fallback?: string; tag: string}) {
  // Once one of their own shots is in, the other slot goes to a labelled plate
  // rather than our sample — half theirs, half ours would just read as a bug.
  if (!shot?.url) {
    return fallback
      ? <img src={fallback} alt="" className="sp-img" />
      : <span className="sp-plate">{tag}</span>;
  }
  // A clip in an <img> is just a broken icon — these slots accept video too.
  return shot.isVideo ? (
    <video src={shot.url} className="sp-img" muted loop autoPlay playsInline />
  ) : (
    <img src={shot.url} alt="" className="sp-img" />
  );
}

function StylePreview({kind, before, after}: {kind: ReelStyle; before?: Shot; after?: Shot}) {
  // Don't let the sample pass for their own work.
  const isSample = !before?.url && !after?.url;
  return (
    <span className="sp-phone" aria-hidden="true">
      <span className="sp-screen">
        {kind === 'wipe' ? (
          <>
            <Plate shot={before} fallback={isSample ? SAMPLE.before : undefined} tag="Before" />
            <span className="sp-reveal">
              <Plate shot={after} fallback={isSample ? SAMPLE.after : undefined} tag="After" />
            </span>
          </>
        ) : (
          <>
            <span className="sp-half sp-top">
              <Plate shot={before} fallback={isSample ? SAMPLE.before : undefined} tag="Before" />
            </span>
            <span className="sp-half sp-bottom">
              <Plate shot={after} fallback={isSample ? SAMPLE.after : undefined} tag="After" />
            </span>
            <span className="sp-divider" />
          </>
        )}
        {isSample && <span className="sp-tag">Example</span>}
      </span>
    </span>
  );
}

export default function StylePicker({
  value,
  onChange,
  before,
  after,
}: {
  value: ReelStyle;
  onChange: (s: ReelStyle) => void;
  before?: Shot;
  after?: Shot;
}) {
  return (
    <div className="style-block">
      <p className="style-lead">Reel style</p>
      <div className="style-pick">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            className={`style-opt${value === o.id ? ' is-on' : ''}`}
            aria-pressed={value === o.id}
            onClick={() => onChange(o.id)}
          >
            <StylePreview kind={o.id} before={before} after={after} />
            <b>{o.name}</b>
            <em>{o.note}</em>
          </button>
        ))}
      </div>
    </div>
  );
}
