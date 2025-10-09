'use client';

import { useMemo } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import {
  Activity,
  TrendingUpDown,
  AlertCircle,
  BarChart3,
  Users2,
  Gauge,
  Calendar,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';

import type { TimeRange } from '@/lib/api/client';
import type { BalancesStatsResponse } from '@/lib/api/balances-client';

import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { useFontScale, FONT_SCALE } from '../hooks/useFontScale';

type MetricMode = 'total' | 'stakers' | 'unstakers';

interface StatisticsSectionProps {
  stats: BalancesStatsResponse['stats'];
  statsRange: TimeRange;
  mounted: boolean;
  metric: MetricMode;
}

const METRIC_META: Record<MetricMode, { color: string; accent: string }> = {
  total: { color: '#6366f1', accent: 'text-indigo-500' },
  stakers: { color: '#10b981', accent: 'text-emerald-500' },
  unstakers: { color: '#f97316', accent: 'text-orange-500' },
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const PERCENTILE_LABELS: Record<string, string> = {
  p5: '5th',
  p10: '10th',
  p25: '25th',
  p50: 'Median',
  p75: '75th',
  p90: '90th',
  p95: '95th',
};

const percentileOrder = ['p5', 'p10', 'p25', 'p50', 'p75', 'p90', 'p95'];

const percentileLabel = (translator: ReturnType<typeof useTranslations>, key: string) => {
  switch (key) {
    case 'p5':
      return translator('percentiles.p5');
    case 'p10':
      return translator('percentiles.p10');
    case 'p25':
      return translator('percentiles.p25');
    case 'p50':
      return translator('percentiles.p50');
    case 'p75':
      return translator('percentiles.p75');
    case 'p90':
      return translator('percentiles.p90');
    case 'p95':
      return translator('percentiles.p95');
    default:
      return PERCENTILE_LABELS[key] || key;
  }
};

interface SeriesStats {
  avg: number | null;
  min: number | null;
  max: number | null;
  median: number | null;
}

export function StatisticsSection({ stats, statsRange, mounted, metric }: StatisticsSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakersUnstakers.stats');
  const tt = useTranslations('stakersUnstakers.stats.tooltips');
  const tc = useTranslations('common');

  if (!mounted || !stats) return null;

  const metricKey: MetricMode = metric || 'total';
  const metricMeta = METRIC_META[metricKey];
  const seriesLabels: Record<MetricMode, string> = {
    total: t('series.total'),
    stakers: t('series.stakers'),
    unstakers: t('series.unstakers'),
  };
  const metricLabel = seriesLabels[metricKey];

  const seriesStats = getSeriesStats(stats, metricKey);
  const stability = stats.metrics?.accounts?.stability?.[metricKey] ?? null;
  const changes = stats.metrics?.changes?.[metricKey] ?? null;
  const growth = stats.growth?.[metricKey] ?? null;
  const distribution = stats.distribution?.[metricKey] ?? null;
  const completeness = stats.historical?.completeness ?? 0;
  const dataPoints = stats.historical?.dataPoints ?? 0;

  const coverageLabel = `${Math.round(completeness)}%`;

  const dayOfWeekData = useMemo(() => {
    const key =
      metricKey === 'total' ? 'avgTotal' : metricKey === 'stakers' ? 'avgStakers' : 'avgUnstakers';
    const labelKey = `${key}Display`;
    const raw = Array.isArray(stats.patterns?.dayOfWeek) ? stats.patterns.dayOfWeek : [];
    return raw
      .map((item) => {
        const record = item as Record<string, unknown>;
        const day = typeof record.day === 'string' ? record.day : '—';
        const value = toNumber(record[key]);
        const display = toDisplayString(record[labelKey], formatInt(value));
        return { day, value, display };
      })
      .sort((a, b) => DAY_NAMES.indexOf(a.day) - DAY_NAMES.indexOf(b.day));
  }, [stats.patterns?.dayOfWeek, metricKey]);

  const monthlyPatterns = useMemo(() => {
    const key =
      metricKey === 'total' ? 'avgTotal' : metricKey === 'stakers' ? 'avgStakers' : 'avgUnstakers';
    const displayKey = `${key}Display`;
    const raw = Array.isArray(stats.patterns?.monthly) ? stats.patterns.monthly : [];
    return raw
      .slice()
      .reverse()
      .map((entry) => {
        const record = entry as Record<string, unknown>;
        const month = typeof record.month === 'string' ? record.month : '—';
        const value = toNumber(record[key]);
        const display = toDisplayString(record[displayKey], formatInt(value));
        const ratio = toNumber(record.avgRatio);
        const ratioDisplay = toDisplayString(record.avgRatioDisplay, formatPct(ratio));
        return { month, value, display, ratio, ratioDisplay };
      });
  }, [stats.patterns?.monthly, metricKey]);

  const percentileEntries = useMemo(() => {
    if (!distribution) return [] as Array<{ key: string; value: number }>;
    return percentileOrder
      .filter((key) => distribution[key] !== undefined && distribution[key] !== null)
      .map((key) => ({ key, value: distribution[key] as number }));
  }, [distribution]);

  const events = {
    highest: Array.isArray(stats.events?.highest) ? (stats.events?.highest as EventEntry[]) : [],
    lowest: Array.isArray(stats.events?.lowest) ? (stats.events?.lowest as EventEntry[]) : [],
    unusual: Array.isArray(stats.events?.unusual) ? (stats.events?.unusual as EventEntry[]) : [],
  };

  const chartFontSize =
    typeof window !== 'undefined' && window.innerWidth < 768
      ? 10 * FONT_SCALE.mobile
      : 12 * FONT_SCALE.desktop;
  const smallChartFontSize =
    typeof window !== 'undefined' && window.innerWidth < 768
      ? 8 * FONT_SCALE.mobile
      : 10 * FONT_SCALE.desktop;

  const change7d = changes?.change7d;
  const change30d = changes?.change30d;
  const momentumScore = change7d != null && change30d != null ? change7d - change30d / 4 : null;
  const momentumState =
    momentumScore != null
      ? momentumScore > 3
        ? 'accelerating'
        : momentumScore < -3
          ? 'decelerating'
          : 'stable'
      : 'neutral';
  const momentumLabels: Record<'accelerating' | 'decelerating' | 'stable' | 'neutral', string> = {
    accelerating: t('momentumStates.accelerating'),
    decelerating: t('momentumStates.decelerating'),
    stable: t('momentumStates.stable'),
    neutral: t('momentumStates.neutral'),
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <MetricCard
          icon={<Activity className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />}
          title={t('averageMetric', { metric: metricLabel })}
          subtitle={tc(`timeRanges.${statsRange}`)}
          value={formatInt(seriesStats.avg)}
          text={text}
        />
        <MetricCard
          icon={<TrendingUpDown className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />}
          title={t('metricRange', { metric: metricLabel })}
          subtitle={t('rangeDelta')}
          value={`${formatInt(seriesStats.min)} - ${formatInt(seriesStats.max)}`}
          secondary={
            seriesStats.min !== null && seriesStats.max !== null
              ? formatInt(seriesStats.max - seriesStats.min)
              : undefined
          }
          text={text}
        />
        <MetricCard
          icon={<AlertCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-yellow-500" />}
          title={t('volatilityLabel')}
          subtitle={t('volatilityHint')}
          value={formatPct(stability?.volatility)}
          state={volatilityState(stability?.volatility)}
          text={text}
        />
        <MetricCard
          icon={<BarChart3 className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />}
          title={t('dataCoverage')}
          subtitle={t('dataPointsLabel', { value: dataPoints })}
          value={coverageLabel}
          text={text}
        />
      </div>

      {/* Growth & Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-base p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <h3 className={text('base', 'lg', 'font-semibold')}>{t('growthTitle')}</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <GrowthStat
              label={t('change7d')}
              tooltip={tt('change7d')}
              value={formatPct(change7d)}
              trend={change7d ?? 0}
              text={text}
            />
            <GrowthStat
              label={t('change30d')}
              tooltip={tt('change30d')}
              value={formatPct(change30d)}
              trend={change30d ?? 0}
              text={text}
            />
            <GrowthStat
              label={t('momentum')}
              tooltip={tt('momentum')}
              value={momentumLabels[momentumState]}
              trend={momentumScore ?? 0}
              text={text}
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <GrowthDelta
              label={t('dailyFlow')}
              value={formatInt(growth?.daily)}
              suffix={t('perDay')}
              text={text}
            />
            <GrowthDelta
              label={t('weeklyFlow')}
              value={formatInt(growth?.weekly)}
              suffix={t('perWeek')}
              text={text}
            />
            <GrowthDelta
              label={t('monthlyFlow')}
              value={formatInt(growth?.monthly)}
              suffix={t('perMonth')}
              text={text}
            />
          </div>
        </div>

        <div className="card-base p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Users2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <h3 className={text('base', 'lg', 'font-semibold')}>{t('currentSnapshot')}</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <BreakdownStat
              label={t('series.total')}
              value={stats.current?.totalDisplay ?? '—'}
              accent="text-indigo-500"
              text={text}
            />
            <BreakdownStat
              label={t('series.stakers')}
              value={stats.current?.stakersDisplay ?? '—'}
              accent="text-emerald-500"
              text={text}
            />
            <BreakdownStat
              label={t('series.unstakers')}
              value={stats.current?.unstakersDisplay ?? '—'}
              accent="text-orange-500"
              text={text}
            />
          </div>
          <div className="p-3 bg-secondary/40 rounded-lg flex items-center justify-between">
            <span className={cn(text('xs', 'sm'), 'text-muted-foreground flex items-center gap-1')}>
              {t('currentStakingRatio')}
              <UiTooltip content={tt('currentStakingRatio')}>
                <Info className="w-3 h-3 text-muted-foreground/70" />
              </UiTooltip>
            </span>
            <span className={cn(text('sm', 'lg', 'font-semibold'), metricMeta.accent)}>
              {stats.current?.ratioDisplay ?? '0%'}
            </span>
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="card-base p-4 md:p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          <h3 className={text('base', 'lg', 'font-semibold')}>
            {t('distributionTitle', { metric: metricLabel })}
          </h3>
        </div>
        {percentileEntries.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 md:gap-4">
            {percentileEntries.map(({ key, value }) => (
              <div key={key} className="p-3 md:p-4 bg-secondary/50 rounded-lg text-center">
                <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
                  {percentileLabel(t, key)}
                </p>
                <p className={text('xs', 'base', 'font-bold')}>{formatInt(value)}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>{t('noDistributionData')}</p>
        )}
      </div>

      {/* Patterns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-base p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <h3 className={text('base', 'lg', 'font-semibold')}>
              {t('dayOfWeekPattern', { metric: metricLabel })}
            </h3>
          </div>
          {dayOfWeekData.length > 0 ? (
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dayOfWeekData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="day"
                    fontSize={chartFontSize}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis
                    tickFormatter={(value) => formatAxis(value)}
                    fontSize={smallChartFontSize}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <RechartsTooltip
                    formatter={(value: number) => [formatInt(value), metricLabel]}
                    labelStyle={{ color: 'hsl(var(--foreground))' }}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar dataKey="value" fill={metricMeta.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>{t('noPatternData')}</p>
          )}
        </div>

        <div className="card-base p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUpDown className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <h3 className={text('base', 'lg', 'font-semibold')}>
              {t('monthlyPattern', { metric: metricLabel })}
            </h3>
          </div>
          {monthlyPatterns.length > 0 ? (
            <div className="space-y-3 max-h-[250px] overflow-y-auto scrollbar-thin">
              {monthlyPatterns.map((entry) => (
                <div
                  key={entry.month}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors"
                >
                  <div>
                    <p className={text('xs', 'sm', 'font-medium')}>{entry.month}</p>
                    <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                      {t('averageLabel', { value: entry.display })}
                    </p>
                  </div>
                  <div className="text-right">
                    {metricKey === 'total' && (
                      <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {entry.ratioDisplay}
                      </p>
                    )}
                    <p className={text('xs', 'sm', 'font-bold')}>{entry.display}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>{t('noPatternData')}</p>
          )}
        </div>
      </div>

      {/* Events */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <EventCard
          title={t('topDays')}
          color="text-green-500"
          rows={events.highest ?? []}
          text={text}
          metricLabel={metricLabel}
          metricKey={metricKey}
          emptyLabel={t('noEventData')}
        />
        <EventCard
          title={t('bottomDays')}
          color="text-red-500"
          rows={events.lowest ?? []}
          text={text}
          metricLabel={metricLabel}
          metricKey={metricKey}
          emptyLabel={t('noEventData')}
        />
        <EventCard
          title={t('unusualDays')}
          color="text-yellow-500"
          rows={events.unusual ?? []}
          text={text}
          metricLabel={metricLabel}
          metricKey={metricKey}
          emptyLabel={t('noEventData')}
          showDeviation
        />
      </div>
    </motion.div>
  );
}

interface MetricCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  value: string;
  secondary?: string;
  state?: 'low' | 'moderate' | 'high' | 'neutral';
  text: ReturnType<typeof useFontScale>['text'];
}

function MetricCard({ icon, title, subtitle, value, secondary, state, text }: MetricCardProps) {
  const stateClass =
    state === 'high'
      ? 'text-red-500'
      : state === 'moderate'
        ? 'text-yellow-500'
        : state === 'low'
          ? 'text-emerald-500'
          : 'text-muted-foreground';
  return (
    <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
      {icon}
      <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>{title}</p>
      <p className={text('base', 'xl', 'font-bold')}>{value}</p>
      {secondary && (
        <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>{secondary}</p>
      )}
      {subtitle && <p className={cn(text('3xs', '2xs'), stateClass, 'mt-1')}>{subtitle}</p>}
    </div>
  );
}

interface GrowthStatProps {
  label: string;
  tooltip?: string;
  value: string;
  trend: number;
  text: ReturnType<typeof useFontScale>['text'];
}

function GrowthStat({ label, tooltip, value, trend, text }: GrowthStatProps) {
  const isPositive = trend >= 0;
  const trendClass = isPositive ? 'text-emerald-500' : 'text-red-500';
  return (
    <div className="text-center p-3 bg-secondary/40 rounded-lg flex flex-col gap-1">
      <p
        className={cn(
          text('3xs', '2xs'),
          'text-muted-foreground flex items-center justify-center gap-1',
        )}
      >
        {label}
        {tooltip && (
          <UiTooltip content={tooltip}>
            <Info className="w-3 h-3 text-muted-foreground/70" />
          </UiTooltip>
        )}
      </p>
      <p className={cn(text('xs', 'base', 'font-semibold'), trendClass)}>{value}</p>
    </div>
  );
}

interface GrowthDeltaProps {
  label: string;
  value: string;
  suffix: string;
  text: ReturnType<typeof useFontScale>['text'];
}

function GrowthDelta({ label, value, suffix, text }: GrowthDeltaProps) {
  return (
    <div className="text-center p-3 bg-secondary/40 rounded-lg">
      <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-1')}>{label}</p>
      <p className={text('xs', 'base', 'font-semibold')}>
        {value} <span className="text-muted-foreground font-normal">{suffix}</span>
      </p>
    </div>
  );
}

interface BreakdownStatProps {
  label: string;
  value: string;
  accent: string;
  text: ReturnType<typeof useFontScale>['text'];
}

function BreakdownStat({ label, value, accent, text }: BreakdownStatProps) {
  return (
    <div className="p-3 bg-secondary/40 rounded-lg text-center">
      <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-1')}>{label}</p>
      <p className={cn(text('xs', 'base', 'font-semibold'), accent)}>{value}</p>
    </div>
  );
}

type EventEntry = Record<string, unknown>;

interface EventCardProps {
  title: string;
  color: string;
  rows: EventEntry[];
  metricLabel: string;
  metricKey: MetricMode;
  text: ReturnType<typeof useFontScale>['text'];
  emptyLabel: string;
  showDeviation?: boolean;
}

function EventCard({
  title,
  color,
  rows,
  metricLabel,
  metricKey,
  text,
  emptyLabel,
  showDeviation = false,
}: EventCardProps) {
  const key = metricKey === 'total' ? 'total' : metricKey === 'stakers' ? 'stakers' : 'unstakers';
  const displayKey = `${key}Display`;
  return (
    <div className="card-base p-4 md:p-6">
      <h3 className={cn(text('base', 'lg', 'font-semibold'), color, 'mb-4')}>{title}</h3>
      <div className="space-y-2">
        {rows.slice(0, 5).map((row, index) => {
          const record = row as EventEntry;
          const date = typeof record.date === 'string' ? record.date : `#${index + 1}`;
          const value = toDisplayString(record[displayKey], '—');
          const deviation =
            typeof record.deviationsDisplay === 'string' ? record.deviationsDisplay : undefined;
          return (
            <div key={date} className="flex items-center justify-between">
              <div>
                <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>{date}</p>
                {showDeviation && deviation && (
                  <p className={cn(text('3xs', '2xs'), 'text-yellow-500')}>{deviation}</p>
                )}
              </div>
              <div className="text-right">
                <p className={text('xs', 'sm', 'font-bold')}>{value}</p>
                {metricKey !== 'total' && (
                  <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>{metricLabel}</p>
                )}
              </div>
            </div>
          );
        })}
        {rows.length === 0 && (
          <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>{emptyLabel}</p>
        )}
      </div>
    </div>
  );
}

function getSeriesStats(stats: BalancesStatsResponse['stats'], key: MetricMode): SeriesStats {
  const baseline: SeriesStats = { avg: null, min: null, max: null, median: null };
  const historical = stats.historical as Record<string, unknown> | undefined;
  if (!historical || typeof historical !== 'object') return baseline;
  const series = historical[key];
  if (!series || typeof series !== 'object') return baseline;
  const record = series as Record<string, unknown>;
  return {
    avg: getOptionalNumber(record.avg),
    min: getOptionalNumber(record.min),
    max: getOptionalNumber(record.max),
    median: getOptionalNumber(record.median),
  };
}

function formatInt(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString();
}

function formatPct(value?: number | null, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const fixed = value.toFixed(digits);
  return `${value >= 0 ? '+' : ''}${fixed}%`;
}

function getOptionalNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function toDisplayString(value: unknown, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

function volatilityState(value?: number | null): MetricCardProps['state'] {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'neutral';
  if (value < 15) return 'low';
  if (value < 35) return 'moderate';
  return 'high';
}

function formatAxis(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return value.toFixed(0);
}
