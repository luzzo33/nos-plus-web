import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { format } from 'date-fns';
import { ArrowLeft, ArrowUpRight, Clock } from 'lucide-react';

import { nosApiFetch } from '@/lib/api/nosApi';
import type { BlogDetailPayload, BlogPostSummary } from '@/lib/api/types';
import { getDateLocale } from '@/lib/utils';
import { BlogSummaryToggle } from '@/components/blog/BlogSummaryToggle';
import { createPageMetadata } from '@/lib/seo/metadata';
import { resolveLocale, isLiveMode } from '@/lib/seo/config';
import { getArticleStructuredData } from '@/lib/seo/structuredData';
import { StructuredData } from '@/components/seo/StructuredData';

interface BlogPostParams {
  locale: string;
  slug: string;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<BlogPostParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const resolvedLocale = resolveLocale(locale);
  const normalizedLang = (resolvedLocale || 'en').split('-')[0] || 'en';
  const payload = await fetchBlogPost(normalizedLang, slug);
  const post = payload?.post;

  const title = post?.localizedTitle || post?.title || slug;
  const description =
    post?.summary || post?.aiSummary || post?.excerpt || post?.localizedSummary || undefined;
  const keywords = Array.isArray(post?.tags) ? post?.tags : undefined;
  const ogImage = post?.thumbnailUrl || post?.socialImageUrl || undefined;

  return createPageMetadata({
    locale: resolvedLocale,
    page: 'blog.article',
    pathSegments: ['blog', slug],
    overrides: {
      title,
      description,
      keywords,
      ogImage,
    },
  });
}

async function fetchBlogPost(language: string, slug: string): Promise<BlogDetailPayload | null> {
  try {
    const payload = await nosApiFetch(
      `/v3/blog/posts/${encodeURIComponent(slug)}?language=${encodeURIComponent(language)}`,
    );
    if (payload?.data?.post) {
      return payload.data as BlogDetailPayload;
    }
    return null;
  } catch {
    return null;
  }
}

function formatPublishedDate(value: string | null, language: string) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return format(date, 'MMMM d, yyyy', { locale: getDateLocale(language) });
  } catch {
    return value;
  }
}

function formatTagLabel(tag: string): string {
  if (!tag) return '';
  const normalized = tag.replace(/[_-]+/g, ' ').trim().toLowerCase();
  return normalized
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default async function BlogPostPage({ params }: { params: Promise<BlogPostParams> }) {
  const { locale, slug } = await params;
  const resolvedLocale = resolveLocale(locale);
  const normalizedLang = (resolvedLocale || 'en').split('-')[0] || 'en';
  const payload = await fetchBlogPost(normalizedLang, slug);

  if (!payload?.post) {
    notFound();
  }

  const { post, related } = payload;
  const t = await getTranslations({ locale: resolvedLocale, namespace: 'blog' });

  const readingTimeLabel = t('readMinutes', {
    minutes: post.readingTimeMinutes,
  });
  const displayTitle = post.localizedTitle || post.title;
  const originalLanguageLabel = post.originalLanguage
    ? t(`languages.${post.originalLanguage}`, {
        defaultMessage: post.originalLanguage.toUpperCase(),
      })
    : null;
  const translationBadge =
    post.translated && post.originalLanguage && post.originalLanguage !== normalizedLang
      ? t('translatedFrom', {
          language: originalLanguageLabel || post.originalLanguage.toUpperCase(),
        })
      : null;

  const hasContentHtml = Boolean(post.contentHtml?.trim()?.length);
  const contentHtml = hasContentHtml
    ? post.contentHtml
    : `<p>${post.aiSummary || post.summary || ''}</p>`;
  const showInlineSummary = Boolean(
    post.summary && post.summary.trim().length && post.summary !== post.aiSummary,
  );

  const structuredData = isLiveMode()
    ? getArticleStructuredData({
        locale: resolvedLocale,
        title: displayTitle,
        description: post.summary || post.aiSummary || post.localizedSummary || post.excerpt || '',
        pathSegments: ['blog', slug],
        publishedAt: post.publishedAt ?? undefined,
        updatedAt: post.updatedAt ?? post.publishedAt ?? undefined,
        authorName: post.author ?? undefined,
        tags: post.tags ?? undefined,
        image: post.thumbnailUrl ?? post.socialImageUrl ?? undefined,
      })
    : null;

  return (
    <>
      {structuredData ? (
        <StructuredData
          id={`structured-data-article-${slug}`}
          data={structuredData}
          strategy="beforeInteractive"
        />
      ) : null}
      <div className="space-y-10">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('backToBlog')}
        </Link>

        <article className="space-y-10">
          <div className="relative overflow-hidden rounded-3xl border border-border bg-card shadow-soft">
            <div className="absolute inset-0 -z-10">
              <div className="absolute -top-10 -right-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
              <div className="absolute bottom-0 left-10 h-40 w-40 rounded-full bg-indigo-400/20 blur-2xl" />
            </div>

            {post.thumbnailUrl ? (
              <div className="relative h-[360px] w-full overflow-hidden">
                <Image
                  src={post.thumbnailUrl}
                  alt={displayTitle}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 1024px"
                  priority
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/60 to-transparent" />
              </div>
            ) : (
              <div className="h-48 w-full bg-gradient-to-br from-primary/20 via-blue-400/10 to-indigo-400/10" />
            )}

            <div className="relative z-10 space-y-6 px-6 pb-10 pt-6 sm:px-10 sm:pt-10">
              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-primary">
                  {t('sourceBadge')}
                </span>
                <span className="rounded-full bg-background/80 px-3 py-1 text-muted-foreground">
                  {formatPublishedDate(post.publishedAt, normalizedLang)}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-background/70 px-3 py-1 text-muted-foreground">
                  <Clock className="h-3.5 w-3.5" />
                  {readingTimeLabel}
                </span>
                {translationBadge && (
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {translationBadge}
                  </span>
                )}
              </div>

              <div className="space-y-4">
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                  {displayTitle}
                </h1>
                {showInlineSummary && (
                  <p className="max-w-3xl text-base text-muted-foreground sm:text-lg">
                    {post.summary}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  {t('sourceNotice')}{' '}
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

              <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
                {post.author && (
                  <span className="rounded-full bg-background/80 px-3 py-1">{post.author}</span>
                )}
                {(post.tags || []).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-background/80 px-3 py-1 text-muted-foreground"
                  >
                    {formatTagLabel(tag)}
                  </span>
                ))}
              </div>

              <BlogSummaryToggle
                summary={post.aiSummary}
                title={t('aiSummaryTitle')}
                showLabel={t('aiSummaryShow')}
                hideLabel={t('aiSummaryHide')}
                unavailableLabel={t('aiSummaryUnavailable')}
              />

              {post.url && (
                <Link
                  href={post.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
                >
                  {t('officialBlogCta')}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card/90 p-6 shadow-soft sm:p-10">
            {!hasContentHtml && (
              <div className="mb-4 rounded-2xl border border-border/50 bg-muted/20 p-4 text-sm text-muted-foreground">
                {t('noBodyFallback')}
              </div>
            )}
            <div className="blog-content" dangerouslySetInnerHTML={{ __html: contentHtml }} />
          </div>
        </article>

        {related.length > 0 && (
          <section className="space-y-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                {t('relatedStories')}
              </h2>
              <Link
                href="https://nosana.com/blog"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary transition hover:text-primary/80"
              >
                {t('viewBlog')}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {related.map((item) => (
                <RelatedCard
                  key={item.slug}
                  post={item}
                  language={normalizedLang}
                  readMinutesLabel={t('readMinutes', {
                    minutes: item.readingTimeMinutes,
                  })}
                  readStoryLabel={t('readStory')}
                  fallbackSummary={t('noSummary')}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function RelatedCard({
  post,
  language,
  readMinutesLabel,
  readStoryLabel,
  fallbackSummary,
}: {
  post: BlogPostSummary;
  language: string;
  readMinutesLabel: string;
  readStoryLabel: string;
  fallbackSummary: string;
}) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-3xl border border-border/60 bg-card/80 shadow-soft backdrop-blur transition hover:border-primary/50 hover:shadow-lg"
    >
      {post.thumbnailUrl ? (
        <div className="relative h-40 w-full overflow-hidden">
          <Image
            src={post.thumbnailUrl}
            alt={post.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 640px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
        </div>
      ) : (
        <div className="h-40 w-full bg-gradient-to-br from-primary/20 via-blue-400/10 to-indigo-400/10" />
      )}

      <div className="flex flex-1 flex-col gap-4 p-6">
        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-muted-foreground/80">
          <span>{formatPublishedDate(post.publishedAt, language)}</span>
          <span>{readMinutesLabel}</span>
        </div>
        <h3 className="text-lg font-semibold leading-tight text-foreground transition group-hover:text-primary">
          {post.localizedTitle || post.title}
        </h3>
        <p className="line-clamp-3 text-sm text-muted-foreground">
          {post.aiSummary || post.summary || post.preview || fallbackSummary}
        </p>
        <div className="mt-auto flex flex-wrap gap-2 pt-2">
          {(post.tags || []).slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
            >
              {formatTagLabel(tag)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
