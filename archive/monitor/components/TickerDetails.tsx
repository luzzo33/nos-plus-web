'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, ArrowDownRight, Activity, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchLimitWallV2 } from '@/services/limitWall';
import { useMetricsStream } from '@/lib/monitor/useMetricsStream';

function sumVolume(points: ReturnType<typeof useMetricsStream>['points']): number | null {
  if (!points.length) return null;
  const total = points.reduce((acc, point) => acc + (point.aux?.usd ?? point.v ?? 0), 0);
  return Number.isFinite(total) ? total : null;
}

function computeChange(points: ReturnType<typeof useMetricsStream>['points']): number | null {
  if (points.length < 2) return null;
  const sorted = [...points].sort((a, b) => a.t - b.t);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const start = first.c ?? first.v ?? null;
  const end = last.c ?? last.v ?? null;
  if (
    start == null ||
    end == null ||
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    start === 0
  )
    return null;
  return ((end - start) / start) * 100;
}

export function TickerDetails() {
  const [price, setPrice] = useState<number | null>(null);
  const [spreadPct, setSpreadPct] = useState<number | null>(null);
  const priceMetrics = useMetricsStream({
    metric: 'price',
    range: '1d',
    interval: '10m',
    chart: 'candles',
  });
  const volumeMetrics = useMetricsStream({
    metric: 'volume',
    range: '1d',
    interval: '10m',
    chart: 'bars',
  });
  const change24h = useMemo(() => computeChange(priceMetrics.points), [priceMetrics.points]);
  const volume24h = useMemo(() => sumVolume(volumeMetrics.points), [volumeMetrics.points]);

  useEffect(() => {
    const latest = priceMetrics.latestPrice;
    if (latest != null && Number.isFinite(latest)) {
      setPrice(latest);
      return;
    }
    const lastPoint = priceMetrics.points[priceMetrics.points.length - 1];
    if (lastPoint) {
      const value = lastPoint.c ?? lastPoint.v ?? null;
      if (value != null && Number.isFinite(value)) {
        setPrice(value);
      }
    }
  }, [priceMetrics.latestPrice, priceMetrics.points]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const wall = await fetchLimitWallV2({ decimals: 2, side: 'both' });
        if (cancelled) return;
        const bestBid = Math.max(
          ...wall.buyBuckets.map((b) => b.priceCeil || Number(b.priceLabel) || 0),
        );
        const bestAsk = Math.min(
          ...wall.sellBuckets.map((s) => s.priceFloor || Number(s.priceLabel) || Infinity),
        );
        if (Number.isFinite(bestBid) && Number.isFinite(bestAsk) && bestAsk > 0) {
          const mid = (bestBid + bestAsk) / 2;
          const spread = ((bestAsk - bestBid) / mid) * 100;
          setSpreadPct(spread);
        } else {
          setSpreadPct(null);
        }
      } catch {
        if (!cancelled) setSpreadPct(null);
      }
    }
    load();
    const id = setInterval(load, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <div className="text-sm text-muted-foreground">Price</div>
        <div className="text-xl font-semibold">{price != null ? `$${price.toFixed(4)}` : '—'}</div>
        {change24h != null && (
          <div
            className={cn(
              'text-sm flex items-center gap-1',
              change24h >= 0 ? 'text-emerald-600' : 'text-red-600',
            )}
          >
            {change24h >= 0 ? (
              <ArrowUpRight className="w-3 h-3" />
            ) : (
              <ArrowDownRight className="w-3 h-3" />
            )}
            {change24h.toFixed(2)}%
          </div>
        )}
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="w-3 h-3" />
          <span>Spread</span>
          <span className="font-mono text-foreground">
            {spreadPct != null ? `${spreadPct.toFixed(2)}%` : '—'}
          </span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <DollarSign className="w-3 h-3" />
          <span>Volume 24h</span>
          <span className="font-mono text-foreground">
            {volume24h != null ? `$${volume24h.toLocaleString()}` : '—'}
          </span>
        </div>
      </div>
    </div>
  );
}
