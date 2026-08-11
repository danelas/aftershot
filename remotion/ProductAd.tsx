// ProductAd — AfterShot's OWN ad, not a customer's reel. Screen-recording cuts
// of the app (public/ad-cuts/) under a hook card and an end card, so the social
// agent can post "here's what AfterShot does" every day without new footage.
//
// Ported from gold-touch-list/remotion-ui/src/AfterShotAd.tsx (where it was
// hand-rendered). The cuts came from scripts/cut-aftershot-ad.mjs in that repo;
// re-cutting a new recording means re-running it there and copying the segs.
//
// Text is all props: src/social/variants/*.json swaps the hook + end copy to
// get a different ad out of the same footage. See src/social/README.md.
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {z} from 'zod';
import {loadFont as loadSans} from '@remotion/google-fonts/Inter';

const {fontFamily: SANS} = loadSans();

// AfterShot's own palette (aftershot/src/app/globals.css) so the ad and the app
// look like the same product.
const INK = '#060B14';
const WHITE = '#FFFFFF';
const SKY = '#0EA5E9';
const SKY_SOFT = '#7DD3FC';
const DIM = '#93A3BC';

/** Source recording is 462x790 — keep that ratio so no app UI gets cropped. */
const SRC_W = 462;
const SRC_H = 790;
// Sized so the phone still clears the wordmark at the end of the push-in: the
// scale grows it from the centre, so the bottom edge creeps down by half the
// added height. At 790 wide it landed on top of the wordmark.
const SCREEN_W = 740;
const SCREEN_H = Math.round((SCREEN_W * SRC_H) / SRC_W);
const SCREEN_TOP = 470;

const sceneSchema = z.object({
  // One pre-cut clip per scene. Seeking around inside the long recording made
  // the Remotion compositor throw "no frame found at position"; playing each cut
  // from 0 is stable. See scripts/cut-aftershot-ad.mjs.
  clipFile: z.string(),
  seconds: z.number().min(0.5),
  line1: z.string(),
  line2: z.string().optional(),
  /** Platform pills, for the scene that shows where a reel goes. */
  platforms: z.boolean().optional(),
});

export const productAdSchema = z.object({
  hookKicker: z.string(),
  hookLine1: z.string(),
  hookLine2: z.string(),
  hookPunch: z.string(),
  hookSeconds: z.number(),
  scenes: z.array(sceneSchema).min(1),
  endLine1: z.string(),
  endLine2: z.string(),
  endSub: z.string(),
  endSeconds: z.number(),
  musicFile: z.string(),
  musicVolume: z.number().min(0).max(1),
});

export type ProductAdProps = z.infer<typeof productAdSchema>;
type Scene = z.infer<typeof sceneSchema>;

export const productAdDefaults: ProductAdProps = {
  // Names the qualifier, not three trades — the signup form offers twelve, and
  // listing a subset made the ad read as if the rest weren't supported.
  hookKicker: 'ANY TRADE WITH A BEFORE & AFTER',
  hookLine1: 'You already take',
  hookLine2: 'the before & after.',
  hookPunch: 'Now they post themselves.',
  // The three lines stagger in over ~1.4s, so anything near 3s leaves the punch
  // on screen for barely a second — long enough to see, not to read.
  hookSeconds: 4.8,
  scenes: [
    {
      clipFile: 'ad-cuts/seg0.mp4',
      seconds: 3.0,
      line1: 'Two photos.',
      line2: 'From the driveway, on your phone.',
    },
    {
      clipFile: 'ad-cuts/seg1.mp4',
      seconds: 3.4,
      line1: 'Stuck on the caption?',
      line2: 'AI writes the hook for you.',
    },
    {
      clipFile: 'ad-cuts/seg2.mp4',
      seconds: 2.4,
      line1: 'Then one button.',
      line2: 'That’s the whole job.',
    },
    {
      clipFile: 'ad-cuts/seg3.mp4',
      seconds: 2.8,
      line1: 'Share to your favorite platforms',
      platforms: true,
    },
    {
      clipFile: 'ad-cuts/seg4.mp4',
      seconds: 2.6,
      line1: 'Or open the studio',
      line2: 'and change anything you want',
    },
    {
      clipFile: 'ad-cuts/seg5.mp4',
      seconds: 3.0,
      line1: 'A branded reel',
      line2: 'captions, music and labels already on it',
    },
    {
      clipFile: 'ad-cuts/seg6.mp4',
      seconds: 2.8,
      line1: 'The reveal does the selling',
    },
    {
      clipFile: 'ad-cuts/seg7.mp4',
      seconds: 2.6,
      line1: 'Ending on your name',
      line2: 'and your phone number',
    },
  ],
  endLine1: 'You take the photos.',
  endLine2: 'We do the rest.',
  endSub: 'theaftershot.com — 7 days free, no card',
  endSeconds: 3.6,
  musicFile: 'music/uplift.mp3',
  musicVolume: 0.34,
};

export const productAdDuration = (p: ProductAdProps) =>
  Math.round((p.hookSeconds + p.scenes.reduce((a, s) => a + s.seconds, 0) + p.endSeconds) * 30);

/** Rise + blur reveal, staggered by delay. */
const Reveal: React.FC<{delay?: number; children: React.ReactNode}> = ({delay = 0, children}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const s = spring({frame: frame - delay, fps, config: {damping: 200, mass: 0.5}});
  return (
    <div
      style={{
        opacity: s,
        transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
        filter: `blur(${interpolate(s, [0, 1], [10, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

const Backdrop: React.FC = () => (
  <AbsoluteFill
    style={{
      backgroundColor: INK,
      backgroundImage: 'radial-gradient(circle at 50% 20%, rgba(14,165,233,0.24), rgba(6,11,20,0) 58%)',
    }}
  />
);

const Wordmark: React.FC<{opacity?: number}> = ({opacity = 1}) => (
  <div
    style={{
      position: 'absolute',
      bottom: 58,
      width: '100%',
      textAlign: 'center',
      fontFamily: SANS,
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: 2,
      color: DIM,
      opacity,
    }}
  >
    After<span style={{color: SKY_SOFT}}>Shot</span>
  </div>
);

// The four destinations, in their own colours — the same set the app links.
const PLATFORMS: {name: string; bg: string}[] = [
  {name: 'Instagram', bg: 'linear-gradient(115deg,#F9CE34 0%,#EE2A7B 50%,#6228D7 100%)'},
  {name: 'TikTok', bg: '#0f0f11'},
  {name: 'YouTube', bg: '#FF0000'},
  {name: 'Facebook', bg: '#1877F2'},
];

const PlatformPills: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  return (
    <div style={{display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginTop: 30}}>
      {PLATFORMS.map((p, i) => {
        const s = spring({frame: frame - 14 - i * 5, fps, config: {damping: 13}});
        return (
          <div
            key={p.name}
            style={{
              background: p.bg,
              color: WHITE,
              fontFamily: SANS,
              fontSize: 34,
              fontWeight: 700,
              padding: '16px 30px',
              borderRadius: 999,
              opacity: s,
              transform: `scale(${interpolate(s, [0, 1], [0.7, 1])})`,
              // TikTok's near-black needs separating from our dark backdrop;
              // the bright fills don't (an outline on those reads as a seam).
              boxShadow: p.name === 'TikTok' ? 'inset 0 0 0 2px rgba(255,255,255,0.28)' : 'none',
            }}
          >
            {p.name}
          </div>
        );
      })}
    </div>
  );
};

const HookCard: React.FC<{p: ProductAdProps}> = ({p}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const punchIn = spring({frame: frame - Math.round(1.35 * fps), fps, config: {damping: 12}});

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill
        style={{
          fontFamily: SANS,
          justifyContent: 'center',
          alignItems: 'center',
          padding: '0 80px',
          textAlign: 'center',
        }}
      >
        <Reveal>
          <div style={{fontSize: 26, fontWeight: 700, letterSpacing: 4, color: SKY_SOFT, marginBottom: 52}}>
            {p.hookKicker}
          </div>
        </Reveal>
        <Reveal delay={6}>
          <div style={{fontSize: 78, fontWeight: 700, color: '#E5E7EB', lineHeight: 1.16}}>
            {p.hookLine1}
          </div>
        </Reveal>
        <Reveal delay={14}>
          <div style={{fontSize: 78, fontWeight: 700, color: '#E5E7EB', lineHeight: 1.16}}>
            {p.hookLine2}
          </div>
        </Reveal>
        <div
          style={{
            marginTop: 52,
            fontSize: 92,
            fontWeight: 800,
            color: WHITE,
            lineHeight: 1.05,
            opacity: punchIn,
            transform: `scale(${interpolate(punchIn, [0, 1], [0.86, 1])})`,
          }}
        >
          {p.hookPunch}
        </div>
      </AbsoluteFill>
      <Wordmark />
    </AbsoluteFill>
  );
};

const ScreenScene: React.FC<{scene: Scene}> = ({scene}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();

  // Slow push-in keeps a mostly-static UI shot from feeling frozen.
  const scale = interpolate(frame, [0, durationInFrames], [1, 1.045]);
  const fade = interpolate(frame, [0, 6, durationInFrames - 6, durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill style={{opacity: fade}}>
      <Backdrop />

      <div
        style={{
          position: 'absolute',
          top: SCREEN_TOP,
          left: (1080 - SCREEN_W) / 2,
          width: SCREEN_W,
          height: SCREEN_H,
          borderRadius: 40,
          overflow: 'hidden',
          border: '2px solid rgba(14,165,233,0.45)',
          boxShadow: '0 40px 120px rgba(14,165,233,0.26), 0 0 0 14px rgba(255,255,255,0.03)',
          transform: `scale(${scale})`,
        }}
      >
        <OffthreadVideo
          src={staticFile(scene.clipFile)}
          muted
          style={{width: '100%', height: '100%', objectFit: 'cover'}}
        />
      </div>

      <div style={{position: 'absolute', top: 150, left: 64, right: 64, textAlign: 'center', fontFamily: SANS}}>
        <Reveal delay={2}>
          <div style={{fontSize: 74, fontWeight: 800, color: WHITE, lineHeight: 1.08}}>{scene.line1}</div>
        </Reveal>
        {scene.line2 ? (
          <Reveal delay={9}>
            <div style={{marginTop: 20, fontSize: 38, fontWeight: 600, color: SKY_SOFT, lineHeight: 1.25}}>
              {scene.line2}
            </div>
          </Reveal>
        ) : null}
        {scene.platforms ? <PlatformPills /> : null}
      </div>

      <Wordmark opacity={0.75} />
    </AbsoluteFill>
  );
};

const EndCard: React.FC<{p: ProductAdProps}> = ({p}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const brand = spring({frame: frame - 24, fps, config: {damping: 14}});

  return (
    <AbsoluteFill>
      <Backdrop />
      <AbsoluteFill
        style={{
          fontFamily: SANS,
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 78px',
        }}
      >
        <Reveal>
          <div style={{fontSize: 74, fontWeight: 800, color: '#E5E7EB'}}>{p.endLine1}</div>
        </Reveal>
        <Reveal delay={8}>
          <div style={{fontSize: 74, fontWeight: 800, color: '#E5E7EB', marginBottom: 66}}>{p.endLine2}</div>
        </Reveal>
        <div
          style={{
            fontSize: 124,
            fontWeight: 800,
            color: WHITE,
            letterSpacing: -2,
            opacity: brand,
            transform: `scale(${interpolate(brand, [0, 1], [0.8, 1])})`,
          }}
        >
          After<span style={{color: SKY}}>Shot</span>
        </div>
        <Reveal delay={40}>
          <div style={{marginTop: 32, fontSize: 38, fontWeight: 600, color: SKY_SOFT}}>{p.endSub}</div>
        </Reveal>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

export const ProductAd: React.FC<ProductAdProps> = (p) => {
  const {fps} = useVideoConfig();
  const hookFrames = Math.round(p.hookSeconds * fps);

  let cursor = hookFrames;
  const placed = p.scenes.map((scene) => {
    const from = cursor;
    const len = Math.round(scene.seconds * fps);
    cursor += len;
    return {scene, from, len};
  });

  return (
    <AbsoluteFill style={{backgroundColor: INK}}>
      <Sequence durationInFrames={hookFrames}>
        <HookCard p={p} />
      </Sequence>

      {placed.map(({scene, from, len}, i) => (
        <Sequence key={i} from={from} durationInFrames={len}>
          <ScreenScene scene={scene} />
        </Sequence>
      ))}

      <Sequence from={cursor} durationInFrames={Math.round(p.endSeconds * fps)}>
        <EndCard p={p} />
      </Sequence>

      {p.musicFile ? <Audio src={staticFile(p.musicFile)} volume={p.musicVolume} /> : null}
    </AbsoluteFill>
  );
};
