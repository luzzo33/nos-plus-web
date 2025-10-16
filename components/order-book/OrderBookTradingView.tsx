'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ColorType,
  CrosshairMode,
  LineStyle,
  createChart,
  type CandlestickData,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
} from 'lightweight-charts';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type {
  OrderBookChartCandle,
  OrderBookLimitLevel,
} from '@/lib/monitor/useOrderBookChartStream';

type AggregationSetting =
  | { kind: 'none' }
  | { kind: 'abs'; size: number }
  | { kind: 'pct'; pct: number };

interface OrderBookTradingViewProps {
  candles: OrderBookChartCandle[];
  limitLevels: OrderBookLimitLevel[];
  baseSymbol?: string;
  quoteSymbol?: string | null;
  intervalSeconds: number;
  aggregation: AggregationSetting;
  midPrice: number | null;
  loading?: boolean;
  error?: string | null;
  className?: string;
}

const MAX_LEVEL_LINES = 240;
const BUY_COLOR = '#22c55e';
const SELL_COLOR = '#ef4444';
const CHART_BG = '#020617';

type AggregatedLimitLevel = OrderBookLimitLevel & {
  range?: {
    min: number;
    max: number;
    offsetPct: number;
    index: number;
  };
};

function toCandlestickData(candle: OrderBookChartCandle): CandlestickData<Time> {
  const time = Math.floor(Date.parse(candle.ts) / 1000) as Time;
  return {
    time,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

function levelKey(level: AggregatedLimitLevel): string {
  if (level.range) {
    return `${level.side}:${level.range.index}`;
  }
  return `${level.side}:${level.price.toFixed(8)}`;
}

function aggregateLimitLevels(
  levels: OrderBookLimitLevel[],
  aggregation: AggregationSetting,
  referencePrice: number,
): AggregatedLimitLevel[] {
  if (!levels.length) return [];

  const validLevels = levels
    .filter((level) => Number.isFinite(level.price) && level.price > 0)
    .map((level) => ({
      ...level,
      price: Number(level.price),
      usd: Number(level.usd ?? 0),
      base: Number(level.base ?? 0),
      orders: Number(level.orders ?? 0),
    }));

  if (!validLevels.length) return [];

  const anchor =
    referencePrice && referencePrice > 0
      ? referencePrice
      : validLevels.find((level) => Number.isFinite(level.price) && level.price > 0)?.price ?? 1;

  if (aggregation.kind === 'none') {
    const tolerance = Math.max(anchor * 0.0005, 0.0001);
    return validLevels
      .map((level, index) => ({
        ...level,
        range: {
          min: Math.max(level.price - tolerance, 0),
          max: level.price + tolerance,
          offsetPct: anchor > 0 ? ((level.price - anchor) / anchor) * 100 : 0,
          index,
        },
      }))
      .sort((a, b) => a.price - b.price);
  }

  const stepBase =
    aggregation.kind === 'abs' ? aggregation.size : anchor * aggregation.pct;
  const step = Math.max(stepBase, Math.abs(anchor) * 0.0001, 1e-9);

  type Bucket = AggregatedLimitLevel & { bucketIndex: number };

  const buckets = new Map<string, Bucket>();

  for (const level of validLevels) {
    const delta = level.price - anchor;
    const rawIndex = delta / step;
    const bucketIndex = Number.isFinite(rawIndex) ? Math.floor(rawIndex) : 0;
    const bucketStart = anchor + bucketIndex * step;
    const bucketEnd = bucketStart + step;
    const bucketPrice = level.side === 'sell' ? bucketEnd : bucketStart;
    if (!Number.isFinite(bucketPrice) || bucketPrice <= 0) continue;
    const rangeMin = Math.max(Math.min(bucketStart, bucketEnd), 0);
    const rangeMax = Math.max(bucketStart, bucketEnd);
    const offsetPct = anchor > 0 ? ((bucketPrice - anchor) / anchor) * 100 : 0;
    const key = `${level.side}:${bucketIndex}`;
    const existing = buckets.get(key);
    if (existing) {
      existing.usd += level.usd;
      existing.base += level.base;
      existing.orders += level.orders;
    } else {
      buckets.set(key, {
        price: bucketPrice,
        side: level.side,
        usd: level.usd,
        base: level.base,
        orders: level.orders,
        source: level.source ?? null,
        range: {
          min: rangeMin,
          max: rangeMax,
          offsetPct,
          index: bucketIndex,
        },
        bucketIndex,
      });
    }
  }

  const aggregated = Array.from(buckets.values())
    .map(({ bucketIndex, ...rest }) => rest)
    .sort((a, b) => a.price - b.price);

  return aggregated.length > MAX_LEVEL_LINES ? aggregated.slice(0, MAX_LEVEL_LINES) : aggregated;
}

function formatNumberShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs >= 1) return value.toFixed(2);
  if (abs >= 0.01) return value.toFixed(4);
  return value.toPrecision(2);
}

function formatUsd(value: number): string {
  const sign = value < 0 ? '-' : '';
  return `${sign}$${formatNumberShort(Math.abs(value))}`;
}

function formatBase(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(2)}K`;
  if (abs >= 1) return value.toFixed(2);
  if (abs >= 0.01) return value.toFixed(4);
  return value.toPrecision(2);
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '0.00%';
  const formatted = Math.abs(value) < 1 ? Math.abs(value).toFixed(2) : Math.abs(value).toFixed(1);
  const sign = value >= 0 ? '+' : '-';
  return `${sign}${formatted}%`;
}

function formatPrice(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1000) return value.toFixed(2);
  if (abs >= 1) return value.toFixed(4);
  if (abs >= 0.01) return value.toFixed(6);
  return value.toPrecision(6);
}

export function OrderBookTradingView({
  candles,
  limitLevels,
  baseSymbol = 'NOS',
  quoteSymbol = 'USDC',
  intervalSeconds,
  aggregation,
  midPrice,
  loading,
  error,
  className,
}: OrderBookTradingViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dataRef = useRef<CandlestickData<Time>[]>([]);
  const autoScrollRef = useRef(true);
  const [hoveredLevelKey, setHoveredLevelKey] = useState<string | null>(null);
  const [pinnedLevelKey, setPinnedLevelKey] = useState<string | null>(null);
  const [pointerPos, setPointerPos] = useState<{ x: number; y: number } | null>(null);
  const [pinnedPos, setPinnedPos] = useState<{ x: number; y: number } | null>(null);
  const aggregatedLevelsRef = useRef<AggregatedLimitLevel[]>([]);
  const pointerPosRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: CHART_BG },
        textColor: '#cbd5f5',
      },
      grid: {
        vertLines: { color: 'rgba(148, 163, 184, 0.16)' },
        horzLines: { color: 'rgba(148, 163, 184, 0.16)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: 'rgba(148, 163, 184, 0.4)', width: 1, style: LineStyle.Dashed },
        horzLine: { color: 'rgba(148, 163, 184, 0.4)', width: 1, style: LineStyle.Dashed },
      },
      rightPriceScale: {
        borderVisible: false,
        scaleMargins: { top: 0.12, bottom: 0.2 },
      },
      timeScale: {
        borderVisible: false,
        timeVisible: true,
        secondsVisible: intervalSeconds < 60,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: BUY_COLOR,
      downColor: SELL_COLOR,
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
      borderUpColor: '#34d399',
      borderDownColor: '#f87171',
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
      lastValueVisible: true,
      priceLineVisible: true,
    });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.applyOptions({
      localization: {
        locale: Intl.DateTimeFormat().resolvedOptions().locale ?? 'en-US',
        priceFormatter: (price: number) =>
          price >= 1 ? price.toFixed(2) : price >= 0.01 ? price.toFixed(4) : price.toPrecision(6),
      },
    });

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return;
      const lastIndex = dataRef.current.length - 1;
      if (lastIndex < 0 || !Number.isFinite(range.to as number)) {
        autoScrollRef.current = true;
        return;
      }
      autoScrollRef.current = (range.to as number) >= lastIndex - 1;
    });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width, height: entry.contentRect.height });
      }
      if (autoScrollRef.current) {
        chart.timeScale().scrollToRealTime();
      }
    });
    resizeObserver.observe(container);
    resizeObserverRef.current = resizeObserver;

    return () => {
      resizeObserver.disconnect();
      resizeObserverRef.current = null;
      priceLinesRef.current.forEach((line) => {
        try {
          series.removePriceLine(line);
        } catch {
          /* noop */
        }
      });
      priceLinesRef.current = [];
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      dataRef.current = [];
    };
  }, [intervalSeconds]);

  const aggregatedLevels = useMemo<AggregatedLimitLevel[]>(() => {
    const anchor =
      midPrice && midPrice > 0
        ? midPrice
        : candles.length
          ? Number(candles[candles.length - 1]?.close ?? candles[candles.length - 1]?.open ?? 0)
          : 0;
    return aggregateLimitLevels(limitLevels, aggregation, anchor);
  }, [aggregation, candles, limitLevels, midPrice]);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    if (!candles.length) {
      series.setData([]);
      dataRef.current = [];
      return;
    }
    const mapped = candles.map(toCandlestickData);
    dataRef.current = mapped;
    series.setData(mapped);
    if (autoScrollRef.current) {
      chart.timeScale().scrollToRealTime();
    }
  }, [candles]);

  useEffect(() => {
    aggregatedLevelsRef.current = aggregatedLevels;
  }, [aggregatedLevels]);

  useEffect(() => {
    pointerPosRef.current = pointerPos;
  }, [pointerPos]);

  const highlightKey = pinnedLevelKey ?? hoveredLevelKey;

  const pinnedKeyRef = useRef<string | null>(null);
  useEffect(() => {
    pinnedKeyRef.current = pinnedLevelKey;
  }, [pinnedLevelKey]);

  useEffect(() => {
    const container = containerRef.current;
    const series = seriesRef.current;
    if (!container || !series) return;

    const HOVER_PX_THRESHOLD = 14;
    const CLICK_PX_THRESHOLD = 10;

    const findNearestLevel = (pixelY: number, pointerPrice: number | null) => {
      const levels = aggregatedLevelsRef.current;
      if (!levels.length) return null;
      let best: AggregatedLimitLevel | null = null;
      let bestDiffPx = Number.POSITIVE_INFINITY;
      let bestPriceDiff = Number.POSITIVE_INFINITY;
      for (const level of levels) {
        const coord = series.priceToCoordinate(level.price);
        if (coord == null) continue;
        const diffPx = Math.abs(coord - pixelY);
        if (diffPx < bestDiffPx) {
          bestDiffPx = diffPx;
          bestPriceDiff =
            pointerPrice != null ? Math.abs(level.price - pointerPrice) : Number.POSITIVE_INFINITY;
          best = level;
        }
      }
      if (!best || !Number.isFinite(bestDiffPx)) return null;
      const priceTolerance =
        best.range != null
          ? Math.max((best.range.max - best.range.min) / 2, 0.0001)
          : Math.max(best.price * 0.0005, 0.0001);
      return { level: best, diffPx: bestDiffPx, priceDiff: bestPriceDiff, priceTolerance };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const pixelY = event.clientY - rect.top;
      if (pixelY < 0 || pixelY > rect.height) {
        setHoveredLevelKey(null);
        if (!pinnedKeyRef.current) {
          setPointerPos(null);
          pointerPosRef.current = null;
        }
        return;
      }
      const pointerPrice = series.coordinateToPrice(pixelY);
      if (pointerPrice == null) {
        setHoveredLevelKey(null);
        setPointerPos(null);
        pointerPosRef.current = null;
        return;
      }
      const match = findNearestLevel(pixelY, pointerPrice);
      if (
        !match ||
        match.diffPx > HOVER_PX_THRESHOLD ||
        match.priceDiff > match.priceTolerance
      ) {
        setHoveredLevelKey(null);
        if (!pinnedKeyRef.current) {
          setPointerPos(null);
          pointerPosRef.current = null;
        }
        return;
      }
      const pos = {
        x: event.clientX - rect.left,
        y: pixelY,
      };
      const key = levelKey(match.level);
      setHoveredLevelKey((prev) => (prev === key ? prev : key));
      setPointerPos(pos);
      pointerPosRef.current = pos;
    };

    const handlePointerLeave = () => {
      setHoveredLevelKey(null);
      if (!pinnedKeyRef.current) {
        setPointerPos(null);
        pointerPosRef.current = null;
      }
    };

    const handleClick = (event: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const pixelY = event.clientY - rect.top;
      const pointerPrice = series.coordinateToPrice(pixelY);
      if (pointerPrice == null) return;
      const match = findNearestLevel(pixelY, pointerPrice);
      if (
        !match ||
        match.diffPx > CLICK_PX_THRESHOLD ||
        match.priceDiff > match.priceTolerance
      ) {
        setPinnedLevelKey(null);
        setPinnedPos(null);
        setHoveredLevelKey(null);
        setPointerPos(null);
        pointerPosRef.current = null;
        return;
      }
      const key = levelKey(match.level);
      const pos = {
        x: event.clientX - rect.left,
        y: pixelY,
      };
      if (pinnedKeyRef.current === key) {
        setPinnedLevelKey(null);
        setPinnedPos(null);
        setHoveredLevelKey(null);
        setPointerPos(null);
        pointerPosRef.current = null;
        return;
      }
      setPinnedLevelKey(key);
      setPinnedPos(pos);
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    container.addEventListener('click', handleClick);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      container.removeEventListener('click', handleClick);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setPinnedLevelKey(null);
        setPinnedPos(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pinnedLevel = useMemo(() => {
    if (!pinnedLevelKey) return null;
    return aggregatedLevels.find((level) => levelKey(level) === pinnedLevelKey) ?? null;
  }, [aggregatedLevels, pinnedLevelKey]);

  const detailLevel = pinnedLevel;
  const containerDimensions = containerRef.current
    ? {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
      }
    : null;
  const detailPosition = useMemo(() => {
    if (!detailLevel || !containerDimensions) return null;
    const fallback = {
      x: containerDimensions.width - 240,
      y: 32,
    };
    const source = pinnedPos ?? pointerPosRef.current ?? fallback;
    const x = Math.min(Math.max(source.x + 12, 12), containerDimensions.width - 240);
    const y = Math.min(Math.max(source.y - 12, 12), containerDimensions.height - 160);
    return { x, y };
  }, [detailLevel, containerDimensions, pinnedLevel, pinnedPos, pointerPos]);

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line);
      } catch {
        /* ignore */
      }
    });
    priceLinesRef.current = [];

    aggregatedLevels.forEach((level) => {
      const key = levelKey(level);
      const sideLabel = level.side === 'sell' ? 'Ask' : 'Bid';
      const isActive = highlightKey != null && key === highlightKey;
      const baseColor = level.side === 'sell' ? SELL_COLOR : BUY_COLOR;
      const color = isActive
        ? level.side === 'sell'
          ? '#f87171'
          : '#4ade80'
        : baseColor;

      const labelParts = [sideLabel, formatUsd(level.usd)];
      if (level.range) {
        labelParts.push(formatPercent(level.range.offsetPct));
      } else {
        labelParts.push(level.price.toFixed(level.price >= 1 ? 2 : 4));
      }
      if (level.orders > 0) {
        labelParts.push(`${Math.round(level.orders)} orders`);
      }
      const title = labelParts.join(' • ');
      try {
        const line = series.createPriceLine({
          price: level.price,
          color,
          lineWidth: isActive ? 3 : 1.5,
          lineStyle: isActive ? LineStyle.Solid : LineStyle.Dashed,
          axisLabelVisible: true,
          title,
        });
        priceLinesRef.current.push(line);
      } catch {
        /* noop */
      }
    });
  }, [aggregatedLevels, highlightKey]);

  const handleZoomReset = () => {
    setPinnedLevelKey(null);
    setPinnedPos(null);
    setHoveredLevelKey(null);
    setPointerPos(null);
    pointerPosRef.current = null;
    const chart = chartRef.current;
    if (chart) {
      try {
        chart.priceScale('right').applyOptions({ autoScale: true });
      } catch {
        /* ignore */
      }
      try {
        chart.timeScale().fitContent();
      } catch {
        /* ignore */
      }
    }
  };
  const combinedError = error ?? null;
  const showLoader = loading && !combinedError;

  return (
    <div className={cn('relative flex h-full min-h-[320px] flex-1 overflow-hidden', className)}>
      <div className="absolute left-3 top-3 z-30 flex items-center gap-3 text-[11px] text-muted-foreground">
        <span className="hidden sm:inline">Tip: click and drag the price axis to zoom</span>
        <button
          type="button"
          onClick={handleZoomReset}
          className="rounded-md border border-border/40 bg-slate-900/80 px-2 py-1 font-semibold text-muted-foreground transition hover:text-primary"
        >
          Reset
        </button>
      </div>

      <div
        ref={containerRef}
        className="h-full w-full rounded-xl border border-border/40 bg-slate-950/70"
        aria-label={`${baseSymbol}/${quoteSymbol ?? 'USDC'} order book chart`}
      />
      {showLoader && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/60">
          <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
        </div>
      )}
      {combinedError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-slate-950/70 text-xs font-medium text-rose-400">
          {combinedError}
        </div>
      )}
      {detailLevel && detailPosition && (
        <div className="absolute z-30" style={{ left: detailPosition.x, top: detailPosition.y }}>
          <div
            className="min-w-[220px] rounded-lg border border-border/40 bg-slate-950/95 px-3 py-2 text-[11px] text-slate-200 shadow-lg backdrop-blur pointer-events-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span
                className={cn(
                  'font-semibold uppercase tracking-wide',
                  detailLevel.side === 'sell' ? 'text-rose-300' : 'text-emerald-300',
                )}
              >
                {detailLevel.side === 'sell' ? 'Ask Wall' : 'Bid Wall'}
              </span>
              {pinnedLevel && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    setPinnedLevelKey(null);
                    setPinnedPos(null);
                  }}
                  className="rounded px-1 text-[10px] text-muted-foreground transition hover:text-primary"
                >
                  Close
                </button>
              )}
            </div>
            <div className="mt-2 space-y-1 font-mono">
              <div className="flex justify-between">
                <span>Price</span>
                <span>${formatPrice(detailLevel.price)}</span>
              </div>
              <div className="flex justify-between">
                <span>USD</span>
                <span>{formatUsd(detailLevel.usd)}</span>
              </div>
              <div className="flex justify-between">
                <span>Base</span>
                <span>{formatBase(detailLevel.base)} NOS</span>
              </div>
              <div className="flex justify-between">
                <span>Orders</span>
                <span>{detailLevel.orders > 0 ? Math.round(detailLevel.orders) : '—'}</span>
              </div>
              {detailLevel.range && (
                <>
                  <div className="flex justify-between">
                    <span>Offset</span>
                    <span>{formatPercent(detailLevel.range.offsetPct)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Band</span>
                    <span>
                      {formatPrice(detailLevel.range.min)} → {formatPrice(detailLevel.range.max)}
                    </span>
                  </div>
                </>
              )}
              {detailLevel.source && (
                <div className="flex justify-between">
                  <span>Source</span>
                  <span>{detailLevel.source}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default OrderBookTradingView;
