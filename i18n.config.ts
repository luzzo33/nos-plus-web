export const locales = ['en', 'es', 'zh', 'de', 'it'] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = 'en';

export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  zh: '中文',
  de: 'Deutsch',
  it: 'Italiano',
};

export const localeFlags: Record<Locale, string> = {
  en: '🇺🇸',
  es: '🇪🇸',
  zh: '🇨🇳',
  de: '🇩🇪',
  it: '🇮🇹',
};
