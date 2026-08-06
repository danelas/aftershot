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

function Plate({shot, tag}: {shot?: Shot; tag: string}) {
  // Before either slot is filled the choice still has to be legible, so fall
  // back to labelled plates rather than an empty frame.
  if (!shot?.url) return <span className="sp-plate">{tag}</span>;
  // A clip in an <img> is just a broken icon — these slots accept video too.
  return shot.isVideo ? (
    <video src={shot.url} className="sp-img" muted loop autoPlay playsInline />
  ) : (
    <img src={shot.url} alt="" className="sp-img" />
  );
}

function StylePreview({kind, before, after}: {kind: ReelStyle; before?: Shot; after?: Shot}) {
  return (
    <span className="sp-phone" aria-hidden="true">
      <span className="sp-screen">
        {kind === 'wipe' ? (
          <>
            <Plate shot={before} tag="Before" />
            <span className="sp-reveal">
              <Plate shot={after} tag="After" />
            </span>
          </>
        ) : (
          <>
            <span className="sp-half sp-top">
              <Plate shot={before} tag="Before" />
            </span>
            <span className="sp-half sp-bottom">
              <Plate shot={after} tag="After" />
            </span>
            <span className="sp-divider" />
          </>
        )}
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
