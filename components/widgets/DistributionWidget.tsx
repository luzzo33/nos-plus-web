'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, ChevronDown, TrendingUp, TrendingDown, Info } from 'lucide-react';
import { WidgetContainer } from './WidgetLayout';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';

type TimeRange = '24h' | '7d' | '30d' | '90d' | '180d' | '1y';

export function DistributionWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeRange>('24h');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery({
    queryKey: ['distribution-widget'],
    queryFn: () => apiClient.getDistributionWidgetData(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const widget = data?.widget;
  const lastUpdatedLabel = useFormattedTimestamp(widget?.current?.lastUpdate, {
    absoluteFormat: 'HH:mm:ss',
    fallbackAbsolute: '--:--:--',
    fallbackRelative: '—',
  });

  const timeframeOptions: Array<{ value: TimeRange; label: string }> = [
    { value: '24h', label: tc('timeRanges.24h') },
    { value: '7d', label: tc('timeRanges.7d') },
    { value: '30d', label: tc('timeRanges.30d') },
    { value: '90d', label: tc('timeRanges.90d') },
    { value: '180d', label: tc('timeRanges.180d') },
    { value: '1y', label: tc('timeRanges.1y') },
  ];

  const categoryConfig = [
    { key: 'micro', label: 'Micro', range: '<50', color: '#ef4444' },
    { key: 'small', label: 'Small', range: '50-500', color: '#f97316' },
    { key: 'medium', label: 'Medium', range: '500-5K', color: '#eab308' },
    { key: 'large', label: 'Large', range: '5K-20K', color: '#22c55e' },
    { key: 'xlarge', label: 'X-Large', range: '20K-50K', color: '#3b82f6' },
    { key: 'whale', label: 'Whale', range: '50K-150K', color: '#8b5cf6' },
    { key: 'megaWhale', label: 'Mega Whale', range: '>150K', color: '#ec4899' },
  ];

  const formatValue = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="w-3 h-3" />;
    if (change < 0) return <TrendingDown className="w-3 h-3" />;
    return null;
  };

  const getLogBarHeight = (
    percentage: number,
    maxPercentage: number,
    isUniform: boolean = false,
  ) => {
    if (isUniform) return 24;

    if (percentage <= 0) return 8;
    if (maxPercentage <= 0) return 8;

    const logValue = Math.log10(percentage + 0.1);
    const maxLogValue = Math.log10(maxPercentage + 0.1);
    const minLogValue = Math.log10(0.1);

    const normalizedLog = (logValue - minLogValue) / (maxLogValue - minLogValue);
    return Math.max(normalizedLog * 80 + 16, 8);
  };

  const maxPercentage = widget ? Math.max(...Object.values(widget.current.percentages)) : 0;
  const barRegionHeight = selectedCategory
    ? isMobile
      ? 'h-14'
      : 'h-16'
    : isMobile
      ? 'h-28'
      : 'h-32';

  const skeleton = (
    <div className="flex flex-col h-full gap-3 md:gap-4 animate-pulse">
      <div className="flex justify-between">
        <div className="h-5 md:h-6 w-20 md:w-24 bg-muted rounded" />
        <div className="h-5 md:h-6 w-14 md:w-16 bg-muted rounded" />
      </div>
      <div className="flex-1 grid grid-cols-7 gap-1.5 md:gap-2">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="flex flex-col h-full justify-end items-center gap-1.5 md:gap-2">
            <div className="w-5 md:w-6 bg-muted rounded-t" style={{ height: `${34 + i * 4}px` }} />
            <div className="h-2 w-8 md:w-10 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="h-2 w-32 md:w-40 bg-muted rounded mx-auto" />
    </div>
  );

  return (
    <WidgetContainer
      title={tw('distribution')}
      icon={BarChart3}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      href="holders?section=distribution"
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
                  className="absolute right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[80px] overflow-hidden"
                >
                  {timeframeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedTimeframe(option.value);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        'block w-full px-3 py-1.5 text-xs text-left hover:bg-secondary transition-colors',
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
      {widget ? (
        <div className="flex flex-col h-full">
          {/* Logarithmic Bar Chart */}
          <div
            className={cn(
              'flex-1 flex justify-between gap-1 mb-2 md:mb-3 transition-all duration-300',
              barRegionHeight,
            )}
          >
            {categoryConfig.map((category, index) => {
              const percentage =
                widget.current.percentages[category.key as keyof typeof widget.current.percentages];
              const count =
                widget.current.brackets[category.key as keyof typeof widget.current.brackets];
              const change =
                widget.changes?.[selectedTimeframe]?.brackets[
                  category.key as keyof (typeof widget.changes)[typeof selectedTimeframe]['brackets']
                ];

              if (percentage === undefined || count === undefined) return null;

              const changeValue = change?.absolute || 0;
              const baseBarHeight = getLogBarHeight(percentage, maxPercentage, !!selectedCategory);
              const barHeight = isMobile ? Math.max(baseBarHeight * 0.85, 8) : baseBarHeight;
              const isSelected = selectedCategory === category.key;

              return (
                <motion.div
                  key={category.key}
                  className="flex-1 flex flex-col justify-end items-center cursor-pointer group h-full"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() =>
                    setSelectedCategory(selectedCategory === category.key ? null : category.key)
                  }
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {/* Bar */}
                  <div className="w-full flex flex-col items-center">
                    <motion.div
                      className={cn(
                        'w-full rounded-t-sm transition-all duration-300 relative overflow-hidden',
                        isSelected ? 'ring-2 ring-primary/50' : '',
                      )}
                      style={{
                        backgroundColor: category.color,
                        height: `${barHeight}px`,
                        minHeight: '8px',
                      }}
                      initial={{ height: 0 }}
                      animate={{ height: `${barHeight}px` }}
                      transition={{ duration: 0.6, delay: index * 0.1, ease: 'easeOut' }}
                    >
                      {/* Animated gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20" />

                      {/* Change indicator - Arrow with stem */}
                      {change && changeValue !== 0 && (
                        <motion.div
                          className={cn(
                            'absolute top-1 right-1 flex items-center justify-center drop-shadow-sm',
                            changeValue > 0 ? 'text-white' : 'text-black',
                          )}
                          initial={{ scale: 0, rotate: 180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={{ delay: index * 0.1 + 0.3, type: 'spring', stiffness: 400 }}
                        >
                          {changeValue > 0 ? (
                            <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                              <path d="M4 1L7 5H5V9H3V5H1L4 1Z" />
                            </svg>
                          ) : (
                            <svg width="8" height="10" viewBox="0 0 8 10" fill="currentColor">
                              <path d="M4 9L1 5H3V1H5V5H7L4 9Z" />
                            </svg>
                          )}
                        </motion.div>
                      )}
                    </motion.div>

                    {/* Percentage label on bar */}
                    <motion.div
                      className="text-[8px] font-medium text-center text-muted-foreground mt-1"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.1 + 0.4 }}
                    >
                      {formatPercentage(percentage)}
                    </motion.div>
                  </div>

                  {/* Category label */}
                  <motion.div
                    className="text-[8px] font-medium text-center leading-tight mt-1.5 md:mt-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.1 + 0.5 }}
                  >
                    <div className="text-foreground truncate">{category.label}</div>
                    <div className="text-muted-foreground">{category.range}</div>
                  </motion.div>
                </motion.div>
              );
            })}
          </div>

          {/* Selected Category Details */}
          <AnimatePresence>
            {selectedCategory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-secondary/50 rounded-lg p-1.5 md:p-2 mb-2 md:mb-3 border border-border/50"
              >
                {(() => {
                  const category = categoryConfig.find((c) => c.key === selectedCategory);
                  const percentage =
                    widget.current.percentages[
                      selectedCategory as keyof typeof widget.current.percentages
                    ];
                  const count =
                    widget.current.brackets[
                      selectedCategory as keyof typeof widget.current.brackets
                    ];
                  const change =
                    widget.changes?.[selectedTimeframe]?.brackets[
                      selectedCategory as keyof (typeof widget.changes)[typeof selectedTimeframe]['brackets']
                    ];

                  if (!category || percentage === undefined || count === undefined) return null;

                  return (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 md:gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <div>
                          <div className="text-[11px] md:text-xs font-bold">
                            {category.label} ({category.range})
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            {formatValue(count)} wallets
                          </div>
                        </div>
                      </div>

                      {change && (
                        <div
                          className={cn(
                            'flex items-center text-[10px]',
                            getChangeColor(change.absolute),
                            isMobile ? 'gap-0.5' : 'gap-1',
                          )}
                        >
                          {getChangeIcon(change.absolute)}
                          <span>
                            {change.absolute > 0 ? '+' : ''}
                            {formatValue(change.absolute)}
                          </span>
                          <span>
                            ({change.percentage > 0 ? '+' : ''}
                            {change.percentage.toFixed(1)}%)
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Summary Footer */}
          <motion.div
            className="pt-1.5 md:pt-2 border-t border-border/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="flex items-center justify-between text-[9px] md:text-[10px] text-muted-foreground">
              <div className="flex items-center gap-1">
                <Info className="w-3 h-3" />
                <span>Logarithmic scale</span>
              </div>
              <div className="flex items-center gap-1.5 md:gap-2">
                <span>Total: {formatValue(widget.current.total)}</span>
                <span>•</span>
                <span>{widget.current.lastUpdate ? lastUpdatedLabel : 'N/A'}</span>
              </div>
            </div>
          </motion.div>
        </div>
      ) : !isLoading && !error ? (
        <div className="flex items-center justify-center h-full text-xs md:text-sm text-muted-foreground">
          {tc('noData')}
        </div>
      ) : null}
    </WidgetContainer>
  );
}
