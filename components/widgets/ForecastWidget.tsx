'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  TrendingUp,
  TrendingDown,
  Target,
  ChevronDown,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import { WidgetContainer } from './WidgetLayout';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';

type ForecastTimeframe = 'day1' | 'day7' | 'day30' | 'day60' | 'day90' | 'day180' | 'day365';

export function ForecastWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const [selectedTimeframe, setSelectedTimeframe] = useState<ForecastTimeframe>('day7');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['widget-forecast'],
    queryFn: () => apiClient.getForecastWidgetData(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const widget = data?.widget;
  const forecast = widget?.forecast?.[selectedTimeframe];
  const isPositive = forecast?.change >= 0;
  const headerTitle = (
    <span className="flex items-center gap-1.5 md:gap-2">
      <span>{tw('priceForecast')}</span>
      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-1.5 md:px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/10 dark:text-amber-200">
        <AlertTriangle className="h-2.5 w-2.5 md:h-3 md:w-3" />
        {tw('forecastDeprecatedShort')}
      </span>
    </span>
  );

  const timeframeOptions: Array<{ value: ForecastTimeframe; label: string }> = [
    { value: 'day1', label: tw('forecast1Day') || '1 Day' },
    { value: 'day7', label: tw('forecast7Days') || '7 Days' },
    { value: 'day30', label: tw('forecast30Days') || '30 Days' },
    { value: 'day60', label: tw('forecast60Days') || '60 Days' },
    { value: 'day90', label: tw('forecast90Days') || '90 Days' },
    { value: 'day180', label: tw('forecast180Days') || '180 Days' },
    { value: 'day365', label: tw('forecast365Days') || '1 Year' },
  ];

  const displayOptions = isMobile
    ? timeframeOptions.filter((opt) => ['day1', 'day7', 'day30', 'day365'].includes(opt.value))
    : timeframeOptions;

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 90) return '#10b981';
    if (accuracy >= 80) return '#3b82f6';
    if (accuracy >= 70) return '#f59e0b';
    return '#ef4444';
  };

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 80) return '#10b981';
    if (percentage >= 60) return '#f59e0b';
    return '#ef4444';
  };

  const getSignalColor = (trend: string) => {
    if (trend === 'Bullish' || trend === 'Strong Bullish') return '#10b981';
    if (trend === 'Bearish' || trend === 'Strong Bearish') return '#ef4444';
    return '#6b7280';
  };

  const skeleton = (
    <div className="flex flex-col h-full gap-2 md:gap-3 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-1.5 md:space-y-2">
          <div className="h-5 md:h-6 w-20 md:w-24 bg-muted rounded" />
          <div className="h-2.5 md:h-3 w-16 md:w-20 bg-muted rounded" />
        </div>
        <div className="h-2.5 md:h-3 w-14 md:w-16 bg-muted rounded" />
      </div>
      <div className="h-14 md:h-16 w-full bg-muted rounded" />
      <div className="space-y-1.5 md:space-y-2 mt-auto">
        <div className="h-2 w-24 md:w-28 bg-muted rounded" />
        <div className="h-2 w-2/3 md:w-3/4 bg-muted rounded" />
        <div className="h-2 w-1/2 md:w-2/3 bg-muted rounded" />
      </div>
    </div>
  );

  return (
    <WidgetContainer
      title={headerTitle}
      icon={Target}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      href="price?section=forecast"
      headerAction={
        <div className="relative">
          <motion.button
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-secondary transition-colors"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {displayOptions.find((opt) => opt.value === selectedTimeframe)?.label}
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
                  className="absolute right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[100px] overflow-hidden max-h-[200px] overflow-y-auto"
                >
                  {displayOptions.map((option) => (
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
      {widget && forecast ? (
        <div className="flex flex-col gap-2 h-full">
          {/* Top Section with Price and Signal Badge */}
          <div className="flex justify-between items-start gap-2 md:gap-3">
            {/* Left side - Forecast Price */}
            <div className="flex-1">
              <div className="flex items-center gap-1 md:gap-1.5 mb-0.5 md:mb-1">
                <Sparkles className="w-3 h-3 md:w-3.5 md:h-3.5 text-primary animate-pulse" />
                <p className="text-[11px] md:text-xs font-medium text-primary">
                  {tw('forecastLabel')}
                </p>
              </div>

              <motion.div
                className="relative"
                key={forecast.price}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              >
                <p className="widget-value font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {forecast.priceDisplay}
                </p>
                <motion.div
                  className="absolute -inset-1 bg-gradient-to-r from-primary/20 to-primary/5 blur-xl"
                  animate={{ opacity: [0.5, 0.8, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>

              {/* Change indicator */}
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className={cn(
                  'flex items-center mt-1',
                  isPositive ? 'text-green-500' : 'text-red-500',
                  isMobile ? 'gap-0.5' : 'gap-1.5',
                )}
              >
                {isPositive ? (
                  <TrendingUp className="w-3 h-3 md:w-3.5 md:h-3.5" />
                ) : (
                  <TrendingDown className="w-3 h-3 md:w-3.5 md:h-3.5" />
                )}
                <span className="text-xs md:text-sm font-medium">
                  {forecast.changeDisplay.startsWith('$') &&
                  !isPositive &&
                  !forecast.changeDisplay.includes('-')
                    ? `-${forecast.changeDisplay}`
                    : forecast.changeDisplay}
                </span>
              </motion.div>
            </div>

            {/* Right side - Signal Badge */}
            {widget.signals && (
              <motion.div
                className="flex-shrink-0"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-1.5 md:gap-2">
                  <div
                    className="px-2 py-0.5 md:py-1 rounded-full text-[11px] md:text-xs font-medium flex items-center gap-1 md:gap-1.5"
                    style={{
                      backgroundColor: `${getSignalColor(widget.signals.trend)}20`,
                      color: getSignalColor(widget.signals.trend),
                    }}
                  >
                    <div
                      className="w-1.5 h-1.5 rounded-full animate-pulse"
                      style={{ backgroundColor: getSignalColor(widget.signals.trend) }}
                    />
                    {widget.signals.trend}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {widget.signals.strength}
                  </span>
                </div>
              </motion.div>
            )}
          </div>

          {/* Bottom Section - Accuracy Metrics */}
          <motion.div
            className="flex-1 flex flex-col justify-end space-y-1 md:space-y-1.5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            {/* Model Accuracy - More compact */}
            <div className="space-y-0.5">
              <div className="flex justify-between text-[11px] md:text-xs">
                <span className="text-muted-foreground">{tw('modelAccuracy')}</span>
                <span
                  className="font-medium"
                  style={{ color: getAccuracyColor(widget.accuracy.overall) }}
                >
                  {widget.accuracy.display}
                </span>
              </div>
              <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{ backgroundColor: getAccuracyColor(widget.accuracy.overall) }}
                  initial={{ width: 0 }}
                  animate={{ width: `${widget.accuracy.overall}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
            </div>

            {/* Performance Stats - More compact */}
            <div className="flex items-center justify-between text-[11px] md:text-xs">
              <span className="text-muted-foreground">{tw('forecastAccuracy')}</span>
              <div className="flex items-center gap-0.5 md:gap-1">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: getPerformanceColor(widget.performance.within5Percent),
                  }}
                />
                <span className="font-medium">{widget.performance.within5Percent.toFixed(0)}%</span>
                <span className="text-muted-foreground">(±5%)</span>
              </div>
            </div>

            {/* Combined Recommendation & Disclaimer */}
            <div className="text-[9px] text-muted-foreground text-center opacity-60 mt-1.5">
              {widget.signals?.recommendation && (
                <span>
                  <span
                    className="font-medium"
                    style={{ color: getSignalColor(widget.signals.trend) }}
                  >
                    {widget.signals.recommendation}
                  </span>
                  <span className="mx-1.5">•</span>
                </span>
              )}
              <span>{tw('forecastDisclaimer')}</span>
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
