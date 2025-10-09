'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { TrendingUp, TrendingDown, Info } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { SectionCard } from '@/components/simple-dashboard/ui/SectionCard';
import {
  SectionLoading,
  SectionError,
  SectionEmpty,
} from '@/components/simple-dashboard/ui/SectionStates';
import { SIMPLE_SECTIONS } from '@/components/simple-dashboard/state/presets';
import { apiClient } from '@/lib/api/client';
import type { WidgetData, StatsResponse, ChartResponse } from '@/lib/api/types';
import { cn, formatCurrency, formatPercentage } from '@/lib/utils';
import { formatLocalFromInput } from '@/lib/time';
import { extractErrorMessage } from '@/components/simple-dashboard/utils/error';

interface MarketSnapshotMetrics {
  price: string;
  change1h?: { label: string; trend: 'up' | 'down' | 'neutral' };
  change24h?: { label: string; trend: 'up' | 'down' | 'neutral' };
  change7d?: { label: string; trend: 'up' | 'down' | 'neutral' };
  high24h?: string;
  low24h?: string;
  marketCap?: string;
  fullyDiluted?: string;
  supply?: { circulating?: string; max?: string };
  sinceMidnight?: string;
}

function buildMetrics(
  widget: WidgetData | undefined,
  stats: StatsResponse | undefined,
  chart: ChartResponse | undefined,
  t: ReturnType<typeof useTranslations>,
): MarketSnapshotMetrics | null {
  if (!widget) return null;
  const statsData = stats?.stats;

  const priceChange24h = widget.changes?.['24h'];
  const priceChange7d = widget.changes?.['7d'];
  const priceRange24h = widget.ranges?.['24h'];
  const change1hLabel = (() => {
    const series = normalizeChartPoints(chart);
    if (series.length < 2) return null;
    const sorted = [...series].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    );
    const latest = sorted[sorted.length - 1];
    const prev = sorted[sorted.length - 2];
    if (latest?.price == null || prev?.price == null) return null;
    const delta = latest.price - prev.price;
    const percentage = prev.price === 0 ? 0 : (delta / prev.price) * 100;
    const trend: 'up' | 'down' | 'neutral' = delta === 0 ? 'neutral' : delta > 0 ? 'up' : 'down';
    return {
      label: formatPercentage(Number(percentage.toFixed(2))),
      trend,
    };
  })();

  return {
    price: widget.price?.display ?? '—',
    change1h: change1hLabel ?? undefined,
    change24h: priceChange24h
      ? { label: priceChange24h.display, trend: priceChange24h.trend }
      : undefined,
    change7d: priceChange7d
      ? { label: priceChange7d.display, trend: priceChange7d.trend }
      : undefined,
    high24h: priceRange24h?.highDisplay ?? undefined,
    low24h: priceRange24h?.lowDisplay ?? undefined,
    marketCap: statsData?.current?.marketCapDisplay ?? widget.marketCap?.display,
    fullyDiluted: widget.marketCap?.fullyDilutedDisplay ?? undefined,
    supply: {
      circulating: widget.supply?.circulating
        ? widget.supply.circulating.toLocaleString()
        : undefined,
      max: widget.supply?.max ? widget.supply.max.toLocaleString() : undefined,
    },
    sinceMidnight: statsData?.period?.start
      ? formatLocalFromInput(statsData.period.start, 'HH:mm')
      : widget.metadata?.lastUpdate
        ? formatLocalFromInput(widget.metadata.lastUpdate, 'HH:mm')
        : undefined,
  };
}

export function MarketSnapshotSection() {
  const t = useTranslations();
  const copy = SIMPLE_SECTIONS.marketSnapshot;

  const {
    data: priceData,
    isLoading: loadingPrice,
    error: priceError,
    refetch: refetchPrice,
  } = useQuery({
    queryKey: ['simple', 'market', 'price-widget'],
    queryFn: () => apiClient.getWidgetData('usd'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const {
    data: statsData,
    isLoading: loadingStats,
    error: statsError,
    refetch: refetchStats,
  } = useQuery({
    queryKey: ['simple', 'market', 'stats'],
    queryFn: () => apiClient.getStats({ range: '7d' }),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const {
    data: hourlyChart,
    isLoading: loadingChart,
    error: chartError,
    refetch: refetchChart,
  } = useQuery({
    queryKey: ['simple', 'market', 'hourly-chart'],
    queryFn: () => apiClient.getChartData({ range: '24h', interval: '1h' }),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const widget = priceData?.widget;
  const metrics = useMemo(
    () => buildMetrics(widget, statsData, hourlyChart, t),
    [widget, statsData, hourlyChart, t],
  );

  const sparkline = useMemo(() => {
    const data = widget?.sparkline;
    if (!data?.length) return [];
    return data
      .map((point) => {
        if (!point?.timestamp) return null;
        const price = typeof point.price === 'number' ? point.price : Number(point.price);
        if (!Number.isFinite(price)) return null;
        return {
          timestamp: point.timestamp,
          price,
        };
      })
      .filter((entry): entry is { timestamp: string; price: number } => Boolean(entry));
  }, [widget?.sparkline]);

  const loading = loadingPrice || loadingStats || loadingChart;
  const errorRaw = priceError ?? statsError ?? chartError;
  const errorMessage = extractErrorMessage(errorRaw);

  const handleRetry = () => {
    refetchPrice();
    refetchStats();
    refetchChart();
  };

  return (
    <SectionCard
      id={copy.anchor}
      title={t(copy.titleKey)}
      subtitle={copy.subtitleKey ? t(copy.subtitleKey) : undefined}
      action={
        metrics?.sinceMidnight ? (
          <div className="flex items-center gap-2 rounded-full border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.75)]">
            <Info className="h-3.5 w-3.5" />
            {t('simple.sections.marketSnapshot.sinceMidnight', { time: metrics.sinceMidnight })}
          </div>
        ) : null
      }
      moreContent={
        metrics ? (
          <div className="grid gap-3 text-sm">
            <div className="flex items-center justify-between text-[hsla(var(--muted-foreground),0.78)]">
              <span>{t('simple.sections.marketSnapshot.more.marketCap')}</span>
              <span>{metrics.marketCap ?? '—'}</span>
            </div>
            {metrics.fullyDiluted && (
              <div className="flex items-center justify-between text-[hsla(var(--muted-foreground),0.78)]">
                <span>{t('simple.sections.marketSnapshot.more.fullyDiluted')}</span>
                <span>{metrics.fullyDiluted}</span>
              </div>
            )}
            {metrics.supply?.circulating && (
              <div className="flex items-center justify-between text-[hsla(var(--muted-foreground),0.78)]">
                <span>{t('simple.sections.marketSnapshot.more.circulating')}</span>
                <span>{metrics.supply.circulating}</span>
              </div>
            )}
            {metrics.supply?.max && (
              <div className="flex items-center justify-between text-[hsla(var(--muted-foreground),0.78)]">
                <span>{t('simple.sections.marketSnapshot.more.maxSupply')}</span>
                <span>{metrics.supply.max}</span>
              </div>
            )}
          </div>
        ) : null
      }
    >
      {loading && <SectionLoading rows={6} />}
      {!loading && errorRaw && <SectionError message={errorMessage} onRetry={handleRetry} />}
      {!loading && !errorRaw && !metrics && (
        <SectionEmpty message={t('simple.sections.marketSnapshot.empty')} />
      )}

      {!loading && !errorRaw && metrics && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div className="flex flex-col gap-2">
              <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
                {t('simple.sections.marketSnapshot.labels.price')}
              </span>
              <span className="text-3xl font-semibold tracking-tight text-[var(--simple-text-primary)]">
                {metrics.price}
              </span>
              <div className="flex flex-wrap items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em]">
                {metrics.change1h && (
                  <MetricChip
                    label={t('simple.sections.marketSnapshot.labels.change1h')}
                    {...metrics.change1h}
                  />
                )}
                {metrics.change24h && (
                  <MetricChip
                    label={t('simple.sections.marketSnapshot.labels.change24h')}
                    {...metrics.change24h}
                  />
                )}
                {metrics.change7d && (
                  <MetricChip
                    label={t('simple.sections.marketSnapshot.labels.change7d')}
                    {...metrics.change7d}
                  />
                )}
              </div>
            </div>
            <div className="relative h-32 w-full overflow-hidden rounded-2xl border border-[hsla(var(--border-card),0.2)] bg-[hsla(var(--background),0.55)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] md:h-36 md:max-w-[340px]">
              {sparkline.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparkline}>
                    <defs>
                      <linearGradient id="simple-price-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--simple-pos)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--simple-pos)" stopOpacity={0.05} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const point = payload[0];
                        const label = formatLocalFromInput(
                          point.payload?.timestamp ?? '',
                          'MMM dd, HH:mm',
                        );
                        return (
                          <div className="rounded-xl border border-[hsla(var(--border-card),0.4)] bg-[hsla(var(--background),0.92)] px-3 py-2 text-xs shadow-[var(--simple-shadow-base)]">
                            <p className="font-semibold text-[var(--simple-text-primary)]">
                              {point.value ? formatCurrency(Number(point.value)) : '—'}
                            </p>
                            <p className="text-[11px] text-[hsla(var(--muted-foreground),0.75)]">
                              {label}
                            </p>
                          </div>
                        );
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      stroke="var(--simple-pos)"
                      strokeWidth={2}
                      fill="url(#simple-price-gradient)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-xs text-[hsla(var(--muted-foreground),0.6)]">
                  {t('simple.sections.marketSnapshot.noSparkline')}
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <RangeCard
              label={t('simple.sections.marketSnapshot.labels.high24h')}
              value={metrics.high24h ?? '—'}
              tone="positive"
            />
            <RangeCard
              label={t('simple.sections.marketSnapshot.labels.low24h')}
              value={metrics.low24h ?? '—'}
              tone="negative"
            />
            <div className="rounded-2xl border border-[hsla(var(--border-card),0.2)] bg-[hsla(var(--background),0.6)] px-4 py-3">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
                {t('simple.sections.marketSnapshot.labels.marketCap')}
              </span>
              <p className="mt-2 text-lg font-semibold text-[var(--simple-text-primary)]">
                {metrics.marketCap ?? '—'}
              </p>
              {metrics.fullyDiluted && (
                <p className="text-[11px] font-medium text-[hsla(var(--muted-foreground),0.65)]">
                  {t('simple.sections.marketSnapshot.labels.fullyDiluted', {
                    value: metrics.fullyDiluted,
                  })}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

interface MetricChipProps {
  label: string;
  labelKey?: string;
  trend: 'up' | 'down' | 'neutral';
}

function MetricChip({ label, trend }: MetricChipProps) {
  const Icon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
  const tone =
    trend === 'up'
      ? 'text-[var(--simple-pos)]'
      : trend === 'down'
        ? 'text-[var(--simple-neg)]'
        : 'text-[hsla(var(--muted-foreground),0.7)]';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.65)] px-3 py-1',
        'text-[11px] tracking-[0.12em]',
        tone,
      )}
    >
      {Icon && <Icon className="h-3.5 w-3.5" aria-hidden="true" />}
      {label}
    </span>
  );
}

interface RangeCardProps {
  label: string;
  value: string;
  tone: 'positive' | 'negative';
}

function RangeCard({ label, value, tone }: RangeCardProps) {
  const toneClass =
    tone === 'positive'
      ? 'bg-[hsla(var(--chart-pos),0.12)] border-[hsla(var(--chart-pos),0.35)] text-[hsla(var(--chart-pos),0.95)]'
      : 'bg-[hsla(var(--chart-neg),0.12)] border-[hsla(var(--chart-neg),0.35)] text-[hsla(var(--chart-neg),0.95)]';
  return (
    <div className={cn('rounded-2xl border px-4 py-3', toneClass)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
        {label}
      </span>
      <p className="mt-2 text-lg font-semibold text-[var(--simple-text-primary)]">{value}</p>
    </div>
  );
}

function normalizeChartPoints(chart: ChartResponse | undefined) {
  const raw = chart?.chart?.data;
  const candidate = Array.isArray(raw)
    ? raw
    : raw && typeof raw === 'object' && Array.isArray((raw as { data?: unknown[] }).data)
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
