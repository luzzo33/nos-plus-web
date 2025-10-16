'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import { getMonitorApiKey } from '@/lib/api/monitorConfig';
import { monitorWsClient, type SubscriptionListener } from '@/lib/monitor/ws-client';

export interface OrderBookChartCandle {
  ts: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volumeUsd: number | null;
}

export interface OrderBookLimitLevel {
  price: number;
  side: 'buy' | 'sell';
  usd: number;
  base: number;
  orders: number;
  source?: string | null;
}

export interface OrderBookLimitEvent {
  type: 'wall_appeared' | 'wall_removed' | 'wall_updated';
  side: 'buy' | 'sell';
  price: number;
  usd: number;
  deltaUsd: number;
  timestamp: string;
}

export interface UseOrderBookChartOptions {
  base?: string;
  quote?: string | null;
  range?: '15m' | '1h' | '6h' | '1d' | '3d';
  interval?: '10s' | '15s' | '30s' | '1m' | '2m' | '5m' | '10m' | '15m';
  venues?: string[];
  majorThresholdUsd?: number;
}

export interface UseOrderBookChartResult {
  candles: OrderBookChartCandle[];
  limitLevels: OrderBookLimitLevel[];
  events: OrderBookLimitEvent[];
  metadata: { range: string; intervalSeconds: number; generatedAt?: string } | null;
  loading: boolean;
  connected: boolean;
  error: string | null;
}

const MAX_EVENTS = 200;

function normalizeBaseSymbol(value: string | undefined | null): string {
  return value?.trim().length ? value.trim().toUpperCase() : 'NOS';
}

function normalizeQuoteSymbol(value: string | undefined | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed.toUpperCase() : null;
}

function rangeToMs(range: UseOrderBookChartOptions['range']): number {
  switch (range) {
    case '15m':
      return 15 * 60 * 1000;
    case '1h':
      return 60 * 60 * 1000;
    case '6h':
      return 6 * 60 * 60 * 1000;
    case '3d':
      return 3 * 24 * 60 * 60 * 1000;
    case '1d':
    default:
      return 24 * 60 * 60 * 1000;
  }
}

function intervalLabelToSeconds(interval: UseOrderBookChartOptions['interval']): number {
  switch (interval) {
    case '10s':
      return 10;
    case '15s':
      return 15;
    case '30s':
      return 30;
    case '2m':
      return 120;
    case '5m':
      return 300;
    case '10m':
      return 600;
    case '15m':
      return 900;
    case '1m':
    default:
      return 60;
  }
}

function normalizeCandle(payload: unknown): OrderBookChartCandle | null {
  const raw = payload as Record<string, unknown>;
  if (!raw) return null;
  const tsRaw = raw.ts ?? raw.bucketTs;
  const timestamp = typeof tsRaw === 'string' ? new Date(tsRaw) : new Date(String(tsRaw ?? ''));
  const timeMs = timestamp.getTime();
  if (!Number.isFinite(timeMs)) return null;
  const open = Number(raw.open ?? raw.o ?? raw.v ?? raw.price);
  const high = Number(raw.high ?? raw.h ?? open);
  const low = Number(raw.low ?? raw.l ?? open);
  const close = Number(raw.close ?? raw.c ?? raw.v ?? raw.price ?? open);
  if ([open, high, low, close].some((value) => !Number.isFinite(value))) return null;
  const volume = Number(raw.volumeUsd ?? raw.volume ?? raw.usdVolume ?? raw.v ?? null);
  return {
    ts: new Date(timeMs).toISOString(),
    open,
    high,
    low,
    close,
    volumeUsd: Number.isFinite(volume) ? volume : null,
  };
}

function normalizeLimitLevel(payload: unknown): OrderBookLimitLevel | null {
  const raw = payload as Record<string, unknown>;
  if (!raw) return null;
  const price = Number(raw.price);
  if (!Number.isFinite(price) || price <= 0) return null;
  const side = raw.side === 'sell' ? 'sell' : raw.side === 'buy' ? 'buy' : null;
  if (!side) return null;
  const usd = Number(raw.usd ?? raw.notional ?? 0);
  const base = Number(raw.base ?? raw.amount ?? 0);
  const orders = Number(raw.orders ?? raw.count ?? 0);
  return {
    price,
    side,
    usd: Number.isFinite(usd) ? usd : 0,
    base: Number.isFinite(base) ? base : 0,
    orders: Number.isFinite(orders) ? orders : 0,
    source: typeof raw.source === 'string' ? raw.source : null,
  };
}

function normalizeEvent(payload: unknown): OrderBookLimitEvent | null {
  const raw = payload as Record<string, unknown>;
  if (!raw) return null;
  const type =
    raw.type === 'wall_appeared' || raw.type === 'wall_removed' || raw.type === 'wall_updated'
      ? raw.type
      : null;
  const side = raw.side === 'sell' ? 'sell' : raw.side === 'buy' ? 'buy' : null;
  const price = Number(raw.price);
  if (!type || !side || !Number.isFinite(price)) return null;
  const usd = Number(raw.usd ?? 0);
  const deltaUsd = Number(raw.deltaUsd ?? 0);
  const timestamp =
    typeof raw.timestamp === 'string'
      ? raw.timestamp
      : new Date(raw.timestamp ? String(raw.timestamp) : Date.now()).toISOString();
  return {
    type,
    side,
    price,
    usd: Number.isFinite(usd) ? usd : 0,
    deltaUsd: Number.isFinite(deltaUsd) ? deltaUsd : 0,
    timestamp,
  };
}

function mergeCandles(
  existing: OrderBookChartCandle[],
  incoming: OrderBookChartCandle[],
  rangeMs: number,
): OrderBookChartCandle[] {
  if (!existing.length && !incoming.length) return existing;
  const map = new Map<number, OrderBookChartCandle>();
  for (const candle of existing) {
    const ts = Date.parse(candle.ts);
    if (Number.isFinite(ts)) {
      map.set(ts, candle);
    }
  }
  for (const candle of incoming) {
    const ts = Date.parse(candle.ts);
    if (Number.isFinite(ts)) {
      map.set(ts, candle);
    }
  }
  const now = Date.now();
  const minTs = now - rangeMs * 1.2;
  return Array.from(map.entries())
    .filter(([ts]) => Number.isFinite(ts) && ts >= minTs)
    .sort((a, b) => a[0] - b[0])
    .map(([, candle]) => candle);
}

function smoothCandles(candles: OrderBookChartCandle[]): OrderBookChartCandle[] {
  if (!candles.length) return candles;
  const sorted = [...candles].sort((a, b) => Date.parse(a.ts) - Date.parse(b.ts));
  const result: OrderBookChartCandle[] = [];
  let lastClose: number | null = null;

  for (const candle of sorted) {
    const open = Number.isFinite(candle.open) ? candle.open : lastClose;
    const close = Number.isFinite(candle.close) ? candle.close : candle.open;
    const safeOpen = open != null ? open : close;
    const safeClose = close != null ? close : safeOpen;
    const mid = (safeOpen + safeClose) / 2;
    const highCandidates = [candle.high, safeOpen, safeClose, mid].filter(
      (value): value is number => Number.isFinite(value!),
    );
    const lowCandidates = [candle.low, safeOpen, safeClose, mid].filter(
      (value): value is number => Number.isFinite(value!),
    );
    const high = highCandidates.length ? Math.max(...highCandidates) : safeClose;
    const low = lowCandidates.length ? Math.min(...lowCandidates) : safeClose;
    const normalized: OrderBookChartCandle = {
      ts: candle.ts,
      open: safeOpen ?? safeClose,
      close: safeClose,
      high: Math.max(high, low),
      low: Math.min(low, high),
      volumeUsd: candle.volumeUsd ?? null,
    };
    result.push(normalized);
    lastClose = normalized.close;
  }

  const alpha = 0.4;
  const blended: OrderBookChartCandle[] = [];
  let prev: OrderBookChartCandle | null = null;
  for (const candle of result) {
    if (!prev) {
      blended.push(candle);
      prev = candle;
      continue;
    }
    const open = prev.close * (1 - alpha) + candle.open * alpha;
    const close = prev.close * (1 - alpha) + candle.close * alpha;
    const high = Math.max(candle.high, open, close);
    const low = Math.min(candle.low, open, close);
    const smoothed: OrderBookChartCandle = {
      ts: candle.ts,
      open,
      close,
      high,
      low,
      volumeUsd: candle.volumeUsd ?? prev.volumeUsd ?? null,
    };
    blended.push(smoothed);
    prev = smoothed;
  }
  return blended;
}

export function useOrderBookChartStream(
  options: UseOrderBookChartOptions = {},
): UseOrderBookChartResult {
  const base = normalizeBaseSymbol(options.base);
  const quote = normalizeQuoteSymbol(options.quote);
  const range = options.range ?? '1d';
  const interval = options.interval ?? '1m';
  const intervalSeconds = intervalLabelToSeconds(interval);
  const rangeMs = rangeToMs(range);

  const venues = useMemo(() => {
    if (!options.venues || !options.venues.length) return undefined;
    const normalized = options.venues
      .map((venue) => venue.trim().toLowerCase())
      .filter((venue) => venue.length);
    if (!normalized.length) return undefined;
    return Array.from(new Set(normalized)).sort();
  }, [options.venues]);

  const params = useMemo(() => {
    const payload: Record<string, unknown> = {
      base,
      range,
      interval,
    };
    if (quote) payload.quote = quote;
    if (venues) payload.venues = venues;
    if (Number.isFinite(options.majorThresholdUsd ?? NaN)) {
      payload.majorThresholdUsd = Math.max(0, Number(options.majorThresholdUsd));
    }
    return payload;
  }, [base, quote, range, interval, venues, options.majorThresholdUsd]);

  const [candles, setCandles] = useState<OrderBookChartCandle[]>([]);
  const [limitLevels, setLimitLevels] = useState<OrderBookLimitLevel[]>([]);
  const [events, setEvents] = useState<OrderBookLimitEvent[]>([]);
  const [metadata, setMetadata] =
    useState<UseOrderBookChartResult['metadata']>(null);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const subscriptionRef = useRef<ReturnType<typeof monitorWsClient.subscribe> | null>(null);

  useEffect(() => {
    if (!getMonitorApiKey()) {
      setError('monitor_api_key_missing');
      setConnected(false);
      setLoading(false);
      setCandles([]);
      setLimitLevels([]);
      setEvents([]);
      setMetadata(null);
      return;
    }

    setLoading(true);
    setError(null);
    setConnected(false);
    setEvents([]);

    const listener: SubscriptionListener = {
      onSnapshot: (snapshot) => {
        const payload = (snapshot as Record<string, unknown>) ?? {};
        const candleRows = Array.isArray(payload.candles) ? payload.candles : [];
        const levelRows = Array.isArray(payload.limitLevels) ? payload.limitLevels : [];
        const mappedCandles = candleRows
          .map(normalizeCandle)
          .filter((entry): entry is OrderBookChartCandle => entry !== null);
        const mappedLevels = levelRows
          .map(normalizeLimitLevel)
          .filter((entry): entry is OrderBookLimitLevel => entry !== null);
        setCandles(mappedCandles);
        setLimitLevels(mappedLevels);
        setEvents([]);
        setMetadata({
          range: typeof payload.range === 'string' ? payload.range : range,
          intervalSeconds: Number(payload.intervalSeconds ?? intervalSeconds) || intervalSeconds,
          generatedAt: typeof payload.generatedAt === 'string' ? payload.generatedAt : undefined,
        });
        setConnected(true);
        setLoading(false);
      },
      onUpdate: (update) => {
        const payload = (update as Record<string, unknown>) ?? {};
        const candleRows = Array.isArray(payload.candles) ? payload.candles : [];
        const levelRows = Array.isArray(payload.limitLevels) ? payload.limitLevels : [];
        const eventRows = Array.isArray(payload.events) ? payload.events : [];

        if (candleRows.length) {
          const incoming = candleRows
            .map(normalizeCandle)
            .filter((entry): entry is OrderBookChartCandle => entry !== null);
          if (incoming.length) {
            setCandles((prev) => mergeCandles(prev, incoming, rangeMs));
          }
        }

        if (levelRows.length) {
          const incomingLevels = levelRows
            .map(normalizeLimitLevel)
            .filter((entry): entry is OrderBookLimitLevel => entry !== null);
          if (incomingLevels.length) {
            setLimitLevels(incomingLevels);
          }
        }

        if (eventRows.length) {
          const incomingEvents = eventRows
            .map(normalizeEvent)
            .filter((entry): entry is OrderBookLimitEvent => entry !== null);
          if (incomingEvents.length) {
            setEvents((prev) => {
              const merged = [...prev, ...incomingEvents];
              return merged.length > MAX_EVENTS ? merged.slice(-MAX_EVENTS) : merged;
            });
          }
        }

        if (payload.generatedAt) {
          setMetadata((prev) => ({
            range: prev?.range ?? range,
            intervalSeconds: prev?.intervalSeconds ?? intervalSeconds,
            generatedAt:
              typeof payload.generatedAt === 'string'
                ? payload.generatedAt
                : prev?.generatedAt,
          }));
        }
        setConnected(true);
        setLoading(false);
      },
      onError: (err) => {
        const message = err?.message || err?.code || 'order_book_chart_error';
        setError(message);
        setConnected(false);
        setLoading(false);
      },
    };

    const subscription = monitorWsClient.subscribe('monitor.orderBookChart', params, listener);
    subscriptionRef.current = subscription;
    subscription.ready.catch((err) => {
      const message = err instanceof Error ? err.message : String(err ?? 'order_book_chart_error');
      setError(message);
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [params, range, intervalSeconds, rangeMs]);

  return {
    candles: smoothCandles(candles),
    limitLevels,
    events,
    metadata,
    loading,
    connected,
    error,
  };
}
