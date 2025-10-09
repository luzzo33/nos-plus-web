import { defaultLocale, locales, type Locale } from '@/i18n.config';

export type SeoMode = 'beta' | 'live';
export type PathSegment = string | number;

const LIVE_BASE_URL_FALLBACK = 'https://nos.plus';
const BETA_BASE_URL_FALLBACK = 'https://beta.nos.plus';
const DEFAULT_TWITTER_HANDLE = '@nos_plus';
const DEFAULT_OG_IMAGE = '/android-chrome-512x512.png';

const LOCALE_TO_BCP47: Record<Locale, string> = {
  en: 'en-US',
  es: 'es-ES',
  zh: 'zh-CN',
  de: 'de-DE',
  it: 'it-IT',
};

const LOCALE_TO_OG: Record<Locale, string> = {
  en: 'en_US',
  es: 'es_ES',
  zh: 'zh_CN',
  de: 'de_DE',
  it: 'it_IT',
};

function normalizeBaseUrl(value: string | undefined, fallback: string): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    return fallback;
  }

  const attempt = (input: string): string | null => {
    try {
      const url = new URL(input);
      return url.origin;
    } catch {
      return null;
    }
  };

  return attempt(trimmed) ?? attempt(`https://${trimmed}`) ?? fallback;
}

const rawMode = (process.env.SEO_MODE ?? process.env.NEXT_PUBLIC_SEO_MODE)?.toLowerCase() ?? 'beta';

const mode: SeoMode = rawMode === 'live' ? 'live' : 'beta';

const liveBaseUrl = normalizeBaseUrl(
  process.env.SEO_LIVE_BASE_URL ?? process.env.NEXT_PUBLIC_SEO_LIVE_BASE_URL,
  LIVE_BASE_URL_FALLBACK,
);

const betaBaseUrl = normalizeBaseUrl(
  process.env.SEO_BETA_BASE_URL ?? process.env.NEXT_PUBLIC_SEO_BETA_BASE_URL,
  BETA_BASE_URL_FALLBACK,
);

const googleAnalyticsMeasurementId =
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID ?? process.env.GA_MEASUREMENT_ID ?? '';

const googleTagManagerId = process.env.NEXT_PUBLIC_GTM_ID ?? process.env.GTM_ID ?? '';

const googleSiteVerification =
  process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ?? process.env.GOOGLE_SITE_VERIFICATION ?? '';

const bingSiteVerification =
  process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ?? process.env.BING_SITE_VERIFICATION ?? '';

const baiduSiteVerification =
  process.env.NEXT_PUBLIC_BAIDU_SITE_VERIFICATION ?? process.env.BAIDU_SITE_VERIFICATION ?? '';

const defaultOgImage =
  process.env.NEXT_PUBLIC_DEFAULT_OG_IMAGE ?? process.env.DEFAULT_OG_IMAGE ?? DEFAULT_OG_IMAGE;

export const seoConfig = {
  mode,
  siteName: 'NOS.plus',
  liveBaseUrl,
  betaBaseUrl,
  get publicBaseUrl(): string {
    return this.mode === 'live' ? this.liveBaseUrl : this.betaBaseUrl;
  },
  localeToBcp47: LOCALE_TO_BCP47,
  localeToOgLocale: LOCALE_TO_OG,
  analytics: {
    googleAnalyticsMeasurementId,
    googleTagManagerId,
  },
  verifications: {
    google: googleSiteVerification,
    bing: bingSiteVerification,
    baidu: baiduSiteVerification,
  },
  defaults: {
    twitterHandle: DEFAULT_TWITTER_HANDLE,
    keywords: ['Nosana', 'NOS', 'DePIN', 'AI compute', 'crypto dashboard'],
    ogImage: defaultOgImage,
  },
} as const;

export function getSeoMode(): SeoMode {
  return seoConfig.mode;
}

export function isLiveMode(): boolean {
  return seoConfig.mode === 'live';
}

export function getBaseUrl(targetMode: SeoMode = seoConfig.mode): string {
  return targetMode === 'live' ? seoConfig.liveBaseUrl : seoConfig.betaBaseUrl;
}

export function getPublicBaseUrl(): string {
  return getBaseUrl(seoConfig.mode);
}

function toSegments(segments: PathSegment[] = []): string[] {
  return segments
    .flatMap((segment) => {
      if (segment === undefined || segment === null) return [];
      const str = `${segment}`.trim();
      if (!str) return [];
      return str.split('/').filter(Boolean);
    })
    .map((segment) => encodeURIComponent(segment));
}

export function createLocalizedPath(locale: Locale, segments: PathSegment[] = []): string {
  const normalizedSegments = toSegments(segments);
  const localeSegment = encodeURIComponent(locale);
  const path = [localeSegment, ...normalizedSegments].join('/');
  return `/${path}`.replace(/%2F/g, '/');
}

export function buildAbsoluteUrl(path: string, targetMode: SeoMode = seoConfig.mode): string {
  const base = getBaseUrl(targetMode);
  if (!path || path === '/') {
    return base;
  }
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export function ensureAbsoluteUrl(
  value: string | undefined,
  targetMode: SeoMode = seoConfig.mode,
): string | undefined {
  if (!value) {
    return undefined;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return buildAbsoluteUrl(value, targetMode);
}

export function getAlternateLanguageUrls(
  segments: PathSegment[] = [],
  targetMode: SeoMode = seoConfig.mode,
): Record<string, string> {
  const entries = locales.map((locale) => {
    const localizedPath = createLocalizedPath(locale, segments);
    return [locale, buildAbsoluteUrl(localizedPath, targetMode)] as const;
  });

  const defaultEntry = buildAbsoluteUrl(createLocalizedPath(defaultLocale, segments), targetMode);

  return {
    ...Object.fromEntries(entries),
    'x-default': defaultEntry,
  };
}

export function getBcp47Locale(locale: Locale): string {
  return seoConfig.localeToBcp47[locale] ?? locale;
}

export function getOpenGraphLocale(locale: Locale): string {
  return seoConfig.localeToOgLocale[locale] ?? locale;
}

export function resolveLocale(input: string | undefined): Locale {
  if (input && locales.includes(input as Locale)) {
    return input as Locale;
  }
  return defaultLocale;
}
