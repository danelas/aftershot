// Platform brand marks, filled (not stroked) so they read correctly at 14-18px.
// Kept separate from Icons.tsx because those are stroke/currentColor Lucide-style
// glyphs and these need their own fills and brand gradients.
type P = {size?: number; className?: string};

// Instagram's mark is a gradient in its brand guidelines; a flat colour looks
// wrong next to the real thing, so keep the gradient.
//
// `gradientId` must be unique per instance: SVG resolves url(#id) against the
// first matching element in the document, and duplicate ids are invalid HTML.
// These are server components, so useId() isn't available — pass it explicitly
// wherever the mark is rendered more than once on a page.
export const InstagramMark = ({size = 16, className, gradientId = 'ig-grad'}: P & {gradientId?: string}) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <defs>
      <linearGradient id={gradientId} x1="0" y1="24" x2="24" y2="0">
        <stop offset="0" stopColor="#FFD521" />
        <stop offset="0.28" stopColor="#F50000" />
        <stop offset="0.64" stopColor="#B900B4" />
        <stop offset="1" stopColor="#3900E0" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="20" height="20" rx="5.6" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2.1" />
    <circle cx="12" cy="12" r="4.2" fill="none" stroke={`url(#${gradientId})`} strokeWidth="2.1" />
    <circle cx="17.3" cy="6.7" r="1.35" fill={`url(#${gradientId})`} />
  </svg>
);

export const TikTokMark = ({size = 16, className}: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    {/* The offset cyan/red plates are what make the TikTok note recognisable. */}
    <path
      d="M15.9 2h2.9a5.6 5.6 0 0 0 3.2 4.1v2.9a8.5 8.5 0 0 1-3.7-1.2v5.6a6.4 6.4 0 1 1-6.4-6.4c.3 0 .6 0 .9.1v3a3.4 3.4 0 1 0 2.4 3.3z"
      fill="#25F4EE" transform="translate(-1.4 -0.5)"
    />
    <path
      d="M15.9 2h2.9a5.6 5.6 0 0 0 3.2 4.1v2.9a8.5 8.5 0 0 1-3.7-1.2v5.6a6.4 6.4 0 1 1-6.4-6.4c.3 0 .6 0 .9.1v3a3.4 3.4 0 1 0 2.4 3.3z"
      fill="#FE2C55" transform="translate(0.5 0.5)"
    />
    <path
      d="M15.9 2h2.9a5.6 5.6 0 0 0 3.2 4.1v2.9a8.5 8.5 0 0 1-3.7-1.2v5.6a6.4 6.4 0 1 1-6.4-6.4c.3 0 .6 0 .9.1v3a3.4 3.4 0 1 0 2.4 3.3z"
      fill="#FFFFFF"
    />
  </svg>
);

export const YouTubeMark = ({size = 16, className}: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M22.5 7.2a2.75 2.75 0 0 0-1.93-1.95C18.85 4.8 12 4.8 12 4.8s-6.85 0-8.57.45A2.75 2.75 0 0 0 1.5 7.2 28.7 28.7 0 0 0 1.05 12a28.7 28.7 0 0 0 .45 4.8 2.75 2.75 0 0 0 1.93 1.95c1.72.45 8.57.45 8.57.45s6.85 0 8.57-.45a2.75 2.75 0 0 0 1.93-1.95A28.7 28.7 0 0 0 22.95 12a28.7 28.7 0 0 0-.45-4.8z"
      fill="#FF0000"
    />
    <path d="M9.9 15.3V8.7l5.7 3.3z" fill="#fff" />
  </svg>
);

export const FacebookMark = ({size = 16, className}: P) => (
  <svg width={size} height={size} viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.89 3.77-3.89 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12z"
      fill="#1877F2"
    />
    <path
      d="M15.89 14.89 16.34 12h-2.78v-1.87c0-.79.39-1.56 1.63-1.56h1.26V6.11s-1.14-.2-2.24-.2c-2.28 0-3.77 1.38-3.77 3.89V12H7.9v2.89h2.54v6.99a10.1 10.1 0 0 0 3.12 0v-6.99z"
      fill="#fff"
    />
  </svg>
);
