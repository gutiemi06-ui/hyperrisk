import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'HyperRisk — Real-Time Risk Intelligence',
  description:
    'Read-only portfolio risk analytics for Hyperliquid with stress testing, explainable alerts, and deterministic replay.',
  openGraph: {
    title: 'HyperRisk — Real-Time Risk Intelligence',
    description:
      'Read-only Hyperliquid portfolio analytics, transparent stress testing, explainable alerts, and deterministic replay.',
    type: 'website',
    images: [
      {
        url: '/og.png',
        width: 1200,
        height: 630,
        alt: 'HyperRisk real-time risk intelligence for Hyperliquid',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HyperRisk — Real-Time Risk Intelligence',
    description:
      'Read-only Hyperliquid portfolio analytics with stress testing and explainable alerts.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
