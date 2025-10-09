'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, TimeRange, DistributionStatsResponse } from '@/lib/api/client';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';
import {
  BarChart3,
  PieChart,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Users,
  Wallet,
  LineChart,
  Table,
  Activity,
  Brain,
  Target,
  Zap,
  Shield,
  ChevronRight,
  ChevronLeft,
  Eye,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  History,
  Gauge,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  ComposedChart,
  LineChart as RechartsLineChart,
  Line,
} from 'recharts';

interface DistributionSectionProps {
  mounted: boolean;
}

type ViewType = 'current' | 'chart' | 'table' | 'stats';
type ChartMode = 'area' | 'bar' | 'line';

const timeRanges: TimeRange[] = ['7d', '30d', '90d', '180d', '1y', 'all'];

const DISTRIBUTION_GRADIENTS = {
  micro: 'from-red-600 to-red-400',
  small: 'from-orange-600 to-orange-400',
  medium: 'from-yellow-600 to-yellow-400',
  large: 'from-green-600 to-green-400',
  xlarge: 'from-blue-600 to-blue-400',
  whale: 'from-purple-600 to-purple-400',
  megaWhale: 'from-pink-600 to-pink-400',
};

const CATEGORY_COLORS = {
  micro: '#ef4444',
  small: '#f97316',
  medium: '#eab308',
  large: '#22c55e',
  xlarge: '#3b82f6',
  whale: '#a855f7',
  megaWhale: '#ec4899',
};

const categoriesList = [
  'micro',
  'small',
  'medium',
  'large',
  'xlarge',
  'whale',
  'megaWhale',
] as const;
type CategoryKey = (typeof categoriesList)[number];
const categoryLabelsFallback: Record<CategoryKey, string> = {
  micro: 'Micro (<50)',
  small: 'Small (50-500)',
  medium: 'Medium (500-5K)',
  large: 'Large (5K-20K)',
  xlarge: 'X-Large (20K-50K)',
  whale: 'Whale (50K-150K)',
  megaWhale: 'Mega Whale (>150K)',
};

export function DistributionSection({ mounted }: DistributionSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('holders.distribution');
  const tc = useTranslations('common');

  const [selectedView, setSelectedView] = useState<ViewType>('current');
  type CurrentTimeframe = '24h' | '7d' | '30d' | '90d' | '180d' | '1y';
  const [currentTimeframe, setCurrentTimeframe] = useState<CurrentTimeframe>('24h');
  const [currentTfOpen, setCurrentTfOpen] = useState(false);
  const [selectedRange, setSelectedRange] = useState<TimeRange>('30d');
  const [showMovingAverage, setShowMovingAverage] = useState(false);
  const [chartMode, setChartMode] = useState<ChartMode>('area');
  const [compareOpen, setCompareOpen] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [dateFilter, setDateFilter] = useState<{ startDate: string; endDate: string }>({
    startDate: '',
    endDate: '',
  });
  const [pageSizeOpen, setPageSizeOpen] = useState(false);
  const [statsRangeOpen, setStatsRangeOpen] = useState(false);
  const [tableRangeOpen, setTableRangeOpen] = useState(false);
  const [showAllCategories, setShowAllCategories] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ start: string; end: string }>({
    start: dateFilter.startDate,
    end: dateFilter.endDate,
  });
  const [selectedCategories, setSelectedCategories] = useState<CategoryKey[]>(['micro', 'large']);
  const [scaleMode, setScaleMode] = useState<'log' | 'linear'>('log');

  const { data: widgetData, isLoading: widgetLoading } = useQuery({
    queryKey: ['distribution-widget'],
    queryFn: () => apiClient.getDistributionWidgetData(),
    enabled: mounted,
    staleTime: 60000,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['distribution-chart', selectedRange],
    queryFn: () => apiClient.getDistributionChartData({ range: selectedRange }),
    enabled: mounted && selectedView === 'chart',
    staleTime: 300000,
  });

  const {
    data: statsData,
    isLoading: statsLoading,
    isError: statsError,
  } = useQuery<DistributionStatsResponse>({
    queryKey: ['distribution-stats', selectedRange],
    queryFn: () => apiClient.getDistributionStats({ range: selectedRange }),
    enabled: mounted && selectedView === 'stats',
    staleTime: 300000,
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: [
      'distribution-table',
      currentPage,
      pageSize,
      dateFilter,
      selectedRange,
      sortField,
      sortOrder,
    ],
    queryFn: () =>
      apiClient.getDistributionTableData({
        page: currentPage,
        limit: pageSize,
        sortBy: sortField === 'date' ? 'date' : sortField,
        sortOrder: sortOrder,
        timeframe: selectedRange,
        startDate: dateFilter.startDate || undefined,
        endDate: dateFilter.endDate || undefined,
      }),
    enabled: mounted && selectedView === 'table',
    staleTime: 300000,
  });

  const widget = widgetData?.widget;

  const formatValue = (value: number | undefined) => {
    if (!value || typeof value !== 'number') return '0';
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const fmt1 = (n: number | string | undefined) => {
    const v = typeof n === 'string' ? parseFloat(n) : n;
    return typeof v === 'number' && !isNaN(v) ? v.toFixed(1) : '-';
  };

  const toNum = (n: number | string | undefined): number => {
    const v = typeof n === 'string' ? parseFloat(n) : n;
    return typeof v === 'number' && !isNaN(v) ? v : 0;
  };

  const pct = (n: number | string | undefined): string => `${fmt1(n)}%`;

  const getDominantCategory = () => {
    if (!widget?.current?.percentages) return 'micro';
    return Object.entries(widget.current.percentages).reduce(
      (max, [key, value]) =>
        (value as number) > max.value ? { key, value: value as number } : max,
      { key: 'micro', value: 0 },
    ).key;
  };

  const prepareChartData = useCallback(() => {
    const nested = (chartData as any)?.chart?.data?.data;
    const flat = (chartData as any)?.chart?.data;
    const points: any[] = Array.isArray(nested) ? nested : Array.isArray(flat) ? flat : [];
    if (!Array.isArray(points)) return [];
    return points.map((item: any) => ({
      date: item.timestamp,
      timestamp: item.timestamp,
      ...categoriesList.reduce(
        (acc, category) => ({
          ...acc,
          [category]: item.distribution?.[category] || 0,
        }),
        {},
      ),
    }));
  }, [chartData]);

  const withTotalsAndMA = useCallback((data: Array<any>): any[] => {
    const out = data.map((d) => ({
      ...d,
      __total: categoriesList.reduce((sum, k) => sum + (Number(d[k]) || 0), 0),
    }));
    const period = 7;
    for (let i = 0; i < out.length; i++) {
      const start = Math.max(0, i - period + 1);
      let sum = 0;
      let count = 0;
      for (let j = start; j <= i; j++) {
        sum += out[j].__total;
        count++;
      }
      out[i].__ma7 = count ? sum / count : out[i].__total;
    }
    return out;
  }, []);

  const downsample = useCallback(
    (data: Array<any>, maxPoints = 120): { data: any[]; sampled: boolean } => {
      if (data.length <= maxPoints) return { data, sampled: false };

      const targetPoints =
        chartMode === 'bar' && data.length > 100 ? Math.min(maxPoints, 60) : maxPoints;

      const bucketSize = Math.ceil(data.length / targetPoints);
      const buckets: Array<any> = [];
      for (let i = 0; i < data.length; i += bucketSize) {
        const slice = data.slice(i, i + bucketSize);
        if (!slice.length) continue;

        const midIndex = Math.floor(slice.length / 2);
        const avg: any = {
          date: slice[midIndex].date,
          timestamp: slice[midIndex].timestamp,
        };

        for (const key of categoriesList) {
          avg[key] = Math.round(
            slice.reduce((s, d) => s + (Number(d[key]) || 0), 0) / slice.length,
          );
        }
        buckets.push(avg);
      }
      return { data: buckets, sampled: true };
    },
    [chartMode],
  );
  const chartPrepared = useMemo((): { data: any[]; sampled: boolean } => {
    const base = prepareChartData();
    if (!base.length) return { data: [], sampled: false };

    if (chartMode === 'bar') {
      const maxPoints = base.length > 200 ? 40 : base.length > 100 ? 60 : 120;
      const { data, sampled } = downsample(base, maxPoints);
      return { data: withTotalsAndMA(data), sampled };
    }

    return { data: withTotalsAndMA(base), sampled: false };
  }, [prepareChartData, chartMode, downsample, withTotalsAndMA]);

  const views = [
    { id: 'current' as ViewType, label: t('viewCurrent'), icon: PieChart },
    { id: 'chart' as ViewType, label: t('viewChart'), icon: LineChart },
    { id: 'table' as ViewType, label: t('viewTable'), icon: Table },
    { id: 'stats' as ViewType, label: t('viewStats'), icon: BarChart3 },
  ];

  const handleSort = (field: string) => {
    setSortField((prevField) => {
      setSortOrder((prevOrder) =>
        prevField === field ? (prevOrder === 'ASC' ? 'DESC' : 'ASC') : 'DESC',
      );
      return field;
    });
    setCurrentPage(1);
  };

  const applyDateFilter = () => {
    setDateFilter({ startDate: tempDateRange.start || '', endDate: tempDateRange.end || '' });
    setCurrentPage(1);
    setDatePickerOpen(false);
  };

  const clearDateFilter = () => {
    setTempDateRange({ start: '', end: '' });
    setDateFilter({ startDate: '', endDate: '' });
    setCurrentPage(1);
    setDatePickerOpen(false);
  };

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Modern Header with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-sm border border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-xl bg-primary/10 backdrop-blur-sm">
                  <PieChart className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h2 className={cn(text('lg', '2xl', 'font-bold'))}>{t('title')}</h2>
              </div>
              <p className={cn(text('xs', 'base'), 'text-muted-foreground')}>{t('description')}</p>
            </div>

            {/* View Selector - Modern Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50">
              {views.map((view) => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    onClick={() => setSelectedView(view.id)}
                    className={cn(
                      'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200',
                      text('xs', 'sm'),
                      selectedView === view.id
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{view.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Current View */}
      {selectedView === 'current' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Main Distribution Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-background/90 border backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-15" />

              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="grid gap-8 lg:grid-cols-5">
                  {/* Unified Distribution Visualization */}
                  <div className="space-y-5 lg:col-span-3">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1">
                        <h3 className={cn(text('lg', 'xl', 'font-semibold'))}>
                          {t('overview') || 'Distribution Overview'}
                        </h3>
                        <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                          {formatValue(widget?.current?.total || 0)} {t('totalWallets')}
                        </p>
                      </div>
                      {/* Scale Toggle */}
                      <div className="flex items-center gap-2">
                        <div className="hidden sm:block text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                          {t('scaleLabel')}
                        </div>
                        <div className="inline-flex rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                          {(['log', 'linear'] as const).map((mode) => (
                            <button
                              key={mode}
                              onClick={() => setScaleMode(mode)}
                              className={cn(
                                'px-3 py-1.5 text-xs font-medium transition-colors',
                                scaleMode === mode
                                  ? 'bg-primary text-primary-foreground'
                                  : 'text-muted-foreground hover:text-foreground',
                              )}
                              aria-pressed={scaleMode === mode}
                            >
                              {mode === 'log' ? t('scaleLog') : t('scaleLinear')}
                            </button>
                          ))}
                        </div>
                        {/* Timeframe Dropdown for current overview */}
                        <div className="relative">
                          <button
                            onClick={() => setCurrentTfOpen((o) => !o)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border/50 bg-muted/30 text-xs font-medium hover:bg-muted/50"
                          >
                            {tc(`timeRanges.${currentTimeframe}`)}
                            <ChevronDown
                              className={cn(
                                'w-3 h-3 transition-transform',
                                currentTfOpen && 'rotate-180',
                              )}
                            />
                          </button>
                          <AnimatePresence>
                            {currentTfOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                className="absolute right-0 z-30 mt-1 min-w-[90px] rounded-md border border-border/60 bg-background shadow-lg overflow-hidden"
                              >
                                {(
                                  ['24h', '7d', '30d', '90d', '180d', '1y'] as CurrentTimeframe[]
                                ).map((tf) => (
                                  <button
                                    key={tf}
                                    onClick={() => {
                                      setCurrentTimeframe(tf);
                                      setCurrentTfOpen(false);
                                    }}
                                    className={cn(
                                      'block w-full text-left px-3 py-1.5 text-xs hover:bg-muted',
                                      currentTimeframe === tf && 'bg-muted/60 font-medium',
                                    )}
                                  >
                                    {tc(`timeRanges.${tf}`)}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>

                    {/* Stacked Overview Bar (no inline text per request) */}
                    {(() => {
                      const perc = widget?.current?.percentages || ({} as Record<string, number>);
                      const totalPerc =
                        categoriesList.reduce((s, c) => s + (perc[c] || 0), 0) || 100;
                      return (
                        <div className="w-full h-5 rounded-full bg-muted/30 flex overflow-hidden border border-border/40">
                          {categoriesList.map((cat) => {
                            const p = perc[cat] || 0;
                            const visibleWidth = Math.max((p / totalPerc) * 100, 1.5);
                            return (
                              <div
                                key={`stack-${cat}`}
                                className="relative h-full"
                                style={{
                                  width: `${visibleWidth}%`,
                                  backgroundColor:
                                    CATEGORY_COLORS[cat as keyof typeof CATEGORY_COLORS],
                                }}
                                aria-label={`${t(cat as any)} ${p.toFixed(2)}%`}
                              ></div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    {/* Category Bars with Adaptive Scale */}
                    <div className="space-y-3">
                      {(() => {
                        const brackets =
                          widget?.current?.brackets || ({} as Record<string, number>);
                        const counts = categoriesList.map((cat) => brackets[cat] || 0);
                        const maxCount = Math.max(...counts, 1);
                        const maxLog = Math.max(...counts.map((c) => Math.log10((c || 0) + 1)), 1);
                        const calcWidth = (val: number) => {
                          if (!val) return 6;
                          if (scaleMode === 'log') {
                            return (Math.log10(val + 1) / maxLog) * 100;
                          }
                          return (val / maxCount) * 100;
                        };
                        return categoriesList.map((category) => {
                          const count = brackets[category] || 0;
                          const percentage = widget?.current?.percentages?.[category] ?? 0;
                          const changeObj: any =
                            widget?.changes?.[currentTimeframe]?.brackets?.[category];
                          const absoluteChange = changeObj?.absolute ?? null;
                          const percentagePointChange = changeObj?.percentage ?? null;
                          const prevCount =
                            absoluteChange !== null && typeof absoluteChange === 'number'
                              ? Math.max(0, count - absoluteChange)
                              : null;
                          const prevWidth =
                            prevCount !== null
                              ? Math.max(
                                  scaleMode === 'log'
                                    ? (Math.log10(prevCount + 1) / maxLog) * 100
                                    : (prevCount / maxCount) * 100,
                                  4,
                                )
                              : 0;
                          const color = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS];
                          let widthPct = calcWidth(count);
                          widthPct = Math.max(widthPct, 8);
                          return (
                            <div key={category} className="space-y-1.5">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: color }}
                                  />
                                  <span
                                    className={cn(
                                      text('xs', 'sm'),
                                      'truncate text-muted-foreground',
                                    )}
                                  >
                                    {t(category as any) || categoryLabelsFallback[category]}
                                  </span>
                                </div>
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <div className={cn(text('xs', 'sm', 'font-semibold'))}>
                                      {percentage.toFixed(2)}%
                                    </div>
                                    {percentagePointChange !== null && (
                                      <motion.span
                                        initial={{ opacity: 0, y: 4 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        key={currentTimeframe + category}
                                        className={cn(
                                          'px-1.5 py-0.5 rounded text-[10px] font-medium',
                                          absoluteChange > 0
                                            ? 'bg-green-500/15 text-green-500'
                                            : absoluteChange < 0
                                              ? 'bg-red-500/15 text-red-500'
                                              : 'bg-muted/40 text-muted-foreground',
                                        )}
                                      >
                                        {absoluteChange > 0 ? '+' : ''}
                                        {absoluteChange?.toLocaleString?.()}
                                      </motion.span>
                                    )}
                                  </div>
                                  <div className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                    {formatValue(count)} {t('wallets')}
                                  </div>
                                </div>
                              </div>
                              <div className="relative">
                                <div className="h-3 bg-muted/25 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(widthPct, 100)}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className="h-full rounded-full"
                                    style={{
                                      backgroundImage: `linear-gradient(90deg, ${color}33, ${color})`,
                                    }}
                                  />
                                  {prevCount !== null && (
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${Math.min(prevWidth, 100)}%` }}
                                      transition={{ duration: 0.8, ease: 'easeOut', delay: 0.15 }}
                                      className="h-full rounded-full absolute inset-0 opacity-35"
                                      style={{
                                        backgroundImage: `linear-gradient(90deg, ${color}11, ${color}66)`,
                                      }}
                                    />
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-2">
                      <motion.span
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-[11px] font-medium text-white shadow',
                          DISTRIBUTION_GRADIENTS[
                            getDominantCategory() as keyof typeof DISTRIBUTION_GRADIENTS
                          ],
                        )}
                      >
                        {t('dominantType')}:{' '}
                        {t(getDominantCategory() as any) ||
                          categoryLabelsFallback[
                            getDominantCategory() as keyof typeof categoryLabelsFallback
                          ]}
                      </motion.span>
                      <span className="text-[11px] text-muted-foreground">
                        {scaleMode === 'log'
                          ? t('scaleLogExplanation')
                          : t('scaleLinearExplanation')}
                      </span>
                    </div>
                  </div>

                  {/* Insights & Metrics */}
                  <div className="space-y-4 lg:col-span-2">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {/* Remove non-API mock metric 'healthScore' */}
                      {[
                        {
                          label: t('change24h'),
                          value: (() => {
                            const change = widget?.changes?.['24h']?.brackets?.micro?.percentage;
                            if (typeof change === 'number') {
                              const sign = change > 0 ? '+' : '';
                              return `${sign}${change.toFixed(1)}%`;
                            }
                            return '-';
                          })(),
                          icon: TrendingUp,
                          color: 'text-green-500',
                        },
                        {
                          label: t('concentration'),
                          value: `${((widget?.current?.percentages?.whale || 0) + (widget?.current?.percentages?.megaWhale || 0)).toFixed(1)}%`,
                          icon: Activity,
                          color: 'text-primary',
                        },
                        {
                          label: t('dominantType'),
                          value:
                            (t(getDominantCategory() as any) as string)?.split(' ')?.[0] ||
                            categoryLabelsFallback[
                              getDominantCategory() as keyof typeof categoryLabelsFallback
                            ]?.split(' ')?.[0] ||
                            'Micro',
                          icon: Target,
                          color: 'text-green-500',
                        },
                      ].map((metric, idx) => {
                        const Icon = metric.icon;
                        return (
                          <motion.div
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1 * idx }}
                            className="bg-muted/30 backdrop-blur-sm rounded-xl p-4 border border-border/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {metric.label}
                              </p>
                              <Icon className={cn('w-4 h-4', metric.color)} />
                            </div>
                            <p className={cn(text('lg', 'xl', 'font-semibold'), metric.color)}>
                              {metric.value}
                            </p>
                          </motion.div>
                        );
                      })}
                    </div>

                    {/* Market Interpretation Card */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-4 sm:p-5 border border-primary/20"
                    >
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 space-y-3">
                          <h4 className={cn(text('sm', 'base', 'font-semibold'))}>
                            {t('analysisTitle')}
                          </h4>
                          <p
                            className={cn(
                              text('sm', 'base'),
                              'text-muted-foreground leading-relaxed',
                            )}
                          >
                            {t('analysisText', {
                              micro: widget?.current?.percentages?.micro?.toFixed(1) ?? '-',
                            })}
                          </p>

                          <div className="flex items-center gap-2 mt-3 p-3 bg-background/50 rounded-lg">
                            <Target className="w-4 h-4 text-primary" />
                            <p className={text('sm', 'base', 'font-medium')}>
                              {t('decentralization')}: {t('decentralizationValue')}
                            </p>
                          </div>

                          {/* Risk Level Badge */}
                          <div className="flex items-center gap-2 mt-3">
                            <Shield className="w-4 h-4 text-green-500" />
                            <span
                              className={cn(
                                text('xs', 'sm'),
                                'px-3 py-1 rounded-full font-medium bg-green-500/10 text-green-500',
                              )}
                            >
                              {t('riskLevel')}: {tc('low')}
                            </span>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Chart View */}
      {selectedView === 'chart' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Chart Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="space-y-1">
                <h3 className={cn(text('lg', 'xl', 'font-semibold'))}>
                  {t('chart.timelineTitle')}
                </h3>
                <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('chart.timelineSubtitle')}
                </p>
                {/* Chart Type Selector */}
                <div className="inline-flex items-center gap-1 p-1 bg-muted/50 rounded-lg w-auto">
                  {(
                    [
                      { id: 'area', label: t('areaChart'), icon: LineChart },
                      { id: 'bar', label: t('barChart'), icon: BarChart3 },
                      { id: 'line', label: t('lineChart'), icon: Activity },
                    ] as Array<{ id: ChartMode; label: string; icon: any }>
                  ).map((mode) => {
                    const Icon = mode.icon;
                    return (
                      <button
                        key={mode.id}
                        onClick={() => setChartMode(mode.id)}
                        className={cn(
                          'flex items-center gap-1.5 px-3 py-1.5 rounded-md',
                          text('xs', 'sm'),
                          chartMode === mode.id
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                        )}
                        aria-label={mode.label}
                      >
                        <Icon className="w-4 h-4" />
                        <span className="hidden sm:inline">{mode.label}</span>
                      </button>
                    );
                  })}
                </div>
                {/* Performance note when sampling */}
                {chartPrepared.sampled && (
                  <div className="ml-2 inline-flex items-center gap-2 text-[10px] sm:text-xs px-2 py-1 rounded bg-amber-500/10 text-amber-600 border border-amber-500/20">
                    {t('chart.performanceMode', { default: 'Performance mode: sampled' } as any)}
                  </div>
                )}
              </div>

              {/* Time Range Selector */}
              <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                {timeRanges.map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedRange(range)}
                    className={cn(
                      'px-3 py-1.5 text-xs sm:text-sm font-medium rounded-md transition-all',
                      selectedRange === range
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
                    )}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* Main Chart Container */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-background/90 border backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-20" />

              <div className="relative p-4 sm:p-6">
                {chartLoading ? (
                  <div className="h-80 flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <>
                    {/* Chart Header */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-start mb-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          <h4 className={cn(text('base', 'lg', 'font-semibold'))}>
                            {t('chart.trends')}
                          </h4>
                        </div>
                        <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                          {`${tc(`timeRangeDescriptions.${selectedRange}`)} • ${(() => {
                            const nested = (chartData as any)?.chart?.data?.data;
                            const flat = (chartData as any)?.chart?.data;
                            const count = Array.isArray(nested)
                              ? nested.length
                              : Array.isArray(flat)
                                ? flat.length
                                : 0;
                            return `${count} ${tc('dataPoints')}`;
                          })()}`}
                        </p>
                      </div>

                      {/* Chart Type Toggle */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setShowMovingAverage(!showMovingAverage)}
                          className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-all',
                            text('xs', 'sm'),
                            showMovingAverage
                              ? 'bg-primary/10 text-primary'
                              : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                          )}
                        >
                          <TrendingUp className="w-4 h-4" />
                          {t('chart.movingAverage')}
                        </button>
                      </div>
                    </div>

                    {/* Chart */}
                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        {chartMode === 'area' ? (
                          <AreaChart data={chartPrepared.data}>
                            <defs>
                              <linearGradient id="distributionGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                  offset="5%"
                                  stopColor="hsl(var(--primary))"
                                  stopOpacity={0.3}
                                />
                                <stop
                                  offset="95%"
                                  stopColor="hsl(var(--primary))"
                                  stopOpacity={0.05}
                                />
                              </linearGradient>
                            </defs>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="hsl(var(--border))"
                              opacity={0.3}
                            />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                              tickFormatter={(value) => formatValue(value)}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
                                      <p className="text-sm font-medium mb-2">
                                        {format(new Date(label || new Date()), 'MMM dd, yyyy')}
                                      </p>
                                      {payload.map((entry, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: entry.color }}
                                          />
                                          <span className="text-muted-foreground">
                                            {t(entry.dataKey as any) ||
                                              categoryLabelsFallback[
                                                entry.dataKey as keyof typeof categoryLabelsFallback
                                              ] ||
                                              entry.dataKey}
                                            :
                                          </span>
                                          <span className="font-medium">
                                            {formatValue(entry.value as number)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />

                            {/* Category Areas */}
                            {categoriesList.map((category) => (
                              <Area
                                key={category}
                                type="monotone"
                                dataKey={category}
                                stroke={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}
                                fill={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}
                                fillOpacity={0.1}
                                strokeWidth={2}
                                dot={false}
                                isAnimationActive={chartPrepared.data.length <= 160}
                                activeDot={{
                                  r: 4,
                                  fill: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
                                  strokeWidth: 2,
                                  stroke: 'hsl(var(--background))',
                                }}
                              />
                            ))}
                          </AreaChart>
                        ) : chartMode === 'bar' ? (
                          <ComposedChart data={chartPrepared.data}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="hsl(var(--border))"
                              opacity={0.3}
                            />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(v) => format(new Date(v), 'MMM dd')}
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                              tickFormatter={(v) => formatValue(v)}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
                                      <p className="text-sm font-medium mb-2">
                                        {format(new Date(label || new Date()), 'MMM dd, yyyy')}
                                      </p>
                                      {payload.map((entry, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: entry.color }}
                                          />
                                          <span className="text-muted-foreground">
                                            {t(entry.dataKey as any) ||
                                              categoryLabelsFallback[
                                                entry.dataKey as keyof typeof categoryLabelsFallback
                                              ] ||
                                              String(entry.dataKey)}
                                            :
                                          </span>
                                          <span className="font-medium">
                                            {formatValue(entry.value as number)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {categoriesList.map((category) => (
                              <Bar
                                key={`bar-${category}`}
                                dataKey={category}
                                stackId="a"
                                fill={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}
                                isAnimationActive={chartPrepared.data.length <= 60}
                              />
                            ))}
                            {showMovingAverage && (
                              <Area
                                type="monotone"
                                dataKey="__ma7"
                                stroke="hsl(var(--primary))"
                                fillOpacity={0}
                                strokeWidth={1.5}
                                dot={false}
                                isAnimationActive={chartPrepared.data.length <= 60}
                              />
                            )}
                          </ComposedChart>
                        ) : (
                          <RechartsLineChart data={chartPrepared.data}>
                            <CartesianGrid
                              strokeDasharray="3 3"
                              stroke="hsl(var(--border))"
                              opacity={0.3}
                            />
                            <XAxis
                              dataKey="date"
                              tickFormatter={(v) => format(new Date(v), 'MMM dd')}
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                            />
                            <YAxis
                              stroke="hsl(var(--muted-foreground))"
                              fontSize={12}
                              tickFormatter={(v) => formatValue(v)}
                            />
                            <Tooltip
                              content={({ active, payload, label }) => {
                                if (active && payload && payload.length) {
                                  return (
                                    <div className="bg-background/95 backdrop-blur-sm border border-border rounded-lg p-3 shadow-lg">
                                      <p className="text-sm font-medium mb-2">
                                        {format(new Date(label || new Date()), 'MMM dd, yyyy')}
                                      </p>
                                      {payload.map((entry, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-xs">
                                          <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: entry.color }}
                                          />
                                          <span className="text-muted-foreground">
                                            {t(entry.dataKey as any) ||
                                              categoryLabelsFallback[
                                                entry.dataKey as keyof typeof categoryLabelsFallback
                                              ] ||
                                              String(entry.dataKey)}
                                            :
                                          </span>
                                          <span className="font-medium">
                                            {formatValue(entry.value as number)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              }}
                            />
                            {categoriesList.map((category) => (
                              <Line
                                key={`line-${category}`}
                                type="monotone"
                                dataKey={category}
                                stroke={CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]}
                                strokeWidth={2}
                                dot={false}
                                activeDot={{
                                  r: 4,
                                  fill: CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
                                }}
                                isAnimationActive={chartPrepared.data.length <= 200}
                              />
                            ))}
                          </RechartsLineChart>
                        )}
                      </ResponsiveContainer>
                    </div>

                    {/* Chart Legend */}
                    <div className="mt-6 flex flex-wrap gap-3 justify-center">
                      {categoriesList.map((category) => (
                        <div key={category} className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{
                              backgroundColor:
                                CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS],
                            }}
                          />
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t(category as any)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Chart Insights */}
            <div className="grid gap-4 md:grid-cols-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-gradient-to-br from-green-500/5 to-green-500/10 rounded-xl p-4 sm:p-5 border border-green-500/20"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-500/10">
                    <TrendingUp className="w-5 h-5 text-green-500" />
                  </div>
                  <div className="space-y-2">
                    <h4 className={cn(text('sm', 'base', 'font-semibold'))}>
                      {t('growingDistribution')}
                    </h4>
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('growingDistributionText')}
                    </p>
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="bg-gradient-to-br from-blue-500/5 to-blue-500/10 rounded-xl p-4 sm:p-5 border border-blue-500/20"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/10">
                    <Shield className="w-5 h-5 text-blue-500" />
                  </div>
                  <div className="space-y-2">
                    <h4 className={cn(text('sm', 'base', 'font-semibold'))}>{t('stableWhales')}</h4>
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {t('stableWhalesText')}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Table View */}
      {selectedView === 'table' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Table Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="space-y-1">
                <h3 className={cn(text('lg', 'xl', 'font-semibold'))}>{t('table.title')}</h3>
                <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('table.subtitle')}
                </p>
              </div>

              {/* Controls */}
              <div className="flex flex-col md:flex-row md:items-center gap-2 w-full md:w-auto">
                {/* Time Range - Sentiment-style dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setTableRangeOpen((o) => !o)}
                    className="px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-sm flex items-center gap-2"
                  >
                    {tc(`timeRanges.${selectedRange}`)}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {tableRangeOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-40 rounded-md border border-border/60 bg-background shadow-lg">
                      {(['7d', '30d', '90d', '180d', '1y', 'all'] as TimeRange[]).map((r) => (
                        <button
                          key={r}
                          onClick={() => {
                            setSelectedRange(r);
                            setCurrentPage(1);
                            setTableRangeOpen(false);
                          }}
                          className={cn('w-full text-left px-3 py-2 text-sm hover:bg-muted')}
                        >
                          {tc(`timeRanges.${r}`)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Date Range Picker */}
                <div className="relative">
                  <button
                    onClick={() => setDatePickerOpen((o) => !o)}
                    className="px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-sm flex items-center gap-2"
                  >
                    <Calendar className="w-4 h-4" />
                    {dateFilter.startDate && dateFilter.endDate
                      ? `${dateFilter.startDate} → ${dateFilter.endDate}`
                      : t('table.allDates')}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {datePickerOpen && (
                    <div className="absolute right-0 z-20 mt-2 w-72 rounded-md border border-border/60 bg-background shadow-lg p-3 space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {tc('chart.startDate')}
                        </label>
                        <input
                          type="date"
                          className="w-full px-2 py-1 rounded-md border border-border/50 bg-background"
                          value={tempDateRange.start}
                          onChange={(e) =>
                            setTempDateRange((r) => ({ ...r, start: e.target.value }))
                          }
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">
                          {tc('chart.endDate')}
                        </label>
                        <input
                          type="date"
                          className="w-full px-2 py-1 rounded-md border border-border/50 bg-background"
                          value={tempDateRange.end}
                          onChange={(e) => setTempDateRange((r) => ({ ...r, end: e.target.value }))}
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={clearDateFilter}
                          className="text-xs px-3 py-1.5 rounded-md border border-border/50"
                        >
                          {tc('clear')}
                        </button>
                        <button
                          onClick={applyDateFilter}
                          className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground"
                        >
                          {tc('apply')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Two-category selector (compact popover) */}
                <div className="relative">
                  <button
                    onClick={() => setCompareOpen((o) => !o)}
                    className="px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-sm flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    <span className="hidden sm:inline">{t('table.compare') || 'Compare'}</span>
                    <span className="sm:hidden">2</span>
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {compareOpen && (
                    <div
                      className="absolute right-0 z-20 mt-2 w-64 rounded-md border border-border/60 bg-background shadow-lg p-3"
                      onMouseLeave={() => setCompareOpen(false)}
                    >
                      <div className="text-xs text-muted-foreground mb-2">
                        {t('table.compare') || 'Compare'}:
                        <span className="ml-1 font-medium">
                          {t(selectedCategories[0] as any)} vs {t(selectedCategories[1] as any)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {categoriesList.map((c) => {
                          const selected = selectedCategories.includes(c);
                          return (
                            <button
                              key={`cmp-${c}`}
                              onClick={() => {
                                setSelectedCategories((prev) => {
                                  if (prev.includes(c)) {
                                    const next = prev.filter((x) => x !== c);
                                    if (next.length >= 2) return next.slice(0, 2);
                                    if (next.length === 1) {
                                      const fallback =
                                        categoriesList.find((k) => !next.includes(k)) || 'large';
                                      return [next[0], fallback];
                                    }
                                    return ['micro', 'large'];
                                  }
                                  if (prev.length === 2) return [prev[1], c];
                                  const candidate = [...prev, c];
                                  if (candidate.length === 2) return candidate as CategoryKey[];
                                  const auto =
                                    categoriesList.find((k) => !candidate.includes(k)) || 'large';
                                  return [candidate[0] as CategoryKey, auto as CategoryKey];
                                });
                              }}
                              className={cn(
                                'px-2 py-1 rounded-md text-xs border',
                                selected
                                  ? 'bg-primary/10 border-primary text-primary'
                                  : 'hover:bg-muted',
                              )}
                            >
                              {t(c as any)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Page Size */}
                <div className="relative md:ml-auto">
                  <button
                    onClick={() => setPageSizeOpen(!pageSizeOpen)}
                    className={cn(
                      'flex items-center gap-1 px-3 py-2 bg-background/80 backdrop-blur-sm border border-border/50 rounded-lg shadow-sm',
                      'hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all',
                      text('xs', 'sm'),
                    )}
                  >
                    {tc('table.pageSize')}: {pageSize}
                    <ChevronDown className="w-3 h-3" />
                  </button>
                  {pageSizeOpen && (
                    <div className="absolute top-full mt-1 right-0 bg-background/95 backdrop-blur-sm border border-border/50 rounded-lg shadow-xl z-10">
                      {[10, 20, 50, 100].map((size) => (
                        <button
                          key={size}
                          onClick={() => {
                            setPageSize(size);
                            setCurrentPage(1);
                            setPageSizeOpen(false);
                          }}
                          className={cn(
                            'block w-full px-3 py-2 text-left hover:bg-primary/10 transition-colors',
                            text('xs', 'sm'),
                          )}
                        >
                          {size} rows
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile Cards (Hidden on Desktop) */}
            <div className="lg:hidden space-y-3">
              {tableLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, idx) => (
                    <div key={idx} className="bg-muted/50 rounded-xl p-4 animate-pulse">
                      <div className="h-4 bg-muted rounded mb-2" />
                      <div className="h-3 bg-muted rounded w-3/4" />
                    </div>
                  ))}
                </div>
              ) : (
                (() => {
                  const rows = Array.isArray((tableData as any)?.table?.rows?.rows)
                    ? (tableData as any).table.rows.rows
                    : Array.isArray((tableData as any)?.table?.rows)
                      ? (tableData as any).table.rows
                      : [];
                  return rows && rows.length > 0 ? (
                    rows.map((row: any, index: number) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="bg-background/50 backdrop-blur-sm border border-border/50 rounded-xl p-4"
                      >
                        <div className="space-y-3">
                          <div className="flex justify-between items-start">
                            <div className="space-y-1">
                              <p className={cn(text('sm', 'base', 'font-medium'))}>
                                {row.date?.display || 'N/A'}
                              </p>
                              <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {row.date?.relative || ''}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className={cn(text('sm', 'base', 'font-semibold'))}>
                                {row.totalHolders?.display || '0'}
                              </p>
                              <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('totalWallets')}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border/50">
                            {selectedCategories.map((cat) => (
                              <div key={`m-${cat}`} className="text-center">
                                <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-1')}>
                                  {t(cat as any)}
                                </p>
                                <p className={cn(text('sm', 'base', 'font-medium'))}>
                                  {row.display?.[cat] || '0'}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="bg-muted/20 rounded-xl p-8 text-center">
                      <Table className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className={cn(text('sm', 'base'), 'text-muted-foreground')}>
                        {t('table.noData')}
                      </p>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Desktop Table (Hidden on Mobile) */}
            <div className="hidden lg:block relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-background/90 border backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-10" />

              <div className="relative">
                {tableLoading ? (
                  <div className="p-8">
                    <div className="animate-pulse space-y-4">
                      {[...Array(8)].map((_, idx) => (
                        <div key={idx} className="flex justify-between">
                          <div className="h-4 bg-muted rounded w-1/4" />
                          <div className="h-4 bg-muted rounded w-1/6" />
                          <div className="h-4 bg-muted rounded w-1/6" />
                          <div className="h-4 bg-muted rounded w-1/6" />
                          <div className="h-4 bg-muted rounded w-1/6" />
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  (() => {
                    const rows = Array.isArray((tableData as any)?.table?.rows?.rows)
                      ? (tableData as any).table.rows.rows
                      : Array.isArray((tableData as any)?.table?.rows)
                        ? (tableData as any).table.rows
                        : [];
                    return rows && rows.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-border/50 bg-muted/20">
                              <th
                                onClick={() => handleSort('date')}
                                className={cn(
                                  'px-4 sm:px-6 py-4 text-left font-medium cursor-pointer select-none',
                                  text('xs', 'sm'),
                                )}
                              >
                                <div className="inline-flex items-center gap-1">
                                  {tc('date')}
                                  <span className="text-muted-foreground">
                                    {sortField === 'date' ? (sortOrder === 'ASC' ? '↑' : '↓') : ''}
                                  </span>
                                </div>
                              </th>
                              <th
                                onClick={() => handleSort('total')}
                                className={cn(
                                  'px-4 sm:px-6 py-4 text-right font-medium cursor-pointer select-none',
                                  text('xs', 'sm'),
                                )}
                              >
                                <div className="inline-flex items-center gap-1">
                                  {t('totalWallets')}
                                  <span className="text-muted-foreground">
                                    {sortField === 'total' ? (sortOrder === 'ASC' ? '↑' : '↓') : ''}
                                  </span>
                                </div>
                              </th>
                              {selectedCategories.map((cat) => (
                                <th
                                  key={`th-${cat}`}
                                  onClick={() => handleSort(cat)}
                                  className={cn(
                                    'px-4 sm:px-6 py-4 text-right font-medium cursor-pointer select-none',
                                    text('xs', 'sm'),
                                  )}
                                >
                                  <div className="inline-flex items-center gap-1">
                                    {t(cat as any)}
                                    <span className="text-muted-foreground">
                                      {sortField === cat ? (sortOrder === 'ASC' ? '↑' : '↓') : ''}
                                    </span>
                                  </div>
                                </th>
                              ))}
                              <th
                                className={cn(
                                  'px-4 sm:px-6 py-4 text-right font-medium',
                                  text('xs', 'sm'),
                                )}
                              >
                                {t('distributionHealth')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row: any, index: number) => (
                              <motion.tr
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                                className="border-b border-border/30 hover:bg-muted/10 transition-colors"
                              >
                                <td className={cn('px-4 sm:px-6 py-4', text('xs', 'sm'))}>
                                  <div className="space-y-1">
                                    <div className="font-medium">{row?.date?.display || '-'}</div>
                                    <div className="text-muted-foreground">
                                      {row?.date?.relative || ''}
                                    </div>
                                  </div>
                                </td>
                                <td
                                  className={cn('px-4 sm:px-6 py-4 text-right', text('xs', 'sm'))}
                                >
                                  {row?.totalHolders?.display || '0'}
                                </td>
                                {selectedCategories.map((cat) => (
                                  <td
                                    key={`td-${cat}`}
                                    className={cn('px-4 sm:px-6 py-4 text-right', text('xs', 'sm'))}
                                  >
                                    {row?.display?.[cat] || '0'}
                                  </td>
                                ))}
                                <td
                                  className={cn('px-4 sm:px-6 py-4 text-right', text('xs', 'sm'))}
                                >
                                  {`${fmt1(row?.concentration?.whales?.percentage)}% ${t('whales')}`}
                                </td>
                              </motion.tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="p-12 text-center">
                        <Table className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                        <h4 className={cn(text('base', 'lg', 'font-semibold'), 'mb-2')}>
                          {t('noDataAvailable')}
                        </h4>
                        <p className={cn(text('sm', 'base'), 'text-muted-foreground')}>
                          {t('table.noData')}
                        </p>
                      </div>
                    );
                  })()
                )}

                {/* Pagination */}
                {(() => {
                  const pagination =
                    (tableData as any)?.pagination || (tableData as any)?.table?.columns;
                  const totalPages = pagination?.totalPages ?? 0;
                  return totalPages > 1;
                })() && (
                  <div className="border-t border-border/50 bg-muted/10 px-4 sm:px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                        {(() => {
                          const pagination =
                            (tableData as any)?.pagination ||
                            (tableData as any)?.table?.columns ||
                            {};
                          const total = pagination.total ?? 0;
                          const page = pagination.page ?? currentPage;
                          const limit = pagination.limit ?? pageSize;
                          const from = total === 0 ? 0 : (page - 1) * limit + 1;
                          const to = Math.min(page * limit, total);
                          return `${tc('showing')} ${from} ${tc('to')} ${to} ${tc('of')} ${total}`;
                        })()}
                      </div>

                      <div className="flex items-center gap-2">
                        {(() => {
                          const pagination =
                            (tableData as any)?.pagination ||
                            (tableData as any)?.table?.columns ||
                            {};
                          const hasPrev = !!pagination.hasPrev;
                          const hasNext = !!pagination.hasNext;
                          const totalPages = pagination.totalPages ?? 1;
                          const page = pagination.page ?? currentPage;
                          return (
                            <>
                              <button
                                className={cn(
                                  'px-3 py-1.5 rounded-md border',
                                  hasPrev
                                    ? 'border-border/50 hover:bg-muted/50'
                                    : 'border-border/30 text-muted-foreground cursor-not-allowed',
                                )}
                                disabled={!hasPrev}
                                onClick={() => hasPrev && setCurrentPage((p) => Math.max(1, p - 1))}
                              >
                                {tc('table.previous')}
                              </button>
                              <span
                                className={cn(text('xs', 'sm'), 'text-muted-foreground')}
                              >{`${tc('page')} ${page} ${tc('of')} ${totalPages}`}</span>
                              <button
                                className={cn(
                                  'px-3 py-1.5 rounded-md border',
                                  hasNext
                                    ? 'border-border/50 hover:bg-muted/50'
                                    : 'border-border/30 text-muted-foreground cursor-not-allowed',
                                )}
                                disabled={!hasNext}
                                onClick={() => hasNext && setCurrentPage((p) => p + 1)}
                              >
                                {tc('table.next')}
                              </button>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Stats View */}
      {selectedView === 'stats' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Stats Header */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
              <div className="space-y-1">
                <h3 className={cn(text('lg', 'xl', 'font-semibold'))}>{t('stats.title')}</h3>
                <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                  {t('stats.subtitle')}
                </p>
              </div>

              {/* Time Range Selector - Sentiment-style dropdown */}
              <div className="relative">
                <button
                  onClick={() => setStatsRangeOpen((o) => !o)}
                  className="px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-sm flex items-center gap-2"
                >
                  {tc(`timeRanges.${selectedRange}`)}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {statsRangeOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-40 rounded-md border border-border/60 bg-background shadow-lg">
                    {(['7d', '30d', '90d', '180d', '1y', 'all'] as TimeRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setSelectedRange(r);
                          setStatsRangeOpen(false);
                        }}
                        className={cn('w-full text-left px-3 py-2 text-sm hover:bg-muted')}
                      >
                        {tc(`timeRanges.${r}`)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {statsLoading ? (
              <div className="grid gap-3 grid-cols-2 sm:gap-4 lg:grid-cols-4">
                {[...Array(4)].map((_, idx) => (
                  <div key={idx} className="bg-muted/50 rounded-xl p-4 sm:p-6 animate-pulse">
                    <div className="h-4 bg-muted rounded mb-4" />
                    <div className="h-8 bg-muted rounded mb-2" />
                    <div className="h-3 bg-muted rounded w-3/4" />
                  </div>
                ))}
              </div>
            ) : statsError || !statsData?.success ? (
              <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/5 text-red-500">
                {tc('errors.generic') || 'Failed to load stats'}
              </div>
            ) : (
              (() => {
                const stats = (statsData as DistributionStatsResponse).stats;
                const overview = stats.overview;
                const current = stats.current;
                const historical = stats.historical;
                const movement = stats.movement;
                const whales = stats.whaleBehavior;

                let timeRange = overview?.dataRange?.days;
                try {
                  if (overview?.dataRange?.start && overview?.dataRange?.end) {
                    const start = new Date(overview.dataRange.start);
                    const end = new Date(overview.dataRange.end);
                    const diff = end.getTime() - start.getTime();
                    if (!isNaN(diff) && diff >= 0) {
                      const d = Math.floor(diff / 86400000) + 1;
                      if (d > 0) timeRange = d;
                    }
                  }
                } catch {}
                const totalGrowth = historical.holders.growth;
                const growthRate = parseFloat(historical.holders.growthPercent);
                const volatility = parseFloat(movement.volatility);
                const whalePhase = whales.currentPhase;
                const entropyQuality = current.entropyNormalized ?? 0.5;
                const whaleCount = current.concentration.whales.count;
                const whaleControl = parseFloat(current.concentration.whales.percentage);
                const drawdown = historical.drawdown.currentDrawdown;
                const retailPercentage = parseFloat(current.concentration.retail.percentage);

                const healthScore = Math.max(
                  0,
                  Math.min(
                    100,
                    entropyQuality * 40 +
                      Math.max(0, (5 - volatility) / 5) * 25 +
                      Math.max(0, (100 - whaleControl) / 100) * 20 +
                      (growthRate > 0 ? 15 : Math.max(0, 15 + growthRate)),
                  ),
                );

                const getHealthStatus = (score: number) => {
                  if (score >= 80)
                    return {
                      label: 'Excellent',
                      color: 'text-green-500',
                      bg: 'bg-green-500/10',
                      emoji: '🟢',
                    };
                  if (score >= 60)
                    return {
                      label: 'Good',
                      color: 'text-blue-500',
                      bg: 'bg-blue-500/10',
                      emoji: '🔵',
                    };
                  if (score >= 40)
                    return {
                      label: 'Fair',
                      color: 'text-yellow-500',
                      bg: 'bg-yellow-500/10',
                      emoji: '🟡',
                    };
                  return {
                    label: 'Concerning',
                    color: 'text-red-500',
                    bg: 'bg-red-500/10',
                    emoji: '🔴',
                  };
                };

                const healthStatus = getHealthStatus(healthScore);

                const getVolatilityStatus = (vol: number) => {
                  if (vol < 3)
                    return { label: 'Very Stable', emoji: '🟢', color: 'text-green-500' };
                  if (vol < 6) return { label: 'Stable', emoji: '🟡', color: 'text-yellow-500' };
                  if (vol < 10) return { label: 'Moderate', emoji: '🟠', color: 'text-orange-500' };
                  return { label: 'Volatile', emoji: '🔴', color: 'text-red-500' };
                };

                const volatilityStatus = getVolatilityStatus(volatility);

                const getWhalePhaseDisplay = (phase: string) => {
                  switch (phase) {
                    case 'accumulation':
                      return { label: 'Accumulating', emoji: '🐋⬆️', color: 'text-green-500' };
                    case 'distribution':
                      return { label: 'Distributing', emoji: '🐋⬇️', color: 'text-red-500' };
                    case 'stable':
                      return { label: 'Stable', emoji: '🐋➡️', color: 'text-blue-500' };
                    default:
                      return { label: 'Unknown', emoji: '🐋❓', color: 'text-gray-500' };
                  }
                };

                const whaleDisplay = getWhalePhaseDisplay(whalePhase);

                return (
                  <>
                    {/* Key Insights Dashboard */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl p-4 sm:p-6 border border-primary/20"
                    >
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-primary/10">
                          <Sparkles className="w-6 h-6 text-primary" />
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4">
                            <div>
                              <h4 className={cn(text('base', 'lg', 'font-semibold'))}>
                                Market Health Analysis
                              </h4>
                              <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.basedOnDays', { days: timeRange })} •{' '}
                                {t('stats.lastUpdatedAt', {
                                  time: format(new Date(overview.lastUpdate), 'MMM dd, HH:mm'),
                                })}
                              </p>
                            </div>
                            <div
                              className={cn(
                                'px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2',
                                healthStatus.bg,
                                healthStatus.color,
                              )}
                            >
                              <span>{healthStatus.emoji}</span>
                              <span>
                                Health: {healthStatus.label} ({healthScore.toFixed(0)}/100)
                              </span>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                              <div className="text-2xl">{growthRate >= 0 ? '📈' : '📉'}</div>
                              <div>
                                <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                  Growth Trend
                                </p>
                                <p
                                  className={cn(
                                    text('sm', 'base', 'font-medium'),
                                    growthRate >= 0 ? 'text-green-500' : 'text-red-500',
                                  )}
                                >
                                  {growthRate >= 0 ? '+' : ''}
                                  {growthRate.toFixed(2)}% ({totalGrowth >= 0 ? '+' : ''}
                                  {totalGrowth})
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                              <div className="text-2xl">{whaleDisplay.emoji}</div>
                              <div>
                                <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                  Whale Activity
                                </p>
                                <p
                                  className={cn(
                                    text('sm', 'base', 'font-medium'),
                                    whaleDisplay.color,
                                  )}
                                >
                                  {whaleDisplay.label}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                              <div className="text-2xl">{volatilityStatus.emoji}</div>
                              <div>
                                <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                  {t('stats.marketStability')}
                                </p>
                                <p
                                  className={cn(
                                    text('sm', 'base', 'font-medium'),
                                    volatilityStatus.color,
                                  )}
                                >
                                  {t(
                                    `stats.volatilityLabel.${volatilityStatus.label.toLowerCase().replace(/\s+/g, '')}` as any,
                                    { default: volatilityStatus.label } as any,
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-background/50 rounded-lg">
                              <div className="text-2xl">
                                {drawdown > 200 ? '⚠️' : drawdown > 100 ? '⚡' : '✅'}
                              </div>
                              <div>
                                <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                  {t('stats.peakDistance')}
                                </p>
                                <p
                                  className={cn(
                                    text('sm', 'base', 'font-medium'),
                                    drawdown > 200
                                      ? 'text-red-500'
                                      : drawdown > 100
                                        ? 'text-yellow-500'
                                        : 'text-green-500',
                                  )}
                                >
                                  -{drawdown} {t('stats.fromPeak')}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>

                    {/* Market Momentum Analysis */}
                    <div className="grid gap-4 lg:grid-cols-2">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="bg-background/50 rounded-xl p-4 sm:p-6 border border-border/50"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <TrendingUp className="w-5 h-5 text-green-500" />
                          <h4 className={cn(text('sm', 'base', 'font-semibold'))}>
                            {t('stats.marketMomentum')}
                          </h4>
                        </div>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 rounded-lg bg-muted/20">
                              <div
                                className={cn(
                                  text('xl', '2xl', 'font-bold'),
                                  growthRate >= 0 ? 'text-green-500' : 'text-red-500',
                                )}
                              >
                                {growthRate >= 0 ? '+' : ''}
                                {growthRate.toFixed(2)}%
                              </div>
                              <div className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.growthRate')}
                              </div>
                              <div className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                {timeRange} days
                              </div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-muted/20">
                              <div className={cn(text('xl', '2xl', 'font-bold'))}>
                                {formatValue(historical.holders.max)}
                              </div>
                              <div className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.peakHolders')}
                              </div>
                              <div className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                {selectedRange === 'all'
                                  ? t('stats.peakHoldersScopeAll')
                                  : t('stats.peakHoldersScopeRange')}
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.largestDailyGain')}
                              </span>
                              <span
                                className={cn(text('xs', 'sm', 'font-medium'), 'text-green-500')}
                              >
                                +{formatValue(movement.largestIncrease.value)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.largestDailyLoss')}
                              </span>
                              <span className={cn(text('xs', 'sm', 'font-medium'), 'text-red-500')}>
                                {`-${formatValue(Math.abs(movement.largestDecrease.value || 0))}`}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.currentVsStart')}
                              </span>
                              <span className={cn(text('xs', 'sm', 'font-medium'))}>
                                {formatValue(historical.holders.start)} →{' '}
                                {formatValue(historical.holders.end)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      {/* Whale Behavior Analysis */}
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.3 }}
                        className="bg-background/50 rounded-xl p-4 sm:p-6 border border-border/50"
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <Wallet className="w-5 h-5 text-purple-500" />
                          <h4 className={cn(text('sm', 'base', 'font-semibold'))}>
                            {t('stats.whaleBehaviorAnalysis')}
                          </h4>
                        </div>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="text-center p-3 rounded-lg bg-muted/20">
                              <div
                                className={cn(text('xl', '2xl', 'font-bold'), 'text-purple-500')}
                              >
                                {whaleCount}
                              </div>
                              <div className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.activeWhales')}
                              </div>
                              <div className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                50K+ tokens
                              </div>
                            </div>
                            <div className="text-center p-3 rounded-lg bg-muted/20">
                              <div className={cn(text('xl', '2xl', 'font-bold'))}>
                                {whaleControl.toFixed(2)}%
                              </div>
                              <div className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.marketControl')}
                              </div>
                              <div className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                Supply %
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.avgWhaleCount')}
                              </span>
                              <span className={cn(text('xs', 'sm', 'font-medium'))}>
                                {formatValue(whales.averageWhaleCount)}
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.whaleGrowth')}
                              </span>
                              <span
                                className={cn(
                                  text('xs', 'sm', 'font-medium'),
                                  whales.whaleGrowth >= 0 ? 'text-green-500' : 'text-red-500',
                                )}
                              >
                                {whales.whaleGrowth >= 0 ? '+' : ''}
                                {whales.whaleGrowth} ({whales.whaleGrowthPercent >= 0 ? '+' : ''}
                                {whales.whaleGrowthPercent.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                {t('stats.currentPhase')}
                              </span>
                              <span
                                className={cn(
                                  text('xs', 'sm', 'font-medium'),
                                  whaleDisplay.color,
                                  'capitalize',
                                )}
                              >
                                {whaleDisplay.label}
                              </span>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    </div>

                    {/* Distribution Quality & Stability */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="bg-background/50 rounded-xl p-4 sm:p-6 border border-border/50"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <Brain className="w-5 h-5 text-emerald-500" />
                        <h4 className={cn(text('sm', 'base', 'font-semibold'))}>
                          {t('stats.distributionQualityStability')}
                        </h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="text-center p-4 rounded-lg bg-muted/20">
                          <div className={cn(text('2xl', '3xl', 'font-bold'), 'text-emerald-500')}>
                            {(entropyQuality * 100).toFixed(0)}%
                          </div>
                          <div className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('stats.distributionQuality')}
                          </div>
                          <div className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                            {entropyQuality >= 0.7
                              ? 'Excellent'
                              : entropyQuality >= 0.5
                                ? 'Good'
                                : 'Fair'}
                          </div>
                        </div>

                        <div className="text-center p-4 rounded-lg bg-muted/20">
                          <div
                            className={cn(text('2xl', '3xl', 'font-bold'), volatilityStatus.color)}
                          >
                            {volatility.toFixed(1)}
                          </div>
                          <div className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('stats.volatilityScore')}
                          </div>
                          <div className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                            {volatilityStatus.label}
                          </div>
                        </div>

                        <div className="text-center p-4 rounded-lg bg-muted/20">
                          <div
                            className={cn(
                              text('2xl', '3xl', 'font-bold'),
                              retailPercentage >= 80 ? 'text-green-500' : 'text-yellow-500',
                            )}
                          >
                            {retailPercentage.toFixed(1)}%
                          </div>
                          <div className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('stats.retailOwnership')}
                          </div>
                          <div className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                            {formatValue(current.concentration.retail.count)} holders
                          </div>
                        </div>

                        <div className="text-center p-4 rounded-lg bg-muted/20">
                          <div
                            className={cn(
                              text('2xl', '3xl', 'font-bold'),
                              historical.dataPoints >= 1000 ? 'text-green-500' : 'text-yellow-500',
                            )}
                          >
                            {formatValue(historical.dataPoints)}
                          </div>
                          <div className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {tc('dataPoints')}
                          </div>
                          <div className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                            {timeRange} day window
                          </div>
                        </div>
                      </div>

                      {/* Quick Insights (Refactored) */}
                      {(() => {
                        const fmtPct = (v: number) => `${v.toFixed(2)}%`;
                        const fmtPP = (v: number | null) =>
                          v === null ? '—' : `${v.toFixed(2)}${t('stats.insights.pp')}`;
                        const fmtGrowth = (v: number) =>
                          `${v >= 0 ? '+' : '-'}${Math.abs(v).toFixed(2)}%`;
                        const volatilityLabel =
                          volatility < 3
                            ? t('stats.insights.veryStable')
                            : volatility < 6
                              ? t('stats.insights.stable')
                              : t('stats.insights.volatile');
                        const maturityLabel =
                          entropyQuality > 0.6
                            ? t('stats.insights.mature')
                            : entropyQuality > 0.4
                              ? t('stats.insights.developing')
                              : t('stats.insights.early');
                        const growthLabel =
                          Math.abs(growthRate) < 2
                            ? t('stats.insights.sustainable')
                            : Math.abs(growthRate) < 5
                              ? t('stats.insights.moderate')
                              : t('stats.insights.rapid');
                        const decentralizationLabel =
                          whaleControl < 1
                            ? t('stats.insights.excellent')
                            : whaleControl < 3
                              ? t('stats.insights.good')
                              : t('stats.insights.concerning');
                        const startH = historical?.holders?.start || 0;
                        const endH = historical?.holders?.end || 0;
                        const days = Number(timeRange) || 1;
                        const avgDailyGrowthRaw = days > 1 ? (endH - startH) / (days - 1) : 0;
                        const avgDailyGrowth = Number(avgDailyGrowthRaw.toFixed(2));
                        const whaleDelta: number | null = null;
                        const retailDelta: number | null = null;
                        const churnRate = (() => {
                          const inc = movement?.largestIncrease?.value || 0;
                          const dec = Math.abs(movement?.largestDecrease?.value || 0);
                          const base = Math.max(startH, endH, 1);
                          return ((inc + dec) / base) * 100;
                        })();
                        const stabilityIndex = Math.max(0, 100 - volatility * 8);
                        const stabilityColor =
                          stabilityIndex >= 70
                            ? 'bg-green-500'
                            : stabilityIndex >= 50
                              ? 'bg-yellow-500'
                              : 'bg-red-500';
                        return (
                          <div className="mt-6 rounded-2xl border border-border/60 overflow-hidden">
                            <div className="px-4 py-3 flex items-center gap-2 bg-gradient-to-r from-primary/10 to-primary/5">
                              <Sparkles className="w-4 h-4 text-primary" />
                              <h5 className={cn(text('sm', 'base', 'font-semibold'))}>
                                {t('stats.insights.title')}
                              </h5>
                            </div>
                            <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                              {/* Column 1 */}
                              <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={cn(
                                        text('2xs', 'xs'),
                                        'uppercase tracking-wide text-muted-foreground',
                                      )}
                                    >
                                      {t('stats.insights.decentralization')}
                                    </span>
                                    <span className="text-xs font-medium">
                                      {fmtPct(whaleControl)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                      {whaleControl < 1 ? '🟢' : whaleControl < 3 ? '🟡' : '🔴'}
                                    </span>
                                    <span className={cn(text('xs', 'sm'), 'font-medium')}>
                                      {decentralizationLabel}
                                    </span>
                                  </div>
                                  <p
                                    className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-1')}
                                  >
                                    {t('stats.marketControl')} {fmtPct(whaleControl)}
                                  </p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={cn(
                                        text('2xs', 'xs'),
                                        'uppercase tracking-wide text-muted-foreground',
                                      )}
                                    >
                                      {t('stats.insights.growth')}
                                    </span>
                                    <span className="text-xs font-medium">
                                      {fmtGrowth(growthRate)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                      {Math.abs(growthRate) < 2
                                        ? '🟢'
                                        : Math.abs(growthRate) < 5
                                          ? '🟡'
                                          : '🔴'}
                                    </span>
                                    <span className={cn(text('xs', 'sm'), 'font-medium')}>
                                      {growthLabel}
                                    </span>
                                  </div>
                                  <p
                                    className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-1')}
                                  >
                                    {t('stats.avgDailyGrowth')}: {avgDailyGrowth.toFixed(2)}{' '}
                                    {t('stats.insights.holdersPerDay')}
                                  </p>
                                </div>
                              </div>
                              {/* Column 2 */}
                              <div className="space-y-3">
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={cn(
                                        text('2xs', 'xs'),
                                        'uppercase tracking-wide text-muted-foreground',
                                      )}
                                    >
                                      {t('stats.insights.maturity')}
                                    </span>
                                    <span className="text-xs font-medium">
                                      {(entropyQuality * 100).toFixed(0)}%
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                      {entropyQuality > 0.6
                                        ? '🟢'
                                        : entropyQuality > 0.4
                                          ? '🟡'
                                          : '🔴'}
                                    </span>
                                    <span className={cn(text('xs', 'sm'), 'font-medium')}>
                                      {maturityLabel}
                                    </span>
                                  </div>
                                  <p
                                    className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-1')}
                                  >
                                    {t('stats.distributionQuality')}
                                  </p>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={cn(
                                        text('2xs', 'xs'),
                                        'uppercase tracking-wide text-muted-foreground',
                                      )}
                                    >
                                      {t('stats.insights.stability')}
                                    </span>
                                    <span className="text-xs font-medium">
                                      {volatility.toFixed(1)}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                      {volatility < 3 ? '🟢' : volatility < 6 ? '🟡' : '🔴'}
                                    </span>
                                    <span className={cn(text('xs', 'sm'), 'font-medium')}>
                                      {volatilityLabel}
                                    </span>
                                  </div>
                                  <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
                                    <div
                                      className={cn('h-full transition-all', stabilityColor)}
                                      style={{ width: `${stabilityIndex}%` }}
                                    />
                                  </div>
                                  <p
                                    className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-1')}
                                  >
                                    {t('stats.stabilityIndex')}: {stabilityIndex.toFixed(1)}
                                  </p>
                                </div>
                              </div>
                              {/* Column 3 */}
                              <div className="space-y-3">
                                {/* Removed whale/retail delta cards until backend supplies historical concentration start/end */}
                                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                                  <div className="flex items-center justify-between mb-1">
                                    <span
                                      className={cn(
                                        text('2xs', 'xs'),
                                        'uppercase tracking-wide text-muted-foreground',
                                      )}
                                    >
                                      {t('stats.churnRate')}
                                    </span>
                                    <span className="text-xs font-medium">{fmtPct(churnRate)}</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg">
                                      {churnRate < 1 ? '🟢' : churnRate < 3 ? '🟡' : '🔴'}
                                    </span>
                                    <span className={cn(text('xs', 'sm'), 'font-medium')}>
                                      {churnRate < 1
                                        ? t('stats.insights.excellent')
                                        : churnRate < 3
                                          ? t('stats.insights.moderate')
                                          : t('stats.insights.concerning')}
                                    </span>
                                  </div>
                                  <p
                                    className={cn(text('2xs', 'xs'), 'text-muted-foreground mt-1')}
                                  >
                                    {t('stats.holderTurnover')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </motion.div>
                  </>
                );
              })()
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
