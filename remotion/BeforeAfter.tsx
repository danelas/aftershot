import {
  AbsoluteFill,
  Img,
  OffthreadVideo,
  Audio,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
  staticFile,
} from 'remotion';
import {z} from 'zod';
import {loadFont} from '@remotion/google-fonts/Anton';

const {fontFamily} = loadFont();

// 30fps @ 1080x1920. The reel: BEFORE hold → wipe reveal → AFTER hold → end card.
export const beforeAfterSchema = z.object({
  beforeUrl: z.string(),
  afterUrl: z.string(),
  beforeIsVideo: z.boolean().default(false),
  afterIsVideo: z.boolean().default(false),
  businessName: z.string().default('Your Business'),
  hook: z.string().default("You won't believe the difference"),
  brandColor: z.string().default('#0EA5E9'),
  logoUrl: z.string().nullable().default(null),
  // Public path or URL to a soundtrack; omit for silent.
  musicSrc: z.string().nullable().default(null),
});
export type BeforeAfterProps = z.infer<typeof beforeAfterSchema>;

export const beforeAfterDefaults: BeforeAfterProps = {
  beforeUrl: staticFile('sample-before.jpg'),
  afterUrl: staticFile('sample-after.jpg'),
  beforeIsVideo: false,
  afterIsVideo: false,
  businessName: 'AquaShine Pressure Washing',
  hook: "You won't believe this driveway",
  brandColor: '#0EA5E9',
  logoUrl: null,
  musicSrc: null,
};

// Timeline (frames @ 30fps)
const BEFORE_HOLD = 66; // ~2.2s on the before
const WIPE = 24; //        ~0.8s reveal
const AFTER_HOLD = 96; //  ~3.2s on the after
const END_CARD = 78; //    ~2.6s outro
export const beforeAfterDuration = () => BEFORE_HOLD + WIPE + AFTER_HOLD + END_CARD;

const Media: React.FC<{url: string; isVideo: boolean}> = ({url, isVideo}) =>
  isVideo ? (
    <OffthreadVideo src={url} muted style={cover} />
  ) : (
    <Img src={url} style={cover} />
  );

const cover: React.CSSProperties = {
  position: 'absolute',
  width: '100%',
  height: '100%',
  objectFit: 'cover',
};

const Label: React.FC<{text: string; color: string}> = ({text, color}) => (
  <div
    style={{
      position: 'absolute',
      top: 90,
      left: 0,
      right: 0,
      textAlign: 'center',
      fontFamily,
      fontSize: 96,
      letterSpacing: 4,
      color: '#fff',
      textShadow: '0 6px 24px rgba(0,0,0,0.55)',
    }}
  >
    <span style={{borderBottom: `12px solid ${color}`, paddingBottom: 6}}>{text}</span>
  </div>
);

export const BeforeAfter: React.FC<BeforeAfterProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const revealStart = BEFORE_HOLD;
  // Diagonal wipe: after-image clip grows from 0 → 100%.
  const wipe = interpolate(frame, [revealStart, revealStart + WIPE], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const hookIn = spring({frame, fps, config: {damping: 200}});
  const endStart = BEFORE_HOLD + WIPE + AFTER_HOLD;

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {props.musicSrc ? <Audio src={props.musicSrc} volume={0.6} /> : null}

      {/* BEFORE + AFTER stacked; after revealed by an expanding clip-path. */}
      <Sequence durationInFrames={endStart}>
        <AbsoluteFill>
          <Media url={props.beforeUrl} isVideo={props.beforeIsVideo} />
        </AbsoluteFill>
        <AbsoluteFill
          style={{clipPath: `polygon(0 0, ${wipe}% 0, ${wipe}% 100%, 0 100%)`}}
        >
          <Media url={props.afterUrl} isVideo={props.afterIsVideo} />
        </AbsoluteFill>

        {frame < revealStart + WIPE / 2 ? (
          <Label text="BEFORE" color={props.brandColor} />
        ) : (
          <Label text="AFTER" color={props.brandColor} />
        )}

        {/* Hook, lower third */}
        <div
          style={{
            position: 'absolute',
            bottom: 220,
            left: 60,
            right: 60,
            textAlign: 'center',
            fontFamily,
            fontSize: 72,
            lineHeight: 1.05,
            color: '#fff',
            transform: `translateY(${(1 - hookIn) * 40}px)`,
            opacity: hookIn,
            textShadow: '0 4px 18px rgba(0,0,0,0.7)',
          }}
        >
          {props.hook}
        </div>
      </Sequence>

      {/* END CARD */}
      <Sequence from={endStart} durationInFrames={END_CARD}>
        <AbsoluteFill
          style={{
            backgroundColor: props.brandColor,
            alignItems: 'center',
            justifyContent: 'center',
            gap: 40,
          }}
        >
          {props.logoUrl ? (
            <Img src={props.logoUrl} style={{width: 260, height: 260, objectFit: 'contain'}} />
          ) : null}
          <div style={{fontFamily, fontSize: 88, color: '#fff', textAlign: 'center', padding: '0 60px'}}>
            {props.businessName}
          </div>
          <div style={{fontFamily, fontSize: 48, color: 'rgba(255,255,255,0.9)'}}>
            Book your transformation today
          </div>
        </AbsoluteFill>
      </Sequence>

      {/* Persistent "made with AfterShot" watermark = the viral loop. */}
      <div
        style={{
          position: 'absolute',
          bottom: 40,
          right: 44,
          fontFamily,
          fontSize: 30,
          color: 'rgba(255,255,255,0.85)',
          textShadow: '0 2px 8px rgba(0,0,0,0.6)',
        }}
      >
        made with AfterShot
      </div>
    </AbsoluteFill>
  );
};
