'use client';

import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  ChevronDown,
  Download,
  BarChart3,
  LineChart as LineChartIcon,
  CandlestickChart,
  X,
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn, getDateLocale } from '@/lib/utils';
import { formatRangeTick, toDate, formatLocal } from '@/lib/time';
import { useFontScale, FONT_SCALE } from '../hooks/useFontScale';
import { useLocale, useTranslations } from 'next-intl';
import type { TimeRange, ChartDataPoint } from '@/lib/api/client';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  ReferenceLine,
} from 'recharts';

type ChartSize = 'compact' | 'normal' | 'large';

interface ChartSectionProps {
  chartData: any;
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
  onDownload: (type: 'chart', format: 'csv' | 'json') => void;
  isMobile: boolean;
  mounted: boolean;
  loading?: boolean;
}

const timeRangesWithAll: { value: TimeRange; label: string; description: string }[] = [
  { value: '24h', label: '24H', description: 'Last 24 hours' },
  { value: '7d', label: '7D', description: 'Last 7 days' },
  { value: '30d', label: '30D', description: 'Last 30 days' },
  { value: '90d', label: '90D', description: 'Last 90 days' },
  { value: '180d', label: '180D', description: 'Last 180 days' },
  { value: '1y', label: '1Y', description: 'Last year' },
  { value: 'all', label: 'ALL', description: 'All time' },
];

const DatePicker = ({
  value,
  onChange,
  label,
  maxDate = new Date(),
  text,
}: {
  value: Date | null;
  onChange: (date: Date) => void;
  label: string;
  maxDate?: Date;
  text: any;
}) => {
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const date = new Date(e.target.value);
    if (!isNaN(date.getTime())) {
      onChange(date);
    }
  };

  return (
    <div className="space-y-1">
      <label className={cn(text('xs', 'xs'), 'text-muted-foreground')}>{label}</label>
      <input
        type="date"
        value={value ? format(value, 'yyyy-MM-dd') : ''}
        onChange={handleDateChange}
        max={format(maxDate, 'yyyy-MM-dd')}
        className={cn(
          'w-full px-3 py-2 bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary',
          text('sm', 'sm'),
        )}
      />
    </div>
  );
};

export function ChartSection({
  chartData,
  selectedRange,
  onRangeChange,
  onDateRangeChange,
  onDownload,
  isMobile,
  mounted,
  loading = false,
}: ChartSectionProps) {
  const { text } = useFontScale();
  const locale = useLocale();
  const tc = useTranslations('common');
  const t = useTranslations('price.chart');

  const [chartType, setChartType] = useState<'area' | 'line' | 'candle'>('area');
  const [showIndicators, setShowIndicators] = useState(false);
  const [chartSize, setChartSize] = useState<ChartSize>('normal');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const [tempDateRange, setTempDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const [tempSelectedRange, setTempSelectedRange] = useState<TimeRange>(selectedRange);

  useEffect(() => {
    setTempSelectedRange(selectedRange);
  }, [selectedRange]);

  const chart = chartData?.chart?.data;
  const chartPoints = chart?.data || [];
  const chartSummary = chart?.summary;
  const chartMetadata = chart?.metadata;

  const translatedTimeRanges = timeRangesWithAll.map((range) => ({
    ...range,
    label: tc(`timeRanges.${range.value}`),
    description: tc(`timeRangeDescriptions.${range.value}`),
  }));

  const dateRangePresets = [
    {
      label: tc('days.today'),
      value: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }),
    },
    {
      label: tc('days.last7Days'),
      value: () => ({ start: subDays(new Date(), 7), end: new Date() }),
    },
    {
      label: tc('days.last30Days'),
      value: () => ({ start: subDays(new Date(), 30), end: new Date() }),
    },
    {
      label: tc('days.last90Days'),
      value: () => ({ start: subDays(new Date(), 90), end: new Date() }),
    },
  ];

  const getChartHeight = () => {
    if (chartSize === 'compact') return isMobile ? 250 : 300;
    if (chartSize === 'normal') return isMobile ? 350 : 450;
    if (chartSize === 'large') return isMobile ? 500 : 700;
    return 450;
  };

  const formatXAxis = (timestamp: string) => {
    if (!mounted) return '';
    return formatRangeTick(timestamp, selectedRange, locale);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!mounted || !active || !payload || !payload[0]) return null;

    try {
      const date = toDate(label);
      if (!date) return null;

      const point = payload[0].payload;

      return (
        <div className="bg-card p-3 rounded-lg border border-border shadow-xl">
          <p className={cn(text('xs', 'xs'), 'text-muted-foreground mb-1')}>
            {formatLocal(date, 'MMM dd, HH:mm', locale)}
          </p>
          <p className={text('lg', 'lg', 'font-bold')}>${payload[0].value.toFixed(4)}</p>
          {point.change && (
            <p
              className={cn(
                text('xs', 'xs', 'mt-1'),
                point.change >= 0 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {point.change >= 0 ? '+' : ''}
              {point.change.toFixed(2)}%
            </p>
          )}
          {showIndicators && (
            <>
              {point.sma20 && (
                <p className={cn(text('xs', 'xs'), 'text-muted-foreground mt-1')}>
                  SMA20: ${point.sma20.toFixed(4)}
                </p>
              )}
              {point.rsi && (
                <p className={cn(text('xs', 'xs'), 'text-muted-foreground')}>
                  RSI: {point.rsi.toFixed(2)}
                </p>
              )}
            </>
          )}
          {point.source && (
            <p className={cn(text('xs', 'xs'), 'text-primary mt-1')}>
              {tc('source')}: {tc(`sources.${point.source}`)}
            </p>
          )}
        </div>
      );
    } catch {
      return null;
    }
  };

  const handleApplyDateRange = () => {
    onDateRangeChange(tempDateRange.start, tempDateRange.end);
    setShowDatePicker(false);
  };

  const chartFontSize = isMobile ? 10 * FONT_SCALE.mobile : 12 * FONT_SCALE.desktop;

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card-base p-4 md:p-6"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3 w-full lg:w-auto">
            <div className="flex gap-2 w-full">
              <div className="relative skeleton h-10 flex-1 rounded-lg">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
              <div className="relative skeleton h-10 w-24 rounded-lg">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative skeleton h-10 w-28 rounded-lg">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className="relative skeleton h-10 w-10 rounded-lg">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-3 md:p-4">
          <div className="relative skeleton h-[260px] md:h-[380px] w-full rounded-xl">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-border">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="relative skeleton h-3 w-20 rounded">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
              <div className="relative skeleton h-4 w-16 rounded">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="card-base p-4 md:p-6">
      {/* Chart Controls */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3 w-full lg:w-auto">
          {/* Mobile Controls with Apply/Cancel */}
          {isMobile ? (
            <div className="w-full">
              {showDatePicker ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {dateRangePresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => {
                          const range = preset.value();
                          setTempDateRange(range);
                        }}
                        className={cn(
                          'px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors text-left',
                          text('xs', 'xs'),
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <DatePicker
                      value={tempDateRange.start}
                      onChange={(date) => setTempDateRange({ ...tempDateRange, start: date })}
                      label={t('startDate')}
                      maxDate={tempDateRange.end || new Date()}
                      text={text}
                    />
                    <DatePicker
                      value={tempDateRange.end}
                      onChange={(date) => setTempDateRange({ ...tempDateRange, end: date })}
                      label={t('endDate')}
                      maxDate={new Date()}
                      text={text}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={handleApplyDateRange}
                      disabled={!tempDateRange.start || !tempDateRange.end}
                      className={cn(
                        'flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50',
                        text('sm', 'sm'),
                      )}
                    >
                      {tc('apply')}
                    </button>
                    <button
                      onClick={() => {
                        setShowDatePicker(false);
                        setTempDateRange({ start: null, end: null });
                      }}
                      className={cn(
                        'px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                        text('sm', 'sm'),
                      )}
                    >
                      {tc('cancel')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 w-full">
                  <div className="flex flex-wrap gap-1">
                    {translatedTimeRanges.map((range, index) => (
                      <button
                        key={range.value}
                        onClick={() => {
                          setTempSelectedRange(range.value);
                          onRangeChange(range.value);
                        }}
                        className={cn(
                          'px-2.5 py-1 rounded-lg transition-colors',
                          text('xs', 'xs', 'font-medium'),
                          selectedRange === range.value
                            ? 'bg-background text-foreground shadow-sm'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                        title={range.description}
                      >
                        {range.label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setShowDatePicker(true);
                      setTempDateRange({ start: null, end: null });
                    }}
                    className={cn(
                      'flex items-center gap-1.5 px-2.5 py-1 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                      text('xs', 'xs'),
                    )}
                  >
                    <Calendar className="w-3 h-3" />
                    <span>{tc('customDate')}</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                {translatedTimeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => onRangeChange(range.value)}
                    className={cn(
                      'px-3 py-1.5 rounded-lg transition-colors',
                      text('xs', 'sm'),
                      selectedRange === range.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    title={range.description}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <button
                onClick={() => {
                  setShowDatePicker(!showDatePicker);
                  setTempDateRange({ start: null, end: null });
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                  text('sm', 'sm'),
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('customDateRange')}</span>
              </button>
            </>
          )}
        </div>

        {/* Chart Controls */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex gap-2">
            <div className="flex gap-1 p-1 bg-secondary rounded-lg">
              <button
                onClick={() => setChartType('area')}
                className={cn(
                  'p-1.5 rounded transition-all',
                  chartType === 'area' ? 'bg-background shadow-sm' : '',
                )}
                title={t('areaChart')}
              >
                <BarChart3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <button
                onClick={() => setChartType('line')}
                className={cn(
                  'p-1.5 rounded transition-all',
                  chartType === 'line' ? 'bg-background shadow-sm' : '',
                )}
                title={t('lineChart')}
              >
                <LineChartIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <button
                onClick={() => setChartType('candle')}
                className={cn(
                  'p-1.5 rounded transition-all',
                  chartType === 'candle' ? 'bg-background shadow-sm' : '',
                )}
                title={t('candlestickChart')}
              >
                <CandlestickChart className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>

            <button
              onClick={() => setShowIndicators(!showIndicators)}
              className={cn(
                'px-2.5 md:px-3 py-1.5 rounded-lg transition-colors',
                text('xs', 'sm'),
                showIndicators
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary hover:bg-secondary/80',
              )}
            >
              {t('indicators')}
            </button>

            <div className="flex gap-1 p-1 bg-secondary rounded-lg">
              {(['compact', 'normal', 'large'] as ChartSize[]).map((size) => (
                <button
                  key={size}
                  onClick={() => setChartSize(size)}
                  className={cn(
                    'px-2 py-1 rounded transition-all capitalize',
                    text('2xs', 'xs'),
                    chartSize === size ? 'bg-background shadow-sm' : '',
                  )}
                  title={t(size as any)}
                >
                  {isMobile ? size[0].toUpperCase() : t(size as any)}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onDownload('chart', 'csv')}
            className={cn(
              'p-1.5 rounded-lg bg-secondary hover:bg-secondary/80 transition-colors',
              text('xs', 'sm'),
            )}
            title={tc('downloadCSV')}
          >
            <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
          </button>
        </div>
      </div>

      {/* Date Range Picker */}
      {showDatePicker && !isMobile && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mb-4 p-4 bg-secondary/50 rounded-lg"
        >
          <h4 className={text('sm', 'base', 'font-medium mb-3')}>{t('selectDateRange')}</h4>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {dateRangePresets.map((preset) => (
              <button
                key={preset.label}
                onClick={() => {
                  const range = preset.value();
                  setTempDateRange(range);
                }}
                className={cn(
                  'px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                  text('xs', 'sm'),
                )}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4 mb-3">
            <DatePicker
              value={tempDateRange.start}
              onChange={(date) => setTempDateRange({ ...tempDateRange, start: date })}
              label={t('startDate')}
              maxDate={tempDateRange.end || new Date()}
              text={text}
            />
            <DatePicker
              value={tempDateRange.end}
              onChange={(date) => setTempDateRange({ ...tempDateRange, end: date })}
              label={t('endDate')}
              maxDate={new Date()}
              text={text}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => {
                setShowDatePicker(false);
                setTempDateRange({ start: null, end: null });
              }}
              className={cn(
                'px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                text('sm', 'sm'),
              )}
            >
              {tc('cancel')}
            </button>
            <button
              onClick={handleApplyDateRange}
              disabled={!tempDateRange.start || !tempDateRange.end}
              className={cn(
                'px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50',
                text('sm', 'sm'),
              )}
            >
              {t('applyTimeframe')}
            </button>
          </div>
        </motion.div>
      )}

      {/* Chart */}
      {chartPoints.length === 0 ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          <p className={text('sm', 'base')}>{t('noChartData')}</p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={getChartHeight()}>
          {chartType === 'area' ? (
            <AreaChart data={chartPoints}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#6b7280"
                fontSize={chartFontSize}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toFixed(3)}`}
                stroke="#6b7280"
                fontSize={chartFontSize}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="price"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorPrice)"
              />
              {showIndicators && (
                <>
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    dot={false}
                  />
                  <ReferenceLine
                    y={chartSummary?.average || 0}
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                  />
                </>
              )}
            </AreaChart>
          ) : chartType === 'line' ? (
            <LineChart data={chartPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#6b7280"
                fontSize={chartFontSize}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toFixed(3)}`}
                stroke="#6b7280"
                fontSize={chartFontSize}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={2} dot={false} />
              {showIndicators && (
                <>
                  <Line
                    type="monotone"
                    dataKey="sma20"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    dot={false}
                  />
                  <ReferenceLine
                    y={chartSummary?.average || 0}
                    stroke="#6b7280"
                    strokeDasharray="5 5"
                  />
                </>
              )}
            </LineChart>
          ) : (
            <ComposedChart data={chartPoints}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb20" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="#6b7280"
                fontSize={chartFontSize}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toFixed(3)}`}
                stroke="#6b7280"
                fontSize={chartFontSize}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="price" fill="#3b82f6" />
              {showIndicators && (
                <ReferenceLine
                  y={chartSummary?.average || 0}
                  stroke="#6b7280"
                  strokeDasharray="5 5"
                />
              )}
            </ComposedChart>
          )}
        </ResponsiveContainer>
      )}

      {/* Chart Summary */}
      {chartSummary && (
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-3 mt-4 pt-4 border-t border-border">
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('current')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>${chartSummary.current.toFixed(4)}</p>
          </div>
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('high')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>${chartSummary.high.toFixed(4)}</p>
          </div>
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('low')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>${chartSummary.low.toFixed(4)}</p>
          </div>
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('average')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>${chartSummary.average.toFixed(4)}</p>
          </div>
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('volatility')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>
              {(chartSummary.volatility * 100).toFixed(2)}%
            </p>
          </div>
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('change')}</p>
            <p
              className={cn(
                text('xs', 'sm', 'font-bold'),
                chartSummary.change >= 0 ? 'text-green-500' : 'text-red-500',
              )}
            >
              {chartSummary.change >= 0 ? '+' : ''}
              {chartSummary.change.toFixed(2)}%
            </p>
          </div>
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('dataPoints')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>{chartMetadata.dataPoints}</p>
          </div>
        </div>
      )}
    </motion.div>
  );
}
