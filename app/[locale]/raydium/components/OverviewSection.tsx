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
  metric: 'liquidity' | 'apr';
  loading?: boolean;
}

export function OverviewSection({
  widget,
  stats,
  statsRange,
  mounted,
  metric,
  loading = false,
}: OverviewSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('raydium.overview');
  const tc = useTranslations('common');
  const [expandedRanges, setExpandedRanges] = useState<string[]>(['24h', '7d', '30d']);
  const isHydrated = mounted || loading;

  if (!isHydrated) return null;

  if (loading || !widget) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="card-base p-4 md:p-6">
          <div className="relative skeleton h-5 w-48 mb-4 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-2 md:p-3 bg-secondary/40 rounded-lg">
                <div className="space-y-2">
                  <div className="relative skeleton h-3 w-16 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                  <div className="relative skeleton h-5 w-20 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="card-base p-4 md:p-6">
            <div className="relative skeleton h-5 w-40 mb-4 rounded">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="space-y-1">
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
            <div className="relative skeleton h-5 w-44 mb-4 rounded">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="relative skeleton h-3 w-24 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                  <div className="relative skeleton h-4 w-16 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

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
      typeof stats?.metrics?.liquidity?.stability?.volatility === 'number'
        ? Number(stats.metrics.liquidity.stability.volatility)
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
            : t('liquidityChanges', { default: 'Liquidity Changes' } as any)}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {Object.entries(widget.changes || {})
            .filter(([period]) => period !== 'all')
            .map(([period, data]: any) => {
              const pct = (
                metric === 'apr' ? data?.apr?.percentage : data?.liquidity?.percentage
              ) as number | undefined;
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
              : t('liquidityRanges', { default: 'Liquidity Ranges' } as any)}
          </h3>
          <div className="space-y-3">
            {Object.entries(widget.ranges || {}).map(([period, range]: any) => {
              const r = metric === 'apr' ? range?.apr : range?.liquidity;
              if (!r) return null;
              const avg = Number(r.average) || (Number(r.low) + Number(r.high)) / 2 || 0;
              const current =
                metric === 'apr'
                  ? Number(widget.current?.apr?.value) || 0
                  : Number(widget.current?.liquidity?.value) || 0;
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
                : t('liquidityStatistics', { default: 'Liquidity Statistics' } as any)}
              <span className={cn(text('xs', 'xs'), 'text-muted-foreground font-normal')}>
                ({tc(`timeRanges.${stats?.historical?.period ?? statsRange}`)})
              </span>
            </h3>
            <div className="space-y-3">
              {metric === 'liquidity' ? (
                <>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('currentLiquidity', { default: 'Current Liquidity' } as any)}
                    </span>
                    <span className={text('sm', 'base', 'font-medium')}>
                      {widget?.current?.liquidity?.display ?? '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('averageLiquidity', { default: 'Average Liquidity' } as any)}
                    </span>
                    <span className={text('sm', 'base', 'font-medium')}>
                      {stats?.historical?.liquidity?.averageDisplay ?? '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-border">
                    <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('medianLiquidity', { default: 'Median Liquidity' } as any)}
                    </span>
                    <span className={text('sm', 'base', 'font-medium')}>
                      {stats?.historical?.liquidity?.medianDisplay ?? '-'}
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
    </motion.div>
  );
}
