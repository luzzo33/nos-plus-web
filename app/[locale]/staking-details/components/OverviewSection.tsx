'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUpDown, BarChart3, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';
import type {
  ContractWidgetChange,
  ContractWidgetData,
  ContractWidgetRangeEntry,
} from '@/lib/api/types';

const DEFAULT_EXPANDED: TimeRange[] = ['24h', '7d', '30d'];
const ALL_RANGES: TimeRange[] = ['24h', '7d', '30d', '90d', '180d', '1y'];

type MetricKey = 'total' | 'staking' | 'unstaking';

interface OverviewSectionProps {
  widget: ContractWidgetData | undefined;
  stats: any;
  statsRange: TimeRange;
  mounted: boolean;
  metric: MetricKey;
  loading?: boolean;
}

type RangeRenderEntry = {
  period: string;
  resolved: ReturnType<typeof resolveRange>;
  changeDisplay: string | null;
  changeIsPositive: boolean;
  averageDisplay: string;
  percentOfAverage: number | null;
  percentWidth: number;
};

const formatNos = (value?: number | null) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${(value / 1e6).toFixed(2)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(2)}K`;
  return value.toFixed(2);
};

const formatPercent = (value?: number | null, digits = 2) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—';
  return `${value >= 0 ? '+' : ''}${value.toFixed(digits)}%`;
};

const stripNosSuffix = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') return value ?? undefined;
  return value.replace(/\s*NOS$/i, '').trim();
};

const formatChange = (change?: ContractWidgetChange) => {
  if (!change) return '—';
  if (change.display) return stripNosSuffix(change.display) ?? change.display;
  if (typeof change.percentage === 'number') return formatPercent(change.percentage);
  if (typeof change.absolute === 'number') return formatNos(change.absolute);
  return '—';
};

const resolveRange = (entry?: ContractWidgetRangeEntry) => {
  if (!entry) return null;
  const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value === 'string') {
      const normalized = value.replace(/[^0-9.-]/g, '');
      if (!normalized) return null;
      const parsed = Number(normalized);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  const lowValue = toNumber(entry.low);
  const highValue = toNumber(entry.high);
  const averageValue = toNumber(entry.average);
  const changeValue = toNumber(entry.changePercentage);

  const formatDisplay = (value: number | null, fallback?: string) =>
    value == null ? (fallback ?? '—') : formatNos(value);

  const changeDisplay =
    entry.changeDisplay ?? (changeValue != null ? formatPercent(changeValue) : '—');

  return {
    low: lowValue,
    high: highValue,
    average: averageValue,
    lowDisplay: stripNosSuffix(entry.lowDisplay) ?? formatDisplay(lowValue),
    highDisplay: stripNosSuffix(entry.highDisplay) ?? formatDisplay(highValue),
    averageDisplay: stripNosSuffix(entry.averageDisplay) ?? formatDisplay(averageValue),
    changeDisplay,
    changePercentage: changeValue,
  };
};

export function OverviewSection({
  widget,
  stats,
  statsRange,
  mounted,
  metric,
  loading = false,
}: OverviewSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakingDetails.overview');
  const tm = useTranslations('stakingDetails.marketOverview');
  const tc = useTranslations('common');
  const [expandedRanges, setExpandedRanges] = useState<TimeRange[]>(DEFAULT_EXPANDED);
  const hydrated = mounted || loading;
  const showSkeleton = loading || !widget;

  const metricLabels: Record<MetricKey, string> = {
    total: tm('metrics.total'),
    staking: tm('metrics.staked'),
    unstaking: tm('metrics.unstaking'),
  };

  const currentMetric = widget?.[metric];
  const currentValue =
    typeof currentMetric?.current === 'number'
      ? currentMetric.current
      : currentMetric?.current != null
        ? Number(currentMetric.current)
        : null;
  const ranges = widget?.ranges ?? {};
  const changes = widget?.changes ?? {};
  const metricLabel = metricLabels[metric];

  const percentOfAvg30 = (() => {
    const rawAvg = widget?.ranges?.['30d']?.[metric]?.average;
    const avgValue =
      typeof rawAvg === 'number'
        ? Number.isFinite(rawAvg)
          ? rawAvg
          : null
        : typeof rawAvg === 'string'
          ? (() => {
              const parsed = Number(rawAvg);
              return Number.isFinite(parsed) ? parsed : null;
            })()
          : null;
    if (avgValue == null || avgValue === 0 || currentValue == null) return 100;
    return Math.min(Math.max((currentValue / avgValue) * 100, 0), 400);
  })();

  const volatilityVal = (() => {
    const extended = stats?.metrics?.extended;
    const volatilityForMetric =
      extended?.stability?.[metric]?.volatility ?? extended?.stability?.[metric];
    if (typeof volatilityForMetric === 'number') return volatilityForMetric;
    return Number(stats?.historical?.[metric]?.changePercent) || 0;
  })();

  const historicalMetrics = stats?.historical?.[metric] ?? {};

  const changeEntries = useMemo(() => {
    return Object.entries(changes ?? {})
      .filter(([period]) => period !== 'all')
      .map(([period, data]) => ({
        period,
        change: (data as Record<MetricKey, ContractWidgetChange | undefined>)[metric],
      }))
      .filter((entry) => entry.change);
  }, [changes, metric]);

  const rangeEntries = useMemo<RangeRenderEntry[]>(() => {
    if (!ranges) return [];
    return Object.entries(ranges)
      .map(([period, data]) => {
        const rawEntry = (data as Record<MetricKey, ContractWidgetRangeEntry | undefined>)[metric];
        if (!rawEntry) return null;
        const resolved = resolveRange(rawEntry);
        if (!resolved) return null;
        const changeEntry = changes?.[period as TimeRange]?.[metric];
        const formattedChange = formatChange(changeEntry);
        const changeDisplay = formattedChange === '—' ? null : formattedChange;
        const changeValue = changeEntry?.percentage ?? changeEntry?.absolute ?? 0;
        const averageValue =
          resolved.average ??
          (resolved.low != null && resolved.high != null
            ? (resolved.low + resolved.high) / 2
            : null);
        const averageDisplay =
          resolved.averageDisplay ?? (averageValue != null ? formatNos(averageValue) : '—');
        const percentOfAverage =
          averageValue != null && averageValue !== 0 && typeof currentValue === 'number'
            ? Math.min(Math.max((currentValue / averageValue) * 100, 0), 200)
            : null;
        const percentWidth =
          percentOfAverage != null && Number.isFinite(percentOfAverage)
            ? Math.min(percentOfAverage, 100)
            : 0;
        return {
          period,
          resolved,
          changeDisplay,
          changeIsPositive: Number(changeValue ?? 0) >= 0,
          averageDisplay,
          percentOfAverage,
          percentWidth,
        };
      })
      .filter((entry): entry is RangeRenderEntry => Boolean(entry));
  }, [ranges, metric, changes, currentValue]);

  if (!hydrated) {
    return null;
  }

  if (showSkeleton) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="card-base p-4 md:p-6">
          <div className="relative skeleton h-5 w-48 mb-4 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-2 md:p-3 bg-secondary/40 rounded-lg">
                <div className="space-y-2">
                  <div className="relative skeleton h-3 w-16 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                  <div className="relative skeleton h-5 w-20 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-base p-4 md:p-6 space-y-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="space-y-1">
                <div className="relative skeleton h-3 w-24 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-4 w-full rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
          <div className="card-base p-4 md:p-6 space-y-3">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="relative skeleton h-3 w-24 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-4 w-16 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('changesTitle', { metric: metricLabel })}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {changeEntries.map(({ period, change }) => {
            const pct = change?.percentage;
            const isPositive = (pct ?? 0) >= 0;
            return (
              <div
                key={period}
                className="text-center p-2 md:p-3 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors"
              >
                <p
                  className={cn(
                    text('3xs', '2xs'),
                    'text-muted-foreground mb-0.5 font-medium uppercase',
                  )}
                >
                  {tc(`timeRanges.${period}` as any)}
                </p>
                <p
                  className={cn(
                    text('base', 'lg', 'font-bold'),
                    isPositive ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {typeof pct === 'number' ? formatPercent(pct) : formatChange(change)}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-base p-4 md:p-6">
          <h3
            className={cn(
              text('base', 'lg', 'font-semibold'),
              'mb-3 md:mb-4 flex items-center gap-2',
            )}
          >
            <TrendingUpDown className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            {t('rangesTitle', { metric: metricLabel })}
          </h3>
          <div className="space-y-3">
            {rangeEntries.map(
              ({
                period,
                resolved,
                changeDisplay,
                changeIsPositive,
                averageDisplay,
                percentOfAverage,
                percentWidth,
              }) => (
                <AnimatePresence key={period}>
                  {expandedRanges.includes(period as TimeRange) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="p-3 bg-secondary/30 rounded-lg space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(text('xs', 'sm', 'font-medium uppercase'))}>
                          {tc(`timeRanges.${period}` as any)}
                        </span>
                        {changeDisplay && (
                          <span
                            className={cn(
                              text('xs', 'sm', 'font-bold'),
                              changeIsPositive ? 'text-green-500' : 'text-red-500',
                            )}
                          >
                            {changeDisplay}
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs">
                        <div>
                          <span className="text-muted-foreground">{tc('low')}</span>
                          <span className="ml-1 font-medium">{resolved.lowDisplay}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            {t('avg', { default: 'Avg' } as any)}
                          </span>
                          <span className="ml-1 font-medium">{averageDisplay}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">{tc('high')}</span>
                          <span className="ml-1 font-medium">{resolved.highDisplay}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                          {tc('current')}
                        </span>
                        <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-500"
                            style={{ width: `${percentWidth}%` }}
                          />
                        </div>
                        <span
                          className={cn(
                            text('2xs', 'xs', 'font-medium'),
                            percentOfAverage != null &&
                              Number.isFinite(percentOfAverage) &&
                              percentOfAverage > 100
                              ? 'text-green-500'
                              : '',
                          )}
                        >
                          {percentOfAverage != null && Number.isFinite(percentOfAverage)
                            ? percentOfAverage.toFixed(0)
                            : '0'}
                          %
                        </span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ),
            )}
          </div>
          <button
            onClick={() =>
              setExpandedRanges((prev) =>
                prev.length === ALL_RANGES.length ? DEFAULT_EXPANDED : ALL_RANGES,
              )
            }
            className={cn(
              text('xs', 'xs'),
              'mt-3 text-primary hover:text-primary/80 transition-colors flex items-center gap-1',
            )}
          >
            {expandedRanges.length === ALL_RANGES.length ? t('showLess') : t('showAllRanges')}
            <ChevronDown
              className={cn(
                'w-3 h-3 transition-transform',
                expandedRanges.length === ALL_RANGES.length && 'rotate-180',
              )}
            />
          </button>
        </div>

        {(stats?.historical || stats?.metrics) && (
          <div className="card-base p-4 md:p-6">
            <h3
              className={cn(
                text('base', 'lg', 'font-semibold'),
                'mb-3 md:mb-4 flex items-center gap-2',
              )}
            >
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              {t('statisticsTitle', { metric: metricLabel })}
              <span className={cn(text('xs', 'xs'), 'text-muted-foreground font-normal')}>
                ({tc(`timeRanges.${stats?.historical?.period ?? statsRange}` as any)})
              </span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('currentValue', { metric: metricLabel })}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  {stripNosSuffix(currentMetric?.display) ?? '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('averageValue', { metric: metricLabel })}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  {formatNos(historicalMetrics?.average ?? historicalMetrics?.avg)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('medianValue', { metric: metricLabel })}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  {formatNos(historicalMetrics?.median)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('volatility')}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  {formatPercent(volatilityVal, 1)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('dataPoints')}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  {stats?.historical?.dataPoints ?? stats?.historical?.count ?? '—'}
                </span>
              </div>
            </div>
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground text-center mt-3 pt-3 border-t border-border',
              )}
            >
              {t('statisticsFooter', {
                range: tc(`timeRanges.${stats?.historical?.period ?? statsRange}` as any),
              })}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
