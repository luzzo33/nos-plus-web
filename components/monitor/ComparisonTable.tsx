'use client';

import React, { useMemo } from 'react';
import Image from 'next/image';
import { TrendingDown, TrendingUp } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Tooltip } from '@/components/ui/Tooltip';
import { MONITOR_EXCHANGES } from '@/lib/monitor/exchanges';
import type {
  StatsComparisonPayload,
  StatsRange,
  StatsSnapshot,
} from '@/lib/monitor/useStatsStream';

interface ComparisonTableProps {
  entries: StatsSnapshot[];
  range: StatsRange;
  totals?: StatsComparisonPayload['totals'];
  spreadSummary?: StatsComparisonPayload['spreadSummary'];
  loading?: boolean;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 100) return `$${value.toFixed(2)}`;
  if (abs >= 1) return `$${value.toFixed(3)}`;
  if (abs >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toPrecision(2)}`;
}

function formatNumberCompact(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  if (abs >= 1) return value.toFixed(2);
  if (abs === 0) return '0';
  return value.toPrecision(2);
}

function formatUsdCompact(value: number | null | undefined): string {
  const formatted = formatNumberCompact(value);
  return formatted === '—' ? formatted : `$${formatted}`;
}

function formatPercent(value: number | null | undefined, digits = 2): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(digits)}%`;
}

function resolveChangeForRange(entry: StatsSnapshot, range: StatsRange): number | null {
  if (entry.change != null && Number.isFinite(entry.change)) return entry.change;
  const changes = entry.changes ?? undefined;
  if (changes && typeof changes === 'object') {
    const candidate = changes[range];
    if (candidate != null && Number.isFinite(candidate as number)) {
      return candidate as number;
    }
  }
  switch (range) {
    case '5m':
      return entry.change5m ?? null;
    case '1h':
      return entry.change1h ?? null;
    case '6h':
      return entry.change6h ?? null;
    case '24h':
    default:
      return entry.change24h ?? null;
  }
}

type ExchangeDisplayMeta = {
  label: string;
  icon?: string;
};

const EXCHANGE_META: Record<string, ExchangeDisplayMeta> = (() => {
  const map: Record<string, ExchangeDisplayMeta> = {};
  for (const exchange of MONITOR_EXCHANGES) {
    const baseMeta: ExchangeDisplayMeta = { label: exchange.label, icon: exchange.icon };
    map[exchange.id.toLowerCase()] = baseMeta;
    for (const venue of exchange.venues) {
      map[venue.toLowerCase()] = baseMeta;
    }
  }
  return map;
})();

function resolveDisplay(entry: StatsSnapshot): ExchangeDisplayMeta {
  const keys = [entry.slug, entry.venue, entry.label, entry.shortLabel]
    .map((value) => (value ? String(value).toLowerCase() : null))
    .filter(Boolean) as string[];
  for (const key of keys) {
    if (EXCHANGE_META[key]) return EXCHANGE_META[key];
  }
  if (entry.label) return { label: entry.label };
  if (entry.shortLabel) return { label: entry.shortLabel };
  const fallback = entry.slug || entry.venue || 'Venue';
  return { label: fallback.toString().toUpperCase() };
}

export function ComparisonTable({
  entries,
  range,
  totals,
  spreadSummary,
  loading = false,
}: ComparisonTableProps) {
  const safeEntries = entries ?? [];
  const bestPriceRank = useMemo(() => {
    return safeEntries.reduce((acc, entry) => {
      const rank = entry.ranks?.price;
      if (rank == null || !Number.isFinite(rank)) return acc;
      return Math.min(acc, Number(rank));
    }, Number.POSITIVE_INFINITY);
  }, [safeEntries]);

  const bestChangeRank = useMemo(() => {
    return safeEntries.reduce((acc, entry) => {
      const rank = entry.ranks?.change;
      if (rank == null || !Number.isFinite(rank)) return acc;
      return Math.min(acc, Number(rank));
    }, Number.POSITIVE_INFINITY);
  }, [safeEntries]);

  const bestVolumeRank = useMemo(() => {
    return safeEntries.reduce((acc, entry) => {
      const rank = entry.ranks?.volume;
      if (rank == null || !Number.isFinite(rank)) return acc;
      return Math.min(acc, Number(rank));
    }, Number.POSITIVE_INFINITY);
  }, [safeEntries]);

  const headers = [
    'Venue',
    'Price',
    `${range.toUpperCase()} Change`,
    'vs Avg',
    'Volume',
    'Transactions',
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Exchange Comparison
          </div>
          {spreadSummary && spreadSummary.count && spreadSummary.count > 1 && (
            <div className="mt-1 text-[11px] text-muted-foreground">
              {spreadSummary.minLabel ?? 'Lowest'} vs {spreadSummary.maxLabel ?? 'Highest'}:{' '}
              {formatPercent(spreadSummary.percent ?? null, 2)}
              {spreadSummary.delta != null && Number.isFinite(spreadSummary.delta) && (
                <> (Δ {formatUsdCompact(spreadSummary.delta)})</>
              )}
            </div>
          )}
        </div>
        {spreadSummary &&
          spreadSummary.averagePrice != null &&
          Number.isFinite(spreadSummary.averagePrice) && (
            <Tooltip content="Average of current prices across the selected venues">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/40 bg-background/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
                <span className="uppercase tracking-wide">Avg price</span>
                <span className="text-foreground">{formatPrice(spreadSummary.averagePrice)}</span>
              </div>
            </Tooltip>
          )}
      </div>

      <div className="overflow-hidden rounded-xl border border-border/40 bg-background/80">
        <div className="hidden grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] gap-2 border-b border-border/40 bg-muted/20 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid">
          {headers.map((label) => (
            <div key={label} className={cn('truncate', label !== 'Venue' && 'text-right')}>
              {label}
            </div>
          ))}
        </div>
        {loading && !safeEntries.length && (
          <div className="px-3 py-4">
            <div className="hidden md:block space-y-2">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={`skeleton-desktop-${index}`}
                  className="grid grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] items-center gap-2 border-b border-border/10 px-3 py-2 last:border-b-0"
                  aria-hidden="true"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="relative skeleton h-7 w-7 rounded-full">
                      <div className="absolute inset-0 skeleton-shimmer" />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="relative skeleton h-3 w-28 rounded">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                      <div className="relative skeleton h-2 w-20 rounded">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                  </div>
                  {Array.from({ length: 5 }).map((_, cellIndex) => (
                    <div key={cellIndex} className="flex justify-end">
                      <div className="relative skeleton h-3 w-20 rounded">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="space-y-4 md:hidden">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={`skeleton-mobile-${index}`}
                  className="space-y-3 rounded-xl border border-border/30 bg-background/70 px-3 py-4"
                  aria-hidden="true"
                >
                  <div className="flex items-center gap-3">
                    <div className="relative skeleton h-9 w-9 rounded-full">
                      <div className="absolute inset-0 skeleton-shimmer" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="relative skeleton h-3 w-32 rounded">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                      <div className="relative skeleton h-2 w-20 rounded">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                  </div>

                  <div className="relative skeleton h-1.5 w-full rounded-full">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-[13px]">
                    {Array.from({ length: 4 }).map((_, cellIndex) => (
                      <div key={cellIndex} className="space-y-1.5">
                        <div className="relative skeleton h-2.5 w-24 rounded">
                          <div className="absolute inset-0 skeleton-shimmer" />
                        </div>
                        <div className="relative skeleton h-3 w-20 rounded">
                          <div className="absolute inset-0 skeleton-shimmer" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!loading && !safeEntries.length && (
          <div className="px-3 py-6 text-center text-xs text-muted-foreground">
            No venue data available
          </div>
        )}

        {/* Desktop/tablet view */}
        <div className="hidden md:block">
          {safeEntries.map((entry, index) => {
            const display = resolveDisplay(entry);
            const marketShare =
              entry.marketShare != null && Number.isFinite(entry.marketShare)
                ? Math.max(0, Math.min(1, Number(entry.marketShare)))
                : null;
            const changeValue = resolveChangeForRange(entry, range);
            const positiveChange = changeValue != null && changeValue >= 0;
            const priceHighlight =
              entry.ranks?.price != null && entry.ranks.price === bestPriceRank;
            const changeHighlight =
              entry.ranks?.change != null && entry.ranks.change === bestChangeRank;
            const volumeHighlight =
              entry.ranks?.volume != null && entry.ranks.volume === bestVolumeRank;
            const spreadVsMin = entry.spread ? entry.spread.vsMinPct : null;
            const spreadVsAvg = entry.spread ? entry.spread.vsAvgPct : null;

            return (
              <div
                key={`${entry.slug ?? entry.venue ?? index}`}
                className="grid grid-cols-[minmax(0,1.5fr)_repeat(5,minmax(0,1fr))] items-center gap-2 border-b border-border/20 px-3 py-2 text-sm last:border-b-0"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {display.icon && (
                    <div className="relative h-7 w-7 flex-shrink-0 overflow-hidden rounded-full border border-border/40 bg-background">
                      <Image
                        src={display.icon}
                        alt=""
                        fill
                        sizes="28px"
                        className="object-contain p-1.5"
                      />
                    </div>
                  )}
                  <div className="flex min-w-0 flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-semibold text-foreground">
                        {display.label}
                      </span>
                      {marketShare != null && (
                        <Tooltip content={`Market share ${(marketShare * 100).toFixed(2)}%`}>
                          <span className="rounded-full bg-primary/10 px-2 py-[1px] text-[10px] font-semibold text-primary">
                            {(marketShare * 100).toFixed(marketShare >= 0.1 ? 1 : 2)}%
                          </span>
                        </Tooltip>
                      )}
                    </div>
                    {marketShare != null && (
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                        <div
                          className="h-full rounded-full bg-primary/60"
                          style={{ width: `${Math.min(100, Math.max(4, marketShare * 100))}%` }}
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div
                  className={cn(
                    'text-right font-semibold',
                    priceHighlight ? 'text-emerald-500' : 'text-foreground',
                  )}
                >
                  <div>{formatPrice(entry.priceNow ?? null)}</div>
                  {spreadVsMin != null && Number.isFinite(spreadVsMin) && (
                    <div className="text-[11px] font-medium text-muted-foreground">
                      {spreadVsMin === 0 ? 'Best price' : `+${spreadVsMin.toFixed(2)}% vs best`}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <div
                    className={cn(
                      'inline-flex items-center gap-1 text-right text-sm font-semibold',
                      changeValue == null
                        ? 'text-muted-foreground'
                        : positiveChange
                          ? 'text-emerald-500'
                          : 'text-red-500',
                    )}
                  >
                    {changeValue != null ? (
                      <>
                        {positiveChange ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {formatPercent(changeValue)}
                      </>
                    ) : (
                      '—'
                    )}
                  </div>
                  {changeHighlight && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-[1px] text-[10px] font-semibold text-emerald-500">
                      Top momentum
                    </span>
                  )}
                </div>

                <div className="text-right text-sm font-medium text-foreground">
                  {spreadVsAvg != null && Number.isFinite(spreadVsAvg)
                    ? `${spreadVsAvg >= 0 ? '+' : ''}${spreadVsAvg.toFixed(2)}%`
                    : '—'}
                </div>

                <div
                  className={cn(
                    'text-right text-sm font-medium',
                    volumeHighlight ? 'text-primary' : 'text-foreground',
                  )}
                >
                  {formatUsdCompact(entry.volume ?? null)}
                </div>

                <div className="text-right text-sm font-medium text-foreground">
                  {formatNumberCompact(entry.tx ?? null)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Mobile layout */}
        <div className="divide-y divide-border/30 md:hidden">
          {safeEntries.map((entry, index) => {
            const display = resolveDisplay(entry);
            const marketShare =
              entry.marketShare != null && Number.isFinite(entry.marketShare)
                ? Math.max(0, Math.min(1, Number(entry.marketShare)))
                : null;
            const changeValue = resolveChangeForRange(entry, range);
            const positiveChange = changeValue != null && changeValue >= 0;
            const spreadVsMin = entry.spread ? entry.spread.vsMinPct : null;
            const spreadVsAvg = entry.spread ? entry.spread.vsAvgPct : null;

            return (
              <div
                key={`${entry.slug ?? entry.venue ?? index}`}
                className="space-y-3 px-3 py-4 text-sm"
              >
                <div className="flex items-center gap-3">
                  {display.icon && (
                    <div className="relative h-9 w-9 flex-shrink-0 overflow-hidden rounded-full border border-border/40 bg-background">
                      <Image
                        src={display.icon}
                        alt=""
                        fill
                        sizes="36px"
                        className="object-contain p-1.5"
                      />
                    </div>
                  )}
                  <div className="flex flex-col">
                    <span className="text-base font-semibold text-foreground">{display.label}</span>
                    {marketShare != null && (
                      <span className="text-[11px] text-muted-foreground">
                        {(marketShare * 100).toFixed(marketShare >= 0.1 ? 1 : 2)}% market share
                      </span>
                    )}
                  </div>
                </div>

                {marketShare != null && (
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-border/60">
                    <div
                      className="h-full rounded-full bg-primary/60"
                      style={{ width: `${Math.min(100, Math.max(4, marketShare * 100))}%` }}
                    />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3 text-[13px]">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Price
                    </div>
                    <div className="font-semibold text-foreground">
                      {formatPrice(entry.priceNow ?? null)}
                    </div>
                    {spreadVsMin != null && Number.isFinite(spreadVsMin) && (
                      <div className="text-[11px] text-muted-foreground">
                        {spreadVsMin === 0 ? 'Best price' : `+${spreadVsMin.toFixed(2)}% vs best`}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {range.toUpperCase()} change
                    </div>
                    <div
                      className={cn(
                        'inline-flex items-center gap-1 font-semibold',
                        changeValue == null
                          ? 'text-muted-foreground'
                          : positiveChange
                            ? 'text-emerald-500'
                            : 'text-red-500',
                      )}
                    >
                      {changeValue != null ? (
                        <>
                          {positiveChange ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {formatPercent(changeValue)}
                        </>
                      ) : (
                        '—'
                      )}
                    </div>
                    {spreadVsAvg != null && Number.isFinite(spreadVsAvg) && (
                      <div className="text-[11px] text-muted-foreground">
                        vs avg {spreadVsAvg >= 0 ? '+' : ''}
                        {spreadVsAvg.toFixed(2)}%
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Volume
                    </div>
                    <div className="font-medium text-foreground">
                      {formatUsdCompact(entry.volume ?? null)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Transactions
                    </div>
                    <div className="font-medium text-foreground">
                      {formatNumberCompact(entry.tx ?? null)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {totals && (
        <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
          <span>
            Volume:{' '}
            <span className="font-semibold text-foreground">{formatUsdCompact(totals.volume)}</span>
          </span>
          <span>
            Transactions:{' '}
            <span className="font-semibold text-foreground">{formatNumberCompact(totals.tx)}</span>
          </span>
          <span>
            Buyers:{' '}
            <span className="font-semibold text-emerald-500">
              {formatNumberCompact(totals.buyers)}
            </span>
          </span>
          <span>
            Sellers:{' '}
            <span className="font-semibold text-red-500">
              {formatNumberCompact(totals.sellers)}
            </span>
          </span>
        </div>
      )}
    </div>
  );
}

export default ComparisonTable;
