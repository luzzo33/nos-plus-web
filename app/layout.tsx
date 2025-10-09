import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import { cn } from '@/lib/utils';
import ClientErrorReporter from '@/components/system/ClientErrorReporter';
import { seoConfig } from '@/lib/seo/config';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  manifest: '/site.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
    shortcut: ['/favicon.ico'],
  },
};

type Props = {
  children: ReactNode;
  params?: { locale?: string };
};

export default function RootLayout({ children, params }: Props) {
  const localeParam = params?.locale;
  const locale = Array.isArray(localeParam) ? localeParam[0] : localeParam;

  return (
    <html lang={locale || 'en'} className={inter.variable} suppressHydrationWarning>
      <body className={cn(inter.className, 'min-h-screen antialiased gradient-subtle')}>
        {seoConfig.mode === 'live' && seoConfig.analytics.googleTagManagerId ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${seoConfig.analytics.googleTagManagerId}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        ) : null}
        <ClientErrorReporter />
        {children}
      </body>
    </html>
  );
}
