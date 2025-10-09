'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers, ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';

import { WidgetContainer } from './WidgetLayout';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type {
  ContractWidgetChange,
  ContractWidgetData,
  ContractWidgetRangeEntry,
  ContractRecordEntry,
} from '@/lib/api/types';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';

type MetricKey = 'total' | 'staking' | 'unstaking';
type WidgetTimeRange = '24h' | '7d' | '30d' | '90d' | '180d' | '1y';

const METRIC_ORDER: MetricKey[] = ['total', 'staking', 'unstaking'];
const TIMEFRAME_ORDER: WidgetTimeRange[] = ['24h', '7d', '30d', '90d', '180d', '1y'];

export function StakingDetailsWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const tm = useTranslations('stakingDetails.marketOverview');

  const [selectedMetric, setSelectedMetric] = useState<MetricKey>('total');
  const [selectedTimeframe, setSelectedTimeframe] = useState<WidgetTimeRange>('24h');
  const [timeframeDropdownOpen, setTimeframeDropdownOpen] = useState(false);
  const [metricDropdownOpen, setMetricDropdownOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery<{
    success: boolean;
    widget: ContractWidgetData;
  }>({
    queryKey: ['widget-staking-details'],
    queryFn: () => apiClient.getBalancesContractWidget(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const widget = data?.widget;

  const availableTimeframes = useMemo<WidgetTimeRange[]>(() => {
    const present = new Set<WidgetTimeRange>();
    const consider = (record?: Partial<Record<string, any>>) => {
      if (!record) return;
      for (const key of Object.keys(record)) {
        if (TIMEFRAME_ORDER.includes(key as WidgetTimeRange)) {
          present.add(key as WidgetTimeRange);
        }
      }
    };
    consider(widget?.changes);
    consider(widget?.ranges);
    const ordered = TIMEFRAME_ORDER.filter((tf) => present.has(tf));
    return ordered.length ? ordered : TIMEFRAME_ORDER;
  }, [widget?.changes, widget?.ranges]);

  useEffect(() => {
    if (!availableTimeframes.length) return;
    if (!availableTimeframes.includes(selectedTimeframe)) {
      setSelectedTimeframe(availableTimeframes[0]);
    }
  }, [availableTimeframes, selectedTimeframe]);

  const metricDefinitions = useMemo(
    () =>
      METRIC_ORDER.map((key) => ({
        key,
        label: tm(`metrics.${key === 'staking' ? 'staked' : key}` as any),
      })),
    [tm],
  );

  const selectedMetricDefinition = metricDefinitions.find(
    (metric) => metric.key === selectedMetric,
  );
  const selectedMetricLabel = selectedMetricDefinition?.label ?? tm('metrics.total');

  const metricData = widget?.[selectedMetric];
  const change = widget?.changes?.[selectedTimeframe]?.[selectedMetric];
  const range = widget?.ranges?.[selectedTimeframe]?.[selectedMetric];
  const ath = widget?.ath?.[selectedMetric];
  const atl = widget?.atl?.[selectedMetric];

  const currentDisplay = stripNosSuffix(metricData?.display) ?? formatNos(metricData?.current);
  const changeInfo = deriveChange(change);
  const lowLabel = range ? resolveRangeValue(range.lowDisplay, range.low) : tc('na');
  const highLabel = range ? resolveRangeValue(range.highDisplay, range.high) : tc('na');
  const averageLabel = range ? resolveRangeValue(range.averageDisplay, range.average) : null;
  const progress = computeProgress(metricData?.current, range);

  const lastUpdated = widget?.lastUpdate;
  const lastUpdatedLabel = useFormattedTimestamp(lastUpdated, {
    absoluteFormat: 'HH:mm',
    fallbackRelative: '—',
  });

  const timeframeOptions = availableTimeframes.map((tf) => ({
    value: tf,
    label: tc(`timeRanges.${tf}`),
  }));

  const skeleton = (
    <div className="animate-pulse space-y-3">
      <div className="flex gap-2">
        <div className="h-6 w-24 bg-muted rounded" />
        <div className="h-6 w-24 bg-muted rounded" />
      </div>
      <div className="h-3 w-20 bg-muted rounded" />
      <div className="h-7 w-32 bg-muted rounded" />
      <div className="h-2 w-full bg-muted rounded" />
    </div>
  );

  return (
    <WidgetContainer
      title={tw('stakingDetails') || 'Staking Details'}
      icon={Layers}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      href="staking-details"
      headerAction={
        <div className="flex items-center gap-2">
          <div className="relative">
            <motion.button
              className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-secondary transition-colors"
              onClick={() => {
                setTimeframeDropdownOpen(false);
                setMetricDropdownOpen((prev) => !prev);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {selectedMetricLabel}
              <ChevronDown
                className={cn('w-3 h-3 transition-transform', metricDropdownOpen && 'rotate-180')}
              />
            </motion.button>
            <AnimatePresence>
              {metricDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setMetricDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[130px] overflow-hidden"
                  >
                    {metricDefinitions.map((metric) => (
                      <button
                        key={metric.key}
                        onClick={() => {
                          setSelectedMetric(metric.key);
                          setMetricDropdownOpen(false);
                        }}
                        className={cn(
                          'block w-full px-3 py-1.5 text-xs text-left transition-colors hover:bg-secondary',
                          selectedMetric === metric.key && 'bg-secondary',
                        )}
                      >
                        {metric.label}
                      </button>
                    ))}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <div className="relative">
            <motion.button
              className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-secondary transition-colors"
              onClick={() => {
                setMetricDropdownOpen(false);
                setTimeframeDropdownOpen((prev) => !prev);
              }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {tc(`timeRanges.${selectedTimeframe}`)}
              <ChevronDown
                className={cn(
                  'w-3 h-3 transition-transform',
                  timeframeDropdownOpen && 'rotate-180',
                )}
              />
            </motion.button>
            <AnimatePresence>
              {timeframeDropdownOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setTimeframeDropdownOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[110px] overflow-hidden"
                  >
                    {timeframeOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSelectedTimeframe(option.value);
                          setTimeframeDropdownOpen(false);
                        }}
                        className={cn(
                          'block w-full px-3 py-1.5 text-xs text-left transition-colors hover:bg-secondary',
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
        </div>
      }
      className="h-full"
      contentClassName="p-2 md:p-3"
      isMobile={isMobile}
    >
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center h-full gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
          <span>
            {tc('error')}: {error.message}
          </span>
          <button
            onClick={() => refetch()}
            className="px-2 py-1 text-xs border rounded hover:bg-secondary"
          >
            {isFetching ? tc('loading') : tc('retry')}
          </button>
        </div>
      )}

      {widget && !isLoading && !error ? (
        <div className="flex flex-col h-full gap-3">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                {selectedMetricLabel}
              </span>
              <motion.p
                className="widget-value font-bold"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {currentDisplay}
              </motion.p>
              {changeInfo && (
                <motion.div
                  className={cn(
                    'flex items-center gap-1 text-xs font-medium',
                    changeInfo.trend === 'up'
                      ? 'text-green-500'
                      : changeInfo.trend === 'down'
                        ? 'text-red-500'
                        : 'text-muted-foreground',
                  )}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  {changeInfo.trend === 'up' ? (
                    <TrendingUp className="w-3 h-3" />
                  ) : changeInfo.trend === 'down' ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : null}
                  <span>{changeInfo.label}</span>
                  <span className="text-[10px] text-muted-foreground">
                    ({tc(`timeRanges.${selectedTimeframe}`)})
                  </span>
                </motion.div>
              )}
            </div>

            {averageLabel && (
              <div className="text-right text-[10px] text-muted-foreground">
                {tm('average')}: <span className="text-foreground font-medium">{averageLabel}</span>
              </div>
            )}
          </div>

          {range && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-1"
            >
              <div className="flex justify-between text-[10px] font-medium">
                <span className="text-muted-foreground">
                  {tw('low')}: <span className="text-foreground">{lowLabel}</span>
                </span>
                <span className="text-muted-foreground">
                  {tw('high')}: <span className="text-foreground">{highLabel}</span>
                </span>
              </div>
              <div className="relative h-2 bg-secondary rounded-full">
                <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                  <div className="w-full h-1 bg-muted rounded-full mx-0.5">
                    <motion.div
                      className="h-full bg-gradient-to-r from-emerald-500 via-sky-500 to-blue-600 rounded-full relative"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress ?? 0}%` }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                    >
                      <div className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 bg-primary rounded-full border border-background" />
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
            <div>
              {tm('ath')}: <span className="text-foreground font-medium">{formatRecord(ath)}</span>
            </div>
            <div className="text-right">
              {tm('atl')}: <span className="text-foreground font-medium">{formatRecord(atl)}</span>
            </div>
          </div>

          <motion.div
            className="mt-auto flex items-center justify-between pt-1 text-[10px] text-muted-foreground"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <span>
              {tc(`timeRanges.${selectedTimeframe}`)} {tm('range')}
            </span>
            {lastUpdated && (
              <span>
                {tw('lastUpdated')}: {lastUpdatedLabel}
              </span>
            )}
          </motion.div>
        </div>
      ) : (
        !isLoading &&
        !error && (
          <div className="flex items-center justify-center h-full text-xs md:text-sm text-muted-foreground">
            {tc('noData')}
          </div>
        )
      )}
    </WidgetContainer>
  );
}

function stripNosSuffix(value: string | null | undefined) {
  if (typeof value !== 'string') return value ?? undefined;
  return value.replace(/\s*NOS$/i, '').trim() || undefined;
}

function formatNos(value?: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}

function resolveRangeValue(display?: string | null, fallback?: number | null) {
  if (display) {
    const trimmed = stripNosSuffix(display);
    if (trimmed) return trimmed;
  }
  if (fallback == null) return undefined;
  return formatNos(fallback);
}

function deriveChange(change?: ContractWidgetChange) {
  if (!change) return null;
  const baseLabel =
    stripNosSuffix(change.display) ??
    (() => {
      if (typeof change.percentage === 'number') {
        const abs = Math.abs(change.percentage);
        const decimals = abs >= 10 ? 1 : 2;
        return `${change.percentage >= 0 ? '+' : ''}${change.percentage.toFixed(decimals)}%`;
      }
      if (typeof change.absolute === 'number') {
        return `${change.absolute >= 0 ? '+' : ''}${formatNos(change.absolute)}`;
      }
      return null;
    })();
  if (!baseLabel) return null;
  const trend =
    change.percentage != null
      ? change.percentage > 0
        ? 'up'
        : change.percentage < 0
          ? 'down'
          : 'flat'
      : change.absolute != null
        ? change.absolute > 0
          ? 'up'
          : change.absolute < 0
            ? 'down'
            : 'flat'
        : 'flat';
  return { label: baseLabel, trend } as const;
}

function computeProgress(current?: number, range?: ContractWidgetRangeEntry) {
  if (!range) return null;
  const low = toNumber(range.low);
  const high = toNumber(range.high);
  if (current == null || low == null || high == null || high === low) return null;
  if (!Number.isFinite(current) || !Number.isFinite(low) || !Number.isFinite(high)) return null;
  const pct = ((current - low) / (high - low)) * 100;
  if (!Number.isFinite(pct)) return null;
  return Math.min(Math.max(pct, 0), 100);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function formatRecord(entry?: ContractRecordEntry | null) {
  if (!entry) return '—';
  const base = stripNosSuffix(entry.display) ?? formatNos(entry.value);
  if (!entry.date) return base;
  const date = new Date(entry.date);
  if (Number.isNaN(date.getTime())) return base;
  return `${base} · ${format(date, 'd MMM')}`;
}
