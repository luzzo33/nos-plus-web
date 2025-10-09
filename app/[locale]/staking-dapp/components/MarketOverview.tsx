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
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations, useLocale } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

interface MarketOverviewProps {
  widget: any;
  stats: any;
  statsRange: TimeRange;
  mounted: boolean;
  loading?: boolean;
  onStatsRangeChange: (range: TimeRange) => void;
  onRefresh: () => void;
  refreshing: boolean;
  metric: 'xnos' | 'apr';
  onMetricChange: (m: 'xnos' | 'apr') => void;
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
  const t = useTranslations('stakingDapp.marketOverview');
  const ttStats = useTranslations('stakingDapp.stats.tooltips');
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
          <SkeletonBlock className="h-6 w-48 rounded-lg" />
          <div className="flex items-center gap-2">
            <SkeletonBlock className="h-9 w-36 rounded-lg" />
            <SkeletonBlock className="h-9 w-28 rounded-lg" />
            <SkeletonBlock className="h-9 w-9 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr,1fr] gap-6">
          <div className="card-base p-4 md:p-6 space-y-3">
            <SkeletonBlock className="h-5 w-52 rounded-lg" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="space-y-2 rounded-lg bg-secondary/50 p-3">
                  <SkeletonBlock className="h-3 w-24 rounded-lg" />
                  <SkeletonBlock className="h-4 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          </div>

          <div className="card-base p-4 md:p-6 space-y-3">
            <SkeletonBlock className="h-5 w-40 rounded-lg" />
            <SkeletonBlock className="h-6 w-28 rounded-lg" />
            <SkeletonBlock className="h-3 w-20 rounded-lg" />
            <SkeletonBlock className="h-3 w-24 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card-base p-4 md:p-6 space-y-2">
              <SkeletonBlock className="h-3 w-28 rounded-lg" />
              <SkeletonBlock className="h-5 w-20 rounded-lg" />
              <SkeletonBlock className="h-3 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!mounted) return null;

  const toNumber = (value: unknown): number | undefined => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
      const parsed = Number(value.replace(/[,\s]/g, ''));
      return Number.isFinite(parsed) ? parsed : undefined;
    }
    return undefined;
  };

  const currentXnosValue = toNumber(widget?.current?.xnos?.value ?? widget?.current?.xnos);
  const currentAPRValue = toNumber(widget?.current?.apr?.value ?? widget?.current?.apr);
  const currentXnos = currentXnosValue ?? 0;
  const currentAPR = currentAPRValue ?? 0;
  const avg30Xnos =
    Number(widget?.ranges?.['30d']?.xnos?.average) ||
    (Number(widget?.ranges?.['30d']?.xnos?.low) + Number(widget?.ranges?.['30d']?.xnos?.high)) /
      2 ||
    0;
  const avg30Apr =
    Number(widget?.ranges?.['30d']?.apr?.average) ||
    (Number(widget?.ranges?.['30d']?.apr?.low) + Number(widget?.ranges?.['30d']?.apr?.high)) / 2 ||
    0;
  const percentOfAvg30Metric = (() => {
    if (metric === 'apr') {
      return avg30Apr > 0 ? (currentAPR / avg30Apr) * 100 : 100;
    }
    return avg30Xnos > 0 ? (currentXnos / avg30Xnos) * 100 : 100;
  })();
  const rankingToday =
    percentOfAvg30Metric > 200
      ? 'Extremely High'
      : percentOfAvg30Metric > 110
        ? 'High'
        : percentOfAvg30Metric < 90
          ? 'Low'
          : 'Moderate';

  const rangeData =
    metric === 'xnos' ? widget?.ranges?.[statsRange]?.xnos : widget?.ranges?.[statsRange]?.apr;
  const lowDisplay =
    rangeData?.lowDisplay ??
    (rangeData?.low != null
      ? metric === 'xnos'
        ? Number(rangeData.low).toLocaleString()
        : `${Number(rangeData.low).toFixed(2)}%`
      : 'N/A');
  const highDisplay =
    rangeData?.highDisplay ??
    (rangeData?.high != null
      ? metric === 'xnos'
        ? Number(rangeData.high).toLocaleString()
        : `${Number(rangeData.high).toFixed(2)}%`
      : 'N/A');

  const changeObj =
    metric === 'xnos' ? widget?.changes?.[statsRange]?.xnos : widget?.changes?.[statsRange]?.apr;

  const currentXnosDisplay =
    widget?.current?.xnos?.display ??
    (currentXnosValue !== undefined ? currentXnosValue.toLocaleString() : '—');

  const currentAprDisplay =
    widget?.current?.apr?.display ??
    (currentAPRValue !== undefined ? `${currentAPRValue.toFixed(2)}%` : '—');

  const currentMetricDisplay = metric === 'xnos' ? currentXnosDisplay : currentAprDisplay;

  const isPositiveChange = (() => {
    const abs = Number(changeObj?.absolute);
    if (Number.isFinite(abs)) return abs >= 0;
    const pct = Number(changeObj?.percentage);
    if (Number.isFinite(pct)) return pct >= 0;
    if (typeof changeObj?.display === 'string') return !changeObj.display.trim().startsWith('-');
    return true;
  })();

  const volatilityPct = (() => {
    if (metric === 'xnos') {
      const xnosStab = stats?.metrics?.xnos?.stability;
      if (typeof xnosStab === 'number') return Number(xnosStab);
      if (typeof xnosStab?.volatility === 'number') return Number(xnosStab.volatility);
      return 0;
    }
    const aprStab = stats?.metrics?.apr?.stability;
    if (typeof aprStab === 'number') return Number(aprStab);
    if (typeof aprStab?.volatility === 'number') return Number(aprStab.volatility);
    return 0;
  })();

  const progressPct = (() => {
    const low = Number(rangeData?.low);
    const high = Number(rangeData?.high);
    if (!isFinite(low) || !isFinite(high) || high <= low) return 0;
    const current = metric === 'xnos' ? currentXnos : currentAPR;
    return Math.min(Math.max(((current - low) / (high - low)) * 100, 0), 100);
  })();

  const lastUpdatedLabel = (() => {
    const raw = widget?.current?.lastUpdate;
    if (!raw) return null;
    try {
      return format(new Date(raw), 'HH:mm', { locale: getDateLocale(locale) });
    } catch {
      return null;
    }
  })();

  const formatShortUSD2 = (n?: number) => {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    const sign = n >= 0 ? '+' : '-';
    const v = Math.abs(n);
    const withDecimals = (x: number) => {
      const s = x.toFixed(2);
      return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    };
    if (v >= 1e9) return `${sign}$${withDecimals(v / 1e9)}B`;
    if (v >= 1e6) return `${sign}$${withDecimals(v / 1e6)}M`;
    if (v >= 1e3) return `${sign}$${withDecimals(v / 1e3)}K`;
    return `${sign}$${withDecimals(v)}`;
  };

  return (
    <div>
      {/* Stats Timeframe Selector (parity with Holders) */}
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
                <div className="absolute right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-20 p-2 min-w-[200px]">
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
                      title={range.description}
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
          {/* Metric Switch: xNOS / APR */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => onMetricChange('xnos')}
              className={cn(
                'px-2 py-1 rounded-md text-xs',
                metric === 'xnos'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
              )}
            >
              xNOS
            </button>
            <button
              onClick={() => onMetricChange('apr')}
              className={cn(
                'px-2 py-1 rounded-md text-xs',
                metric === 'apr'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80',
              )}
            >
              APR
            </button>
          </div>
        </div>
      </div>

      {/* 1:1 card grid styling with Holders */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span
              className={cn(text('2xs', 'xs'), 'text-muted-foreground flex items-center gap-1')}
            >
              {metric === 'xnos' ? t('xnos') : t('apr')}
              <UiTooltip content={t('tooltips.currentMetric')}>
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
          <p className={text('base', 'lg', 'font-bold')}>{currentMetricDisplay}</p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {t('lastUpdated')} {lastUpdatedLabel ?? '—'}
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
            <span
              className={cn(text('2xs', 'xs'), 'text-muted-foreground flex items-center gap-1')}
            >
              {tc(`timeRanges.${statsRange}`)} {t('range')}
              <UiTooltip content={t('tooltips.rangeHighLow')}>
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
          <div className="mt-1">
            <p className={text('sm', 'base', 'font-medium')}>
              {lowDisplay} - {highDisplay}
            </p>
            <div className="h-1 md:h-1.5 bg-secondary rounded-full mt-2 relative">
              <div
                className="absolute h-full bg-gradient-to-r from-green-500 to-red-500 rounded-full"
                style={{ width: `${progressPct}%` }}
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
            <span
              className={cn(text('2xs', 'xs'), 'text-muted-foreground flex items-center gap-1')}
            >
              {tc(`timeRanges.${statsRange}`)} {t('change')}
            </span>
          </div>
          {(() => {
            const pct = Number(metric === 'xnos' ? changeObj?.percentage : changeObj?.percentage);
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
            <span
              className={cn(text('2xs', 'xs'), 'text-muted-foreground flex items-center gap-1')}
            >
              {t('allTimeHigh')}
              <UiTooltip content={t('tooltips.allTimeHigh')}>
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
          <p className={text('sm', 'base', 'font-bold')}>
            {metric === 'xnos'
              ? (widget?.ath?.xnos?.display ?? 'N/A')
              : (widget?.ath?.apr?.display ?? 'N/A')}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {(() => {
              const d = metric === 'xnos' ? widget?.ath?.xnos?.date : widget?.ath?.apr?.date;
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
            <span
              className={cn(text('2xs', 'xs'), 'text-muted-foreground flex items-center gap-1')}
            >
              {t('ranking')}
              <UiTooltip content={t('tooltips.ranking')}>
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
