import { describe, it, expect } from 'vitest';
import type { LimitWallDepthPoint } from '@/services/limitWall';

type DepthMode = 'base' | 'usd';
interface XY {
  x: number;
  y: number;
}
const CLAMP = 0.2;
function computeSeries(
  points: LimitWallDepthPoint[],
  side: 'bid' | 'ask',
  depthMode: DepthMode,
  mid: number,
  clampDomain?: [number, number] | null,
): XY[] {
  if (!Array.isArray(points) || points.length === 0) return [];
  const mapped: XY[] = points
    .map((p) => ({
      x: Number(p.price),
      y: depthMode === 'usd' ? Number(p.cumulativeUsd ?? 0) : Number(p.cumulativeBase ?? 0),
    }))
    .filter((p) => Number.isFinite(p.x) && p.x > 0)
    .sort((a, b) => a.x - b.x);
  if (!mapped.length) return [];
  const originPoint = side === 'bid' ? mapped[mapped.length - 1] : mapped[0];
  let windowed = mapped;
  if (Array.isArray(clampDomain) && clampDomain.length === 2) {
    const [minBoundRaw, maxBoundRaw] = clampDomain;
    const minBound = Number.isFinite(minBoundRaw) ? Math.max(0, minBoundRaw) : 0;
    const maxBound = Number.isFinite(maxBoundRaw) ? maxBoundRaw : Number.POSITIVE_INFINITY;
    if (minBound < maxBound) {
      const within = mapped.filter((p) => p.x >= minBound && p.x <= maxBound);
      if (within.length >= 2) {
        const hasOrigin = within.some((p) => p.x === originPoint.x && p.y === originPoint.y);
        windowed = hasOrigin ? within : [...within, originPoint];
      } else if (within.length === 1) {
        windowed = within;
      }
    }
  } else if (mid > 0 && Number.isFinite(mid)) {
    const minBound = Math.max(0, mid * (1 - CLAMP));
    const maxBound = mid * (1 + CLAMP);
    const within = mapped.filter((p) => p.x >= minBound && p.x <= maxBound);
    if (within.length >= 2) {
      const hasOrigin = within.some((p) => p.x === originPoint.x && p.y === originPoint.y);
      windowed = hasOrigin ? within : [...within, originPoint];
    }
  }
  const series = [...windowed].sort((a, b) => a.x - b.x);
  const originIndex = side === 'bid' ? series.length - 1 : 0;
  const originDepth = series[originIndex].y;
  const farDepth = side === 'bid' ? series[0].y : series[series.length - 1].y;
  const increasesAwayFromMid = farDepth >= originDepth;
  const primary = series.map((p) => ({
    x: p.x,
    y: Math.max(0, increasesAwayFromMid ? p.y - originDepth : originDepth - p.y),
  }));
  if (primary.some((p) => p.y > 0)) return primary;
  const minDepth = Math.min(...series.map((p) => p.y));
  return series.map((p) => ({ x: p.x, y: Math.max(0, p.y - minDepth) }));
}

describe('computeSeries depth normalization', () => {
  const bidPoints: LimitWallDepthPoint[] = [
    { price: 9, cumulativeBase: 120, cumulativeUsd: 1200 },
    { price: 9.5, cumulativeBase: 60, cumulativeUsd: 600 },
    { price: 10, cumulativeBase: 0, cumulativeUsd: 0 },
  ];
  const askPoints: LimitWallDepthPoint[] = [
    { price: 10.1, cumulativeBase: 0, cumulativeUsd: 0 },
    { price: 10.5, cumulativeBase: 50, cumulativeUsd: 500 },
    { price: 11, cumulativeBase: 120, cumulativeUsd: 1200 },
  ];
  const mid = 10.05;
  it('produces increasing depth moving away from mid for bids', () => {
    const s = computeSeries(bidPoints, 'bid', 'usd', mid);
    expect(s[0].y).toBeGreaterThan(0);
    expect(s[s.length - 1].y).toBe(0);
  });
  it('produces increasing depth moving away from mid for asks', () => {
    const s = computeSeries(askPoints, 'ask', 'usd', mid);
    expect(s[0].y).toBe(0);
    expect(s[s.length - 1].y).toBeGreaterThan(0);
  });
  it('drops bid points more than ±20% away from mid', () => {
    const farBid: LimitWallDepthPoint[] = [
      { price: 0.6, cumulativeUsd: 5, cumulativeBase: 5 },
      { price: 0.85, cumulativeUsd: 50, cumulativeBase: 50 },
      { price: 0.95, cumulativeUsd: 60, cumulativeBase: 60 },
    ];
    const s = computeSeries(farBid, 'bid', 'usd', 0.92);
    expect(s[0].x).toBeGreaterThanOrEqual(0.736);
    expect(s[s.length - 1].x).toBeCloseTo(0.95);
  });
  it('respects explicit clamp domain', () => {
    const ask: LimitWallDepthPoint[] = [
      { price: 0.9, cumulativeUsd: 10, cumulativeBase: 10 },
      { price: 0.95, cumulativeUsd: 20, cumulativeBase: 20 },
      { price: 1.1, cumulativeUsd: 30, cumulativeBase: 30 },
    ];
    const s = computeSeries(ask, 'ask', 'usd', 0.92, [0.9, 0.98]);
    expect(s[s.length - 1].x).toBeLessThanOrEqual(0.98);
  });
});
