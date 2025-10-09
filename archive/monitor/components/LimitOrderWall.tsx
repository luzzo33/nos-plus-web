'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Target,
  RefreshCw,
  ArrowUpDown,
  Activity,
  Info,
  Layers,
  CircleDot,
  DollarSign,
} from 'lucide-react';
import { cn } from '@/lib/utils';

import {
  LIMIT_WALL_EXCHANGES,
  buildDefaultExchangeSelection,
  selectedExchangeIds,
  type MonitorExchangeSelection,
} from '@/lib/monitor/exchanges';
import { roundUsd, formatNumber } from '@/lib/monitor/numberFormat';
import {
  fetchLimitWallV2,
  type LimitWallV2Bucket,
  type LimitWallV2Response,
} from '@/services/limitWall';
import dynamic from 'next/dynamic';

const DepthChart = dynamic(() => import('./DepthChart').then((mod) => mod.DepthChart), {
  ssr: false,
});

const BOOK_HEIGHT = 440;
const ROW_LIMIT = 100;

const DECIMAL_OPTIONS = [
  { label: '0.10', value: 1 },
  { label: '0.01', value: 2 },
  { label: '0.001', value: 3 },
  { label: '0.0001', value: 4 },
] as const;

type SideFilter = 'both' | 'buy' | 'sell';
type DepthMode = 'base' | 'usd';

type BucketWithMeta = LimitWallV2Bucket & {
  usdPerBase?: number | null;
  deltaUsd?: number;
  cumulativeUsd?: number;
  cumulativeBase?: number;
};

const SOURCE_META: Record<string, { label: string; icon?: string }> = {
  jupiter: { label: 'Jupiter', icon: '/jupiter.svg' },
  gate: { label: 'Gate.io', icon: '/gate-io.svg' },
  mexc: { label: 'MEXC', icon: '/mexc.svg' },
  bitvavo: { label: 'Bitvavo', icon: '/bitvavo.svg' },
};

function deriveUsdPerBase(bucket: LimitWallV2Bucket): number | null {
  const base = Number(bucket.baseLiquidity ?? 0);
  const usd = Number(bucket.usdLiquidity ?? 0);
  if (base > 0 && usd > 0) return usd / base;
  return null;
}

function formatRelative(date: Date | null): string {
  if (!date) return '';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ${diffMin % 60}m ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function LimitOrderWall() {
  const [side, setSide] = useState<SideFilter>('both');
  const [decimals, setDecimals] = useState<number>(1);
  const [depthMode, setDepthMode] = useState<DepthMode>('base');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LimitWallV2Response | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const previousRef = useRef<LimitWallV2Response | null>(null);
  const [exchangeSelection, setExchangeSelection] = useState<MonitorExchangeSelection>(() =>
    buildDefaultExchangeSelection(LIMIT_WALL_EXCHANGES),
  );

  const exchangeIds = useMemo(
    () => selectedExchangeIds(exchangeSelection, LIMIT_WALL_EXCHANGES),
    [exchangeSelection],
  );
  const exchangeKey = useMemo(() => exchangeIds.join(','), [exchangeIds]);

  const toggleExchange = (id: string) => {
    setExchangeSelection((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (Object.values(next).some(Boolean)) return next;
      return prev;
    });
  };

  const load = async (manual = false) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    if (manual) setRefreshing(true);
    setLoading(!manual && !data);
    setError(null);
    try {
      const response = await fetchLimitWallV2({
        side,
        decimals,
        quote: 'USDC',
        venues: exchangeIds,
        signal: controller.signal,
      });
      previousRef.current = data;
      setData(response);
      setLastUpdated(new Date());
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err?.message || 'Failed to load limit order book');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, [side, decimals, exchangeKey]);

  useEffect(() => {
    const timer = setInterval(() => load(false), 4000);
    return () => clearInterval(timer);
  }, [side, decimals, exchangeKey, data]);

  const ladder = useMemo(() => {
    if (!data) return null;

    const previous = previousRef.current;
    const prevBuy = new Map<string, LimitWallV2Bucket>();
    const prevSell = new Map<string, LimitWallV2Bucket>();
    if (previous) {
      for (const bucket of previous.buyBuckets) {
        const label =
          bucket.priceLabel ?? bucket.priceFloor?.toFixed(previous.decimals ?? decimals) ?? '0';
        prevBuy.set(`${bucket.source ?? 'jupiter'}:${label}`, bucket);
      }
      for (const bucket of previous.sellBuckets) {
        const label =
          bucket.priceLabel ?? bucket.priceFloor?.toFixed(previous.decimals ?? decimals) ?? '0';
        prevSell.set(`${bucket.source ?? 'jupiter'}:${label}`, bucket);
      }
    }

    const mergeBuckets = (
      buckets: LimitWallV2Bucket[],
      previousMap: Map<string, LimitWallV2Bucket>,
    ) => {
      const merged = new Map<string, BucketWithMeta>();
      for (const bucket of buckets) {
        const label =
          bucket.priceLabel ?? bucket.priceFloor?.toFixed(data.decimals ?? decimals) ?? '0';
        const source = bucket.source ?? 'jupiter';
        const key = `${source}:${label}`;
        const existing = merged.get(key) ?? {
          ...bucket,
          priceLabel: label,
          baseLiquidity: 0,
          usdLiquidity: 0,
          orders: 0,
          cumulativeBase: 0,
          cumulativeUsd: 0,
          usdPerBase: null,
          deltaUsd: 0,
        };
        existing.baseLiquidity =
          Number(existing.baseLiquidity || 0) + Number(bucket.baseLiquidity || 0);
        existing.usdLiquidity =
          Number(existing.usdLiquidity || 0) + Number(bucket.usdLiquidity || 0);
        existing.orders = Number(existing.orders || 0) + Number(bucket.orders || 0);
        existing.priceFloor = bucket.priceFloor ?? existing.priceFloor;
        existing.priceCeil = bucket.priceCeil ?? existing.priceCeil;
        existing.usdPerBase = deriveUsdPerBase(existing);
        const prev = previousMap.get(key);
        if (prev) {
          existing.deltaUsd =
            Number(existing.deltaUsd || 0) +
            (Number(bucket.usdLiquidity || 0) - Number(prev.usdLiquidity || 0));
        }
        merged.set(key, existing);
      }
      return Array.from(merged.values());
    };

    const buysMerged = mergeBuckets(data.buyBuckets, prevBuy).sort(
      (a, b) => (b.priceFloor ?? 0) - (a.priceFloor ?? 0),
    );
    const sellsMerged = mergeBuckets(data.sellBuckets, prevSell).sort(
      (a, b) => (a.priceFloor ?? 0) - (b.priceFloor ?? 0),
    );

    let runningBase = 0;
    let runningUsd = 0;
    const buys = buysMerged.map((bucket) => {
      runningBase += Number(bucket.baseLiquidity || 0);
      runningUsd += Number(bucket.usdLiquidity || 0);
      return {
        ...bucket,
        cumulativeBase: runningBase,
        cumulativeUsd: runningUsd,
      };
    });

    runningBase = 0;
    runningUsd = 0;
    const sells = sellsMerged.map((bucket) => {
      runningBase += Number(bucket.baseLiquidity || 0);
      runningUsd += Number(bucket.usdLiquidity || 0);
      return {
        ...bucket,
        cumulativeBase: runningBase,
        cumulativeUsd: runningUsd,
      };
    });

    const bestBid = buys.find((bucket) => bucket.usdPerBase != null)?.usdPerBase ?? 0;
    const bestAsk = sells.find((bucket) => bucket.usdPerBase != null)?.usdPerBase ?? 0;
    const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;

    const maxBase = Math.max(
      1,
      ...buys.map((bucket) => Number(bucket.baseLiquidity || 0)),
      ...sells.map((bucket) => Number(bucket.baseLiquidity || 0)),
    );
    const maxUsd = Math.max(
      1,
      ...buys.map((bucket) => Number(bucket.usdLiquidity || 0)),
      ...sells.map((bucket) => Number(bucket.usdLiquidity || 0)),
    );

    return {
      buys,
      sells,
      bestBid,
      bestAsk,
      midPrice,
      maxBase,
      maxUsd,
    };
  }, [data, decimals]);

  const chartData = useMemo(() => {
    if (!data?.depthChart) return { bids: [], asks: [] };
    return {
      bids: data.depthChart.bids ?? [],
      asks: data.depthChart.asks ?? [],
    };
  }, [data?.depthChart]);

  const hasData = Boolean(ladder && (ladder.buys.length || ladder.sells.length));

  const renderRow = (bucket: BucketWithMeta, sideType: 'buy' | 'sell') => {
    const depthValue =
      depthMode === 'usd' ? Number(bucket.usdLiquidity || 0) : Number(bucket.baseLiquidity || 0);
    const maxDepth = depthMode === 'usd' ? (ladder?.maxUsd ?? 1) : (ladder?.maxBase ?? 1);
    const depthPercent = Math.min(100, (depthValue / Math.max(1, maxDepth)) * 100);
    const isBest =
      sideType === 'buy'
        ? bucket.usdPerBase === ladder?.bestBid
        : bucket.usdPerBase === ladder?.bestAsk;

    const priceDisplay = bucket.priceLabel ?? bucket.priceFloor?.toFixed(decimals) ?? '—';
    const approxUsd = bucket.usdPerBase != null ? roundUsd(bucket.usdPerBase) : '—';
    const depthDisplay =
      depthMode === 'usd'
        ? roundUsd(bucket.usdLiquidity ?? 0)
        : `${formatNumber(bucket.baseLiquidity)} ${data?.base ?? ''}`;
    const cumulativeDisplay =
      depthMode === 'usd'
        ? roundUsd(bucket.cumulativeUsd ?? 0)
        : formatNumber(bucket.cumulativeBase ?? 0);

    return (
      <div
        key={`${sideType}-${bucket.priceLabel}-${bucket.source ?? 'jupiter'}`}
        className={cn(
          'relative overflow-hidden rounded-md border border-border/40 bg-background/95 transition-colors',
          sideType === 'buy' ? 'hover:bg-emerald-500/5' : 'hover:bg-red-500/5',
        )}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            width: `${depthPercent}%`,
            background: sideType === 'buy' ? 'rgba(16,185,129,0.18)' : 'rgba(239,68,68,0.18)',
          }}
        />
        <div className="relative grid grid-cols-[1.2fr_1fr_1fr_0.8fr] items-center gap-2 px-3 py-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="leading-tight">
              <div
                className={cn(
                  'font-mono font-semibold',
                  sideType === 'buy'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400',
                )}
              >
                {priceDisplay}
              </div>
              <div className="text-[10px] text-muted-foreground">≈ {approxUsd}</div>
            </div>
            {isBest && <CircleDot className="w-3 h-3 text-primary" />}
          </div>
          <div className="font-mono text-muted-foreground flex items-center gap-1">
            <span>{depthDisplay}</span>
            {bucket.deltaUsd !== 0 && (
              <span
                className={cn(
                  'text-[10px] uppercase tracking-tight px-1 rounded',
                  bucket.deltaUsd && bucket.deltaUsd > 0
                    ? 'bg-emerald-500/10 text-emerald-600'
                    : 'bg-red-500/10 text-red-600',
                )}
              >
                {roundUsd(bucket.deltaUsd ?? 0)}
              </span>
            )}
          </div>
          <div className="font-mono text-muted-foreground">
            {depthMode === 'usd'
              ? `${formatNumber(bucket.baseLiquidity)} ${data?.base ?? ''}`
              : roundUsd(bucket.usdLiquidity ?? 0)}
          </div>
          <div className="flex items-center gap-2 justify-end text-muted-foreground">
            <span className="font-mono">{cumulativeDisplay}</span>
            {bucket.source && (
              <span className="text-[10px] uppercase border border-border/50 rounded px-1 py-0.5">
                {bucket.source}
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="p-3 sm:p-4 border-b border-border/50">
        <div className="flex flex-col gap-2 sm:gap-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Target className="w-5 h-5 text-primary shrink-0" />
              <h3 className="font-semibold leading-tight truncate">Limit Order Book</h3>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap items-center gap-1">
                {LIMIT_WALL_EXCHANGES.map((exchange) => {
                  const checked = !!exchangeSelection[exchange.id];
                  return (
                    <label
                      key={exchange.id}
                      className={cn(
                        'flex items-center gap-1 rounded border px-1.5 py-0.5 text-[10px] uppercase tracking-tight',
                        checked
                          ? 'border-primary/50 bg-primary/10 text-foreground'
                          : 'border-border/60 text-muted-foreground',
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-3 w-3 accent-primary"
                        checked={checked}
                        onChange={() => toggleExchange(exchange.id)}
                      />
                      <span>{exchange.label}</span>
                    </label>
                  );
                })}
              </div>
              <div className="flex rounded-lg border border-border bg-background p-1">
                <button
                  className={cn(
                    'px-2 py-1 rounded text-[11px] md:text-xs flex items-center gap-1',
                    depthMode === 'base' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                  onClick={() => setDepthMode('base')}
                >
                  <Layers className="w-3 h-3" /> Base
                </button>
                <button
                  className={cn(
                    'px-2 py-1 rounded text-[11px] md:text-xs flex items-center gap-1',
                    depthMode === 'usd' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                  onClick={() => setDepthMode('usd')}
                >
                  <DollarSign className="w-3 h-3" /> USD
                </button>
              </div>
              <div className="flex rounded-lg border border-border bg-background p-1">
                <button
                  className={cn(
                    'px-2 py-1 rounded text-[11px] md:text-xs',
                    side === 'both' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                  onClick={() => setSide('both')}
                >
                  Both
                </button>
                <button
                  className={cn(
                    'px-2 py-1 rounded text-[11px] md:text-xs',
                    side === 'buy' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                  onClick={() => setSide('buy')}
                >
                  Bids
                </button>
                <button
                  className={cn(
                    'px-2 py-1 rounded text-[11px] md:text-xs',
                    side === 'sell' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  )}
                  onClick={() => setSide('sell')}
                >
                  Asks
                </button>
              </div>
              <div className="flex items-center gap-1 text-[11px] md:text-xs">
                <span className="text-muted-foreground hidden sm:inline">Bucket</span>
                <select
                  className="h-7 rounded border border-border bg-background px-2"
                  value={decimals}
                  onChange={(event) => setDecimals(Number(event.target.value))}
                >
                  {DECIMAL_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                className="p-2 rounded-lg border border-border hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw className={cn('w-4 h-4', refreshing && 'animate-spin')} />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[11px] sm:text-sm">
            <span className="px-2 py-0.5 rounded-full bg-muted/40 border border-border/50 text-muted-foreground inline-flex items-center gap-1">
              <Activity className="w-3 h-3" /> {formatNumber(data?.totalBuyBase ?? 0)} bid •{' '}
              {formatNumber(data?.totalSellBase ?? 0)} ask
            </span>
            {data?.sources?.length ? (
              <span className="px-2 py-0.5 rounded-full bg-muted/40 border border-border/50 text-muted-foreground inline-flex items-center gap-1">
                Sources: {data.sources.map((source) => source.toUpperCase()).join(', ')}
              </span>
            ) : null}
            <span className="px-2 py-0.5 rounded-full bg-muted/40 border border-border/50 text-muted-foreground inline-flex items-center gap-1">
              <Info className="w-3 h-3" /> Updated {formatRelative(lastUpdated)}
            </span>
            {ladder && ladder.bestBid > 0 && ladder.bestAsk > 0 ? (
              <span className="px-2 py-0.5 rounded-full bg-muted/40 border border-border/50 text-muted-foreground inline-flex items-center gap-1">
                <ArrowUpDown className="w-3 h-3" />{' '}
                {(((ladder.bestAsk - ladder.bestBid) / ladder.bestBid) * 100).toFixed(2)}% spread
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              <span className="text-sm text-muted-foreground">Loading limit order book…</span>
            </div>
          </div>
        ) : error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        ) : !hasData ? (
          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
              <h4 className="font-semibold mb-1">No order book data</h4>
              <p className="text-sm text-muted-foreground">
                Try adjusting bucket size or venue filters.
              </p>
            </div>
          </div>
        ) : ladder ? (
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="flex flex-col gap-4 min-h-[520px]">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Mid Price
                  </div>
                  <div className="text-lg font-semibold">{roundUsd(ladder.midPrice ?? null)}</div>
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                    <ArrowUpDown className="w-3 h-3" />
                    Bid {roundUsd(ladder.bestBid ?? null)} / Ask {roundUsd(ladder.bestAsk ?? null)}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Top Bid Clusters
                  </div>
                  <div className="space-y-1">
                    {ladder.buys.slice(0, 3).map((bucket) => (
                      <div
                        key={`bid-cluster-${bucket.priceLabel}-${bucket.source ?? 'jupiter'}`}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-emerald-600 dark:text-emerald-400">
                          {bucket.priceLabel}
                        </span>
                        <span className="font-mono text-muted-foreground flex items-center gap-1">
                          {formatNumber(bucket.baseLiquidity)} {data?.base}
                          {bucket.source && (
                            <span className="text-[9px] uppercase">{bucket.source}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-border/60 bg-background/80 p-3">
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground mb-1">
                    Top Ask Clusters
                  </div>
                  <div className="space-y-1">
                    {ladder.sells.slice(0, 3).map((bucket) => (
                      <div
                        key={`ask-cluster-${bucket.priceLabel}-${bucket.source ?? 'jupiter'}`}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="font-mono text-red-600 dark:text-red-400">
                          {bucket.priceLabel}
                        </span>
                        <span className="font-mono text-muted-foreground flex items-center gap-1">
                          {formatNumber(bucket.baseLiquidity)} {data?.base}
                          {bucket.source && (
                            <span className="text-[9px] uppercase">{bucket.source}</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-border/50 bg-background/80 p-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>
                    Order Book ({depthMode === 'usd' ? 'USD depth' : `${data?.base ?? ''} depth`})
                  </span>
                  <span>Price • Amount • Accum.</span>
                </div>
                <div className="grid gap-4 lg:grid-cols-2">
                  {(side === 'both' || side === 'sell') && (
                    <div className="flex flex-col" style={{ height: BOOK_HEIGHT }}>
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground px-1 mb-1">
                        <span>Asks</span>
                        <span>Accum.</span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {ladder.sells
                          .slice(0, ROW_LIMIT)
                          .map((bucket) => renderRow(bucket, 'sell'))}
                      </div>
                    </div>
                  )}
                  {(side === 'both' || side === 'buy') && (
                    <div className="flex flex-col" style={{ height: BOOK_HEIGHT }}>
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-muted-foreground px-1 mb-1">
                        <span>Bids</span>
                        <span>Accum.</span>
                      </div>
                      <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                        {ladder.buys.slice(0, ROW_LIMIT).map((bucket) => renderRow(bucket, 'buy'))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-4 min-h-[520px]">
              {chartData.bids.length || chartData.asks.length ? (
                <div className="rounded-lg border border-border/50 bg-background/80 p-3">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>
                      Depth Chart (
                      {depthMode === 'usd' ? 'USD cumulative' : `${data?.base ?? ''} cumulative`})
                    </span>
                    <span>Price (x-axis) • cumulative size (y-axis)</span>
                  </div>
                  <div className="h-60">
                    <DepthChart
                      bids={chartData.bids}
                      asks={chartData.asks}
                      depthMode={depthMode}
                      className="w-full h-full"
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border border-border/50 bg-background/80 p-4 text-xs text-muted-foreground space-y-2">
                <div className="text-sm font-semibold text-foreground">Order Book Tips</div>
                <ul className="list-disc pl-4 space-y-1">
                  <li>
                    Bucket size controls price aggregation; choose 0.0001 for the finest view.
                  </li>
                  <li>Toggle Base/USD to inspect liquidity in the unit that matters to you.</li>
                  <li>
                    Use venue checkboxes to isolate Gate.io depth versus on-chain Jupiter orders.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
