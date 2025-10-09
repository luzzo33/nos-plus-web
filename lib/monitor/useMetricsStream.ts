'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { monitorWsClient, type SubscriptionListener } from '@/lib/monitor/ws-client';
import { getMonitorApiKey } from '@/lib/api/monitorConfig';

export type MetricsKind = 'price' | 'volume' | 'activity';
export interface MetricsPoint {
  t: number;
  v: number | null;
  o?: number | null;
  h?: number | null;
  l?: number | null;
  c?: number | null;
  aux?: { count?: number; usd?: number };
}

export interface UseMetricsOptions {
  metric: MetricsKind;
  range?: '15m' | '1h' | '6h' | '1d';
  interval?: string;
  chart?: 'line' | 'bars' | 'candles';
  from?: string;
  venues?: string | string[];
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function coerceTime(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'number') return Number.isFinite(value) ? value : Date.now();
  if (typeof value === 'string') {
    const d = new Date(value);
    const t = d.getTime();
    return Number.isFinite(t) ? t : Date.now();
  }
  return Date.now();
}

function mapPoints(rows: unknown[]): MetricsPoint[] {
  return rows.map((entry) => {
    const row = entry as Record<string, unknown>;
    return {
      t: coerceTime(row.t ?? row.bucketTs),
      v: toNumber(row.v ?? row.value ?? row.close ?? row.c),
      o: toNumber(row.o ?? row.open),
      h: toNumber(row.h ?? row.high),
      l: toNumber(row.l ?? row.low),
      c: toNumber(row.c ?? row.close ?? row.v),
      aux: (row.aux as MetricsPoint['aux']) ?? undefined,
    } satisfies MetricsPoint;
  });
}

const PRICE_VALUE_MIN = 1e-9;
const PRICE_VALUE_MAX = 1_000_000;
const PRICE_OUTLIER_FACTOR = 6;

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid];
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

function clampPriceValue(raw: number | null | undefined, baseline: number | null): number | null {
  const numeric = toNumber(raw);
  if (numeric == null || numeric <= 0) {
    return baseline && baseline > 0 ? baseline : null;
  }
  const bounded = Math.min(Math.max(numeric, PRICE_VALUE_MIN), PRICE_VALUE_MAX);
  if (!baseline || baseline <= 0) {
    return bounded;
  }
  const max = Math.min(PRICE_VALUE_MAX, baseline * PRICE_OUTLIER_FACTOR);
  const min = Math.max(PRICE_VALUE_MIN, baseline / PRICE_OUTLIER_FACTOR);
  if (bounded > max || bounded < min) {
    return baseline;
  }
  return bounded;
}

function deriveAnchorFromPoint(point: MetricsPoint | null | undefined): number | null {
  if (!point) return null;
  const candidates = [point.c, point.v, point.o, point.h, point.l]
    .map((value) => toNumber(value))
    .filter((value): value is number => value != null && value > 0);
  if (!candidates.length) return null;
  return candidates[candidates.length - 1];
}

function sanitizePricePoint(
  point: MetricsPoint,
  anchor: number | null,
): { sanitized: MetricsPoint; anchor: number | null } {
  const candidates = [point.c, point.v, point.o, point.h, point.l]
    .map((value) => toNumber(value))
    .filter((value): value is number => value != null && value > 0);

  let baseline = candidates.length ? median(candidates) : null;
  if (anchor && anchor > 0) {
    baseline = baseline && baseline > 0 ? (baseline + anchor) / 2 : anchor;
  }
  if (!baseline || baseline <= 0) {
    baseline = candidates.find((value) => value > 0) ?? anchor ?? null;
  }

  const safeBaseline = baseline && baseline > 0 ? baseline : null;
  const closeCandidate =
    clampPriceValue(point.c, safeBaseline) ?? clampPriceValue(point.v, safeBaseline);
  const fallback = safeBaseline ?? anchor ?? candidates.find((value) => value > 0) ?? 0;
  const close = closeCandidate ?? fallback;
  const open = clampPriceValue(point.o, safeBaseline ?? close) ?? close;
  const highCandidate = clampPriceValue(point.h, safeBaseline ?? close) ?? Math.max(open, close);
  const lowCandidate = clampPriceValue(point.l, safeBaseline ?? close) ?? Math.min(open, close);
  const valueCandidate = clampPriceValue(point.v, safeBaseline ?? close) ?? close;
  const high = Math.max(highCandidate, open, valueCandidate, close);
  const low = Math.min(lowCandidate, open, valueCandidate, close);

  const sanitized: MetricsPoint = {
    ...point,
    v: valueCandidate,
    o: open,
    h: high,
    l: low,
    c: close,
  };

  const nextAnchor = sanitized.c ?? sanitized.v ?? safeBaseline ?? anchor ?? null;

  return { sanitized, anchor: nextAnchor };
}

function sanitizePriceSeries(points: MetricsPoint[]): MetricsPoint[] {
  const sanitized: MetricsPoint[] = [];
  let anchor: number | null = null;
  for (const point of points) {
    const { sanitized: nextPoint, anchor: nextAnchor } = sanitizePricePoint(point, anchor);
    sanitized.push(nextPoint);
    anchor = nextAnchor;
  }
  return sanitized;
}

export function useMetricsStream(
  opts: UseMetricsOptions & {
    initialSeries?: MetricsPoint[];
    initialMeta?: { total?: number | null; latestPrice?: number | null };
  },
) {
  const { metric, range = '1h', interval = '10s', chart = 'line' } = opts;
  const venuesParam = useMemo(() => {
    const source = opts.venues;
    if (!source) return undefined;
    if (Array.isArray(source)) {
      return source
        .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
        .filter((entry) => entry.length > 0)
        .join(',');
    }
    if (typeof source === 'string') {
      const trimmed = source.trim();
      return trimmed.length ? trimmed : undefined;
    }
    return undefined;
  }, [opts.venues]);
  const initialPointState = useMemo<MetricsPoint[]>(() => {
    if (metric === 'price' && opts.initialSeries?.length) {
      return sanitizePriceSeries(opts.initialSeries);
    }
    return opts.initialSeries ?? [];
  }, [metric, opts.initialSeries]);
  const initialLatestPrice = useMemo<number | undefined>(() => {
    if (metric === 'price' && initialPointState.length) {
      const last = initialPointState[initialPointState.length - 1];
      return last?.c ?? last?.v ?? undefined;
    }
    const value = opts.initialMeta?.latestPrice;
    return typeof value === 'number' ? value : undefined;
  }, [metric, initialPointState, opts.initialMeta?.latestPrice]);
  const [points, setPoints] = useState<MetricsPoint[]>(initialPointState);
  const [total, setTotal] = useState<number | undefined>(opts.initialMeta?.total ?? undefined);
  const [latestPrice, setLatestPrice] = useState<number | undefined>(initialLatestPrice);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof monitorWsClient.subscribe> | null>(null);
  const params = useMemo(() => {
    const payload: Record<string, unknown> = { metric, range, interval, chart };
    if (venuesParam) payload.venues = venuesParam;
    return payload;
  }, [metric, range, interval, chart, venuesParam]);

  useEffect(() => {
    if (metric === 'price') {
      if (opts.initialSeries?.length) {
        const sanitized = sanitizePriceSeries(opts.initialSeries);
        setPoints(sanitized);
        const last = sanitized[sanitized.length - 1];
        if (last) {
          const latest = last.c ?? last.v;
          if (typeof latest === 'number') setLatestPrice(latest);
        }
      } else {
        setPoints([]);
      }
    } else if (opts.initialSeries) {
      setPoints(opts.initialSeries);
      const value = opts.initialMeta?.latestPrice;
      if (typeof value === 'number') setLatestPrice(value);
    } else {
      setPoints([]);
    }
  }, [metric, opts.initialSeries, opts.initialMeta?.latestPrice, venuesParam]);

  useEffect(() => {
    if (!getMonitorApiKey()) {
      setError('monitor_api_key_missing');
      setConnected(false);
      setPoints([]);
      return;
    }
    setError(null);
    setConnected(false);
    const listener: SubscriptionListener = {
      onSnapshot: (payload: unknown) => {
        const objectPayload = (payload as Record<string, unknown>) ?? {};
        const list = Array.isArray(objectPayload.points) ? objectPayload.points : [];
        const mapped = mapPoints(list);
        const sanitizedPoints = metric === 'price' ? sanitizePriceSeries(mapped) : mapped;
        setPoints(sanitizedPoints);
        const meta = objectPayload.meta as { total?: number; latestPrice?: number } | undefined;
        setTotal(meta?.total ?? undefined);
        if (metric === 'price') {
          const lastPoint = sanitizedPoints[sanitizedPoints.length - 1];
          const latest = lastPoint?.c ?? lastPoint?.v ?? meta?.latestPrice;
          if (typeof latest === 'number') setLatestPrice(latest);
        } else {
          const latest = meta?.latestPrice;
          if (typeof latest === 'number') setLatestPrice(latest);
        }
        setConnected(true);
      },
      onUpdate: (payload: unknown) => {
        const data = (payload as Record<string, unknown>) ?? {};
        const bucketTs =
          data.bucketTs ?? (data.metric as Record<string, unknown> | undefined)?.bucketTs;
        if (!bucketTs) return;
        const t = coerceTime(bucketTs);
        let sanitizedForUpdate: MetricsPoint | null = null;
        setPoints((prev) => {
          const base = prev.slice();
          const rawPoint: MetricsPoint = {
            t,
            v: toNumber(data.v ?? data.close ?? data.c ?? data.price),
            o: toNumber(data.open ?? data.o),
            h: toNumber(data.high ?? data.h),
            l: toNumber(data.low ?? data.l),
            c: toNumber(data.close ?? data.c ?? data.v),
            aux: data.aux as MetricsPoint['aux'] | undefined,
          };
          if (!Number.isFinite(rawPoint.v ?? NaN) && base.length) {
            const last = base[base.length - 1];
            rawPoint.v = last.c ?? last.v ?? null;
            rawPoint.o = rawPoint.o ?? last.c ?? last.v ?? null;
            rawPoint.h = rawPoint.h ?? rawPoint.v;
            rawPoint.l = rawPoint.l ?? rawPoint.v;
            rawPoint.c = rawPoint.c ?? rawPoint.v;
          }
          let pointToInsert = rawPoint;
          if (metric === 'price') {
            const anchor = deriveAnchorFromPoint(base.length ? base[base.length - 1] : null);
            const result = sanitizePricePoint(rawPoint, anchor);
            pointToInsert = result.sanitized;
            sanitizedForUpdate = pointToInsert;
          }
          const idx = base.findIndex((entry) => entry.t === t);
          if (idx >= 0) base[idx] = pointToInsert;
          else base.push(pointToInsert);
          base.sort((a, b) => a.t - b.t);
          return base.slice(-600);
        });
        const metricPayload =
          (data.metric as { metric?: MetricsKind } | undefined)?.metric ?? metric;
        if (metricPayload === 'price') {
          const latest = sanitizedForUpdate?.c ?? sanitizedForUpdate?.v;
          if (typeof latest === 'number') {
            setLatestPrice(latest);
          }
        } else {
          const value = toNumber(data.c ?? data.close ?? data.v ?? data.price);
          if (value != null) setLatestPrice(value);
        }
      },
      onError: (err) => {
        setError(err.message || err.code || 'metrics_stream_error');
        setConnected(false);
      },
    };

    const subscription = monitorWsClient.subscribe('monitor.metrics', params, listener);
    subscriptionRef.current = subscription;
    subscription.ready.catch((err) => setError(err?.message || 'metrics_stream_error'));

    return () => {
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [params, metric]);

  return {
    points,
    total,
    latestPrice,
    connected,
    error,
  };
}
