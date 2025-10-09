'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { toDate, formatLocal, getUserLocale, getUserTimeZone } from '@/lib/time';
import {
  useStatsStream,
  type StatsSnapshot,
  type StatsComparisonPayload,
  type StatsRange,
} from '@/lib/monitor/useStatsStream';
import { MONITOR_EXCHANGES, selectedExchangeIds, selectedVenues } from '@/lib/monitor/exchanges';
import { cn } from '@/lib/utils';
import CustomDropdown from '@/components/ui/CustomDropdown';
import {
  useDashboardSnapshot,
  type DashboardStatsSnapshot,
  type DashboardSnapshot,
} from '@/lib/monitor/dashboardBootstrap';
import { MonitorWidgetFrame } from '@/components/monitor/MonitorWidgetFrame';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Zap,
  BarChart3,
  BarChart2,
  Sparkles,
} from 'lucide-react';
import ComparisonTable from '@/components/monitor/ComparisonTable';

function formatNumber(n?: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return '--';
  const v = Number(n);
  const a = Math.abs(v);
  if (a >= 1_000_000_000) return (v / 1_000_000_000).toFixed(2) + 'B';
  if (a >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (a >= 1_000) return (v / 1_000).toFixed(1) + 'k';
  if (a >= 1) return v.toFixed(2);
  if (a >= 0.01) return v.toFixed(4);
  return v.toPrecision(2);
}

function convertDashboardStats(
  entry: DashboardStatsSnapshot,
  venueLabel: string | null,
): StatsSnapshot {
  return {
    venue: venueLabel ?? entry.venue ?? null,
    priceNow: entry.priceNow ?? null,
    change5m: entry.change5m ?? null,
    change1h: entry.change1h ?? null,
    change6h: entry.change6h ?? null,
    change24h: entry.change24h ?? null,
    volume: entry.volume ?? null,
    tx: entry.tx ?? null,
    buyers: entry.buyers ?? null,
    sellers: entry.sellers ?? null,
  };
}

function buildAggregateStats(
  snapshot: DashboardSnapshot | null | undefined,
  aggregate: 'total' | 'avg',
  range: string,
  selectionIds: string[],
): DashboardStatsSnapshot | null {
  if (!snapshot) return null;
  const venues = selectionIds.length ? selectionIds : Object.keys(snapshot.stats.perVenue || {});
  const statsList = venues
    .map((id) => snapshot.stats.perVenue?.[id]?.[range])
    .filter((entry): entry is DashboardStatsSnapshot => Boolean(entry));

  if (!statsList.length) {
    return aggregate === 'avg'
      ? (snapshot.stats.average?.[range] ?? null)
      : (snapshot.stats.total?.[range] ?? null);
  }

  let priceSum = 0;
  let priceCount = 0;
  let change5Sum = 0;
  let change1Sum = 0;
  let change6Sum = 0;
  let change24Sum = 0;
  let volumeSum = 0;
  let txSum = 0;
  let buyersSum = 0;
  let sellersSum = 0;
  let updatedAt: string | null = null;

  for (const stat of statsList) {
    if (stat.priceNow != null) {
      priceSum += stat.priceNow;
      priceCount += 1;
    }
    change5Sum += stat.change5m ?? 0;
    change1Sum += stat.change1h ?? 0;
    change6Sum += stat.change6h ?? 0;
    change24Sum += stat.change24h ?? 0;
    volumeSum += stat.volume ?? 0;
    txSum += stat.tx ?? 0;
    buyersSum += stat.buyers ?? 0;
    sellersSum += stat.sellers ?? 0;
    if (stat.updatedAt && (!updatedAt || stat.updatedAt > updatedAt)) {
      updatedAt = stat.updatedAt;
    }
  }

  const divisor = statsList.length || 1;
  const priceNow = priceCount > 0 ? priceSum / priceCount : null;
  const aggregateStats: DashboardStatsSnapshot = {
    venue: null,
    priceNow,
    change5m: change5Sum / divisor,
    change1h: change1Sum / divisor,
    change6h: change6Sum / divisor,
    change24h: change24Sum / divisor,
    volume: aggregate === 'avg' ? volumeSum / divisor : volumeSum,
    tx: aggregate === 'avg' ? txSum / divisor : txSum,
    buyers: aggregate === 'avg' ? buyersSum / divisor : buyersSum,
    sellers: aggregate === 'avg' ? sellersSum / divisor : sellersSum,
    updatedAt: updatedAt ?? snapshot.generatedAt,
  };

  return aggregateStats;
}

const EXCHANGES_FOR_STATS = MONITOR_EXCHANGES.filter((ex) => ex.id !== 'jupiter');

type RangeValue = '5m' | '1h' | '6h' | '24h';
type AggregateValue = 'total' | 'avg';
const RANGE_OPTIONS: Array<{ value: RangeValue; label: string }> = [
  { value: '5m', label: '5 min' },
  { value: '1h', label: '1 hour' },
  { value: '6h', label: '6 hours' },
  { value: '24h', label: '24 hours' },
];

const AGGREGATE_OPTIONS: Array<{ value: AggregateValue; label: string }> = [
  { value: 'total', label: 'Total' },
  { value: 'avg', label: 'Average' },
];

interface AggregatedTotals {
  volume: number;
  tx: number;
  buyers: number;
  sellers: number;
}

export function StatsSummaryCard() {
  const [range, setRange] = useState<RangeValue>('24h');
  const [aggregate, setAggregate] = useState<AggregateValue>('total');
  const [compareMode, setCompareMode] = useState<boolean>(false);
  const [exchangeSelection, setExchangeSelection] = useState(() =>
    EXCHANGES_FOR_STATS.reduce<Record<string, boolean>>((acc, e) => {
      acc[e.id] = true;
      return acc;
    }, {}),
  );
  const dashboard = useDashboardSnapshot();

  const handleExchangeClick = useCallback(
    (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
      const exclusive = event.ctrlKey || event.metaKey;
      setExchangeSelection((prev) => {
        if (exclusive) {
          const next: Record<string, boolean> = {};
          for (const ex of EXCHANGES_FOR_STATS) {
            next[ex.id] = ex.id === id;
          }
          return next;
        }

        const next = { ...prev, [id]: !prev[id] };
        if (!Object.values(next).some(Boolean)) {
          return prev;
        }
        return next;
      });
    },
    [],
  );

  const venuesCsv = useMemo(
    () => selectedVenues(exchangeSelection, EXCHANGES_FOR_STATS).join(','),
    [exchangeSelection],
  );
  const selectionIds = useMemo(
    () => selectedExchangeIds(exchangeSelection, EXCHANGES_FOR_STATS),
    [exchangeSelection],
  );

  const initialStats = useMemo(() => {
    if (!dashboard) return undefined;
    if (compareMode) {
      const venues = selectionIds.length ? selectionIds : MONITOR_EXCHANGES.map((ex) => ex.id);
      let latestUpdated: string | null = null;
      const rows = venues
        .map((id) => {
          const entry = dashboard.stats.perVenue?.[id]?.[range];
          if (!entry) return null;
          if (entry.updatedAt && (!latestUpdated || entry.updatedAt > latestUpdated))
            latestUpdated = entry.updatedAt;
          const label = EXCHANGES_FOR_STATS.find((ex) => ex.id === id)?.label ?? id;
          return convertDashboardStats(entry, label);
        })
        .filter(Boolean) as StatsSnapshot[];
      if (!rows.length) return undefined;
      const totals = rows.reduce<AggregatedTotals>(
        (acc, row) => {
          acc.volume += Number(row.volume ?? 0);
          acc.tx += Number(row.tx ?? 0);
          acc.buyers += Number(row.buyers ?? 0);
          acc.sellers += Number(row.sellers ?? 0);
          return acc;
        },
        { volume: 0, tx: 0, buyers: 0, sellers: 0 },
      );
      const comparison: StatsComparisonPayload = {
        range: range as StatsRange,
        aggregate,
        entries: rows,
        totals,
        spreadSummary: null,
        updatedAt: latestUpdated ?? dashboard.generatedAt ?? null,
      };
      return {
        rows,
        updatedAt: latestUpdated ?? dashboard.generatedAt,
        view: 'comparison',
        comparison,
      };
    }
    const combined = buildAggregateStats(dashboard, aggregate, range, selectionIds);
    if (!combined) return undefined;
    return {
      rows: [convertDashboardStats(combined, null)],
      updatedAt: combined.updatedAt ?? dashboard.generatedAt,
    };
  }, [dashboard, aggregate, range, compareMode, selectionIds]);

  const {
    rows,
    connected,
    updatedAt,
    loading,
    refresh,
    comparison: comparisonPayload,
  } = useStatsStream({
    range,
    aggregate,
    venues: venuesCsv || undefined,
    groupBy: compareMode ? 'venue' : null,
    view: compareMode ? 'comparison' : 'default',
    initial: initialStats,
  });

  const aggregateRow = useMemo(() => {
    if (!compareMode) return rows[0];
    if (!rows.length) return undefined;
    const totals = rows.reduce<AggregatedTotals>(
      (acc, r) => {
        acc.volume += Number(r.volume ?? 0);
        acc.tx += Number(r.tx ?? 0);
        acc.buyers += Number(r.buyers ?? 0);
        acc.sellers += Number(r.sellers ?? 0);
        return acc;
      },
      { volume: 0, tx: 0, buyers: 0, sellers: 0 },
    );
    if (aggregate === 'avg' || aggregate === 'total') {
      const n = rows.length;
      const avg = (k: keyof (typeof rows)[number]) => {
        const vals = rows.map((r) => Number(r[k] ?? 0));
        return n ? vals.reduce((a, b) => a + b, 0) / n : null;
      };
      const result: StatsSnapshot = {
        venue: null,
        priceNow: avg('priceNow'),
        change5m: avg('change5m'),
        change1h: avg('change1h'),
        change6h: avg('change6h'),
        change24h: avg('change24h'),
        volume: totals.volume,
        tx: totals.tx,
        buyers: totals.buyers,
        sellers: totals.sellers,
      };
      return result;
    }
    return undefined;
  }, [rows, compareMode, aggregate]);

  const comparisonData = useMemo<StatsComparisonPayload | null>(() => {
    if (!compareMode) return null;
    if (comparisonPayload) return comparisonPayload;
    if (!rows.length) return null;
    const totals = rows.reduce<AggregatedTotals>(
      (acc, r) => {
        acc.volume += Number(r.volume ?? 0);
        acc.tx += Number(r.tx ?? 0);
        acc.buyers += Number(r.buyers ?? 0);
        acc.sellers += Number(r.sellers ?? 0);
        return acc;
      },
      { volume: 0, tx: 0, buyers: 0, sellers: 0 },
    );
    return {
      range: range as StatsRange,
      aggregate,
      entries: rows,
      totals,
      spreadSummary: null,
      updatedAt: updatedAt ?? null,
    };
  }, [compareMode, comparisonPayload, rows, range, aggregate, updatedAt]);

  const priceFlashTimer = useRef<number | null>(null);
  const prevPriceRef = useRef<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    return () => {
      if (priceFlashTimer.current) {
        clearTimeout(priceFlashTimer.current);
        priceFlashTimer.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const price = aggregateRow?.priceNow;
    if (price == null || !Number.isFinite(price)) return;
    const prev = prevPriceRef.current;
    if (prev != null && price !== prev) {
      const direction = price > prev ? 'up' : 'down';
      setPriceFlash(direction);
      if (priceFlashTimer.current) clearTimeout(priceFlashTimer.current);
      priceFlashTimer.current = window.setTimeout(() => {
        setPriceFlash(null);
        priceFlashTimer.current = null;
      }, 1400);
    }
    prevPriceRef.current = price;
  }, [aggregateRow?.priceNow]);

  const priceClass =
    priceFlash === 'up'
      ? 'text-emerald-500'
      : priceFlash === 'down'
        ? 'text-red-500'
        : 'text-foreground';

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let debounceId: number | null = null;
    const selectedSet = new Set(selectionIds);
    const handle = (event: Event) => {
      const detail = (event as CustomEvent).detail as Array<{ venue?: string | null }> | undefined;
      if (!detail || !detail.length) return;
      if (selectedSet.size) {
        const matches = detail.some((evt) => evt?.venue && selectedSet.has(String(evt.venue)));
        if (!matches) return;
      }
      if (debounceId !== null) return;
      debounceId = window.setTimeout(() => {
        refresh();
        debounceId = null;
      }, 800);
    };
    window.addEventListener('np:monitor-event', handle as EventListener);
    return () => {
      if (debounceId !== null) window.clearTimeout(debounceId);
      window.removeEventListener('np:monitor-event', handle as EventListener);
    };
  }, [refresh, selectionIds, compareMode, aggregate]);

  const headerStatus = connected
    ? { label: 'Live', tone: 'success' as const, pulse: true }
    : loading
      ? { label: 'Syncing', tone: 'warning' as const, pulse: false }
      : { label: 'Offline', tone: 'danger' as const, pulse: false };

  const selectedCount = Math.max(selectionIds.length, 1);
  const totalExchanges = EXCHANGES_FOR_STATS.length;

  const controlPillBase =
    'h-8 rounded-xl border border-border/40 bg-background/85 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground';

  const formatCountValue = useCallback(
    (value: number | null | undefined) => {
      if (value == null) return '---';
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) return '---';
      return new Intl.NumberFormat(undefined, {
        maximumFractionDigits: aggregate === 'avg' ? 2 : 0,
        minimumFractionDigits: 0,
      }).format(numeric);
    },
    [aggregate],
  );

  const headerControls = (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 sm:justify-end sm:gap-3">
        <CustomDropdown
          options={RANGE_OPTIONS}
          value={range}
          onSelect={(value) => setRange(value as RangeValue)}
          size="sm"
          variant="ghost"
          className="w-full min-[420px]:w-auto"
          triggerClassName={cn(controlPillBase, 'w-full min-[420px]:w-auto justify-between')}
        />
        <CustomDropdown
          options={AGGREGATE_OPTIONS}
          value={aggregate}
          onSelect={(value) => setAggregate(value as AggregateValue)}
          size="sm"
          variant="ghost"
          className="w-full min-[420px]:w-auto"
          triggerClassName={cn(controlPillBase, 'w-full min-[420px]:w-auto justify-between')}
        />
        <button
          type="button"
          onClick={() => setCompareMode((prev) => !prev)}
          className={cn(
            controlPillBase,
            'inline-flex items-center justify-center gap-1.5 border-dashed sm:w-auto',
            compareMode
              ? 'border-primary/60 bg-primary/10 text-primary shadow-sm'
              : 'border-border/60 bg-background/80',
          )}
          aria-pressed={compareMode}
        >
          <Sparkles className="h-4 w-4" />
          <span>Advanced view</span>
          <span
            className={cn(
              'text-[10px] uppercase tracking-wide',
              compareMode ? 'text-primary' : 'text-muted-foreground',
            )}
          >
            {compareMode ? 'On' : 'Off'}
          </span>
        </button>
        <span className="ml-auto inline-flex items-center rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-foreground/80">
          {selectedCount}/{totalExchanges}
        </span>
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Exchange filters">
        {EXCHANGES_FOR_STATS.map((ex) => {
          const selected = !!exchangeSelection[ex.id];
          return (
            <button
              key={ex.id}
              type="button"
              onClick={(event) => handleExchangeClick(ex.id, event)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40',
                selected
                  ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                  : 'border-border/40 bg-background/60 text-muted-foreground hover:text-foreground',
              )}
            >
              {ex.icon && (
                <Image
                  src={ex.icon}
                  alt=""
                  width={16}
                  height={16}
                  className="rounded border border-border/50 bg-background p-[1px] shadow-sm"
                />
              )}
              <span className="max-w-[80px] truncate">{ex.label.replace(/\s*\(.*\)$/, '')}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const updatedLabel = updatedAt
    ? (() => {
        const d = toDate(updatedAt);
        const tz = getUserTimeZone();
        const lc = getUserLocale();
        return d ? formatLocal(d, 'MMM dd, HH:mm', lc, tz) : '';
      })()
    : null;

  const totalsForDisplay = compareMode && comparisonData ? comparisonData.totals : null;
  const volumeValue = totalsForDisplay ? totalsForDisplay.volume : (aggregateRow?.volume ?? null);
  const txValue = totalsForDisplay ? totalsForDisplay.tx : (aggregateRow?.tx ?? null);
  const buyersValue = totalsForDisplay ? totalsForDisplay.buyers : (aggregateRow?.buyers ?? null);
  const sellersValue = totalsForDisplay
    ? totalsForDisplay.sellers
    : (aggregateRow?.sellers ?? null);

  const transactionsDisplay = formatCountValue(txValue);
  const buyersDisplay = formatCountValue(buyersValue);
  const sellersDisplay = formatCountValue(sellersValue);
  const comparisonEntries = comparisonData?.entries ?? rows;
  const comparisonRange = (comparisonData?.range ?? range) as StatsRange;

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    window.dispatchEvent(new CustomEvent('np:stats-advanced-view', { detail: compareMode }));
    return () => {
      if (compareMode) {
        window.dispatchEvent(new CustomEvent('np:stats-advanced-view', { detail: false }));
      }
    };
  }, [compareMode]);

  return (
    <MonitorWidgetFrame
      title="Market Stats"
      subtitle="Live metrics across selected venues"
      icon={<BarChart3 className="h-5 w-5" />}
      status={headerStatus}
      actions={headerControls}
      className="h-full flex flex-col"
      contentClassName="flex flex-1 flex-col space-y-6"
    >
      <div className="flex flex-1 flex-col space-y-6">
        {loading && (
          <div className="flex flex-1 flex-col gap-5">
            <div className="rounded-2xl border border-border/40 bg-background/60 p-4 shadow-sm">
              <div className="h-3 w-20 animate-pulse rounded bg-muted/40" />
              <div className="mt-3 h-6 w-36 animate-pulse rounded bg-muted/30" />
            </div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 rounded-xl border border-border/30 bg-muted/20 animate-pulse"
                />
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div
                  key={index}
                  className="h-20 rounded-xl border border-border/30 bg-muted/20 animate-pulse"
                />
              ))}
            </div>
          </div>
        )}

        {!loading && aggregateRow && !compareMode && (
          <div className="flex flex-1 flex-col gap-5">
            <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/12 via-primary/5 to-background p-4 shadow-sm">
              <div
                className="absolute -right-12 -top-10 h-40 w-40 rounded-full bg-primary/20 blur-3xl"
                aria-hidden="true"
              />
              <div className="relative flex flex-col gap-2">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Current price</span>
                </div>
                <div className={cn('text-xl font-bold tracking-tight sm:text-2xl', priceClass)}>
                  {aggregate === 'total' && compareMode
                    ? '---'
                    : `$${formatNumber(aggregateRow.priceNow)}`}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { key: 'change5m', label: '5 min', value: aggregateRow.change5m },
                { key: 'change1h', label: '1 hour', value: aggregateRow.change1h },
                { key: 'change6h', label: '6 hours', value: aggregateRow.change6h },
                { key: 'change24h', label: '24 hours', value: aggregateRow.change24h },
              ].map(({ key, label, value }) => {
                const isPositive = (value ?? 0) >= 0;
                const showValue = !(aggregate === 'total' && compareMode);
                return (
                  <div
                    key={key}
                    className={cn(
                      'rounded-xl border border-border/40 bg-background/70 p-3 shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md',
                      isPositive ? 'border-emerald-400/30' : 'border-red-400/30',
                    )}
                  >
                    <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {isPositive ? (
                        <TrendingUp className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span>{label}</span>
                    </div>
                    <div
                      className={cn(
                        'text-base font-semibold sm:text-lg',
                        showValue && value != null
                          ? isPositive
                            ? 'text-emerald-500'
                            : 'text-red-500'
                          : 'text-muted-foreground',
                      )}
                    >
                      {showValue && value != null
                        ? `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
                        : '---'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border/40 bg-background/70 p-3 shadow-sm">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <BarChart2 className="h-4 w-4 text-blue-500" />
                  <span>Volume</span>
                </div>
                <div className="text-base font-semibold text-foreground sm:text-lg">
                  ${formatNumber(volumeValue ?? null)}
                </div>
              </div>
              <div className="rounded-xl border border-border/40 bg-background/70 p-3 shadow-sm">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Activity className="h-4 w-4 text-purple-500" />
                  <span>Transactions</span>
                </div>
                <div className="text-base font-semibold text-foreground sm:text-lg">
                  {transactionsDisplay}
                </div>
              </div>
              <div className="col-span-2 rounded-xl border border-border/40 bg-background/70 p-3 shadow-sm sm:col-span-1">
                <div className="mb-1.5 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  <Users className="h-4 w-4 text-orange-500" />
                  <span>Buyers / Sellers</span>
                </div>
                <div className="flex items-baseline gap-2 text-base font-semibold text-foreground sm:text-lg">
                  <span
                    className={cn(
                      buyersDisplay !== '---' ? 'text-emerald-500' : 'text-muted-foreground',
                    )}
                  >
                    {buyersDisplay}
                  </span>
                  <span className="text-muted-foreground">/</span>
                  <span
                    className={cn(
                      sellersDisplay !== '---' ? 'text-red-500' : 'text-muted-foreground',
                    )}
                  >
                    {sellersDisplay}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {compareMode && (
          <div className="flex-1">
            <ComparisonTable
              entries={comparisonEntries}
              range={comparisonRange}
              totals={comparisonData?.totals}
              spreadSummary={comparisonData?.spreadSummary ?? undefined}
              loading={loading}
            />
          </div>
        )}

        {!loading && !rows.length && !compareMode && (
          <div className="flex flex-1 flex-col items-center gap-2 rounded-xl border border-dashed border-border/50 bg-background/60 px-6 py-6 text-center">
            <Activity className="h-8 w-8 text-muted-foreground/60" />
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground/80">No data available</p>
              <p className="text-xs text-muted-foreground">
                Adjust your exchange selection or time range
              </p>
            </div>
          </div>
        )}

        {updatedLabel && (
          <div className="mt-auto flex items-center justify-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
            <span
              className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-amber-500')}
            />
            <span>Updated {updatedLabel}</span>
          </div>
        )}
      </div>
    </MonitorWidgetFrame>
  );
}
