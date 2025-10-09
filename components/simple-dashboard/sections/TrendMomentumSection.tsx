'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis } from 'recharts';
import { useTranslations } from 'next-intl';
import { Flame, Clock3 } from 'lucide-react';
import { SectionCard } from '@/components/simple-dashboard/ui/SectionCard';
import {
  SectionLoading,
  SectionError,
  SectionEmpty,
} from '@/components/simple-dashboard/ui/SectionStates';
import { SIMPLE_SECTIONS } from '@/components/simple-dashboard/state/presets';
import { apiClient, type TimeRange } from '@/lib/api/client';
import type { ChartResponse, VolumeWidgetData } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { formatLocalFromInput, formatRangeTick } from '@/lib/time';
import { extractErrorMessage } from '@/components/simple-dashboard/utils/error';

type TrendRange = Extract<TimeRange, '24h' | '7d' | '30d'>;

const RANGE_OPTIONS: Array<{ value: TrendRange; labelKey: string }> = [
  { value: '24h', labelKey: 'timeRanges.24h' },
  { value: '7d', labelKey: 'timeRanges.7d' },
  { value: '30d', labelKey: 'timeRanges.30d' },
];

function useTrendChart(range: TrendRange) {
  return useQuery({
    queryKey: ['simple', 'trend', 'chart', range],
    queryFn: () =>
      apiClient.getChartData({
        range,
        currency: 'usd',
        interval: range === '24h' ? '1h' : 'auto',
      }),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}

function useVolumeWidget() {
  return useQuery({
    queryKey: ['simple', 'trend', 'volume-widget'],
    queryFn: () => apiClient.getVolumeWidgetData(),
    refetchInterval: 90_000,
    staleTime: 45_000,
  });
}

export function TrendMomentumSection() {
  const t = useTranslations();
  const tc = useTranslations('common');
  const copy = SIMPLE_SECTIONS.trendMomentum;
  const [range, setRange] = useState<TrendRange>('24h');

  const {
    data: chartData,
    isLoading: loadingChart,
    error: chartError,
    refetch: refetchChart,
  } = useTrendChart(range);

  const {
    data: volumeData,
    isLoading: loadingVolume,
    error: volumeError,
    refetch: refetchVolume,
  } = useVolumeWidget();

  const loading = loadingChart || loadingVolume;
  const errorRaw = chartError ?? volumeError;
  const errorMessage = extractErrorMessage(errorRaw);

  const pricePoints = useMemo(() => normalizeChartPoints(chartData), [chartData]);
  const summary = chartData?.chart?.summary;

  const volumeSparkline = useMemo(
    () => extractVolumeBlips(volumeData?.widget, range),
    [volumeData?.widget, range],
  );

  const handleRetry = () => {
    refetchChart();
    refetchVolume();
  };

  return (
    <SectionCard
      id={copy.anchor}
      title={t(copy.titleKey)}
      subtitle={copy.subtitleKey ? t(copy.subtitleKey) : undefined}
      action={
        <div className="inline-flex items-center gap-1 rounded-full border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-1">
          {RANGE_OPTIONS.map((option) => {
            const active = option.value === range;
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setRange(option.value)}
                className={cn(
                  'rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] transition',
                  active
                    ? 'bg-[hsla(var(--accent),0.25)] text-[var(--simple-text-primary)] shadow-[var(--simple-shadow-base)]'
                    : 'text-[hsla(var(--muted-foreground),0.7)] hover:text-[var(--simple-text-primary)]',
                )}
                aria-pressed={active}
              >
                {tc(option.labelKey)}
              </button>
            );
          })}
        </div>
      }
      moreContent={
        summary ? (
          <div className="grid gap-2 text-sm text-[hsla(var(--muted-foreground),0.78)]">
            <div className="flex justify-between">
              <span>{t('simple.sections.trendMomentum.more.average')}</span>
              <span>{formatNumber(summary.average)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('simple.sections.trendMomentum.more.volatility')}</span>
              <span>{summary.volatility.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>{t('simple.sections.trendMomentum.more.change')}</span>
              <span>
                {summary.change > 0 ? '+' : ''}
                {summary.change.toFixed(2)}
              </span>
            </div>
          </div>
        ) : null
      }
    >
      {loading && <SectionLoading rows={6} />}
      {!loading && errorRaw && <SectionError message={errorMessage} onRetry={handleRetry} />}
      {!loading && !errorRaw && !pricePoints.length && (
        <SectionEmpty message={t('simple.sections.trendMomentum.empty')} />
      )}

      {!loading && !errorRaw && pricePoints.length > 0 && (
        <div className="flex flex-col gap-5">
          <div className="h-[260px] w-full rounded-2xl border border-[hsla(var(--border-card),0.2)] bg-[hsla(var(--background),0.6)] p-3 md:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={pricePoints} margin={{ top: 20, right: 24, left: 16, bottom: 12 }}>
                <defs>
                  <linearGradient id="trend-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsla(var(--accent),0.7)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="hsla(var(--accent),0.35)" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  stroke="hsla(var(--border-card),0.12)"
                  strokeDasharray="4 4"
                  vertical={false}
                />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={(value) => formatRangeTick(value, range)}
                  tick={{ fontSize: 11, fill: 'hsla(var(--muted-foreground),0.6)' }}
                  axisLine={false}
                  tickLine={false}
                  minTickGap={24}
                />
                <Tooltip
                  wrapperStyle={{ outline: 'none' }}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0];
                    const point = item.payload as (typeof pricePoints)[number];
                    return (
                      <div className="rounded-xl border border-[hsla(var(--border-card),0.35)] bg-[hsla(var(--background),0.92)] px-3 py-2 text-xs shadow-[var(--simple-shadow-base)]">
                        <p className="font-semibold text-[var(--simple-text-primary)]">
                          {formatNumber(point.price)}
                        </p>
                        <p className="text-[11px] text-[hsla(var(--muted-foreground),0.7)]">
                          {formatLocalFromInput(point.timestamp, 'MMM dd, HH:mm')}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="price"
                  stroke="hsla(var(--accent),0.9)"
                  strokeWidth={2}
                  fill="url(#trend-gradient)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <div className="rounded-2xl border border-[hsla(var(--border-card),0.22)] bg-[hsla(var(--background),0.6)] p-4">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-[var(--simple-pos)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                  {t('simple.sections.trendMomentum.labels.momentum')}
                </span>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-[var(--simple-text-primary)]">
                <span>{describeMomentum(summary?.trend ?? 'neutral', t)}</span>
                <span className="text-[hsla(var(--muted-foreground),0.7)]">
                  {summary?.changeFromStartPercent
                    ? `${summary.changeFromStartPercent.toFixed(2)}%`
                    : summary?.change
                      ? `${summary.change > 0 ? '+' : ''}${summary.change.toFixed(2)}`
                      : '—'}
                </span>
              </div>
            </div>

            <div className="rounded-2xl border border-[hsla(var(--border-card),0.22)] bg-[hsla(var(--background),0.6)] p-4">
              <div className="flex items-center gap-2">
                <Clock3 className="h-4 w-4 text-[var(--simple-text-primary)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                  {t('simple.sections.trendMomentum.labels.recentVolume')}
                </span>
              </div>
              <ul className="mt-3 space-y-2 text-sm text-[var(--simple-text-primary)]">
                {volumeSparkline.map((entry) => (
                  <li key={entry.timestamp} className="flex items-center justify-between gap-2">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
                      {formatLocalFromInput(entry.timestamp, range === '24h' ? 'HH:mm' : 'MMM dd')}
                    </span>
                    <span className="font-semibold">{entry.display}</span>
                    <span
                      className={cn(
                        'text-xs font-semibold',
                        entry.deltaTrend === 'up'
                          ? 'text-[var(--simple-pos)]'
                          : entry.deltaTrend === 'down'
                            ? 'text-[var(--simple-neg)]'
                            : 'text-[hsla(var(--muted-foreground),0.6)]',
                      )}
                    >
                      {entry.deltaDisplay}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function normalizeChartPoints(chart: ChartResponse | undefined) {
  const raw = chart?.chart?.data;
  if (!raw) return [];

  const candidate = Array.isArray(raw)
    ? raw
    : Array.isArray((raw as { data?: unknown }).data)
      ? (raw as { data: unknown[] }).data
      : [];

  const toNumber = (value: unknown): number | null => {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string' && value.length) {
      const parsed = Number(value);
      return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
  };

  return candidate
    .map((point) => {
      if (typeof point !== 'object' || point === null) return null;
      const record = point as Record<string, unknown>;
      const timestamp =
        typeof record.timestamp === 'string'
          ? record.timestamp
          : typeof record.time === 'string'
            ? record.time
            : null;
      if (!timestamp) return null;
      const price =
        toNumber(record.price) ??
        toNumber(record.close) ??
        toNumber(record.value) ??
        toNumber(record.p);
      if (price == null) return null;
      return { timestamp, price };
    })
    .filter((entry): entry is { timestamp: string; price: number } => Boolean(entry));
}

interface VolumeBlip {
  timestamp: string;
  display: string;
  deltaDisplay: string;
  deltaTrend: 'up' | 'down' | 'neutral';
}

function extractVolumeBlips(widget: VolumeWidgetData | undefined, range: TrendRange): VolumeBlip[] {
  const data = widget?.sparkline;
  if (!data?.length) return [];
  const sorted = [...data].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );
  const sliceCount = range === '24h' ? 6 : 5;
  const recent = sorted.slice(-sliceCount);

  return recent.map((entry, idx, arr) => {
    const volume = Number(entry.volume);
    const prev = idx > 0 ? Number(arr[idx - 1].volume) : null;
    const delta = prev != null ? volume - prev : null;
    const deltaTrend =
      delta == null ? 'neutral' : delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
    const deltaDisplay =
      delta == null ? '—' : `${delta > 0 ? '+' : ''}${formatCompactNumber(delta)}`;
    return {
      timestamp: entry.timestamp,
      display: formatCompactNumber(volume),
      deltaDisplay,
      deltaTrend,
    };
  });
}

function formatNumber(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 1) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${value.toFixed(4)}`;
}

function formatCompactNumber(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}

function describeMomentum(trend: string, t: ReturnType<typeof useTranslations>) {
  switch (trend) {
    case 'up':
      return t('simple.sections.trendMomentum.momentum.strong');
    case 'down':
      return t('simple.sections.trendMomentum.momentum.cooling');
    default:
      return t('simple.sections.trendMomentum.momentum.stable');
  }
}
