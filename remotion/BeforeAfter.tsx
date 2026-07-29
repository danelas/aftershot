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
const SANS = 'Arial, Helvetica, sans-serif';

// 30fps @ 1080x1920. BEFORE hold → wipe reveal (whoosh) → AFTER hold → sell card.
export const beforeAfterSchema = z.object({
  beforeUrl: z.string(),
  afterUrl: z.string(),
  beforeIsVideo: z.boolean().default(false),
  afterIsVideo: z.boolean().default(false),
  businessName: z.string().default('Your Business'),
  hook: z.string().default("You won't believe the difference"),
  brandColor: z.string().default('#0EA5E9'),
  logoUrl: z.string().nullable().default(null),
  musicSrc: z.string().nullable().default(null),
  // Conversion fields (collected once at onboarding, reused on every reel).
  phone: z.string().nullable().default(null),
  handle: z.string().nullable().default(null), // @theirhandle
  serviceArea: z.string().nullable().default(null),
  rating: z.number().nullable().default(null), // 5.0
  reviewCount: z.number().nullable().default(null), // 127
  licensedInsured: z.boolean().default(false),
  priceFrom: z.string().nullable().default(null), // "$199"
  ctaText: z.string().default('Free Quote'),
});
export type BeforeAfterProps = z.infer<typeof beforeAfterSchema>;

export const beforeAfterDefaults: BeforeAfterProps = {
  beforeUrl: staticFile('real-before.jpg'),
  afterUrl: staticFile('real-after.jpg'),
  beforeIsVideo: false,
  afterIsVideo: false,
  businessName: 'AquaShine Pressure Washing',
  hook: 'This driveway hadn’t been cleaned in 10 years',
  brandColor: '#0EA5E9',
  logoUrl: null,
  musicSrc: staticFile('music/energy.mp3'),
  phone: '(561) 555-0123',
  handle: '@aquashinefl',
  serviceArea: 'Jupiter & Palm Beach County',
  rating: 5.0,
  reviewCount: 127,
  licensedInsured: true,
  priceFrom: '$199',
  ctaText: 'Free Quote',
};

const BEFORE_HOLD = 66;
const WIPE = 24;
const AFTER_HOLD = 96;
const END_CARD = 84;
export const beforeAfterDuration = () => BEFORE_HOLD + WIPE + AFTER_HOLD + END_CARD;

const cover: React.CSSProperties = {position: 'absolute', width: '100%', height: '100%', objectFit: 'cover'};

// Ken Burns: slow zoom/drift so a still photo feels alive. `pop` lifts contrast
// on the "after" so the clean side visibly out-shines the grime.
const KenBurns: React.FC<{url: string; isVideo: boolean; phase?: number; pop?: boolean}> = ({
  url, isVideo, phase = 0, pop = false,
}) => {
  const frame = useCurrentFrame();
  const total = beforeAfterDuration();
  const scale = interpolate(frame, [0, total], [1.04 + phase, 1.12 + phase], {extrapolateRight: 'clamp'});
  const drift = interpolate(frame, [0, total], [-14, 14], {extrapolateRight: 'clamp'});
  const style: React.CSSProperties = {
    ...cover,
    transform: `scale(${scale}) translateY(${drift}px)`,
    filter: pop ? 'saturate(1.16) contrast(1.08) brightness(1.05)' : undefined,
  };
  return (
    <AbsoluteFill style={{overflow: 'hidden'}}>
      {isVideo ? <OffthreadVideo src={url} muted style={style} /> : <Img src={url} style={style} />}
    </AbsoluteFill>
  );
};

const Star: React.FC<{size?: number; color?: string}> = ({size = 44, color = '#FFC107'}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1.01L12 2z" />
  </svg>
);

const Label: React.FC<{text: string; color: string}> = ({text, color}) => (
  <div style={{position: 'absolute', top: 96, left: 0, right: 0, textAlign: 'center', fontFamily, fontSize: 100, letterSpacing: 4, color: '#fff', textShadow: '0 6px 24px rgba(0,0,0,0.55)'}}>
    <span style={{borderBottom: `12px solid ${color}`, paddingBottom: 6}}>{text}</span>
  </div>
);

const Pill: React.FC<{children: React.ReactNode}> = ({children}) => (
  <div style={{background: 'rgba(255,255,255,0.18)', border: '2px solid rgba(255,255,255,0.5)', borderRadius: 999, padding: '14px 28px', fontFamily: SANS, fontWeight: 800, fontSize: 34, color: '#fff', letterSpacing: 0.5}}>
    {children}
  </div>
);

export const BeforeAfter: React.FC<BeforeAfterProps> = (props) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const revealStart = BEFORE_HOLD;
  const wipe = interpolate(frame, [revealStart, revealStart + WIPE], [0, 100], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const hookIn = spring({frame, fps, config: {damping: 200}});
  const endStart = BEFORE_HOLD + WIPE + AFTER_HOLD;

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      {props.musicSrc ? <Audio src={props.musicSrc} volume={0.55} /> : null}
      {/* SFX: whoosh as the wipe starts, sparkle when it lands. */}
      <Sequence from={revealStart - 3} durationInFrames={20}><Audio src={staticFile('sfx/whoosh.mp3')} volume={0.8} /></Sequence>
      <Sequence from={revealStart + WIPE - 3} durationInFrames={24}><Audio src={staticFile('sfx/sparkle.mp3')} volume={0.7} /></Sequence>

      {/* BEFORE + AFTER stacked; after revealed by an expanding clip. */}
      <Sequence durationInFrames={endStart}>
        <KenBurns url={props.beforeUrl} isVideo={props.beforeIsVideo} />
        <AbsoluteFill style={{clipPath: `polygon(0 0, ${wipe}% 0, ${wipe}% 100%, 0 100%)`}}>
          <KenBurns url={props.afterUrl} isVideo={props.afterIsVideo} phase={0.03} pop />
        </AbsoluteFill>

        {frame < revealStart + WIPE / 2 ? <Label text="BEFORE" color={props.brandColor} /> : <Label text="AFTER" color={props.brandColor} />}

        <div style={{position: 'absolute', bottom: 240, left: 60, right: 60, textAlign: 'center', fontFamily, fontSize: 76, lineHeight: 1.04, color: '#fff', transform: `translateY(${(1 - hookIn) * 40}px)`, opacity: hookIn, textShadow: '0 4px 18px rgba(0,0,0,0.7)'}}>
          {props.hook}
        </div>

        {/* Persistent handle so viewers know who to hire mid-scroll. */}
        {props.handle ? (
          <div style={{position: 'absolute', bottom: 40, left: 44, fontFamily: SANS, fontWeight: 800, fontSize: 34, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.7)'}}>{props.handle}</div>
        ) : null}
      </Sequence>

      {/* SELL CARD */}
      <Sequence from={endStart} durationInFrames={END_CARD}>
        <AbsoluteFill style={{backgroundColor: props.brandColor, alignItems: 'center', justifyContent: 'center', gap: 30, padding: '0 70px'}}>
          {props.logoUrl ? <Img src={props.logoUrl} style={{width: 210, height: 210, objectFit: 'contain'}} /> : null}
          <div style={{fontFamily, fontSize: 92, color: '#fff', textAlign: 'center', lineHeight: 1}}>{props.businessName}</div>

          {props.rating ? (
            <div style={{display: 'flex', alignItems: 'center', gap: 12, fontFamily: SANS, fontWeight: 800, fontSize: 40, color: '#fff'}}>
              <Star /> {props.rating.toFixed(1)}{props.reviewCount ? ` (${props.reviewCount})` : ''} · Google
            </div>
          ) : null}

          <div style={{display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center'}}>
            {props.licensedInsured ? <Pill>Licensed &amp; Insured</Pill> : null}
            {props.serviceArea ? <Pill>Serving {props.serviceArea}</Pill> : null}
          </div>

          {props.phone ? (
            <div style={{marginTop: 14, background: '#fff', borderRadius: 22, padding: '22px 44px', textAlign: 'center', boxShadow: '0 12px 40px rgba(0,0,0,0.25)'}}>
              <div style={{fontFamily: SANS, fontWeight: 900, fontSize: 30, letterSpacing: 2, color: props.brandColor}}>CALL OR TEXT · {props.ctaText.toUpperCase()}</div>
              <div style={{fontFamily, fontSize: 78, color: '#0f172a', lineHeight: 1.05}}>{props.phone}</div>
            </div>
          ) : null}

          {props.priceFrom ? (
            <div style={{fontFamily: SANS, fontWeight: 800, fontSize: 38, color: 'rgba(255,255,255,0.95)'}}>Driveways from {props.priceFrom}</div>
          ) : null}
        </AbsoluteFill>
      </Sequence>

      {/* Viral loop watermark. */}
      <div style={{position: 'absolute', bottom: 40, right: 44, fontFamily, fontSize: 30, color: 'rgba(255,255,255,0.85)', textShadow: '0 2px 8px rgba(0,0,0,0.6)'}}>made with AfterShot</div>
    </AbsoluteFill>
  );
};
