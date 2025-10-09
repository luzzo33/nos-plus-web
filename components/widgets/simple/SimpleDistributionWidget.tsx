'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Info } from 'lucide-react';
import { SimpleWidgetCard, SimpleWidgetHeader } from './SimpleWidgetCard';
import { Tooltip } from '@/components/ui/Tooltip';
import { apiClient } from '@/lib/api/client';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface SimpleDistributionWidgetProps {
  isMobile?: boolean;
  className?: string;
}

const SEGMENT_COLORS: string[] = [
  'hsl(var(--accent-1))',
  'hsl(var(--info))',
  'hsl(var(--pos))',
  'hsl(var(--warn))',
  'hsl(var(--accent-1)_/_0.55)',
  'hsl(var(--info)_/_0.55)',
];

interface DistributionSegment {
  key: string;
  label: string;
  percentage: number;
  percentageLabel: string;
  countLabel: string;
  color: string;
}

function buildSkeleton() {
  const shimmer = 'relative overflow-hidden rounded-md bg-[hsl(var(--border-card)_/_0.2)]';
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${shimmer} h-8 w-8`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <div className={`${shimmer} h-3 w-24`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className={`${shimmer} h-3 w-20`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className={`${shimmer} h-3 w-16`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      </div>
      <div className={`${shimmer} h-8 w-full`}>
        <div className="absolute inset-0 skeleton-shimmer" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className={`${shimmer} h-6 w-20`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleDistributionWidget({
  isMobile = false,
  className,
}: SimpleDistributionWidgetProps) {
  const tw = useTranslations('widgets');
  const th = useTranslations('holders');
  const tc = useTranslations('common');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['simple-distribution-widget'],
    queryFn: () => apiClient.getDistributionWidgetData(),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const widget = data?.widget;

  const segments = useMemo<DistributionSegment[]>(() => {
    if (!widget?.current?.percentages) return [];
    const percentages = widget.current.percentages;
    const brackets = widget.current.brackets ?? {};
    const total = widget.current.total ?? 0;

    const entries = Object.keys(percentages)
      .map((key, index) => {
        const percentage = Number(percentages[key] ?? 0);
        if (!Number.isFinite(percentage) || percentage <= 0) return null;

        const count = (brackets as Record<string, number | undefined>)[key];
        const color = SEGMENT_COLORS[index % SEGMENT_COLORS.length];
        return {
          key,
          label: th.has?.(key) ? th(key) : key,
          percentage,
          percentageLabel: `${percentage.toFixed(1)}%`,
          countLabel:
            count != null
              ? count.toLocaleString()
              : total
                ? `${((percentage / 100) * total).toFixed(0)}`
                : '—',
          color,
        };
      })
      .filter(Boolean) as DistributionSegment[];

    return entries.sort((a, b) => b.percentage - a.percentage);
  }, [widget, th]);

  const totalAccounts = widget?.current?.total?.toLocaleString() ?? '—';

  if (isLoading) {
    return (
      <SimpleWidgetCard className={cn('h-full', className)} disableHover>
        {buildSkeleton()}
      </SimpleWidgetCard>
    );
  }

  if (isError || !widget) {
    return (
      <SimpleWidgetCard className={cn('h-full', className)} disableHover>
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[hsl(var(--text-secondary))]">
          <span>{tc('noData')}</span>
          {error instanceof Error && (
            <span className="text-xs text-[hsl(var(--text-secondary))]">{error.message}</span>
          )}
        </div>
      </SimpleWidgetCard>
    );
  }

  const legendContent = (
    <div className="space-y-2">
      {segments.slice(0, 6).map((segment) => (
        <div key={segment.key} className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-[hsl(var(--text-secondary))]">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
            {segment.label}
          </div>
          <span className="text-xs font-semibold text-[hsl(var(--text-primary))]">
            {segment.percentageLabel}
          </span>
        </div>
      ))}
    </div>
  );

  return (
    <SimpleWidgetCard className={cn('h-full', className)}>
      <SimpleWidgetHeader
        icon={<BarChart3 className="h-4 w-4" />}
        title={tw('distribution')}
        meta={`${tw('totalAccounts')}: ${totalAccounts}`}
      />

      <div className="flex flex-col gap-4">
        <div className="flex h-8 overflow-hidden rounded-full border border-[hsl(var(--border-card)_/_0.45)] bg-[hsl(var(--border-card)_/_0.1)]">
          {segments.length ? (
            segments.map((segment) => (
              <div
                key={segment.key}
                className="relative h-full"
                style={{
                  flexGrow: Math.max(segment.percentage, 0.5),
                  backgroundColor: segment.color,
                }}
                title={`${segment.label} • ${segment.percentageLabel}`}
              >
                <span className="sr-only">
                  {segment.label} {segment.percentageLabel}
                </span>
              </div>
            ))
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-[hsl(var(--text-secondary))]">
              {tc('noData')}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2">
          <div className="hidden flex-wrap items-center gap-2 text-xs font-semibold text-[hsl(var(--text-primary))] sm:flex">
            {segments.slice(0, 4).map((segment) => (
              <span
                key={segment.key}
                className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--border-card)_/_0.25)] px-2.5 py-1"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: segment.color }} />
                {segment.label}
                <span className="text-[hsl(var(--text-secondary))]">{segment.percentageLabel}</span>
              </span>
            ))}
          </div>

          <div className="sm:hidden">
            <Tooltip content={legendContent} className="max-w-xs text-xs" placement="top">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[hsl(var(--border-card)_/_0.25)] text-[hsl(var(--text-secondary))]">
                <Info className="h-3.5 w-3.5" />
              </span>
            </Tooltip>
          </div>
        </div>
      </div>
    </SimpleWidgetCard>
  );
}
