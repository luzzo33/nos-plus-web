'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Clock3, RefreshCcw, Sparkles } from 'lucide-react';

import { cn } from '@/lib/utils';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

export function ChangelogContent() {
  const tNav = useTranslations('nav');
  const tCommon = useTranslations('common');

  const [markdown, setMarkdown] = useState<string>('');
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const heading = tNav('changelog');
  const intro = tCommon('changelogIntro');
  const errorLabel = tCommon('error');
  const retryLabel = tCommon('retry');
  const lastUpdatedLabel = tCommon('lastUpdated');

  const baseUrl = process.env.NEXT_PUBLIC_NOS_API_BASE;
  const changelogUrl = useMemo(() => (baseUrl ? `${baseUrl}/v3/changelog` : null), [baseUrl]);

  const fetchChangelog = useCallback(async () => {
    if (!changelogUrl) {
      setStatus('error');
      setErrorMessage('NOS API base URL is not configured.');
      return;
    }

    setStatus('loading');
    setErrorMessage(null);

    try {
      const response = await fetch(changelogUrl, { cache: 'no-store' });
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const payload = (await response.json()) as { markdown?: string } | null;
      if (!payload?.markdown) {
        throw new Error('No changelog content found.');
      }

      setMarkdown(payload.markdown);
      setStatus('success');
    } catch (err) {
      const reason = err instanceof Error ? err.message : 'Unknown error';
      setErrorMessage(reason);
      setStatus('error');
    }
  }, [changelogUrl]);

  useEffect(() => {
    fetchChangelog();
  }, [fetchChangelog]);

  const cleanedMarkdown = useMemo(() => {
    if (!markdown) return '';
    return markdown.replace(/^# [^\n]+\n+/, '').trim();
  }, [markdown]);

  const latestReleaseDate = useMemo(() => {
    if (!markdown) return null;
    const matches = [...markdown.matchAll(/##\s+[^\n]*\(([^)]+)\)/g)];
    if (matches.length === 0) return null;
    const firstMatch = matches[0];
    return firstMatch?.[1] ?? null;
  }, [markdown]);

  const markdownComponents = useMemo<Components>(() => {
    return {
      h1: () => null,
      h2: ({ node, className, children, ...rest }) => (
        <h2
          className={cn(
            'text-2xl font-semibold text-foreground border-b border-border/60 pb-3 mt-12 first:mt-0',
            className,
          )}
          {...rest}
        >
          {children}
        </h2>
      ),
      h3: ({ node, className, children, ...rest }) => (
        <h3
          className={cn(
            'text-sm uppercase tracking-wide text-primary/90 font-semibold mt-8 mb-3',
            className,
          )}
          {...rest}
        >
          {children}
        </h3>
      ),
      p: ({ node, className, children, ...rest }) => (
        <p
          className={cn(
            'leading-relaxed text-muted-foreground text-base md:text-[17px]',
            className,
          )}
          {...rest}
        >
          {children}
        </p>
      ),
      ul: ({ node, className, children, ...rest }) => (
        <ul
          className={cn(
            'space-y-2 list-disc pl-6 marker:text-primary text-muted-foreground',
            className,
          )}
          {...rest}
        >
          {children}
        </ul>
      ),
      li: ({ node, className, children, ...rest }) => (
        <li className={cn('leading-relaxed', className)} {...rest}>
          {children}
        </li>
      ),
      strong: ({ node, className, children, ...rest }) => (
        <strong className={cn('text-foreground font-semibold', className)} {...rest}>
          {children}
        </strong>
      ),
      em: ({ node, className, children, ...rest }) => (
        <em className={cn('text-muted-foreground/90', className)} {...rest}>
          {children}
        </em>
      ),
    };
  }, []);

  const renderContent = () => {
    if (status === 'loading') {
      return (
        <div className="space-y-6">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="space-y-3">
              <SkeletonBlock className="h-5 w-40 rounded-lg" />
              <SkeletonBlock className="h-4 w-full rounded-lg" />
              <SkeletonBlock className="h-4 w-5/6 rounded-lg" />
              <SkeletonBlock className="h-4 w-3/4 rounded-lg" />
            </div>
          ))}
        </div>
      );
    }

    if (status === 'error') {
      return (
        <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
          <AlertTriangle className="h-7 w-7 text-amber-400" />
          <div className="space-y-1">
            <p className="text-base font-medium text-foreground">{errorLabel}</p>
            <p className="text-sm text-muted-foreground">
              {errorMessage ?? 'Unable to load the changelog right now.'}
            </p>
          </div>
          <button
            type="button"
            onClick={fetchChangelog}
            className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary/60 hover:text-primary"
          >
            <RefreshCcw className="h-4 w-4" />
            {retryLabel}
          </button>
        </div>
      );
    }

    if (status === 'success') {
      return (
        <div className="prose prose-invert max-w-none">
          <ReactMarkdown components={markdownComponents}>{cleanedMarkdown}</ReactMarkdown>
        </div>
      );
    }

    return null;
  };

  return (
    <section className="relative mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-12 md:py-16">
      <div className="text-center space-y-4">
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          NOS.plus
        </span>
        <h1 className="text-4xl font-semibold text-foreground md:text-5xl">{heading}</h1>
        <p className="mx-auto max-w-2xl text-base text-muted-foreground">{intro}</p>
        {latestReleaseDate ? (
          <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1.5 text-sm text-muted-foreground shadow-inner">
            <Clock3 className="h-4 w-4 text-primary" />
            <span>
              {lastUpdatedLabel}: <span className="font-medium text-foreground">{latestReleaseDate}</span>
            </span>
          </div>
        ) : null}
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/80 shadow-lg shadow-black/10 backdrop-blur">
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-cyan-400 to-emerald-400" />
        <div className="px-6 py-8 md:px-10 md:py-12">{renderContent()}</div>
      </div>
    </section>
  );
}
