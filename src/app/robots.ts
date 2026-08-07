import type {MetadataRoute} from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/account', '/studio', '/auth', '/u/', '/subscribe/done'],
    },
    sitemap: 'https://theaftershot.com/sitemap.xml',
  };
}
