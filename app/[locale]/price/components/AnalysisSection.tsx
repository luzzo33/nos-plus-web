'use client';

import { motion } from 'framer-motion';
import { Info, AlertCircle, Calendar } from 'lucide-react';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';

interface AnalysisSectionProps {
  stats: any;
  widget: any;
  mounted: boolean;
  loading?: boolean;
}

export function AnalysisSection({ stats, widget, mounted, loading = false }: AnalysisSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('price.analysis');
  const tt = useTranslations('price.analysis.tooltips');
  const tc = useTranslations('common');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
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

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Market Summary */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <Info className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('summaryTitle')}
          <UiTooltip content={tt('summary')}>
            <Info className="w-3 h-3 text-muted-foreground/80" />
          </UiTooltip>
        </h3>
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <div>
              <h4 className={text('sm', 'base', 'font-semibold mb-2 md:mb-3')}>
                {t('currentConditions')}
              </h4>
              <ul className={cn('space-y-1.5 md:space-y-2', text('xs', 'sm'))}>
                <li>
                  {t('marketShowing')}{' '}
                  <span
                    className={cn(
                      'font-bold',
                      stats.trends.direction === 'bullish'
                        ? 'text-green-500'
                        : stats.trends.direction === 'bearish'
                          ? 'text-red-500'
                          : 'text-yellow-500',
                    )}
                  >
                    {t(stats.trends.direction as any)}
                  </span>{' '}
                  {t('trendWith')} {stats.trends.strength.toFixed(0)}% {t('strength').toLowerCase()}
                </li>
                <li>
                  {t('dailyVolatilityAt')} {stats.volatility.daily.toFixed(1)}%, {t('indicating')}{' '}
                  {stats.volatility.daily < 5
                    ? t('low')
                    : stats.volatility.daily < 15
                      ? t('moderate')
                      : t('high')}{' '}
                  {t('marketVolatility')}
                </li>
                <li>
                  {t('priceCurrently')}{' '}
                  {stats.trends.movingAverages?.position
                    ? t(stats.trends.movingAverages.position as any)
                    : t('at')}{' '}
                  {t('keyMovingAverages')}
                </li>
                <li>
                  {t('24hPriceChange')}:{' '}
                  <span
                    className={cn(
                      'font-bold',
                      widget.changes['24h'].value >= 0 ? 'text-green-500' : 'text-red-500',
                    )}
                  >
                    {widget.changes['24h'].value >= 0 ? '+' : ''}
                    {widget.changes['24h'].value.toFixed(2)}%
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <h4 className={text('sm', 'base', 'font-semibold mb-2 md:mb-3')}>{t('keyLevels')}</h4>
              <ul className={cn('space-y-1.5 md:space-y-2', text('xs', 'sm'))}>
                <li>
                  {t('immediateSupport')}:{' '}
                  <span className="font-bold text-green-500">
                    ${stats.trends.support.toFixed(4)}
                  </span>
                </li>
                <li>
                  {t('immediateResistance')}:{' '}
                  <span className="font-bold text-red-500">
                    ${stats.trends.resistance.toFixed(4)}
                  </span>
                </li>
                <li>
                  {t('averagePrice')} ({tc(`timeRanges.${stats.historical.period}`)}):{' '}
                  <span className="font-bold">${stats.historical.average.toFixed(4)}</span>
                </li>
                <li>
                  {t('allTimeHigh')}:{' '}
                  <span className="font-bold">{widget.allTime.high.display}</span> (
                  {widget.allTime.high.percentFromATH.toFixed(1)}% {t('away')})
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
          {t('riskAssessment')}
          <UiTooltip content={tt('riskAssessment')}>
            <Info className="w-3 h-3 text-muted-foreground/80" />
          </UiTooltip>
        </h3>
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-2')}>
              {t('volatilityRisk')}
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
                    stats.volatility.daily < 5
                      ? '#10b981'
                      : stats.volatility.daily < 15
                        ? '#f59e0b'
                        : '#ef4444'
                  }
                  strokeWidth={isMobile ? '6' : '8'}
                  fill="none"
                  strokeDasharray={`${Math.min(stats.volatility.daily * 10, 100) * (isMobile ? 1.51 : 2.26)} ${isMobile ? 151 : 226}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {stats.volatility.daily < 5
                  ? t('low')
                  : stats.volatility.daily < 15
                    ? t('moderate')
                    : t('high')}
              </span>
            </div>
          </div>

          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-2')}>
              {t('trendStrength')}
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
                  strokeDasharray={`${stats.trends.strength * (isMobile ? 1.51 : 2.26)} ${isMobile ? 151 : 226}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {stats.trends.strength.toFixed(0)}%
              </span>
            </div>
          </div>

          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-2')}>{t('dataQuality')}</p>
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
                  strokeDasharray={`${stats.historical.coverage * (isMobile ? 1.51 : 2.26)} ${isMobile ? 151 : 226}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {stats.historical.coverage.toFixed(0)}%
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
          <UiTooltip content={tt('historicalPerformance')}>
            <Info className="w-3 h-3 text-muted-foreground/80" />
          </UiTooltip>
        </h3>
        <div className="space-y-3 md:space-y-4">
          {Object.entries(widget.changes as Record<string, { value: number }>).map(
            ([period, data]) => {
              const isPositive = (data?.value ?? 0) >= 0;
              const absValue = Math.abs(data?.value ?? 0);

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
                      {isPositive ? '+' : ''}
                      {(data?.value ?? 0).toFixed(2)}%
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
                </div>
              );
            },
          )}
        </div>
      </div>
    </motion.div>
  );
}
