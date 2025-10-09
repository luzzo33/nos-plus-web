'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fetchLimitWallV2, type LimitWallV2Response } from '@/services/limitWall';

export function OrderWallHeatmap() {
  const [data, setData] = useState<LimitWallV2Response | null>(null);
  const [decimals, setDecimals] = useState(2);
  const abort = useRef<AbortController | null>(null);

  async function load() {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    try {
      const res = await fetchLimitWallV2({ decimals, side: 'both', signal: ac.signal });
      setData(res);
    } catch {}
  }
  useEffect(() => {
    load();
  }, [decimals]);
  useEffect(() => {
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [decimals]);

  const rows = useMemo(() => {
    if (!data) return [] as Array<{ label: string; bid: number; ask: number }>;
    const buys = [...data.buyBuckets];
    const sells = [...data.sellBuckets];
    const labels = new Set<string>();
    buys.forEach((b) => labels.add(b.priceLabel));
    sells.forEach((s) => labels.add(s.priceLabel));
    const out: Array<{ label: string; bid: number; ask: number }> = [];
    Array.from(labels)
      .sort((a, b) => Number(a) - Number(b))
      .forEach((lbl) => {
        const b = buys.find((x) => x.priceLabel === lbl);
        const s = sells.find((x) => x.priceLabel === lbl);
        out.push({ label: lbl, bid: b?.baseLiquidity || 0, ask: s?.baseLiquidity || 0 });
      });
    return out.slice(0, 40);
  }, [data]);

  const max = useMemo(
    () => Math.max(1, ...rows.map((r) => r.bid), ...rows.map((r) => r.ask)),
    [rows],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-muted-foreground">Bucket</span>
        <select
          className="h-7 rounded border border-border bg-background px-2"
          value={decimals}
          onChange={(e) => setDecimals(Number(e.target.value))}
        >
          <option value={1}>0.1</option>
          <option value={2}>0.01</option>
          <option value={3}>0.001</option>
        </select>
      </div>
      <div className="max-h-[220px] overflow-auto">
        {rows.map((r) => (
          <div
            key={r.label}
            className="grid grid-cols-[6rem_1fr_3.5rem_1fr_3.5rem] items-center gap-2 py-1"
          >
            <div className="text-xs font-mono text-muted-foreground">${r.label}</div>
            <div className="h-3 bg-emerald-500/15 rounded relative">
              <div
                className="absolute inset-y-0 left-0 bg-emerald-500/50 rounded"
                style={{ width: `${Math.min(100, (r.bid / max) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-emerald-400 text-right tabular-nums">
              {r.bid.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
            <div className="h-3 bg-red-500/15 rounded relative">
              <div
                className="absolute inset-y-0 right-0 bg-red-500/50 rounded"
                style={{ width: `${Math.min(100, (r.ask / max) * 100)}%` }}
              />
            </div>
            <div className="text-[11px] font-mono text-red-400 tabular-nums">
              {r.ask.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
