export { default } from '../OrderBookTradingView';
/* eslint-disable */
'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import {
  ColorType,
  createChart,
  CrosshairMode,
  LineStyle,
  type CandlestickData,
  type IChartApi,
  type IPriceLine,
  type UTCTimestamp,
} from 'lightweight-charts';
import { Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import type { OrderBookChartCandle, OrderBookLimitLevel } from '@/lib/monitor/useOrderBookChartStream';

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
  loading?: boolean;
  error?: string | null;
  className?: string;
  aggregation: AggregationSetting;
  midPrice: number | null;
}

function toCandlestickData(candle: OrderBookChartCandle): CandlestickData<UTCTimestamp> {
  const time = Math.floor(Date.parse(candle.ts) / 1000) as UTCTimestamp;
  return {
    time,
    open: Number(candle.open),
    high: Number(candle.high),
    low: Number(candle.low),
    close: Number(candle.close),
  };
}

const HORIZONTAL_COLOR_BUY = '#22c55e';
const HORIZONTAL_COLOR_SELL = '#ef4444';

function aggregateLimitLevels(
  levels: OrderBookLimitLevel[],
  aggregation: AggregationSetting,
  referencePrice: number,
): OrderBookLimitLevel[] {
  if (!levels.length || aggregation.kind === 'none') return levels;
  const map = new Map<string, OrderBookLimitLevel>();
  const seed =
    referencePrice && referencePrice > 0
      ? referencePrice
      : levels.find((level) => Number.isFinite(level.price) && level.price > 0)?.price ?? 1;
  const step =
    aggregation.kind === 'abs'
      ? Math.max(aggregation.size, 0.0001)
      : Math.max(seed * aggregation.pct, seed * aggregation.pct * 0.1, 0.0001);

  for (const level of levels) {
    const price = Number(level.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const bucketPrice = Math.round(price / step) * step;
    const key = `${level.side}:${bucketPrice.toFixed(8)}`;
    const existing = map.get(key);
    if (existing) {
      existing.usd += level.usd;
      existing.base += level.base;
      existing.orders += level.orders;
    } else {
      map.set(key, {
        price: bucketPrice,
        side: level.side,
        usd: level.usd,
        base: level.base,
        orders: level.orders,
        source: level.source,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => a.price - b.price);
}

export function OrderBookTradingView({
  candles,
  limitLevels,
  baseSymbol = 'NOS',
  quoteSymbol = 'USDC',
  intervalSeconds,
  loading,
  error,
  className,
  aggregation,
  midPrice,
}: OrderBookTradingViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ReturnType<IChartApi['addCandlestickSeries']> | null>(null);
  const priceLinesRef = useRef<IPriceLine[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const dataRef = useRef<CandlestickData<UTCTimestamp>[]>([]);
  const autoScrollRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const chart = createChart(container, {
      layout: {
        background: { type: ColorType.Solid, color: '#020617' },
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
        secondsVisible: false,
      },
    });

    const series = chart.addCandlestickSeries({
      upColor: '#22c55e',
      downColor: '#ef4444',
      wickUpColor: '#16a34a',
      wickDownColor: '#dc2626',
      borderUpColor: '#34d399',
      borderDownColor: '#f87171',
      priceFormat: {
        type: 'price',
        precision: 4,
        minMove: 0.0001,
      },
    });

    chartRef.current = chart;
    seriesRef.current = series;

    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (!range) return;
      const lastIndex = dataRef.current.length - 1;
      if (lastIndex < 0) {
        autoScrollRef.current = true;
        return;
      }
      if (!Number.isFinite(range.to)) {
        autoScrollRef.current = true;
        return;
      }
      autoScrollRef.current = (range.to as number) >= lastIndex - 1;
    });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        chart.applyOptions({ width, height });
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
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      priceLinesRef.current = [];
      dataRef.current = [];
    };
  }, []);

  useEffect(() => {
    const series = seriesRef.current;
    const chart = chartRef.current;
    if (!series || !chart) return;
    if (!candles.length) {
      series.setData([]);
      dataRef.current = [];
      return;
    }
    const data = candles.map(toCandlestickData);
    dataRef.current = data;
    series.setData(data);
    if (autoScrollRef.current) {
      chart.timeScale().scrollToRealTime();
    }
  }, [candles, intervalSeconds]);

  const aggregatedLevels = useMemo(
    () => aggregateLimitLevels(limitLevels, aggregation, midPrice ?? 0),
    [aggregation, limitLevels, midPrice],
  );

  useEffect(() => {
    const series = seriesRef.current;
    if (!series) return;
    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line);
      } catch {
        // ignore
      }
    });
    priceLinesRef.current = [];

    aggregatedLevels.forEach((level) => {
      const color = level.side === 'sell' ? HORIZONTAL_COLOR_SELL : HORIZONTAL_COLOR_BUY;
      const title = `${level.side === 'sell' ? 'Ask' : 'Bid'} • ${level.usd.toFixed(0)} USD`;
      try {
        const priceLine = series.createPriceLine({
          price: level.price,
          color,
          lineWidth: 2,
          lineStyle: LineStyle.Solid,
          axisLabelVisible: true,
          title,
        });
        priceLinesRef.current.push(priceLine);
      } catch {
        // ignore
      }
    });
  }, [aggregatedLevels]);

  const combinedError = error ?? null;
  const showLoader = loading && !combinedError;

  return (
    <div className={cn('relative flex h-full min-h-[320px] flex-1 overflow-hidden', className)}>
      <div ref={containerRef} className="h-full w-full rounded-xl border border-border/40 bg-slate-950/70" />
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
    </div>
  );
}

export default OrderBookTradingView;
