import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { Locale } from '@/i18n.config';
import { locales } from '@/i18n.config';
import { Providers } from '@/components/providers';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { ToastProvider } from '@/components/ui/Toast';
import { VisitorTracker } from '@/components/tracking/VisitorTracker';
import { AlphaModalProvider } from '@/components/providers/AlphaModalProvider';
import { CookieBanner } from '@/components/layout/CookieBanner';
import { AnalyticsScripts } from '@/components/tracking/AnalyticsScripts';
import { StructuredData } from '@/components/seo/StructuredData';
import { createPageMetadata } from '@/lib/seo/metadata';
import { getSiteStructuredData } from '@/lib/seo/structuredData';
import { isLiveMode, resolveLocale } from '@/lib/seo/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const resolvedLocale = resolveLocale(locale);

  return createPageMetadata({
    locale: resolvedLocale,
    page: 'home',
    pathSegments: [],
  });
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as any)) {
    notFound();
  }

  const typedLocale = resolveLocale(locale);
  const messages = await getMessages();
  const siteStructuredData = isLiveMode() ? getSiteStructuredData(typedLocale) : null;

  return (
    <NextIntlClientProvider messages={messages}>
      <Providers>
        <AnalyticsScripts />
        {siteStructuredData ? (
          <StructuredData
            id={`structured-data-site-${typedLocale}`}
            data={siteStructuredData}
            strategy="beforeInteractive"
          />
        ) : null}
        <AlphaModalProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1 container mx-auto px-4 pt-3 pb-6 md:pt-5 md:pb-8">
              {/* Log visitor (once per session) */}
              <VisitorTracker locale={typedLocale} />
              {children}
            </main>
            <Footer />
          </div>
          <CookieBanner />
          <ToastProvider />
        </AlphaModalProvider>
      </Providers>
    </NextIntlClientProvider>
  );
}
