'use client';

import { memo } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface SectionLoadingProps {
  rows?: number;
  className?: string;
}

export const SectionLoading = memo(function SectionLoading({
  rows = 3,
  className,
}: SectionLoadingProps) {
  return (
    <div className={cn('space-y-3 animate-pulse', className)} aria-live="polite">
      {Array.from({ length: rows }).map((_, idx) => (
        <div key={idx} className="h-4 rounded-full bg-[hsla(var(--border-card),0.18)]" />
      ))}
    </div>
  );
});

interface SectionErrorProps {
  message?: string;
  onRetry?: () => void;
}

export const SectionError = memo(function SectionError({ message, onRetry }: SectionErrorProps) {
  const t = useTranslations();
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-[hsla(var(--border-card),0.35)] bg-[hsla(var(--background),0.8)] p-4 text-sm text-[hsla(var(--muted-foreground),0.8)]">
      <span>{message ?? t('simple.states.errorFallback')}</span>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-2 rounded-full border border-[hsla(var(--border-card),0.35)] px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--simple-text-primary)] transition-colors hover:bg-[hsla(var(--border-card),0.12)]"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t('simple.actions.retry')}
        </button>
      )}
    </div>
  );
});

interface SectionEmptyProps {
  message?: string;
}

export const SectionEmpty = memo(function SectionEmpty({ message }: SectionEmptyProps) {
  const t = useTranslations();
  return (
    <div className="rounded-2xl border border-dashed border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.65)] p-4 text-sm text-[hsla(var(--muted-foreground),0.75)]">
      {message ?? t('simple.states.emptyFallback')}
    </div>
  );
});
