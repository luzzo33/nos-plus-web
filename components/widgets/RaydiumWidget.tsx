'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DollarSign, Waves, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { WidgetContainer } from './WidgetLayout';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import type { RaydiumWidgetData } from '@/lib/api/types';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';

type WidgetTimeRange = '24h' | '7d' | '30d' | '90d' | '180d' | '1y';

export function RaydiumWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const [selectedTimeframe, setSelectedTimeframe] = useState<WidgetTimeRange>('24h');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery<{
    success: boolean;
    widget: RaydiumWidgetData;
    meta?: any;
  }>({
    queryKey: ['widget-raydium'],
    queryFn: () => apiClient.getRaydiumWidgetData(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const widget = data?.widget;
  const change = widget?.changes?.[selectedTimeframe];
  const range = widget?.ranges?.[selectedTimeframe];
  const lastUpdatedLabel = useFormattedTimestamp(widget?.current?.lastUpdate, {
    absoluteFormat: 'HH:mm',
    fallbackRelative: '—',
  });

  const timeframeOptions: Array<{ value: WidgetTimeRange; label: string; disabled?: boolean }> = (
    [
      { value: '24h' as WidgetTimeRange, label: tc('timeRanges.24h') },
      { value: '7d' as WidgetTimeRange, label: tc('timeRanges.7d') },
      { value: '30d' as WidgetTimeRange, label: tc('timeRanges.30d') },
      { value: '90d' as WidgetTimeRange, label: tc('timeRanges.90d') },
      { value: '180d' as WidgetTimeRange, label: tc('timeRanges.180d') },
      { value: '1y' as WidgetTimeRange, label: tc('timeRanges.1y') },
    ] as const
  ).map((o) => ({ ...o, disabled: false }));

  const isAprUp = change?.apr && change.apr.absolute >= 0;
  const isLiqUp = change?.liquidity && change.liquidity.absolute >= 0;

  const formatNumber = (v: number | undefined) => {
    if (v === undefined || v === null) return '-';
    if (v >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
    if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
    if (v >= 1_000) return (v / 1_000).toFixed(1) + 'K';
    return v.toFixed(2);
  };

  const skeleton = (
    <div className="animate-pulse space-y-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <div className="h-3 bg-muted rounded w-12" />
          <div className="flex items-center gap-2">
            <div className="h-6 bg-muted rounded w-16" />
            <div className="h-4 bg-muted rounded w-8" />
          </div>
        </div>
        <div className="space-y-1">
          <div className="h-3 bg-muted rounded w-16" />
          <div className="flex items-center gap-2">
            <div className="h-6 bg-muted rounded w-20" />
            <div className="h-4 bg-muted rounded w-8" />
          </div>
        </div>
      </div>
      <div className="space-y-2">
        <div className="space-y-1">
          <div className="flex justify-between">
            <div className="h-2.5 bg-muted rounded w-12" />
            <div className="h-2.5 bg-muted rounded w-12" />
          </div>
          <div className="h-2 bg-muted rounded" />
        </div>
        <div className="space-y-1">
          <div className="flex justify-between">
            <div className="h-2.5 bg-muted rounded w-16" />
            <div className="h-2.5 bg-muted rounded w-16" />
          </div>
          <div className="h-2 bg-muted rounded" />
        </div>
      </div>
      <div className="h-2 w-24 bg-muted rounded" />
    </div>
  );

  return (
    <WidgetContainer
      title={tw('raydium') || 'Raydium'}
      icon={Waves}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      href="raydium?section=overview"
      headerAction={
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
      }
      className="h-full"
      contentClassName="p-2 md:p-3"
      isMobile={isMobile}
    >
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center h-full gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
          <span>
            {tc('error') || 'Error'}: {error.message}
          </span>
          <button
            onClick={() => refetch()}
            className="px-2 py-1 text-xs border rounded hover:bg-secondary"
          >
            {isFetching ? tc('loading') : tc('retry') || 'Retry'}
          </button>
        </div>
      )}
      {widget && !isLoading && !error ? (
        <div className="flex flex-col h-full">
          {/* Current Values - APR and Liquidity at top */}
          <div className="flex-shrink-0 mb-2">
            <div className="grid grid-cols-2 gap-2 md:gap-3">
              <div>
                <div className="flex items-center gap-0.5 md:gap-1 mb-0.5">
                  <DollarSign className="w-3 h-3 text-primary" />
                  <span className="widget-label">{tw('apr')}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <motion.p
                    className="widget-value font-bold"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {widget.current.apr.display}
                  </motion.p>
                  {change?.apr && (
                    <motion.div
                      className={cn(
                        'flex items-center gap-0.5',
                        (change.apr.percentage ?? 0) >= 0 ? 'text-green-500' : 'text-red-500',
                      )}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {(change.apr.percentage ?? 0) >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span className="font-medium text-xs md:text-sm">
                        {(change.apr.percentage ?? 0).toFixed(1)}%
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-0.5 md:gap-1 mb-0.5">
                  <Waves className="w-3 h-3 text-blue-500" />
                  <span className="widget-label">{tw('liquidity')}</span>
                </div>
                <div className="flex items-center gap-1.5 md:gap-2">
                  <motion.p
                    className="widget-value font-bold"
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                  >
                    {widget.current.liquidity.display}
                  </motion.p>
                  {change?.liquidity && (
                    <motion.div
                      className={cn(
                        'flex items-center gap-0.5',
                        (change.liquidity.percentage ?? 0) >= 0 ? 'text-green-500' : 'text-red-500',
                      )}
                      initial={{ opacity: 0, x: -5 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 }}
                    >
                      {(change.liquidity.percentage ?? 0) >= 0 ? (
                        <TrendingUp className="w-3 h-3" />
                      ) : (
                        <TrendingDown className="w-3 h-3" />
                      )}
                      <span className="font-medium text-xs md:text-sm">
                        {(change.liquidity.percentage ?? 0).toFixed(1)}%
                      </span>
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Range Bars */}
          <div className="flex-1 flex flex-col justify-center space-y-2">
            {/* APR Range */}
            {range?.apr && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex justify-between text-[10px] font-medium mb-1">
                  <span className="text-muted-foreground">
                    {tw('apr')}: <span className="text-foreground">{range.apr.lowDisplay}</span>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground">{range.apr.highDisplay}</span>
                  </span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-1 bg-muted rounded-full mx-0.5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, Math.max(0, ((widget.current.apr.value - range.apr.low) / (range.apr.high - range.apr.low)) * 100))}%`,
                        }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      >
                        <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full shadow-sm border border-background" />
                      </motion.div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Liquidity Range */}
            {range?.liquidity && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex justify-between text-[10px] font-medium mb-1">
                  <span className="text-muted-foreground">
                    {tw('liquidity')}:{' '}
                    <span className="text-foreground">{range.liquidity.lowDisplay}</span>
                  </span>
                  <span className="text-muted-foreground">
                    <span className="text-foreground">{range.liquidity.highDisplay}</span>
                  </span>
                </div>
                <div className="relative h-2 bg-secondary rounded-full">
                  <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                    <div className="w-full h-1 bg-muted rounded-full mx-0.5">
                      <motion.div
                        className="h-full bg-gradient-to-r from-green-500 to-blue-500 rounded-full relative"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, Math.max(0, ((widget.current.liquidity.value - range.liquidity.low) / (range.liquidity.high - range.liquidity.low)) * 100))}%`,
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

          {/* Last Updated Footer */}
          <motion.div
            className="flex-shrink-0 pt-1"
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">
                {tc(`timeRanges.${selectedTimeframe}`)} {tw('range')}
              </span>
              {widget.current.lastUpdate && (
                <span className="text-[10px] text-muted-foreground">
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
