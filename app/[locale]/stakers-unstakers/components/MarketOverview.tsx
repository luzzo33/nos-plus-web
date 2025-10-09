'use client';

import { useState } from 'react';
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
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations, useLocale } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';

interface MarketOverviewProps {
  widget: any;
  stats: any;
  statsRange: TimeRange;
  mounted: boolean;
  loading?: boolean;
  onStatsRangeChange: (range: TimeRange) => void;
  onRefresh: () => void;
  refreshing: boolean;
  metric: 'total' | 'stakers' | 'unstakers';
  onMetricChange: (m: 'total' | 'stakers' | 'unstakers') => void;
}

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
  const t = useTranslations('stakersUnstakers.marketOverview');
  const ttStats = useTranslations('stakersUnstakers.stats.tooltips');
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');
  const [showTimeframePicker, setShowTimeframePicker] = useState(false);

  const timeRanges: { value: TimeRange; label: string; description: string }[] = [
    { value: '24h', label: tc('timeRanges.24h'), description: tc('timeRangeDescriptions.24h') },
    { value: '7d', label: tc('timeRanges.7d'), description: tc('timeRangeDescriptions.7d') },
    { value: '30d', label: tc('timeRanges.30d'), description: tc('timeRangeDescriptions.30d') },
    { value: '90d', label: tc('timeRanges.90d'), description: tc('timeRangeDescriptions.90d') },
    { value: '180d', label: tc('timeRanges.180d'), description: tc('timeRangeDescriptions.180d') },
    { value: '1y', label: tc('timeRanges.1y'), description: tc('timeRangeDescriptions.1y') },
  ];

  const isHydrated = mounted || loading;
  if (!isHydrated) return null;

  if (loading || !widget) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <SkeletonBlock className="h-6 w-40 rounded-lg" />
          <div className="flex items-center gap-3">
            <SkeletonBlock className="h-9 w-32 rounded-lg" />
            <SkeletonBlock className="h-9 w-28 rounded-lg" />
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
          <div className="card-base p-4 md:p-6 space-y-4">
            <SkeletonBlock className="h-5 w-48 rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2 rounded-lg bg-secondary/50 p-3">
                  <SkeletonBlock className="h-3 w-20 rounded-lg" />
                  <SkeletonBlock className="h-4 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          <div className="card-base p-4 md:p-6 space-y-3">
            <SkeletonBlock className="h-4 w-36 rounded-lg" />
            <SkeletonBlock className="h-5 w-24 rounded-lg" />
            <SkeletonBlock className="h-4 w-full rounded-lg" />
            <SkeletonBlock className="h-3 w-28 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card-base p-4 md:p-6 space-y-3">
              <SkeletonBlock className="h-4 w-28 rounded-lg" />
              <SkeletonBlock className="h-6 w-24 rounded-lg" />
              <SkeletonBlock className="h-3 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!mounted) return null;

  const statsCurrent = stats?.current;
  const currentTotal = (() => {
    if (metric === 'total') {
      return Number(statsCurrent?.total ?? widget?.accounts?.total?.count ?? 0);
    }
    if (metric === 'stakers') {
      return Number(statsCurrent?.stakers ?? widget?.accounts?.staking?.count ?? 0);
    }
    return Number(statsCurrent?.unstakers ?? widget?.accounts?.unstaking?.count ?? 0);
  })();

  const avg30Total =
    metric === 'total'
      ? Number(widget?.ranges?.['30d']?.accounts?.total?.average) ||
        (Number(widget?.ranges?.['30d']?.accounts?.total?.low) +
          Number(widget?.ranges?.['30d']?.accounts?.total?.high)) /
          2 ||
        0
      : metric === 'stakers'
        ? Number(widget?.ranges?.['30d']?.accounts?.staking?.average) ||
          (Number(widget?.ranges?.['30d']?.accounts?.staking?.low) +
            Number(widget?.ranges?.['30d']?.accounts?.staking?.high)) /
            2 ||
          0
        : Number(widget?.ranges?.['30d']?.accounts?.unstaking?.average) ||
          (Number(widget?.ranges?.['30d']?.accounts?.unstaking?.low) +
            Number(widget?.ranges?.['30d']?.accounts?.unstaking?.high)) /
            2 ||
          0;

  const percentOfAvg30Metric = avg30Total > 0 ? (currentTotal / avg30Total) * 100 : 100;

  const rankingToday =
    percentOfAvg30Metric > 200
      ? 'Extremely High'
      : percentOfAvg30Metric > 110
        ? 'High'
        : percentOfAvg30Metric < 90
          ? 'Low'
          : 'Normal';

  const rangeData =
    metric === 'total'
      ? widget?.ranges?.[statsRange]?.accounts?.total
      : metric === 'stakers'
        ? widget?.ranges?.[statsRange]?.accounts?.staking
        : widget?.ranges?.[statsRange]?.accounts?.unstaking;

  const toNumeric = (raw: unknown, fallback?: unknown) => {
    if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
    if (typeof raw === 'string') {
      const sanitized = Number(raw.replace(/[^\d.-]/g, ''));
      if (Number.isFinite(sanitized)) return sanitized;
    }
    if (typeof fallback === 'number' && Number.isFinite(fallback)) return fallback;
    if (typeof fallback === 'string') {
      const sanitized = Number(fallback.replace(/[^\d.-]/g, ''));
      if (Number.isFinite(sanitized)) return sanitized;
    }
    return null;
  };

  const lowValue = toNumeric(rangeData?.low, rangeData?.lowDisplay);
  const highValue = toNumeric(rangeData?.high, rangeData?.highDisplay);
  const lowDisplay =
    rangeData?.lowDisplay ?? (lowValue != null ? Number(lowValue).toLocaleString() : 'N/A');
  const highDisplay =
    rangeData?.highDisplay ?? (highValue != null ? Number(highValue).toLocaleString() : 'N/A');
  const currentRangeValue =
    toNumeric(rangeData?.current, rangeData?.currentDisplay) ??
    (Number.isFinite(currentTotal) ? Number(currentTotal) : null);

  const changeObj =
    metric === 'total'
      ? widget?.changes?.[statsRange]?.accounts?.total
      : metric === 'stakers'
        ? widget?.changes?.[statsRange]?.accounts?.staking
        : widget?.changes?.[statsRange]?.accounts?.unstaking;

  const volatilityPct = (() => {
    const stab = stats?.metrics?.accounts?.stability;
    if (!stab) return 0;
    if (metric === 'total' && typeof stab.total?.volatility === 'number')
      return stab.total.volatility;
    if (metric === 'stakers' && typeof stab.stakers?.volatility === 'number')
      return stab.stakers.volatility;
    if (metric === 'unstakers' && typeof stab.unstakers?.volatility === 'number')
      return stab.unstakers.volatility;
    return 0;
  })();

  const progressPct = (() => {
    if (
      lowValue == null ||
      highValue == null ||
      !Number.isFinite(lowValue) ||
      !Number.isFinite(highValue) ||
      highValue <= lowValue
    ) {
      return 0;
    }
    const current = Number.isFinite(currentRangeValue ?? NaN)
      ? (currentRangeValue as number)
      : Number.isFinite(currentTotal)
        ? Number(currentTotal)
        : lowValue;
    const ratio = ((current - lowValue) / (highValue - lowValue)) * 100;
    if (!Number.isFinite(ratio)) return 0;
    return Math.min(Math.max(ratio, 0), 100);
  })();

  return (
    <div>
      {/* Stats Timeframe Selector (parity with Raydium) */}
      <div className="flex items-center justify-between mb-4">
        <h2 className={text('base', 'lg', 'font-semibold')}>{t('title')}</h2>
        <div className="flex items-center gap-2">
          <span className={cn(text('xs', 'sm'), 'text-muted-foreground hidden sm:inline')}>
            {t('range')}:
          </span>
          <div className="relative">
            <button
              onClick={() => setShowTimeframePicker(!showTimeframePicker)}
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                text('xs', 'sm'),
              )}
            >
              <Calendar className="w-3.5 h-3.5" />
              {tc(`timeRanges.${statsRange}`)}
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            {showTimeframePicker && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowTimeframePicker(false)} />
                <div className="absolute right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-20 p-2 min-w-[150px]">
                  {timeRanges.map((range) => (
                    <button
                      key={range.value}
                      onClick={() => {
                        onStatsRangeChange(range.value);
                        setShowTimeframePicker(false);
                      }}
                      className={cn(
                        'block w-full px-3 py-1.5 text-left rounded hover:bg-secondary transition-colors',
                        text('xs', 'sm'),
                        statsRange === range.value && 'bg-secondary',
                      )}
                    >
                      {range.label} - {range.description}
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
            title={td('refreshButtonTitle')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          {/* Metric Switch: TOTAL / STAKERS / UNSTAKERS */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onMetricChange('total')}
              className={cn(
                'px-2 py-1 rounded-md text-xs',
                metric === 'total'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
              )}
            >
              TOTAL
            </button>
            <button
              onClick={() => onMetricChange('stakers')}
              className={cn(
                'px-2 py-1 rounded-md text-xs',
                metric === 'stakers'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
              )}
            >
              STAKERS
            </button>
            <button
              onClick={() => onMetricChange('unstakers')}
              className={cn(
                'px-2 py-1 rounded-md text-xs',
                metric === 'unstakers'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
              )}
            >
              UNSTAKERS
            </button>
          </div>
        </div>
      </div>

      {/* 1:1 card grid styling with Raydium */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>{t(metric)}</span>
          </div>
          <p className={text('base', 'lg', 'font-bold')}>
            {metric === 'total'
              ? (widget.accounts?.total?.display ?? widget.accounts?.total?.count?.toLocaleString())
              : metric === 'stakers'
                ? (widget.accounts?.staking?.display ??
                  widget.accounts?.staking?.count?.toLocaleString())
                : (widget.accounts?.unstaking?.display ??
                  widget.accounts?.unstaking?.count?.toLocaleString())}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {(() => {
              const timeStr = format(
                new Date(
                  widget.accounts?.total?.lastUpdate ?? widget.current?.lastUpdate ?? new Date(),
                ),
                'HH:mm',
                { locale: getDateLocale(locale) },
              );
              try {
                return t('lastUpdated', { value: timeStr });
              } catch {
                return `${t('lastUpdated' as any)} ${timeStr}`;
              }
            })()}
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
              {tc(`timeRanges.${statsRange}`)} {t('range')}
            </span>
          </div>
          <div className="mt-1">
            <p className={text('sm', 'base', 'font-medium')}>
              {lowDisplay} - {highDisplay}
            </p>
            <div className="h-1.5 bg-secondary rounded-full mt-2 relative overflow-hidden">
              <motion.div
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-green-500 to-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: 'easeOut' }}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <Percent className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
              {tc(`timeRanges.${statsRange}`)} {t('change')}
            </span>
          </div>
          {(() => {
            const pct = Number(changeObj?.percentage);
            const trend = Number.isFinite(pct) ? (pct >= 0 ? 'up' : 'down') : undefined;
            return (
              <>
                <p
                  className={cn(
                    text('base', 'lg', 'font-bold'),
                    (pct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {Number.isFinite(pct) ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%` : 'N/A'}
                </p>
                <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
                  {trend === 'up' ? tc('uptrend') : trend === 'down' ? tc('downtrend') : '—'}
                </p>
              </>
            );
          })()}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <Target className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
              {t('allTimeHigh')}
            </span>
          </div>
          <p className={text('sm', 'base', 'font-bold')}>
            {metric === 'total'
              ? (widget?.ath?.accounts?.total?.display ?? 'N/A')
              : metric === 'stakers'
                ? (widget?.ath?.accounts?.staking?.display ?? 'N/A')
                : (widget?.ath?.accounts?.unstaking?.display ?? 'N/A')}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {(() => {
              const d =
                metric === 'total'
                  ? widget?.ath?.accounts?.total?.date
                  : metric === 'stakers'
                    ? widget?.ath?.accounts?.staking?.date
                    : widget?.ath?.accounts?.unstaking?.date;
              if (!d) return '-';
              try {
                return format(new Date(d), 'MMM d, yyyy', { locale: getDateLocale(locale) });
              } catch {
                return '-';
              }
            })()}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <Activity className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span
              className={cn(text('2xs', 'xs'), 'text-muted-foreground flex items-center gap-1')}
            >
              {t('volatility')}
              <UiTooltip content={ttStats('dailyVolatility')}>
                <span className="inline-flex">
                  {/* using a subtle info dot via a small circle */}
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
          <p className={text('base', 'lg', 'font-bold')}>
            {Number.isFinite(volatilityPct) ? volatilityPct.toFixed(1) : '0'}%
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {volatilityPct < 10 ? tc('low') : volatilityPct < 20 ? tc('moderate') : tc('high')}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <TrendingUp className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>{t('ranking')}</span>
          </div>
          <p
            className={cn(
              text('sm', 'base', 'font-bold capitalize'),
              rankingToday === 'Extremely High'
                ? 'text-green-500'
                : rankingToday === 'High'
                  ? 'text-green-500'
                  : rankingToday === 'Low'
                    ? 'text-red-500'
                    : 'text-yellow-500',
            )}
          >
            {t(rankingToday.toLowerCase() as any)}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {Number.isFinite(percentOfAvg30Metric) ? percentOfAvg30Metric.toFixed(0) : '100'}%{' '}
            {t('ofAvg')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
