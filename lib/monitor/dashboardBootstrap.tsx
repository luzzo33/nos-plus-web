'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { getMonitorApiBase } from '@/lib/api/monitorConfig';

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
  dca: unknown;
  summary: unknown;
}

const DashboardContext = createContext<DashboardSnapshot | null>(null);

let bootstrapPromise: Promise<DashboardSnapshot | null> | null = null;
let bootstrapCache: DashboardSnapshot | null = null;

const STORAGE_KEY = 'np:monitor:snapshot:v1';

const hasDcaRows = (value: unknown): boolean => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as { rows?: unknown };
  return Array.isArray(candidate.rows) && candidate.rows.length > 0;
};

if (typeof window !== 'undefined') {
  try {
    const cached = window.sessionStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as DashboardSnapshot;
      if (parsed && typeof parsed === 'object' && parsed.generatedAt) {
        bootstrapCache = parsed;
      }
    }
  } catch {}
}

function persistSnapshot(snapshot: DashboardSnapshot | null) {
  if (typeof window === 'undefined' || !snapshot) return;
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {}
}

export async function fetchDashboardSnapshot(opts?: {
  force?: boolean;
  requireDcaRows?: boolean;
}): Promise<DashboardSnapshot | null> {
  const requireDca = Boolean(opts?.requireDcaRows);
  const force = Boolean(opts?.force);
  const cacheHasDca = hasDcaRows(bootstrapCache?.dca);
  if (bootstrapCache && !force && (!requireDca || cacheHasDca)) {
    return bootstrapCache;
  }
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
          persistSnapshot(payload);
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

  useEffect(() => {
    const needsRefresh = !snapshot || !hasDcaRows(snapshot.dca);
    if (!needsRefresh) return;
    let cancelled = false;
    fetchDashboardSnapshot({ requireDcaRows: true }).then((payload) => {
      if (!cancelled && payload) {
        setSnapshot(payload);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [snapshot]);

  useEffect(() => {
    if (snapshot) {
      persistSnapshot(snapshot);
    }
  }, [snapshot]);

  return <DashboardContext.Provider value={snapshot}>{children}</DashboardContext.Provider>;
}

export function useDashboardSnapshot() {
  return useContext(DashboardContext);
}
