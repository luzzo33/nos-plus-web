import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { Providers } from '@/components/providers';
import { defaultLocale, locales, type Locale } from '@/i18n.config';

async function resolveLocale(): Promise<Locale> {
  const cookieLocale = cookies().get('NEXT_LOCALE')?.value;
  if (cookieLocale && (locales as readonly string[]).includes(cookieLocale)) {
    return cookieLocale as Locale;
  }
  return defaultLocale;
}

export default async function MaintenanceLayout({ children }: { children: ReactNode }) {
  const locale = await resolveLocale();
  const messages = await getMessages({ locale });

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <Providers>{children}</Providers>
    </NextIntlClientProvider>
  );
}
