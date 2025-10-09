'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  ChevronDown,
  Download,
  Info,
  Calendar,
  BarChart3,
  Activity,
  Brain,
  Zap,
  Shield,
  ChevronRight,
  Eye,
  LineChart,
  Table,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Cpu,
  Timer,
  Rocket,
  DollarSign,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Award,
  Layers,
  Clock,
} from 'lucide-react';
import { cn, getDateLocale, formatCurrency, formatPercentage } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { apiClient, ForecastRange } from '@/lib/api/client';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  BarChart,
  Bar,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
  PolarAngleAxis,
  Scatter,
  ScatterChart,
} from 'recharts';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';

interface ForecastSectionProps {
  mounted: boolean;
}

type ViewType = 'overview' | 'chart' | 'table' | 'stats';

const CONFIDENCE_GRADIENTS = {
  veryHigh: 'from-emerald-500 to-teal-400',
  high: 'from-green-500 to-emerald-400',
  medium: 'from-amber-500 to-yellow-400',
  low: 'from-orange-500 to-amber-400',
  veryLow: 'from-red-500 to-rose-400',
};

const TREND_COLORS = {
  bullish: '#10b981',
  bearish: '#ef4444',
  neutral: '#6b7280',
};

export function ForecastSection({ mounted }: ForecastSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('price.forecast');
  const tt = useTranslations('price.forecast.tooltips');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [selectedView, setSelectedView] = useState<ViewType>('overview');
  const [selectedRange, setSelectedRange] = useState<ForecastRange>('3m');
  const [showConfidenceBands, setShowConfidenceBands] = useState(true);

  const [chartInterval, setChartInterval] = useState<string>('1d');
  const [chartModel, setChartModel] = useState<string>('linear');
  const [forecastDays, setForecastDays] = useState<number>(30);

  const [selectedStatsRange, setSelectedStatsRange] = useState<ForecastRange>('1m');

  const [tablePage, setTablePage] = useState<number>(1);
  const [tableLimit, setTableLimit] = useState<number>(20);
  const [tableSortBy, setTableSortBy] = useState<string>('date');
  const [tableSortOrder, setTableSortOrder] = useState<'ASC' | 'DESC'>('DESC');
  const [tableStartDate, setTableStartDate] = useState<string>('');
  const [tableEndDate, setTableEndDate] = useState<string>('');

  const [statsRangeOpen, setStatsRangeOpen] = useState(false);
  const [pageSizeOpen, setPageSizeOpen] = useState(false);

  const toApiDate = (d?: string) => {
    if (!d) return undefined as unknown as string | undefined;
    const [yyyy, mm, dd] = d.split('-');
    if (!yyyy || !mm || !dd) return undefined as unknown as string | undefined;
    return `${dd}/${mm}/${yyyy}`;
  };

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: [
      'forecast-chart',
      { selectedRange, chartInterval, chartModel, forecastDays, showConfidenceBands },
    ],
    queryFn: () =>
      apiClient.getForecastChartData({
        range: selectedRange,
        interval: chartInterval,
        includeHistorical: true,
        indicators: showConfidenceBands,
        model: chartModel as any,
        forecastDays: forecastDays as any,
      } as any),
    enabled: mounted && (selectedView === 'chart' || selectedView === 'overview'),
    staleTime: 300000,
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: [
      'forecast-table',
      {
        page: tablePage,
        limit: tableLimit,
        sortBy: tableSortBy,
        sortOrder: tableSortOrder,
        startDate: tableStartDate,
        endDate: tableEndDate,
      },
    ],
    queryFn: () =>
      apiClient.getForecastTableData({
        page: tablePage,
        limit: tableLimit,
        sortBy: tableSortBy,
        sortOrder: tableSortOrder,
        startDate: toApiDate(tableStartDate),
        endDate: toApiDate(tableEndDate),
      }),
    enabled: mounted && selectedView === 'table',
    staleTime: 300000,
  });

  const statsApiRange = (() => {
    switch (selectedStatsRange) {
      case '1m':
        return '30d';
      case '3m':
        return '90d';
      case '6m':
        return '180d';
      default:
        return selectedStatsRange;
    }
  })();

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['forecast-stats', statsApiRange],
    queryFn: () => apiClient.getForecastStats({ range: statsApiRange as any }),
    enabled: mounted && (selectedView === 'overview' || selectedView === 'stats'),
    staleTime: 300000,
  });

  const { data: widgetData, isLoading: widgetLoading } = useQuery({
    queryKey: ['forecast-widget'],
    queryFn: () => apiClient.getForecastWidgetData(),
    enabled: mounted,
    staleTime: 60000,
  });

  const widget = widgetData?.widget;
  const currentPrice = widget?.current?.price || 0;

  const formatPrice = (value: number | string) => {
    const numValue = typeof value === 'string' ? parseFloat(value) : value;
    if (isNaN(numValue)) return tc('na');
    const decimals = numValue < 1 ? 4 : 2;
    return `$${numValue.toFixed(decimals)}`;
  };

  const getConfidenceLevel = (accuracy: number) => {
    if (accuracy >= 90) return 'veryHigh' as const;
    if (accuracy >= 75) return 'high' as const;
    if (accuracy >= 60) return 'medium' as const;
    if (accuracy >= 45) return 'low' as const;
    return 'veryLow' as const;
  };

  const confidenceLevel = getConfidenceLevel(widget?.accuracy?.overall || 0);
  const widgetAny = widget as any;
  const trendDirection = (() => {
    const statsTrend = (statsData as any)?.stats?.technical?.trend?.direction as string | undefined;
    const fallback = String(widgetAny?.signals?.trend || '');
    const raw = (statsTrend || fallback).toLowerCase();
    if (raw.includes('bull')) return 'bullish' as const;
    if (raw.includes('bear')) return 'bearish' as const;
    if (raw.includes('up')) return 'bullish' as const;
    if (raw.includes('down')) return 'bearish' as const;
    return 'neutral' as const;
  })();

  const views = [
    { id: 'overview' as ViewType, label: t('viewOverview'), icon: Eye },
    { id: 'chart' as ViewType, label: t('viewChart'), icon: LineChart },
    { id: 'table' as ViewType, label: t('viewTable'), icon: Table },
    { id: 'stats' as ViewType, label: t('viewStats', { fallback: 'Stats' as any }), icon: Award },
  ];

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Animated Gradient */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-lg border border-primary/10 shadow-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50 animate-pulse" />
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="relative p-4 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur-sm shadow-lg">
                  <Rocket className="w-6 h-6 sm:w-7 sm:h-7 text-primary" />
                </div>
                <h2
                  className={cn(
                    text('xl', '3xl', 'font-bold'),
                    'bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent',
                  )}
                >
                  {t('title')}
                </h2>
              </div>
              <p className={cn(text('sm', 'base'), 'text-muted-foreground max-w-xl')}>
                {t('subtitle')}
              </p>
            </div>

            {/* Enhanced View Selector */}
            <div className="flex items-center gap-2 p-1.5 bg-background/60 backdrop-blur-xl rounded-2xl border border-border/50 shadow-lg">
              {views.map((view) => {
                const Icon = view.icon;
                return (
                  <motion.button
                    key={view.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedView(view.id)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-300',
                      text('xs', 'sm'),
                      selectedView === view.id
                        ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{view.label}</span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-amber-900 shadow-sm dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p className={cn(text('xs', 'sm'), 'leading-snug')}>{t('deprecatedNotice')}</p>
      </div>

      {/* Overview View */}
      {selectedView === 'overview' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Enhanced Key Forecast Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-6">
              {[
                {
                  label: t('next24Hours'),
                  value: widget?.forecast?.day1?.price,
                  display: (widget as any)?.forecast?.day1?.priceDisplay,
                  change: widget?.forecast?.day1?.change,
                  icon: Clock,
                  gradient:
                    (widget?.forecast?.day1?.change ?? 0) >= 0
                      ? 'from-emerald-500 to-green-400'
                      : 'from-red-500 to-rose-400',
                },
                {
                  label: t('nextWeek'),
                  value: widget?.forecast?.day7?.price,
                  display: (widget as any)?.forecast?.day7?.priceDisplay,
                  change: widget?.forecast?.day7?.change,
                  icon: Calendar,
                  gradient:
                    (widget?.forecast?.day7?.change ?? 0) >= 0
                      ? 'from-emerald-500 to-green-400'
                      : 'from-red-500 to-rose-400',
                },
                {
                  label: t('nextMonth'),
                  value: widget?.forecast?.day30?.price,
                  display: (widget as any)?.forecast?.day30?.priceDisplay,
                  change: widget?.forecast?.day30?.change,
                  icon: TrendingUp,
                  gradient:
                    (widget?.forecast?.day30?.change ?? 0) >= 0
                      ? 'from-emerald-500 to-green-400'
                      : 'from-red-500 to-rose-400',
                },
                {
                  label: (
                    <span className="inline-flex items-center gap-1">
                      {t('confidence')}
                      <UiTooltip
                        trigger="click"
                        content={
                          <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                            {tt('accuracy')}
                          </span>
                        }
                      >
                        <Info className="w-3 h-3 text-muted-foreground/80" />
                      </UiTooltip>
                    </span>
                  ) as unknown as string,
                  value: widget?.accuracy?.overall,
                  unit: '%',
                  icon: Shield,
                  gradient: CONFIDENCE_GRADIENTS[confidenceLevel],
                },
              ].map((card, idx) => {
                const Icon = card.icon;
                const isPositive = (card.change || 0) >= 0;

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                    whileHover={{ y: -4, transition: { duration: 0.2 } }}
                    className="relative group"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-transparent rounded-3xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-0 group-hover:opacity-100" />
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background to-background/80 backdrop-blur-xl border border-white/10 shadow-lg group-hover:shadow-2xl transition-all duration-300 h-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent" />
                      <div className="relative p-4 lg:p-6 space-y-3 lg:space-y-4 h-full flex flex-col">
                        <div className="flex items-center justify-between">
                          <div
                            className={cn(
                              'p-2.5 lg:p-3 rounded-2xl bg-gradient-to-br shadow-lg',
                              card.gradient,
                            )}
                          >
                            <Icon className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                          </div>
                          {card.change !== undefined && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              transition={{ delay: 0.3 + idx * 0.1 }}
                              className={cn(
                                'flex items-center gap-1 px-2 lg:px-2.5 py-1 lg:py-1.5 rounded-full text-xs font-semibold',
                                isPositive
                                  ? 'bg-emerald-500/10 text-emerald-500'
                                  : 'bg-red-500/10 text-red-500',
                              )}
                            >
                              {isPositive ? (
                                <ArrowUpRight className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                              ) : (
                                <ArrowDownRight className="w-3 h-3 lg:w-3.5 lg:h-3.5" />
                              )}
                              {Math.abs(card.change).toFixed(2)}%
                            </motion.div>
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-center">
                          <p
                            className={cn(
                              text('xs', 'sm'),
                              'text-muted-foreground/70 font-medium mb-1 lg:mb-1.5 flex items-center gap-1',
                            )}
                          >
                            {card.label as any}
                          </p>
                          <p
                            className={cn(
                              text('lg', '2xl', 'font-bold'),
                              'bg-gradient-to-br text-transparent bg-clip-text leading-tight',
                              card.gradient,
                            )}
                          >
                            {card.value !== undefined && card.value !== null
                              ? card.unit
                                ? `${Number(card.value).toFixed(0)}${card.unit}`
                                : ((card as any).display ?? formatPrice(card.value as number))
                              : tc('na')}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Enhanced Main Forecast Visualization */}
            <div className="grid lg:grid-cols-3 gap-4 lg:gap-6">
              {/* Enhanced Forecast Chart Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-background via-background/90 to-background/80 backdrop-blur-2xl border border-white/10 shadow-xl lg:col-span-2"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
                <div className="relative p-4 lg:p-6">
                  <h3
                    className={cn(
                      text('base', 'lg', 'font-semibold'),
                      'mb-3 lg:mb-4 flex items-center gap-2',
                    )}
                  >
                    <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-blue-400/10">
                      <LineChart className="w-4 h-4 lg:w-5 lg:h-5 text-blue-500" />
                    </div>
                    {t('priceProjection')}
                    <UiTooltip
                      trigger="click"
                      content={
                        <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                          {tt('confidenceBands')}
                        </span>
                      }
                    >
                      <Info className="w-3 h-3 text-muted-foreground/80" />
                    </UiTooltip>
                  </h3>

                  {chartLoading ? (
                    <div className="h-64 flex items-center justify-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                        <span className="text-muted-foreground text-sm">{tc('loading')}</span>
                      </div>
                    </div>
                  ) : chartData?.chart?.data ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <ComposedChart
                        data={chartData.chart.data}
                        margin={{ top: 8, right: 4, left: 4, bottom: 8 }}
                      >
                        <defs>
                          <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="historicalGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                          </linearGradient>
                        </defs>

                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                        <XAxis
                          dataKey={(item: any) => item?.timestamp || item?.date}
                          tickFormatter={(value: any) =>
                            format(new Date(value), 'MMM dd', { locale: getDateLocale(locale) })
                          }
                          className="text-xs"
                        />
                        <YAxis
                          domain={['auto', 'auto']}
                          tickFormatter={(value) => `$${value.toFixed(2)}`}
                          className="text-xs"
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--background))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '12px',
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)',
                          }}
                          formatter={(value: any, name: string) => [
                            formatPrice(value),
                            name === 'historical' ? tc('historical') : t('forecast'),
                          ]}
                          labelFormatter={(value: any) =>
                            format(new Date(value), 'PPP', { locale: getDateLocale(locale) })
                          }
                        />

                        <ReferenceLine
                          y={currentPrice}
                          stroke="hsl(var(--foreground))"
                          strokeDasharray="5 5"
                          opacity={0.5}
                        />

                        <Area
                          type="monotone"
                          dataKey={(item: any) => (item.type === 'historical' ? item.price : null)}
                          stroke="#3b82f6"
                          strokeWidth={2.5}
                          fill="url(#historicalGradient)"
                          connectNulls
                        />

                        <Area
                          type="monotone"
                          dataKey={(item: any) => (item.type === 'forecast' ? item.price : null)}
                          stroke="#10b981"
                          strokeWidth={2.5}
                          strokeDasharray="5 5"
                          fill="url(#forecastGradient)"
                          connectNulls
                        />

                        {showConfidenceBands && (
                          <>
                            <Area
                              type="monotone"
                              dataKey="confidence.upper95"
                              stroke="none"
                              fill="#10b981"
                              fillOpacity={0.1}
                              connectNulls
                            />
                            <Area
                              type="monotone"
                              dataKey="confidence.lower95"
                              stroke="none"
                              fill="#10b981"
                              fillOpacity={0.1}
                              connectNulls
                            />
                          </>
                        )}
                      </ComposedChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-muted-foreground">
                      {tc('noData')}
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Enhanced Insights Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                whileHover={{ scale: 1.01, transition: { duration: 0.2 } }}
                className="relative overflow-hidden rounded-2xl lg:rounded-3xl bg-gradient-to-br from-background via-background/90 to-background/80 backdrop-blur-2xl border border-white/10 shadow-xl"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                <div className="relative p-4 lg:p-6 h-full flex flex-col">
                  <div className="flex items-start gap-2 lg:gap-3 mb-3 lg:mb-4">
                    <div className="p-2 lg:p-3 rounded-xl lg:rounded-2xl bg-gradient-to-br from-purple-500/20 to-purple-400/10 backdrop-blur shadow-lg">
                      <Brain className="w-4 h-4 lg:w-5 lg:h-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className={cn(text('base', 'lg', 'font-semibold'))}>{t('insights')}</h3>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {/* Market Outlook */}
                    {(() => {
                      const summary = (statsData as any)?.stats?.analysis?.summary;
                      if (!summary) return null;
                      return (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.4 }}
                          className="p-4 bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl border border-border/50"
                        >
                          <p
                            className={cn(
                              text('xs', 'sm'),
                              'font-semibold mb-2 text-primary flex items-center gap-2',
                            )}
                          >
                            <Sparkles className="w-4 h-4" />
                            {t('marketOutlook')}
                            <UiTooltip
                              trigger="click"
                              content={
                                <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                                  {tt('marketOutlook')}
                                </span>
                              }
                            >
                              <Info className="w-3 h-3 text-muted-foreground/80" />
                            </UiTooltip>
                          </p>
                          <p
                            className={cn(
                              text('xs', 'sm'),
                              'text-muted-foreground leading-relaxed',
                            )}
                          >
                            {summary}
                          </p>
                        </motion.div>
                      );
                    })()}

                    <div className="grid gap-3">
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-4 bg-gradient-to-br from-emerald-500/10 to-transparent rounded-2xl border border-emerald-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="w-4 h-4 text-emerald-500" />
                          <p className={cn(text('xs', 'sm'), 'font-semibold')}>
                            {t('targetPrice')}
                          </p>
                        </div>
                        <p className={cn(text('lg', 'xl', 'font-bold'), 'text-emerald-500')}>
                          {(() => {
                            const s30 = (statsData as any)?.stats?.forecast?.targets?.['30d']
                              ?.price;
                            const w30 = widget?.forecast?.day30?.price;
                            const val = s30 ?? w30 ?? null;
                            return val !== null ? formatPrice(val) : tc('na');
                          })()}
                        </p>
                      </motion.div>

                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        className="p-4 bg-gradient-to-br from-blue-500/10 to-transparent rounded-2xl border border-blue-500/20"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="w-4 h-4 text-blue-500" />
                          <p className={cn(text('xs', 'sm'), 'font-semibold')}>{t('volatility')}</p>
                        </div>
                        <p className={cn(text('lg', 'xl', 'font-bold'), 'text-blue-500')}>
                          {(() => {
                            const atrp = (statsData as any)?.stats?.technical?.volatility
                              ?.atrPercent;
                            return typeof atrp === 'number' ? `${atrp.toFixed(2)}%` : tc('na');
                          })()}
                        </p>
                      </motion.div>
                    </div>

                    {/* Enhanced Trend Indicator */}
                    <motion.div
                      whileHover={{ scale: 1.01 }}
                      className="flex items-center justify-between p-4 bg-gradient-to-br from-muted/20 to-transparent rounded-2xl border border-border/50"
                    >
                      <span className={cn(text('sm', 'base'), 'font-semibold')}>
                        {t('trendDirection')}
                      </span>
                      <div
                        className={cn(
                          'flex items-center gap-2 px-3 py-2 rounded-full font-semibold shadow-lg',
                          trendDirection === 'bullish'
                            ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-500 border border-emerald-500/30'
                            : trendDirection === 'bearish'
                              ? 'bg-gradient-to-r from-red-500/20 to-rose-500/20 text-red-500 border border-red-500/30'
                              : 'bg-gradient-to-r from-gray-500/20 to-slate-500/20 text-gray-500 border border-gray-500/30',
                        )}
                      >
                        {trendDirection === 'bullish' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : trendDirection === 'bearish' ? (
                          <TrendingDown className="w-4 h-4" />
                        ) : null}
                        <span className={text('xs', 'sm')}>
                          {trendDirection === 'bullish'
                            ? t('bullish')
                            : trendDirection === 'bearish'
                              ? t('bearish')
                              : t('neutral')}
                        </span>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
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
            className="space-y-4"
          >
            {/* Enhanced Controls */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex gap-2 flex-wrap">
                {(['1m', '3m', '6m', '1y'] as ForecastRange[]).map((range) => (
                  <motion.button
                    key={range}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setSelectedRange(range)}
                    className={cn(
                      'px-4 py-2.5 rounded-xl font-medium transition-all duration-200',
                      text('xs', 'sm'),
                      selectedRange === range
                        ? 'bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:shadow-md',
                    )}
                  >
                    {t(`ranges.${range}`)}
                  </motion.button>
                ))}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                    {t('interval', { fallback: 'Interval' as any })}
                  </label>
                  <select
                    value={chartInterval}
                    onChange={(e) => setChartInterval(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-background/80 backdrop-blur text-sm hover:border-primary/50 transition-colors"
                  >
                    <option value="1d">1D</option>
                    <option value="1w">1W</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                    {t('model', { fallback: 'Model' as any })}
                  </label>
                  <select
                    value={chartModel}
                    onChange={(e) => setChartModel(e.target.value)}
                    className="px-3 py-2 rounded-lg border bg-background/80 backdrop-blur text-sm hover:border-primary/50 transition-colors"
                  >
                    <option value="linear">Linear</option>
                    <option value="exponential">Exponential</option>
                    <option value="arima">ARIMA</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <label className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                    {t('forecastDays', { fallback: 'Forecast' as any })}
                  </label>
                  <input
                    type="range"
                    min={7}
                    max={365}
                    step={1}
                    value={forecastDays}
                    onChange={(e) => setForecastDays(parseInt(e.target.value, 10))}
                    className="w-24 accent-primary"
                  />
                  <span className={cn(text('xs', 'sm'), 'font-semibold min-w-[3ch] text-primary')}>
                    {forecastDays}d
                  </span>
                </div>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowConfidenceBands(!showConfidenceBands)}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium transition-all duration-200',
                    text('xs', 'sm'),
                    showConfidenceBands
                      ? 'bg-gradient-to-r from-primary/20 to-primary/10 text-primary border border-primary/30'
                      : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                  )}
                >
                  <Shield className="w-4 h-4" />
                  {t('confidenceBands')} {showConfidenceBands ? t('on') : t('off')}
                </motion.button>
              </div>
            </div>

            {/* Enhanced Chart Container */}
            <div className="rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl border border-white/10 shadow-2xl p-6">
              {chartLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="w-16 h-16 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <span className="text-muted-foreground">{tc('loading')}</span>
                  </div>
                </div>
              ) : chartData?.chart?.data ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart
                      data={chartData.chart.data}
                      margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="forecastGradientMain" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="historicalGradientMain" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5} />
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="confidenceGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#10b981" stopOpacity={0.15} />
                          <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>

                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted/10" />
                      <XAxis
                        dataKey={(item: any) => item?.timestamp || item?.date}
                        tickFormatter={(value: any) =>
                          format(new Date(value), 'MMM dd', { locale: getDateLocale(locale) })
                        }
                        className="text-xs"
                      />
                      <YAxis
                        domain={['auto', 'auto']}
                        tickFormatter={(value) => `$${value.toFixed(2)}`}
                        className="text-xs"
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '12px',
                          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.3)',
                        }}
                        formatter={(value: any, name: string) => {
                          if (name === 'confidence.upper95') {
                            return [formatPrice(value), t('confidence95') + ' ' + t('upperBound')];
                          }
                          if (name === 'confidence.lower95') {
                            return [formatPrice(value), t('confidence95') + ' ' + t('lowerBound')];
                          }
                          if (name === 'confidence.upper68') {
                            return [formatPrice(value), t('confidence68') + ' ' + t('upperBound')];
                          }
                          if (name === 'confidence.lower68') {
                            return [formatPrice(value), t('confidence68') + ' ' + t('lowerBound')];
                          }
                          if (name === 'historical') {
                            return [formatPrice(value), tc('historical')];
                          }
                          if (name === 'forecast') {
                            return [formatPrice(value), t('forecast')];
                          }
                          return [formatPrice(value), name];
                        }}
                        labelFormatter={(value: any) =>
                          format(new Date(value), 'PPP', { locale: getDateLocale(locale) })
                        }
                      />

                      <ReferenceLine
                        y={currentPrice}
                        stroke="hsl(var(--primary))"
                        strokeDasharray="5 5"
                        strokeWidth={2}
                        opacity={0.6}
                      />

                      {showConfidenceBands && (
                        <>
                          <Area
                            type="monotone"
                            dataKey="confidence.upper95"
                            stroke="none"
                            fill="url(#confidenceGradient)"
                            connectNulls
                          />
                          <Area
                            type="monotone"
                            dataKey="confidence.lower95"
                            stroke="none"
                            fill="url(#confidenceGradient)"
                            connectNulls
                          />
                          <Area
                            type="monotone"
                            dataKey="confidence.upper68"
                            stroke="none"
                            fill="url(#confidenceGradient)"
                            fillOpacity={0.08}
                            connectNulls
                          />
                          <Area
                            type="monotone"
                            dataKey="confidence.lower68"
                            stroke="none"
                            fill="url(#confidenceGradient)"
                            fillOpacity={0.08}
                            connectNulls
                          />
                        </>
                      )}

                      <Area
                        type="monotone"
                        dataKey={(item: any) => (item.type === 'historical' ? item.price : null)}
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="url(#historicalGradientMain)"
                        connectNulls
                        dot={false}
                      />

                      <Area
                        type="monotone"
                        dataKey={(item: any) => (item.type === 'forecast' ? item.price : null)}
                        stroke="#10b981"
                        strokeWidth={3}
                        strokeDasharray="5 5"
                        fill="url(#forecastGradientMain)"
                        connectNulls
                        dot={false}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>

                  {/* Enhanced Chart Legend */}
                  <div className="mt-6 flex flex-wrap items-center justify-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-2 bg-gradient-to-r from-blue-500 to-blue-400 rounded"></div>
                      <span className={cn(text('xs', 'sm'), 'font-medium')}>
                        {tc('historical')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-2 bg-gradient-to-r from-emerald-500 to-emerald-400 rounded"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(90deg, #10b981 0, #10b981 3px, transparent 3px, transparent 6px)',
                        }}
                      ></div>
                      <span className={cn(text('xs', 'sm'), 'font-medium')}>{t('forecast')}</span>
                    </div>
                    {showConfidenceBands && (
                      <>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-b from-emerald-500/20 to-emerald-500/5 rounded border border-emerald-500/30"></div>
                          <span className={cn(text('xs', 'sm'), 'font-medium')}>
                            {t('confidence95', { fallback: '95% CI' as any })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-gradient-to-b from-emerald-500/10 to-emerald-500/2 rounded border border-emerald-500/20"></div>
                          <span className={cn(text('xs', 'sm'), 'font-medium')}>
                            {t('confidence68', { fallback: '68% CI' as any })}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <div className="h-96 flex items-center justify-center text-muted-foreground">
                  {tc('noData')}
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Table View - Enhanced Design */}
      {selectedView === 'table' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <div className="rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden">
              {/* Mobile Filters */}
              <div className="sm:hidden p-4 border-b border-border/50 bg-muted/5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                      {t('startDate')}
                    </label>
                    <input
                      type="date"
                      value={tableStartDate}
                      onChange={(e) => {
                        setTablePage(1);
                        setTableStartDate(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-lg border bg-background/80 backdrop-blur text-sm hover:border-primary/50 transition-colors"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                      {t('endDate')}
                    </label>
                    <input
                      type="date"
                      value={tableEndDate}
                      onChange={(e) => {
                        setTablePage(1);
                        setTableEndDate(e.target.value);
                      }}
                      className="w-full px-3 py-2 rounded-lg border bg-background/80 backdrop-blur text-sm hover:border-primary/50 transition-colors"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <label className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                      {t('pageSize')}
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setPageSizeOpen((o) => !o)}
                        className="px-3 py-2 rounded-lg border bg-background/80 backdrop-blur text-sm flex items-center gap-2 min-w-[70px] hover:border-primary/50 transition-colors"
                      >
                        {tableLimit}
                        <ChevronDown className="w-3 h-3" />
                      </button>
                      {pageSizeOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute right-0 z-20 mt-2 w-24 rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-xl"
                        >
                          {[10, 20, 50].map((size) => (
                            <button
                              key={size}
                              onClick={() => {
                                setTableLimit(size);
                                setTablePage(1);
                                setPageSizeOpen(false);
                              }}
                              className={cn(
                                'w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors',
                                tableLimit === size && 'font-bold bg-primary/5',
                              )}
                            >
                              {size}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </div>
                  </div>

                  {(tableStartDate || tableEndDate) && (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => {
                        setTableStartDate('');
                        setTableEndDate('');
                        setTablePage(1);
                      }}
                      className={cn(
                        'px-3 py-2 rounded-lg border text-sm font-medium',
                        'bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors',
                      )}
                    >
                      {t('clear')}
                    </motion.button>
                  )}
                </div>
              </div>

              {/* Mobile View - Enhanced Cards */}
              <div className="sm:hidden space-y-3 p-4">
                {tableLoading ? (
                  <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
                ) : (
                  (() => {
                    const raw = (tableData as any) || {};
                    const rows =
                      raw?.table?.rows?.data ||
                      raw?.rows?.data ||
                      raw?.table?.rows ||
                      raw?.rows ||
                      [];

                    if (!Array.isArray(rows) || rows.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">{tc('noData')}</div>
                      );
                    }

                    return rows.map((row: any, idx: number) => {
                      const dateDisplay = row?.date?.display || null;
                      const relative = row?.date?.relative;
                      const priceDisplay = row?.price?.display ?? null;
                      const changePct = row?.change?.percentage ?? null;
                      const isPositive = (changePct ?? 0) >= 0;
                      const confidencePct = row?.confidence?.percentage ?? null;
                      const confidenceKey = getConfidenceLevel(Number(confidencePct || 0));
                      const target = row?.target;

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.02 }}
                          className="bg-gradient-to-br from-muted/30 to-muted/10 rounded-2xl p-4 space-y-3 border border-border/50 hover:border-primary/30 transition-all duration-300"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <p className={cn(text('sm', 'base', 'font-semibold'))}>
                                {dateDisplay || '—'}
                              </p>
                              <div className="mt-2 flex items-center gap-2">
                                {relative && (
                                  <span
                                    className={cn(
                                      'inline-flex px-2.5 py-1 rounded-full text-xs font-medium bg-muted/40 text-muted-foreground',
                                    )}
                                  >
                                    {relative}
                                  </span>
                                )}
                                {confidencePct !== null && (
                                  <span
                                    className={cn(
                                      'inline-flex px-2.5 py-1 rounded-full text-xs font-semibold shadow-lg',
                                      `bg-gradient-to-r ${CONFIDENCE_GRADIENTS[confidenceKey]} text-white`,
                                    )}
                                  >
                                    {Number(confidencePct).toFixed(0)}% {t('confidence')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className={cn(text('xl', '2xl', 'font-bold'))}>
                                {priceDisplay ?? tc('na')}
                              </p>
                              {changePct !== null && (
                                <div
                                  className={cn(
                                    'flex items-center justify-end gap-1 mt-1',
                                    isPositive ? 'text-emerald-500' : 'text-red-500',
                                  )}
                                >
                                  {isPositive ? (
                                    <ArrowUpRight className="w-4 h-4" />
                                  ) : (
                                    <ArrowDownRight className="w-4 h-4" />
                                  )}
                                  <span className={text('sm', 'base', 'font-semibold')}>
                                    {Math.abs(changePct).toFixed(2)}%
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>

                          {target && (
                            <div className="pt-3 border-t border-border/40 text-muted-foreground flex items-center justify-between">
                              <span className={text('xs', 'sm')}>{t('probability')}:</span>
                              <span className={cn(text('xs', 'sm'), 'font-semibold')}>
                                {target?.probability != null
                                  ? `${Number(target.probability).toFixed(0)}%`
                                  : tc('na')}{' '}
                                · {target?.daysUntil != null ? `${target.daysUntil}d` : tc('na')}
                              </span>
                            </div>
                          )}
                        </motion.div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Desktop View - Enhanced Table */}
              <div className="hidden sm:block">
                {(() => {
                  const raw = (tableData as any) || {};
                  const columns: any[] = raw?.table?.columns || raw?.columns || [];
                  const rows =
                    raw?.table?.rows?.data ||
                    raw?.rows?.data ||
                    raw?.table?.rows ||
                    raw?.rows ||
                    [];
                  const getCol = (key: string) => columns.find((c) => c.key === key);
                  const labelFor = (key: string, fallback: string) =>
                    getCol(key)?.label || fallback;

                  const headerCell = (
                    key: string,
                    align: 'left' | 'right' | 'center',
                    label: string,
                  ) => (
                    <th
                      key={key}
                      onClick={() => {
                        setTablePage(1);
                        if (tableSortBy === key) {
                          setTableSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
                        } else {
                          setTableSortBy(key);
                          setTableSortOrder('DESC');
                        }
                      }}
                      className={cn(
                        `px-6 py-4 text-${align} select-none cursor-pointer hover:bg-muted/20 transition-colors`,
                        text('xs', 'sm', 'font-bold uppercase tracking-wider'),
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        {label}
                        {tableSortBy === key && (
                          <ChevronRight
                            className={cn(
                              'w-3 h-3 text-primary',
                              tableSortOrder === 'ASC' ? 'rotate-90' : '-rotate-90',
                            )}
                          />
                        )}
                      </span>
                    </th>
                  );

                  return (
                    <>
                      {/* Enhanced Filters Toolbar */}
                      <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/10 border-b border-border/50">
                        <div className="flex items-center gap-2">
                          <label
                            className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}
                          >
                            {t('startDate')}
                          </label>
                          <input
                            type="date"
                            value={tableStartDate}
                            onChange={(e) => {
                              setTablePage(1);
                              setTableStartDate(e.target.value);
                            }}
                            className="px-3 py-1.5 rounded-lg border bg-background/80 backdrop-blur hover:border-primary/50 transition-colors"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <label
                            className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}
                          >
                            {t('endDate')}
                          </label>
                          <input
                            type="date"
                            value={tableEndDate}
                            onChange={(e) => {
                              setTablePage(1);
                              setTableEndDate(e.target.value);
                            }}
                            className="px-3 py-1.5 rounded-lg border bg-background/80 backdrop-blur hover:border-primary/50 transition-colors"
                          />
                        </div>
                        <div className="flex items-center gap-2 ml-auto relative">
                          <label
                            className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}
                          >
                            {t('pageSize')}
                          </label>
                          <div className="relative">
                            <button
                              onClick={() => setPageSizeOpen((o) => !o)}
                              className="px-3 py-1.5 rounded-lg border bg-background/80 backdrop-blur text-xs flex items-center gap-2 min-w-[70px] hover:border-primary/50 transition-colors"
                            >
                              {tableLimit}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {pageSizeOpen && (
                              <motion.div
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="absolute right-0 z-20 mt-2 w-24 rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-xl"
                              >
                                {[10, 20, 50].map((size) => (
                                  <button
                                    key={size}
                                    onClick={() => {
                                      setTableLimit(size);
                                      setTablePage(1);
                                      setPageSizeOpen(false);
                                    }}
                                    className={cn(
                                      'w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors',
                                      tableLimit === size && 'font-bold bg-primary/5',
                                    )}
                                  >
                                    {size}
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </div>
                          {(tableStartDate || tableEndDate) && (
                            <motion.button
                              whileHover={{ scale: 1.05 }}
                              whileTap={{ scale: 0.95 }}
                              onClick={() => {
                                setTableStartDate('');
                                setTableEndDate('');
                                setTablePage(1);
                              }}
                              className={cn(
                                'px-3 py-1.5 rounded-lg border text-xs font-medium',
                                'bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors',
                              )}
                            >
                              {t('clear')}
                            </motion.button>
                          )}
                        </div>
                      </div>

                      <table className="w-full">
                        <thead className="bg-gradient-to-r from-muted/30 to-muted/10 border-b border-border/50">
                          <tr>
                            {headerCell('date', 'left', labelFor('date', t('date')))}
                            {headerCell('price', 'right', labelFor('price', t('predictedPrice')))}
                            {headerCell('change', 'center', labelFor('change', t('change')))}
                            {headerCell(
                              'confidence',
                              'center',
                              labelFor('confidence', t('confidence')),
                            )}
                            {headerCell('target', 'center', labelFor('target', t('targetPrice')))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableLoading ? (
                            <tr>
                              <td colSpan={5} className="text-center py-12">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-12 h-12 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
                                  <span className="text-muted-foreground">{tc('loading')}</span>
                                </div>
                              </td>
                            </tr>
                          ) : !Array.isArray(rows) || rows.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="text-center py-8 text-muted-foreground">
                                {tc('noData')}
                              </td>
                            </tr>
                          ) : (
                            rows.map((row: any, idx: number) => {
                              const dateDisplay = row?.date?.display || null;
                              const priceDisplay = row?.price?.display ?? null;
                              const changePct = row?.change?.percentage ?? null;
                              const isPositive = (changePct ?? 0) >= 0;
                              const confidencePct = row?.confidence?.percentage ?? null;
                              const confidenceKey = getConfidenceLevel(Number(confidencePct || 0));
                              const target = row?.target;
                              return (
                                <motion.tr
                                  key={idx}
                                  initial={{ opacity: 0, x: -20 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: idx * 0.02 }}
                                  className="border-b border-border/30 hover:bg-primary/5 transition-all duration-200"
                                >
                                  <td
                                    className={cn('px-6 py-4', text('sm', 'base', 'font-medium'))}
                                  >
                                    {dateDisplay || '—'}
                                  </td>
                                  <td
                                    className={cn(
                                      'px-6 py-4 text-right font-bold',
                                      text('sm', 'base'),
                                    )}
                                  >
                                    {priceDisplay ?? tc('na')}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {changePct !== null ? (
                                      <span
                                        className={cn(
                                          'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold shadow',
                                          isPositive
                                            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-500 border border-red-500/20',
                                        )}
                                      >
                                        {isPositive ? (
                                          <ArrowUpRight className="w-3.5 h-3.5" />
                                        ) : (
                                          <ArrowDownRight className="w-3.5 h-3.5" />
                                        )}
                                        {Math.abs(changePct).toFixed(2)}%
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4 text-center">
                                    {confidencePct !== null ? (
                                      <span
                                        className={cn(
                                          'inline-flex px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg',
                                          `bg-gradient-to-r ${CONFIDENCE_GRADIENTS[confidenceKey]} text-white`,
                                        )}
                                      >
                                        {Number(confidencePct).toFixed(0)}%
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                  <td className={cn('px-6 py-4 text-center', text('xs', 'sm'))}>
                                    {target ? (
                                      <span className="text-muted-foreground">
                                        {target?.probability != null
                                          ? `${Number(target.probability).toFixed(0)}%`
                                          : tc('na')}{' '}
                                        ·{' '}
                                        {target?.daysUntil != null
                                          ? `${target.daysUntil}d`
                                          : tc('na')}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground">—</span>
                                    )}
                                  </td>
                                </motion.tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </>
                  );
                })()}
              </div>

              {/* Enhanced Pagination Controls */}
              {(() => {
                const raw = (tableData as any) || {};
                const pagination = raw?.table?.rows?.pagination || raw?.rows?.pagination;
                if (!pagination) return null;
                const { page, totalPages, hasPrev, hasNext } = pagination;
                return (
                  <div className="flex items-center justify-between px-6 py-4 border-t border-border/50 bg-muted/5">
                    <motion.button
                      whileHover={{ scale: hasPrev ? 1.05 : 1 }}
                      whileTap={{ scale: hasPrev ? 0.95 : 1 }}
                      onClick={() => hasPrev && setTablePage((p) => Math.max(1, p - 1))}
                      disabled={!hasPrev}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                        hasPrev
                          ? 'bg-primary/10 hover:bg-primary/20 text-primary'
                          : 'bg-muted/20 text-muted-foreground cursor-not-allowed',
                      )}
                    >
                      <ChevronRight className="w-4 h-4 -rotate-180" />
                    </motion.button>
                    <span className={cn(text('sm', 'base'), 'font-semibold')}>
                      {page} / {totalPages}
                    </span>
                    <motion.button
                      whileHover={{ scale: hasNext ? 1.05 : 1 }}
                      whileTap={{ scale: hasNext ? 0.95 : 1 }}
                      onClick={() => hasNext && setTablePage((p) => p + 1)}
                      disabled={!hasNext}
                      className={cn(
                        'px-4 py-2 rounded-xl text-sm font-medium transition-all',
                        hasNext
                          ? 'bg-primary/10 hover:bg-primary/20 text-primary'
                          : 'bg-muted/20 text-muted-foreground cursor-not-allowed',
                      )}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Enhanced Stats View */}
      {selectedView === 'stats' && statsData?.stats && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Enhanced Stats range selector */}
            <div className="flex justify-end">
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setStatsRangeOpen((o) => !o)}
                  className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-muted/40 to-muted/30 border border-border/50 text-sm font-medium flex items-center gap-2 shadow-lg hover:shadow-xl transition-all"
                >
                  {t(`ranges.${selectedStatsRange}`)}
                  <ChevronDown
                    className={cn('w-3 h-3 transition-transform', statsRangeOpen && 'rotate-180')}
                  />
                </motion.button>
                {statsRangeOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-xl"
                  >
                    {(['1m', '3m', '6m', '1y'] as ForecastRange[]).map((r) => (
                      <button
                        key={r}
                        onClick={() => {
                          setSelectedStatsRange(r);
                          setStatsRangeOpen(false);
                        }}
                        className={cn(
                          'w-full text-left px-4 py-2.5 text-sm hover:bg-primary/10 transition-colors',
                          selectedStatsRange === r && 'font-bold bg-primary/5',
                        )}
                      >
                        {t(`ranges.${r}`)}
                      </button>
                    ))}
                  </motion.div>
                )}
              </div>
            </div>

            {/* Enhanced Accuracy summary cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-6">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
                whileHover={{ y: -4 }}
                className="relative group rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-500/10 via-background to-background backdrop-blur-xl border border-amber-500/20 shadow-xl hover:shadow-2xl transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-400/10 shadow-lg">
                      <Award className="w-4 h-4 sm:w-6 sm:h-6 text-amber-500" />
                    </div>
                    <span
                      className={cn(
                        text('xs', 'xs'),
                        'text-muted-foreground font-medium text-right leading-tight inline-flex items-center gap-1',
                      )}
                    >
                      {t('overallAccuracy')}
                      <UiTooltip
                        trigger="click"
                        content={
                          <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                            {tt('overallAccuracy')}
                          </span>
                        }
                      >
                        <Info className="w-3 h-3 text-muted-foreground/80" />
                      </UiTooltip>
                    </span>
                  </div>
                  <p
                    className={cn(
                      text('xl', '3xl', 'font-bold'),
                      'bg-gradient-to-br from-amber-500 to-amber-400 bg-clip-text text-transparent',
                    )}
                  >
                    {(100 - (statsData.stats.accuracy?.mape || 0)).toFixed(1)}%
                  </p>
                  <div className="mt-2 sm:mt-3 h-1.5 sm:h-2.5 bg-muted/20 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width: `${Math.max(0, Math.min(100, 100 - (statsData.stats.accuracy?.mape || 0)))}%`,
                      }}
                      transition={{ duration: 1, ease: 'easeOut' }}
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 shadow-lg"
                    />
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.2 }}
                whileHover={{ y: -4 }}
                className="relative group rounded-2xl sm:rounded-3xl bg-gradient-to-br from-blue-500/10 via-background to-background backdrop-blur-xl border border-blue-500/20 shadow-xl hover:shadow-2xl transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-500/20 to-blue-400/10 shadow-lg">
                      <Target className="w-4 h-4 sm:w-6 sm:h-6 text-blue-500" />
                    </div>
                    <span
                      className={cn(
                        text('xs', 'xs'),
                        'text-muted-foreground font-medium text-right leading-tight inline-flex items-center gap-1',
                      )}
                    >
                      {t('mape')}
                      <UiTooltip
                        trigger="click"
                        content={
                          <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                            {tt('mape')}
                          </span>
                        }
                      >
                        <Info className="w-3 h-3 text-muted-foreground/80" />
                      </UiTooltip>
                    </span>
                  </div>
                  <p
                    className={cn(
                      text('xl', '3xl', 'font-bold'),
                      'bg-gradient-to-br from-blue-500 to-blue-400 bg-clip-text text-transparent',
                    )}
                  >
                    {(statsData.stats.accuracy?.mape || 0).toFixed(2)}%
                  </p>
                  <p
                    className={cn(
                      text('xs', 'xs'),
                      'text-muted-foreground mt-1 sm:mt-2 leading-tight',
                    )}
                  >
                    {t('meanAbsoluteError')}
                  </p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                whileHover={{ y: -4 }}
                className="relative group rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-500/10 via-background to-background backdrop-blur-xl border border-emerald-500/20 shadow-xl hover:shadow-2xl transition-all"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-400/10 shadow-lg">
                      <CheckCircle className="w-4 h-4 sm:w-6 sm:h-6 text-emerald-500" />
                    </div>
                    <span
                      className={cn(
                        text('xs', 'xs'),
                        'text-muted-foreground font-medium text-right leading-tight inline-flex items-center gap-1',
                      )}
                    >
                      {t('hitRate')}
                      <UiTooltip
                        trigger="click"
                        content={
                          <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                            {tt('hitRate')}
                          </span>
                        }
                      >
                        <Info className="w-3 h-3 text-muted-foreground/80" />
                      </UiTooltip>
                    </span>
                  </div>
                  <p
                    className={cn(
                      text('xl', '3xl', 'font-bold'),
                      'bg-gradient-to-br from-emerald-500 to-emerald-400 bg-clip-text text-transparent',
                    )}
                  >
                    {(statsData.stats.accuracy?.directionalAccuracy || 0).toFixed(0)}%
                  </p>
                  <p
                    className={cn(
                      text('xs', 'xs'),
                      'text-muted-foreground mt-1 sm:mt-2 leading-tight',
                    )}
                  >
                    {t('directionAccuracy')}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* The rest of the stats view content remains the same with enhanced styling */}
            {/* Error Metrics and Confidence */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
              {/* Error Metrics */}
              <div className="relative rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-2xl border border-white/10 shadow-xl p-6">
                <h4 className={cn(text('base', 'lg', 'font-bold'), 'mb-4 flex items-center gap-2')}>
                  <Cpu className="w-5 h-5 text-primary" />
                  {t('errorMetrics', { fallback: 'Error Metrics' as any })}
                  <UiTooltip
                    trigger="click"
                    content={
                      <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {tt('errorMetrics')}
                      </span>
                    }
                  >
                    <Info className="w-3 h-3 text-muted-foreground/80" />
                  </UiTooltip>
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    {
                      key: 'mae',
                      label: t('mae', { fallback: 'MAE' as any }),
                      value: statsData.stats.accuracy?.mae,
                    },
                    {
                      key: 'rmse',
                      label: t('rmse', { fallback: 'RMSE' as any }),
                      value: statsData.stats.accuracy?.rmse,
                    },
                    {
                      key: 'bias',
                      label: t('bias', { fallback: 'Bias' as any }),
                      value: statsData.stats.accuracy?.bias,
                    },
                  ].map((item, idx) => (
                    <motion.div
                      key={idx}
                      whileHover={{ scale: 1.02 }}
                      className="p-3 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 hover:border-primary/30 transition-all"
                    >
                      <div className="flex items-center gap-1">
                        <p className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          {item.label}
                        </p>
                        <UiTooltip
                          trigger="click"
                          content={
                            <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                              {tt(item.key as any)}
                            </span>
                          }
                        >
                          <Info className="w-3 h-3 text-muted-foreground/70" />
                        </UiTooltip>
                      </div>
                      <p className={cn(text('lg', 'xl', 'font-bold'))}>
                        {(item.value ?? 0).toFixed(2)}
                      </p>
                    </motion.div>
                  ))}
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50">
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                      {t('backtestPeriod', { fallback: 'Backtest Period' as any })}
                    </p>
                    <p className={cn(text('sm', 'base', 'font-semibold'))}>
                      {statsData.stats.accuracy?.backtestPeriod || tc('na')}
                    </p>
                  </div>
                  <div className="p-3 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50">
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                      {t('samplesAnalyzed', { fallback: 'Samples Analyzed' as any })}
                    </p>
                    <p className={cn(text('sm', 'base', 'font-semibold'))}>
                      {statsData.stats.accuracy?.samplesAnalyzed ?? tc('na')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Confidence Intervals */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-2xl border border-white/10 shadow-xl p-6">
                <h4 className={cn(text('base', 'lg', 'font-bold'), 'mb-4 flex items-center gap-2')}>
                  <Shield className="w-5 h-5 text-primary" />
                  {t('confidenceIntervals', { fallback: 'Confidence Intervals' as any })}
                  <UiTooltip
                    trigger="click"
                    content={
                      <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {tt('confidenceIntervals')}
                      </span>
                    }
                  >
                    <Info className="w-3 h-3 text-muted-foreground/80" />
                  </UiTooltip>
                </h4>
                {(() => {
                  const ci = statsData.stats.accuracy?.confidenceInterval as any;
                  const c68 = ci?.['68%'];
                  const c95 = ci?.['95%'];
                  const round = (v: any) =>
                    v != null ? Number(v).toFixed(Math.abs(v) < 1 ? 3 : 2) : tc('na');
                  return (
                    <div className="space-y-3">
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-emerald-500/10 to-transparent border border-emerald-500/20"
                      >
                        <span className={cn(text('sm', 'base'), 'font-semibold text-emerald-500')}>
                          68%
                        </span>
                        <span className={cn(text('sm', 'base', 'font-bold'))}>
                          {c68 ? `${round(c68.lower)}% ~ ${round(c68.upper)}%` : tc('na')}
                        </span>
                      </motion.div>
                      <motion.div
                        whileHover={{ scale: 1.01 }}
                        className="flex items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-blue-500/10 to-transparent border border-blue-500/20"
                      >
                        <span className={cn(text('sm', 'base'), 'font-semibold text-blue-500')}>
                          95%
                        </span>
                        <span className={cn(text('sm', 'base', 'font-bold'))}>
                          {c95 ? `${round(c95.lower)}% ~ ${round(c95.upper)}%` : tc('na')}
                        </span>
                      </motion.div>
                      <p
                        className={cn(
                          text('xs', 'sm'),
                          'text-muted-foreground flex items-center gap-2 pt-2',
                        )}
                      >
                        <Info className="w-4 h-4" />{' '}
                        {t('confidence68Help', { fallback: '68% ≈ ±1σ; 95% ≈ ±2σ' as any })}
                      </p>
                    </div>
                  );
                })()}
              </div>
            </motion.div>

            {/* Forecast Targets + Horizon/Model */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Forecast Targets */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-2xl border border-white/10 shadow-xl p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
                <h4 className={cn(text('base', 'lg', 'font-bold'), 'mb-4 flex items-center gap-2')}>
                  <Target className="w-5 h-5 text-emerald-500" />
                  {t('targetPrice')}
                  <UiTooltip
                    trigger="click"
                    content={
                      <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {tt('targetPrice')}
                      </span>
                    }
                  >
                    <Info className="w-3 h-3 text-muted-foreground/80" />
                  </UiTooltip>
                </h4>
                {(() => {
                  const tgt = (statsData as any)?.stats?.forecast?.targets || {};
                  const items = [
                    { k: '1d', label: t('24Hours') },
                    { k: '7d', label: t('7Days') },
                    { k: '30d', label: t('30Days') },
                    { k: '90d', label: '90d' },
                    { k: '180d', label: '180d' },
                    { k: '365d', label: '365d' },
                  ];
                  return (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {items.map(({ k, label }) => {
                        const v = (tgt as any)[k];
                        const price = v?.price as number | undefined;
                        const chg = v?.changePercent as number | undefined;
                        return (
                          <motion.div
                            key={k}
                            whileHover={{ scale: 1.03, transition: { duration: 0.2 } }}
                            className="p-4 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 hover:border-emerald-500/30 transition-all duration-300"
                          >
                            <p
                              className={cn(
                                text('xs', 'sm'),
                                'text-muted-foreground font-medium mb-2',
                              )}
                            >
                              {label}
                            </p>
                            <div className="flex items-center justify-between">
                              <span className={cn(text('sm', 'base', 'font-bold'))}>
                                {price != null ? formatPrice(price) : tc('na')}
                              </span>
                              {chg != null && (
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow',
                                    chg >= 0
                                      ? 'bg-gradient-to-r from-emerald-500/10 to-green-500/10 text-emerald-500 border border-emerald-500/20'
                                      : 'bg-gradient-to-r from-red-500/10 to-rose-500/10 text-red-500 border border-red-500/20',
                                  )}
                                >
                                  {chg >= 0 ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                  ) : (
                                    <ArrowDownRight className="w-3 h-3" />
                                  )}
                                  {Math.abs(chg).toFixed(1)}%
                                </span>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>

              {/* Horizon & Model */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-2xl border border-white/10 shadow-xl p-6">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
                <h4 className={cn(text('base', 'lg', 'font-bold'), 'mb-4 flex items-center gap-2')}>
                  <Calendar className="w-5 h-5 text-blue-500" />
                  {t('horizon')}
                  <UiTooltip
                    trigger="click"
                    content={
                      <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {tt('horizon')}
                      </span>
                    }
                  >
                    <Info className="w-3 h-3 text-muted-foreground/80" />
                  </UiTooltip>
                </h4>
                {(() => {
                  const horizon = (statsData as any)?.stats?.forecast?.horizon;
                  const model = (statsData as any)?.stats?.forecast?.model;
                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20"
                        >
                          <p className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                            {t('start')}
                          </p>
                          <p className={cn(text('xs', 'sm', 'font-bold mt-1'))}>
                            {horizon?.start ? format(new Date(horizon.start), 'PP') : tc('na')}
                          </p>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20"
                        >
                          <p className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                            {t('end')}
                          </p>
                          <p className={cn(text('xs', 'sm', 'font-bold mt-1'))}>
                            {horizon?.end ? format(new Date(horizon.end), 'PP') : tc('na')}
                          </p>
                        </motion.div>
                        <motion.div
                          whileHover={{ scale: 1.02 }}
                          className="p-4 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20"
                        >
                          <p className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                            {t('days')}
                          </p>
                          <p className={cn(text('xs', 'sm', 'font-bold mt-1'))}>
                            {horizon?.days ?? tc('na')}
                          </p>
                        </motion.div>
                      </div>

                      <div className="p-4 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50">
                        <p
                          className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium mb-2')}
                        >
                          {t('model')}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              text('xs', 'sm'),
                              'px-3 py-1.5 rounded-full bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 font-semibold',
                            )}
                          >
                            {model?.type ?? tc('na')}
                          </span>
                          {Array.isArray(model?.components) && model.components.length > 0 && (
                            <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                              {t('components')}: {model.components.join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Enhanced Technicals */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-2xl border border-white/10 shadow-xl p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent pointer-events-none" />
              <h4 className={cn(text('base', 'lg', 'font-bold'), 'mb-6 flex items-center gap-2')}>
                <BarChart3 className="w-5 h-5 text-purple-500" />
                {t('technicals')}
                <UiTooltip
                  trigger="click"
                  content={
                    <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                      {tt('technicals')}
                    </span>
                  }
                >
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </UiTooltip>
              </h4>
              {(() => {
                const tech = (statsData as any)?.stats?.technical || {};
                const ma = tech.movingAverages || {};
                const mom = tech.momentum || {};
                const vol = tech.volatility || {};
                const bb = vol.bollingerBands || {};
                const tr = tech.trend || {};
                const volm = tech.volume || {};
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-transparent border border-indigo-500/20"
                    >
                      <p
                        className={cn(
                          text('sm', 'base'),
                          'font-semibold mb-3 text-indigo-500 inline-flex items-center gap-1',
                        )}
                      >
                        {t('movingAverages')}
                        <UiTooltip
                          trigger="click"
                          content={
                            <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                              {tt('movingAverages')}
                            </span>
                          }
                        >
                          <Info className="w-3 h-3 text-indigo-500/70" />
                        </UiTooltip>
                      </p>
                      <div className="space-y-2">
                        {[
                          { label: 'SMA20', value: ma.sma20 },
                          { label: 'SMA50', value: ma.sma50 },
                          { label: 'SMA200', value: ma.sma200 },
                          { label: 'EMA12', value: ma.ema12 },
                          { label: 'EMA26', value: ma.ema26 },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1">
                            <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                              {item.label}
                            </span>
                            <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                              {item.value != null ? formatPrice(item.value) : tc('na')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-transparent border border-pink-500/20"
                    >
                      <p
                        className={cn(
                          text('sm', 'base'),
                          'font-semibold mb-3 text-pink-500 inline-flex items-center gap-1',
                        )}
                      >
                        {t('momentum')}
                        <UiTooltip
                          trigger="click"
                          content={
                            <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                              {tt('momentum')}
                            </span>
                          }
                        >
                          <Info className="w-3 h-3 text-pink-500/70" />
                        </UiTooltip>
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('rsi')}
                          </span>
                          <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                            {mom.rsi != null ? mom.rsi.toFixed(2) : tc('na')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('rsiSignal')}
                          </span>
                          <span
                            className={cn(
                              text('xs', 'sm', 'font-semibold'),
                              mom.rsiSignal === 'overbought'
                                ? 'text-red-500'
                                : mom.rsiSignal === 'oversold'
                                  ? 'text-green-500'
                                  : '',
                            )}
                          >
                            {mom.rsiSignal ?? tc('na')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('macd')}
                          </span>
                          <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                            {mom.macd != null ? mom.macd.toFixed(4) : tc('na')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('macdSignal')}
                          </span>
                          <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                            {mom.macdSignal != null ? mom.macdSignal.toFixed(4) : tc('na')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('macdHistogram')}
                          </span>
                          <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                            {mom.macdHistogram != null ? mom.macdHistogram.toFixed(4) : tc('na')}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-teal-500/10 to-transparent border border-teal-500/20"
                    >
                      <p
                        className={cn(
                          text('sm', 'base'),
                          'font-semibold mb-3 text-teal-500 inline-flex items-center gap-1',
                        )}
                      >
                        {t('bollingerBands')}
                        <UiTooltip
                          trigger="click"
                          content={
                            <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                              {tt('bollingerBands')}
                            </span>
                          }
                        >
                          <Info className="w-3 h-3 text-teal-500/70" />
                        </UiTooltip>
                      </p>
                      <div className="space-y-2">
                        {[
                          { label: t('upper'), value: bb.upper, isPrice: true },
                          { label: t('middle'), value: bb.middle, isPrice: true },
                          { label: t('lower'), value: bb.lower, isPrice: true },
                          { label: t('bandwidth'), value: bb.bandwidth, isPrice: false },
                        ].map((item, idx) => (
                          <div key={idx} className="flex justify-between items-center py-1">
                            <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                              {item.label}
                            </span>
                            <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                              {item.value != null
                                ? item.isPrice
                                  ? formatPrice(item.value)
                                  : item.value.toFixed(2)
                                : tc('na')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-orange-500/10 to-transparent border border-orange-500/20"
                    >
                      <p
                        className={cn(
                          text('sm', 'base'),
                          'font-semibold mb-3 text-orange-500 inline-flex items-center gap-1',
                        )}
                      >
                        {t('volatility')}
                        <UiTooltip
                          trigger="click"
                          content={
                            <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                              {tt('volatility')}
                            </span>
                          }
                        >
                          <Info className="w-3 h-3 text-orange-500/70" />
                        </UiTooltip>
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('atr')}
                          </span>
                          <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                            {vol.atr != null ? vol.atr.toFixed(4) : tc('na')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('atrPercent')}
                          </span>
                          <span
                            className={cn(text('xs', 'sm', 'font-semibold'), 'text-orange-500')}
                          >
                            {vol.atrPercent != null ? `${vol.atrPercent.toFixed(2)}%` : tc('na')}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-lime-500/10 to-transparent border border-lime-500/20"
                    >
                      <p
                        className={cn(
                          text('sm', 'base'),
                          'font-semibold mb-3 text-lime-500 inline-flex items-center gap-1',
                        )}
                      >
                        {t('trend')}
                        <UiTooltip
                          trigger="click"
                          content={
                            <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                              {tt('trend')}
                            </span>
                          }
                        >
                          <Info className="w-3 h-3 text-lime-500/70" />
                        </UiTooltip>
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('direction')}
                          </span>
                          <span
                            className={cn(
                              text('xs', 'sm', 'font-semibold'),
                              tr.direction === 'bullish'
                                ? 'text-green-500'
                                : tr.direction === 'bearish'
                                  ? 'text-red-500'
                                  : '',
                            )}
                          >
                            {tr.direction ?? tc('na')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('strength')}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                              {tr.strength != null ? Number(tr.strength).toFixed(0) : tc('na')}
                            </span>
                            {tr.strength != null && (
                              <div className="w-16 h-2 bg-muted/30 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-gradient-to-r from-lime-500 to-lime-400"
                                  style={{ width: `${Math.min(100, Math.max(0, tr.strength))}%` }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('support')}
                          </span>
                          <span className={cn(text('xs', 'sm', 'font-semibold'), 'text-green-500')}>
                            {tr.support != null ? formatPrice(tr.support) : tc('na')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('resistance')}
                          </span>
                          <span className={cn(text('xs', 'sm', 'font-semibold'), 'text-red-500')}>
                            {tr.resistance != null ? formatPrice(tr.resistance) : tc('na')}
                          </span>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      whileHover={{ scale: 1.02 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-transparent border border-violet-500/20"
                    >
                      <p
                        className={cn(
                          text('sm', 'base'),
                          'font-semibold mb-3 text-violet-500 inline-flex items-center gap-1',
                        )}
                      >
                        {t('volume')}
                        <UiTooltip
                          trigger="click"
                          content={
                            <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                              {tt('volume')}
                            </span>
                          }
                        >
                          <Info className="w-3 h-3 text-violet-500/70" />
                        </UiTooltip>
                      </p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('current')}
                          </span>
                          <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                            {volm.current != null ? volm.current.toLocaleString() : tc('na')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('average')}
                          </span>
                          <span className={cn(text('xs', 'sm', 'font-semibold'))}>
                            {volm.average != null
                              ? Number(volm.average).toLocaleString()
                              : tc('na')}
                          </span>
                        </div>
                        <div className="flex justify-between items-center py-1">
                          <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                            {t('trend')}
                          </span>
                          <span
                            className={cn(
                              text('xs', 'sm', 'font-semibold'),
                              volm.trend === 'increasing'
                                ? 'text-green-500'
                                : volm.trend === 'decreasing'
                                  ? 'text-red-500'
                                  : '',
                            )}
                          >
                            {volm.trend ?? tc('na')}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })()}
            </motion.div>

            {/* Enhanced Performance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-background via-background/95 to-background/90 backdrop-blur-2xl border border-white/10 shadow-xl p-6"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent pointer-events-none" />
              <h4 className={cn(text('base', 'lg', 'font-bold'), 'mb-6 flex items-center gap-2')}>
                <PieChart className="w-5 h-5 text-cyan-500" />
                {t('returns')}
                <UiTooltip
                  trigger="click"
                  content={
                    <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                      {tt('returns')}
                    </span>
                  }
                >
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </UiTooltip>
              </h4>
              {(() => {
                const perf = (statsData as any)?.stats?.performance || {};
                const period = perf.period || {};
                const returns = perf.returns || {};
                const price = perf.price || {};
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: t('start'), value: period.start, type: 'date' },
                          { label: t('end'), value: period.end, type: 'date' },
                          { label: t('days'), value: period.days, type: 'number' },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20"
                          >
                            <p
                              className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}
                            >
                              {item.label}
                            </p>
                            <p className={cn(text('xs', 'sm', 'font-bold'), 'mt-1')}>
                              {item.type === 'date' && item.value
                                ? format(new Date(item.value), 'PP')
                                : (item.value ?? tc('na'))}
                            </p>
                          </motion.div>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {[
                          {
                            label: t('total'),
                            value: returns.total,
                            color: 'from-emerald-500 to-green-400',
                          },
                          {
                            label: t('average'),
                            value: returns.average,
                            color: 'from-blue-500 to-cyan-400',
                          },
                          {
                            label: t('best'),
                            value: returns.best,
                            color: 'from-green-600 to-emerald-400',
                          },
                          {
                            label: t('worst'),
                            value: returns.worst,
                            color: 'from-red-600 to-rose-400',
                          },
                          {
                            label: t('volatility'),
                            value: returns.volatility ? returns.volatility * 100 : null,
                            color: 'from-purple-500 to-pink-400',
                          },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ scale: 1.03 }}
                            className="p-4 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 hover:border-cyan-500/30 transition-all"
                          >
                            <p
                              className={cn(
                                text('xs', 'sm'),
                                'text-muted-foreground font-medium mb-2',
                              )}
                            >
                              {item.label}
                            </p>
                            <p
                              className={cn(
                                text('lg', 'xl', 'font-bold'),
                                'bg-gradient-to-r text-transparent bg-clip-text',
                                item.color,
                              )}
                            >
                              {item.value != null ? `${item.value.toFixed(2)}%` : tc('na')}
                            </p>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { label: t('startPrice'), value: price.start },
                          { label: t('endPrice'), value: price.end },
                          { label: t('average'), value: price.average },
                          { label: 'High', value: price.high },
                          { label: 'Low', value: price.low },
                        ].map((item, idx) => (
                          <motion.div
                            key={idx}
                            whileHover={{ scale: 1.02 }}
                            className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-transparent border border-cyan-500/20"
                          >
                            <p
                              className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}
                            >
                              {item.label}
                            </p>
                            <p className={cn(text('xs', 'sm', 'font-bold'), 'mt-1')}>
                              {item.value != null ? formatPrice(item.value) : tc('na')}
                            </p>
                          </motion.div>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {[
                          {
                            label: t('drawdown'),
                            value: perf.drawdown ? perf.drawdown * 100 : null,
                            color: 'from-red-500 to-rose-400',
                            icon: TrendingDown,
                          },
                          {
                            label: t('sharpeRatio'),
                            value: perf.sharpeRatio,
                            color: 'from-blue-500 to-indigo-400',
                            icon: Zap,
                          },
                          {
                            label: t('winRate'),
                            value: perf.winRate,
                            color: 'from-emerald-500 to-green-400',
                            icon: Award,
                          },
                        ].map((item, idx) => {
                          const Icon = item.icon;
                          return (
                            <motion.div
                              key={idx}
                              whileHover={{ scale: 1.03 }}
                              className="p-4 rounded-2xl bg-gradient-to-br from-muted/30 to-muted/10 border border-border/50 hover:border-cyan-500/30 transition-all"
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <Icon className="w-4 h-4 text-cyan-500" />
                                <p
                                  className={cn(
                                    text('xs', 'sm'),
                                    'text-muted-foreground font-medium inline-flex items-center gap-1',
                                  )}
                                >
                                  {item.label}
                                  <UiTooltip
                                    trigger="click"
                                    content={
                                      <span
                                        className={cn(text('3xs', '2xs'), 'text-muted-foreground')}
                                      >
                                        {idx === 0
                                          ? tt('drawdown')
                                          : idx === 1
                                            ? tt('sharpeRatio')
                                            : tt('winRate')}
                                      </span>
                                    }
                                  >
                                    <Info className="w-3 h-3 text-muted-foreground/70" />
                                  </UiTooltip>
                                </p>
                              </div>
                              <p
                                className={cn(
                                  text('lg', 'xl', 'font-bold'),
                                  'bg-gradient-to-r text-transparent bg-clip-text',
                                  item.color,
                                )}
                              >
                                {item.value != null
                                  ? item.label === t('sharpeRatio')
                                    ? item.value.toFixed(2)
                                    : `${item.value.toFixed(item.label === t('winRate') ? 0 : 2)}%`
                                  : tc('na')}
                              </p>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
