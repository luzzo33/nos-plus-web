'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { getMonitorApiBase } from '@/lib/api/monitorConfig';
import { markMonitorDataHydrated } from '@/lib/monitor/runtime';

export interface DashboardStatsSnapshot {
  venue?: string | null;
  priceNow: number | null;
  change5m: number | null;
  change1h: number | null;
  change6h: number | null;
  change24h: number | null;
  volume: number | null;
  tx: number | null;
  buyers: number | null;
  sellers: number | null;
  updatedAt: string | null;
}

export interface DashboardMetricsPoint {
  t: string;
  v: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  aux?: Record<string, number>;
}

export interface DashboardMetricsSeries {
  points: DashboardMetricsPoint[];
  total?: number | null;
  latestPrice?: number | null;
}

export interface DashboardSnapshot {
  generatedAt: string;
  stats: {
    total: Record<string, DashboardStatsSnapshot>;
    average: Record<string, DashboardStatsSnapshot>;
    perVenue: Record<string, Record<string, DashboardStatsSnapshot>>;
  };
  metrics: {
    price: Record<string, DashboardMetricsSeries>;
    volume: Record<string, DashboardMetricsSeries>;
    activity: Record<string, DashboardMetricsSeries>;
  };
  metricsByVenue?: Record<
    string,
    {
      price: Record<string, DashboardMetricsSeries>;
      volume: Record<string, DashboardMetricsSeries>;
      activity: Record<string, DashboardMetricsSeries>;
    }
  >;
  dca: unknown;
  summary: unknown;
}

const DashboardContext = createContext<DashboardSnapshot | null>(null);

let bootstrapPromise: Promise<DashboardSnapshot | null> | null = null;
let bootstrapCache: DashboardSnapshot | null = null;

export async function fetchDashboardSnapshot(): Promise<DashboardSnapshot | null> {
  if (bootstrapCache) return bootstrapCache;
  if (!bootstrapPromise) {
    bootstrapPromise = (async () => {
      try {
        const base = getMonitorApiBase();
        const res = await fetch(`${base}/dashboard`, { cache: 'no-store' });
        if (!res.ok) return null;
        const json = await res.json();
        const payload = json?.data ?? json;
        if (payload?.generatedAt) {
          bootstrapCache = payload;
        }
        return payload ?? null;
      } catch {
        return null;
      } finally {
        bootstrapPromise = null;
      }
    })();
  }
  return bootstrapPromise;
}

export function MonitorDashboardProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(bootstrapCache);
  const hydrationMarkedRef = useRef(false);

  useEffect(() => {
    if (snapshot) return;
    let cancelled = false;
    fetchDashboardSnapshot().then((payload) => {
      if (!cancelled) setSnapshot(payload);
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  useEffect(() => {
    if (hydrationMarkedRef.current) return;
    if (!snapshot) return;
    hydrationMarkedRef.current = true;
    markMonitorDataHydrated();
  }, [snapshot]);

  return React.createElement(DashboardContext.Provider, { value: snapshot }, children);
}

export function useDashboardSnapshot() {
  return useContext(DashboardContext);
}
