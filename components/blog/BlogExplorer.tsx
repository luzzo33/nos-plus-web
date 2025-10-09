'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { ArrowUpRight, Calendar, Clock, Info, Tag as TagIcon } from 'lucide-react';

import type { BlogListPayload, BlogPostSummary } from '@/lib/api/types';
import { cn, getDateLocale } from '@/lib/utils';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

function formatTagLabel(tag: string): string {
  if (!tag) return '';
  const normalized = tag.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

interface BlogExplorerProps {
  initialData?: BlogListPayload | null;
  fallbackLanguage: string;
}

function formatPublishedDate(value: string | null, locale: string) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return format(date, 'MMM d, yyyy', { locale: getDateLocale(locale) });
  } catch {
    return value;
  }
}

function getPostTags(posts: BlogPostSummary[]) {
  const tags = new Set<string>();
  posts.forEach((post) => {
    (post.tags || []).forEach((tag) => {
      if (tag) {
        tags.add(tag);
      }
    });
  });
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
}

export default function BlogExplorer({ initialData, fallbackLanguage }: BlogExplorerProps) {
  const t = useTranslations('blog');
  const fallbackPayload = useMemo<BlogListPayload>(
    () => ({
      posts: [],
      availableLanguages: [fallbackLanguage],
      requestedLanguage: fallbackLanguage,
    }),
    [fallbackLanguage],
  );
  const data = initialData ?? fallbackPayload;
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(7);

  const posts = data?.posts ?? [];
  const requestedLanguage = data?.requestedLanguage || fallbackLanguage;

  const allTags = useMemo(() => getPostTags(posts), [posts]);

  const filteredPosts = useMemo(() => {
    if (!selectedTag) {
      return posts;
    }
    const normalized = selectedTag.toLowerCase();
    return posts.filter((post) => post.tags?.some((tag) => tag.toLowerCase() === normalized));
  }, [posts, selectedTag]);

  useEffect(() => {
    setVisibleCount(7);
  }, [selectedTag]);

  const visiblePosts = filteredPosts.slice(0, visibleCount);
  const featuredPost = visiblePosts[0];
  const secondaryPosts = visiblePosts.slice(1);

  const lastUpdated = posts.length ? posts[0].publishedAt : null;
  const hasMorePosts = visibleCount < filteredPosts.length;

  const handleTagClick = (tag: string | null) => {
    setSelectedTag((current) => (current === tag ? null : tag));
  };

  const showSkeleton = !initialData && posts.length === 0;

  return (
    <div className="space-y-12">
      <section className="relative overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-primary/10 via-secondary/30 to-primary/5 p-8 shadow-soft">
        <div className="absolute inset-0 -z-10 opacity-70">
          <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
          <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-indigo-400/20 blur-2xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.14),_transparent_55%)]" />
        </div>

        <div className="grid gap-10 lg:grid-cols-[1.8fr,1fr]">
          {showSkeleton ? (
            <>
              <div className="space-y-8">
                <div className="flex flex-col gap-3">
                  <SkeletonBlock className="h-5 w-32 rounded-full" />
                  <SkeletonBlock className="h-10 w-3/4 rounded-lg" />
                  <SkeletonBlock className="h-4 w-full rounded-lg" />
                  <SkeletonBlock className="h-4 w-2/3 rounded-lg" />
                </div>
                <div className="flex flex-wrap gap-3">
                  {Array.from({ length: 2 }).map((_, idx) => (
                    <SkeletonBlock key={idx} className="h-6 w-24 rounded-full" />
                  ))}
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <SkeletonBlock className="h-4 w-28 rounded-lg" />
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <SkeletonBlock key={idx} className="h-7 w-20 rounded-full" />
                  ))}
                </div>
                <SkeletonBlock className="h-20 w-full rounded-2xl" />
              </div>
              <div className="flex h-full min-h-[320px] items-center justify-center rounded-3xl border border-border/60 bg-card/80 shadow-soft backdrop-blur">
                <SkeletonBlock className="h-full w-full rounded-3xl" />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-8">
                <div className="flex flex-col gap-3">
                  <span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary">
                    {t('heroEyebrow')}
                  </span>
                  <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                    {t('heroTitle')}
                  </h1>
                  <p className="max-w-2xl text-base text-muted-foreground sm:text-lg">
                    {t('heroSubtitle')}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <StatPill
                    icon={<Calendar className="h-4 w-4" />}
                    label={t('statsPosts')}
                    value={String(posts.length)}
                  />
                  <StatPill
                    icon={<Clock className="h-4 w-4" />}
                    label={t('statsUpdated')}
                    value={formatPublishedDate(lastUpdated, requestedLanguage)}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <TagIcon className="h-4 w-4" />
                    {t('tagLabel')}
                  </div>
                  <TagChip
                    label={t('allTopics')}
                    active={!selectedTag}
                    onClick={() => handleTagClick(null)}
                  />
                  {allTags.map((tag) => (
                    <TagChip
                      key={tag}
                      label={formatTagLabel(tag)}
                      active={selectedTag === tag}
                      onClick={() => handleTagClick(tag)}
                    />
                  ))}
                </div>

                <div className="rounded-2xl border border-border/50 bg-background/80 p-4 text-sm text-muted-foreground shadow-soft">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 text-primary">
                      <Info className="h-4 w-4" />
                    </span>
                    <p>
                      {t('communityNote')}{' '}
                      <Link
                        href="https://nosana.com/blog"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-semibold text-primary hover:text-primary/80"
                      >
                        {t('officialBlogLinkLabel')}
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {featuredPost ? (
                  <motion.div
                    key={`${featuredPost.slug}-${requestedLanguage}-${selectedTag}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -12 }}
                    transition={{ duration: 0.25 }}
                    className="group relative flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-soft backdrop-blur"
                  >
                    {featuredPost.thumbnailUrl ? (
                      <div className="relative h-52 w-full overflow-hidden">
                        <Image
                          src={featuredPost.thumbnailUrl}
                          alt={featuredPost.title}
                          fill
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                          sizes="(max-width: 768px) 100vw, 360px"
                          priority
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-transparent" />
                      </div>
                    ) : (
                      <div className="h-52 w-full bg-gradient-to-br from-primary/30 via-blue-400/20 to-indigo-400/20" />
                    )}

                    <div className="relative z-10 flex flex-1 flex-col gap-4 p-6">
                      <div className="flex items-center justify-between gap-4 text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
                        <span>{formatPublishedDate(featuredPost.publishedAt, requestedLanguage)}</span>
                        <span>{t('readMinutes', { minutes: featuredPost.readingTimeMinutes })}</span>
                      </div>
                      <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                        {featuredPost.localizedTitle || featuredPost.title}
                      </h2>
                      <p className="line-clamp-3 text-sm text-muted-foreground">
                        {featuredPost.aiSummary ||
                          featuredPost.summary ||
                          featuredPost.preview ||
                          t('noSummary')}
                      </p>

                      <div className="mt-auto flex items-center justify-between gap-4 pt-2">
                        <div className="flex flex-wrap gap-2">
                          {(featuredPost.tags || []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border/50 bg-background/80 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                            >
                              {formatTagLabel(tag)}
                            </span>
                          ))}
                        </div>
                        <Link
                          href={`/blog/${featuredPost.slug}`}
                          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"
                        >
                          {t('readStory')}
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex h-full items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/50 p-10 text-center"
                  >
                    <div className="space-y-2">
                      <h2 className="text-xl font-semibold text-foreground">{t('emptyTitle')}</h2>
                      <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {showSkeleton ? (
            <SkeletonBlock className="h-7 w-40 rounded-lg" />
          ) : (
            <h2 className="text-2xl font-semibold tracking-tight text-foreground">
              {t('latestStories')}
            </h2>
          )}
          {showSkeleton ? (
            <SkeletonBlock className="h-5 w-32 rounded-lg" />
          ) : (
            <Link
              href="https://nosana.com/blog"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm font-medium text-primary transition hover:text-primary/80"
            >
              {t('viewBlog')}
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        {showSkeleton ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={idx}
                className="flex h-full flex-col gap-4 rounded-3xl border border-border/60 bg-card/80 p-6 shadow-soft"
              >
                <SkeletonBlock className="h-40 w-full rounded-2xl" />
                <SkeletonBlock className="h-4 w-3/4 rounded-lg" />
                <SkeletonBlock className="h-4 w-full rounded-lg" />
                <SkeletonBlock className="h-3 w-full rounded-lg" />
                <SkeletonBlock className="h-3 w-2/3 rounded-lg" />
                <SkeletonBlock className="mt-auto h-8 w-28 rounded-full" />
              </div>
            ))}
          </div>
        ) : secondaryPosts.length === 0 ? (
          <div className="flex items-center justify-center rounded-3xl border border-dashed border-border/70 bg-card/40 p-12 text-center">
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-foreground">{t('emptyTitle')}</h3>
              <p className="text-sm text-muted-foreground">{t('emptyDescription')}</p>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {secondaryPosts.map((post, index) => (
              <BlogCard
                key={`${post.slug}-${requestedLanguage}-${visibleCount}-${index}`}
                post={post}
                language={requestedLanguage}
                delay={index * 0.05}
                label={t('readMinutes', { minutes: post.readingTimeMinutes })}
                readStoryLabel={t('readStory')}
                fallbackSummary={t('noSummary')}
              />
            ))}
          </div>
        )}

        {!showSkeleton && hasMorePosts && (
          <div className="flex justify-center pt-2">
            <button
              type="button"
              onClick={() => setVisibleCount((count) => count + 6)}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2 text-sm font-semibold text-primary transition hover:border-primary hover:text-primary"
            >
              {t('loadMore')}
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function StatPill({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs font-semibold text-muted-foreground backdrop-blur">
      <span className="text-primary">{icon}</span>
      <span>{label}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
        active
          ? 'border-primary bg-primary text-primary-foreground shadow-sm'
          : 'border-border/60 bg-background/70 text-muted-foreground hover:border-primary/60 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}

function BlogCard({
  post,
  language,
  delay,
  label,
  readStoryLabel,
  fallbackSummary,
}: {
  post: BlogPostSummary;
  language: string;
  delay?: number;
  label: string;
  readStoryLabel: string;
  fallbackSummary: string;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10%' }}
      transition={{ duration: 0.25, delay }}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-soft backdrop-blur"
    >
      {post.thumbnailUrl ? (
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={post.thumbnailUrl}
            alt={post.localizedTitle || post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
        </div>
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-primary/20 via-blue-400/10 to-indigo-400/10" />
      )}

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wide text-muted-foreground/80">
          <span>{formatPublishedDate(post.publishedAt, language)}</span>
          <span>{label}</span>
        </div>

        <Link
          href={`/blog/${post.slug}`}
          className="text-lg font-semibold leading-tight text-foreground transition hover:text-primary"
        >
          {post.localizedTitle || post.title}
        </Link>

        <p className="line-clamp-3 text-sm text-muted-foreground">
          {post.aiSummary || post.summary || post.preview || fallbackSummary}
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-2">
          <div className="flex flex-wrap gap-1.5">
            {(post.tags || []).slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
              >
                {formatTagLabel(tag)}
              </span>
            ))}
          </div>
          <Link
            href={`/blog/${post.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition hover:text-primary/80"
          >
            {readStoryLabel}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
