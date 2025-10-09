import type { Metadata } from 'next';
import { nosApiFetch } from '@/lib/api/nosApi';
import { logError } from '@/lib/logging/logger';
import type { BlogListPayload } from '@/lib/api/types';
import BlogExplorer from '@/components/blog/BlogExplorer';
import { createPageMetadata } from '@/lib/seo/metadata';
import { resolveLocale } from '@/lib/seo/config';

interface BlogPageParams {
  locale: string;
}

async function fetchBlogPosts(language: string): Promise<BlogListPayload> {
  const fallback: BlogListPayload = {
    posts: [],
    availableLanguages: [language],
    requestedLanguage: language,
  };

  try {
    const payload = await nosApiFetch(`/v3/blog/posts?language=${encodeURIComponent(language)}`);
    if (payload?.data?.posts) {
      return payload.data as BlogListPayload;
    }
    return fallback;
  } catch (error) {
    logError('[BlogPage] Failed to fetch blog posts', {
      language,
      error,
    });
    return fallback;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<BlogPageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: resolveLocale(locale),
    page: 'blog.index',
    pathSegments: ['blog'],
  });
}

export default async function BlogPage({ params }: { params: Promise<BlogPageParams> }) {
  const { locale } = await params;
  const normalizedLang = (locale || 'en').split('-')[0] || 'en';
  const initialData = await fetchBlogPosts(normalizedLang);

  return <BlogExplorer initialData={initialData} fallbackLanguage={normalizedLang} />;
}
