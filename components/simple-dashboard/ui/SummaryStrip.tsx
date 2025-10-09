'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import styles from '@/components/simple-dashboard/SimpleDashboardShell.module.css';
import {
  useSimpleSummary,
  type SummaryMetric,
} from '@/components/simple-dashboard/hooks/useSimpleSummary';
import { useTranslations } from 'next-intl';

interface SummaryStripProps {
  className?: string;
}

export const SummaryStrip = memo(function SummaryStrip({ className }: SummaryStripProps) {
  const { metrics, isLoading } = useSimpleSummary();
  const t = useTranslations();

  return (
    <div className={cn(styles.summarySticky, className)} aria-label={t('simple.summary.ariaLabel')}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[hsla(var(--muted-foreground),0.75)]">
            {t('simple.summary.title')}
          </span>
          <span className="text-sm font-medium text-[hsla(var(--foreground),0.68)]">
            {isLoading ? t('simple.summary.loading') : t('simple.summary.updated')}
          </span>
        </div>
      </div>

      <div className={cn(styles.summaryRow)} role="list">
        <AnimatePresence initial={false}>
          {metrics.map((metric) => (
            <SummaryMetricCard key={metric.key} metric={metric} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

interface SummaryMetricCardProps {
  metric: SummaryMetric;
}

const SummaryMetricCard = memo(function SummaryMetricCard({ metric }: SummaryMetricCardProps) {
  const t = useTranslations();
  const directionClass =
    metric.direction === 'up'
      ? 'text-[var(--simple-pos)]'
      : metric.direction === 'down'
        ? 'text-[var(--simple-neg)]'
        : 'text-[hsla(var(--muted-foreground),0.72)]';

  return (
    <motion.div
      role="listitem"
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={cn(
        'rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.82)] px-3 py-2.5',
        'shadow-[var(--simple-shadow-base)] backdrop-blur-sm',
        'focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-[hsla(var(--accent),0.35)]',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
          {t(metric.labelKey)}
        </span>
        {metric.hintKey && (
          <span className="text-[10px] font-medium text-[hsla(var(--muted-foreground),0.5)]">
            {t(metric.hintKey)}
          </span>
        )}
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-base font-semibold tracking-tight text-[var(--simple-text-primary)]">
          {metric.value}
        </span>
        <span className={cn('text-[11px] font-semibold', directionClass)}>
          {metric.changeLabel ?? '—'}
        </span>
      </div>
      {metric.unavailable && (
        <span className="mt-2 block text-[10px] font-medium text-[hsla(var(--muted-foreground),0.52)]">
          {t('simple.summary.unavailable')}
        </span>
      )}
    </motion.div>
  );
});
