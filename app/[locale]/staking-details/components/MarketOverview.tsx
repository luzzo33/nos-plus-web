'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  RefreshCw,
  BarChart3,
  TrendingUpDown,
  Percent,
  Target,
  Activity,
  TrendingUp,
  ChevronDown,
} from 'lucide-react';
import { format } from 'date-fns';
import { cn, getDateLocale } from '@/lib/utils';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations, useLocale } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';
import type {
  ContractWidgetData,
  ContractWidgetChange,
  ContractWidgetRangeEntry,
} from '@/lib/api/types';

const METRIC_TABS = [
  { id: 'total', short: 'TOT', translation: 'metrics.total' },
  { id: 'staking', short: 'STK', translation: 'metrics.staked' },
  { id: 'unstaking', short: 'USTK', translation: 'metrics.unstaking' },
] as const;

type MetricKey = (typeof METRIC_TABS)[number]['id'];

type MarketOverviewProps = {
  widget: ContractWidgetData | undefined;
  stats: any;
  statsRange: TimeRange;
  mounted: boolean;
  loading?: boolean;
  onStatsRangeChange: (range: TimeRange) => void;
  onRefresh: () => void;
  refreshing: boolean;
  metric: MetricKey;
  onMetricChange: (metric: MetricKey) => void;
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

const resolveChange = (change?: ContractWidgetChange) => {
  if (!change) return '—';
  if (change.display) return stripNosSuffix(change.display) ?? change.display;
  if (typeof change.percentage === 'number') return formatPercent(change.percentage);
  if (typeof change.absolute === 'number') return formatNos(change.absolute);
  return '—';
};

const toFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '');
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
};

const resolveRange = (entry?: ContractWidgetRangeEntry) => {
  if (!entry) return null;
  const lowValue = toFiniteNumber(entry.low);
  const highValue = toFiniteNumber(entry.high);
  const averageValue = toFiniteNumber(entry.average);
  return {
    low: lowValue,
    high: highValue,
    average: averageValue,
    lowDisplay: stripNosSuffix(entry.lowDisplay) ?? formatNos(lowValue ?? undefined),
    highDisplay: stripNosSuffix(entry.highDisplay) ?? formatNos(highValue ?? undefined),
    averageDisplay: stripNosSuffix(entry.averageDisplay) ?? formatNos(averageValue ?? undefined),
  };
};

export function MarketOverview({
  widget,
  stats,
  statsRange,
  mounted,
  loading = false,
  onStatsRangeChange,
  onRefresh,
  refreshing,
  metric,
  onMetricChange,
}: MarketOverviewProps) {
  const { text } = useFontScale();
  const locale = useLocale();
  const t = useTranslations('stakingDetails.marketOverview');
  const ttStats = useTranslations('stakingDetails.stats.tooltips');
  const tc = useTranslations('common');
  const [showTimeframePicker, setShowTimeframePicker] = useState(false);

  const hydrated = mounted || loading;
  if (!hydrated) return null;

  const timeRanges = useMemo(
    () => [
      { value: '24h', label: tc('timeRanges.24h'), description: tc('timeRangeDescriptions.24h') },
      { value: '7d', label: tc('timeRanges.7d'), description: tc('timeRangeDescriptions.7d') },
      { value: '30d', label: tc('timeRanges.30d'), description: tc('timeRangeDescriptions.30d') },
      { value: '90d', label: tc('timeRanges.90d'), description: tc('timeRangeDescriptions.90d') },
      {
        value: '180d',
        label: tc('timeRanges.180d'),
        description: tc('timeRangeDescriptions.180d'),
      },
      { value: '1y', label: tc('timeRanges.1y'), description: tc('timeRangeDescriptions.1y') },
    ],
    [tc],
  );

  if (loading || !widget) {
    return (
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="relative skeleton h-6 w-32 rounded-lg">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative skeleton h-9 w-28 rounded-lg">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className="relative skeleton h-9 w-9 rounded-lg">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className="flex items-center gap-1">
              {METRIC_TABS.map((tab) => (
                <div key={tab.id} className="relative skeleton h-7 w-10 rounded" />
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="card-base p-3 md:p-4">
              <div className="space-y-2">
                <div className="relative skeleton h-3 w-20 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-6 w-24 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-3 w-16 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const metricLabel = t(
    METRIC_TABS.find((tab) => tab.id === metric)?.translation ?? 'metrics.total',
  );
  const currentMetric = widget[metric];
  const currentValue = toFiniteNumber(currentMetric?.current);
  const changeEntry = widget.changes?.[statsRange]?.[metric];
  const rangeEntry = resolveRange(widget.ranges?.[statsRange]?.[metric]);
  const avg30Entry = widget.ranges?.['30d']?.[metric];
  const athEntry = widget.ath?.[metric];
  const atlEntry = widget.atl?.[metric];

  const percentOfAvg30 = (() => {
    const avg30Average = toFiniteNumber(avg30Entry?.average);
    if (currentValue == null || avg30Average == null || avg30Average === 0) return 100;
    return Math.min(Math.max((currentValue / avg30Average) * 100, 0), 400);
  })();

  const ranking =
    percentOfAvg30 > 200
      ? 'rankingExtremelyHigh'
      : percentOfAvg30 > 110
        ? 'rankingHigh'
        : percentOfAvg30 < 90
          ? 'rankingLow'
          : 'rankingNormal';

  const rankingColor = (() => {
    switch (ranking) {
      case 'rankingExtremelyHigh':
        return 'text-green-500';
      case 'rankingHigh':
        return 'text-emerald-500';
      case 'rankingLow':
        return 'text-red-500';
      default:
        return 'text-yellow-500';
    }
  })();

  const rangeLowValue = rangeEntry?.low ?? null;
  const rangeHighValue = rangeEntry?.high ?? null;
  const rangeAverageValue =
    typeof rangeEntry?.average === 'number' && Number.isFinite(rangeEntry.average)
      ? rangeEntry.average
      : null;
  const rangeLowDisplay = rangeEntry?.lowDisplay ?? '—';
  const rangeHighDisplay = rangeEntry?.highDisplay ?? '—';
  const rangeProgressPct = (() => {
    if (
      rangeLowValue == null ||
      rangeHighValue == null ||
      !Number.isFinite(rangeLowValue) ||
      !Number.isFinite(rangeHighValue) ||
      rangeHighValue <= rangeLowValue
    ) {
      return 0;
    }
    const baselineCurrent =
      typeof currentValue === 'number' && Number.isFinite(currentValue)
        ? currentValue
        : (rangeAverageValue ?? rangeLowValue);
    const ratio = ((baselineCurrent - rangeLowValue) / (rangeHighValue - rangeLowValue)) * 100;
    if (!Number.isFinite(ratio)) return 0;
    return Math.min(Math.max(ratio, 0), 100);
  })();

  const volatilityPct = (() => {
    const volatility =
      stats?.metrics?.extended?.stability?.[metric]?.volatility ??
      stats?.metrics?.extended?.stability?.[metric];
    if (typeof volatility === 'number') return volatility;
    return Number(stats?.historical?.[metric]?.changePercent) || 0;
  })();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div className="flex items-center justify-between mb-4">
        <h2 className={text('base', 'lg', 'font-semibold')}>{t('title')}</h2>
        <div className="flex items-center gap-2">
          <span className={cn(text('xs', 'sm'), 'text-muted-foreground hidden sm:inline')}>
            {t('range')}:
          </span>
          <div className="relative">
            <button
              onClick={() => setShowTimeframePicker((open) => !open)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                text('xs', 'sm'),
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              {tc(`timeRanges.${statsRange}` as any)}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showTimeframePicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTimeframePicker(false)} />
                <div className="absolute right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-20 p-2 min-w-[180px]">
                  {timeRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => {
                        onStatsRangeChange(range.value as TimeRange);
                        setShowTimeframePicker(false);
                      }}
                      className={cn(
                        'block w-full px-3 py-1.5 text-left rounded hover:bg-secondary transition-colors',
                        text('xs', 'sm'),
                        statsRange === (range.value as TimeRange) && 'bg-secondary',
                      )}
                      title={range.description}
                    >
                      {range.label} — {range.description}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className={cn(
              'p-2 rounded-lg hover:bg-secondary transition-all',
              refreshing && 'animate-spin',
            )}
            title={t('refresh')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1 ml-2">
            {METRIC_TABS.map(({ id, short }) => (
              <button
                key={id}
                onClick={() => onMetricChange(id)}
                className={cn(
                  'px-2 py-1 rounded-md text-xs font-medium transition-colors',
                  metric === id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
                )}
              >
                {short}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>{metricLabel}</span>
          </div>
          <p className={text('base', 'lg', 'font-bold')}>
            {stripNosSuffix(currentMetric?.display) ?? formatNos(currentValue ?? undefined)}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {t('lastUpdated')}{' '}
            {widget.lastUpdate
              ? format(new Date(widget.lastUpdate), 'HH:mm', { locale: getDateLocale(locale) })
              : '—'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <TrendingUpDown className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
              {tc(`timeRanges.${statsRange}` as any)} {t('range')}
            </span>
          </div>
          {rangeEntry ? (
            <div className="mt-1">
              <p className={cn(text('sm', 'base', 'font-medium'))}>
                {rangeLowDisplay} - {rangeHighDisplay}
              </p>
              <div className="h-1.5 bg-secondary rounded-full mt-2 relative overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${rangeProgressPct}%` }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                />
              </div>
            </div>
          ) : (
            <p className={cn(text('sm', 'base'), 'text-muted-foreground mt-2')}>{tc('na')}</p>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <Percent className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
              {tc(`timeRanges.${statsRange}` as any)} {t('change')}
            </span>
          </div>
          <p
            className={cn(
              text('base', 'lg', 'font-bold'),
              (changeEntry?.percentage ?? 0) >= 0 ? 'text-green-500' : 'text-red-500',
            )}
          >
            {resolveChange(changeEntry)}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {(changeEntry?.percentage ?? 0) >= 0 ? tc('uptrend') : tc('downtrend')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>{t('ath')}</span>
          </div>
          <p className={text('sm', 'base', 'font-bold')}>
            {stripNosSuffix(athEntry?.display) ?? 'N/A'}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {athEntry?.date
              ? format(new Date(athEntry.date), 'MMM d, yyyy', { locale: getDateLocale(locale) })
              : '—'}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            <span
              className={cn(text('2xs', 'xs'), 'text-muted-foreground flex items-center gap-1')}
            >
              {t('volatility')}
              <UiTooltip content={ttStats('dailyChange')}>
                <span className="inline-flex">
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    className="text-muted-foreground/80"
                  >
                    <circle cx="12" cy="12" r="10" fill="currentColor" />
                  </svg>
                </span>
              </UiTooltip>
            </span>
          </div>
          <p className={text('base', 'lg', 'font-bold')}>{formatPercent(volatilityPct, 1)}</p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {volatilityPct < 10 ? tc('low') : volatilityPct < 20 ? tc('moderate') : tc('high')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all"
        >
          <div className="flex items-center justify-between mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>{t('ranking')}</span>
          </div>
          <p className={cn(text('sm', 'base', 'font-bold capitalize'), rankingColor)}>
            {t(ranking)}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {`${percentOfAvg30.toFixed(0)}% ${t('ofAvg')}`}
          </p>
        </motion.div>
      </div>
    </motion.div>
  );
}
