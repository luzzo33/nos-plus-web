'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocale, useTranslations } from 'next-intl';
import { format } from 'date-fns';
import { ArrowUpRight, Clock, Languages, Newspaper } from 'lucide-react';

import { WidgetContainer } from './WidgetLayout';
import { apiClient } from '@/lib/api/client';
import type { BlogListPayload, BlogPostSummary } from '@/lib/api/types';
import { cn, getDateLocale } from '@/lib/utils';

type BlogWidgetMode = 'single' | 'multi';

interface BlogWidgetProps {
  isMobile?: boolean;
  mode?: BlogWidgetMode;
}

function formatPublishedDate(value: string | null, locale: string) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return format(date, 'MMM d', { locale: getDateLocale(locale) });
  } catch {
    return value ?? '—';
  }
}

export function BlogWidget({ isMobile = false, mode = 'single' }: BlogWidgetProps) {
  const locale = useLocale();
  const tw = useTranslations('widgets');
  const t = useTranslations('blog');

  const { data, isLoading, error } = useQuery<BlogListPayload>({
    queryKey: ['widget-blog', locale],
    queryFn: () => apiClient.getBlogPosts(locale),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  });

  const showMulti = mode === 'multi';
  const showMultiDesktop = showMulti && !isMobile;
  const posts = data?.posts ?? [];
  const requestedLanguage = data?.requestedLanguage ?? locale;
  const topPosts = posts.slice(0, showMulti ? 2 : 1);

  const languageLabel = useCallback(
    (languageCode?: string | null) => {
      if (!languageCode) return '';

      const normalized = languageCode.toLowerCase();
      const primary = normalized.split('-')[0] || normalized;
      const candidates = [primary, normalized].filter(Boolean) as string[];
      const fallback = (primary || normalized || languageCode).toUpperCase();

      for (const candidate of candidates) {
        try {
          const label = t(`languages.${candidate}`);
          if (label) {
            return label;
          }
        } catch {
          // Ignore missing translations and try next candidate
        }
      }

      return fallback;
    },
    [t],
  );

  const renderPost = (post: BlogPostSummary, index: number, isCompact: boolean) => {
    const displayTitle = post.localizedTitle || post.title;
    const summary = post.aiSummary || post.summary || '';
    const readingTimeLabel = t('readMinutes', {
      minutes: Math.max(1, Math.round(post.readingTimeMinutes || 0)),
    });
    const publishedLabel = formatPublishedDate(post.publishedAt, requestedLanguage);
    const isTranslated =
      post.translated && post.originalLanguage && post.originalLanguage !== requestedLanguage;
    const hasThumbnail = Boolean(post.thumbnailUrl);
    const authorLabel = post.author?.trim();
    const languageBadge = languageLabel(post.language || requestedLanguage);
    const metaLineParts = [authorLabel, languageBadge].filter(Boolean);
    const compact = isCompact;
    const aspectClass = compact ? 'aspect-[16/10]' : isMobile ? 'aspect-[16/10]' : 'aspect-[16/9]';

    return (
      <Link
        key={`${post.slug}-${requestedLanguage}-${index}`}
        href={`/blog/${post.slug}`}
        className={cn(
          'group relative block h-full overflow-hidden rounded-lg border border-border/60 bg-secondary/40 transition-colors',
          'hover:border-primary/50 hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          compact ? 'p-2' : 'p-2.5 sm:p-3',
        )}
      >
        <ArrowUpRight className="absolute right-2 top-2 h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />

        <div
          className={cn(
            'grid h-full gap-2',
            compact
              ? 'grid-cols-[minmax(4.5rem,5.75rem)_1fr]'
              : 'grid-cols-[minmax(5.5rem,6.75rem)_1fr]',
          )}
        >
          <div
            className={cn(
              'relative overflow-hidden rounded-md bg-gradient-to-br from-primary/15 via-slate-500/10 to-indigo-500/15',
              aspectClass,
            )}
          >
            {hasThumbnail ? (
              <Image
                src={post.thumbnailUrl!}
                alt={displayTitle}
                fill
                sizes={isMobile ? '100vw' : compact ? '140px' : '160px'}
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                priority={index === 0}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-primary/60">
                <Newspaper className="h-8 w-8" />
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <div className="space-y-1.5">
              {metaLineParts.length > 0 ? (
                <p
                  className={cn(
                    'text-[11px] font-medium text-muted-foreground/70',
                    compact && 'text-[10px]',
                  )}
                >
                  {metaLineParts.join(' · ')}
                </p>
              ) : (
                <p className="text-[11px] font-medium text-muted-foreground/60">{publishedLabel}</p>
              )}
              <h4
                className={cn(
                  'font-semibold leading-snug text-foreground transition-colors group-hover:text-primary',
                  compact ? 'text-[13px]' : 'text-sm sm:text-[15px]',
                )}
              >
                {displayTitle}
              </h4>
              {summary && (
                <p
                  className={cn(
                    'text-xs text-muted-foreground leading-relaxed',
                    compact ? 'line-clamp-2' : 'line-clamp-2',
                  )}
                >
                  {summary}
                </p>
              )}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1 font-medium text-muted-foreground/85">
                <Clock className="h-3.5 w-3.5" />
                {readingTimeLabel}
              </span>
              <span className="h-1 w-1 rounded-full bg-border/50" aria-hidden />
              <span>{publishedLabel}</span>
              {isTranslated && post.originalLanguage && (
                <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary/80">
                  <Languages className="h-3 w-3" />
                  {t('translatedFrom', { language: languageLabel(post.originalLanguage) })}
                </span>
              )}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const skeletonCount = showMulti ? 2 : 1;
  const skeleton = (
    <div className={cn(showMultiDesktop ? 'grid grid-cols-2 gap-2.5' : 'flex flex-col gap-2.5')}>
      {Array.from({ length: skeletonCount }).map((_, index) => {
        const compact = showMultiDesktop || (showMulti && index > 0);
        return (
          <div
            key={index}
            className="grid gap-2 rounded-lg border border-border/40 bg-secondary/30 p-2.5"
            style={{
              gridTemplateColumns: compact
                ? 'minmax(4.5rem,5.75rem) 1fr'
                : 'minmax(5.5rem,6.75rem) 1fr',
            }}
          >
            <div className="rounded-md bg-muted/30 aspect-[16/10]" />
            <div className="space-y-2">
              <div className="h-3 w-24 rounded bg-muted/40" />
              <div className="h-4 w-3/4 rounded bg-muted/50" />
              <div className="h-3 w-full rounded bg-muted/35" />
              <div className="h-3 w-2/3 rounded bg-muted/25" />
              <div className="mt-2 flex gap-2">
                <div className="h-3 w-20 rounded bg-muted/30" />
                <div className="h-3 w-16 rounded bg-muted/20" />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const errorMessage = error instanceof Error ? error.message : undefined;

  const content = (() => {
    if (topPosts.length === 0) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-semibold text-foreground">{t('emptyTitle')}</p>
          <p className="text-xs text-muted-foreground">{t('emptyDescription')}</p>
        </div>
      );
    }

    if (showMultiDesktop) {
      return (
        <div className="grid grid-cols-2 gap-2.5">
          {topPosts.map((post, index) => renderPost(post, index, true))}
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col gap-2.5">
        {topPosts.map((post, index) => renderPost(post, index, showMulti && index > 0))}
      </div>
    );
  })();

  return (
    <WidgetContainer
      title={tw('blog') || 'Blog'}
      icon={Newspaper}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={errorMessage}
      className="h-full"
      contentClassName="p-2.5 sm:p-3 flex flex-col gap-2"
    >
      {content}
    </WidgetContainer>
  );
}
