import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import type { Locale } from '../i18n.config';
import { locales, defaultLocale } from '../i18n.config';

export default getRequestConfig(async ({ requestLocale }) => {
  const loc = await requestLocale;
  const locale = locales.includes(loc) ? loc : defaultLocale;

  if (!locales.includes(locale)) {
    notFound();
  }

  const loaders = {
    en: () => import('../messages/en'),
    es: () => import('../messages/es'),
    zh: () => import('../messages/zh'),
    de: () => import('../messages/de'),
    it: () => import('../messages/it'),
  } satisfies Record<Locale, () => Promise<{ default: Record<string, unknown> }>>;

  const { default: messages } = await loaders[locale]();

  return {
    locale,
    messages,
  };
});
