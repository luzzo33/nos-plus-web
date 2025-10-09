import type { MetadataRoute } from 'next';
import { locales } from '@/i18n.config';
import { buildAbsoluteUrl, createLocalizedPath, getBaseUrl } from '@/lib/seo/config';

const STATIC_SEGMENTS: string[][] = [
  [],
  ['analysis'],
  ['api-keys'],
  ['api-test'],
  ['auth', 'login'],
  ['auth', 'register'],
  ['blog'],
  ['docs'],
  ['holders'],
  ['monitor'],
  ['price'],
  ['privacy'],
  ['raydium'],
  ['simple'],
  ['staking-dapp'],
  ['staking-details'],
  ['stakers-unstakers'],
  ['status'],
  ['terms'],
  ['verify-email'],
  ['volume'],
];

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getBaseUrl();
  const lastModified = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified,
      changeFrequency: 'daily',
      priority: 1,
    },
  ];

  STATIC_SEGMENTS.forEach((segments) => {
    const priority = segments.length === 0 ? 0.9 : 0.7;
    locales.forEach((locale) => {
      const localizedPath = createLocalizedPath(locale, segments);
      entries.push({
        url: buildAbsoluteUrl(localizedPath),
        lastModified,
        changeFrequency: 'daily',
        priority,
      });
    });
  });

  return entries;
}
