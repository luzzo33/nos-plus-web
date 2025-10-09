'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, DollarSign, Activity, ChevronDown } from 'lucide-react';
import { WidgetContainer } from './WidgetLayout';
import { apiClient, TimeRange } from '@/lib/api/client';
import { cn, getDateLocale } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { formatRangeTick, toDate, formatLocal } from '@/lib/time';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';
import { motion, AnimatePresence } from 'framer-motion';

type WidgetTimeRange = '24h' | '7d' | '30d' | '90d' | '180d' | '1y';

export function PriceInfoWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [selectedTimeframe, setSelectedTimeframe] = useState<WidgetTimeRange>('24h');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['widget-price-info'],
    queryFn: () => apiClient.getWidgetData('usd'),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const widget = data?.widget;
  const change = widget?.changes?.[selectedTimeframe];
  const range = widget?.ranges?.[selectedTimeframe];
  const isPositive = (change?.value ?? 0) >= 0;

  const lastUpdatedLabel = useFormattedTimestamp(widget?.metadata?.lastUpdate, {
    absoluteFormat: 'HH:mm:ss',
    fallbackAbsolute: '--:--:--',
    fallbackRelative: '—',
  });

  const timeframeOptions: Array<{ value: WidgetTimeRange; label: string }> = [
    { value: '24h', label: tc('timeRanges.24h') },
    { value: '7d', label: tc('timeRanges.7d') },
    { value: '30d', label: tc('timeRanges.30d') },
    { value: '90d', label: tc('timeRanges.90d') },
    { value: '180d', label: tc('timeRanges.180d') },
    { value: '1y', label: tc('timeRanges.1y') },
  ];

  const skeleton = (
    <div className="flex flex-col h-full gap-2 md:gap-3 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-1.5 md:space-y-2">
          <div className="h-5 md:h-6 w-20 md:w-24 bg-muted rounded" />
          <div className="h-2.5 md:h-3 w-16 md:w-20 bg-muted rounded" />
        </div>
        <div className="h-2.5 md:h-3 w-12 md:w-14 bg-muted rounded" />
      </div>
      <div className="space-y-1.5 md:space-y-2">
        <div className="flex justify-between text-[10px]">
          <div className="h-2 w-14 md:w-16 bg-muted rounded" />
          <div className="h-2 w-14 md:w-16 bg-muted rounded" />
        </div>
        <div className="h-2 md:h-2.5 w-full bg-muted rounded-full" />
        <div className="h-2 w-28 md:w-32 bg-muted mx-auto rounded" />
      </div>
      <div className="h-2 w-20 md:w-24 bg-muted mx-auto rounded" />
    </div>
  );

  return (
    <WidgetContainer
      title={tw('price')}
      icon={DollarSign}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      href="price"
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
          {/* Current Price and Last Updated */}
          <div className="flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <motion.p
                  className={cn('widget-value font-bold')}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {widget.price.display}
                </motion.p>
                <motion.div
                  className={cn(
                    'flex items-center mt-0.5',
                    isPositive ? 'text-green-500' : 'text-red-500',
                    isMobile ? 'gap-0.5' : 'gap-1',
                  )}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {isPositive ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : (
                    <TrendingDown className="w-3 h-3" />
                  )}
                  <span className="font-medium text-xs md:text-sm">{change?.display}%</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({tc(`timeRanges.${selectedTimeframe}`)})
                  </span>
                </motion.div>
              </div>
              {isMobile && widget?.metadata?.lastUpdate && (
                <p className="text-[9px] text-muted-foreground">{lastUpdatedLabel}</p>
              )}
            </div>
          </div>

          {/* Price Range Slider */}
          {range && (
            <motion.div
              className="flex-1 flex flex-col justify-center py-1.5 md:py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex justify-between text-[10px] font-medium mb-1 md:mb-1.5">
                <span className="text-muted-foreground">
                  {tw('low')}: <span className="text-foreground">{range.lowDisplay}</span>
                </span>
                <span className="text-muted-foreground">
                  {tw('high')}: <span className="text-foreground">{range.highDisplay}</span>
                </span>
              </div>
              <div className="relative h-2 md:h-2.5 bg-secondary rounded-full">
                <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                  <div className="w-full h-1 md:h-1.5 bg-muted rounded-full mx-0.5">
                    <motion.div
                      className="h-full bg-gradient-to-r from-green-500 to-red-500 rounded-full relative"
                      initial={{ width: 0 }}
                      animate={{
                        width: `${
                          ((widget.price.current - range.low) / (range.high - range.low)) * 100
                        }%`,
                      }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    >
                      <div className="absolute -right-1.5 top-1/2 -translate-y-1/2 w-2.5 h-2.5 md:w-3 md:h-3 bg-primary rounded-full shadow-lg border-2 border-background" />
                    </motion.div>
                  </div>
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1.5">
                {tc(`timeRanges.${selectedTimeframe}`)} {tw('priceRange')}
              </p>
            </motion.div>
          )}

          {/* Last Updated - Desktop Only */}
          {!isMobile && widget?.metadata?.lastUpdate && (
            <motion.div
              className="flex-shrink-0 pt-2"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-[10px] text-muted-foreground text-center">
                {tw('lastUpdated')}: {lastUpdatedLabel}
              </p>
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

export function PriceChartWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const [selectedRange, setSelectedRange] = useState<TimeRange>('24h');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['chart-data', selectedRange],
    queryFn: () =>
      apiClient.getChartData({
        range: selectedRange,
        interval: 'auto',
      }),
    refetchInterval: 300000,
    staleTime: 60000,
  });

  const chartDataRaw = data?.chart?.data;
  const chartData = Array.isArray(chartDataRaw)
    ? chartDataRaw
    : Array.isArray((chartDataRaw as any)?.data)
      ? (chartDataRaw as any).data
      : [];

  const formatXAxis = (timestamp: string) => formatRangeTick(timestamp, selectedRange);

  const formatYAxis = (value: number) => {
    return `$${value.toFixed(3)}`;
  };

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '24h', label: tc('timeRanges.24h') },
    { value: '7d', label: tc('timeRanges.7d') },
    { value: '30d', label: tc('timeRanges.30d') },
    { value: '90d', label: tc('timeRanges.90d') },
    { value: '1y', label: tc('timeRanges.1y') },
  ];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      try {
        const date = toDate(label);
        if (!date) return null;

        const point = payload[0].payload;

        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card p-2 rounded border border-border shadow-lg"
          >
            <p className="text-[10px] text-muted-foreground">
              {formatLocal(date, 'MMM dd, HH:mm')}
            </p>
            <p className="text-xs font-semibold">${payload[0].value.toFixed(4)}</p>
            {point.source && (
              <p className="text-[10px] text-muted-foreground">
                {tc('source')}: {tc(point.source as any)}
              </p>
            )}
          </motion.div>
        );
      } catch {
        return null;
      }
    }
    return null;
  };

  const chartSkeleton = (
    <div className="h-full w-full animate-pulse p-2 md:p-3">
      <div className="h-full w-full rounded-lg bg-muted" />
    </div>
  );

  const chartMargins = isMobile
    ? { top: 10, right: 4, left: 10, bottom: 3 }
    : { top: 15, right: 7, left: 15, bottom: 5 };

  return (
    <WidgetContainer
      title={tw('priceChart')}
      icon={Activity}
      loading={isLoading}
      loadingSkeleton={chartSkeleton}
      error={error?.message}
      href="price?section=chart"
      headerAction={
        <div className="relative">
          <motion.button
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-secondary transition-colors"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tc(`timeRanges.${selectedRange}`)}
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
                  {timeRangeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedRange(option.value);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        'block w-full px-3 py-1.5 text-xs text-left hover:bg-secondary transition-colors',
                        selectedRange === option.value && 'bg-secondary',
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
      contentClassName="p-0"
      isMobile={isMobile}
    >
      {chartData.length > 0 ? (
        <motion.div
          className="h-full w-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={chartMargins}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                fontSize={isMobile ? 7 : 8}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
                height={15}
              />
              <YAxis
                tickFormatter={formatYAxis}
                fontSize={isMobile ? 7 : 8}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                domain={['dataMin * 0.99', 'dataMax * 1.01']}
                width={isMobile ? 26 : 30}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={1.5}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      ) : !isLoading && !error ? (
        <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
          {tc('noData')}
        </div>
      ) : null}
    </WidgetContainer>
  );
}
