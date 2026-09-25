import type { Metadata, Viewport } from 'next';
import './globals.css';

export const viewport: Viewport = {
  themeColor: '#0b0f19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  metadataBase: new URL('https://ais-pre-ynbqkrxfqbm5cmcb2kdnke-1057787426869.asia-southeast1.run.app'),
  title: {
    default: 'CineCut AI - Video Clipper & Drive Sync',
    template: '%s | CineCut AI',
  },
  description:
    'Automated movie & long video splitter into short customizable clips with AI scene analysis and auto-upload to Google Drive.',
  applicationName: 'CineCut AI',
  keywords: [
    'video clipper',
    'video splitter',
    'Google Drive sync',
    'shorts creator',
    'reels generator',
    'tiktok clips',
    'timeline cutter',
    'video processing',
    'CineCut AI',
  ],
  authors: [{ name: 'rehan97' }],
  creator: 'rehan97',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
  openGraph: {
    title: 'CineCut AI - Video Clipper & Drive Sync',
    description:
      'Automated movie & long video splitter into short customizable clips with AI scene analysis and auto-upload to Google Drive.',
    siteName: 'CineCut AI',
    type: 'website',
    locale: 'en_US',
    images: [
      {
        url: '/icon.svg',
        width: 512,
        height: 512,
        alt: 'CineCut AI Logo',
      },
    ],
  },
  twitter: {
    card: 'summary',
    title: 'CineCut AI - Video Clipper & Drive Sync',
    description:
      'Automated movie & long video splitter into short customizable clips with AI scene analysis and auto-upload to Google Drive.',
    images: ['/icon.svg'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body suppressHydrationWarning className="bg-[#0b0f19] text-slate-100 antialiased selection:bg-sky-500/30 selection:text-sky-200">
        {children}
      </body>
    </html>
  );
}
