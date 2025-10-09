'use client';

import { motion } from 'framer-motion';
import { Info, AlertCircle, Calendar } from 'lucide-react';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { cn, getDateLocale } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations, useLocale } from 'next-intl';
import { format } from 'date-fns';

interface AnalysisSectionProps {
  stats: any;
  widget: any;
  mounted: boolean;
  metric: 'xnos' | 'apr';
}

export function AnalysisSection({ stats, widget, mounted, metric }: AnalysisSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakingDapp.analysis');
  const ttStats = useTranslations('stakingDapp.stats.tooltips');
  const tc = useTranslations('common');
  const locale = useLocale();
  const dfnsLocale = getDateLocale(locale);

  if (!mounted || !stats || !widget) return null;

  const currentValue = Number(widget?.current?.[metric === 'xnos' ? 'xnos' : 'apr']?.value) || 0;
  const avg30 = Number(widget?.ranges?.['30d']?.[metric === 'xnos' ? 'xnos' : 'apr']?.average) || 0;
  const percent30 = avg30 > 0 ? (currentValue / avg30) * 100 : 100;
  const todayRank = percent30 > 110 ? 'High' : percent30 < 90 ? 'Low' : 'Moderate';

  const volatility = (() => {
    if (metric === 'xnos') {
      return Number(stats?.metrics?.xnos?.stability?.volatility) || 0;
    }
    const aprStab = stats?.metrics?.apr?.stability;
    return typeof aprStab === 'number' ? Number(aprStab) : Number(aprStab?.volatility) || 0;
  })();

  const completenessNum = (() => {
    const pct = Number(stats?.metrics?.extended?.completeness?.coveragePct);
    return Number.isFinite(pct) ? pct : 100;
  })();

  const metricLabel = metric === 'xnos' ? 'xNOS' : 'APR';

  const changes = widget?.changes || {};
  const ath = widget?.ath?.[metric === 'xnos' ? 'xnos' : 'apr'];
  const atl = widget?.atl?.[metric === 'xnos' ? 'xnos' : 'apr'];

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Summary */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          {t('summaryTitle')}
          <UiTooltip content={t('tooltips.current')}>
            <Info className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground/80" />
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
                  {t('todaysValue')}{' '}
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
                      ? tc('high')
                      : todayRank === 'Low'
                        ? tc('low')
                        : tc('moderate')}
                  </span>{' '}
                  {t('relativeToRecent')}
                </li>
                <li>
                  {t('currentValue')}:{' '}
                  <span className="font-bold">
                    {widget?.current?.[metric === 'xnos' ? 'xnos' : 'apr']?.display ?? '-'}
                  </span>
                </li>
                <li>
                  {t('valueAt')} {Number.isFinite(percent30) ? percent30.toFixed(1) : '100'}%{' '}
                  {t('of30dayAverage')}
                </li>
                <li>
                  {t('volatilityLevel')}:{' '}
                  {volatility < 20 ? tc('low') : volatility < 50 ? tc('moderate') : tc('high')} (
                  {Number.isFinite(volatility) ? volatility.toFixed(1) : '0'}%)
                </li>
              </ul>
            </div>
            <div>
              <h4 className={text('sm', 'base', 'font-semibold mb-2 md:mb-3')}>
                {t('metricTrends')}
              </h4>
              <ul className={cn('space-y-1.5 md:space-y-2', text('xs', 'sm'))}>
                {['7d', '30d'].map((p) => {
                  const v = changes?.[p]?.[metric === 'xnos' ? 'xnos' : 'apr']?.percentage;
                  const isNum = typeof v === 'number' && isFinite(v);
                  const isPos = (isNum ? v : 0) >= 0;
                  return (
                    <li key={p}>
                      {tc(`timeRanges.${p}`)} {t('trend')}:{' '}
                      <span className={cn('font-bold', isPos ? 'text-green-500' : 'text-red-500')}>
                        {isNum ? `${isPos ? '+' : ''}${v.toFixed(2)}%` : 'N/A'}
                      </span>
                    </li>
                  );
                })}
                <li>
                  {t('averageValue')} ({tc(`timeRanges.${stats?.historical?.period ?? '30d'}`)}):
                  <span className="font-bold ml-1">
                    {(() => {
                      const p = (stats?.historical?.period ?? '30d') as keyof any;
                      const r = widget?.ranges?.[p];
                      if (metric === 'xnos') {
                        return (
                          r?.xnos?.averageDisplay ??
                          (Number.isFinite(r?.xnos?.average)
                            ? Math.round(Number(r.xnos.average)).toLocaleString()
                            : '-') ??
                          '-'
                        );
                      }
                      return (
                        r?.apr?.averageDisplay ??
                        (Number.isFinite(r?.apr?.average)
                          ? `${Number(r.apr.average).toFixed(2)}%`
                          : '-')
                      );
                    })()}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          {t('keyRaydiumMetrics')}
          <UiTooltip content={t('tooltips.health')}>
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 text-yellow-500" />
          </UiTooltip>
        </h3>
        <div className="grid grid-cols-3 gap-3 md:gap-6">
          {/* Percentile rank vs 30d avg */}
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('xs', 'sm'),
                'text-muted-foreground mb-2 flex items-center justify-center gap-1',
              )}
            >
              {t('percentileRank')}
              <UiTooltip content={t('tooltips.position')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  stroke="#3b82f6"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${(Math.min(Math.max(percent30, 0), 100) / 100) * 226} 226`}
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

          {/* Volatility */}
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('xs', 'sm'),
                'text-muted-foreground mb-2 flex items-center justify-center gap-1',
              )}
            >
              {t('volatility')}
              <UiTooltip content={ttStats('dailyVolatility')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  stroke={volatility < 20 ? '#10b981' : volatility < 50 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(Math.max(volatility, 0), 100) * 2.26} 226`}
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

          {/* Data Quality / Completeness */}
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('xs', 'sm'),
                'text-muted-foreground mb-2 flex items-center justify-center gap-1',
              )}
            >
              {t('dataQuality')}
              <UiTooltip content={ttStats('completeness')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <div className="relative w-16 h-16 md:w-24 md:h-24 mx-auto">
              <svg viewBox="0 0 100 100" className="w-full h-full transform -rotate-90">
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  stroke="hsl(var(--border))"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="36"
                  stroke="#10b981"
                  strokeWidth="8"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray={`${Math.min(Math.max(completenessNum, 0), 100) * 2.26} 226`}
                  className="transition-all duration-1000"
                />
              </svg>
              <span
                className={cn(
                  'absolute inset-0 flex items-center justify-center',
                  text('sm', 'lg', 'font-bold'),
                )}
              >
                {Number.isFinite(completenessNum) ? `${completenessNum.toFixed(0)}%` : '100%'}
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
          {Object.entries(changes).map(([period, data]: any) => {
            const v = data?.[metric === 'xnos' ? 'xnos' : 'apr']?.percentage ?? 0;
            const isPositive = v >= 0;
            const absValue = Math.abs(v);
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
                    {`${v >= 0 ? '+' : ''}${v.toFixed(2)}%`}
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
                    {t('avg')}:{' '}
                    {widget?.ranges?.[period]?.[metric === 'xnos' ? 'xnos' : 'apr']
                      ?.averageDisplay || 'N/A'}
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
          <h4 className={text('sm', 'base', 'font-semibold mb-3')}>
            {t('allTimeHighMetric', { metric: metricLabel })}
          </h4>
          <p className={text('xl', '2xl', 'font-bold text-green-500')}>{ath?.display ?? 'N/A'}</p>
          <p className={cn(text('xs', 'sm'), 'text-muted-foreground mt-1')}>
            {ath?.date ? format(new Date(ath.date), 'PPP', { locale: dfnsLocale }) : '-'}
          </p>
        </div>
        <div className="card-base p-4 md:p-6">
          <h4 className={text('sm', 'base', 'font-semibold mb-3')}>
            {t('allTimeLowMetric', { metric: metricLabel })}
          </h4>
          <p className={text('xl', '2xl', 'font-bold text-red-500')}>{atl?.display ?? 'N/A'}</p>
          <p className={cn(text('xs', 'sm'), 'text-muted-foreground mt-1')}>
            {atl?.date ? format(new Date(atl.date), 'PPP', { locale: dfnsLocale }) : '-'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
