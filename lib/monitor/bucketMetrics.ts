import type { MetricsPoint, MetricsKind } from '@/lib/monitor/useMetricsStream';

type BucketOptions = {
  intervalMs: number;
  metric: MetricsKind;
  fillGaps?: boolean;
  limitMs?: number;
};

type Bucket = {
  start: number;
  end: number;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  sum: number;
  count: number;
  volume: number;
  activity: number;
  auxCount: number;
  auxUsd: number;
};

function toFinite(value: unknown): number | null {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function ensureBucket(map: Map<number, Bucket>, start: number, intervalMs: number): Bucket {
  let bucket = map.get(start);
  if (!bucket) {
    bucket = {
      start,
      end: start + intervalMs,
      open: null,
      high: null,
      low: null,
      close: null,
      sum: 0,
      count: 0,
      volume: 0,
      activity: 0,
      auxCount: 0,
      auxUsd: 0,
    };
    map.set(start, bucket);
  }
  return bucket;
}

function clampPrice(value: number | null, fallback: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return fallback;
  return value;
}

export function bucketMetricsPoints(
  points: MetricsPoint[],
  options: BucketOptions,
): MetricsPoint[] {
  const { intervalMs, metric, fillGaps = true, limitMs } = options;
  if (!Array.isArray(points) || !points.length) return [];
  if (!Number.isFinite(intervalMs) || intervalMs <= 0) return points.slice();

  const buckets = new Map<number, Bucket>();
  const normalized = points
    .map((entry) => ({
      ...entry,
      t: Number(entry.t ?? 0),
    }))
    .filter((entry) => Number.isFinite(entry.t));
  normalized.sort((a, b) => a.t - b.t);

  for (const point of normalized) {
    const ts = point.t;
    const bucketStart = Math.floor(ts / intervalMs) * intervalMs;
    const bucket = ensureBucket(buckets, bucketStart, intervalMs);
    bucket.end = Math.max(bucket.end, ts);

    const primary = toFinite(point.c ?? point.v ?? point.o ?? point.h ?? point.l);

    if (metric === 'price') {
      const openCandidate = toFinite(point.o);
      if (openCandidate != null && bucket.open == null) bucket.open = openCandidate;
      if (primary != null) bucket.close = primary;
      const highCandidate = Math.max(
        bucket.high ?? Number.NEGATIVE_INFINITY,
        ...[point.h, point.v, point.c, point.o, point.l].map(
          (value) => toFinite(value) ?? Number.NEGATIVE_INFINITY,
        ),
      );
      bucket.high = Number.isFinite(highCandidate) ? highCandidate : bucket.high;
      const lowCandidate = Math.min(
        bucket.low ?? Number.POSITIVE_INFINITY,
        ...[point.l, point.c, point.v, point.o, point.h].map(
          (value) => toFinite(value) ?? Number.POSITIVE_INFINITY,
        ),
      );
      bucket.low = Number.isFinite(lowCandidate) ? lowCandidate : bucket.low;
      if (primary != null) {
        bucket.sum += primary;
        bucket.count += 1;
      }
    } else if (metric === 'volume') {
      const volumeValue = toFinite(point.v);
      if (volumeValue != null) bucket.volume += volumeValue;
    } else if (metric === 'activity') {
      const activityValue = toFinite(point.v);
      if (activityValue != null) bucket.activity += activityValue;
    }

    const auxCount = toFinite(point.aux?.count);
    if (auxCount != null) bucket.auxCount += auxCount;
    const auxUsd = toFinite(point.aux?.usd);
    if (auxUsd != null) bucket.auxUsd += auxUsd;
  }

  if (!buckets.size) return [];
  const orderedStarts = Array.from(buckets.keys()).sort((a, b) => a - b);
  const lastStart = orderedStarts[orderedStarts.length - 1];
  let firstStart = orderedStarts[0];
  if (limitMs && Number.isFinite(limitMs) && limitMs > 0) {
    const minStart = lastStart - Math.floor(limitMs / intervalMs) * intervalMs;
    if (minStart > firstStart) firstStart = Math.max(firstStart, minStart);
  }
  firstStart = Math.floor(firstStart / intervalMs) * intervalMs;

  const results: MetricsPoint[] = [];
  let previousPrice: number | null = null;

  for (let cursor = firstStart; cursor <= lastStart; cursor += intervalMs) {
    const bucket = buckets.get(cursor);
    if (!bucket) {
      if (!fillGaps) continue;
      if (metric === 'price') {
        const carry = previousPrice ?? 0;
        results.push({
          t: cursor + intervalMs,
          v: carry,
          o: carry,
          h: carry,
          l: carry,
          c: carry,
        });
      } else {
        results.push({
          t: cursor + intervalMs,
          v: 0,
        });
      }
      continue;
    }

    if (metric === 'price') {
      const close = clampPrice(bucket.close, previousPrice);
      const fallback = close ?? previousPrice ?? bucket.open ?? 0;
      const open = clampPrice(bucket.open, fallback) ?? fallback;
      const high =
        clampPrice(bucket.high, Math.max(open, close ?? fallback)) ??
        Math.max(open, close ?? fallback);
      const low =
        clampPrice(bucket.low, Math.min(open, close ?? fallback)) ??
        Math.min(open, close ?? fallback);
      const value = close ?? fallback;
      const aux: Record<string, number> = {};
      if (bucket.auxCount > 0) aux.count = bucket.auxCount;
      if (bucket.auxUsd > 0) aux.usd = bucket.auxUsd;
      const point: MetricsPoint = {
        t: bucket.end,
        v: value,
        o: open,
        h: high,
        l: low,
        c: value,
        aux: Object.keys(aux).length ? aux : undefined,
      };
      results.push(point);
      previousPrice = value;
    } else if (metric === 'volume') {
      const aux: Record<string, number> = {};
      if (bucket.auxUsd > 0) aux.usd = bucket.auxUsd;
      const point: MetricsPoint = {
        t: bucket.end,
        v: bucket.volume,
        aux: Object.keys(aux).length ? aux : undefined,
      };
      results.push(point);
    } else if (metric === 'activity') {
      const point: MetricsPoint = {
        t: bucket.end,
        v: bucket.activity,
      };
      results.push(point);
    }
  }

  return results;
}
