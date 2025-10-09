'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  ChevronDown,
  Download,
  LineChart as LineChartIcon,
  CandlestickChart,
  X,
} from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';

import type { TimeRange } from '@/lib/api/client';
import type { BalancesChartResponse } from '@/lib/api/balances-client';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import type { TooltipProps } from 'recharts';

import { cn, getDateLocale } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

type ChartSize = 'compact' | 'normal' | 'large';

type MetricMode = 'total' | 'stakers' | 'unstakers';

type ChartSectionProps = {
  chartData: BalancesChartResponse | null;
  selectedRange: TimeRange;
  onRangeChange: (range: TimeRange) => void;
  onDateRangeChange: (start: Date | null, end: Date | null) => void;
  onDownload: (type: 'chart', format: 'csv' | 'json') => void;
  isMobile: boolean;
  mounted: boolean;
  metric: MetricMode;
  loading?: boolean;
};

const timeRanges: TimeRange[] = ['24h', '7d', '30d', '90d', '180d', '1y', 'all'];

export function ChartSection({
  chartData,
  selectedRange,
  onRangeChange,
  onDateRangeChange,
  onDownload,
  isMobile,
  mounted,
  metric,
  loading = false,
}: ChartSectionProps) {
  const { text } = useFontScale();
  const locale = useLocale();
  const t = useTranslations('stakersUnstakers.chart');
  const tc = useTranslations('common');

  const [chartType, setChartType] = useState<'line' | 'area'>('area');
  const [chartSize, setChartSize] = useState<ChartSize>('normal');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [tempSelectedRange, setTempSelectedRange] = useState<TimeRange>(selectedRange);
  const [visibleSeries, setVisibleSeries] = useState<{
    stakers: boolean;
    unstakers: boolean;
    total: boolean;
  }>({ stakers: true, unstakers: true, total: false });

  useEffect(() => {
    setTempSelectedRange(selectedRange);
  }, [selectedRange]);

  const showSkeleton = loading || !mounted || !chartData;

  if (showSkeleton) {
    return (
      <div className="card-base p-4 md:p-6 space-y-5">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3 w-full lg:w-auto">
            <SkeletonBlock className="h-10 w-full sm:w-44 rounded-lg" />
            <div className="flex gap-2 w-full sm:w-auto">
              <SkeletonBlock className="h-10 w-full sm:w-32 rounded-lg" />
              <SkeletonBlock className="h-10 w-10 rounded-lg" />
            </div>
          </div>
          <div className="flex items-center gap-2 w-full lg:w-auto">
            <SkeletonBlock className="h-10 w-10 rounded-lg" />
            <SkeletonBlock className="h-10 w-32 rounded-lg" />
            <SkeletonBlock className="h-10 w-32 rounded-lg" />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-secondary/30 p-3 md:p-4">
          <SkeletonBlock className="h-[260px] md:h-[380px] w-full rounded-xl" />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 pt-3 border-t border-border">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="space-y-2">
              <SkeletonBlock className="h-3 w-20 rounded-lg" />
              <SkeletonBlock className="h-4 w-16 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const points = useMemo(() => {
    const raw = (chartData as any)?.chart?.data;
    if (!Array.isArray(raw)) return [];
    return raw.map((p: any) => ({
      timestamp: p.timestamp,
      total: p.total,
      stakers: p.stakers,
      unstakers: p.unstakers,
    }));
  }, [chartData]);

  const summary = (chartData as any)?.chart?.summary;
  const metadata = (chartData as any)?.chart;
  const calcDomain = (key: 'stakers' | 'unstakers' | 'total') => {
    const vals = points.map((p) => Number(p[key]) || 0).filter((v) => Number.isFinite(v));
    if (!vals.length) return [0, 0];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    if (min === max) return [min * 0.95, max * 1.05 || 1];
    return [min, max];
  };
  const domainStakers = useMemo(() => calcDomain('stakers'), [points]);
  const domainUnstakers = useMemo(() => calcDomain('unstakers'), [points]);
  const domainTotal = useMemo(() => calcDomain('total'), [points]);

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

  const chartFontSize = isMobile ? 10 : 12;

  const formatXAxis = (value: string) => {
    if (!mounted) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const formatMap: Partial<Record<TimeRange, string>> = {
      '24h': 'HH:mm',
      '7d': 'MMM d',
      '30d': 'MMM d',
      '90d': 'MMM d',
      '180d': 'MMM yyyy',
      '1y': 'MMM yyyy',
      all: 'yyyy MMM',
    };
    return format(date, formatMap[selectedRange] ?? 'MMM d', { locale: getDateLocale(locale) });
  };

  const formatYAxis = (value: number) => {
    if (!Number.isFinite(value)) return '0';
    if (Math.abs(value) >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
    if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
    if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
    return value.toFixed(0);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!mounted || !active || !payload || !payload.length) return null;
    const date = new Date(label as any);
    if (Number.isNaN(date.getTime())) return null;
    const pt = payload[0].payload as any;
    const rows: { key: string; label: string; color: string; value: number | null }[] = [];
    if (visibleSeries.stakers)
      rows.push({
        key: 'stakers',
        label: t('series.stakingAccounts'),
        color: '#22C55E',
        value: pt.stakers ?? null,
      });
    if (visibleSeries.unstakers)
      rows.push({
        key: 'unstakers',
        label: t('series.unstakingAccounts'),
        color: '#F97316',
        value: pt.unstakers ?? null,
      });
    if (visibleSeries.total)
      rows.push({
        key: 'total',
        label: t('series.totalAccounts'),
        color: '#6366F1',
        value: pt.total ?? null,
      });
    return (
      <div className="bg-card p-3 rounded-lg border border-border shadow-xl min-w-[180px]">
        <p className={cn(text('xs', 'xs'), 'text-muted-foreground mb-2')}>
          {format(date, 'PPp', { locale: getDateLocale(locale) })}
        </p>
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center justify-between gap-4">
              <span className={cn(text('2xs', 'xs'), 'flex items-center gap-1')}>
                <span className="inline-block w-2 h-2 rounded-sm" style={{ background: r.color }} />
                {r.label}
              </span>
              <span className={text('xs', 'sm', 'font-medium')}>
                {r.value == null ? '—' : r.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="card-base p-4 md:p-6">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-4 md:mb-6 gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 md:gap-3 w-full lg:w-auto">
          {isMobile ? (
            <div className="w-full">
              {showDatePicker ? (
                <div className="space-y-3">
                  <div>
                    <label className={cn(text('xs', 'xs'), 'text-muted-foreground mb-1 block')}>
                      {tc('chart.startDate')}
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.start ? format(tempDateRange.start, 'yyyy-MM-dd') : ''}
                      max={
                        tempDateRange.end
                          ? format(tempDateRange.end, 'yyyy-MM-dd')
                          : format(new Date(), 'yyyy-MM-dd')
                      }
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        if (!Number.isNaN(d.getTime()))
                          setTempDateRange((p) => ({ ...p, start: d }));
                      }}
                      className={cn(
                        'w-full px-3 py-2 bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary',
                        text('xs', 'sm'),
                      )}
                    />
                  </div>
                  <div>
                    <label className={cn(text('xs', 'xs'), 'text-muted-foreground mb-1 block')}>
                      {tc('chart.endDate')}
                    </label>
                    <input
                      type="date"
                      value={tempDateRange.end ? format(tempDateRange.end, 'yyyy-MM-dd') : ''}
                      max={format(new Date(), 'yyyy-MM-dd')}
                      onChange={(e) => {
                        const d = new Date(e.target.value);
                        if (!Number.isNaN(d.getTime())) setTempDateRange((p) => ({ ...p, end: d }));
                      }}
                      className={cn(
                        'w-full px-3 py-2 bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary',
                        text('xs', 'sm'),
                      )}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {dateRangePresets.map((preset) => (
                      <button
                        key={preset.label}
                        onClick={() => setTempDateRange(preset.value())}
                        className={cn(
                          'px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                          text('2xs', 'xs'),
                        )}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
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
                        {timeRanges.map((r) => (
                          <option key={r} value={r}>
                            {tc(`timeRanges.${r}`)}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
                    </div>
                    <button
                      onClick={() => {
                        setShowDatePicker(true);
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
                {timeRanges.map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      setTempSelectedRange(r);
                      onRangeChange(r);
                    }}
                    className={cn(
                      'px-2.5 md:px-3 py-1 md:py-1.5 font-medium rounded transition-all',
                      text('xs', 'sm'),
                      selectedRange === r
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tc(`timeRanges.${r}`)}
                  </button>
                ))}
              </div>
              <div>
                <button
                  onClick={() => setShowDatePicker(true)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                    text('sm', 'sm'),
                  )}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{t('customRange')}</span>
                </button>
              </div>
            </>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
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
          {/* Series visibility toggles */}
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            {(['stakers', 'unstakers', 'total'] as const).map((key) => (
              <button
                key={key}
                onClick={() => setVisibleSeries((v) => ({ ...v, [key]: !v[key] }))}
                className={cn(
                  'px-2 py-1 rounded text-[10px] md:text-xs font-medium transition-all',
                  visibleSeries[key]
                    ? 'bg-background shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
                title={t(
                  `series.${key === 'stakers' ? 'stakingAccounts' : key === 'unstakers' ? 'unstakingAccounts' : 'totalAccounts'}` as any,
                )}
              >
                {key === 'stakers' ? 'Stakers' : key === 'unstakers' ? 'Unstakers' : 'Total'}
              </button>
            ))}
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
          <div className="flex gap-1 p-1 bg-secondary rounded-lg">
            {(['compact', 'normal', 'large'] as ChartSize[]).map((sz) => (
              <button
                key={sz}
                onClick={() => setChartSize(sz)}
                className={cn(
                  'px-2 py-1 capitalize rounded transition-all',
                  text('xs', 'xs'),
                  chartSize === sz ? 'bg-background shadow-sm' : '',
                )}
              >
                {tc(`chart.${sz}` as any)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop Date Range Modal */}
      {showDatePicker && !isMobile && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setShowDatePicker(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl z-50 p-6 w-[90vw] max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className={text('lg', 'lg', 'font-semibold')}>{tc('chart.selectDateRange')}</h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="p-1 rounded hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={cn(text('xs', 'xs'), 'text-muted-foreground mb-1 block')}>
                  {tc('chart.startDate')}
                </label>
                <input
                  type="date"
                  value={tempDateRange.start ? format(tempDateRange.start, 'yyyy-MM-dd') : ''}
                  max={
                    tempDateRange.end
                      ? format(tempDateRange.end, 'yyyy-MM-dd')
                      : format(new Date(), 'yyyy-MM-dd')
                  }
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!Number.isNaN(d.getTime())) setTempDateRange((p) => ({ ...p, start: d }));
                  }}
                  className={cn(
                    'w-full px-3 py-2 bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary',
                    text('xs', 'sm'),
                  )}
                />
              </div>
              <div>
                <label className={cn(text('xs', 'xs'), 'text-muted-foreground mb-1 block')}>
                  {tc('chart.endDate')}
                </label>
                <input
                  type="date"
                  value={tempDateRange.end ? format(tempDateRange.end, 'yyyy-MM-dd') : ''}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const d = new Date(e.target.value);
                    if (!Number.isNaN(d.getTime())) setTempDateRange((p) => ({ ...p, end: d }));
                  }}
                  className={cn(
                    'w-full px-3 py-2 bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary',
                    text('xs', 'sm'),
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {dateRangePresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setTempDateRange(preset.value())}
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
                  onClick={() => {
                    onDateRangeChange(tempDateRange.start, tempDateRange.end);
                    setShowDatePicker(false);
                  }}
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

      {!points.length ? (
        <div className="h-[320px] flex items-center justify-center text-muted-foreground border border-dashed border-border rounded-xl">
          {t('noData')}
        </div>
      ) : (
        <div className="w-full" style={{ height: getChartHeight() }}>
          <ResponsiveContainer width="100%" height="100%">
            {chartType === 'line' ? (
              <LineChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: chartFontSize }}
                  minTickGap={16}
                  tickMargin={8}
                />
                {visibleSeries.stakers && (
                  <YAxis
                    yAxisId="left"
                    tickFormatter={formatYAxis}
                    domain={domainStakers as any}
                    tick={{ fontSize: chartFontSize, fill: '#22C55E' }}
                  />
                )}
                {visibleSeries.unstakers && (
                  <YAxis
                    orientation={visibleSeries.stakers ? 'right' : 'left'}
                    yAxisId="right"
                    tickFormatter={formatYAxis}
                    domain={domainUnstakers as any}
                    tick={{ fontSize: chartFontSize, fill: '#F97316' }}
                  />
                )}
                {!visibleSeries.stakers && !visibleSeries.unstakers && visibleSeries.total && (
                  <YAxis
                    tickFormatter={formatYAxis}
                    domain={domainTotal as any}
                    tick={{ fontSize: chartFontSize }}
                  />
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="center"
                  wrapperStyle={{ fontSize: chartFontSize, paddingBottom: 8 }}
                />
                {visibleSeries.stakers && (
                  <Line
                    yAxisId="left"
                    type="monotone"
                    dataKey="stakers"
                    stroke="#22C55E"
                    strokeWidth={2}
                    dot={false}
                    name={t('series.stakingAccounts')}
                  />
                )}
                {visibleSeries.unstakers && (
                  <Line
                    yAxisId={visibleSeries.stakers ? 'right' : 'left'}
                    type="monotone"
                    dataKey="unstakers"
                    stroke="#F97316"
                    strokeWidth={2}
                    dot={false}
                    name={t('series.unstakingAccounts')}
                  />
                )}
                {visibleSeries.total && (
                  <Line
                    yAxisId={
                      visibleSeries.stakers ? 'left' : visibleSeries.unstakers ? 'right' : undefined
                    }
                    type="monotone"
                    dataKey="total"
                    stroke="#6366F1"
                    strokeDasharray="4 3"
                    strokeWidth={2}
                    dot={false}
                    name={t('series.totalAccounts')}
                  />
                )}
              </LineChart>
            ) : (
              <AreaChart data={points} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="areaStakers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22C55E" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="areaUnstakers" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F97316" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F97316" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxis}
                  tick={{ fontSize: chartFontSize }}
                  minTickGap={16}
                  tickMargin={8}
                />
                {visibleSeries.stakers && (
                  <YAxis
                    yAxisId="left"
                    tickFormatter={formatYAxis}
                    domain={domainStakers as any}
                    tick={{ fontSize: chartFontSize, fill: '#22C55E' }}
                  />
                )}
                {visibleSeries.unstakers && (
                  <YAxis
                    orientation={visibleSeries.stakers ? 'right' : 'left'}
                    yAxisId="right"
                    tickFormatter={formatYAxis}
                    domain={domainUnstakers as any}
                    tick={{ fontSize: chartFontSize, fill: '#F97316' }}
                  />
                )}
                {!visibleSeries.stakers && !visibleSeries.unstakers && visibleSeries.total && (
                  <YAxis
                    tickFormatter={formatYAxis}
                    domain={domainTotal as any}
                    tick={{ fontSize: chartFontSize }}
                  />
                )}
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  verticalAlign="top"
                  align="center"
                  wrapperStyle={{ fontSize: chartFontSize, paddingBottom: 8 }}
                />
                {visibleSeries.stakers && (
                  <Area
                    yAxisId="left"
                    type="monotone"
                    dataKey="stakers"
                    stroke="#22C55E"
                    fill="url(#areaStakers)"
                    strokeWidth={2}
                    fillOpacity={1}
                    name={t('series.stakingAccounts')}
                  />
                )}
                {visibleSeries.unstakers && (
                  <Area
                    yAxisId={visibleSeries.stakers ? 'right' : 'left'}
                    type="monotone"
                    dataKey="unstakers"
                    stroke="#F97316"
                    fill="url(#areaUnstakers)"
                    strokeWidth={2}
                    fillOpacity={1}
                    name={t('series.unstakingAccounts')}
                  />
                )}
                {visibleSeries.total && (
                  <Area
                    yAxisId={
                      visibleSeries.stakers ? 'left' : visibleSeries.unstakers ? 'right' : undefined
                    }
                    type="monotone"
                    dataKey="total"
                    stroke="#6366F1"
                    fill="url(#areaTotal)"
                    strokeWidth={2}
                    fillOpacity={0.6}
                    name={t('series.totalAccounts')}
                  />
                )}
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      {summary && (
        <div className="mt-4 md:mt-6 pt-4 md:pt-6 border-t border-border space-y-4 md:space-y-6">
          {(['stakers', 'unstakers', 'total'] as const)
            .filter((k) => visibleSeries[k])
            .map((k, idx) => {
              const color = k === 'stakers' ? '#22C55E' : k === 'unstakers' ? '#F97316' : '#6366F1';
              const label =
                k === 'stakers'
                  ? t('series.stakingAccounts')
                  : k === 'unstakers'
                    ? t('series.unstakingAccounts')
                    : t('series.totalAccounts');
              return (
                <div key={k}>
                  <p className={cn(text('2xs', 'xs'), 'mb-1 font-medium')} style={{ color }}>
                    {label}
                  </p>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
                    <div>
                      <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {t('average')}
                      </p>
                      <p className={text('xs', 'sm', 'font-bold')}>
                        {summary?.[k]?.avg ? Math.round(summary[k].avg).toLocaleString() : '—'}
                      </p>
                    </div>
                    <div>
                      <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {t('maximum')}
                      </p>
                      <p className={text('xs', 'sm', 'font-bold')}>
                        {summary?.[k]?.max ? Math.round(summary[k].max).toLocaleString() : '—'}
                      </p>
                    </div>
                    <div>
                      <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {t('minimum')}
                      </p>
                      <p className={text('xs', 'sm', 'font-bold')}>
                        {summary?.[k]?.min ? Math.round(summary[k].min).toLocaleString() : '—'}
                      </p>
                    </div>
                    {idx === 0 && (
                      <div>
                        <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                          {t('dataPoints')}
                        </p>
                        <p className={text('xs', 'sm', 'font-bold')}>
                          {metadata?.dataPoints ?? points.length}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
