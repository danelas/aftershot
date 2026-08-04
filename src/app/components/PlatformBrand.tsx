// Each platform wears its own colours: a solid brand tile to link it, a tinted
// chip once it's linked. Scannable at a glance on our dark surface.
//
// Shared by the "Where we post" card and the share row under a finished reel so
// the two can't drift into looking like different products.
type Brand = {
  label: string;
  Icon: () => React.ReactElement;
  solid: string; // brand-filled tile — "connect this"
  tint: string; // linked chip — a subtle brand wash
  ink: string; // brand icon colour on our own dark surface
};

function InstagramIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" width={17} height={17} aria-hidden>
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function TikTokIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={17} height={17} aria-hidden>
      <path d="M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.2v12.9a2.3 2.3 0 1 1-2.3-2.3c.24 0 .47.04.7.1V8.4a5.6 5.6 0 0 0-.7-.05 5.5 5.5 0 1 0 5.5 5.5V8.3a7.4 7.4 0 0 0 4.3 1.37V6.44a4.3 4.3 0 0 1-3.3-.64Z" />
    </svg>
  );
}
function YouTubeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={17} height={17} aria-hidden>
      <path d="M23.5 6.9a3 3 0 0 0-2.1-2.1C19.5 4.3 12 4.3 12 4.3s-7.5 0-9.4.5A3 3 0 0 0 .5 6.9C0 8.8 0 12 0 12s0 3.2.5 5.1a3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1c.5-1.9.5-5.1.5-5.1s0-3.2-.5-5.1ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z" />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" width={17} height={17} aria-hidden>
      <path d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z" />
    </svg>
  );
}

export const PLATFORM_META: Record<string, Brand> = {
  instagram: {
    label: 'Instagram',
    Icon: InstagramIcon,
    solid: 'linear-gradient(115deg,#F9CE34 0%,#EE2A7B 50%,#6228D7 100%)',
    tint: 'rgba(238,42,123,0.12)',
    ink: '#F472A6',
  },
  tiktok: {label: 'TikTok', Icon: TikTokIcon, solid: '#0f0f11', tint: 'rgba(37,244,238,0.10)', ink: '#25F4EE'},
  youtube: {label: 'YouTube', Icon: YouTubeIcon, solid: '#FF0000', tint: 'rgba(255,0,0,0.12)', ink: '#FF5252'},
  facebook: {label: 'Facebook', Icon: FacebookIcon, solid: '#1877F2', tint: 'rgba(24,119,242,0.12)', ink: '#4E9BFF'},
};

export const PLATFORM_LABEL: Record<string, string> = Object.fromEntries(
  Object.entries(PLATFORM_META).map(([k, v]) => [k, v.label]),
);

export const ALL_PLATFORMS = ['instagram', 'tiktok', 'youtube', 'facebook'];

export const connectHref = (platform: string, token: string) =>
  `/api/social/connect?platform=${platform}&t=${encodeURIComponent(token)}`;
