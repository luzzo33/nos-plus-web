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
}: MarketOverviewProps) {
  const { text } = useFontScale();
  const locale = useLocale();
  const t = useTranslations('volume.marketOverview');
  const tc = useTranslations('common');
  const td = useTranslations('dashboard');
  const [showTimeframePicker, setShowTimeframePicker] = useState(false);
  const isHydrated = mounted || loading;

  const timeRanges: { value: TimeRange; label: string; description: string }[] = [
    { value: '24h', label: tc('timeRanges.24h'), description: tc('timeRangeDescriptions.24h') },
    { value: '7d', label: tc('timeRanges.7d'), description: tc('timeRangeDescriptions.7d') },
    { value: '30d', label: tc('timeRanges.30d'), description: tc('timeRangeDescriptions.30d') },
    { value: '90d', label: tc('timeRanges.90d'), description: tc('timeRangeDescriptions.90d') },
    { value: '180d', label: tc('timeRanges.180d'), description: tc('timeRangeDescriptions.180d') },
    { value: '1y', label: tc('timeRanges.1y'), description: tc('timeRangeDescriptions.1y') },
  ];

  if (!isHydrated) return null;

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
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="card-base p-3 md:p-4">
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

  return (
    <div>
      {/* Stats Timeframe Selector */}
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
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="card-base p-3 md:p-4 hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between mb-1.5">
            <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>{t('24hVolume')}</span>
          </div>
          <p className={text('base', 'lg', 'font-bold')}>{widget.current.display}</p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {t('lastUpdated')} {format(new Date(widget.current.lastUpdate), 'HH:mm')}
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
              {widget.ranges[statsRange]?.lowDisplay || 'N/A'} -{' '}
              {widget.ranges[statsRange]?.highDisplay || 'N/A'}
            </p>
            {widget.ranges[statsRange] && (
              <div className="h-1 md:h-1.5 bg-secondary rounded-full mt-2 relative">
                <div
                  className="absolute h-full bg-gradient-to-r from-green-500 to-red-500 rounded-full"
                  style={{
                    width: `${
                      ((widget.current.volume - widget.ranges[statsRange].low) /
                        (widget.ranges[statsRange].high - widget.ranges[statsRange].low)) *
                      100
                    }%`,
                  }}
                />
              </div>
            )}
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
          <p
            className={cn(
              text('base', 'lg', 'font-bold'),
              widget.changes[statsRange]?.value >= 0 ? 'text-green-500' : 'text-red-500',
            )}
          >
            {widget.changes[statsRange]?.display || 'N/A'}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {widget.changes[statsRange]?.trend === 'up' ? t('uptrend') : t('downtrend')}
          </p>
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
          <p className={text('sm', 'base', 'font-bold')}>{widget.allTime.highest.display}</p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {format(new Date(widget.allTime.highest.date), 'MMM dd, yyyy', {
              locale: getDateLocale(locale),
            })}
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
            <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
              {t('volatility')}
            </span>
          </div>
          <p className={text('base', 'lg', 'font-bold')}>
            {stats?.historical?.volatility?.toFixed(1) || '0'}%
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {stats?.historical?.volatility < 20
              ? t('low')
              : stats?.historical?.volatility < 50
                ? t('medium')
                : t('high')}
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
              widget.rankings?.today === 'High'
                ? 'text-green-500'
                : widget.rankings?.today === 'Low'
                  ? 'text-red-500'
                  : 'text-yellow-500',
            )}
          >
            {widget.rankings?.today ? t(widget.rankings.today.toLowerCase() as any) : t('normal')}
          </p>
          <p className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-0.5')}>
            {widget.rankings?.percentOfAvg?.['30d']?.toFixed(0) || '100'}% {t('ofAvg')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
