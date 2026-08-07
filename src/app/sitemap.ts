import type {MetadataRoute} from 'next';

const BASE = 'https://theaftershot.com';

// Public, linkable pages only. /account, /studio and /u/[token] are per-user
// (the last one is token-gated), and /subscribe/done is a Stripe return URL.
const PAGES: Array<{path: string; priority: number}> = [
  {path: '/', priority: 1},
  {path: '/start', priority: 0.8},
  {path: '/subscribe', priority: 0.8},
  {path: '/privacy', priority: 0.3},
  {path: '/terms', priority: 0.3},
  {path: '/data-deletion', priority: 0.3},
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return PAGES.map(({path, priority}) => ({
    url: `${BASE}${path}`,
    lastModified,
    changeFrequency: 'weekly',
    priority,
  }));
}
