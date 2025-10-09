'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Gauge, ChevronDown, AlertTriangle, Zap } from 'lucide-react';
import { WidgetContainer } from './WidgetLayout';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

type TimeRange = '24h' | '7d' | '30d';

export function SentimentWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeRange>('7d');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['widget-sentiment'],
    queryFn: () => apiClient.getSentimentWidgetData(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const widget = data?.widget;
  const change = widget?.changes?.[selectedTimeframe];
  const isPositive = change?.trend === 'up';

  const timeframeOptions: Array<{ value: TimeRange; label: string }> = [
    { value: '24h', label: tc('timeRanges.24h') },
    { value: '7d', label: tc('timeRanges.7d') },
    { value: '30d', label: tc('timeRanges.30d') },
  ];

  const getSentimentColor = (value: number) => {
    if (value < 25) return '#dc2626';
    if (value < 45) return '#f59e0b';
    if (value < 55) return '#6b7280';
    if (value < 75) return '#10b981';
    return '#059669';
  };

  const getSentimentIcon = (zone: string) => {
    if (zone === 'fear' || zone === 'extremeFear') return <AlertTriangle className="w-3 h-3" />;
    if (zone === 'greed' || zone === 'extremeGreed') return <Zap className="w-3 h-3" />;
    return <Gauge className="w-3 h-3" />;
  };

  const getZoneDays = () => {
    if (!widget?.sparkline) return null;

    const days = selectedTimeframe === '24h' ? 1 : selectedTimeframe === '7d' ? 7 : 30;
    const relevantData = widget.sparkline.slice(-days);

    const zones = {
      extremeFear: 0,
      fear: 0,
      neutral: 0,
      greed: 0,
      extremeGreed: 0,
    };

    relevantData.forEach((point) => {
      const value = point.value;
      if (value < 25) zones.extremeFear++;
      else if (value < 45) zones.fear++;
      else if (value < 55) zones.neutral++;
      else if (value < 75) zones.greed++;
      else zones.extremeGreed++;
    });

    return zones;
  };

  const zoneDays = getZoneDays();
  const headerTitle = (
    <span className="flex items-center gap-1.5 md:gap-2">
      <span>{tw('fearAndGreed')}</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-1.5 md:px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
        <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3" />
        {tw('sentimentDeprecatedShort')}
      </span>
    </span>
  );

  const skeleton = (
    <div className="flex flex-col gap-2 md:gap-3 h-full animate-pulse">
      <div className="flex items-center gap-2 md:gap-3">
        <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-muted" />
        <div className="space-y-1.5 md:space-y-2">
          <div className="h-5 md:h-6 w-16 md:w-20 bg-muted rounded" />
          <div className="h-2.5 md:h-3 w-20 md:w-24 bg-muted rounded" />
        </div>
      </div>
      <div className="h-16 md:h-20 w-full bg-muted rounded" />
      <div className="space-y-1.5 md:space-y-2 mt-auto">
        <div className="h-2 w-28 md:w-32 bg-muted rounded" />
        <div className="h-2 w-2/3 md:w-3/4 bg-muted rounded" />
        <div className="h-2 w-1/2 md:w-2/3 bg-muted rounded" />
      </div>
    </div>
  );

  return (
    <WidgetContainer
      title={headerTitle}
      icon={Gauge}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      href="price?section=sentiment"
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
        <div className="flex flex-col gap-1.5 h-full">
          {/* Main Value & Change */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-1 md:gap-1.5">
              <motion.div
                className="p-0.5 md:p-1 rounded"
                style={{ backgroundColor: `${getSentimentColor(widget.current.index)}20` }}
              >
                <div style={{ color: getSentimentColor(widget.current.index) }}>
                  {getSentimentIcon(widget.current.zone)}
                </div>
              </motion.div>
              <div className="flex items-baseline gap-1 md:gap-1.5">
                <motion.p
                  className="widget-value font-bold"
                  style={{ color: getSentimentColor(widget.current.index) }}
                  key={widget.current.index}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {widget.current.display}
                </motion.p>
                <span
                  className="text-xs md:text-sm font-medium"
                  style={{ color: getSentimentColor(widget.current.index) }}
                >
                  {widget.current.sentiment}
                </span>
              </div>
            </div>

            {/* Change indicator */}
            {change && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center',
                  isPositive ? 'text-green-500' : 'text-red-500',
                  isMobile ? 'gap-0.5' : 'gap-1.5',
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
                ) : (
                  <TrendingDown className="w-3 h-3 md:w-3.5 md:h-3.5" />
                )}
                <span className="text-xs md:text-sm font-medium">{change.display}</span>
                <span className="text-xs text-muted-foreground">({selectedTimeframe})</span>
              </motion.div>
            )}
          </div>

          {/* Sentiment Days Distribution */}
          {zoneDays && (
            <motion.div
              className="flex-1 flex flex-col justify-center space-y-1 md:space-y-1.5"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <p className="text-xs font-medium text-muted-foreground">
                {tw('sentimentDays', {
                  timeframe: tc(`timeRangeDescriptions.${selectedTimeframe}`),
                })}
              </p>
              <div className="space-y-1 md:space-y-1.5">
                {Object.entries(zoneDays).map(([zone, count]) => {
                  if (count === 0) return null;
                  const percentage =
                    (count /
                      (selectedTimeframe === '24h' ? 1 : selectedTimeframe === '7d' ? 7 : 30)) *
                    100;
                  const zoneLabel =
                    zone === 'extremeFear'
                      ? tw('extremeFear')
                      : zone === 'fear'
                        ? tw('fear')
                        : zone === 'neutral'
                          ? tw('neutral')
                          : zone === 'greed'
                            ? tw('greed')
                            : tw('extremeGreed');
                  const zoneColor =
                    zone === 'extremeFear'
                      ? '#dc2626'
                      : zone === 'fear'
                        ? '#f59e0b'
                        : zone === 'neutral'
                          ? '#6b7280'
                          : zone === 'greed'
                            ? '#10b981'
                            : '#059669';

                  return (
                    <div key={zone} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground flex items-center gap-1.5">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: zoneColor }}
                        />
                        {zoneLabel}
                      </span>
                      <span className="font-medium">
                        {count} {count === 1 ? tw('day') : tw('days')}
                        <span className="text-muted-foreground ml-1">
                          ({percentage.toFixed(0)}%)
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Interpretation */}
          {!isMobile && widget.interpretation && (
            <motion.div
              className="flex-shrink-0 pt-2 border-t border-border"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-[10px] text-muted-foreground">{widget.interpretation.primary}</p>
            </motion.div>
          )}
        </div>
      ) : !isLoading && !error ? (
        <div className="flex items-center justify-center h-full text-xs md:text-sm text-muted-foreground">
          {tc('noData')}
        </div>
      ) : null}
    </WidgetContainer>
  );
}
