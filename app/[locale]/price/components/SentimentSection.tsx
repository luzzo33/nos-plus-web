'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Gauge,
  TrendingUp,
  TrendingDown,
  AlertCircle,
  ChevronDown,
  Info,
  Activity,
  BarChart3,
  History,
  Brain,
  Target,
  Zap,
  Shield,
  ChevronRight,
  Eye,
  LineChart,
  Table,
  Sparkles,
  AlertTriangle,
  CheckCircle,
  Calendar,
} from 'lucide-react';
import { cn, getDateLocale } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations, useLocale } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import { apiClient, TimeRange } from '@/lib/api/client';
import { format } from 'date-fns';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadialBarChart,
  RadialBar,
  Legend,
  PolarAngleAxis,
} from 'recharts';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';

interface SentimentSectionProps {
  mounted: boolean;
}

type ViewType = 'current' | 'chart' | 'table' | 'stats';

const SENTIMENT_GRADIENTS = {
  extremeFear: 'from-red-600 to-red-400',
  fear: 'from-orange-600 to-orange-400',
  neutral: 'from-gray-600 to-gray-400',
  greed: 'from-emerald-600 to-emerald-400',
  extremeGreed: 'from-green-600 to-green-400',
};

const ZONE_COLORS = {
  extremeFear: '#dc2626',
  fear: '#ea580c',
  neutral: '#6b7280',
  greed: '#059669',
  extremeGreed: '#15803d',
};

export function SentimentSection({ mounted }: SentimentSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('price.sentiment');
  const tt = useTranslations('price.sentiment.tooltips');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [selectedView, setSelectedView] = useState<ViewType>('current');
  const [selectedRange, setSelectedRange] = useState<TimeRange>('30d');
  const [showMovingAverages, setShowMovingAverages] = useState(true);

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

  const { data: widgetData, isLoading: widgetLoading } = useQuery({
    queryKey: ['sentiment-widget'],
    queryFn: () => apiClient.getSentimentWidgetData(),
    enabled: mounted,
    staleTime: 60000,
  });

  const { data: chartData, isLoading: chartLoading } = useQuery({
    queryKey: ['sentiment-chart', selectedRange, showMovingAverages],
    queryFn: () =>
      apiClient.getSentimentChartData({
        range: selectedRange,
        includeComponents: true,
        ma: showMovingAverages ? '7,30' : undefined,
      }),
    enabled: mounted && selectedView === 'chart',
    staleTime: 300000,
  });

  const { data: tableData, isLoading: tableLoading } = useQuery({
    queryKey: ['sentiment-table', currentPage, pageSize, sortField, sortOrder, dateFilter],
    queryFn: () =>
      apiClient.getSentimentTableData({
        page: currentPage,
        limit: pageSize,
        sortBy: sortField === 'indexChange' ? 'date' : sortField,
        sortOrder: sortOrder,
        startDate: dateFilter.startDate || undefined,
        endDate: dateFilter.endDate || undefined,
      }),
    enabled: mounted && selectedView === 'table',
    staleTime: 300000,
  });

  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ['sentiment-stats', selectedRange],
    queryFn: () => apiClient.getSentimentStats({ range: selectedRange }),
    enabled: mounted && selectedView === 'stats',
    staleTime: 300000,
  });

  const getSentimentZone = (value: number) => {
    if (value <= 25) return 'extremeFear';
    if (value <= 45) return 'fear';
    if (value <= 55) return 'neutral';
    if (value <= 75) return 'greed';
    return 'extremeGreed';
  };

  const getSentimentColor = (value: number) => {
    const zone = getSentimentZone(value);
    return ZONE_COLORS[zone as keyof typeof ZONE_COLORS];
  };

  const views = [
    { id: 'current' as ViewType, label: t('viewCurrent'), icon: Gauge },
    { id: 'chart' as ViewType, label: t('viewChart'), icon: LineChart },
    { id: 'table' as ViewType, label: t('viewTable'), icon: Table },
    { id: 'stats' as ViewType, label: t('viewStats'), icon: BarChart3 },
  ];

  if (!mounted) return null;

  const widget = widgetData?.widget;
  const currentIndex = widget?.current?.index || 0;
  const currentZone = getSentimentZone(currentIndex as number);

  const fmt1 = (n: number | string | undefined) => {
    const v = typeof n === 'string' ? parseFloat(n) : n;
    return typeof v === 'number' && !isNaN(v) ? v.toFixed(1) : '-';
  };
  const fmt2 = (n: number | string | undefined) => {
    const v = typeof n === 'string' ? parseFloat(n) : n;
    return typeof v === 'number' && !isNaN(v) ? v.toFixed(2) : '-';
  };
  const toEN = (s?: string) => {
    if (!s) return '-';
    const L = s.toLowerCase();
    if (/(very\s*)?high|sehr|muy|molto|非常/.test(L)) return 'High';
    if (/medium|moderate|mittel|medio|中/.test(L)) return 'Moderate';
    if (/low|niedrig|bajo|bassa|低/.test(L)) return 'Low';
    if (/strong|stark|fuerte|forte|强/.test(L)) return 'Strong';
    if (/weak|schwach|débil|debole|弱/.test(L)) return 'Weak';
    if (/neutral|neutral|neutro|中性/.test(L)) return 'Neutral';
    return s.charAt(0).toUpperCase() + s.slice(1);
  };

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
                  <Brain className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h2 className={cn(text('lg', '2xl', 'font-bold'))}>{t('title')}</h2>
              </div>
              <p className={cn(text('xs', 'base'), 'text-muted-foreground')}>{t('subtitle')}</p>
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

      <div className="flex items-start gap-2 rounded-xl border border-amber-200/60 bg-amber-50/80 px-3 py-2 text-amber-900 shadow-sm dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <p className={cn(text('xs', 'sm'), 'leading-snug')}>{t('deprecatedNotice')}</p>
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
            {/* Main Sentiment Gauge Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-background/90 border backdrop-blur-xl">
              <div
                className={cn(
                  'absolute inset-0 bg-gradient-to-br opacity-15',
                  SENTIMENT_GRADIENTS[currentZone as keyof typeof SENTIMENT_GRADIENTS],
                )}
              />

              <div className="relative p-4 sm:p-6 lg:p-8">
                <div className="grid gap-5 lg:grid-cols-2 lg:gap-8">
                  {/* Left: Circular Gauge */}
                  <div className="flex flex-col items-center justify-center">
                    <div className="relative w-48 h-48 sm:w-56 sm:h-56 lg:w-64 lg:h-64 mx-auto">
                      {/* Animated Ring */}
                      <svg
                        viewBox="0 0 256 256"
                        preserveAspectRatio="xMidYMid meet"
                        className="block w-full h-full -rotate-90"
                      >
                        <circle
                          cx="128"
                          cy="128"
                          r="110"
                          stroke="currentColor"
                          strokeWidth="20"
                          fill="none"
                          className="text-muted/20"
                        />
                        <motion.circle
                          cx="128"
                          cy="128"
                          r="110"
                          stroke={getSentimentColor(currentIndex)}
                          strokeWidth="20"
                          fill="none"
                          strokeLinecap="round"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: (currentIndex as number) / 100 }}
                          transition={{ duration: 2, ease: 'easeInOut' }}
                          style={{
                            strokeDasharray: 691.15,
                            strokeDashoffset: 691.15 * (1 - (currentIndex as number) / 100),
                          }}
                        />
                      </svg>

                      {/* Center Content */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.5, type: 'spring' }}
                          className="text-center"
                        >
                          <p
                            className={cn(text('4xl', '5xl', 'font-bold'))}
                            style={{ color: getSentimentColor(currentIndex) }}
                          >
                            {fmt1(currentIndex)}
                          </p>
                          <p className={cn(text('sm', 'base'), 'text-muted-foreground mt-1')}>
                            {t('index')}
                          </p>
                        </motion.div>
                      </div>
                    </div>

                    {/* Sentiment Label */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                      className={cn(
                        'mt-4 sm:mt-6 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-gradient-to-r text-white font-semibold',
                        SENTIMENT_GRADIENTS[currentZone as keyof typeof SENTIMENT_GRADIENTS],
                      )}
                    >
                      <p className={text('sm', 'lg')}>{t(`zones.${currentZone}`)}</p>
                    </motion.div>
                  </div>

                  {/* Right: Insights */}
                  <div className="space-y-4 sm:space-y-6">
                    {/* Key Metrics */}
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      {[
                        {
                          label: t('change24h'),
                          value: (() => {
                            const p = widget?.changes?.['24h']?.percentage;
                            if (typeof p === 'number') {
                              const sign = p > 0 ? '+' : '';
                              return `${sign}${p.toFixed(1)}%`;
                            }
                            return widget?.changes?.['24h']?.display || '-';
                          })(),
                          icon:
                            widget?.changes?.['24h']?.trend === 'up' ? TrendingUp : TrendingDown,
                          color:
                            widget?.changes?.['24h']?.trend === 'up'
                              ? 'text-green-500'
                              : 'text-red-500',
                        },
                        {
                          label: t('volatility'),
                          value: fmt2(widget?.history?.extremes?.volatility),
                          icon: Activity,
                          color: 'text-primary',
                        },
                        {
                          label: t('trend'),
                          value: widget?.trend?.direction || '-',
                          icon: (() => {
                            const dir = widget?.trend?.direction?.toLowerCase();
                            const isUp = dir?.includes('up') || dir?.includes('bull');
                            return isUp ? TrendingUp : TrendingDown;
                          })(),
                          color: (() => {
                            const dir = widget?.trend?.direction?.toLowerCase();
                            const isUp = dir?.includes('up') || dir?.includes('bull');
                            return isUp ? 'text-green-500' : 'text-red-500';
                          })(),
                        },
                        {
                          label: t('strength'),
                          value: (() => {
                            if (typeof widget?.trend?.momentum === 'string')
                              return toEN(widget?.trend?.momentum);
                            if (widget?.trend?.strength != null)
                              return fmt1(widget?.trend?.strength);
                            return '-';
                          })(),
                          icon: Zap,
                          color: 'text-primary',
                        },
                      ].map((metric, idx) => {
                        const Icon = metric.icon as any;
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
                            {t('marketInsight')}
                          </h4>
                          <p
                            className={cn(
                              text('sm', 'base'),
                              'text-muted-foreground leading-relaxed',
                            )}
                          >
                            {widget?.interpretation?.primary}
                          </p>

                          {widget?.interpretation?.action && (
                            <div className="flex items-center gap-2 mt-3 p-3 bg-background/50 rounded-lg">
                              <Target className="w-4 h-4 text-primary" />
                              <p className={text('sm', 'base', 'font-medium')}>
                                {widget?.interpretation?.action}
                              </p>
                            </div>
                          )}

                          {/* Risk Level Badge */}
                          {widget?.interpretation?.riskLevel && (
                            <div className="flex items-center gap-2 mt-3">
                              <Shield
                                className={cn(
                                  'w-4 h-4',
                                  widget.interpretation.riskLevel === 'Very High'
                                    ? 'text-red-500'
                                    : widget.interpretation.riskLevel === 'High'
                                      ? 'text-orange-500'
                                      : widget.interpretation.riskLevel === 'Medium'
                                        ? 'text-yellow-500'
                                        : 'text-green-500',
                                )}
                              />
                              <span
                                className={cn(
                                  text('xs', 'sm'),
                                  'px-3 py-1 rounded-full font-medium',
                                  widget.interpretation.riskLevel === 'Very High'
                                    ? 'bg-red-500/10 text-red-500'
                                    : widget.interpretation.riskLevel === 'High'
                                      ? 'bg-orange-500/10 text-orange-500'
                                      : widget.interpretation.riskLevel === 'Medium'
                                        ? 'bg-yellow-500/10 text-yellow-500'
                                        : 'bg-green-500/10 text-green-500',
                                )}
                              >
                                {t('riskLevel')}: {widget.interpretation.riskLevel}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                </div>

                {/* Historical Zones - Enhanced Design */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-6 sm:mt-8 p-4 sm:p-6 bg-muted/20 rounded-xl border border-border/50"
                >
                  <h4
                    className={cn(
                      text('sm', 'lg', 'font-semibold'),
                      'mb-3 sm:mb-4 flex items-center gap-2',
                    )}
                  >
                    <History className="w-5 h-5 text-primary" />
                    {t('zoneDistribution')}
                  </h4>

                  <div className="space-y-4">
                    {widget?.history?.zoneDistribution &&
                      Object.entries(widget.history.zoneDistribution).map(
                        ([zone, data]: [string, any]) => {
                          const zoneKey = zone as keyof typeof ZONE_COLORS;
                          const percentage = parseFloat(String(data.percentage));
                          const count = (data.count ?? data.days) as number;
                          return (
                            <div key={zone} className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div
                                    className={cn(
                                      'w-2 h-8 rounded-full',
                                      `bg-gradient-to-b ${SENTIMENT_GRADIENTS[zoneKey]}`,
                                    )}
                                  />
                                  <div>
                                    <p className={text('sm', 'base', 'font-medium')}>
                                      {t(`zones.${zone}`)}
                                    </p>
                                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                      {count} {t('days')}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={text('sm', 'base', 'font-bold')}>
                                    {Number(percentage).toFixed(1)}%
                                  </p>
                                </div>
                              </div>

                              {/* Progress Bar */}
                              <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${Number(percentage)}%` }}
                                  transition={{ duration: 1, delay: 0.1 }}
                                  className={cn(
                                    'absolute inset-y-0 left-0 rounded-full bg-gradient-to-r',
                                    SENTIMENT_GRADIENTS[zoneKey],
                                  )}
                                />
                              </div>
                            </div>
                          );
                        },
                      )}
                  </div>
                </motion.div>
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
            className="space-y-4"
          >
            {/* Time Range Selector */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1.5 sm:gap-2">
                {(['7d', '30d', '90d', '180d', '1y', 'all'] as TimeRange[]).map((range) => (
                  <button
                    key={range}
                    onClick={() => setSelectedRange(range)}
                    className={cn(
                      'px-3 sm:px-4 py-2 rounded-lg font-medium transition-all',
                      text('xs', 'sm'),
                      selectedRange === range
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'bg-muted/50 text-muted-foreground hover:bg-muted',
                    )}
                  >
                    {tc(`timeRanges.${range}`)}
                  </button>
                ))}
              </div>

              <button
                onClick={() => setShowMovingAverages(!showMovingAverages)}
                className={cn(
                  'px-4 py-2 rounded-lg font-medium transition-all',
                  text('xs', 'sm'),
                  showMovingAverages
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted/50 text-muted-foreground',
                )}
              >
                MA {showMovingAverages ? t('on') : t('off')}
              </button>
            </div>

            {/* Chart Card */}
            <div className="card-base p-4 sm:p-6">
              {chartLoading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="animate-pulse text-muted-foreground">{tc('loading')}</div>
                </div>
              ) : chartData?.chart?.data ? (
                <>
                  <ResponsiveContainer width="100%" height={400}>
                    {(() => {
                      const raw =
                        chartData?.chart?.data || (chartData as any)?.data?.chart?.data || [];
                      const data = raw.map((d: any) => ({ ...d, date: d.date ?? d.timestamp }));
                      const CustomTooltip = ({ active, payload, label }: any) => {
                        if (!active || !payload?.length) return null;
                        const nameMap: Record<string, string> = {
                          index: t('index'),
                          ma7: t('ma7'),
                          ma30: t('ma30'),
                        };
                        return (
                          <div className="rounded-md border border-border/60 bg-background/95 backdrop-blur px-3 py-2 shadow-lg">
                            <div className="text-xs text-muted-foreground mb-1">
                              {format(new Date(label), 'PPP', { locale: getDateLocale(locale) })}
                            </div>
                            {payload.map((p: any, i: number) => (
                              <div key={i} className="flex items-center gap-2 text-xs">
                                <span
                                  className="inline-block w-2 h-2 rounded-full"
                                  style={{ backgroundColor: p.color }}
                                />
                                <span className="min-w-[70px] text-muted-foreground">
                                  {nameMap[p.name] || p.name}
                                </span>
                                <span className="font-medium">{Number(p.value).toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        );
                      };
                      return (
                        <AreaChart data={data}>
                          <defs>
                            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop
                                offset="5%"
                                stopColor={getSentimentColor(currentIndex)}
                                stopOpacity={0.3}
                              />
                              <stop
                                offset="95%"
                                stopColor={getSentimentColor(currentIndex)}
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" />
                          <XAxis
                            dataKey="date"
                            tickFormatter={(date) =>
                              format(new Date(date), 'MMM dd', { locale: getDateLocale(locale) })
                            }
                            className="text-xs"
                          />
                          <YAxis domain={[0, 100]} className="text-xs" />
                          <Tooltip content={<CustomTooltip />} />
                          <ReferenceLine
                            y={50}
                            stroke="hsl(var(--muted-foreground))"
                            strokeDasharray="3 3"
                          />
                          <Area
                            type="monotone"
                            dataKey="index"
                            name="index"
                            stroke={getSentimentColor(currentIndex)}
                            strokeWidth={2}
                            fill="url(#sentimentGradient)"
                          />
                          {showMovingAverages && (
                            <>
                              <Area
                                type="monotone"
                                dataKey="ma7"
                                name="ma7"
                                stroke="hsl(var(--primary))"
                                strokeWidth={1}
                                fill="none"
                                strokeDasharray="5 5"
                              />
                              <Area
                                type="monotone"
                                dataKey="ma30"
                                name="ma30"
                                stroke="hsl(var(--muted-foreground))"
                                strokeWidth={1}
                                fill="none"
                                strokeDasharray="5 5"
                              />
                            </>
                          )}
                        </AreaChart>
                      );
                    })()}
                  </ResponsiveContainer>
                  {/* Legend */}
                  <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4 text-[11px] sm:text-xs text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-sm"
                        style={{ backgroundColor: getSentimentColor(currentIndex as number) }}
                      />
                      {t('index')}
                    </div>
                    {showMovingAverages && (
                      <>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-sm"
                            style={{ backgroundColor: 'hsl(var(--primary))' }}
                          />
                          {t('ma7')}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-sm"
                            style={{ backgroundColor: 'hsl(var(--muted-foreground))' }}
                          />
                          {t('ma30')}
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

      {/* Table View - Enhanced Mobile Responsive */}
      {selectedView === 'table' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {/* Table Controls */}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setDateFilter({ ...dateFilter, startDate: e.target.value });
                  }}
                  className="px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => {
                    setCurrentPage(1);
                    setDateFilter({ ...dateFilter, endDate: e.target.value });
                  }}
                  className="px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-sm"
                />
              </div>
              <div className="relative">
                <label className="text-sm text-muted-foreground mr-2">{tc('table.pageSize')}</label>
                <button
                  onClick={() => setPageSizeOpen((o) => !o)}
                  className="px-3 py-2 rounded-lg bg-muted/40 border border-border/50 text-sm flex items-center gap-2"
                >
                  {pageSize}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {pageSizeOpen && (
                  <div className="absolute right-0 z-20 mt-2 w-28 rounded-md border border-border/60 bg-background shadow-lg">
                    {[10, 20, 50, 100].map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setCurrentPage(1);
                          setPageSize(s);
                          setPageSizeOpen(false);
                        }}
                        className={cn('w-full text-left px-3 py-2 text-sm hover:bg-muted')}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Card Layout + Desktop Table */}
            <div className="card-base">
              {/* Mobile View - Cards */}
              <div className="sm:hidden space-y-3 p-4">
                {tableLoading ? (
                  <div className="text-center py-8 text-muted-foreground">{tc('loading')}</div>
                ) : (
                  (() => {
                    const rawRows = (tableData as any)?.table?.rows?.data || [];
                    const rows =
                      sortField === 'indexChange'
                        ? [...rawRows].sort((a: any, b: any) =>
                            sortOrder === 'ASC'
                              ? a.indexChange - b.indexChange
                              : b.indexChange - a.indexChange,
                          )
                        : rawRows;
                    return rows.map((row: any, idx: number) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.02 }}
                        className="bg-muted/20 rounded-lg p-4 space-y-3 border border-border/50"
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className={cn(text('sm', 'base', 'font-medium'))}>
                              {format(new Date(row.date), 'MMM dd, yyyy', {
                                locale: getDateLocale(locale),
                              })}
                            </p>
                            <div className="mt-1">
                              <span
                                className={cn(
                                  'inline-flex px-2 py-0.5 rounded-full text-xs font-medium text-white',
                                  `bg-gradient-to-r ${SENTIMENT_GRADIENTS[getSentimentZone(row.index) as keyof typeof SENTIMENT_GRADIENTS]}`,
                                )}
                              >
                                {t(`zones.${getSentimentZone(row.index)}`)}
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <p
                              className={cn(text('xl', '2xl', 'font-bold'))}
                              style={{ color: getSentimentColor(row.index) }}
                            >
                              {fmt1(row.index)}
                            </p>
                            <div
                              className={cn(
                                'flex items-center justify-end gap-1 mt-1',
                                text('sm', 'base', 'font-medium'),
                                (row.indexChange || row?.display?.indexChange?.value || 0) > 0
                                  ? 'text-green-500'
                                  : (row.indexChange || row?.display?.indexChange?.value || 0) < 0
                                    ? 'text-red-500'
                                    : '',
                              )}
                            >
                              {(row.indexChange || row?.display?.indexChange?.value || 0) > 0 ? (
                                <TrendingUp className="w-4 h-4" />
                              ) : (row.indexChange || row?.display?.indexChange?.value || 0) < 0 ? (
                                <TrendingDown className="w-4 h-4" />
                              ) : (
                                <div className="w-4 h-4 bg-muted rounded-full" />
                              )}
                              {(() => {
                                const v = row.indexChange ?? row?.display?.indexChange?.value;
                                if (typeof v === 'number') {
                                  const sign = v > 0 ? '+' : '';
                                  return `${sign}${v.toFixed(1)}`;
                                }
                                return v ?? '0';
                              })()}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    ));
                  })()
                )}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden sm:block overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th
                        onClick={() => {
                          setCurrentPage(1);
                          setSortField('date');
                          setSortOrder((prev) =>
                            sortField === 'date' ? (prev === 'ASC' ? 'DESC' : 'ASC') : 'DESC',
                          );
                        }}
                        className={cn(
                          'px-6 py-4 text-left cursor-pointer select-none',
                          text('xs', 'sm', 'font-semibold'),
                        )}
                      >
                        <div className="flex items-center gap-1">
                          <span>{tc('date')}</span>
                          <ChevronDown
                            className={cn(
                              'w-3 h-3 transition-transform',
                              sortField === 'date' && sortOrder === 'ASC' && 'rotate-180',
                            )}
                          />
                        </div>
                      </th>
                      <th
                        onClick={() => {
                          setCurrentPage(1);
                          setSortField('index');
                          setSortOrder((prev) =>
                            sortField === 'index' ? (prev === 'ASC' ? 'DESC' : 'ASC') : 'DESC',
                          );
                        }}
                        className={cn(
                          'px-6 py-4 text-right cursor-pointer select-none',
                          text('xs', 'sm', 'font-semibold'),
                        )}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{t('index')}</span>
                          <ChevronDown
                            className={cn(
                              'w-3 h-3 transition-transform',
                              sortField === 'index' && sortOrder === 'ASC' && 'rotate-180',
                            )}
                          />
                        </div>
                      </th>
                      <th
                        className={cn('px-6 py-4 text-center', text('xs', 'sm', 'font-semibold'))}
                      >
                        {t('sentiment')}
                      </th>
                      <th
                        onClick={() => {
                          setCurrentPage(1);
                          setSortField('indexChange');
                          setSortOrder((prev) =>
                            sortField === 'indexChange'
                              ? prev === 'ASC'
                                ? 'DESC'
                                : 'ASC'
                              : 'DESC',
                          );
                        }}
                        className={cn(
                          'px-6 py-4 text-right cursor-pointer select-none',
                          text('xs', 'sm', 'font-semibold'),
                        )}
                      >
                        <div className="flex items-center justify-end gap-1">
                          <span>{t('change')}</span>
                          <ChevronDown
                            className={cn(
                              'w-3 h-3 transition-transform',
                              sortField === 'indexChange' && sortOrder === 'ASC' && 'rotate-180',
                            )}
                          />
                        </div>
                      </th>
                      <th
                        className={cn('px-6 py-4 text-center', text('xs', 'sm', 'font-semibold'))}
                      >
                        {t('trend')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableLoading ? (
                      <tr>
                        <td colSpan={5} className="text-center py-8 text-muted-foreground">
                          {tc('loading')}
                        </td>
                      </tr>
                    ) : (
                      (() => {
                        const rawRows = (tableData as any)?.table?.rows?.data || [];
                        const rows =
                          sortField === 'indexChange'
                            ? [...rawRows].sort((a: any, b: any) =>
                                sortOrder === 'ASC'
                                  ? a.indexChange - b.indexChange
                                  : b.indexChange - a.indexChange,
                              )
                            : rawRows;
                        return rows.map((row: any, idx: number) => (
                          <motion.tr
                            key={idx}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.02 }}
                            className="border-b hover:bg-muted/30 transition-colors"
                          >
                            <td className={cn('px-6 py-4', text('sm', 'base'))}>
                              {format(new Date(row.date), 'MMM dd, yyyy', {
                                locale: getDateLocale(locale),
                              })}
                            </td>
                            <td
                              className={cn(
                                'px-6 py-4 text-right font-semibold',
                                text('sm', 'base'),
                              )}
                            >
                              <span style={{ color: getSentimentColor(row.index) }}>
                                {fmt1(row.index)}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-center">
                              <span
                                className={cn(
                                  'inline-flex px-3 py-1 rounded-full text-xs font-medium text-white',
                                  `bg-gradient-to-r ${SENTIMENT_GRADIENTS[getSentimentZone(row.index) as keyof typeof SENTIMENT_GRADIENTS]}`,
                                )}
                              >
                                {t(`zones.${getSentimentZone(row.index)}`)}
                              </span>
                            </td>
                            <td
                              className={cn(
                                'px-6 py-4 text-right font-medium',
                                text('sm', 'base'),
                                (row.indexChange || row?.display?.indexChange?.value || 0) > 0
                                  ? 'text-green-500'
                                  : (row.indexChange || row?.display?.indexChange?.value || 0) < 0
                                    ? 'text-red-500'
                                    : '',
                              )}
                            >
                              {(() => {
                                const v = row.indexChange ?? row?.display?.indexChange?.value;
                                if (typeof v === 'number') {
                                  const sign = v > 0 ? '+' : '';
                                  return `${sign}${v.toFixed(1)}`;
                                }
                                return v ?? '0';
                              })()}
                            </td>
                            <td className="px-6 py-4 text-center">
                              {(row.indexChange || row?.display?.indexChange?.value || 0) > 0 ? (
                                <TrendingUp className="w-5 h-5 text-green-500 mx-auto" />
                              ) : (row.indexChange || row?.display?.indexChange?.value || 0) < 0 ? (
                                <TrendingDown className="w-5 h-5 text-red-500 mx-auto" />
                              ) : (
                                <div className="w-5 h-5 mx-auto bg-muted rounded-full" />
                              )}
                            </td>
                          </motion.tr>
                        ));
                      })()
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {(() => {
                const p =
                  (tableData as any)?.pagination || (tableData as any)?.table?.rows?.pagination;
                if (!p) return null;
                const total = p.total ?? 0;
                const page = p.page ?? currentPage;
                const limit = p.limit ?? pageSize;
                const totalPages = p.totalPages ?? Math.ceil((total || 0) / (limit || 1));
                return (
                  <div className="px-4 sm:px-6 py-4 border-t bg-muted/20 flex items-center justify-between">
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {tc('showing')} {total ? (page - 1) * limit + 1 : 0} {tc('to')}{' '}
                      {Math.min(page * limit, total)} {tc('of')} {total}
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, page - 1))}
                        disabled={page <= 1}
                        className={cn(
                          'px-3 py-2 rounded-lg transition-all',
                          text('xs', 'sm'),
                          page <= 1
                            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            : 'bg-muted hover:bg-muted/70',
                        )}
                      >
                        {tc('previous')}
                      </button>
                      <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                        {page} / {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(Math.min(totalPages, page + 1))}
                        disabled={page >= totalPages}
                        className={cn(
                          'px-3 py-2 rounded-lg transition-all',
                          text('xs', 'sm'),
                          page >= totalPages
                            ? 'bg-muted/30 text-muted-foreground cursor-not-allowed'
                            : 'bg-muted hover:bg-muted/70',
                        )}
                      >
                        {tc('next')}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Stats View - Modern Enhanced Visualization */}
      {selectedView === 'stats' && statsData?.stats && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6 lg:space-y-8"
          >
            {/* Floating Range Selector */}
            <div className="flex justify-end">
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

            {/* Hero Metrics Grid - Fixed Current Index Display */}
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              {[
                {
                  label: t('currentIndex'),
                  value: statsData.stats.current?.latest?.index || 0,
                  sentiment: statsData.stats.current?.latest?.sentiment,
                  icon: Gauge,
                  gradient:
                    SENTIMENT_GRADIENTS[
                      getSentimentZone(
                        statsData.stats.current?.latest?.index || 0,
                      ) as keyof typeof SENTIMENT_GRADIENTS
                    ],
                  bgColor: 'from-purple-900/20 via-purple-600/10 to-transparent',
                },
                {
                  label: t('averageIndex'),
                  value: statsData.stats.historical?.central?.mean || 0,
                  icon: BarChart3,
                  gradient: 'from-blue-600 to-cyan-400',
                  bgColor: 'from-blue-900/20 via-blue-600/10 to-transparent',
                },
                {
                  label: t('highestGreed'),
                  value: statsData.stats.historical?.range?.max || 0,
                  icon: TrendingUp,
                  gradient: 'from-emerald-600 to-emerald-400',
                  bgColor: 'from-emerald-900/20 via-emerald-600/10 to-transparent',
                },
                {
                  label: t('highestFear'),
                  value: statsData.stats.historical?.range?.min || 0,
                  icon: TrendingDown,
                  gradient: 'from-red-600 to-orange-400',
                  bgColor: 'from-red-900/20 via-red-600/10 to-transparent',
                },
              ].map((metric, idx) => {
                const Icon = metric.icon as any;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1, type: 'spring', stiffness: 100 }}
                    className="relative"
                  >
                    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/90 to-background/50 backdrop-blur-xl border border-white/10 shadow">
                      <div className="relative p-4 sm:p-6 space-y-3 sm:space-y-4">
                        <div className="flex items-center justify-between">
                          <div
                            className={cn(
                              'p-2.5 sm:p-3 rounded-xl bg-gradient-to-br shadow',
                              (metric as any).gradient,
                            )}
                          >
                            <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                          </div>
                          <span
                            className={cn(text('xs', 'sm'), 'text-muted-foreground/80 font-medium')}
                          >
                            {(metric as any).label}
                          </span>
                        </div>
                        <div className="flex items-baseline gap-2">
                          <p
                            className={cn(
                              text('2xl', '4xl', 'font-bold'),
                              'bg-gradient-to-br text-transparent bg-clip-text',
                              (metric as any).gradient,
                            )}
                          >
                            {Number((metric as any).value).toFixed(1)}
                          </p>
                          {(metric as any).sentiment && (
                            <p className={cn(text('xs', 'sm'), 'text-muted-foreground/60 italic')}>
                              • {(metric as any).sentiment}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Distribution Visualization with Improved Donut Chart */}
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/95 via-background/85 to-background/75 backdrop-blur-xl border border-white/10 shadow"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
              <div className="relative p-4 sm:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 backdrop-blur">
                    <PieChart className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className={cn(text('lg', 'xl', 'font-bold'), 'flex items-center gap-2')}>
                    {t('sentimentDistribution')}
                    <UiTooltip
                      trigger="click"
                      content={
                        <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                          {tt('zoneDistribution')}
                        </span>
                      }
                    >
                      <Info className="w-3 h-3 text-muted-foreground/80" />
                    </UiTooltip>
                  </h3>
                </div>

                <div className="grid lg:grid-cols-2 gap-6 lg:gap-8">
                  {/* Donut Chart - Filtered and Styled */}
                  <div className="relative">
                    {statsData.stats.historical?.zoneOccupancy && (
                      <ResponsiveContainer width="100%" height={300}>
                        {(() => {
                          const zd = statsData.stats.historical.zoneOccupancy;
                          const pie = Object.entries(zd)
                            .map(([zone, data]: [string, any]) => {
                              const pct = parseFloat(String((data as any)?.percentage ?? 0));
                              return {
                                key: zone,
                                name: t(`zones.${zone}`),
                                value: isNaN(pct) ? 0 : pct,
                              };
                            })
                            .filter((item) => item.value > 0);

                          const CustomLabel = ({
                            cx,
                            cy,
                            midAngle,
                            innerRadius,
                            outerRadius,
                            percent,
                          }: any) => {
                            if (percent < 0.05) return null;
                            const RADIAN = Math.PI / 180;
                            const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                            const x = cx + radius * Math.cos(-midAngle * RADIAN);
                            const y = cy + radius * Math.sin(-midAngle * RADIAN);
                            return (
                              <text
                                x={x}
                                y={y}
                                fill="white"
                                textAnchor={x > cx ? 'start' : 'end'}
                                dominantBaseline="central"
                                className="text-xs font-bold"
                              >
                                {`${(percent * 100).toFixed(0)}%`}
                              </text>
                            );
                          };

                          const CustomTooltip = ({ active, payload }: any) => {
                            if (active && payload && payload[0]) {
                              return (
                                <div className="rounded-lg border border-border bg-background/95 backdrop-blur p-3 shadow-lg">
                                  <p className="text-sm font-semibold text-foreground">
                                    {payload[0].name}
                                  </p>
                                  <p className="text-sm text-muted-foreground">{`${payload[0].value.toFixed(1)}%`}</p>
                                </div>
                              );
                            }
                            return null;
                          };

                          return (
                            <PieChart>
                              <Pie
                                data={pie}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={CustomLabel}
                                innerRadius={60}
                                outerRadius={110}
                                dataKey="value"
                                startAngle={90}
                                endAngle={450}
                              >
                                {pie.map((p, i) => (
                                  <Cell
                                    key={`cell-${i}`}
                                    fill={ZONE_COLORS[p.key as keyof typeof ZONE_COLORS]}
                                    stroke="transparent"
                                  />
                                ))}
                              </Pie>
                              <Tooltip content={<CustomTooltip />} />
                            </PieChart>
                          );
                        })()}
                      </ResponsiveContainer>
                    )}
                  </div>
                  {/* Legend with Progress Bars */}
                  <div className="space-y-4 flex flex-col justify-center">
                    {statsData.stats.historical?.zoneOccupancy &&
                      Object.entries(statsData.stats.historical.zoneOccupancy)
                        .filter(
                          ([_, data]: [string, any]) =>
                            parseFloat(String((data as any)?.percentage ?? 0)) > 0,
                        )
                        .map(([zone, data]: [string, any]) => {
                          const percentage = parseFloat(String((data as any)?.percentage ?? 0));
                          const zoneKey = zone as keyof typeof ZONE_COLORS;
                          return (
                            <div key={zone} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div
                                    className="w-4 h-4 rounded-full shadow-md"
                                    style={{ backgroundColor: ZONE_COLORS[zoneKey] }}
                                  />
                                  <span className={text('sm', 'base', 'font-medium')}>
                                    {t(`zones.${zone}`)}
                                  </span>
                                </div>
                                <span
                                  className={cn(
                                    text('sm', 'base', 'font-bold'),
                                    'text-foreground/80',
                                  )}
                                >
                                  {percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${percentage}%` }}
                                  transition={{ duration: 1, delay: 0.1 }}
                                  className="absolute inset-y-0 left-0 rounded-full shadow-sm"
                                  style={{ backgroundColor: ZONE_COLORS[zoneKey] }}
                                />
                              </div>
                            </div>
                          );
                        })}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* 7-Day Metrics - Glass Cards */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4"
            >
              {(() => {
                const ctx = statsData.stats.current?.context || {};
                const items = [
                  {
                    label: t('metrics7d.average'),
                    value: ctx.avg7d,
                    icon: Activity,
                    color: 'from-blue-500 to-blue-600',
                  },
                  {
                    label: t('metrics7d.maximum'),
                    value: ctx.max7d,
                    icon: TrendingUp,
                    color: 'from-emerald-500 to-emerald-600',
                  },
                  {
                    label: t('metrics7d.minimum'),
                    value: ctx.min7d,
                    icon: TrendingDown,
                    color: 'from-red-500 to-red-600',
                  },
                  {
                    label: t('metrics7d.volatility'),
                    value: ctx.volatility7d,
                    decimals: 2,
                    icon: Zap,
                    color: 'from-purple-500 to-purple-600',
                  },
                ];
                return items.map((it, i) => {
                  const Icon = it.icon as any;
                  return (
                    <div key={i} className="relative">
                      <div className="relative bg-background/60 backdrop-blur-xl rounded-xl border border-white/10 p-3 sm:p-4 shadow">
                        <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                          <Icon
                            className={cn(
                              'w-4 h-4 bg-gradient-to-br text-transparent bg-clip-text',
                              it.color,
                            )}
                          />
                          <span
                            className={cn(text('xs', 'sm'), 'text-muted-foreground/70 font-medium')}
                          >
                            {it.label}
                          </span>
                        </div>
                        <p
                          className={cn(
                            text('xl', '3xl', 'font-bold'),
                            'bg-gradient-to-br text-transparent bg-clip-text',
                            it.color,
                          )}
                        >
                          {typeof it.value === 'number'
                            ? it.decimals === 2
                              ? it.value.toFixed(2)
                              : it.value.toFixed(1)
                            : '-'}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </motion.div>

            {/* Info Cards Row - Modern Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Period Card */}
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/95 to-background/85 backdrop-blur-xl border border-white/10 shadow"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-transparent" />
                <div className="relative p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-600/20">
                      <History className="w-5 h-5 text-blue-500" />
                    </div>
                    <h3 className={cn(text('base', 'lg', 'font-bold'), 'flex items-center gap-2')}>
                      {t('analysisPeriod')}
                      <UiTooltip
                        trigger="click"
                        content={
                          <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                            {tt('metrics7d')}
                          </span>
                        }
                      >
                        <Info className="w-3 h-3 text-muted-foreground/80" />
                      </UiTooltip>
                    </h3>
                  </div>
                  {(() => {
                    const p = statsData.stats.period || ({} as any);
                    return (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className={cn(text('xs', 'sm'), 'text-muted-foreground/70')}>
                            {t('startDate')}
                          </p>
                          <p className={cn(text('sm', 'base', 'font-semibold'))}>
                            {p.start
                              ? format(new Date(p.start), 'MMM dd, yyyy', {
                                  locale: getDateLocale(locale),
                                })
                              : '-'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className={cn(text('xs', 'sm'), 'text-muted-foreground/70')}>
                            {t('endDate')}
                          </p>
                          <p className={cn(text('sm', 'base', 'font-semibold'))}>
                            {p.end
                              ? format(new Date(p.end), 'MMM dd, yyyy', {
                                  locale: getDateLocale(locale),
                                })
                              : '-'}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className={cn(text('xs', 'sm'), 'text-muted-foreground/70')}>
                            {t('totalDays')}
                          </p>
                          <p className={cn(text('sm', 'base', 'font-semibold'))}>{p.days ?? '-'}</p>
                        </div>
                        <div className="space-y-1">
                          <p className={cn(text('xs', 'sm'), 'text-muted-foreground/70')}>
                            {t('dataPoints')}
                          </p>
                          <p className={cn(text('sm', 'base', 'font-semibold'))}>
                            {statsData.stats.historical?.dataPoints ?? '-'}
                          </p>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>

              {/* Data Quality Card */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/95 to-background/85 backdrop-blur-xl border border-white/10 shadow"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 via-transparent to-transparent" />
                <div className="relative p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-3 sm:mb-4">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-emerald-600/20">
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    </div>
                    <h3 className={cn(text('base', 'lg', 'font-bold'), 'flex items-center gap-2')}>
                      {t('dataQuality')}
                      <UiTooltip
                        trigger="click"
                        content={
                          <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                            {tt('dataQuality')}
                          </span>
                        }
                      >
                        <Info className="w-3 h-3 text-muted-foreground/80" />
                      </UiTooltip>
                    </h3>
                  </div>
                  {(() => {
                    const dq = statsData.stats.dataQuality || ({} as any);
                    return (
                      <div className="space-y-4">
                        {/* Coverage with Progress Bar */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <p className={cn(text('sm', 'base'))}>{t('coverage')}</p>
                            <p className={cn(text('sm', 'base', 'font-semibold text-emerald-500'))}>
                              {typeof dq.coverage === 'number' ? `${dq.coverage}%` : '-'}
                            </p>
                          </div>
                          {typeof dq.coverage === 'number' && (
                            <div className="relative h-2 bg-muted/30 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${dq.coverage}%` }}
                                transition={{ duration: 1 }}
                                className="absolute inset-y-0 left-0 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full"
                              />
                            </div>
                          )}
                        </div>
                        {/* Completeness Badge */}
                        <div className="flex items-center justify-between">
                          <p className={cn(text('sm', 'base'))}>{t('completeness')}</p>
                          <span
                            className={cn(
                              'px-3 py-1 rounded-full text-xs font-medium',
                              dq.completeness === 'High'
                                ? 'bg-emerald-500/20 text-emerald-500'
                                : dq.completeness === 'Medium'
                                  ? 'bg-yellow-500/20 text-yellow-500'
                                  : 'bg-red-500/20 text-red-500',
                            )}
                          >
                            {dq.completeness || '-'}
                          </span>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>

            {/* Weekly Patterns - Responsive Mobile Cards */}
            {statsData.stats.patterns?.daily?.data?.length ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/95 to-background/85 backdrop-blur-xl border border-white/10 shadow"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent" />
                <div className="relative p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-violet-500/20 to-violet-600/20">
                      <Calendar className="w-5 h-5 text-violet-500" />
                    </div>
                    <h3 className={cn(text('base', 'lg', 'font-bold'), 'flex items-center gap-2')}>
                      {t('weeklyPatternAnalysis')}
                      <UiTooltip
                        trigger="click"
                        content={
                          <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                            {tt('metrics7d')}
                          </span>
                        }
                      >
                        <Info className="w-3 h-3 text-muted-foreground/80" />
                      </UiTooltip>
                    </h3>
                  </div>

                  {/* Mobile Card View */}
                  <div className="block sm:hidden space-y-3">
                    {(statsData.stats.patterns.daily.data as any[]).map((d, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className="bg-muted/20 rounded-lg p-4 border border-border/50"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <p className={cn(text('sm', 'base', 'font-semibold'))}>{d.dayOfWeek}</p>
                          <span
                            className={cn(
                              'inline-flex px-2 py-0.5 rounded-full text-xs font-bold text-white',
                              `bg-gradient-to-r ${SENTIMENT_GRADIENTS[getSentimentZone(d.avgIndex) as keyof typeof SENTIMENT_GRADIENTS]}`,
                            )}
                          >
                            {d.sentiment}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-1')}>
                              {t('index')}
                            </p>
                            <p
                              className={cn(
                                text('lg', 'xl', 'font-bold'),
                                'text-transparent bg-clip-text bg-gradient-to-br',
                                SENTIMENT_GRADIENTS[
                                  getSentimentZone(d.avgIndex) as keyof typeof SENTIMENT_GRADIENTS
                                ],
                              )}
                            >
                              {typeof d.avgIndex === 'number' ? d.avgIndex.toFixed(1) : '-'}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-1')}>
                              {t('volatility')}
                            </p>
                            <p
                              className={cn(
                                text('sm', 'base', 'font-semibold'),
                                d.volatility > 20
                                  ? 'text-red-500'
                                  : d.volatility > 10
                                    ? 'text-yellow-500'
                                    : 'text-green-500',
                              )}
                            >
                              {typeof d.volatility === 'number' ? d.volatility.toFixed(1) : '-'}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/10">
                          <th
                            className={cn(
                              'px-4 py-3 text-left',
                              text('sm', 'base', 'font-semibold text-muted-foreground'),
                            )}
                          >
                            {t('day')}
                          </th>
                          <th
                            className={cn(
                              'px-4 py-3 text-center',
                              text('sm', 'base', 'font-semibold text-muted-foreground'),
                            )}
                          >
                            {t('index')}
                          </th>
                          <th
                            className={cn(
                              'px-4 py-3 text-center',
                              text('sm', 'base', 'font-semibold text-muted-foreground'),
                            )}
                          >
                            {t('sentiment')}
                          </th>
                          <th
                            className={cn(
                              'px-4 py-3 text-center',
                              text('sm', 'base', 'font-semibold text-muted-foreground'),
                            )}
                          >
                            {t('volatility')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {(statsData.stats.patterns.daily.data as any[]).map((d, i) => (
                          <motion.tr
                            key={i}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="border-b border-white/5 hover:bg-white/5 transition-colors"
                          >
                            <td className={cn('px-4 py-4', text('sm', 'base', 'font-medium'))}>
                              {d.dayOfWeek}
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span
                                className={cn(
                                  text('sm', 'base', 'font-bold'),
                                  'text-transparent bg-clip-text bg-gradient-to-br',
                                  SENTIMENT_GRADIENTS[
                                    getSentimentZone(d.avgIndex) as keyof typeof SENTIMENT_GRADIENTS
                                  ],
                                )}
                              >
                                {typeof d.avgIndex === 'number' ? d.avgIndex.toFixed(1) : '-'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-center">
                              <span
                                className={cn(
                                  'inline-flex px-3 py-1 rounded-full text-xs font-bold text-white',
                                  `bg-gradient-to-r ${SENTIMENT_GRADIENTS[getSentimentZone(d.avgIndex) as keyof typeof SENTIMENT_GRADIENTS]}`,
                                )}
                              >
                                {d.sentiment}
                              </span>
                            </td>
                            <td className={cn('px-4 py-4 text-center', text('sm', 'base'))}>
                              <span
                                className={cn(
                                  'font-semibold',
                                  d.volatility > 20
                                    ? 'text-red-500'
                                    : d.volatility > 10
                                      ? 'text-yellow-500'
                                      : 'text-green-500',
                                )}
                              >
                                {typeof d.volatility === 'number' ? d.volatility.toFixed(1) : '-'}
                              </span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : null}

            {/* Zone Transitions Matrix - Mobile Responsive */}
            {statsData.stats.transitions?.probabilities ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background/95 to-background/85 backdrop-blur-xl border border-white/10 shadow"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-pink-500/5 via-transparent to-transparent" />
                <div className="relative p-4 sm:p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 rounded-lg bg-gradient-to-br from-pink-500/20 to-pink-600/20">
                      <ChevronRight className="w-5 h-5 text-pink-500" />
                    </div>
                    <h3 className={cn(text('base', 'lg', 'font-bold'), 'flex items-center gap-2')}>
                      {t('transitionMatrix')}
                      <UiTooltip
                        trigger="click"
                        content={
                          <span className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                            {tt('transitionMatrix')}
                          </span>
                        }
                      >
                        <Info className="w-3 h-3 text-muted-foreground/80" />
                      </UiTooltip>
                    </h3>
                  </div>
                  <p className={cn(text('sm', 'base'), 'text-muted-foreground mb-4')}>
                    {t('transitionDescription')}
                  </p>

                  {/* Mobile Card View */}
                  <div className="sm:hidden space-y-4">
                    {(() => {
                      const probs = statsData.stats.transitions.probabilities as any;
                      const ZONES = ['extremeFear', 'fear', 'neutral', 'greed', 'extremeGreed'];
                      return ZONES.map((from) => (
                        <div
                          key={from}
                          className="bg-muted/20 rounded-lg p-4 border border-border/50"
                        >
                          <p
                            className={cn(
                              text('sm', 'base', 'font-semibold mb-3'),
                              'text-transparent bg-clip-text bg-gradient-to-r',
                            )}
                            style={{
                              backgroundImage: `linear-gradient(to right, ${ZONE_COLORS[from as keyof typeof ZONE_COLORS]}, ${ZONE_COLORS[from as keyof typeof ZONE_COLORS]})`,
                            }}
                          >
                            {tc('from')}: {t(`zones.${from}`)}
                          </p>
                          <div className="grid grid-cols-2 gap-2">
                            {ZONES.map((to) => {
                              const v = Number(probs?.[from]?.[to] ?? 0);
                              if (v === 0) return null;
                              return (
                                <div
                                  key={to}
                                  className="flex justify-between items-center p-2 bg-background/50 rounded"
                                >
                                  <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                                    {t(`zones.${to}`).split(' ')[1] || t(`zones.${to}`)}
                                  </span>
                                  <span
                                    className={cn(
                                      'text-xs font-bold',
                                      v > 30
                                        ? 'text-pink-400'
                                        : v > 15
                                          ? 'text-foreground'
                                          : 'text-muted-foreground',
                                    )}
                                  >
                                    {v.toFixed(0)}%
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ));
                    })()}
                  </div>

                  {/* Desktop Table View */}
                  <div className="hidden sm:block overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gradient-to-r from-pink-500/10 to-transparent">
                          <th className={cn('px-4 py-3 text-left', text('xs', 'sm', 'font-bold'))}>
                            <span className="text-pink-500">{t('fromTo')}</span> {tc('to')}
                          </th>
                          {['extremeFear', 'fear', 'neutral', 'greed', 'extremeGreed'].map((z) => (
                            <th
                              key={z}
                              className={cn(
                                'px-4 py-3 text-center',
                                text('xs', 'sm', 'font-semibold'),
                              )}
                            >
                              {t(`zones.${z}`).split(' ')[1] || t(`zones.${z}`)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {['extremeFear', 'fear', 'neutral', 'greed', 'extremeGreed'].map(
                          (from, i) => (
                            <motion.tr
                              key={from}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                              className="border-b border-white/5 hover:bg-white/5 transition-colors"
                            >
                              <td className={cn('px-4 py-3', text('xs', 'sm', 'font-semibold'))}>
                                <span
                                  className="text-transparent bg-clip-text bg-gradient-to-r"
                                  style={{
                                    backgroundImage: `linear-gradient(to right, ${ZONE_COLORS[from as keyof typeof ZONE_COLORS]}, ${ZONE_COLORS[from as keyof typeof ZONE_COLORS]})`,
                                  }}
                                >
                                  {t(`zones.${from}`)}
                                </span>
                              </td>
                              {['extremeFear', 'fear', 'neutral', 'greed', 'extremeGreed'].map(
                                (to) => {
                                  const probs = statsData.stats.transitions.probabilities as any;
                                  const v = Number(probs?.[from]?.[to] ?? 0);
                                  const intensity = Math.min(1, v / 50);
                                  return (
                                    <td key={to} className="p-2 text-center">
                                      <motion.div
                                        whileHover={{ scale: 1.1 }}
                                        className="relative rounded-lg p-2 mx-auto w-16 h-10 flex items-center justify-center"
                                        style={{
                                          background: `rgba(236, 72, 153, ${intensity * 0.3})`,
                                          boxShadow:
                                            v > 30
                                              ? `0 0 20px rgba(236, 72, 153, ${intensity * 0.5})`
                                              : undefined,
                                        }}
                                      >
                                        <span
                                          className={cn(
                                            'text-xs font-bold',
                                            v > 30
                                              ? 'text-pink-400'
                                              : v > 15
                                                ? 'text-foreground'
                                                : 'text-muted-foreground',
                                          )}
                                        >
                                          {v.toFixed(1)}%
                                        </span>
                                      </motion.div>
                                    </td>
                                  );
                                },
                              )}
                            </motion.tr>
                          ),
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </motion.div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
