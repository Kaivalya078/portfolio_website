import type { Metadata, Viewport } from 'next';
import { Inter, Newsreader } from 'next/font/google';
import { identity } from '@/data/portfolio';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400'],
  variable: '--font-newsreader',
});

const title = `${identity.name} — Portfolio`;

export const metadata: Metadata = {
  title,
  description: identity.summary,
  openGraph: {
    title,
    description: identity.summary,
    type: 'website',
    siteName: identity.name,
  },
  twitter: {
    card: 'summary_large_image',
    title,
    description: identity.summary,
  },
};

export const viewport: Viewport = {
  themeColor: '#f4f1ea',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${newsreader.variable}`}>
      <body>{children}</body>
    </html>
  );
}
