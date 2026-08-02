import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/shared/Providers';
import { RouteProgress } from '@/components/shared/RouteProgress';

const SITE_NAME = 'Nuvexa';
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://nuvexa-edu.vercel.app';

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - Online Learning Platform`,
    template: `%s | ${SITE_NAME}`,
  },
  description: 'منصة تعلم أونلاين احترافية بكورسات في كل المجالات، شهادات معتمدة ودفع إلكتروني آمن.',
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  keywords: ['تعلم', 'كورسات', 'أونلاين', 'online learning', 'courses', 'Nuvexa'],
  alternates: {
    canonical: SITE_URL,
    languages: {
      ar: `${SITE_URL}/`,
      en: `${SITE_URL}/?lang=en`,
      'x-default': `${SITE_URL}/`,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'ar_AR',
    alternateLocale: 'en_US',
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Online Learning Platform`,
    description: 'منصة تعلم أونلاين احترافية بكورسات في كل المجالات.',
    url: SITE_URL,
    images: [{ url: '/og.png', width: 1200, height: 630, alt: SITE_NAME }],
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Online Learning Platform`,
    description: 'منصة تعلم أونلاين احترافية بكورسات في كل المجالات.',
    images: ['/og.png'],
  },
  robots: { index: true, follow: true },
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f8fafc' },
    { media: '(prefers-color-scheme: dark)', color: '#0b0f1a' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <body>
        <RouteProgress />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
