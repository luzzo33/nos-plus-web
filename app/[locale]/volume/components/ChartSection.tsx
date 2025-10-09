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
import { useFontScale, FONT_SCALE } from '../hooks/useFontScale';
import { useLocale, useTranslations } from 'next-intl';
import type { TimeRange, VolumeChartDataPoint } from '@/lib/api/client';
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
  const t = useTranslations('volume.chart');

  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
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
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) return '';

    const formatMap: Record<TimeRange, string> = {
      '1h': 'HH:mm',
      '4h': 'HH:mm',
      '24h': 'HH:mm',
      '7d': 'MMM dd',
      '30d': 'MMM dd',
      '90d': 'MMM dd',
      '180d': 'MMM yyyy',
      '1y': 'MMM yyyy',
      all: 'yyyy',
    };

    return format(date, formatMap[selectedRange] || 'MMM dd', { locale: getDateLocale(locale) });
  };

  const formatYAxis = (value: number) => {
    if (value === null || value === undefined || isNaN(value)) return '$0';
    if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
    return `$${value.toFixed(0)}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!mounted || !active || !payload || !payload[0]) return null;

    try {
      const date = new Date(label);
      if (isNaN(date.getTime())) return null;

      const point = payload[0].payload;

      return (
        <div className="bg-card p-3 rounded-lg border border-border shadow-xl">
          <p className={cn(text('xs', 'xs'), 'text-muted-foreground mb-1')}>
            {format(date, 'PPp', { locale: getDateLocale(locale) })}
          </p>
          <p className={text('lg', 'lg', 'font-bold')}>{formatYAxis(payload[0].value)}</p>
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
              <div className="relative skeleton h-10 w-28 rounded-lg">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative skeleton h-10 w-32 rounded-lg">
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

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mt-4 pt-4 border-t border-border">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <div className="relative skeleton h-3 w-24 rounded">
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
                  <DatePicker
                    label={t('startDate')}
                    value={tempDateRange.start}
                    onChange={(date) => setTempDateRange((prev) => ({ ...prev, start: date }))}
                    maxDate={tempDateRange.end || new Date()}
                    text={text}
                  />

                  <DatePicker
                    label={t('endDate')}
                    value={tempDateRange.end}
                    onChange={(date) => setTempDateRange((prev) => ({ ...prev, end: date }))}
                    maxDate={new Date()}
                    text={text}
                  />

                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setTempDateRange({ start: null, end: null });
                        setShowDatePicker(false);
                      }}
                      className={cn(
                        'flex-1 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                        text('sm', 'sm'),
                      )}
                    >
                      {tc('cancel')}
                    </button>
                    <button
                      onClick={() => {
                        onDateRangeChange(tempDateRange.start, tempDateRange.end);
                        setShowDatePicker(false);
                      }}
                      className={cn(
                        'flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors',
                        text('sm', 'sm'),
                      )}
                    >
                      {tc('apply')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <select
                        value={tempSelectedRange}
                        onChange={(e) => setTempSelectedRange(e.target.value as TimeRange)}
                        className={cn(
                          'w-full px-3 py-2 bg-secondary rounded-lg appearance-none pr-8',
                          text('sm', 'sm'),
                        )}
                      >
                        {translatedTimeRanges.map((range) => (
                          <option key={range.value} value={range.value}>
                            {range.label} - {range.description}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                    </div>

                    <button
                      onClick={() => {
                        setShowDatePicker(!showDatePicker);
                        setTempDateRange({ start: null, end: null });
                      }}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                        text('sm', 'sm'),
                      )}
                    >
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{tc('customDate')}</span>
                    </button>
                  </div>

                  {/* Apply button if timeframe changed */}
                  {tempSelectedRange !== selectedRange && (
                    <button
                      onClick={() => onRangeChange(tempSelectedRange)}
                      className={cn(
                        'w-full px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors',
                        text('sm', 'sm'),
                      )}
                    >
                      {t('applyTimeframe')}
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                {translatedTimeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => {
                      setTempSelectedRange(range.value);
                      onRangeChange(range.value);
                    }}
                    className={cn(
                      'px-2.5 md:px-3 py-1 md:py-1.5 font-medium rounded transition-all',
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
                onClick={() => setChartType('bar')}
                className={cn(
                  'p-1.5 rounded transition-all',
                  chartType === 'bar' ? 'bg-background shadow-sm' : '',
                )}
                title={t('barChart')}
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
                onClick={() => setChartType('area')}
                className={cn(
                  'p-1.5 rounded transition-all',
                  chartType === 'area' ? 'bg-background shadow-sm' : '',
                )}
                title={t('areaChart')}
              >
                <CandlestickChart className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
            </div>

            <div className="relative group">
              <button className="p-2 rounded-lg hover:bg-secondary transition-colors">
                <Download className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </button>
              <div className="absolute right-0 mt-2 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                <button
                  onClick={() => onDownload('chart', 'csv')}
                  className={cn(
                    'block w-full px-4 py-2 text-left hover:bg-secondary transition-colors',
                    text('sm', 'sm'),
                  )}
                >
                  {tc('downloadCSV')}
                </button>
                <button
                  onClick={() => onDownload('chart', 'json')}
                  className={cn(
                    'block w-full px-4 py-2 text-left hover:bg-secondary transition-colors',
                    text('sm', 'sm'),
                  )}
                >
                  {tc('downloadJSON')}
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            {(['compact', 'normal', 'large'] as ChartSize[]).map((size) => (
              <button
                key={size}
                onClick={() => setChartSize(size)}
                className={cn(
                  'px-2 py-1 capitalize rounded transition-all',
                  text('xs', 'xs'),
                  chartSize === size ? 'bg-background shadow-sm' : '',
                )}
              >
                {t(size as any)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Date Range Picker Modal */}
      {showDatePicker && !isMobile && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setShowDatePicker(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl z-50 p-6 w-[90vw] max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className={text('lg', 'lg', 'font-semibold')}>{t('selectDateRange')}</h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="p-1 rounded hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <DatePicker
                label={t('startDate')}
                value={tempDateRange.start}
                onChange={(date) => setTempDateRange((prev) => ({ ...prev, start: date }))}
                maxDate={tempDateRange.end || new Date()}
                text={text}
              />

              <DatePicker
                label={t('endDate')}
                value={tempDateRange.end}
                onChange={(date) => setTempDateRange((prev) => ({ ...prev, end: date }))}
                maxDate={new Date()}
                text={text}
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                {dateRangePresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const range = preset.value();
                      setTempDateRange(range);
                    }}
                    className={cn(
                      'px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                      text('xs', 'xs'),
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setTempDateRange({ start: null, end: null });
                    setShowDatePicker(false);
                  }}
                  className={cn(
                    'flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                    text('sm', 'sm'),
                  )}
                >
                  {tc('clear')}
                </button>
                <button
                  onClick={handleApplyDateRange}
                  className={cn(
                    'flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors',
                    text('sm', 'sm'),
                  )}
                >
                  {tc('apply')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Chart */}
      <div style={{ height: getChartHeight() }}>
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={chartPoints} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="hsl(var(--muted-foreground))"
                fontSize={chartFontSize}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatYAxis}
                fontSize={chartFontSize}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="volumeUSD" fill="#3b82f6" opacity={0.8} radius={[4, 4, 0, 0]} />
              {chartSummary && (
                <ReferenceLine
                  y={chartSummary.avgVolume}
                  stroke="#fbbf24"
                  strokeDasharray="3 3"
                  label={{ value: t('average'), position: 'right' }}
                />
              )}
            </BarChart>
          ) : chartType === 'line' ? (
            <LineChart data={chartPoints} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="hsl(var(--muted-foreground))"
                fontSize={chartFontSize}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatYAxis}
                fontSize={chartFontSize}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="volumeUSD"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          ) : (
            <AreaChart data={chartPoints} margin={{ top: 10, right: 10, left: 0, bottom: 30 }}>
              <defs>
                <linearGradient id="colorVolumeMain" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="hsl(var(--muted-foreground))"
                fontSize={chartFontSize}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={formatYAxis}
                fontSize={chartFontSize}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="volumeUSD"
                stroke="#3b82f6"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#colorVolumeMain)"
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* Chart Summary */}
      {chartSummary && chartMetadata && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 md:gap-4 mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border">
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('totalVolume')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>{formatYAxis(chartSummary.totalVolume)}</p>
          </div>
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('average')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>{formatYAxis(chartSummary.avgVolume)}</p>
          </div>
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('maximum')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>{formatYAxis(chartSummary.maxVolume)}</p>
          </div>
          <div>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{t('minimum')}</p>
            <p className={text('xs', 'sm', 'font-bold')}>{formatYAxis(chartSummary.minVolume)}</p>
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
