'use client';

import { useQuery } from '@tanstack/react-query';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { Newspaper, ArrowUpRight } from 'lucide-react';
import { SectionCard } from '@/components/simple-dashboard/ui/SectionCard';
import {
  SectionLoading,
  SectionError,
  SectionEmpty,
} from '@/components/simple-dashboard/ui/SectionStates';
import { SIMPLE_SECTIONS } from '@/components/simple-dashboard/state/presets';
import { apiClient } from '@/lib/api/client';
import { extractErrorMessage } from '@/components/simple-dashboard/utils/error';

interface BlogPost {
  id: number;
  title: string;
  localizedTitle?: string | null;
  summary?: string | null;
  aiSummary?: string | null;
  preview?: string | null;
  url: string;
  publishedAt: string;
  tags?: string[];
  thumbnailUrl?: string | null;
  readingTimeMinutes?: number;
}

interface BlogResponse {
  success: boolean;
  data: {
    posts: BlogPost[];
  };
}

export function NewsUpdatesSection() {
  const t = useTranslations();
  const copy = SIMPLE_SECTIONS.newsUpdates;
  const locale = useLocale();

  const { data, isLoading, error, refetch } = useQuery<BlogResponse>({
    queryKey: ['simple', 'news', locale],
    queryFn: () => apiClient.getBlogPosts(locale),
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
  });

  const posts = data?.data?.posts?.slice(0, 3) ?? [];
  const errorMessage = extractErrorMessage(error);

  return (
    <SectionCard
      id={copy.anchor}
      title={t(copy.titleKey)}
      subtitle={copy.subtitleKey ? t(copy.subtitleKey) : undefined}
      moreContent={
        <Link
          href="https://nosana.com/blog"
          target="_blank"
          className="inline-flex items-center gap-2 rounded-full border border-[hsla(var(--border-card),0.3)] bg-[hsla(var(--background),0.55)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--simple-text-primary)] transition-colors hover:bg-[hsla(var(--border-card),0.12)]"
        >
          {t('simple.sections.newsUpdates.more.allUpdates')}
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      }
    >
      {isLoading && <SectionLoading rows={4} />}
      {!isLoading && error && <SectionError message={errorMessage} onRetry={() => refetch()} />}
      {!isLoading && !error && posts.length === 0 && (
        <SectionEmpty message={t('simple.sections.newsUpdates.empty')} />
      )}

      {!isLoading && !error && posts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          {posts.map((post) => (
            <article
              key={post.id}
              className="flex flex-col gap-3 rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-3"
            >
              <div className="relative h-32 w-full overflow-hidden rounded-xl bg-[hsla(var(--border-card),0.15)]">
                {post.thumbnailUrl ? (
                  <Image
                    src={post.thumbnailUrl}
                    alt={post.title}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 33vw"
                    priority={false}
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-[hsla(var(--muted-foreground),0.65)]">
                    <Newspaper className="h-6 w-6" />
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
                  {new Date(post.publishedAt).toLocaleDateString(locale, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </p>
                <h3 className="text-sm font-semibold leading-tight text-[var(--simple-text-primary)] line-clamp-2">
                  {post.localizedTitle ?? post.title}
                </h3>
                <p className="text-sm text-[hsla(var(--muted-foreground),0.75)] line-clamp-3">
                  {post.aiSummary ?? post.preview ?? post.summary ?? ''}
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-[hsla(var(--muted-foreground),0.65)]">
                <span>
                  {t('simple.sections.newsUpdates.readTime', {
                    minutes: post.readingTimeMinutes ?? 2,
                  })}
                </span>
                <Link
                  href={post.url}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-[var(--simple-text-primary)] transition-colors hover:text-[hsla(var(--accent),0.8)]"
                >
                  {t('simple.sections.newsUpdates.readMore')}
                  <ArrowUpRight className="h-3 w-3" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
