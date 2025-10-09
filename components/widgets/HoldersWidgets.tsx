'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Activity, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { WidgetContainer } from './WidgetLayout';
import { apiClient, TimeRange } from '@/lib/api/client';
import { cn, getDateLocale } from '@/lib/utils';
import { useTranslations, useLocale } from 'next-intl';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';

type WidgetTimeRange = '24h' | '7d' | '30d' | '90d' | '180d' | '1y';
type WidgetVariant = 'default' | 'simple-chart';

export function HoldersInfoWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [selectedTimeframe, setSelectedTimeframe] = useState<WidgetTimeRange>('24h');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['widget-holders-info'],
    queryFn: () => apiClient.getHoldersWidgetData(),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const widget = data?.widget;
  const change = widget?.changes?.[selectedTimeframe];
  const range = widget?.ranges?.[selectedTimeframe];
  const lastUpdatedLabel = useFormattedTimestamp(widget?.current?.lastUpdate, {
    absoluteFormat: 'HH:mm:ss',
    fallbackAbsolute: '--:--:--',
    fallbackRelative: '—',
  });
  const isPositive = change && change.value >= 0;

  const timeframeOptions: Array<{ value: WidgetTimeRange; label: string }> = [
    { value: '24h', label: tc('timeRanges.24h') },
    { value: '7d', label: tc('timeRanges.7d') },
    { value: '30d', label: tc('timeRanges.30d') },
    { value: '90d', label: tc('timeRanges.90d') },
    { value: '180d', label: tc('timeRanges.180d') },
    { value: '1y', label: tc('timeRanges.1y') },
  ];

  const shouldUseCompactDropdown = isMobile && timeframeOptions.length > 4;

  const skeleton = (
    <div className="flex flex-col h-full gap-2 md:gap-3 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-1.5 md:space-y-2">
          <div className="h-5 md:h-6 w-20 md:w-24 bg-muted rounded" />
          <div className="h-2.5 md:h-3 w-14 md:w-16 bg-muted rounded" />
        </div>
        <div className="h-2.5 md:h-3 w-14 md:w-16 bg-muted rounded" />
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
      title={tw('holders')}
      icon={Users}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      href="holders"
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
                  className={cn(
                    'absolute right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[80px] overflow-hidden',
                    shouldUseCompactDropdown && 'grid grid-cols-2 sm:grid-cols-1 min-w-[180px]',
                  )}
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
          {/* Current Holders with Last Updated */}
          <div className="flex-shrink-0">
            <div className="flex items-start justify-between">
              <div>
                <motion.p
                  className={cn('widget-value font-bold')}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {widget.current.display}
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
                  <span className="font-medium text-xs md:text-sm">{change?.display}</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({tc(`timeRanges.${selectedTimeframe}`)})
                  </span>
                </motion.div>
              </div>
              {isMobile && widget?.current?.lastUpdate && (
                <p className="text-[9px] text-muted-foreground">{lastUpdatedLabel}</p>
              )}
            </div>
          </div>

          {/* Holders Range Slider */}
          {range && (
            <motion.div
              className="flex-1 flex flex-col justify-center py-1.5 md:py-2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex justify-between text-[10px] font-medium mb-1 md:mb-1.5">
                <span className="text-muted-foreground">
                  {tw('low')}:{' '}
                  <span className="text-foreground">
                    {range.low?.toLocaleString?.() ?? range.low}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  {tw('high')}:{' '}
                  <span className="text-foreground">
                    {range.high?.toLocaleString?.() ?? range.high}
                  </span>
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
                          ((widget.current.holders - range.low) / (range.high - range.low)) * 100
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
                {tc(`timeRanges.${selectedTimeframe}`)} {tw('holdersRange') || 'Holders range'}
              </p>
            </motion.div>
          )}

          {/* Last Updated - Desktop Only */}
          {!isMobile && widget?.current?.lastUpdate && (
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

const HOLDERS_CHART_DEFAULT_MARGIN = { top: 15, right: 7, left: 15, bottom: 5 } as const;
const HOLDERS_CHART_SIMPLE_MARGIN = { top: 12, right: 14, left: 14, bottom: 12 } as const;
const SIMPLE_CHART_PADDING = 'px-2 pt-2 pb-2 md:px-3 md:pt-3 md:pb-3';

export function HoldersChartWidget({
  isMobile = false,
  variant = 'default',
}: {
  isMobile?: boolean;
  variant?: WidgetVariant;
}) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [selectedRange, setSelectedRange] = useState<TimeRange>('7d');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, isLoading, error } = useQuery({
    queryKey: ['holders-chart-data', selectedRange],
    queryFn: () =>
      apiClient.getHoldersChartData({
        range: selectedRange,
        interval: 'auto',
      }),
    refetchInterval: 300000,
    staleTime: 60000,
  });

  const chartDataRaw = (data as any)?.chart?.data;
  const chartData = Array.isArray(chartDataRaw)
    ? chartDataRaw
    : Array.isArray(chartDataRaw?.data)
      ? chartDataRaw.data
      : [];

  const formatXAxis = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      if (isNaN(date.getTime())) return '';

      switch (selectedRange) {
        case '1h':
        case '4h':
        case '24h':
          return format(date, 'HH:mm');
        case '7d':
        case '30d':
          return format(date, 'dd');
        case '90d':
        case '180d':
        case '1y':
          return format(date, 'MMM');
        default:
          return format(date, 'yyyy');
      }
    } catch {
      return '';
    }
  };

  const formatYAxis = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
    return `${value.toFixed(0)}`;
  };

  const timeRangeOptions: { value: TimeRange; label: string }[] = [
    { value: '24h', label: tc('timeRanges.24h') },
    { value: '7d', label: tc('timeRanges.7d') },
    { value: '30d', label: tc('timeRanges.30d') },
    { value: '90d', label: tc('timeRanges.90d') },
    { value: '1y', label: tc('timeRanges.1y') },
  ];
  const shouldUseCompactDropdown = isMobile && timeRangeOptions.length > 4;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload[0]) {
      try {
        const date = new Date(label);
        if (isNaN(date.getTime())) return null;

        const point = payload[0].payload;

        return (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-card p-2 rounded border border-border shadow-lg"
          >
            <p className="text-[10px] text-muted-foreground">
              {format(date, 'MMM dd, HH:mm', { locale: getDateLocale(locale) })}
            </p>
            <p className="text-xs font-semibold">{formatYAxis(payload[0].value)}</p>
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
    <div
      className={cn(
        'h-full w-full animate-pulse',
        variant === 'simple-chart' ? 'px-2 pt-2 pb-2 md:px-3 md:pt-3 md:pb-3' : 'p-2 md:p-3',
      )}
    >
      <div className="h-full w-full rounded-lg bg-muted" />
    </div>
  );

  const contentPadding = variant === 'simple-chart' ? SIMPLE_CHART_PADDING : 'p-0';
  const chartMargin =
    variant === 'simple-chart'
      ? isMobile
        ? { top: 8, right: 8, left: 8, bottom: 8 }
        : HOLDERS_CHART_SIMPLE_MARGIN
      : isMobile
        ? { top: 10, right: 6, left: 10, bottom: 4 }
        : HOLDERS_CHART_DEFAULT_MARGIN;

  return (
    <WidgetContainer
      title={tw('holdersChart')}
      icon={Activity}
      loading={isLoading}
      loadingSkeleton={chartSkeleton}
      error={error?.message}
      href="holders?section=chart"
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
                  className={cn(
                    'absolute right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[80px] overflow-hidden',
                    shouldUseCompactDropdown && 'grid grid-cols-2 sm:grid-cols-1 min-w-[180px]',
                  )}
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
      contentClassName={cn('h-full', contentPadding)}
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
            <AreaChart data={chartData} margin={chartMargin}>
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                fontSize={isMobile ? 7 : 8}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                interval="preserveStartEnd"
                height={isMobile ? 12 : 15}
              />
              <YAxis
                tickFormatter={formatYAxis}
                fontSize={isMobile ? 7 : 8}
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                width={isMobile ? 28 : 35}
                domain={['dataMin', 'dataMax']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="holders"
                stroke="#3b82f6"
                fill="#3b82f6"
                fillOpacity={0.2}
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </motion.div>
      ) : !isLoading && !error ? (
        <div className="flex items-center justify-center h-full text-xs md:text-sm text-muted-foreground">
          {tc('noData')}
        </div>
      ) : null}
    </WidgetContainer>
  );
}
