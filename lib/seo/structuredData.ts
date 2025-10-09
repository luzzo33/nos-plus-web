import type { Locale } from '@/i18n.config';
import {
  buildAbsoluteUrl,
  createLocalizedPath,
  ensureAbsoluteUrl,
  getBcp47Locale,
  getPublicBaseUrl,
  seoConfig,
  type PathSegment,
} from './config';

export type ArticleStructuredDataInput = {
  locale: Locale;
  title: string;
  description: string;
  pathSegments?: PathSegment[];
  publishedAt?: string;
  updatedAt?: string;
  authorName?: string;
  tags?: string[];
  image?: string;
};

export function getSiteStructuredData(locale: Locale) {
  const baseUrl = getPublicBaseUrl();
  const logo =
    ensureAbsoluteUrl('/android-chrome-512x512.png') ?? `${baseUrl}/android-chrome-512x512.png`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: seoConfig.siteName,
      url: baseUrl,
      logo,
      sameAs: [
        'https://twitter.com/nos_plus',
        'https://discord.com/invite/nosana-ai',
        'https://github.com/nosana',
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: seoConfig.siteName,
      url: baseUrl,
      inLanguage: getBcp47Locale(locale),
      alternateName: 'NOS+ Dashboard',
    },
  ];
}

export function getArticleStructuredData({
  locale,
  title,
  description,
  pathSegments = [],
  publishedAt,
  updatedAt,
  authorName,
  tags,
  image,
}: ArticleStructuredDataInput) {
  const localizedPath = createLocalizedPath(locale, pathSegments);
  const canonical = buildAbsoluteUrl(localizedPath);
  const logo =
    ensureAbsoluteUrl('/android-chrome-512x512.png') ??
    `${getPublicBaseUrl()}/android-chrome-512x512.png`;
  const imageUrl = ensureAbsoluteUrl(image);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    datePublished: publishedAt,
    dateModified: updatedAt ?? publishedAt,
    author: authorName
      ? {
          '@type': 'Person',
          name: authorName,
        }
      : undefined,
    publisher: {
      '@type': 'Organization',
      name: seoConfig.siteName,
      logo: {
        '@type': 'ImageObject',
        url: logo,
      },
    },
    keywords: tags && tags.length > 0 ? tags : undefined,
    image: imageUrl ? [imageUrl] : undefined,
    inLanguage: getBcp47Locale(locale),
    mainEntityOfPage: canonical,
  };
}
