'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, BarChart3, Clock, TrendingUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

import type { TimeRange } from '@/lib/api/client';
import type { AccountsWidgetData, BalancesStatsResponse } from '@/lib/api/balances-client';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';

interface OverviewSectionProps {
  widget: AccountsWidgetData;
  stats: BalancesStatsResponse['stats'] | null | undefined;
  statsRange: TimeRange;
  mounted: boolean;
  metric: 'total' | 'stakers' | 'unstakers';
}

const orderedRanges: TimeRange[] = ['24h', '7d', '30d', '90d', '180d', '1y'];

interface ChangeDelta {
  absolute?: number;
  percentage?: number;
  display?: string;
}

interface ChangeEntry {
  accounts?: {
    total?: ChangeDelta;
    staking?: ChangeDelta;
    unstaking?: ChangeDelta;
  };
  amounts?: {
    staking?: ChangeDelta;
    unstaking?: ChangeDelta;
  };
}

interface RangeEntry {
  low?: number;
  high?: number;
  average?: number;
  lowDisplay?: string;
  highDisplay?: string;
  averageDisplay?: string;
  changePercentage?: number;
  changeDisplay?: string;
}

interface AccountsRangeGroup {
  total?: RangeEntry;
  staking?: RangeEntry;
  unstaking?: RangeEntry;
}
type WidgetRanges = Record<string, { accounts?: AccountsRangeGroup; amounts?: any }>;

export function OverviewSection({
  widget,
  stats,
  statsRange,
  mounted,
  metric,
}: OverviewSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakersUnstakers.overview');
  const tc = useTranslations('common');
  const [expandedRanges, setExpandedRanges] = useState<string[]>(['24h', '7d', '30d']);
  const toggleRangeExpansion = (showAll: boolean) => {
    setExpandedRanges(showAll ? ['24h', '7d', '30d', '90d', '180d', '1y'] : ['24h', '7d', '30d']);
  };

  const changeRows = useMemo(() => {
    const entries = Object.entries(widget.changes ?? {}) as Array<[string, ChangeEntry]>;
    const filtered = entries
      .filter(([key]) => orderedRanges.includes(key as TimeRange))
      .sort(
        (a, b) =>
          orderedRanges.indexOf(a[0] as TimeRange) - orderedRanges.indexOf(b[0] as TimeRange),
      );
    return filtered;
  }, [widget.changes]);

  const allRanges = (widget.ranges ?? {}) as WidgetRanges;

  const historicalStats = stats?.historical;

  const currentTotals = widget.current?.accounts;

  if (!mounted) return null;

  const volatilityVal = (() => {
    const stability = (stats as any)?.metrics?.accounts?.stability;
    if (!stability) return 0;
    if (metric === 'total' && typeof stability.total?.volatility === 'number')
      return stability.total.volatility;
    if (metric === 'stakers' && typeof stability.stakers?.volatility === 'number')
      return stability.stakers.volatility;
    if (metric === 'unstakers' && typeof stability.unstakers?.volatility === 'number')
      return stability.unstakers.volatility;
    return 0;
  })();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Changes Grid - always show all periods (no show more/less) like Raydium liquidity changes */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('changeTitle')}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {changeRows.map(([period, data]) => {
            const target =
              metric === 'total'
                ? data?.accounts?.total
                : metric === 'stakers'
                  ? data?.accounts?.staking
                  : data?.accounts?.unstaking;
            const pct = target?.percentage;
            const abs = target?.absolute;
            const positive = (pct ?? abs ?? 0) >= 0;
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
                  {tc(`timeRanges.${period as TimeRange}`)}
                </p>
                <p
                  className={cn(
                    text('base', 'lg', 'font-bold'),
                    positive ? 'text-green-500' : 'text-red-500',
                  )}
                >
                  {pct != null
                    ? `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`
                    : `${abs! >= 0 ? '+' : ''}${Math.round(abs ?? 0).toLocaleString()}`}
                </p>
              </div>
            );
          })}
        </div>
        {/* No toggle button here per Raydium style */}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Ranges with current vs avg bar (parity with Raydium) */}
        <div className="card-base p-4 md:p-6">
          <h3
            className={cn(
              text('base', 'lg', 'font-semibold'),
              'mb-3 md:mb-4 flex items-center gap-2',
            )}
          >
            <TrendingUpDown className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            {t('accountsRanges', { default: 'Accounts Ranges' } as any)}
          </h3>
          <div className="space-y-3">
            {orderedRanges
              .filter((range) => allRanges?.[range])
              .map((range) => {
                const entry = allRanges?.[range];
                const group = entry?.accounts;
                if (!group) return null;
                const selectedRange: RangeEntry | undefined =
                  metric === 'total'
                    ? group.total
                    : metric === 'stakers'
                      ? group.staking
                      : group.unstaking;
                if (!selectedRange) return null;

                const avg =
                  typeof selectedRange.average === 'number'
                    ? selectedRange.average
                    : selectedRange.low != null && selectedRange.high != null
                      ? (selectedRange.low + selectedRange.high) / 2
                      : 0;

                const current =
                  metric === 'total'
                    ? Number(widget.current?.accounts?.total ?? widget.accounts?.total?.count ?? 0)
                    : metric === 'stakers'
                      ? Number(
                          widget.current?.accounts?.staking ?? widget.accounts?.staking?.count ?? 0,
                        )
                      : Number(
                          widget.current?.accounts?.unstaking ??
                            widget.accounts?.unstaking?.count ??
                            0,
                        );

                const percentOfAvg = avg > 0 ? Math.min((current / avg) * 100, 200) : 0;
                const changePct =
                  typeof selectedRange.changePercentage === 'number'
                    ? selectedRange.changePercentage
                    : undefined;
                const changeDisplay =
                  selectedRange.changeDisplay ??
                  (changePct != null
                    ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%`
                    : undefined);

                return (
                  <AnimatePresence key={range}>
                    {expandedRanges.includes(range) && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="p-3 bg-secondary/30 rounded-lg space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className={cn(text('xs', 'sm', 'font-medium uppercase'))}>
                            {tc(`timeRanges.${range}`)}
                          </span>
                          {changeDisplay && (
                            <span
                              className={cn(
                                text('xs', 'sm', 'font-bold'),
                                (changePct ?? 0) >= 0 ? 'text-green-500' : 'text-red-500',
                              )}
                            >
                              {changeDisplay}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-[10px] sm:text-xs">
                          <div>
                            <span className="text-muted-foreground">
                              {t('low', { default: 'Low' } as any)}
                            </span>
                            <span className="ml-1 font-medium">
                              {selectedRange.lowDisplay ??
                                (selectedRange.low != null
                                  ? Math.round(selectedRange.low).toLocaleString()
                                  : '—')}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {t('avg', { default: 'Avg' } as any)}
                            </span>
                            <span className="ml-1 font-medium">
                              {selectedRange.averageDisplay ??
                                (avg ? Math.round(avg).toLocaleString() : '—')}
                            </span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">
                              {t('high', { default: 'High' } as any)}
                            </span>
                            <span className="ml-1 font-medium">
                              {selectedRange.highDisplay ??
                                (selectedRange.high != null
                                  ? Math.round(selectedRange.high).toLocaleString()
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
            {expandedRanges.length === 6 ? t('showLess') : t('showAllRanges')}
            <ChevronDown
              className={cn(
                'w-3 h-3 transition-transform',
                expandedRanges.length === 6 && 'rotate-180',
              )}
            />
          </button>
        </div>

        {/* Statistics card parity with Raydium */}
        <div className="card-base p-4 md:p-6">
          <h3
            className={cn(
              text('base', 'lg', 'font-semibold'),
              'mb-3 md:mb-4 flex items-center gap-2',
            )}
          >
            <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            {t('historicalTitle')}
            <span className={cn(text('xs', 'xs'), 'text-muted-foreground font-normal')}>
              ({tc(`timeRanges.${(stats as any)?.historical?.period ?? statsRange}`)})
            </span>
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                {t('currentValue')}
              </span>
              <span className={text('sm', 'base', 'font-medium')}>
                {metric === 'total'
                  ? (currentTotals?.total ?? widget.accounts?.total?.count)?.toLocaleString()
                  : metric === 'stakers'
                    ? (currentTotals?.staking ?? widget.accounts?.staking?.count)?.toLocaleString()
                    : (
                        currentTotals?.unstaking ?? widget.accounts?.unstaking?.count
                      )?.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                {t('historicalAverage')}
              </span>
              <span className={text('sm', 'base', 'font-medium')}>
                {(() => {
                  const node =
                    metric === 'total'
                      ? (historicalStats as any)?.total
                      : metric === 'stakers'
                        ? (historicalStats as any)?.stakers
                        : (historicalStats as any)?.unstakers;
                  const avgVal = node?.avg ?? node?.average;
                  return avgVal !== undefined ? Math.round(avgVal).toLocaleString() : '—';
                })()}
              </span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-border">
              <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                {t('historicalMedian')}
              </span>
              <span className={text('sm', 'base', 'font-medium')}>
                {(() => {
                  const node =
                    metric === 'total'
                      ? (historicalStats as any)?.total
                      : metric === 'stakers'
                        ? (historicalStats as any)?.stakers
                        : (historicalStats as any)?.unstakers;
                  const medianVal = node?.median;
                  return medianVal !== undefined ? Math.round(medianVal).toLocaleString() : '—';
                })()}
              </span>
            </div>
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
                {t('dataPoints')}
              </span>
              <span className={text('sm', 'base', 'font-medium')}>
                {(stats as any)?.historical?.dataPoints ?? 0}
              </span>
            </div>
          </div>
          {stats?.historical?.period?.start && stats?.historical?.period?.end && (
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground text-center mt-3 pt-3 border-t border-border',
              )}
            >
              {t('statisticsCalculated', { default: 'Statistics calculated for' } as any)}{' '}
              {tc(`timeRanges.${(stats as any)?.historical?.period ?? statsRange}`)}{' '}
              {t('period', { default: 'period' } as any)}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}
