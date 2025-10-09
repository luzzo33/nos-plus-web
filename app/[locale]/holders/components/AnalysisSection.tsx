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
}

export function AnalysisSection({ stats, widget, mounted }: AnalysisSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('holders.analysis');
  const tt = useTranslations('holders.analysis.tooltips');
  const tc = useTranslations('common');
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const locale = useLocale();
  const dfnsLocale = getDateLocale(locale);

  const currentHolders = Number(widget?.current?.holders) || 0;
  const avg30 = Number(widget?.ranges?.['30d']?.average) || 0;
  const percent30 = avg30 > 0 ? (currentHolders / avg30) * 100 : 100;
  const todayRank = percent30 > 110 ? 'High' : percent30 < 90 ? 'Low' : 'Moderate';
  const volatility =
    typeof stats?.trends?.volatility === 'string' || typeof stats?.trends?.volatility === 'number'
      ? parseFloat(stats.trends.volatility as any)
      : 0;
  const completenessNum = parseFloat(stats?.historical?.completeness) || 100;

  if (!mounted || !stats || !widget) return null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Holders Summary */}
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
                  {t('todaysHolders')}{' '}
                  <span
                    className={cn(
                      'font-bold',
                      todayRank === 'High'
                        ? 'text-green-500'
                        : todayRank === 'Low'
                          ? 'text-red-500'
                          : 'text-yellow-500',
                    )}
                  >
                    {todayRank === 'High'
                      ? t('high')
                      : todayRank === 'Low'
                        ? t('low')
                        : t('moderate')}
                  </span>{' '}
                  {t('relativeToRecent')}
                </li>
                <li>
                  {t('current24hHolders')}:{' '}
                  <span className="font-bold">{widget.current?.display ?? '-'}</span>
                </li>
                <li>
                  {t('holdersAt')} {Number.isFinite(percent30) ? percent30.toFixed(1) : '100'}%{' '}
                  {t('of30dayAverage')}
                </li>
                <li>
                  {t('volatilityLevel')}:{' '}
                  {volatility < 20 ? t('low') : volatility < 50 ? t('moderate') : t('high')} (
                  {Number.isFinite(volatility) ? volatility.toFixed(1) : '0'}%)
                </li>
              </ul>
            </div>

            <div>
              <h4 className={text('sm', 'base', 'font-semibold mb-2 md:mb-3')}>
                {t('holdersTrends')}
              </h4>
              <ul className={cn('space-y-1.5 md:space-y-2', text('xs', 'sm'))}>
                <li>
                  {tc('timeRanges.7d')} {t('trend')}:{' '}
                  <span
                    className={cn(
                      'font-bold',
                      widget.changes?.['7d']?.value >= 0 ? 'text-green-500' : 'text-red-500',
                    )}
                  >
                    {typeof widget.changes?.['7d']?.value === 'number'
                      ? `${widget.changes['7d'].value >= 0 ? '+' : ''}${widget.changes['7d'].value.toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </li>
                <li>
                  {tc('timeRanges.30d')} {t('trend')}:{' '}
                  <span
                    className={cn(
                      'font-bold',
                      widget.changes?.['30d']?.value >= 0 ? 'text-green-500' : 'text-red-500',
                    )}
                  >
                    {typeof widget.changes?.['30d']?.value === 'number'
                      ? `${widget.changes['30d'].value >= 0 ? '+' : ''}${widget.changes['30d'].value.toFixed(2)}%`
                      : 'N/A'}
                  </span>
                </li>
                <li>
                  {t('averageDailyHolders')} (
                  {tc(`timeRanges.${stats?.historical?.period ?? '30d'}`)}):{' '}
                  <span className="font-bold">{stats?.historical?.averageDisplay ?? '-'}</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Holders Metrics */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
          {t('keyHoldersMetrics')}
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
                  strokeDasharray={`${(Math.min(Math.max(percent30, 0), 100) / 100) * (isMobile ? 151 : 226)} ${isMobile ? 151 : 226}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {Number.isFinite(percent30) ? percent30.toFixed(0) : '100'}%
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
                  stroke={volatility < 20 ? '#10b981' : volatility < 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth={isMobile ? '6' : '8'}
                  fill="none"
                  strokeDasharray={`${Math.min(Math.max(volatility, 0), 100) * (isMobile ? 1.51 : 2.26)} ${isMobile ? 151 : 226}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {Number.isFinite(volatility) ? volatility.toFixed(1) : '0.0'}%
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
                  strokeDasharray={`${Math.min(Math.max(completenessNum, 0), 100) * (isMobile ? 1.51 : 2.26)} ${isMobile ? 151 : 226}`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {stats?.historical?.completeness ?? '100%'}
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
          {Object.entries(widget.changes || {}).map(([period, data]) => {
            const value = (data as any)?.value ?? 0;
            const isPositive = value >= 0;
            const absValue = Math.abs(value);

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
                    {`${value >= 0 ? '+' : ''}${value.toFixed(2)}%`}
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
                  {/* Remove Total (not in API), keep Avg */}
                  <span>
                    {t('avg')}: {widget.ranges?.[period as any]?.averageDisplay || 'N/A'}
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
          <h4 className={text('sm', 'base', 'font-semibold mb-3')}>{t('allTimeHighHolders')}</h4>
          <p className={text('xl', '2xl', 'font-bold text-green-500')}>
            {widget?.allTime?.high?.display ?? 'N/A'}
          </p>
          <p className={cn(text('xs', 'sm'), 'text-muted-foreground mt-1')}>
            {widget?.allTime?.high?.date
              ? format(new Date(widget.allTime.high.date), 'PPP', { locale: dfnsLocale })
              : '-'}
          </p>
        </div>

        <div className="card-base p-4 md:p-6">
          <h4 className={text('sm', 'base', 'font-semibold mb-3')}>{t('allTimeLowHolders')}</h4>
          <p className={text('xl', '2xl', 'font-bold text-red-500')}>
            {widget?.allTime?.low?.display ?? 'N/A'}
          </p>
          <p className={cn(text('xs', 'sm'), 'text-muted-foreground mt-1')}>
            {widget?.allTime?.low?.date
              ? format(new Date(widget.allTime.low.date), 'PPP', { locale: dfnsLocale })
              : '-'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
