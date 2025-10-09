'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  SimpleWidgetCard,
  SimpleWidgetHeader,
  SimpleWidgetValue,
  Sparkline,
  SimpleRangeBar,
} from './SimpleWidgetCard';
import { apiClient } from '@/lib/api/client';
import { useTranslations } from 'next-intl';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';
import { cn } from '@/lib/utils';

interface SimpleHoldersWidgetProps {
  isMobile?: boolean;
  className?: string;
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
            <div className={`${shimmer} h-3 w-16`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className={`${shimmer} h-6 w-16 rounded-full`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      </div>
      <div className={`${shimmer} h-10 w-40`}>
        <div className="absolute inset-0 skeleton-shimmer" />
      </div>
      <div className={`${shimmer} h-9 w-full`}>
        <div className="absolute inset-0 skeleton-shimmer" />
      </div>
      <div className="space-y-2">
        <div className={`${shimmer} h-2 w-full rounded-full`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[hsl(var(--text-secondary))]">
          <div className={`${shimmer} h-3 w-12`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className={`${shimmer} h-3 w-12`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SimpleHoldersWidget({ isMobile = false, className }: SimpleHoldersWidgetProps) {
  const tw = useTranslations('widgets');
  const td = useTranslations('dashboard');
  const tc = useTranslations('common');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['simple-holders-widget'],
    queryFn: () => apiClient.getHoldersWidgetData(),
    refetchInterval: 90_000,
    staleTime: 45_000,
  });

  const widget = data?.widget;
  const current = widget?.current;
  const change24h = widget?.changes?.['24h'];
  const range7d = widget?.ranges?.['7d'];

  const lastUpdatedLabel = useFormattedTimestamp(current?.lastUpdate, {
    absoluteFormat: 'MMM d • HH:mm:ss',
    fallbackAbsolute: '—',
  });

  const sparklineValues = useMemo(() => {
    const source =
      widget?.history?.map((point: any) => Number(point?.value ?? point?.holders)) ??
      widget?.sparkline?.map((point: any) => Number(point?.value ?? point?.holders));
    if (!source) return [];
    return source.filter((value) => Number.isFinite(value));
  }, [widget]);

  const currentDisplay =
    current?.display ??
    (typeof current?.holders === 'number' ? current.holders.toLocaleString() : tc('noData'));
  const currentValue =
    typeof current?.value === 'number'
      ? current.value
      : typeof current?.holders === 'number'
        ? current.holders
        : null;

  const minDisplay =
    range7d?.lowDisplay ??
    (typeof range7d?.low === 'number' ? range7d.low.toLocaleString() : tc('noData'));
  const maxDisplay =
    range7d?.highDisplay ??
    (typeof range7d?.high === 'number' ? range7d.high.toLocaleString() : tc('noData'));

  const rangeProgress =
    currentValue != null &&
    typeof range7d?.low === 'number' &&
    typeof range7d?.high === 'number' &&
    range7d.high !== range7d.low
      ? (currentValue - range7d.low) / (range7d.high - range7d.low)
      : 0.5;

  const isPositive = (change24h?.value ?? 0) > 0;
  const isNegative = (change24h?.value ?? 0) < 0;
  const badgeTrend = isPositive ? 'up' : isNegative ? 'down' : 'neutral';
  const changeDisplay =
    change24h?.display ??
    (change24h?.value != null
      ? `${change24h.value > 0 ? '+' : ''}${change24h.value.toFixed(2)}%`
      : tc('noData'));

  if (isLoading) {
    return (
      <SimpleWidgetCard className={cn('h-full', className)} disableHover>
        {buildSkeleton()}
      </SimpleWidgetCard>
    );
  }

  if (isError || !widget || !current) {
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

  return (
    <SimpleWidgetCard className={cn('h-full', className)}>
      <SimpleWidgetHeader
        icon={<Users className="h-4 w-4" />}
        title={tw('holders')}
        meta={td('communityHolders')}
        action={
          <span
            className={cn('badge-delta', change24h?.value != null && 'is-updated')}
            data-trend={badgeTrend}
          >
            {isPositive && <ArrowUpRight className="h-3.5 w-3.5" />}
            {isNegative && <ArrowDownRight className="h-3.5 w-3.5" />}
            <span>{changeDisplay}</span>
          </span>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <SimpleWidgetValue value={currentDisplay} label={tc('timeRanges.7d')} size="lg" />
          <div className="text-right text-[11px] text-[hsl(var(--text-secondary))]">
            <span className="uppercase tracking-[0.08em]">{tc('lastUpdated')}</span>
            <div className="text-[hsl(var(--text-primary))]">{lastUpdatedLabel}</div>
          </div>
        </div>

        {sparklineValues.length > 1 && (
          <Sparkline
            data={sparklineValues.slice(-30)}
            color="hsl(var(--accent-1))"
            height={isMobile ? 56 : 64}
            strokeWidth={2}
          />
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-secondary))]">
            <span>{tw('low')}</span>
            <span>{tw('high')}</span>
          </div>
          <SimpleRangeBar
            minLabel={minDisplay}
            maxLabel={maxDisplay}
            currentLabel={currentDisplay}
            progress={rangeProgress}
            tone={isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}
          />
        </div>
      </div>
    </SimpleWidgetCard>
  );
}
