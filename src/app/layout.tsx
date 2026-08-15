import type {Metadata, Viewport} from 'next';
import {Sora, Inter} from 'next/font/google';
import './globals.css';

const sora = Sora({subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display'});
const inter = Inter({subsets: ['latin'], variable: '--font-body'});

export const metadata: Metadata = {
  metadataBase: new URL('https://theaftershot.com'),
  title: 'AfterShot — Your before & afters, posted for you',
  description:
    'Drop a before + after from each job. AfterShot turns them into branded reels and auto-posts to your Instagram, TikTok, and YouTube. Built for pressure washers, detailers, and landscapers.',
  manifest: '/manifest.json',
  openGraph: {
    title: 'AfterShot — Your before & afters, posted for you',
    description:
      'Drop a before + after from each job. AfterShot turns them into branded reels and auto-posts to your Instagram, TikTok, and YouTube.',
    url: 'https://theaftershot.com',
    siteName: 'AfterShot',
    images: [{url: '/og.png', width: 1200, height: 630, alt: 'AfterShot'}],
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AfterShot — Your before & afters, posted for you',
    description:
      'Drop a before + after from each job. AfterShot turns them into branded reels and auto-posts to your Instagram, TikTok, and YouTube.',
    images: ['/og.png'],
  },
  // Search Console ownership. Google's OAuth verification refuses a home page
  // URL that isn't registered to the same account as the Cloud project, so this
  // has to stay put — removing it un-verifies the domain and fails the review.
  verification: {google: 'Cehz-QImAaq5MmEOrn8QxOZEeqiNVuZaChu1vttJOTQ'},
};

export const viewport: Viewport = {
  themeColor: '#0EA5E9',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
