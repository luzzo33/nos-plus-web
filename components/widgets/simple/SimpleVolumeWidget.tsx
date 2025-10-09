'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import {
  SimpleWidgetCard,
  SimpleWidgetHeader,
  SimpleWidgetValue,
  SimpleRangeBar,
} from './SimpleWidgetCard';
import { apiClient } from '@/lib/api/client';
import { useTranslations, useLocale } from 'next-intl';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';
import { cn } from '@/lib/utils';

interface SimpleVolumeWidgetProps {
  isMobile?: boolean;
  className?: string;
}

interface MiniBarPoint {
  key: string;
  value: number;
  heightPercent: number;
  display: string;
  timestampLabel?: string;
  isLatest: boolean;
}

function buildSkeleton() {
  const shimmerBlock = 'relative overflow-hidden rounded-md bg-[hsl(var(--border-card)_/_0.2)]';
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${shimmerBlock} h-8 w-8`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <div className={`${shimmerBlock} h-3 w-20`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className={`${shimmerBlock} h-3 w-14`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className={`${shimmerBlock} h-6 w-16 rounded-full`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      </div>
      <div className={`${shimmerBlock} h-9 w-32`}>
        <div className="absolute inset-0 skeleton-shimmer" />
      </div>
      <div className={`${shimmerBlock} h-10 w-full`}>
        <div className="absolute inset-0 skeleton-shimmer" />
      </div>
      <div className="space-y-2">
        <div className={`${shimmerBlock} h-2 w-full rounded-full`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[hsl(var(--text-secondary))]">
          <div className={`${shimmerBlock} h-3 w-12`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className={`${shimmerBlock} h-3 w-12`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniBarChart({ bars, noDataLabel }: { bars: MiniBarPoint[]; noDataLabel: string }) {
  if (!bars.length) {
    return (
      <div className="flex h-10 items-center justify-center rounded-md bg-[hsl(var(--border-card)_/_0.12)] text-xs text-[hsl(var(--text-secondary))]">
        {noDataLabel}
      </div>
    );
  }

  return (
    <div className="flex h-10 items-end gap-1.5 rounded-md bg-[hsl(var(--border-card)_/_0.15)] px-2 py-1.5">
      {bars.map((bar) => (
        <div
          key={bar.key}
          className={cn(
            'flex-1 rounded-t-sm transition-colors',
            bar.isLatest
              ? 'bg-[hsl(var(--accent-1))]'
              : 'bg-[hsl(var(--accent-1)_/_0.4)] hover:bg-[hsl(var(--accent-1)_/_0.55)]',
          )}
          style={{ height: `${bar.heightPercent}%` }}
          title={bar.timestampLabel ? `${bar.timestampLabel} • ${bar.display}` : bar.display}
          aria-label={bar.display}
        />
      ))}
    </div>
  );
}

export function SimpleVolumeWidget({ isMobile = false, className }: SimpleVolumeWidgetProps) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const locale = useLocale();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['simple-volume-widget'],
    queryFn: () => apiClient.getVolumeWidgetData(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const widget = data?.widget;
  const change = widget?.changes?.['24h'];
  const range = widget?.ranges?.['24h'];
  const latestVolumeNode = widget?.current ?? widget?.volume;

  const lastUpdatedLabel = useFormattedTimestamp(
    latestVolumeNode?.lastUpdate ?? widget?.metadata?.lastUpdate,
    {
      absoluteFormat: 'MMM d • HH:mm:ss',
      fallbackAbsolute: '—',
    },
  );

  const currentVolumeDisplay =
    latestVolumeNode?.display ??
    (latestVolumeNode?.current != null
      ? new Intl.NumberFormat(locale, {
          notation: 'compact',
          maximumFractionDigits: 1,
        }).format(latestVolumeNode.current)
      : tc('noData'));

  const currentVolumeValue: number | null =
    typeof latestVolumeNode?.value === 'number'
      ? latestVolumeNode.value
      : typeof latestVolumeNode?.current === 'number'
        ? latestVolumeNode.current
        : null;

  const isPositive = (change?.value ?? 0) > 0;
  const isNegative = (change?.value ?? 0) < 0;
  const badgeTrend = isPositive ? 'up' : isNegative ? 'down' : 'neutral';

  const changeDisplay =
    change?.display ??
    (change?.value != null
      ? `${change.value > 0 ? '+' : ''}${change.value.toFixed(2)}%`
      : tc('noData'));

  const miniBars = useMemo<MiniBarPoint[]>(() => {
    const seriesRaw = widget?.sparkline ?? widget?.history ?? [];
    if (!Array.isArray(seriesRaw) || !seriesRaw.length) return [];

    const sample = seriesRaw.slice(-7);
    const values = sample
      .map((point: any) => Number(point?.volume ?? point?.value ?? point))
      .filter((value) => Number.isFinite(value));

    if (!values.length) return [];

    const max = Math.max(...values);
    const min = Math.min(...values);
    const span = max - min || max || 1;

    const numberFormatter = new Intl.NumberFormat(locale, {
      notation: 'compact',
      maximumFractionDigits: 1,
    });
    const dateFormatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
    });

    return sample.map((point: any, index) => {
      const rawValue = Number(point?.volume ?? point?.value ?? 0);
      const baseHeight = Math.min(1, Math.max(0, span ? (rawValue - min) / span : 0.5));
      const heightPercent = 25 + baseHeight * 70;
      const timestamp = point?.timestamp ?? point?.time ?? point?.date;
      return {
        key: `${timestamp ?? index}`,
        value: rawValue,
        heightPercent,
        display: numberFormatter.format(rawValue),
        timestampLabel: timestamp ? dateFormatter.format(new Date(timestamp)) : undefined,
        isLatest: index === sample.length - 1,
      };
    });
  }, [widget, locale]);

  const dexPercent = widget?.distribution?.dexPercentage;
  const cexPercent = widget?.distribution?.cexPercentage;

  const rangeLowDisplay =
    range?.lowDisplay && range.lowDisplay !== '--' ? range.lowDisplay : tc('noData');
  const rangeHighDisplay =
    range?.highDisplay && range.highDisplay !== '--' ? range.highDisplay : tc('noData');

  const rangeProgress =
    currentVolumeValue != null &&
    typeof range?.low === 'number' &&
    typeof range?.high === 'number' &&
    range.high !== range.low
      ? (currentVolumeValue - range.low) / (range.high - range.low)
      : 0.5;

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

  return (
    <SimpleWidgetCard className={cn('h-full', className)}>
      <SimpleWidgetHeader
        icon={<Activity className="h-4 w-4" />}
        title={tw('volume')}
        meta={tc('timeRanges.24h')}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <SimpleWidgetValue value={currentVolumeDisplay} label={tc('timeRanges.24h')} size="lg" />
          <span
            className={cn('badge-delta', change?.value != null && 'is-updated')}
            data-trend={badgeTrend}
          >
            {isPositive && <ArrowUpRight className="h-3.5 w-3.5" />}
            {isNegative && <ArrowDownRight className="h-3.5 w-3.5" />}
            <span>{changeDisplay}</span>
          </span>
        </div>

        <MiniBarChart bars={miniBars} noDataLabel={tc('noData')} />

        {(dexPercent != null || cexPercent != null) && (
          <div className="flex flex-wrap gap-3 text-[11px] uppercase tracking-[0.08em] text-[hsl(var(--text-secondary))]">
            {dexPercent != null && Number.isFinite(dexPercent) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--border-card)_/_0.25)] px-2 py-1 font-semibold text-[hsl(var(--text-primary))]">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--accent-1))]" />
                {tw('dexShare')}: {dexPercent.toFixed(1)}%
              </span>
            )}
            {cexPercent != null && Number.isFinite(cexPercent) && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--border-card)_/_0.25)] px-2 py-1 font-semibold text-[hsl(var(--text-primary))]">
                <span className="h-2 w-2 rounded-full bg-[hsl(var(--info))]" />
                {tw('cexShare')}: {cexPercent.toFixed(1)}%
              </span>
            )}
          </div>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-secondary))]">
            <span>{tw('low24h')}</span>
            <span>{tw('high24h')}</span>
          </div>
          <SimpleRangeBar
            minLabel={rangeLowDisplay}
            maxLabel={rangeHighDisplay}
            currentLabel={currentVolumeDisplay}
            progress={rangeProgress}
            tone={isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}
          />
        </div>

        <div className="flex items-center justify-end text-[11px] text-[hsl(var(--text-secondary))]">
          <span className="uppercase tracking-[0.08em]">{tw('lastUpdated')}:</span>
          <span className="ml-2 text-[hsl(var(--text-primary))]">{lastUpdatedLabel}</span>
        </div>
      </div>
    </SimpleWidgetCard>
  );
}
