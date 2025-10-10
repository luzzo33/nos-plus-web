'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { monitorWsClient, type SubscriptionListener } from '@/lib/monitor/ws-client';
import { getMonitorApiKey } from '@/lib/api/monitorConfig';

export type StatsRange = '5m' | '1h' | '6h' | '24h';
export type AggregateMode = 'total' | 'avg';
export type StatsView = 'default' | 'comparison';

export interface StatsSnapshot {
  venue?: string | null;
  slug?: string | null;
  label?: string | null;
  shortLabel?: string | null;
  priceNow?: number | null;
  change?: number | null;
  change5m?: number | null;
  change1h?: number | null;
  change6h?: number | null;
  change24h?: number | null;
  changes?: Partial<Record<StatsRange, number | null>> | null;
  anchors?: Partial<Record<StatsRange, number | null>> | null;
  volume?: number | null;
  tx?: number | null;
  buyers?: number | null;
  sellers?: number | null;
  marketShare?: number | null;
  spread?: {
    vsMinPct?: number | null;
    vsMaxPct?: number | null;
    vsAvgPct?: number | null;
  } | null;
  ranks?: {
    price?: number | null;
    change?: number | null;
    volume?: number | null;
  } | null;
  updatedAt?: string | null;
}

export interface StatsComparisonPayload {
  range: StatsRange;
  aggregate: AggregateMode;
  entries: StatsSnapshot[];
  totals: {
    volume: number;
    tx: number;
    buyers: number;
    sellers: number;
  };
  spreadSummary?: {
    minPrice: number | null;
    minSlug: string | null;
    minLabel: string | null;
    maxPrice: number | null;
    maxSlug: string | null;
    maxLabel: string | null;
    delta: number | null;
    percent: number | null;
    averagePrice: number | null;
    count: number | null;
  } | null;
  updatedAt: string | null;
}

export interface StatsResponse {
  rows: StatsSnapshot[];
  updatedAt?: string | null;
  view?: StatsView;
  comparison?: StatsComparisonPayload | null;
}

function coerceNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function pickNumber(
  source: Record<string, unknown> | null | undefined,
  keys: string[],
): number | null {
  if (!source) return null;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const value = coerceNumber(source[key]);
    if (value != null) return value;
  }
  return null;
}

function pickString(
  source: Record<string, unknown> | null | undefined,
  keys: string[],
): string | null {
  if (!source) return null;
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    const value = source[key];
    if (typeof value === 'string' && value.length) return value;
  }
  return null;
}

function computePercentChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(previous)) return null;
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

type LegacyAggregateRow = {
  priceNow: number | null;
  change_pct: number | null;
  volume: number | null;
  tx: number | null;
  buyers: number | null;
  sellers: number | null;
  updated_at: string | null;
};

const buildLegacyAggregateRow = (source: Record<string, unknown>): LegacyAggregateRow => ({
  priceNow: pickNumber(source, ['priceNow', 'price_now']),
  change_pct: pickNumber(source, ['changePct', 'change_pct']),
  volume: pickNumber(source, ['volume']),
  tx: pickNumber(source, ['tx', 'transactions']),
  buyers: pickNumber(source, ['buyers', 'buyCount']),
  sellers: pickNumber(source, ['sellers', 'sellCount']),
  updated_at: pickString(source, ['updatedAt', 'updated_at']) ?? null,
});

function isStatsRange(value: string | null | undefined): value is StatsRange {
  if (!value) return false;
  return value === '5m' || value === '1h' || value === '6h' || value === '24h';
}

function normalizeComparisonPayload(
  raw: unknown,
  entries: StatsSnapshot[],
  fallbackRange: StatsRange,
  fallbackAggregate: AggregateMode,
  fallbackUpdatedAt: string | null,
  fallbackTotals?: unknown,
  fallbackSpread?: unknown,
): StatsComparisonPayload {
  const base = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rangeRaw = typeof base.range === 'string' ? base.range.toLowerCase() : null;
  const aggregateRaw = typeof base.aggregate === 'string' ? base.aggregate.toLowerCase() : null;
  const totalsSource =
    base.totals && typeof base.totals === 'object'
      ? (base.totals as Record<string, unknown>)
      : fallbackTotals && typeof fallbackTotals === 'object'
        ? (fallbackTotals as Record<string, unknown>)
        : {};
  const spreadSource =
    base.spreadSummary && typeof base.spreadSummary === 'object'
      ? (base.spreadSummary as Record<string, unknown>)
      : fallbackSpread && typeof fallbackSpread === 'object'
        ? (fallbackSpread as Record<string, unknown>)
        : null;

  const range = isStatsRange(rangeRaw) ? (rangeRaw as StatsRange) : fallbackRange;
  const aggregate: AggregateMode = aggregateRaw === 'avg' ? 'avg' : fallbackAggregate;

  const totals = {
    volume: coerceNumber(totalsSource.volume) ?? 0,
    tx: coerceNumber(totalsSource.tx) ?? 0,
    buyers: coerceNumber(totalsSource.buyers) ?? 0,
    sellers: coerceNumber(totalsSource.sellers) ?? 0,
  };

  const spreadSummary = spreadSource
    ? {
        minPrice: coerceNumber(spreadSource.minPrice ?? spreadSource.min_price) ?? null,
        minSlug: pickString(spreadSource, ['minSlug', 'min_slug']) ?? null,
        minLabel: pickString(spreadSource, ['minLabel', 'min_label']) ?? null,
        maxPrice: coerceNumber(spreadSource.maxPrice ?? spreadSource.max_price) ?? null,
        maxSlug: pickString(spreadSource, ['maxSlug', 'max_slug']) ?? null,
        maxLabel: pickString(spreadSource, ['maxLabel', 'max_label']) ?? null,
        delta: coerceNumber(spreadSource.delta) ?? null,
        percent: coerceNumber(spreadSource.percent) ?? null,
        averagePrice: coerceNumber(spreadSource.averagePrice ?? spreadSource.average_price) ?? null,
        count: coerceNumber(spreadSource.count) ?? null,
      }
    : null;

  const updatedAt = typeof base.updatedAt === 'string' ? base.updatedAt : fallbackUpdatedAt;

  return {
    range,
    aggregate,
    entries,
    totals,
    spreadSummary,
    updatedAt: updatedAt ?? null,
  };
}

function normalizeRows(input: unknown): StatsSnapshot[] {
  if (!Array.isArray(input)) return [];
  return (input as unknown[]).map((raw): StatsSnapshot => {
    const record =
      raw && typeof raw === 'object'
        ? (raw as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const changePct = record['change_pct'] ?? record['changePct'];
    const changeRecord =
      changePct && typeof changePct === 'object' ? (changePct as Record<string, unknown>) : null;
    const altChanges =
      record['changes'] && typeof record['changes'] === 'object'
        ? (record['changes'] as Record<string, unknown>)
        : null;
    const anchorsRecord =
      record['anchors'] && typeof record['anchors'] === 'object'
        ? (record['anchors'] as Record<string, unknown>)
        : null;
    const priceNow = pickNumber(record, ['priceNow', 'price_now', 'price']);
    const price5m = pickNumber(record, ['price5m', 'price_5m']);
    const price1h = pickNumber(record, ['price1h', 'price_1h']);
    const price6h = pickNumber(record, ['price6h', 'price_6h']);
    const price24h = pickNumber(record, ['price24h', 'price_24h']);
    const change5m =
      pickNumber(changeRecord, ['5m']) ??
      pickNumber(altChanges, ['5m']) ??
      computePercentChange(priceNow, price5m);
    const change1h =
      pickNumber(changeRecord, ['1h']) ??
      pickNumber(altChanges, ['1h']) ??
      computePercentChange(priceNow, price1h);
    const change6h =
      pickNumber(changeRecord, ['6h']) ??
      pickNumber(altChanges, ['6h']) ??
      computePercentChange(priceNow, price6h);
    const change24h =
      pickNumber(changeRecord, ['24h']) ??
      pickNumber(altChanges, ['24h']) ??
      computePercentChange(priceNow, price24h);

    const changes: Partial<Record<StatsRange, number | null>> = {
      '5m': change5m ?? null,
      '1h': change1h ?? null,
      '6h': change6h ?? null,
      '24h': change24h ?? null,
    };

    const anchors: Partial<Record<StatsRange, number | null>> = {
      '5m': pickNumber(anchorsRecord, ['5m']) ?? pickNumber(record, ['price_5m', 'price5m']),
      '1h': pickNumber(anchorsRecord, ['1h']) ?? pickNumber(record, ['price_1h', 'price1h']),
      '6h': pickNumber(anchorsRecord, ['6h']) ?? pickNumber(record, ['price_6h', 'price6h']),
      '24h': pickNumber(anchorsRecord, ['24h']) ?? pickNumber(record, ['price_24h', 'price24h']),
    };

    const spreadRaw =
      record['spread'] && typeof record['spread'] === 'object'
        ? (record['spread'] as Record<string, unknown>)
        : null;
    const ranksRaw =
      record['ranks'] && typeof record['ranks'] === 'object'
        ? (record['ranks'] as Record<string, unknown>)
        : null;

    const marketShare = pickNumber(record, ['marketShare', 'market_share']);
    const changeCurrent = pickNumber(record, ['change', 'changeCurrent', 'change_current']);

    const spread = spreadRaw
      ? {
          vsMinPct: pickNumber(spreadRaw, ['vsMinPct', 'vs_min_pct']),
          vsMaxPct: pickNumber(spreadRaw, ['vsMaxPct', 'vs_max_pct']),
          vsAvgPct: pickNumber(spreadRaw, ['vsAvgPct', 'vs_avg_pct']),
        }
      : null;

    const ranks = ranksRaw
      ? {
          price: pickNumber(ranksRaw, ['price']) ?? null,
          change: pickNumber(ranksRaw, ['change']) ?? null,
          volume: pickNumber(ranksRaw, ['volume']) ?? null,
        }
      : null;

    return {
      venue: pickString(record, ['venue', 'venue_slug', 'slug']) ?? null,
      slug: pickString(record, ['slug', 'venue', 'venue_slug']) ?? null,
      label: pickString(record, ['label', 'name', 'displayName', 'display_name']) ?? null,
      shortLabel: pickString(record, ['shortLabel', 'short_label']) ?? null,
      priceNow,
      change: changeCurrent ?? null,
      change5m: change5m ?? pickNumber(record, ['change5m']),
      change1h: change1h ?? pickNumber(record, ['change1h']),
      change6h: change6h ?? pickNumber(record, ['change6h']),
      change24h: change24h ?? pickNumber(record, ['change24h']),
      changes,
      anchors,
      volume: pickNumber(record, ['volume_window', 'volume']),
      tx: pickNumber(record, ['tx_window', 'tx']),
      buyers: pickNumber(record, ['buyers']),
      sellers: pickNumber(record, ['sellers']),
      marketShare,
      spread,
      ranks,
      updatedAt: pickString(record, ['updated_at', 'updatedAt']) ?? null,
    } satisfies StatsSnapshot;
  });
}

export interface UseStatsStreamOptions {
  range?: StatsRange;
  aggregate?: AggregateMode;
  venue?: string;
  venues?: string;
  groupBy?: 'venue' | null;
  view?: StatsView;
  initial?: StatsResponse | null;
}

export function useStatsStream(opts: UseStatsStreamOptions = {}) {
  const {
    range = '24h',
    aggregate = 'total',
    venue,
    venues,
    groupBy,
    view: requestedView,
    initial,
  } = opts;
  const defaultView: StatsView = initial?.view ?? requestedView ?? 'default';

  const [rows, setRows] = useState<StatsSnapshot[]>(() => initial?.rows ?? []);
  const [updatedAt, setUpdatedAt] = useState<string | null>(() => initial?.updatedAt ?? null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(!initial || !initial.rows?.length);
  const [refreshToken, setRefreshToken] = useState(0);
  const [view, setView] = useState<StatsView>(defaultView);
  const [comparison, setComparison] = useState<StatsComparisonPayload | null>(
    () => initial?.comparison ?? null,
  );
  const lastNonEmptyRowsRef = useRef<StatsSnapshot[]>(initial?.rows?.length ? initial.rows : []);
  const prevInitialRef = useRef(initial);
  const params = useMemo(() => {
    const payload: Record<string, unknown> = { range, aggregate };
    if (venues) payload.venues = venues;
    else if (venue) payload.venue = venue;
    if (groupBy) payload.groupBy = groupBy;
    if (requestedView) payload.view = requestedView;
    return payload;
  }, [range, aggregate, venue, venues, groupBy, requestedView]);

  useEffect(() => {
    if (!getMonitorApiKey()) {
      setError('monitor_api_key_missing');
      setRows([]);
      setConnected(false);
      setLoading(false);
      setView(defaultView);
      setComparison(null);
      return;
    }
    const hasCachedRows = lastNonEmptyRowsRef.current.length > 0;
    const expectedView = (requestedView ?? defaultView) ?? 'default';
    const expectComparison = expectedView === 'comparison';
    setLoading(hasCachedRows ? false : !initial?.rows?.length);
    setConnected(false);
    setError(null);
    setView(requestedView ?? defaultView);
    if ((requestedView ?? defaultView) !== 'comparison') {
      setComparison(null);
    } else if (initial?.comparison) {
      setComparison(initial.comparison);
    }

    function extractRowsDeep(root: unknown): unknown[] | null {
      if (!root || typeof root !== 'object') return null;
      const visited = new Set<unknown>();
      const queue: unknown[] = [root];
      while (queue.length) {
        const current = queue.shift();
        if (!current || typeof current !== 'object') continue;
        if (visited.has(current)) continue;
        visited.add(current);
        if (Array.isArray(current)) {
          const score = current.reduce((acc, item) => {
            if (item && typeof item === 'object') {
              const keys = Object.keys(item as Record<string, unknown>);
              if (keys.some((k) => /(price|change|volume|tx|buyers|sellers|venue)/i.test(k)))
                acc += 1;
            }
            return acc;
          }, 0);
          if (score >= Math.min(1, current.length)) {
            return current;
          }
        } else {
          for (const value of Object.values(current as Record<string, unknown>)) {
            if (value && typeof value === 'object') queue.push(value);
          }
        }
      }
      return null;
    }

    const listener: SubscriptionListener = {
      onSnapshot: (payload: unknown) => {
        const objectPayload = (payload as Record<string, unknown>) ?? {};
        let rowsPayload =
          objectPayload.rows ?? (objectPayload.data as Record<string, unknown> | undefined)?.rows;
        if (
          !rowsPayload &&
          !expectComparison &&
          objectPayload &&
          typeof objectPayload === 'object'
        ) {
          const hasAggregateShape = [
            'priceNow',
            'changePct',
            'volume',
            'tx',
            'buyers',
            'sellers',
          ].some((k) => k in objectPayload);
          if (hasAggregateShape) {
            rowsPayload = [buildLegacyAggregateRow(objectPayload)];
          }
        }
        if (!rowsPayload) {
          const deep = extractRowsDeep(objectPayload);
          if (deep) rowsPayload = deep;
        }
        const normalizedRows = normalizeRows(rowsPayload);
        const resolvedRows =
          expectComparison && normalizedRows.length > 0
            ? normalizedRows.every((row) => !row.venue && !row.slug)
              ? []
              : normalizedRows
            : normalizedRows;
        if (resolvedRows.length > 0) {
          lastNonEmptyRowsRef.current = resolvedRows;
          setRows(resolvedRows);
        }

        const dataPayload =
          objectPayload.data && typeof objectPayload.data === 'object'
            ? (objectPayload.data as Record<string, unknown>)
            : null;

        const updatedRaw = objectPayload.updatedAt ?? dataPayload?.updatedAt ?? null;
        const updated = typeof updatedRaw === 'string' ? updatedRaw : null;
        setUpdatedAt(updated);

        const viewRawValue =
          typeof objectPayload.view === 'string'
            ? objectPayload.view
            : typeof dataPayload?.view === 'string'
              ? (dataPayload.view as string)
              : null;
        const resolvedViewValue = (viewRawValue ?? expectedView ?? 'default').toLowerCase();
        const nextView: StatsView =
          resolvedViewValue === 'comparison' ? 'comparison' : 'default';
        setView(nextView);

        const rangeRawValue =
          typeof objectPayload.range === 'string'
            ? objectPayload.range.toLowerCase()
            : typeof dataPayload?.range === 'string'
              ? (dataPayload.range as string).toLowerCase()
              : null;
        const aggregateRawValue =
          typeof objectPayload.aggregate === 'string'
            ? objectPayload.aggregate.toLowerCase()
            : typeof dataPayload?.aggregate === 'string'
              ? (dataPayload.aggregate as string).toLowerCase()
              : null;

        const normalizedRange = isStatsRange(rangeRawValue) ? (rangeRawValue as StatsRange) : range;
        const normalizedAggregate: AggregateMode = aggregateRawValue === 'avg' ? 'avg' : aggregate;

        if (nextView === 'comparison') {
          const comparisonRaw = objectPayload.comparison ?? dataPayload?.comparison ?? null;
          const totalsRaw = objectPayload.totals ?? dataPayload?.totals;
          const spreadRaw = objectPayload.spreadSummary ?? dataPayload?.spreadSummary;
          const comparisonPayload = normalizeComparisonPayload(
            comparisonRaw,
            resolvedRows.length ? resolvedRows : lastNonEmptyRowsRef.current,
            normalizedRange,
            normalizedAggregate,
            updated,
            totalsRaw,
            spreadRaw,
          );
          setComparison(comparisonPayload);
        } else if (!expectComparison) {
          setComparison(null);
        }
        setConnected(true);
        setLoading(false);
      },
      onUpdate: (payload: unknown) => {
        const objectPayload = (payload as Record<string, unknown>) ?? {};
        let rowsPayload =
          objectPayload.rows ?? (objectPayload.data as Record<string, unknown> | undefined)?.rows;
        if (
          !rowsPayload &&
          !expectComparison &&
          objectPayload &&
          typeof objectPayload === 'object'
        ) {
          const hasAggregateShape = [
            'priceNow',
            'changePct',
            'volume',
            'tx',
            'buyers',
            'sellers',
          ].some((k) => k in objectPayload);
          if (hasAggregateShape) {
            rowsPayload = [buildLegacyAggregateRow(objectPayload)];
          }
        }
        if (!rowsPayload) {
          const deep = extractRowsDeep(objectPayload);
          if (deep) rowsPayload = deep;
        }
        const normalizedRows = normalizeRows(rowsPayload);
        const resolvedRows =
          expectComparison && normalizedRows.length > 0
            ? normalizedRows.every((row) => !row.venue && !row.slug)
              ? []
              : normalizedRows
            : normalizedRows;
        if (resolvedRows.length > 0) {
          lastNonEmptyRowsRef.current = resolvedRows;
          setRows(resolvedRows);
        }

        const dataPayload =
          objectPayload.data && typeof objectPayload.data === 'object'
            ? (objectPayload.data as Record<string, unknown>)
            : null;

        const updatedRaw = objectPayload.updatedAt ?? dataPayload?.updatedAt ?? null;
        const updated = typeof updatedRaw === 'string' ? updatedRaw : null;
        setUpdatedAt(updated);

        const viewRawValue =
          typeof objectPayload.view === 'string'
            ? objectPayload.view
            : typeof dataPayload?.view === 'string'
              ? (dataPayload.view as string)
              : null;
        const resolvedViewValue = (viewRawValue ?? expectedView ?? 'default').toLowerCase();
        const nextView: StatsView =
          resolvedViewValue === 'comparison' ? 'comparison' : 'default';
        setView(nextView);

        const rangeRawValue =
          typeof objectPayload.range === 'string'
            ? objectPayload.range.toLowerCase()
            : typeof dataPayload?.range === 'string'
              ? (dataPayload.range as string).toLowerCase()
              : null;
        const aggregateRawValue =
          typeof objectPayload.aggregate === 'string'
            ? objectPayload.aggregate.toLowerCase()
            : typeof dataPayload?.aggregate === 'string'
              ? (dataPayload.aggregate as string).toLowerCase()
              : null;

        const normalizedRange = isStatsRange(rangeRawValue) ? (rangeRawValue as StatsRange) : range;
        const normalizedAggregate: AggregateMode = aggregateRawValue === 'avg' ? 'avg' : aggregate;

        if (nextView === 'comparison') {
          const comparisonRaw = objectPayload.comparison ?? dataPayload?.comparison ?? null;
          const totalsRaw = objectPayload.totals ?? dataPayload?.totals;
          const spreadRaw = objectPayload.spreadSummary ?? dataPayload?.spreadSummary;
          const comparisonPayload = normalizeComparisonPayload(
            comparisonRaw,
            resolvedRows.length ? resolvedRows : lastNonEmptyRowsRef.current,
            normalizedRange,
            normalizedAggregate,
            updated,
            totalsRaw,
            spreadRaw,
          );
          setComparison(comparisonPayload);
        } else if (!expectComparison) {
          setComparison(null);
        }
        setConnected(true);
        setLoading(false);
      },
      onError: (err) => {
        setError(err.message || err.code || 'stats_stream_error');
        setConnected(false);
        setLoading(false);
      },
    };

    const subscription = monitorWsClient.subscribe('monitor.stats', params, listener);
    subscription.ready.catch((err) => {
      setError(err?.message || 'stats_stream_error');
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [params, refreshToken, initial, defaultView, requestedView, range, aggregate]);

  useEffect(() => {
    if (initial === prevInitialRef.current) return;
    prevInitialRef.current = initial;
    const nextRows = Array.isArray(initial?.rows) ? (initial.rows as StatsSnapshot[]) : [];
    setRows(nextRows);
    if (nextRows.length) {
      lastNonEmptyRowsRef.current = nextRows;
    } else {
      lastNonEmptyRowsRef.current = [];
    }
    setUpdatedAt(initial?.updatedAt ?? null);
    const derivedView = (typeof initial?.view === 'string'
      ? (initial.view as StatsView)
      : requestedView ?? defaultView) ?? 'default';
    setView(derivedView);
    setComparison(initial?.comparison ?? null);
    setLoading(!nextRows.length);
  }, [initial, requestedView, defaultView]);

  return {
    rows,
    updatedAt,
    connected,
    error,
    loading,
    view,
    comparison,
    refresh: () => setRefreshToken((value) => value + 1),
  };
}
