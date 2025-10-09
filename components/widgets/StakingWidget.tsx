'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, BadgePercent, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { WidgetContainer } from './WidgetLayout';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';
import type { StakingTimeframe, StakingWidgetResponse } from '@/lib/api/types';

const TIMEFRAME_ORDER: StakingTimeframe[] = ['24h', '7d', '30d', '90d', '180d', '1y'];

export function StakingWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const [selectedTimeframe, setSelectedTimeframe] = useState<StakingTimeframe>('24h');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery<StakingWidgetResponse>({
    queryKey: ['widget-staking'],
    queryFn: () => apiClient.getStakingWidget(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const widget = data?.widget;

  const availableTimeframes = useMemo<StakingTimeframe[]>(() => {
    const present = new Set<StakingTimeframe>();
    if (widget?.changes) {
      Object.keys(widget.changes).forEach((key) => {
        present.add(key as StakingTimeframe);
      });
    }
    if (widget?.ranges) {
      Object.keys(widget.ranges).forEach((key) => {
        present.add(key as StakingTimeframe);
      });
    }
    const ordered = TIMEFRAME_ORDER.filter((tf) => present.has(tf));
    return ordered.length ? ordered : TIMEFRAME_ORDER;
  }, [widget?.changes, widget?.ranges]);

  useEffect(() => {
    if (!availableTimeframes.length) return;
    if (!availableTimeframes.includes(selectedTimeframe)) {
      setSelectedTimeframe(availableTimeframes[0]);
    }
  }, [availableTimeframes, selectedTimeframe]);

  const change =
    selectedTimeframe && widget?.changes ? widget.changes[selectedTimeframe] : undefined;
  const range = selectedTimeframe && widget?.ranges ? widget.ranges[selectedTimeframe] : undefined;

  const timeframeOptions = availableTimeframes.map((tf) => ({
    value: tf,
    label: tc(`timeRanges.${tf}`),
  }));

  const trendClass = (trend?: 'up' | 'down' | 'neutral') => {
    if (trend === 'up') return 'text-green-500';
    if (trend === 'down') return 'text-red-500';
    return 'text-muted-foreground';
  };

  const TrendIcon = ({ trend }: { trend?: 'up' | 'down' | 'neutral' }) => {
    if (trend === 'down') return <TrendingDown className="w-3 h-3" />;
    if (trend === 'up') return <TrendingUp className="w-3 h-3" />;
    return null;
  };

  const formatPercentage = (value?: number) => {
    if (value === undefined || value === null || Number.isNaN(value)) return null;
    const sign = value > 0 ? '+' : value < 0 ? '' : '';
    const magnitude = Math.abs(value);
    const decimals = magnitude >= 10 ? 1 : 2;
    return `${sign}${value.toFixed(decimals)}%`;
  };

  const skeleton = (
    <div className="flex flex-col h-full gap-3 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-2">
          <div className="h-6 w-24 bg-muted rounded" />
          <div className="h-3 w-16 bg-muted rounded" />
        </div>
        <div className="h-3 w-20 bg-muted rounded" />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between text-[10px]">
          <div className="h-2 w-16 bg-muted rounded" />
          <div className="h-2 w-16 bg-muted rounded" />
        </div>
        <div className="h-2.5 w-full bg-muted rounded-full" />
        <div className="h-2.5 w-full bg-muted rounded-full" />
      </div>
      <div className="h-2 w-24 bg-muted rounded mx-auto" />
    </div>
  );

  const derivePercentageLabel = (
    change?: { percentage?: number; display?: string | null },
    rangeEntry?: StakingWidgetRangeEntry,
  ) => {
    const fromValue = formatPercentage(change?.percentage);
    if (fromValue) return fromValue;

    if (change?.display) {
      const match = change.display.match(/([+\-]?[\d.,]+)\s*%/);
      if (match) {
        const raw = match[1].replace(/,/g, '');
        const numeric = Number(raw);
        if (!Number.isNaN(numeric)) {
          return formatPercentage(numeric);
        }
        return `${match[1]}%`;
      }
    }

    if (rangeEntry?.changePercentage !== undefined && rangeEntry?.changePercentage !== null) {
      return formatPercentage(rangeEntry.changePercentage);
    }

    if (rangeEntry?.changeDisplay) {
      const match = rangeEntry.changeDisplay.match(/([+\-]?[\d.,]+)\s*%/);
      if (match) {
        const raw = match[1].replace(/,/g, '');
        const numeric = Number(raw);
        if (!Number.isNaN(numeric)) {
          return formatPercentage(numeric);
        }
        return `${match[1]}%`;
      }
    }

    return null;
  };

  const resolveTrendFromRange = (rangeEntry?: StakingWidgetRangeEntry) => {
    if (
      !rangeEntry ||
      rangeEntry.changePercentage === undefined ||
      rangeEntry.changePercentage === null
    ) {
      return 'neutral' as const;
    }
    if (rangeEntry.changePercentage > 0) return 'up' as const;
    if (rangeEntry.changePercentage < 0) return 'down' as const;
    return 'neutral' as const;
  };

  const computePosition = (value?: number, low?: number, high?: number) => {
    if (
      value === undefined ||
      value === null ||
      low === undefined ||
      low === null ||
      high === undefined ||
      high === null ||
      high === low
    ) {
      return 0;
    }
    const pct = ((value - low) / (high - low)) * 100;
    return Math.min(100, Math.max(0, pct));
  };

  const lastUpdatedLabel = useFormattedTimestamp(widget?.lastUpdate, {
    absoluteFormat: 'HH:mm',
    fallbackRelative: '—',
  });

  const xnosChangeLabel = derivePercentageLabel(change?.xnos, range?.xnos);
  const aprChangeLabel = derivePercentageLabel(change?.apr, range?.apr);
  const xnosTrend = change?.xnos?.trend ?? resolveTrendFromRange(range?.xnos);
  const aprTrend = change?.apr?.trend ?? resolveTrendFromRange(range?.apr);

  return (
    <WidgetContainer
      title={tw('staking') || 'Staking'}
      icon={Layers}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      href="staking-dapp"
      headerAction={
        timeframeOptions.length > 0 ? (
          <div className="relative">
            <motion.button
              className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-secondary transition-colors"
              onClick={() => setDropdownOpen(!dropdownOpen)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tc(`timeRanges.${selectedTimeframe}`)}
              <ChevronDown
                className={cn('w-3 h-3 transition-transform', dropdownOpen && 'rotate-180')}
              />
            </motion.button>
            <AnimatePresence>
              {dropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[90px] overflow-hidden"
                  >
                    {timeframeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedTimeframe(option.value);
                          setDropdownOpen(false);
                        }}
                        className={cn(
                          'block w-full px-3 py-1.5 text-xs text-left transition-colors hover:bg-secondary',
                          selectedTimeframe === option.value && 'bg-secondary',
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        ) : null
      }
      className="h-full"
      contentClassName="p-2 md:p-3"
      isMobile={isMobile}
    >
      {isLoading && (
        <div className="animate-pulse space-y-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="h-3 bg-muted rounded w-16" />
              <div className="flex items-center gap-2">
                <div className="h-6 bg-muted rounded w-20" />
                <div className="h-4 bg-muted rounded w-12" />
              </div>
            </div>
            <div className="space-y-1">
              <div className="h-3 bg-muted rounded w-20" />
              <div className="flex items-center gap-2">
                <div className="h-6 bg-muted rounded w-16" />
                <div className="h-4 bg-muted rounded w-10" />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="space-y-1">
              <div className="flex justify-between">
                <div className="h-2.5 bg-muted rounded w-14" />
                <div className="h-2.5 bg-muted rounded w-14" />
              </div>
              <div className="h-2 bg-muted rounded" />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <div className="h-2.5 bg-muted rounded w-20" />
                <div className="h-2.5 bg-muted rounded w-20" />
              </div>
              <div className="h-2 bg-muted rounded" />
            </div>
          </div>
        </div>
      )}

      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center h-full gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
          <span>
            {tc('error')}: {error.message}
          </span>
          <button
            onClick={() => refetch()}
            className="px-2 py-1 text-xs border rounded hover:bg-secondary"
          >
            {isFetching ? tc('loading') : tc('retry')}
          </button>
        </div>
      )}

      {widget && !isLoading && !error ? (
        <div className="flex flex-col h-full gap-2">
          {/* Current values */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <Layers className="w-3 h-3 text-primary" />
                <span className="widget-label">{tw('xnos')}</span>
              </div>
              <div className="flex items-center gap-2">
                <motion.p
                  className="widget-value font-bold"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {widget.xnos.display}
                </motion.p>
                {xnosChangeLabel && (
                  <motion.div
                    className={cn('flex items-center gap-1 text-sm', trendClass(xnosTrend))}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                  >
                    <TrendIcon trend={xnosTrend} />
                    <span className="font-medium text-xs">{xnosChangeLabel}</span>
                  </motion.div>
                )}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 mb-0.5">
                <BadgePercent className="w-3 h-3 text-blue-500" />
                <span className="widget-label">{tw('apr')}</span>
                {widget.apr.tier && (
                  <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-secondary text-muted-foreground uppercase tracking-wide">
                    {widget.apr.tier}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <motion.p
                  className="widget-value font-bold"
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 }}
                >
                  {widget.apr.display}
                </motion.p>
                {aprChangeLabel && (
                  <motion.div
                    className={cn('flex items-center gap-1 text-sm', trendClass(aprTrend))}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <TrendIcon trend={aprTrend} />
                    <span className="font-medium text-xs">{aprChangeLabel}</span>
                  </motion.div>
                )}
              </div>
            </div>
          </div>

          {/* Range visualisations */}
          <div className="flex-1 flex flex-col justify-center gap-2">
            {range?.xnos && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex justify-between text-[10px] font-medium mb-1">
                  <span className="text-muted-foreground">
                    {tw('xnos')}:{' '}
                    <span className="text-foreground">{range.xnos.lowDisplay ?? tc('na')}</span>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground">{range.xnos.highDisplay ?? tc('na')}</span>
                  </span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-1 bg-muted rounded-full mx-0.5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${computePosition(widget.xnos.current, range.xnos.low, range.xnos.high)}%`,
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      >
                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-emerald-500 rounded-full shadow-sm border border-background" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {range?.apr && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.05 }}
              >
                <div className="flex justify-between text-[10px] font-medium mb-1">
                  <span className="text-muted-foreground">
                    {tw('apr')}:{' '}
                    <span className="text-foreground">{range.apr.lowDisplay ?? tc('na')}</span>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground">{range.apr.highDisplay ?? tc('na')}</span>
                  </span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-1 bg-muted rounded-full mx-0.5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-sky-500 to-purple-500 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${computePosition(widget.apr.current, range.apr.low, range.apr.high)}%`,
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                      >
                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full shadow-sm border border-background" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* Footer */}
          <motion.div
            className="flex flex-col gap-1 pt-1 text-[10px] text-muted-foreground"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center justify-between">
              <span>
                {selectedTimeframe ? tc(`timeRanges.${selectedTimeframe}`) : ''} {tw('range')}
              </span>
              {widget?.lastUpdate && (
                <span>
                  {tw('lastUpdated')}: {lastUpdatedLabel}
                </span>
              )}
            </div>
          </motion.div>
        </div>
      ) : (
        !isLoading && (
          <div className="flex items-center justify-center h-full text-xs md:text-sm text-muted-foreground">
            {tc('noData')}
          </div>
        )
      )}
    </WidgetContainer>
  );
}
