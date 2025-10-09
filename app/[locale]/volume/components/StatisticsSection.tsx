'use client';

import { motion } from 'framer-motion';
import { Activity, TrendingUpDown, AlertCircle, BarChart3, Calendar, Info } from 'lucide-react';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { useFontScale, FONT_SCALE } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';
import { useLocale } from 'next-intl';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/utils';
import { useMemo } from 'react';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';

interface StatisticsSectionProps {
  stats: any;
  statsRange: TimeRange;
  mounted: boolean;
  loading?: boolean;
}

export function StatisticsSection({
  stats,
  statsRange,
  mounted,
  loading = false,
}: StatisticsSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('volume.stats');
  const tt = useTranslations('volume.stats.tooltips');
  const DAY_INDEX: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };

  const locale = useLocale();
  const dfnsLocale = getDateLocale(locale);

  const localizedDayOfWeek = useMemo(() => {
    if (!stats?.patterns?.dayOfWeek) return [] as Array<{ day: string; avgVolume: number }>;
    return stats.patterns.dayOfWeek.map(
      ({ day, avgVolume }: { day: string; avgVolume: number }) => {
        const idx = DAY_INDEX[day] ?? 0;
        const base = new Date(1970, 0, 4);
        const date = new Date(base.getTime() + idx * 864e5);
        return {
          day: format(date, 'EEEE', { locale: dfnsLocale }),
          avgVolume,
        };
      },
    );
  }, [stats?.patterns?.dayOfWeek, dfnsLocale]);

  const tc = useTranslations('common');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const isHydrated = mounted || loading;

  if (!isHydrated) return null;

  if (loading || !stats) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card-base p-3 md:p-4 text-center">
              <div className="relative skeleton h-6 w-6 md:w-8 md:h-8 mx-auto mb-3 rounded-full">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
              <div className="relative skeleton h-3 w-24 mx-auto rounded mb-2">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
              <div className="relative skeleton h-4 w-20 mx-auto rounded">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>

        <div className="card-base p-4 md:p-6">
          <div className="relative skeleton h-5 w-48 mb-4 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="p-3 bg-secondary/50 rounded-lg space-y-2">
                <div className="relative skeleton h-3 w-20 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-4 w-24 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-base p-4 md:p-6">
          <div className="relative skeleton h-5 w-44 mb-4 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="p-3 bg-secondary/30 rounded-lg space-y-2">
                <div className="relative skeleton h-3 w-24 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-4 w-full rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!stats) return null;

  const chartFontSize = isMobile ? 10 * FONT_SCALE.mobile : 12 * FONT_SCALE.desktop;
  const smallChartFontSize = isMobile ? 8 * FONT_SCALE.mobile : 10 * FONT_SCALE.desktop;

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const volumeRange = stats.distribution.percentiles
    ? stats.distribution.percentiles.p90 - stats.distribution.percentiles.p10
    : 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Key Metrics - Updated to match price page style */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <Activity className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
            {t('averageVolume')}
          </p>
          <p className={text('base', 'xl', 'font-bold')}>{stats.historical.averageDisplay}</p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {tc(`timeRanges.${statsRange}`)}
          </p>
        </div>

        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <TrendingUpDown className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
            {t('volumeRange')}
          </p>
          <p className={text('base', 'xl', 'font-bold')}>
            {formatVolume(stats.distribution.percentiles?.p10 || 0)} -{' '}
            {formatVolume(stats.distribution.percentiles?.p90 || 0)}
          </p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {formatVolume(volumeRange)}
          </p>
        </div>

        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <AlertCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-yellow-500" />
          <p
            className={cn(
              text('3xs', '2xs'),
              'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
            )}
          >
            {t('dailyVolatility')}
            <UiTooltip content={tt('dailyVolatility')}>
              <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>
            {stats.historical.volatility.toFixed(1)}%
          </p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {stats.historical.volatility < 20
              ? tc('low')
              : stats.historical.volatility < 50
                ? tc('moderate')
                : tc('high')}
          </p>
        </div>

        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <BarChart3 className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
            {t('dataCoverage')}
          </p>
          <p className={text('base', 'xl', 'font-bold')}>
            {parseFloat(stats.historical.completeness) || 100}%
          </p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {stats.historical.dataPoints} {tc('dataPoints')}
          </p>
        </div>
      </div>

      {/* Volume Distribution */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-4 md:mb-6 flex items-center gap-2',
          )}
        >
          <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('volumeDistribution')}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-7 gap-3 md:gap-4">
          {stats.distribution.percentiles &&
            Object.entries(stats.distribution.percentiles).map(([key, value]) => {
              const displayKey =
                key === 'p5'
                  ? t('percentiles.5th')
                  : key === 'p10'
                    ? t('percentiles.10th')
                    : key === 'p25'
                      ? t('percentiles.25th')
                      : key === 'p50'
                        ? t('percentiles.median')
                        : key === 'p75'
                          ? t('percentiles.75th')
                          : key === 'p90'
                            ? t('percentiles.90th')
                            : key === 'p95'
                              ? t('percentiles.95th')
                              : key;
              return (
                <div key={key} className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
                  <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
                    {displayKey}
                  </p>
                  <p className={text('xs', 'base', 'font-bold')}>{formatVolume(value as number)}</p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Volume Patterns */}
      {stats.patterns && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Day of Week Pattern */}
          {stats.patterns.dayOfWeek && stats.patterns.dayOfWeek.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3
                className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 flex items-center gap-2')}
              >
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                {t('dayOfWeekPattern')}
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={localizedDayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      fontSize={chartFontSize}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatVolume(value)}
                      fontSize={smallChartFontSize}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatVolume(value), t('avgVolume')]}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="avgVolume" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Monthly Pattern */}
          {stats.patterns.monthly && stats.patterns.monthly.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3
                className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 flex items-center gap-2')}
              >
                <TrendingUpDown className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                {t('monthlyVolumes')}
              </h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto scrollbar-thin">
                {stats.patterns.monthly.map((month: any) => (
                  <div
                    key={month.month}
                    className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    <div>
                      <p className={text('xs', 'sm', 'font-medium')}>{month.month}</p>
                      <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {t('dailyAvg')}: {month.avgVolumeDisplay}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={text('xs', 'sm', 'font-bold')}>{month.totalVolumeDisplay}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Events */}
      {stats.events && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Highest Days */}
          {stats.events.highest && stats.events.highest.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 text-green-500')}>
                {t('highestVolumeDays')}
              </h3>
              <div className="space-y-2">
                {stats.events.highest.slice(0, 5).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                    <p className={text('xs', 'sm', 'font-bold')}>{event.volumeDisplay}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lowest Days */}
          {stats.events.lowest && stats.events.lowest.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 text-red-500')}>
                {t('lowestVolumeDays')}
              </h3>
              <div className="space-y-2">
                {stats.events.lowest.slice(0, 5).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                    <p className={text('xs', 'sm', 'font-bold')}>{event.volumeDisplay}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Unusual Days */}
          {stats.events.unusual && stats.events.unusual.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 text-yellow-500')}>
                {t('unusualVolumeDays')}
              </h3>
              <div className="space-y-2">
                {stats.events.unusual.slice(0, 5).map((event: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                      <p className={text('xs', 'sm', 'font-bold')}>{event.volumeDisplay}</p>
                    </div>
                    <p className={cn(text('3xs', '2xs'), 'text-yellow-500')}>
                      {event.deviations} {t('stdDeviations')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
