'use client';

import { motion } from 'framer-motion';
import { Info, AlertCircle, Calendar } from 'lucide-react';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/utils';

interface AnalysisSectionProps {
  stats: any;
  widget: any;
  mounted: boolean;
  loading?: boolean;
}

export function AnalysisSection({ stats, widget, mounted, loading = false }: AnalysisSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('volume.analysis');
  const tt = useTranslations('volume.analysis.tooltips');
  const tc = useTranslations('common');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const locale = useLocale();
  const dfnsLocale = getDateLocale(locale);

  const isHydrated = mounted || loading;

  if (!isHydrated) return null;

  if (loading || !stats || !widget) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="card-base p-4 md:p-6 space-y-4">
          <div className="relative skeleton h-5 w-48 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="relative skeleton h-3 w-36 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-4 w-full rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-3 w-32 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-base p-4 md:p-6">
          <div className="relative skeleton h-5 w-40 mb-4 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-3 gap-3 md:gap-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="p-3 md:p-4 bg-secondary/50 rounded-lg space-y-3 text-center"
              >
                <div className="relative skeleton h-16 w-16 md:h-20 md:w-20 mx-auto rounded-full">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-3 w-24 mx-auto rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="relative skeleton h-4 w-20 mx-auto rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-base p-4 md:p-6 space-y-4">
          <div className="relative skeleton h-5 w-44 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="relative skeleton h-3 w-28 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                  <div className="relative skeleton h-3 w-12 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
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

  const formatVolume = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Volume Summary */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <Info className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('summaryTitle')}
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <h4 className={text('sm', 'base', 'font-semibold mb-2 md:mb-3')}>
                {t('currentConditions')}
              </h4>
              <ul className={cn('space-y-1.5 md:space-y-2', text('xs', 'sm'))}>
                <li>
                  {t('todaysVolume')}{' '}
                  <span
                    className={cn(
                      'font-bold',
                      widget.rankings.today === 'High'
                        ? 'text-green-500'
                        : widget.rankings.today === 'Low'
                          ? 'text-red-500'
                          : 'text-yellow-500',
                    )}
                  >
                    {widget.rankings.today === 'High'
                      ? t('high')
                      : widget.rankings.today === 'Low'
                        ? t('low')
                        : t('moderate')}
                  </span>{' '}
                  {t('relativeToRecent')}
                </li>
                <li>
                  {t('current24hVolume')}:{' '}
                  <span className="font-bold">{widget.current.display}</span>
                </li>
                <li>
                  {t('volumeAt')} {widget.rankings.percentOfAvg['30d'].toFixed(1)}%{' '}
                  {t('of30dayAverage')}
                </li>
                <li>
                  {t('volatilityLevel')}:{' '}
                  {stats.historical.volatility < 20
                    ? t('low')
                    : stats.historical.volatility < 50
                      ? t('moderate')
                      : t('high')}{' '}
                  ({stats.historical.volatility.toFixed(1)}%)
                </li>
              </ul>
            </div>

            <div>
              <h4 className={text('sm', 'base', 'font-semibold mb-2 md:mb-3')}>
                {t('volumeTrends')}
              </h4>
              <ul className={cn('space-y-1.5 md:space-y-2', text('xs', 'sm'))}>
                <li>
                  {tc('timeRanges.7d')} {t('trend')}:{' '}
                  <span
                    className={cn(
                      'font-bold',
                      widget.changes['7d'].value >= 0 ? 'text-green-500' : 'text-red-500',
                    )}
                  >
                    {widget.changes['7d'].display}
                  </span>
                </li>
                <li>
                  {tc('timeRanges.30d')} {t('trend')}:{' '}
                  <span
                    className={cn(
                      'font-bold',
                      widget.changes['30d'].value >= 0 ? 'text-green-500' : 'text-red-500',
                    )}
                  >
                    {widget.changes['30d'].display}
                  </span>
                </li>
                <li>
                  {t('averageDailyVolume')} ({tc(`timeRanges.${stats.historical.period}`)}):{' '}
                  <span className="font-bold">{stats.historical.averageDisplay}</span>
                </li>
                <li>
                  {t('totalVolume')} ({tc(`timeRanges.${stats.historical.period}`)}):{' '}
                  <span className="font-bold">{stats.historical.totalDisplay}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Volume Metrics */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
          {t('keyVolumeMetrics')}
        </h3>
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('xs', 'sm'),
                'text-muted-foreground mb-2 flex items-center justify-center gap-1',
              )}
            >
              {t('percentileRank')}
              <UiTooltip content={tt('percentileRank')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto">
              <svg className="w-16 h-16 md:w-24 md:h-24 transform -rotate-90">
                <circle
                  cx={isMobile ? '32' : '48'}
                  cy={isMobile ? '32' : '48'}
                  r={isMobile ? '24' : '36'}
                  stroke="hsl(var(--border))"
                  strokeWidth={isMobile ? '6' : '8'}
                  fill="none"
                />
                <circle
                  cx={isMobile ? '32' : '48'}
                  cy={isMobile ? '32' : '48'}
                  r={isMobile ? '24' : '36'}
                  stroke="#3b82f6"
                  strokeWidth={isMobile ? '6' : '8'}
                  fill="none"
                  strokeDasharray={`${(widget.rankings.percentOfAvg['30d'] / 100) * (isMobile ? 151 : 226)} ${isMobile ? 151 : 226}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {widget.rankings.percentOfAvg['30d'].toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('xs', 'sm'),
                'text-muted-foreground mb-2 flex items-center justify-center gap-1',
              )}
            >
              {t('volatility')}
              <UiTooltip content={tt('volatility')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto">
              <svg className="w-16 h-16 md:w-24 md:h-24 transform -rotate-90">
                <circle
                  cx={isMobile ? '32' : '48'}
                  cy={isMobile ? '32' : '48'}
                  r={isMobile ? '24' : '36'}
                  stroke="hsl(var(--border))"
                  strokeWidth={isMobile ? '6' : '8'}
                  fill="none"
                />
                <circle
                  cx={isMobile ? '32' : '48'}
                  cy={isMobile ? '32' : '48'}
                  r={isMobile ? '24' : '36'}
                  stroke={
                    stats.historical.volatility < 20
                      ? '#10b981'
                      : stats.historical.volatility < 50
                        ? '#f59e0b'
                        : '#ef4444'
                  }
                  strokeWidth={isMobile ? '6' : '8'}
                  fill="none"
                  strokeDasharray={`${Math.min(stats.historical.volatility, 100) * (isMobile ? 1.51 : 2.26)} ${isMobile ? 151 : 226}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {stats.historical.volatility.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('xs', 'sm'),
                'text-muted-foreground mb-2 flex items-center justify-center gap-1',
              )}
            >
              {t('dataQuality')}
              <UiTooltip content={tt('dataQuality')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto">
              <svg className="w-16 h-16 md:w-24 md:h-24 transform -rotate-90">
                <circle
                  cx={isMobile ? '32' : '48'}
                  cy={isMobile ? '32' : '48'}
                  r={isMobile ? '24' : '36'}
                  stroke="hsl(var(--border))"
                  strokeWidth={isMobile ? '6' : '8'}
                  fill="none"
                />
                <circle
                  cx={isMobile ? '32' : '48'}
                  cy={isMobile ? '32' : '48'}
                  r={isMobile ? '24' : '36'}
                  stroke="#10b981"
                  strokeWidth={isMobile ? '6' : '8'}
                  fill="none"
                  strokeDasharray={`${parseFloat(stats.historical.completeness) * (isMobile ? 1.51 : 2.26)} ${isMobile ? 151 : 226}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {stats.historical.completeness}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Historical Performance */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('historicalPerformance')}
        </h3>
        <div className="space-y-3 md:space-y-4">
          {Object.entries(widget.changes).map(([period, data]) => {
            const d = data as { value: number; display?: string };
            const isPositive = d.value >= 0;
            const absValue = Math.abs(d.value);

            return (
              <div key={period} className="space-y-1.5 md:space-y-2">
                <div className="flex items-center justify-between">
                  <span className={cn(text('xs', 'sm', 'font-medium uppercase'))}>
                    {tc(`timeRanges.${period}`)}
                  </span>
                  <span
                    className={cn(
                      text('xs', 'sm', 'font-bold'),
                      isPositive ? 'text-green-500' : 'text-red-500',
                    )}
                  >
                    {d.display}
                  </span>
                </div>
                <div className="relative h-2 md:h-3 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(absValue, 100)}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={cn(
                      'absolute h-full rounded-full',
                      isPositive ? 'bg-green-500' : 'bg-red-500',
                      !isPositive && 'right-0',
                    )}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>
                    {t('total')}: {widget.ranges[period]?.totalDisplay || 'N/A'}
                  </span>
                  <span>
                    {t('avg')}: {widget.ranges[period]?.averageDisplay || 'N/A'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* All-Time Records */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-base p-4 md:p-6">
          <h4 className={text('sm', 'base', 'font-semibold mb-3')}>{t('allTimeHighVolume')}</h4>
          <p className={text('xl', '2xl', 'font-bold text-green-500')}>
            {widget.allTime.highest.display}
          </p>
          <p className={cn(text('xs', 'sm'), 'text-muted-foreground mt-1')}>
            {format(new Date(widget.allTime.highest.date), 'PPP', { locale: dfnsLocale })}
          </p>
        </div>

        <div className="card-base p-4 md:p-6">
          <h4 className={text('sm', 'base', 'font-semibold mb-3')}>{t('allTimeLowVolume')}</h4>
          <p className={text('xl', '2xl', 'font-bold text-red-500')}>
            {widget.allTime.lowest.display}
          </p>
          <p className={cn(text('xs', 'sm'), 'text-muted-foreground mt-1')}>
            {format(new Date(widget.allTime.lowest.date), 'PPP', { locale: dfnsLocale })}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
