import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'AfterShot',
  description: 'Drop today’s before + after. We turn it into a reel and post it for you.',
  manifest: '/manifest.json',
  themeColor: '#0EA5E9',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en">
      <body style={{margin: 0}}>{children}</body>
    </html>
  );
}
