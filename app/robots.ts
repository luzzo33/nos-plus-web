import type { MetadataRoute } from 'next';
import { getBaseUrl, isLiveMode } from '@/lib/seo/config';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseUrl();
  const sitemapUrl = `${baseUrl}/sitemap.xml`;

  if (!isLiveMode()) {
    return {
      rules: [
        {
          userAgent: '*',
          disallow: ['/'],
        },
      ],
      sitemap: sitemapUrl,
      host: baseUrl,
    };
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: sitemapUrl,
    host: baseUrl,
  };
}
