import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import type { Locale } from '@/i18n.config';
import {
  createLocalizedPath,
  ensureAbsoluteUrl,
  getAlternateLanguageUrls,
  getBcp47Locale,
  getOpenGraphLocale,
  getPublicBaseUrl,
  isLiveMode,
  seoConfig,
  type PathSegment,
} from './config';

type BaseMetadataOptions = {
  locale: Locale;
  title: string;
  description: string;
  pathSegments?: PathSegment[];
  keywords?: string[];
  ogImage?: string;
  siteName?: string;
  twitterHandle?: string;
};

type RawSeoEntry = {
  title?: string;
  description?: string;
  keywords?: string[] | string;
  ogImage?: string;
  twitterHandle?: string;
};

type PageMetadataOptions = {
  locale: Locale;
  page: string;
  pathSegments?: PathSegment[];
  overrides?: RawSeoEntry;
};

function getNestedValue(source: unknown, path: string): RawSeoEntry | undefined {
  if (!source || typeof source !== 'object') {
    return undefined;
  }

  return path
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)
    .reduce<RawSeoEntry | undefined>((acc, key) => {
      const current: unknown =
        acc && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[key]
          : (source as Record<string, unknown>)[key];

      if (!current || typeof current !== 'object') {
        return undefined;
      }

      return current as RawSeoEntry;
    }, source as RawSeoEntry);
}

function normalizeKeywords(value: unknown): string[] | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map((keyword) => `${keyword}`.trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((keyword) => keyword.trim())
      .filter(Boolean);
  }

  return undefined;
}

export function buildBaseMetadata({
  locale,
  title,
  description,
  pathSegments = [],
  keywords,
  ogImage,
  siteName,
  twitterHandle,
}: BaseMetadataOptions): Metadata {
  const resolvedSiteName = siteName ?? seoConfig.siteName;
  const baseUrl = getPublicBaseUrl();
  const localizedPath = createLocalizedPath(locale, pathSegments);
  const canonical = `${baseUrl}${localizedPath}`;
  const resolvedKeywords = keywords && keywords.length > 0 ? keywords : seoConfig.defaults.keywords;
  const resolvedOgImage =
    ensureAbsoluteUrl(ogImage) ?? ensureAbsoluteUrl(seoConfig.defaults.ogImage);
  const resolvedTwitter = twitterHandle ?? seoConfig.defaults.twitterHandle;
  const metadata: Metadata = {
    metadataBase: new URL(baseUrl),
    title,
    description,
    keywords: resolvedKeywords,
    alternates: {
      canonical,
      languages: getAlternateLanguageUrls(pathSegments),
    },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: resolvedSiteName,
      locale: getOpenGraphLocale(locale),
      type: 'website',
      images: resolvedOgImage ? [resolvedOgImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      site: resolvedTwitter,
      creator: resolvedTwitter,
      images: resolvedOgImage ? [resolvedOgImage] : undefined,
    },
  };

  if (!isLiveMode()) {
    metadata.robots = {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        nocache: true,
        noimageindex: true,
      },
    };
  } else {
    const verification: Metadata['verification'] = {};

    if (seoConfig.verifications.google) {
      verification.google = seoConfig.verifications.google;
    }

    const otherVerifications: Record<string, string> = {};

    if (seoConfig.verifications.bing) {
      otherVerifications['msvalidate.01'] = seoConfig.verifications.bing;
    }

    if (seoConfig.verifications.baidu) {
      otherVerifications['baidu-site-verification'] = seoConfig.verifications.baidu;
    }

    if (Object.keys(otherVerifications).length > 0) {
      verification.other = otherVerifications;
    }

    if (Object.keys(verification).length > 0) {
      metadata.verification = verification;
    }
  }

  metadata.other = {
    ...metadata.other,
    'in-language': getBcp47Locale(locale),
  };

  return metadata;
}

export async function createPageMetadata({
  locale,
  page,
  pathSegments = [],
  overrides,
}: PageMetadataOptions): Promise<Metadata> {
  const t = await getTranslations({ locale, namespace: 'seo' });
  const siteName =
    (typeof t.raw('siteName') === 'string' ? (t.raw('siteName') as string) : undefined) ??
    seoConfig.siteName;

  const defaults = (t.raw('defaults') as RawSeoEntry | undefined) ?? {};
  const pages = (t.raw('pages') as Record<string, unknown> | undefined) ?? {};
  const translationEntry = getNestedValue(pages, page) ?? {};

  const pageEntry: RawSeoEntry = {
    ...translationEntry,
    ...overrides,
  };

  const title = pageEntry.title ?? defaults.title ?? `${siteName}`;

  const description = pageEntry.description ?? defaults.description ?? '';

  const keywords =
    normalizeKeywords(pageEntry.keywords) ??
    normalizeKeywords(defaults.keywords) ??
    seoConfig.defaults.keywords;

  const ogImage = pageEntry.ogImage ?? defaults.ogImage ?? seoConfig.defaults.ogImage;

  const twitterHandle =
    pageEntry.twitterHandle ?? defaults.twitterHandle ?? seoConfig.defaults.twitterHandle;

  return buildBaseMetadata({
    locale,
    title,
    description,
    keywords,
    ogImage,
    pathSegments,
    siteName,
    twitterHandle,
  });
}
