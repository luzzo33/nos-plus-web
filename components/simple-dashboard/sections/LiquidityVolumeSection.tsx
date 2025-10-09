'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Droplets, Waves, ArrowRight, AlertTriangle } from 'lucide-react';
import { SectionCard } from '@/components/simple-dashboard/ui/SectionCard';
import {
  SectionLoading,
  SectionError,
  SectionEmpty,
} from '@/components/simple-dashboard/ui/SectionStates';
import { SIMPLE_SECTIONS } from '@/components/simple-dashboard/state/presets';
import { apiClient } from '@/lib/api/client';
import type { VolumeWidgetData, VolumeStatsResponse, RaydiumWidgetData } from '@/lib/api/types';
import type { RaydiumStatsResponse } from '@/lib/api/raydium-client';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { extractErrorMessage } from '@/components/simple-dashboard/utils/error';

function useVolumeWidget() {
  return useQuery({
    queryKey: ['simple', 'liquidity', 'volume-widget'],
    queryFn: () => apiClient.getVolumeWidgetData(),
    refetchInterval: 90_000,
    staleTime: 45_000,
  });
}

function useVolumeStats() {
  return useQuery({
    queryKey: ['simple', 'liquidity', 'volume-stats'],
    queryFn: () => apiClient.getVolumeStats({ range: '7d' }),
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
}

function useRaydiumWidget() {
  return useQuery({
    queryKey: ['simple', 'liquidity', 'raydium-widget'],
    queryFn: () => apiClient.getRaydiumWidgetData(),
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
  });
}

function useRaydiumStats() {
  return useQuery({
    queryKey: ['simple', 'liquidity', 'raydium-stats'],
    queryFn: () => apiClient.getRaydiumStats('7d'),
    refetchInterval: 10 * 60_000,
    staleTime: 5 * 60_000,
  });
}

export function LiquidityVolumeSection() {
  const t = useTranslations();
  const copy = SIMPLE_SECTIONS.liquidityVolume;

  const {
    data: volumeWidget,
    isLoading: loadingVolumeWidget,
    error: volumeWidgetError,
    refetch: refetchVolumeWidget,
  } = useVolumeWidget();

  const {
    data: volumeStats,
    isLoading: loadingVolumeStats,
    error: volumeStatsError,
    refetch: refetchVolumeStats,
  } = useVolumeStats();

  const {
    data: raydiumWidget,
    isLoading: loadingRaydiumWidget,
    error: raydiumWidgetError,
    refetch: refetchRaydiumWidget,
  } = useRaydiumWidget();

  const {
    data: raydiumStats,
    isLoading: loadingRaydiumStats,
    error: raydiumStatsError,
    refetch: refetchRaydiumStats,
  } = useRaydiumStats();

  const loading =
    loadingVolumeWidget || loadingVolumeStats || loadingRaydiumWidget || loadingRaydiumStats;
  const errorRaw = volumeWidgetError ?? volumeStatsError ?? raydiumWidgetError ?? raydiumStatsError;
  const errorMessage = extractErrorMessage(errorRaw);

  const handleRetry = () => {
    refetchVolumeWidget();
    refetchVolumeStats();
    refetchRaydiumWidget();
    refetchRaydiumStats();
  };

  const dexVsCex = useMemo(() => {
    const distribution = volumeWidget?.widget?.distribution;
    if (!distribution) {
      return null;
    }
    const total = distribution.dex + distribution.cex || 1;
    const dexPct = distribution.dexPercentage ?? (distribution.dex / total) * 100;
    const cexPct = distribution.cexPercentage ?? (distribution.cex / total) * 100;
    return {
      dex: {
        value: distribution.dex,
        percent: dexPct,
        display: formatCompactNumber(distribution.dex),
      },
      cex: {
        value: distribution.cex,
        percent: cexPct,
        display: formatCompactNumber(distribution.cex),
      },
    };
  }, [volumeWidget?.widget?.distribution]);

  const liquidityHighlights = useMemo(() => {
    const stats = volumeStats?.stats;
    if (!stats?.extremes?.highest?.length) {
      return [];
    }
    return stats.extremes.highest.slice(0, 3).map((entry) => ({
      date: entry.date,
      volume: entry.volumeDisplay ?? formatCompactNumber(entry.volume),
    }));
  }, [volumeStats?.stats]);

  return (
    <SectionCard
      id={copy.anchor}
      title={t(copy.titleKey)}
      subtitle={copy.subtitleKey ? t(copy.subtitleKey) : undefined}
      action={
        <Link
          href="/monitor?preset=markets"
          className="inline-flex items-center gap-2 rounded-full border border-[hsla(var(--border-card),0.28)] bg-[hsla(var(--background),0.55)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--simple-text-primary)] transition-colors hover:bg-[hsla(var(--border-card),0.12)]"
        >
          {t('simple.actions.openMarkets')}
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      }
      moreContent={
        raydiumStats?.stats?.metrics ? (
          <div className="grid gap-2 text-sm text-[hsla(var(--muted-foreground),0.78)]">
            <div className="flex justify-between">
              <span>{t('simple.sections.liquidityVolume.more.depth')}</span>
              <span>{formatCompactNumber(raydiumStats.stats.metrics.liquidity.depth.current)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('simple.sections.liquidityVolume.more.volatility')}</span>
              <span>{raydiumStats.stats.metrics.liquidity.stability?.volatility?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>{t('simple.sections.liquidityVolume.more.streak')}</span>
              <span>
                {raydiumStats.stats.metrics.extended?.streaks?.liquidity?.length
                  ? t('simple.sections.liquidityVolume.more.streakValue', {
                      length: raydiumStats.stats.metrics.extended.streaks.liquidity.length,
                      direction:
                        raydiumStats.stats.metrics.extended.streaks.liquidity.direction === 'up'
                          ? t('simple.common.up')
                          : t('simple.common.down'),
                    })
                  : '—'}
              </span>
            </div>
          </div>
        ) : null
      }
    >
      {loading && <SectionLoading rows={6} />}
      {!loading && errorRaw && <SectionError message={errorMessage} onRetry={handleRetry} />}
      {!loading && !errorRaw && !volumeWidget?.widget && (
        <SectionEmpty message={t('simple.sections.liquidityVolume.empty')} />
      )}

      {!loading && !errorRaw && volumeWidget?.widget && (
        <div className="flex flex-col gap-5">
          <div className="rounded-2xl border border-[hsla(var(--border-card),0.22)] bg-[hsla(var(--background),0.6)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Droplets className="h-5 w-5 text-[var(--simple-text-primary)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                    {t('simple.sections.liquidityVolume.labels.split')}
                  </p>
                  <p className="text-sm font-semibold text-[var(--simple-text-primary)]">
                    {volumeWidget.widget.volume?.display ??
                      volumeWidget.widget.current?.display ??
                      '—'}
                  </p>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-[hsla(var(--muted-foreground),0.65)]">
                <span>
                  {t('simple.sections.liquidityVolume.labels.updated', {
                    time:
                      volumeWidget.widget.metadata?.lastUpdate?.slice(11, 16) ??
                      volumeWidget.widget.current?.lastUpdate?.slice(11, 16) ??
                      '--:--',
                  })}
                </span>
                <span>
                  {t('simple.sections.liquidityVolume.labels.exchanges', {
                    count: volumeWidget.widget.metadata?.exchanges ?? 0,
                  })}
                </span>
              </div>
            </div>

            {dexVsCex ? (
              <div className="mt-4 space-y-3">
                <VolumeSplitBar dex={dexVsCex.dex} cex={dexVsCex.cex} />
                <div className="grid gap-3 md:grid-cols-2">
                  <SplitMetric
                    label={t('simple.sections.liquidityVolume.labels.dexShare')}
                    value={`${dexVsCex.dex.percent.toFixed(1)}%`}
                    subLabel={t('simple.sections.liquidityVolume.labels.dexTotal', {
                      value: dexVsCex.dex.display,
                    })}
                  />
                  <SplitMetric
                    label={t('simple.sections.liquidityVolume.labels.cexShare')}
                    value={`${dexVsCex.cex.percent.toFixed(1)}%`}
                    subLabel={t('simple.sections.liquidityVolume.labels.cexTotal', {
                      value: dexVsCex.cex.display,
                    })}
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-dashed border-[hsla(var(--border-card),0.3)] bg-[hsla(var(--background),0.45)] px-4 py-3 text-sm text-[hsla(var(--muted-foreground),0.75)]">
                <AlertTriangle className="h-4 w-4" />
                {t('simple.sections.liquidityVolume.noSplit')}
              </div>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <RaydiumPanel
              widget={raydiumWidget?.widget}
              stats={raydiumStats}
              label={t('simple.sections.liquidityVolume.labels.raydium')}
              t={t}
            />
            <div className="rounded-2xl border border-[hsla(var(--border-card),0.22)] bg-[hsla(var(--background),0.6)] p-4">
              <div className="flex items-center gap-2">
                <Waves className="h-4 w-4 text-[var(--simple-text-primary)]" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                  {t('simple.sections.liquidityVolume.labels.spikes')}
                </span>
              </div>
              {liquidityHighlights.length ? (
                <ul className="mt-3 space-y-2 text-sm text-[var(--simple-text-primary)]">
                  {liquidityHighlights.map((item) => (
                    <li key={item.date} className="flex items-center justify-between gap-2">
                      <span className="text-[11px] uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
                        {new Date(item.date).toLocaleDateString()}
                      </span>
                      <span className="font-semibold">{item.volume}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3 text-sm text-[hsla(var(--muted-foreground),0.7)]">
                  {t('simple.sections.liquidityVolume.noHighlights')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

interface VolumeSplitBarProps {
  dex: { value: number; percent: number };
  cex: { value: number; percent: number };
}

function VolumeSplitBar({ dex, cex }: VolumeSplitBarProps) {
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full bg-[hsla(var(--border-card),0.15)]">
      <div
        className="h-full bg-gradient-to-r from-[hsla(var(--chart-pos),0.8)] to-[hsla(var(--chart-pos),0.4)]"
        style={{ width: `${Math.min(100, Math.max(0, dex.percent))}%` }}
      />
      <div
        className="h-full bg-gradient-to-r from-[hsla(var(--chart-neg),0.4)] to-[hsla(var(--chart-neg),0.8)]"
        style={{ width: `${Math.min(100, Math.max(0, cex.percent))}%` }}
      />
    </div>
  );
}

interface SplitMetricProps {
  label: string;
  value: string;
  subLabel?: string;
}

function SplitMetric({ label, value, subLabel }: SplitMetricProps) {
  return (
    <div className="rounded-xl border border-[hsla(var(--border-card),0.2)] bg-[hsla(var(--background),0.5)] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold text-[var(--simple-text-primary)]">{value}</p>
      {subLabel && <p className="text-xs text-[hsla(var(--muted-foreground),0.65)]">{subLabel}</p>}
    </div>
  );
}

interface RaydiumPanelProps {
  widget: RaydiumWidgetData | undefined;
  stats: RaydiumStatsResponse | undefined;
  label: string;
  t: ReturnType<typeof useTranslations>;
}

function RaydiumPanel({ widget, stats, label, t }: RaydiumPanelProps) {
  return (
    <div className="rounded-2xl border border-[hsla(var(--border-card),0.22)] bg-[hsla(var(--background),0.6)] p-4">
      <div className="flex items-center gap-2">
        <Waves className="h-4 w-4 text-[var(--simple-text-primary)]" />
        <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
          {label}
        </span>
      </div>
      {widget ? (
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
              {t('simple.sections.liquidityVolume.labels.raydiumLiq')}
            </p>
            <p className="text-lg font-semibold text-[var(--simple-text-primary)]">
              {widget.current?.liquidity?.display ?? '—'}
            </p>
            <p className="text-xs text-[hsla(var(--muted-foreground),0.6)]">
              {t('simple.sections.liquidityVolume.labels.lastUpdate', {
                time: widget.current?.lastUpdate?.slice(11, 16) ?? '--:--',
              })}
            </p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
              {t('simple.sections.liquidityVolume.labels.apr')}
            </p>
            <p className="text-lg font-semibold text-[var(--simple-text-primary)]">
              {widget.current?.apr?.display ?? '—'}
            </p>
            <p className="text-xs text-[hsla(var(--muted-foreground),0.6)]">
              {widget.changes?.['24h']?.apr?.display
                ? t('simple.sections.liquidityVolume.labels.aprChange', {
                    value: widget.changes['24h'].apr?.display,
                  })
                : t('simple.sections.liquidityVolume.labels.aprTrendUnknown')}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-[hsla(var(--muted-foreground),0.65)]">
          {t('simple.sections.liquidityVolume.noRaydium')}
        </p>
      )}
      {stats?.stats?.health ? (
        <div className="mt-4 rounded-xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.45)] px-4 py-3 text-sm text-[var(--simple-text-primary)]">
          <div className="flex items-center justify-between">
            <span className="text-xs uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
              {t('simple.sections.liquidityVolume.labels.healthScore')}
            </span>
            <span className="text-sm font-semibold">{stats.stats.health.grade}</span>
          </div>
          <div className="mt-2 grid gap-1 text-xs text-[hsla(var(--muted-foreground),0.75)]">
            <span>
              {t('simple.sections.liquidityVolume.labels.liquidityFactor')}:{' '}
              {stats.stats.health.factors?.liquidity ?? '—'}
            </span>
            <span>
              {t('simple.sections.liquidityVolume.labels.stabilityFactor')}:{' '}
              {stats.stats.health.factors?.stability ?? '—'}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function formatCompactNumber(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}
