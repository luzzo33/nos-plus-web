'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, TrendingUpDown, BarChart3, ChevronDown, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';

interface OverviewSectionProps {
  widget: any;
  stats: any;
  statsRange: TimeRange;
  mounted: boolean;
  loading?: boolean;
}

export function OverviewSection({
  widget,
  stats,
  statsRange,
  mounted,
  loading = false,
}: OverviewSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('price.overview');
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
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="p-2 md:p-3 bg-secondary/40 rounded-lg">
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
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="space-y-1">
                  <div className="relative skeleton h-3 w-20 rounded">
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
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between">
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
    if (showAll) {
      setExpandedRanges(['24h', '7d', '30d', '90d', '180d', '1y']);
    } else {
      setExpandedRanges(['24h', '7d', '30d']);
    }
  };

  const shouldShowMovingAverages = (range: TimeRange): boolean => {
    return range !== '24h';
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Price Changes Grid */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-2',
          )}
        >
          <Clock className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('priceChanges')}
        </h3>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 md:gap-3">
          {Object.entries(widget.changes).map(([period, data]) => (
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
                  data.value >= 0 ? 'text-green-500' : 'text-red-500',
                )}
              >
                {data.value.toFixed(2)}%
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Market Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Price Ranges */}
        <div className="card-base p-4 md:p-6">
          <h3
            className={cn(
              text('base', 'lg', 'font-semibold'),
              'mb-3 md:mb-4 flex items-center gap-2',
            )}
          >
            <TrendingUpDown className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            {t('priceRanges')}
          </h3>
          <div className="space-y-3">
            {Object.entries(widget.ranges).map(([period, range]) => {
              if (!range) return null;
              const shouldShow = expandedRanges.includes(period);

              return (
                <AnimatePresence key={period}>
                  {shouldShow && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="space-y-1">
                        <div className={cn('flex items-center justify-between', text('xs', 'sm'))}>
                          <span className="font-medium uppercase">
                            {tc(`timeRanges.${period}`)}
                          </span>
                          <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                            {range.lowDisplay} - {range.highDisplay}
                          </span>
                        </div>
                        <div className="relative h-4 bg-secondary rounded overflow-hidden">
                          <div
                            className="absolute h-full bg-gradient-to-r from-green-500/20 to-red-500/20"
                            style={{ width: '100%' }}
                          />
                          <div
                            className="absolute h-full w-0.5 bg-primary top-0"
                            style={{
                              left: `${((widget.price.current - range.low) / (range.high - range.low)) * 100}%`,
                            }}
                          />
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
            {expandedRanges.length === 6 ? t('showLess') : t('showAllRanges')}
            <ChevronDown
              className={cn(
                'w-3 h-3 transition-transform',
                expandedRanges.length === 6 && 'rotate-180',
              )}
            />
          </button>
        </div>

        {/* Price Statistics */}
        {stats && (
          <div className="card-base p-4 md:p-6">
            <h3
              className={cn(
                text('base', 'lg', 'font-semibold'),
                'mb-3 md:mb-4 flex items-center gap-2',
              )}
            >
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              {t('priceStatistics')}
              <span className={cn(text('xs', 'xs'), 'text-muted-foreground font-normal')}>
                ({tc(`timeRanges.${statsRange}`)})
              </span>
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('averagePrice')}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  ${stats.historical.average.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('medianPrice')}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  ${stats.distribution.median.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('standardDeviation')}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  ${stats.distribution.standardDeviation.toFixed(4)}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('dataPoints')}
                </span>
                <span className={text('sm', 'base', 'font-medium')}>
                  {stats.historical.dataPoints}
                </span>
              </div>
            </div>
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground text-center mt-3 pt-3 border-t border-border',
              )}
            >
              {t('statisticsCalculated')} {tc(`timeRanges.${stats.historical.period}`)}{' '}
              {t('period')}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}
