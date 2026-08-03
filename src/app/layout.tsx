import type {Metadata, Viewport} from 'next';
import {Sora, Inter} from 'next/font/google';
import './globals.css';

const sora = Sora({subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-display'});
const inter = Inter({subsets: ['latin'], variable: '--font-body'});

export const metadata: Metadata = {
  title: 'AfterShot — Your before & afters, posted for you',
  description:
    'Drop a before + after from each job. AfterShot turns them into branded reels and auto-posts to your Instagram, TikTok, and YouTube. Built for pressure washers, detailers, and landscapers.',
  manifest: '/manifest.json',
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
