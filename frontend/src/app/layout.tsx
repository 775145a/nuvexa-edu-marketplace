import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Providers } from '@/components/shared/Providers';
import { RouteProgress } from '@/components/shared/RouteProgress';

const SITE_NAME = 'Nuvexa';

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} - Online Learning Platform`,
    template: `%s | ${SITE_NAME}`,
  },
  description: 'منصة تعلم أونلاين احترافية بكورسات في كل المجالات، شهادات معتمدة ودفع إلكتروني آمن.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  applicationName: SITE_NAME,
  keywords: ['تعلم', 'كورسات', 'أونلاين', 'online learning', 'courses', 'Nuvexa'],
  openGraph: {
    type: 'website',
    locale: 'ar_AR',
    siteName: SITE_NAME,
    title: `${SITE_NAME} - Online Learning Platform`,
    description: 'منصة تعلم أونلاين احترافية بكورسات في كل المجالات.',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${SITE_NAME} - Online Learning Platform`,
    description: 'منصة تعلم أونلاين احترافية بكورسات في كل المجالات.',
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
  themeColor: '#2563eb',
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
