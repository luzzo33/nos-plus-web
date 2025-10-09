'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, DollarSign } from 'lucide-react';
import {
  SimpleWidgetCard,
  SimpleWidgetHeader,
  SimpleWidgetValue,
  Sparkline,
  SimpleRangeBar,
} from './SimpleWidgetCard';
import { Tooltip } from '@/components/ui/Tooltip';
import { apiClient } from '@/lib/api/client';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';

interface SimplePriceWidgetProps {
  isMobile?: boolean;
  className?: string;
}

function buildSkeleton() {
  const row = 'relative overflow-hidden rounded-md bg-[hsl(var(--border-card)_/_0.2)]';
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${row} h-8 w-8`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <div className={`${row} h-3 w-24`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className={`${row} h-3 w-16`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className={`${row} h-6 w-16 rounded-full`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      </div>
      <div className="space-y-3">
        <div className={`${row} h-10 w-40`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
        <div className={`${row} h-14 w-full`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      </div>
      <div className="space-y-2">
        <div className={`${row} h-2 w-full rounded-full`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
        <div className="flex items-center justify-between text-[11px] text-[hsl(var(--text-secondary))]">
          <div className={`${row} h-3 w-12`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className={`${row} h-3 w-12`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SimplePriceWidget({ isMobile = false, className }: SimplePriceWidgetProps) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const locale = useLocale();

  const {
    data: priceData,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['widget-price-info'],
    queryFn: () => apiClient.getWidgetData('usd'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const widget = priceData?.widget;
  const { data: chartData } = useQuery({
    queryKey: ['price-chart-simple-24h'],
    queryFn: () => apiClient.getChartData({ range: '24h', currency: 'usd' }),
    refetchInterval: 120_000,
    staleTime: 60_000,
    enabled: Boolean(widget),
  });

  const change = widget?.changes?.['24h'];
  const range = widget?.ranges?.['24h'];
  const isPositive = (change?.value ?? 0) > 0;
  const isNegative = (change?.value ?? 0) < 0;

  const lastUpdatedLabel = useFormattedTimestamp(widget?.metadata?.lastUpdate, {
    absoluteFormat: 'MMM d • HH:mm:ss',
    fallbackAbsolute: '—',
  });

  const lastUpdatedDate = widget?.metadata?.lastUpdate
    ? new Date(widget.metadata.lastUpdate)
    : undefined;

  const currentPrice =
    widget?.price?.display && widget.price.display !== '--' ? widget.price.display : tc('noData');

  const changeDisplay =
    change?.display ??
    (change?.value != null
      ? `${change.value > 0 ? '+' : ''}${change.value.toFixed(2)}%`
      : tc('noData'));

  const rangeLowDisplay =
    range?.lowDisplay && range.lowDisplay !== '--' ? range.lowDisplay : tc('noData');
  const rangeHighDisplay =
    range?.highDisplay && range.highDisplay !== '--' ? range.highDisplay : tc('noData');

  const sparklineData = useMemo<number[]>(() => {
    if (!chartData?.chart) return [];
    const raw = Array.isArray(chartData.chart.data)
      ? chartData.chart.data
      : Array.isArray((chartData.chart as any)?.data)
        ? (chartData.chart as any).data
        : [];
    return raw
      .slice(-32)
      .map((point: any) => Number(point?.price ?? point?.value ?? 0))
      .filter((value) => Number.isFinite(value));
  }, [chartData]);

  const currentValue = widget?.price?.current ?? null;
  const highValue = range?.high ?? currentValue;
  const lowValue = range?.low ?? currentValue;

  const rangeProgress =
    currentValue != null && lowValue != null && highValue != null && highValue !== lowValue
      ? (currentValue - lowValue) / (highValue - lowValue)
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

  const tooltipTime = lastUpdatedDate
    ? new Intl.DateTimeFormat(locale, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(lastUpdatedDate)
    : null;

  const badgeTrend = isPositive ? 'up' : isNegative ? 'down' : 'neutral';

  return (
    <SimpleWidgetCard className={cn('h-full', className)}>
      <SimpleWidgetHeader
        icon={<DollarSign className="h-4 w-4" />}
        title={tw('price')}
        meta={tc('timeRanges.24h')}
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <Tooltip
            content={
              <div className="space-y-1">
                <p className="font-semibold text-[hsl(var(--text-primary))]">{currentPrice}</p>
                {tooltipTime && (
                  <p className="text-[hsl(var(--text-secondary))]">
                    {tw('lastUpdated')}: {tooltipTime}
                  </p>
                )}
                {widget.price?.source && (
                  <p className="text-[hsl(var(--text-secondary))]">
                    {tc('source')}: {widget.price.source}
                  </p>
                )}
              </div>
            }
            placement="bottom"
          >
            <SimpleWidgetValue
              value={currentPrice}
              label={tw('currentPrice')}
              size={isMobile ? 'lg' : 'xl'}
            />
          </Tooltip>

          <span
            className={cn('badge-delta', change?.value != null && 'is-updated')}
            data-trend={badgeTrend}
          >
            {isPositive && <ArrowUpRight className="h-3.5 w-3.5" />}
            {isNegative && <ArrowDownRight className="h-3.5 w-3.5" />}
            <span>{changeDisplay}</span>
          </span>
        </div>

        {sparklineData.length > 1 && (
          <Sparkline
            data={sparklineData}
            color={
              isPositive
                ? 'hsl(var(--pos))'
                : isNegative
                  ? 'hsl(var(--neg))'
                  : 'hsl(var(--accent-1))'
            }
            height={isMobile ? 56 : 72}
            strokeWidth={2}
            className="mt-1"
          />
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--text-secondary))]">
            <span>{tw('low24h')}</span>
            <span>{tw('high24h')}</span>
          </div>
          <SimpleRangeBar
            minLabel={rangeLowDisplay}
            maxLabel={rangeHighDisplay}
            currentLabel={currentPrice}
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
