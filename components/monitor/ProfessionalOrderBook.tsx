'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Target,
  RefreshCw,
  Activity,
  DollarSign,
  Layers,
  Table as TableIcon,
  CandlestickChart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { MonitorWidgetFrame } from '@/components/monitor/MonitorWidgetFrame';
import { OrderBookTradingView } from '@/components/order-book/OrderBookTradingView';
import {
  useOrderBookChartStream,
  type OrderBookLimitLevel,
} from '@/lib/monitor/useOrderBookChartStream';

import {
  LIMIT_WALL_EXCHANGES,
  buildDefaultExchangeSelection,
  selectedVenues,
  type MonitorExchangeSelection,
} from '@/lib/monitor/exchanges';
import { roundUsd, formatNumber } from '@/lib/monitor/numberFormat';
import { monitorWsClient, type SubscriptionListener } from '@/lib/monitor/ws-client';
import type {
  LimitWallV2Bucket,
  LimitWallV2Response,
  LimitWallDepthPoint,
} from '@/services/limitWall';
import dynamic from 'next/dynamic';

const DepthChart = dynamic(() => import('./DepthChartD3'), { ssr: false });

const DECIMAL_OPTIONS = [
  { label: '0.10', value: 1 },
  { label: '0.01', value: 2 },
  { label: '0.001', value: 3 },
  { label: '0.0001', value: 4 },
] as const;

const DESKTOP_INITIAL_ROWS = 20;
const MOBILE_INITIAL_ROWS = 8;
const DESKTOP_ROW_INCREMENT = 20;
const MOBILE_ROW_INCREMENT = 8;
const MOBILE_BREAKPOINT = 768;
const PRICE_RANGE_PERCENT = 0.2;

type SideFilter = 'both' | 'buy' | 'sell';
type DepthMode = 'base' | 'usd';
type OrderBookViewMode = 'table' | 'depth' | 'trading';

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
  kraken: { label: 'Kraken', icon: '/kraken.svg' },
};

const getDefaultRowLimit = (isMobile: boolean) =>
  isMobile ? MOBILE_INITIAL_ROWS : DESKTOP_INITIAL_ROWS;

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

interface ProfessionalOrderBookProps {
  height?: number;
}

export function ProfessionalOrderBook({ height }: ProfessionalOrderBookProps = {}) {
  const [side, setSide] = useState<SideFilter>('both');
  const [decimals, setDecimals] = useState<number>(2);
  const [depthMode, setDepthMode] = useState<DepthMode>('usd');
  const [aggregateLevel, setAggregateLevel] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<LimitWallV2Response | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [viewMode, setViewMode] = useState<OrderBookViewMode>('table');
  const [priceDomain, setPriceDomain] = useState<[number, number] | null>(null);
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });
  const [visibleRowLimit, setVisibleRowLimit] = useState(() => {
    if (typeof window === 'undefined') return DESKTOP_INITIAL_ROWS;
    return getDefaultRowLimit(window.innerWidth < MOBILE_BREAKPOINT);
  });
  const [refreshToken, setRefreshToken] = useState(0);
  const tradingViewAggregationOptions = useMemo(
    () => [
      { value: '1', label: '±1%' },
      { value: '2', label: '±2%' },
      { value: '3', label: '±3%' },
      { value: '5', label: '±5%' },
      { value: '10', label: '±10%' },
      { value: '20', label: '±20%' },
      { value: '50', label: '±50%' },
    ],
    [],
  );
  const [tradingViewAggregationPct, setTradingViewAggregationPct] = useState<number>(1);

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);

  const frameStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (typeof height === 'number' && Number.isFinite(height)) {
      return { height, maxHeight: height } as React.CSSProperties;
    }
    if (typeof lockedHeight === 'number' && lockedHeight > 0) {
      return { height: lockedHeight, maxHeight: lockedHeight } as React.CSSProperties;
    }
    return undefined;
  }, [height, lockedHeight]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setIsMobileViewport(window.innerWidth < MOBILE_BREAKPOINT);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const defaultRowLimit = useMemo(() => getDefaultRowLimit(isMobileViewport), [isMobileViewport]);
  const rowIncrement = isMobileViewport ? MOBILE_ROW_INCREMENT : DESKTOP_ROW_INCREMENT;

  useEffect(() => {
    setVisibleRowLimit((prev) => {
      if (isMobileViewport) {
        return Math.min(prev, defaultRowLimit);
      }
      return Math.max(prev, defaultRowLimit);
    });
  }, [defaultRowLimit, isMobileViewport]);

  const hasData = Boolean(
    data && ((data.buyBuckets?.length ?? 0) || (data.sellBuckets?.length ?? 0)),
  );
  useEffect(() => {
    if (lockedHeight || !hasData || loading || viewMode !== 'table') return;
    const id = requestAnimationFrame(() => {
      const host = wrapperRef.current;
      if (!host) return;
      const card = host.firstElementChild as HTMLElement | null;
      const h = card?.offsetHeight ?? 0;
      if (h > 0) setLockedHeight(h);
    });
    return () => cancelAnimationFrame(id);
  }, [hasData, loading, viewMode, lockedHeight]);

  useEffect(() => {
    import('./DepthChart').then((mod) => mod.DepthChart).catch(() => {});
    import('./DepthChartD3').then(() => {}).catch(() => {});
  }, []);

  const previousRef = useRef<LimitWallV2Response | null>(null);
  const [exchangeSelection, setExchangeSelection] = useState<MonitorExchangeSelection>(() =>
    buildDefaultExchangeSelection(LIMIT_WALL_EXCHANGES),
  );

  const venueSlugs = useMemo(
    () => selectedVenues(exchangeSelection, LIMIT_WALL_EXCHANGES),
    [exchangeSelection],
  );
  const venueKey = useMemo(() => venueSlugs.join(','), [venueSlugs]);

  const toggleExchange = (id: string) => {
    setExchangeSelection((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (Object.values(next).some(Boolean)) return next;
      return prev;
    });
  };

  const priceDomainKey = priceDomain ? priceDomain.join(',') : '';
  const subscriptionKey = useMemo(
    () => [side, decimals, venueKey || 'all', aggregateLevel, priceDomainKey || ''].join('|'),
    [side, decimals, venueKey, aggregateLevel, priceDomainKey],
  );

  const lastSubscriptionKeyRef = useRef<string | null>(null);
  useEffect(() => {
    if (lastSubscriptionKeyRef.current && lastSubscriptionKeyRef.current !== subscriptionKey) {
      previousRef.current = null;
      setVisibleRowLimit(defaultRowLimit);
      setRefreshing(true);
    } else if (!lastSubscriptionKeyRef.current) {
      setVisibleRowLimit(defaultRowLimit);
    }
    lastSubscriptionKeyRef.current = subscriptionKey;
  }, [subscriptionKey]);

  useEffect(() => {
    let active = true;
    setVisibleRowLimit(defaultRowLimit);
    const hasExistingData = data != null;
    setLoading(!hasExistingData);
    setRefreshing(hasExistingData);
    setError(null);
    const params: Record<string, unknown> = {
      side,
      decimals,
      venues: venueSlugs,
      aggregateLevel,
      minPrice: priceDomain ? priceDomain[0] : undefined,
      maxPrice: priceDomain ? priceDomain[1] : undefined,
    };
    const listener: SubscriptionListener = {
      onSnapshot: (payload) => {
        if (!active) return;
        const body = (payload as any)?.data ?? payload;
        if (body) {
          previousRef.current = data;
          setData(body as LimitWallV2Response);
          setLastUpdated(new Date());
          setLoading(false);
          setRefreshing(false);
        }
      },
      onUpdate: (payload) => {
        if (!active) return;
        const body = (payload as any)?.data ?? payload;
        if (body) {
          setRefreshing(true);
          previousRef.current = data;
          setData(body as LimitWallV2Response);
          setLastUpdated(new Date());
          setRefreshing(false);
        }
      },
      onError: (err) => {
        if (!active) return;
        setError(err.message || err.code || 'limit_wall_error');
        setLoading(false);
        setRefreshing(false);
      },
    };

    const subscription = monitorWsClient.subscribe('monitor.limitWall', params, listener);
    subscription.ready.catch((err) => {
      if (!active) return;
      setError(err?.message || 'limit_wall_error');
      setLoading(false);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [side, decimals, venueKey, aggregateLevel, priceDomainKey, refreshToken]);

  const getFilteredRowsWithCumulatives = (rows: BucketWithMeta[], limit: number) => {
    if (!rows.length) {
      return { filtered: rows, maxCumulativeUsd: 0, maxCumulativeBase: 0 };
    }

    const effectiveLimit =
      Number.isFinite(limit) && limit > 0 ? Math.min(rows.length, Math.floor(limit)) : rows.length;

    const filtered = rows.slice(0, effectiveLimit);

    let runningBase = 0;
    let runningUsd = 0;
    const filteredWithCumulatives = filtered.map((bucket) => {
      runningBase += Number(bucket.baseLiquidity || 0);
      runningUsd += Number(bucket.usdLiquidity || 0);
      return {
        ...bucket,
        cumulativeBase: runningBase,
        cumulativeUsd: runningUsd,
      };
    });

    const maxCumulativeUsd =
      filteredWithCumulatives.length > 0
        ? (filteredWithCumulatives[filteredWithCumulatives.length - 1].cumulativeUsd ?? 0)
        : 0;
    const maxCumulativeBase =
      filteredWithCumulatives.length > 0
        ? (filteredWithCumulatives[filteredWithCumulatives.length - 1].cumulativeBase ?? 0)
        : 0;

    return {
      filtered: filteredWithCumulatives,
      maxCumulativeUsd,
      maxCumulativeBase,
    };
  };

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
        if (existing.usdPerBase != null) {
          const precision = data.decimals ?? decimals;
          const price = existing.usdPerBase;
          existing.priceLabel = price.toFixed(precision);
          existing.priceFloor = price;
          existing.priceCeil = price;
        }
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

    const priceOf = (x: BucketWithMeta) => Number(x.usdPerBase ?? x.priceFloor ?? 0);
    const buysMerged = mergeBuckets(data.buyBuckets, prevBuy).sort(
      (a, b) => priceOf(b) - priceOf(a),
    );
    const sellsMerged = mergeBuckets(data.sellBuckets, prevSell).sort(
      (a, b) => priceOf(a) - priceOf(b),
    );

    const bestBid = buysMerged.find((bucket) => bucket.usdPerBase != null)?.usdPerBase ?? 0;
    const bestAsk = sellsMerged.find((bucket) => bucket.usdPerBase != null)?.usdPerBase ?? 0;
    const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;

    const buyData = getFilteredRowsWithCumulatives(buysMerged, visibleRowLimit);
    const sellData = getFilteredRowsWithCumulatives(sellsMerged, visibleRowLimit);

    const maxBase = Math.max(
      1,
      ...buyData.filtered.map((bucket) => Number(bucket.baseLiquidity || 0)),
      ...sellData.filtered.map((bucket) => Number(bucket.baseLiquidity || 0)),
    );
    const maxUsd = Math.max(
      1,
      ...buyData.filtered.map((bucket) => Number(bucket.usdLiquidity || 0)),
      ...sellData.filtered.map((bucket) => Number(bucket.usdLiquidity || 0)),
    );

    return {
      buys: buysMerged,
      sells: sellsMerged,
      filteredBuys: buyData.filtered,
      filteredSells: sellData.filtered,
      bestBid,
      bestAsk,
      midPrice,
      maxBase,
      maxUsd,
      maxCumulativeUsdBuy: buyData.maxCumulativeUsd,
      maxCumulativeBaseBuy: buyData.maxCumulativeBase,
      maxCumulativeUsdSell: sellData.maxCumulativeUsd,
      maxCumulativeBaseSell: sellData.maxCumulativeBase,
    };
  }, [data, decimals, visibleRowLimit]);

  const chartDomain = useMemo<[number, number] | null>(() => {
    if (priceDomain) return priceDomain;
    const mid = ladder?.midPrice;
    if (mid && Number.isFinite(mid) && mid > 0) {
      const min = Math.max(0, mid * (1 - PRICE_RANGE_PERCENT));
      const max = mid * (1 + PRICE_RANGE_PERCENT);
      if (max > min) return [min, max];
    }
    return null;
  }, [priceDomain, ladder?.midPrice]);

  const chartData = useMemo(() => {
    if (!ladder) return { bids: [], asks: [] };

    const clampRange = chartDomain;

    const mapBuckets = (buckets: BucketWithMeta[], side: 'bid' | 'ask'): LimitWallDepthPoint[] => {
      const sorted = [...buckets].sort((a, b) => {
        const priceA = Number(a.usdPerBase ?? a.priceFloor ?? 0);
        const priceB = Number(b.usdPerBase ?? b.priceFloor ?? 0);
        return side === 'bid' ? priceB - priceA : priceA - priceB;
      });

      const filtered = sorted.filter((bucket) => {
        const price = Number(bucket.usdPerBase ?? bucket.priceFloor ?? 0);
        if (!Number.isFinite(price) || price <= 0) return false;
        if (!clampRange) return true;
        const [min, max] = clampRange;
        return price >= min && price <= max;
      });

      const source = (filtered.length ? filtered : sorted).slice(0, Math.min(sorted.length, 600));

      let runningBase = 0;
      let runningUsd = 0;

      return source
        .map((bucket) => {
          const price = Number(bucket.usdPerBase ?? bucket.priceFloor ?? 0);
          const base = Number(bucket.baseLiquidity ?? 0);
          const usd = Number(bucket.usdLiquidity ?? 0);
          if (!Number.isFinite(price) || price <= 0) return null;
          runningBase += base;
          runningUsd += usd;
          return {
            price,
            cumulativeBase: runningBase,
            cumulativeUsd: runningUsd,
          } as LimitWallDepthPoint;
        })
        .filter((point): point is LimitWallDepthPoint => point !== null);
    };

    return {
      bids: mapBuckets(ladder.buys, 'bid'),
      asks: mapBuckets(ladder.sells, 'ask'),
    };
  }, [ladder, chartDomain]);

  const hasDataFlag = Boolean(ladder && (ladder.buys.length || ladder.sells.length));
  const isTableView = viewMode === 'table';
  const isDepthView = viewMode === 'depth';
  const isTradingView = viewMode === 'trading';
  const showChart = isDepthView;
  const chartBaseSymbol = data?.base ?? 'NOS';
  const chartQuoteSymbol = data?.quote ?? null;
  const orderBookChart = useOrderBookChartStream({
    base: chartBaseSymbol,
    quote: chartQuoteSymbol ?? undefined,
    range: '1d',
    interval: '1m',
    venues: venueSlugs.length ? venueSlugs : undefined,
  });
  const tradingViewAggregationSetting = useMemo(() => {
    const pct = Number.isFinite(tradingViewAggregationPct)
      ? Math.max(tradingViewAggregationPct, 0)
      : 0;
    if (pct <= 0) {
      return { kind: 'none' } as const;
    }
    return { kind: 'pct', pct: Math.max(pct / 100, 0.0001) } as const;
  }, [tradingViewAggregationPct]);
  const tradingViewLimitLevels = useMemo<OrderBookLimitLevel[]>(() => {
    if (!ladder) return [];
    const mapBucket = (bucket: BucketWithMeta, side: 'buy' | 'sell'): OrderBookLimitLevel | null => {
      const price = Number(bucket.usdPerBase ?? bucket.priceFloor ?? 0);
      if (!Number.isFinite(price) || price <= 0) return null;
      return {
        price,
        side,
        usd: Number(bucket.usdLiquidity ?? 0) || 0,
        base: Number(bucket.baseLiquidity ?? 0) || 0,
        orders: Number(bucket.orders ?? 0) || 0,
        source: typeof bucket.source === 'string' ? bucket.source : null,
      };
    };
    const buys = ladder.buys
      .map((bucket) => mapBucket(bucket, 'buy'))
      .filter((entry): entry is OrderBookLimitLevel => entry !== null);
    const sells = ladder.sells
      .map((bucket) => mapBucket(bucket, 'sell'))
      .filter((entry): entry is OrderBookLimitLevel => entry !== null);
    return [...buys, ...sells];
  }, [ladder]);

  const requestDomain = (domain: [number, number]) => {
    setPriceDomain(domain);
  };

  const renderSkeletonRows = (count: number) =>
    Array.from({ length: count }).map((_, i) => (
      <div key={`sk-${i}`} className="relative">
        <div className="relative grid grid-cols-[18px_1fr_1fr_1fr] gap-1 px-2 py-1.5 text-[11px] items-center min-h-[24px]">
          <span className="inline-flex items-center justify-center">
            <div className="skeleton h-3.5 w-3.5 rounded-sm">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </span>
          <div className="relative skeleton h-3 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="relative skeleton h-3 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="relative skeleton h-3 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        </div>
      </div>
    ));

  const renderLoadMoreButton = (rowsShown: number, totalRows: number) => {
    if (rowsShown >= totalRows) return null;

    const remaining = totalRows - rowsShown;
    const increment = Math.min(rowIncrement, remaining);

    return (
      <div className="border-t border-border/30 p-2">
        <button
          onClick={() => setVisibleRowLimit((prev) => Math.min(prev + rowIncrement, totalRows))}
          className="w-full px-3 py-2 text-xs font-medium rounded-lg border border-border/60 bg-background/80 hover:bg-muted transition-all duration-200 flex items-center justify-center gap-2"
        >
          <Layers className="w-3 h-3" />
          Load {increment} more rows
        </button>
      </div>
    );
  };

  const renderOrderBookRow = (
    bucket: BucketWithMeta,
    sideType: 'buy' | 'sell',
    maxCumulative: number,
    index?: number,
  ) => {
    const baseLiquidity = Number(bucket.baseLiquidity || 0);
    const cumulativeValue =
      depthMode === 'usd' ? (bucket.cumulativeUsd ?? 0) : (bucket.cumulativeBase ?? 0);
    const depthPercent = Math.min(100, (cumulativeValue / Math.max(1, maxCumulative)) * 100);
    const isBest =
      sideType === 'buy'
        ? bucket.usdPerBase === ladder?.bestBid
        : bucket.usdPerBase === ladder?.bestAsk;

    const priceDisplay =
      bucket.usdPerBase != null
        ? bucket.usdPerBase.toFixed(Math.max(2, decimals + 1))
        : (bucket.priceLabel ?? bucket.priceFloor?.toFixed(decimals) ?? '—');

    const amountDisplay =
      baseLiquidity > 999
        ? (baseLiquidity / 1000).toFixed(1) + 'K'
        : baseLiquidity.toFixed(baseLiquidity < 10 ? 2 : 0);

    const totalDisplay =
      depthMode === 'usd'
        ? ((bucket.cumulativeUsd ?? 0) / 1000).toFixed(0) + 'K'
        : ((bucket.cumulativeBase ?? 0) / 1000).toFixed(0) + 'K';

    const source = (bucket.source ?? 'jupiter').toLowerCase();
    const icon = SOURCE_META[source]?.icon ?? '/jupiter.svg';
    const sourceLabel = SOURCE_META[source]?.label ?? 'Jupiter';

    return (
      <div
        key={`${sideType}-${bucket.priceLabel}-${bucket.source ?? 'jupiter'}-${index ?? 0}`}
        className="relative group hover:bg-muted/50 transition-colors"
      >
        {/* Depth Background */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `linear-gradient(to ${sideType === 'buy' ? 'left' : 'right'}, ${sideType === 'buy' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)'} 0%, ${sideType === 'buy' ? 'rgba(34, 197, 94, 0.08)' : 'rgba(239, 68, 68, 0.08)'} ${depthPercent}%, transparent ${depthPercent}%)`,
          }}
        />

        {/* Row Content */}
        <div className="relative grid grid-cols-[18px_1fr_1fr_1fr] gap-1 px-2 py-1.5 text-[11px] font-mono items-center min-h-[24px]">
          {/* Source Icon */}
          <span className="inline-flex items-center justify-center">
            <img src={icon} alt={sourceLabel} className="h-3.5 w-3.5 opacity-80" />
          </span>
          <div
            className={cn(
              'font-medium tabular-nums',
              sideType === 'buy'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400',
            )}
          >
            {priceDisplay}
            {isBest && <span className="ml-0.5 text-primary text-[8px]">★</span>}
          </div>
          <div className="text-right tabular-nums text-foreground">{amountDisplay}</div>
          <div className="text-right tabular-nums text-muted-foreground">{totalDisplay}</div>
        </div>
      </div>
    );
  };

  const pairLabel = `${data?.base ?? 'NOS'}/${data?.quote ?? 'USDC'}`;
  const updatedDisplay = lastUpdated ? formatRelative(lastUpdated) : '—';
  const venuesDisplay = venueSlugs.length ? `${venueSlugs.length} venues` : 'All venues';

  const headerStatus = isTradingView
    ? orderBookChart.error
      ? { label: 'Error', tone: 'danger' as const }
      : orderBookChart.loading
        ? { label: 'Syncing', tone: 'warning' as const, pulse: true }
        : orderBookChart.connected
          ? { label: 'Live', tone: 'success' as const, pulse: true }
          : { label: 'Connecting', tone: 'warning' as const, pulse: true }
    : error
        ? { label: 'Error', tone: 'danger' as const }
        : refreshing
          ? { label: 'Updating', tone: 'success' as const, pulse: true }
          : loading || !hasData
            ? { label: 'Syncing', tone: 'warning' as const, pulse: true }
            : { label: 'Live', tone: 'success' as const, pulse: true };

  const controlPillBase =
    'inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';
  const viewOptions: Array<{ key: OrderBookViewMode; label: string; icon: React.ReactNode }> = [
    {
      key: 'table',
      label: 'Classic',
      icon: <TableIcon className="h-3 w-3" />,
    },
    {
      key: 'depth',
      label: 'Depth',
      icon: <Activity className="h-3 w-3" />,
    },
    {
      key: 'trading',
      label: 'TradingView',
      icon: <CandlestickChart className="h-3 w-3" />,
    },
  ];

  const headerActions = (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-xl border border-border/40 bg-background/70 px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-foreground/80">
            {pairLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-border/40 bg-background/60 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {venuesDisplay}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>Updated {updatedDisplay}</span>
          <button
            onClick={() => {
              setRefreshToken((value) => value + 1);
              setLoading(true);
            }}
            disabled={refreshing || loading}
            className={cn(
              controlPillBase,
              'h-9 w-9 justify-center px-0 text-muted-foreground disabled:opacity-60',
            )}
            aria-label="Refresh order book"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CustomDropdown
          options={DECIMAL_OPTIONS.map((option) => ({
            value: String(option.value),
            label: option.label,
          }))}
          value={String(decimals)}
          onSelect={(value) => setDecimals(Number(value))}
          size="sm"
          variant="ghost"
          triggerClassName={cn(controlPillBase, 'min-w-[140px] justify-between')}
        />
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-background/70 p-1 text-xs font-semibold">
          <button
            className={cn(
              'rounded-lg px-2.5 py-1 transition-colors',
              depthMode === 'base'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
            )}
            onClick={() => setDepthMode('base')}
            type="button"
          >
            <span className="inline-flex items-center gap-1">
              <Layers className="h-3 w-3" /> {data?.base ?? 'Base'}
            </span>
          </button>
          <button
            className={cn(
              'rounded-lg px-2.5 py-1 transition-colors',
              depthMode === 'usd'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
            )}
            onClick={() => setDepthMode('usd')}
            type="button"
          >
            <span className="inline-flex items-center gap-1">
              <DollarSign className="h-3 w-3" /> USD
            </span>
          </button>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-background/70 p-1 text-xs font-semibold">
          <button
            className={cn(
              'rounded-lg px-2.5 py-1 transition-colors',
              side === 'both'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
            )}
            onClick={() => setSide('both')}
            type="button"
          >
            Both
          </button>
          <button
            className={cn(
              'rounded-lg px-2.5 py-1 transition-colors',
              side === 'buy'
                ? 'bg-emerald-500/20 text-emerald-600 shadow-sm'
                : 'text-emerald-600/70 hover:bg-emerald-500/10 hover:text-emerald-600',
            )}
            onClick={() => setSide('buy')}
            type="button"
          >
            Bids
          </button>
          <button
            className={cn(
              'rounded-lg px-2.5 py-1 transition-colors',
              side === 'sell'
                ? 'bg-red-500/20 text-red-600 shadow-sm'
                : 'text-red-600/70 hover:bg-red-500/10 hover:text-red-600',
            )}
            onClick={() => setSide('sell')}
            type="button"
          >
            Asks
          </button>
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-background/70 p-1 text-xs font-semibold">
          {[1, 2, 5, 10].map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => setAggregateLevel(lvl)}
              className={cn(
                'rounded-lg px-2 py-1 transition-colors',
                aggregateLevel === lvl
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
              )}
            >
              x{lvl}
            </button>
          ))}
        </div>
        <div className="inline-flex items-center gap-1 rounded-xl border border-border/40 bg-background/70 p-1 text-xs font-semibold">
          {viewOptions.map((option) => {
            const active = viewMode === option.key;
            const activeClasses =
              option.key === 'table'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : option.key === 'depth'
                  ? 'bg-sky-500/20 text-sky-600 shadow-sm dark:text-sky-300'
                  : 'bg-emerald-500/20 text-emerald-600 shadow-sm dark:text-emerald-300';
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => setViewMode(option.key)}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 transition-colors',
                  active
                    ? activeClasses
                    : 'text-muted-foreground hover:bg-background/80 hover:text-foreground',
                )}
              >
                {option.icon}
                {option.label}
              </button>
            );
          })}
        </div>
        {isTradingView && (
          <CustomDropdown
            options={tradingViewAggregationOptions}
            value={String(tradingViewAggregationPct)}
            onSelect={(value) => {
              const next = Number.parseFloat(value);
              if (Number.isNaN(next)) return;
              setTradingViewAggregationPct(next);
            }}
            size="sm"
            variant="ghost"
            triggerClassName={cn(controlPillBase, 'min-w-[130px] justify-between')}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-2" aria-label="Order book venue filters">
        {LIMIT_WALL_EXCHANGES.map((exchange) => {
          const checked = !!exchangeSelection[exchange.id];
          return (
            <button
              key={exchange.id}
              type="button"
              onClick={() => toggleExchange(exchange.id)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40',
                checked
                  ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                  : 'border-border/40 bg-background/60 text-muted-foreground hover:text-foreground',
              )}
            >
              {exchange.icon && (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-border/50 bg-background/80">
                  <img src={exchange.icon} alt="" className="h-4 w-4" />
                </span>
              )}
              <span className="max-w-[90px] truncate" title={exchange.label}>
                {exchange.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div ref={wrapperRef} data-monitor-widget="order-book">
      <MonitorWidgetFrame
        title="Order Book"
        subtitle={
          isMobileViewport
            ? 'Aggregated depth across venues'
            : 'Aggregated depth across selected venues'
        }
        icon={<Target className="h-5 w-5" />}
        status={headerStatus}
        actions={headerActions}
        className="flex h-full min-h-0 flex-col overflow-hidden"
        contentClassName="flex min-h-0 flex-1 flex-col gap-4"
        style={frameStyle}
      >
        <div className="flex-1 h-full overflow-hidden rounded-2xl border border-border/50 bg-background/80 shadow-inner min-h-0">
          <div className="flex-1 h-full overflow-hidden min-h-0">
            {isTradingView ? (
              <div className="p-2 min-h-0 h-full flex">
                <OrderBookTradingView
                  className="flex-1"
                  candles={orderBookChart.candles}
                  limitLevels={tradingViewLimitLevels}
                  baseSymbol={chartBaseSymbol}
                  quoteSymbol={chartQuoteSymbol}
                  intervalSeconds={orderBookChart.metadata?.intervalSeconds ?? 60}
                  loading={orderBookChart.loading}
                  error={orderBookChart.error}
                  aggregation={tradingViewAggregationSetting}
                  midPrice={ladder?.midPrice ?? null}
                />
              </div>
            ) : loading && !showChart ? (
              <div className="flex flex-col h-full min-h-0">
                {/* Market Summary - shrink-0 to stay fixed */}
                <div className="shrink-0 p-2 border-b border-border/30 bg-muted/20">
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="text-center">
                      <div className="text-muted-foreground">Mid</div>
                      <div className="skeleton h-4 w-12 mx-auto bg-gradient-to-r from-muted/50 to-muted/30">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-600">Best Bid</div>
                      <div className="skeleton h-4 w-12 mx-auto bg-gradient-to-r from-muted/50 to-muted/30">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600">Best Ask</div>
                      <div className="skeleton h-4 w-12 mx-auto bg-gradient-to-r from-muted/50 to-muted/30">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Book Skeleton */}
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 grid-rows-1 overflow-hidden min-h-0">
                  {/* Ask Column */}
                  <div className="flex h-full flex-col overflow-hidden md:border-r md:border-border/30 min-h-0">
                    <div className="shrink-0 bg-muted/20 border-b border-border/30 p-1">
                      <div className="text-center text-[11px] font-medium text-red-600">
                        Ask Orders
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[9px] text-muted-foreground mt-1 px-2">
                        <span>Price</span>
                        <span className="text-right">Amount</span>
                        <span className="text-right">Total</span>
                      </div>
                    </div>
                    <div className="flex-1 h-full overflow-y-auto min-h-0">
                      {renderSkeletonRows(10)}
                    </div>
                  </div>

                  {/* Bid Column */}
                  <div className="flex h-full flex-col overflow-hidden min-h-0">
                    <div className="shrink-0 bg-muted/20 border-b border-border/30 p-1">
                      <div className="text-center text-[11px] font-medium text-emerald-600">
                        Bid Orders
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[9px] text-muted-foreground mt-1 px-2">
                        <span>Price</span>
                        <span className="text-right">Amount</span>
                        <span className="text-right">Total</span>
                      </div>
                    </div>
                    <div className="flex-1 h-full overflow-y-auto min-h-0">
                      {renderSkeletonRows(10)}
                    </div>
                  </div>
                </div>
                <div className="shrink-0 p-1 border-t border-border/30 bg-muted/20">
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span className="skeleton h-3 w-20 rounded" />
                    <span className="skeleton h-3 w-20 rounded" />
                    <span className="skeleton h-3 w-16 rounded" />
                  </div>
                </div>
              </div>
            ) : error ? (
              <div className="p-2 text-[11px] text-destructive bg-destructive/10 border border-destructive/20 rounded m-2">
                {error}
              </div>
            ) : !hasDataFlag && !showChart ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2 opacity-50" />
                  <div className="text-[11px] font-medium">No order book data</div>
                  <div className="text-[11px] text-muted-foreground">Try adjusting filters</div>
                </div>
              </div>
            ) : showChart ? (
              <div className="p-2 min-h-0 h-full flex">
                <div className="flex-1 min-h-0 border border-border/30 rounded overflow-hidden relative">
                  <DepthChart
                    bids={chartData.bids}
                    asks={chartData.asks}
                    depthMode={depthMode}
                    midPrice={ladder?.midPrice ?? null}
                    dataDomain={chartDomain}
                    className="w-full h-full"
                    onRequestDomain={requestDomain}
                  />
                  {(loading || (!chartData.bids.length && !chartData.asks.length)) && (
                    <div
                      className="absolute inset-0 bg-background/60"
                      aria-busy="true"
                      aria-live="polite"
                    >
                      <div className="absolute inset-3 rounded-md skeleton">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : ladder ? (
              <div className="grid h-full min-h-0 grid-rows-[auto_1fr_auto]">
                {/* Market Summary - shrink-0 to stay fixed */}
                <div className="p-2 border-b border-border/30 bg-muted/20">
                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div className="text-center">
                      <div className="text-muted-foreground">Mid</div>
                      <div className="font-bold">{roundUsd(ladder.midPrice ?? null)}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-emerald-600">Best Bid</div>
                      <div className="font-bold text-emerald-600">
                        {roundUsd(ladder.bestBid ?? null)}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-red-600">Best Ask</div>
                      <div className="font-bold text-red-600">
                        {roundUsd(ladder.bestAsk ?? null)}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Book - flex-1 to take remaining space */}
                {side === 'both' ? (
                  <div className="grid h-full grid-cols-1 md:grid-cols-2 overflow-hidden min-h-0">
                    {/* Ask Column */}
                    <div className="flex min-h-0 flex-col overflow-hidden md:border-r md:border-border/30">
                      <div className="shrink-0 bg-muted/20 border-b border-border/30 p-1">
                        <div className="text-center text-[11px] font-medium text-red-600">
                          Ask Orders
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[9px] text-muted-foreground mt-1 px-2">
                          <span>Price</span>
                          <span className="text-right">Amount</span>
                          <span className="text-right">Total</span>
                        </div>
                      </div>
                      <div className="flex-1 h-full overflow-y-auto min-h-0">
                        {refreshing
                          ? renderSkeletonRows(10)
                          : ladder.filteredSells.map((bucket, idx) =>
                              renderOrderBookRow(
                                bucket,
                                'sell',
                                depthMode === 'usd'
                                  ? ladder.maxCumulativeUsdSell
                                  : ladder.maxCumulativeBaseSell,
                                idx,
                              ),
                            )}
                      </div>
                      {renderLoadMoreButton(ladder.filteredSells.length, ladder.sells.length)}
                    </div>

                    {/* Bid Column */}
                    <div className="flex min-h-0 flex-col overflow-hidden">
                      <div className="shrink-0 bg-muted/20 border-b border-border/30 p-1">
                        <div className="text-center text-[11px] font-medium text-emerald-600">
                          Bid Orders
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[9px] text-muted-foreground mt-1 px-2">
                          <span>Price</span>
                          <span className="text-right">Amount</span>
                          <span className="text-right">Total</span>
                        </div>
                      </div>
                      <div className="flex-1 h-full overflow-y-auto min-h-0">
                        {refreshing
                          ? renderSkeletonRows(10)
                          : ladder.filteredBuys.map((bucket, idx) =>
                              renderOrderBookRow(
                                bucket,
                                'buy',
                                depthMode === 'usd'
                                  ? ladder.maxCumulativeUsdBuy
                                  : ladder.maxCumulativeBaseBuy,
                                idx,
                              ),
                            )}
                      </div>
                      {renderLoadMoreButton(ladder.filteredBuys.length, ladder.buys.length)}
                    </div>
                  </div>
                ) : (
                  <div className="h-full min-h-0 flex flex-col overflow-hidden">
                    <div className="shrink-0 bg-muted/20 border-b border-border/30 p-1">
                      <div
                        className={cn(
                          'text-center text-[11px] font-medium',
                          side === 'buy' ? 'text-emerald-600' : 'text-red-600',
                        )}
                      >
                        {side === 'buy' ? 'Bid Orders' : 'Ask Orders'}
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-[9px] text-muted-foreground mt-1 px-2">
                        <span>Price</span>
                        <span className="text-right">Amount</span>
                        <span className="text-right">Total</span>
                      </div>
                    </div>
                    <div className="flex-1 h-full overflow-y-auto min-h-0">
                      {refreshing
                        ? renderSkeletonRows(14)
                        : side === 'buy'
                          ? ladder.filteredBuys.map((bucket, idx) =>
                              renderOrderBookRow(
                                bucket,
                                'buy',
                                depthMode === 'usd'
                                  ? ladder.maxCumulativeUsdBuy
                                  : ladder.maxCumulativeBaseBuy,
                                idx,
                              ),
                            )
                          : ladder.filteredSells.map((bucket, idx) =>
                              renderOrderBookRow(
                                bucket,
                                'sell',
                                depthMode === 'usd'
                                  ? ladder.maxCumulativeUsdSell
                                  : ladder.maxCumulativeBaseSell,
                                idx,
                              ),
                            )}
                    </div>
                    {side === 'buy'
                      ? renderLoadMoreButton(ladder.filteredBuys.length, ladder.buys.length)
                      : renderLoadMoreButton(ladder.filteredSells.length, ladder.sells.length)}
                  </div>
                )}

                {/* Footer Info - shrink-0 to stay fixed */}
                <div className="p-1 border-t border-border/30 bg-muted/20">
                  <div className="flex justify-between text-[9px] text-muted-foreground">
                    <span>{formatNumber(data?.totalBuyBase ?? 0)} bids</span>
                    <span>{formatNumber(data?.totalSellBase ?? 0)} asks</span>
                    <span>{formatRelative(lastUpdated)}</span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </MonitorWidgetFrame>
    </div>
  );
}
