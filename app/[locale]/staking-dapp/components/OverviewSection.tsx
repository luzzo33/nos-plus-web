'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUpDown, BarChart3, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';

interface OverviewSectionProps {
  widget: any;
  stats: any;
  statsRange: TimeRange;
  mounted: boolean;
  metric: 'xnos' | 'apr';
}

export function OverviewSection({
  widget,
  stats,
  statsRange,
  mounted,
  metric,
}: OverviewSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakingDapp.overview');
  const tc = useTranslations('common');
  const [expandedRanges, setExpandedRanges] = useState<string[]>(['24h', '7d', '30d']);

  if (!mounted || !widget) return null;

  const toggleRangeExpansion = (showAll: boolean) => {
    if (showAll) setExpandedRanges(['24h', '7d', '30d', '90d', '180d', '1y']);
    else setExpandedRanges(['24h', '7d', '30d']);
  };

  const volatilityVal = (() => {
    if (metric === 'apr') {
      const v =
        stats?.metrics?.apr && typeof stats.metrics.apr.stability === 'number'
          ? Number(stats.metrics.apr.stability)
          : undefined;
      return typeof v === 'number' && isFinite(v) ? v : 0;
    }
    const v =
      typeof stats?.metrics?.xnos?.stability?.volatility === 'number'
        ? Number(stats.metrics.xnos.stability.volatility)
        : 0;
    return v;
  })();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Changes Grid (parity with Holders) */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {metric === 'apr'
            ? t('aprChanges', { default: 'APR Changes' } as any)
            : t('xnosChanges', { default: 'xNOS Changes' } as any)}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {Object.entries(widget.changes || {})
            .filter(([period]) => period !== 'all')
            .map(([period, data]: any) => {
              const pct = (metric === 'apr' ? data?.apr?.percentage : data?.xnos?.percentage) as
                | number
                | undefined;
              const val = typeof pct === 'number' ? pct : undefined;
              return (
                <div
                  key={period}
                  className="text-center p-2 md:p-3 bg-secondary/50 rounded-lg hover:bg-secondary/70 transition-colors"
                >
                  <p
                    className={cn(
                      text('3xs', '2xs'),
                      'text-muted-foreground mb-0.5 font-medium uppercase',
                    )}
                  >
                    {tc(`timeRanges.${period}`)}
                  </p>
                  <p
                    className={cn(
                      text('base', 'lg', 'font-bold'),
                      (val ?? 0) >= 0 ? 'text-green-500' : 'text-red-500',
                    )}
                  >
                    {val != null ? `${val >= 0 ? '+' : ''}${val.toFixed(2)}%` : '—'}
                  </p>
                </div>
              );
            })}
        </div>
      </div>

      {/* Ranges & Statistics (parity with Holders) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ranges */}
        <div className="card-base p-4 md:p-6">
          <h3
            className={cn(
              text('base', 'lg', 'font-semibold'),
              'mb-3 md:mb-4 flex items-center gap-2',
            )}
          >
            <TrendingUpDown className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            {metric === 'apr'
              ? t('aprRanges', { default: 'APR Ranges' } as any)
              : t('xnosRanges', { default: 'xNOS Ranges' } as any)}
          </h3>
          <div className="space-y-3">
            {Object.entries(widget.ranges || {}).map(([period, range]: any) => {
              const r = metric === 'apr' ? range?.apr : range?.xnos;
              if (!r) return null;
              const avg = Number(r.average) || (Number(r.low) + Number(r.high)) / 2 || 0;
              const current =
                metric === 'apr'
                  ? Number(widget.current?.apr?.value) || 0
                  : Number(widget.current?.xnos?.value) || 0;
              const percentOfAvg = avg > 0 ? Math.min((current / avg) * 100, 200) : 0;
              const change = Number(r.changePercentage ?? r.change ?? 0);
              const changeDisplay =
                typeof r.changeDisplay === 'string'
                  ? r.changeDisplay
                  : `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;

              return (
                <AnimatePresence key={period}>
                  {expandedRanges.includes(period) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="p-3 bg-secondary/30 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className={cn(text('xs', 'sm', 'font-medium uppercase'))}>
                            {tc(`timeRanges.${period}`)}
                          </span>
                          <span
                            className={cn(
                              text('xs', 'sm', 'font-bold'),
                              change >= 0 ? 'text-green-500' : 'text-red-500',
                            )}
                          >
                            {changeDisplay}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              {t('avg', { default: 'Avg' } as any)}
                            </span>
                            <span className="ml-1 font-medium">
                              {r.averageDisplay ??
                                (avg
                                  ? metric === 'apr'
                                    ? `${avg.toFixed(2)}%`
                                    : `$${Math.round(avg).toLocaleString()}`
                                  : '—')}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                            {t('current', { default: 'Current' } as any)}
                          </span>
                          <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(percentOfAvg, 100)}%` }}
                            />
                          </div>
                          <span
                            className={cn(
                              text('2xs', 'xs', 'font-medium'),
                              percentOfAvg > 100 ? 'text-green-500' : '',
                            )}
                          >
                            {Number.isFinite(percentOfAvg) ? percentOfAvg.toFixed(0) : '0'}%
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              );
            })}
          </div>
          <button
            onClick={() => toggleRangeExpansion(expandedRanges.length !== 6)}
            className={cn(
              text('xs', 'xs'),
              'mt-3 text-primary hover:text-primary/80 transition-colors flex items-center gap-1',
            )}
          >
            {expandedRanges.length === 6
              ? t('showLess', { default: 'Show less' } as any)
              : t('showAllRanges', { default: 'Show all ranges' } as any)}
            <ChevronDown
              className={cn(
                'w-3 h-3 transition-transform',
                expandedRanges.length === 6 && 'rotate-180',
              )}
            />
          </button>
        </div>

        {/* Statistics */}
        {(stats?.historical || stats?.metrics) && (
          <div className="card-base p-4 md:p-6">
            <h3
              className={cn(
                text('base', 'lg', 'font-semibold'),
                'mb-3 md:mb-4 flex items-center gap-2',
              )}
            >
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              {metric === 'apr'
                ? t('aprStatistics', { default: 'APR Statistics' } as any)
                : t('xnosStatistics', { default: 'xNOS Statistics' } as any)}
              <span className={cn(text('xs', 'xs'), 'text-muted-foreground font-normal')}>
                ({tc(`timeRanges.${stats?.historical?.period ?? statsRange}`)})
              </span>
            </h3>
            <div className="space-y-3">
              {metric === 'xnos' ? (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('currentXnos', { default: 'Current xNOS' } as any)}
                    </span>
                    <span className={text('sm', 'base', 'font-medium')}>
                      {widget?.current?.xnos?.display ?? '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('averageXnos', { default: 'Average xNOS' } as any)}
                    </span>
                    <span className={text('sm', 'base', 'font-medium')}>
                      {stats?.metrics?.xnos?.averageDisplay ?? '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('medianXnos', { default: 'Median xNOS' } as any)}
                    </span>
                    <span className={text('sm', 'base', 'font-medium')}>
                      {stats?.metrics?.xnos?.medianDisplay ?? '-'}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('currentAPR', { default: 'Current APR' } as any)}
                    </span>
                    <span className={text('sm', 'base', 'font-medium')}>
                      {widget?.current?.apr?.display ?? '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('averageAPR', { default: 'Average APR' } as any)}
                    </span>
                    <span className={text('sm', 'base', 'font-medium')}>
                      {stats?.metrics?.apr?.average != null
                        ? `${Number(stats.metrics.apr.average).toFixed(2)}%`
                        : '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('medianAPR', { default: 'Median APR' } as any)}
                    </span>
                    <span className={text('sm', 'base', 'font-medium')}>
                      {stats?.metrics?.apr?.median != null
                        ? `${Number(stats.metrics.apr.median).toFixed(2)}%`
                        : '-'}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('volatility', { default: 'Volatility' } as any)}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  {Number.isFinite(volatilityVal) ? volatilityVal.toFixed(1) : '0'}%
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('dataPoints', { default: 'Data Points' } as any)}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  {stats?.historical?.dataPoints ?? 0}
                </span>
              </div>
            </div>
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground text-center mt-3 pt-3 border-t border-border',
              )}
            >
              {t('statisticsCalculated', { default: 'Statistics calculated for' } as any)}{' '}
              {tc(`timeRanges.${stats?.historical?.period ?? statsRange}`)}{' '}
              {t('period', { default: 'period' } as any)}
            </p>
          </div>
        )}
      </div>

      {/* APY Adjustment Explanation + CTA - Redesigned */}
      <div className="card-base p-6 md:p-8 bg-gradient-to-br from-primary/5 to-secondary/10 border border-primary/20">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mb-4">
            <svg
              className="w-6 h-6 text-primary"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
          </div>
          <h3 className={cn(text('xl', '2xl', 'font-bold'), 'text-primary mb-2')}>
            {t('apyAdjustmentsTitle')}
          </h3>
          <p className={cn(text('sm', 'base'), 'text-muted-foreground max-w-2xl mx-auto')}>
            {t('subtitle')}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Phase 1 */}
          <div className="relative p-6 bg-card rounded-xl border border-border shadow-sm">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center">
              <span
                className={cn(text('xs', 'sm', 'font-bold'), 'text-amber-600 dark:text-amber-400')}
              >
                1
              </span>
            </div>
            <div className="space-y-3">
              <h4
                className={cn(
                  text('lg', 'xl', 'font-semibold'),
                  'text-amber-600 dark:text-amber-400',
                )}
              >
                {t('phase1.title')}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                  <span className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                    {t('labels.change')}:
                  </span>
                  <span
                    className={cn(
                      text('sm', 'base', 'font-semibold'),
                      'text-amber-600 dark:text-amber-400',
                    )}
                  >
                    {t('phase1.change')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  <span className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                    {t('labels.date')}:
                  </span>
                  <span className={text('sm', 'base', 'font-medium')}>{t('phase1.date')}</span>
                </div>
              </div>
              <p
                className={cn(
                  text('xs', 'sm'),
                  'text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg',
                )}
              >
                {t('phase1.reason')}
              </p>
            </div>
          </div>

          {/* Phase 2 */}
          <div className="relative p-6 bg-card rounded-xl border border-border shadow-sm">
            <div className="absolute -top-3 -left-3 w-8 h-8 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center">
              <span
                className={cn(
                  text('xs', 'sm', 'font-bold'),
                  'text-emerald-600 dark:text-emerald-400',
                )}
              >
                2
              </span>
            </div>
            <div className="space-y-3">
              <h4
                className={cn(
                  text('lg', 'xl', 'font-semibold'),
                  'text-emerald-600 dark:text-emerald-400',
                )}
              >
                {t('phase2.title')}
              </h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                  <span className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                    {t('labels.change')}:
                  </span>
                  <span
                    className={cn(
                      text('sm', 'base', 'font-semibold'),
                      'text-emerald-600 dark:text-emerald-400',
                    )}
                  >
                    {t('phase2.change')}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-slate-400 rounded-full"></div>
                  <span className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                    {t('labels.date')}:
                  </span>
                  <span className={text('sm', 'base', 'font-medium')}>{t('phase2.date')}</span>
                </div>
              </div>
              <p
                className={cn(
                  text('xs', 'sm'),
                  'text-muted-foreground leading-relaxed bg-muted/50 p-3 rounded-lg',
                )}
              >
                {t('phase2.reason')}
              </p>
            </div>
          </div>
        </div>

        {/* Why Section */}
        <div className="bg-muted/30 rounded-xl p-6 mb-6">
          <h4 className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 text-center')}>
            {t('why.title')}
          </h4>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-5 h-5 text-blue-600 dark:text-blue-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h5
                className={cn(
                  text('sm', 'base', 'font-semibold'),
                  'text-blue-600 dark:text-blue-400',
                )}
              >
                {t('why.health.title')}
              </h5>
              <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                {t('why.health.desc')}
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-5 h-5 text-green-600 dark:text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h5
                className={cn(
                  text('sm', 'base', 'font-semibold'),
                  'text-green-600 dark:text-green-400',
                )}
              >
                {t('why.growth.title')}
              </h5>
              <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                {t('why.growth.desc')}
              </p>
            </div>
            <div className="text-center space-y-2">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-5 h-5 text-purple-600 dark:text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h5
                className={cn(
                  text('sm', 'base', 'font-semibold'),
                  'text-purple-600 dark:text-purple-400',
                )}
              >
                {t('why.dynamic.title')}
              </h5>
              <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                {t('why.dynamic.desc')}
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="https://dashboard.nosana.com/stake/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            {t('stakeCta')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
          </a>
        </div>
      </div>
    </motion.div>
  );
}
