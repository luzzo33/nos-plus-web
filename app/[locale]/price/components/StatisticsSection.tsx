'use client';

import { motion } from 'framer-motion';
import { Activity, TrendingUpDown, AlertCircle, BarChart3, TrendingUp, Info } from 'lucide-react';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { useFontScale, FONT_SCALE } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';
import {
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
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
  const t = useTranslations('price.stats');
  const tt = useTranslations('price.stats.tooltips');
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
          <div className="relative skeleton h-5 w-40 mb-4 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
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

        <div className="card-base p-4 md:p-6">
          <div className="relative skeleton h-5 w-48 mb-4 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="p-3 bg-secondary/40 rounded-lg space-y-2">
                <div className="relative skeleton h-3 w-16 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-4 w-20 rounded">
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
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-3 bg-secondary/30 rounded-lg space-y-2">
                <div className="relative skeleton h-3 w-20 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-4 w-24 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-2 w-full rounded-full">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  const shouldShowMovingAverages = (range: TimeRange): boolean => {
    return range !== '24h';
  };

  const chartFontSize = isMobile ? 10 * FONT_SCALE.mobile : 12 * FONT_SCALE.desktop;
  const smallChartFontSize = isMobile ? 8 * FONT_SCALE.mobile : 10 * FONT_SCALE.desktop;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <Activity className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
          <p
            className={cn(
              text('3xs', '2xs'),
              'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
            )}
          >
            {t('averagePrice')}
            <UiTooltip content={tt('averagePrice')}>
              <Info className="w-3 h-3 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>${stats.historical.average.toFixed(4)}</p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {tc(`timeRanges.${stats.historical.period}`)}
          </p>
        </div>

        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <TrendingUpDown className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
          <p
            className={cn(
              text('3xs', '2xs'),
              'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
            )}
          >
            {t('priceRange')}
            <UiTooltip content={tt('priceRange')}>
              <Info className="w-3 h-3 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>
            ${stats.historical.min.toFixed(2)} - ${stats.historical.max.toFixed(2)}
          </p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            ${(stats.historical.max - stats.historical.min).toFixed(4)}
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
              <Info className="w-3 h-3 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>{stats.volatility.daily.toFixed(1)}%</p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {t('annualized')}: {stats.volatility.annualized.toFixed(1)}%
          </p>
        </div>

        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <BarChart3 className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
          <p
            className={cn(
              text('3xs', '2xs'),
              'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
            )}
          >
            {t('dataCoverage')}
            <UiTooltip content={tt('dataCoverage')}>
              <Info className="w-3 h-3 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>{stats.historical.coverage.toFixed(0)}%</p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {stats.historical.dataPoints} {tc('dataPoints')}
          </p>
        </div>
      </div>

      {/* Volatility Analysis */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-4 md:mb-6 flex items-center gap-2',
          )}
        >
          <Activity className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('volatilityAnalysis')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div>
            <h4
              className={cn(text('xs', 'sm', 'font-medium'), 'mb-3 md:mb-4 text-muted-foreground')}
            >
              {t('volatilityByPeriod')}
            </h4>
            <div className="space-y-2 md:space-y-3">
              <div className="flex justify-between items-center">
                <span className={text('xs', 'sm')}>{t('daily')}</span>
                <span className={text('sm', 'base', 'font-bold')}>
                  {stats.volatility.daily.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={text('xs', 'sm')}>{t('weekly')}</span>
                <span className={text('sm', 'base', 'font-bold')}>
                  {stats.volatility.weekly.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className={text('xs', 'sm')}>{t('monthly')}</span>
                <span className={text('sm', 'base', 'font-bold')}>
                  {stats.volatility.monthly.toFixed(1)}%
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 md:pt-3 border-t border-border">
                <span className={text('xs', 'sm')}>{t('annualized')}</span>
                <span className={text('sm', 'base', 'font-bold')}>
                  {stats.volatility.annualized.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          <div>
            <h4
              className={cn(text('xs', 'sm', 'font-medium'), 'mb-3 md:mb-4 text-muted-foreground')}
            >
              {t('percentileRank')}
            </h4>
            <div className="p-3 md:p-4 bg-secondary/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className={text('xs', 'sm')}>{t('dataQuality')}</span>
                <span className={text('base', 'lg', 'font-bold')}>
                  {stats.historical.coverage.toFixed(0)}%
                </span>
              </div>
              <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stats.historical.coverage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price Distribution */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-4 md:mb-6 flex items-center gap-2',
          )}
        >
          <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('priceDistribution')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          {stats.distribution.percentiles &&
            (() => {
              const percentiles = {
                p10: stats.distribution.percentiles.p10,
                p25: stats.distribution.percentiles.p25,
                p50: stats.distribution.median,
                p75: stats.distribution.percentiles.p75,
                p90: stats.distribution.percentiles.p90,
              };

              return Object.entries(percentiles).map(([key, val]) => {
                const label =
                  key === 'p10'
                    ? t('percentiles.10th')
                    : key === 'p25'
                      ? t('percentiles.25th')
                      : key === 'p50'
                        ? t('percentiles.median')
                        : key === 'p75'
                          ? t('percentiles.75th')
                          : key === 'p90'
                            ? t('percentiles.90th')
                            : key;

                return (
                  <div key={key} className="p-3 bg-secondary/50 rounded-lg text-center">
                    <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-1 capitalize')}>
                      {label}
                    </p>
                    <p className={text('sm', 'base', 'font-bold')}>
                      {typeof val === 'number' ? `$${val.toFixed(4)}` : '—'}
                    </p>
                  </div>
                );
              });
            })()}
        </div>
      </div>

      {/* Market Trend Analysis */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-4 md:mb-6 flex items-center gap-2',
          )}
        >
          <TrendingUp className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('marketTrendAnalysis')}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <div className="space-y-4">
            <div className="p-3 md:p-4 bg-secondary/30 rounded-lg">
              <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-2')}>{t('direction')}</p>
              <p
                className={cn(
                  text('base', 'lg', 'font-bold'),
                  stats.trends.direction === 'bullish'
                    ? 'text-green-500'
                    : stats.trends.direction === 'bearish'
                      ? 'text-red-500'
                      : 'text-yellow-500',
                )}
              >
                {t(stats.trends.direction as any)}
              </p>
              <p className={cn(text('xs', 'sm'), 'text-muted-foreground mt-1')}>
                {t('strength')}: {stats.trends.strength.toFixed(0)}%
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 md:p-4 bg-secondary/50 rounded-lg">
                <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-1')}>{t('support')}</p>
                <p className={cn(text('base', 'lg', 'font-bold'), 'text-green-500')}>
                  ${stats.trends.support.toFixed(4)}
                </p>
              </div>

              <div className="p-3 md:p-4 bg-secondary/50 rounded-lg">
                <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-1')}>
                  {t('resistance')}
                </p>
                <p className={cn(text('base', 'lg', 'font-bold'), 'text-red-500')}>
                  ${stats.trends.resistance.toFixed(4)}
                </p>
              </div>
            </div>
          </div>

          {/* Moving Averages */}
          {shouldShowMovingAverages(statsRange) && stats.trends.movingAverages ? (
            <div className="p-3 md:p-4 bg-secondary/30 rounded-lg">
              <h4 className={text('xs', 'sm', 'font-medium mb-3')}>{t('movingAverages')}</h4>
              <div className="space-y-2">
                {stats.trends.movingAverages.ma7 !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>MA7</span>
                    <span className={text('xs', 'sm', 'font-bold')}>
                      ${stats.trends.movingAverages.ma7.toFixed(4)}
                    </span>
                  </div>
                )}
                {stats.trends.movingAverages.ma30 !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>MA30</span>
                    <span className={text('xs', 'sm', 'font-bold')}>
                      ${stats.trends.movingAverages.ma30.toFixed(4)}
                    </span>
                  </div>
                )}
                {stats.trends.movingAverages.ma50 !== undefined && (
                  <div className="flex justify-between items-center">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>MA50</span>
                    <span className={text('xs', 'sm', 'font-bold')}>
                      ${stats.trends.movingAverages.ma50.toFixed(4)}
                    </span>
                  </div>
                )}
              </div>
              {stats.trends.movingAverages.position && (
                <p
                  className={cn(
                    text('3xs', '2xs'),
                    'text-muted-foreground text-center mt-3 pt-3 border-t border-border',
                  )}
                >
                  {t('priceIs')}{' '}
                  <span className="font-medium text-foreground">
                    {t(stats.trends.movingAverages.position as any)}
                  </span>{' '}
                  {t('movingAverages').toLowerCase()}
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 md:p-4 bg-secondary/30 rounded-lg flex items-center justify-center">
              <div className="text-center">
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('movingAveragesNotAvailable')}
                </p>
                <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
                  {t('selectLongerTimeframe')}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
