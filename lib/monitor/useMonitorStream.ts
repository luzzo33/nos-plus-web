'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { monitorWsClient, type SubscriptionListener } from '@/lib/monitor/ws-client';
import type { MonitorEventRow } from '@/lib/api/monitor-client';
import type { LiveMonitorEvent, LiveStreamOptions, LinkedOrderSummary } from './liveTypes';
import { getMonitorApiKey } from '@/lib/api/monitorConfig';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw == null) return null;
  if (raw instanceof Map) {
    return Object.fromEntries(Array.from(raw.entries()));
  }
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed.length) return null;
    try {
      return JSON.parse(trimmed) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  if (typeof raw === 'object') {
    if (Array.isArray(raw)) return null;
    return raw as Record<string, unknown>;
  }
  return null;
}

function mergeMetadataSources(...sources: unknown[]): Record<string, unknown> | null {
  let merged: Record<string, unknown> | null = null;
  for (const source of sources) {
    const parsed = parseMetadata(source);
    if (!parsed) continue;
    const obj = parsed as Record<string, unknown>;
    if (!merged) {
      merged = { ...obj };
    } else {
      Object.assign(merged, obj);
    }
  }
  return merged;
}

function coerceBoolean(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    return value !== 0;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized.length) return null;
    if (['true', '1', 'yes', 'y', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n', 'off'].includes(normalized)) return false;
  }
  return null;
}

function pickString(
  sources: Array<Record<string, unknown> | null | undefined>,
  keys: string[],
): string | null {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.length) return value;
      if (typeof value === 'number' && Number.isFinite(value)) return String(value);
    }
  }
  return null;
}

function pickBoolean(
  sources: Array<Record<string, unknown> | null | undefined>,
  keys: string[],
): boolean | null {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const result = coerceBoolean(source[key]);
      if (result != null) return result;
    }
  }
  return null;
}

function toStringArray(value: unknown): string[] | null {
  if (Array.isArray(value)) {
    const mapped = value
      .map((entry) => {
        if (typeof entry === 'string') return entry;
        if (typeof entry === 'number' && Number.isFinite(entry)) return String(entry);
        return null;
      })
      .filter((entry): entry is string => Boolean(entry && entry.length));
    return mapped.length ? mapped : null;
  }
  if (typeof value === 'string') {
    const parts = value
      .split(',')
      .map((part) => part.trim())
      .filter((part) => part.length);
    return parts.length ? parts : null;
  }
  return null;
}

function pickStringArray(
  sources: Array<Record<string, unknown> | null | undefined>,
  keys: string[],
): string[] | null {
  for (const source of sources) {
    if (!source) continue;
    for (const key of keys) {
      const result = toStringArray(source[key]);
      if (result && result.length) return result;
    }
  }
  return null;
}

function normalizeTimestamp(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) {
    const time = value.getTime();
    if (Number.isNaN(time)) return null;
    return new Date(time).toISOString();
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const ms = value > 1e12 ? value : value * 1000;
    if (!Number.isFinite(ms)) return null;
    return new Date(ms).toISOString();
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) return null;
    const numeric = Number(trimmed);
    if (Number.isFinite(numeric)) {
      const ms = trimmed.length > 10 ? numeric : numeric * 1000;
      return normalizeTimestamp(ms);
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

function toTimestampMs(value: string | null | undefined): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : null;
}

function resolveEventSortMs(event: LiveMonitorEvent): number {
  const candidate = event.sortTimestamp;
  if (candidate != null) {
    const num = typeof candidate === 'number' ? candidate : Number(candidate);
    if (Number.isFinite(num)) return num;
  }
  const occurredMs = Date.parse(event.occurredAt || '');
  if (Number.isFinite(occurredMs)) return occurredMs;
  const ingestedMs = Date.parse(event.ingestedAt || '');
  if (Number.isFinite(ingestedMs)) return ingestedMs;
  const numericId = Number(event.id);
  if (Number.isFinite(numericId)) return numericId;
  return 0;
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(num)) return null;
  return num;
}

function toLinkedOrders(value: unknown): LinkedOrderSummary[] | null {
  if (!Array.isArray(value)) return null;
  const entries: LinkedOrderSummary[] = [];
  for (const item of value) {
    const parsed =
      parseMetadata(item) ??
      (typeof item === 'object' && item !== null ? (item as Record<string, unknown>) : null);
    if (!parsed) continue;
    const sources: Array<Record<string, unknown> | null | undefined> = [parsed];
    const kind = pickString(sources, ['kind', 'type']) ?? 'unknown';
    const action = pickString(sources, ['action', 'status']);
    const externalId = pickString(sources, ['externalId', 'external_id', 'id']);
    const nestedMetaRaw = (parsed as { metadata?: unknown }).metadata;
    const metadata =
      parseMetadata(nestedMetaRaw) ??
      (typeof nestedMetaRaw === 'object' && nestedMetaRaw !== null
        ? (nestedMetaRaw as Record<string, unknown>)
        : null);
    entries.push({
      kind,
      action: action ?? null,
      externalId: externalId ?? null,
      metadata: metadata ?? null,
    });
  }
  return entries.length ? entries : null;
}

function enrichEvent(row: MonitorEventRow): LiveMonitorEvent {
  const record = row as Record<string, unknown>;
  const metadata = parseMetadata(row.metadata);
  const marketMetadata = parseMetadata(record.market_metadata ?? record.marketMetadata);
  const planMetadata = parseMetadata(record.plan_metadata ?? record.planMetadata);
  const extraMetadata = parseMetadata(record.extra_metadata ?? record.extraMetadata);
  const contextMetadata = parseMetadata(
    record.context ?? record.context_metadata ?? record.contextMetadata,
  );
  const combinedMeta =
    mergeMetadataSources(
      metadata,
      marketMetadata,
      planMetadata,
      extraMetadata,
      contextMetadata,
      record.metadata_json,
      record.metadataJson,
      record.marketMetadata,
      record.planMetadata,
      record.extraMetadata,
    ) ?? null;

  const sources: Array<Record<string, unknown> | null | undefined> = [
    record,
    combinedMeta,
    metadata,
    marketMetadata,
    planMetadata,
    extraMetadata,
  ];

  const eventKind = pickString(sources, ['event_kind', 'eventKind', 'kind']) ?? 'trade';
  const kindLower = eventKind.toLowerCase();
  const sideValue = pickString(sources, ['side']) ?? 'neutral';
  const venue = pickString(sources, ['venue', 'venue_slug', 'venueSlug']) ?? null;
  const planTypeRaw = pickString(sources, ['plan_type', 'planType']);
  const venueLower = venue?.toLowerCase() ?? '';
  const isJupiterVenue =
    venueLower.includes('jupiter') ||
    kindLower.includes('jupiter') ||
    (planTypeRaw === 'dca' && venueLower.includes('aggregator'));

  const signatureTimestampIso =
    normalizeTimestamp(
      pickString(sources, [
        'signatureBlockTime',
        'signature_block_time',
        'signatureTimestamp',
        'signature_timestamp',
        'blockTime',
        'block_time',
      ]),
    ) ?? null;

  const createdAtIso = normalizeTimestamp(pickString(sources, ['created_at', 'createdAt'])) ?? null;
  const ingestedAtIso =
    normalizeTimestamp(pickString(sources, ['ingested_at', 'ingestedAt'])) ?? null;
  const ingestionFallbackIso = createdAtIso ?? ingestedAtIso ?? null;

  const baseOccurredAtIso =
    normalizeTimestamp(row.event_time) ??
    normalizeTimestamp(record.event_time) ??
    normalizeTimestamp(pickString(sources, ['occurredAt', 'occurred_at'])) ??
    signatureTimestampIso ??
    null;

  let occurredAt = baseOccurredAtIso;
  let timestampSource: LiveMonitorEvent['timestampSource'] = occurredAt ? 'stream' : 'unknown';

  if (isJupiterVenue && ingestionFallbackIso) {
    occurredAt = ingestionFallbackIso;
    timestampSource = 'db';
  } else if (!occurredAt && ingestionFallbackIso) {
    occurredAt = ingestionFallbackIso;
    timestampSource = 'db';
  } else if (!occurredAt) {
    occurredAt = new Date().toISOString();
    timestampSource = 'unknown';
  }

  const sortTimestampMs =
    (isJupiterVenue && ingestionFallbackIso ? toTimestampMs(ingestionFallbackIso) : null) ??
    toTimestampMs(occurredAt) ??
    toTimestampMs(ingestionFallbackIso) ??
    Date.now();

  const idRaw =
    (typeof row.id === 'number' || typeof row.id === 'string' ? row.id : null) ??
    (typeof record.id === 'number' || typeof record.id === 'string'
      ? (record.id as number | string)
      : null) ??
    (typeof record.event_id === 'number' || typeof record.event_id === 'string'
      ? (record.event_id as number | string)
      : null) ??
    pickString(sources, ['normalized_event_id', 'eventId']) ??
    occurredAt;

  const txHash = pickString(sources, ['tx_signature', 'txSignature', 'tx_hash', 'txHash']);
  const externalId = pickString(sources, ['externalId', 'external_id']);

  const baseSymbol =
    pickString(sources, ['base_symbol', 'baseSymbol', 'base_asset', 'baseAsset']) ?? undefined;
  const quoteSymbol =
    pickString(sources, ['quote_symbol', 'quoteSymbol', 'quote_asset', 'quoteAsset']) ?? undefined;
  const baseMint = pickString(sources, ['base_mint', 'baseMint']) ?? undefined;
  const quoteMint = pickString(sources, ['quote_mint', 'quoteMint']) ?? undefined;

  const baseAmount = toNumber(row.base_amount ?? record.base_amount ?? record.baseAmount);
  const quoteAmount = toNumber(row.quote_amount ?? record.quote_amount ?? record.quoteAmount);
  const usdValue = toNumber(
    row.usd_value ?? record.usd_value ?? record.usdValue ?? (combinedMeta?.usdValue as unknown),
  );
  const price = toNumber(row.price ?? record.price ?? (combinedMeta?.price as unknown));

  const marketUrl =
    pickString(
      [combinedMeta, marketMetadata, record],
      ['marketUrl', 'market_url', 'marketLink', 'market_link'],
    ) ?? null;
  const tradeUrl =
    pickString(
      [combinedMeta, marketMetadata, record],
      ['tradeUrl', 'trade_url', 'tradeLink', 'trade_link'],
    ) ?? null;

  const planId =
    pickString(sources, ['plan_id', 'planId', 'linked_plan_id', 'linkedPlanId']) ?? null;
  const planType =
    planTypeRaw ??
    (kindLower.includes('limit') ? 'limit' : kindLower.includes('dca') ? 'dca' : null);
  const linkedPlanId = pickString(sources, ['linkedPlanId', 'linked_plan_id']) ?? planId ?? null;

  const linkedLimitOrderFlag =
    pickBoolean(sources, ['linkedLimitOrder', 'linked_limit_order', 'isLimit', 'limit_event']) ??
    undefined;
  const linkedLimitOrderFillFlag =
    pickBoolean(sources, ['linkedLimitOrderFill', 'linked_limit_order_fill']) ??
    (linkedLimitOrderFlag ? true : undefined);
  const linkedLimitOrderPlacementFlag =
    pickBoolean(sources, ['linkedLimitOrderPlacement', 'linked_limit_order_placement']) ??
    undefined;
  const linkedDcaFlag = pickBoolean(sources, ['linkedDca', 'linked_dca', 'isDca']) ?? undefined;

  const linkedLimitOrderIds =
    pickStringArray(sources, ['linkedLimitOrderIds', 'linked_limit_order_ids', 'limitOrderIds']) ??
    undefined;
  const linkedOrderKindsRaw =
    pickStringArray(sources, ['linkedOrderKinds', 'linked_order_kinds', 'orderKinds']) ??
    (planType ? [planType] : null);
  const linkedOrderKinds = linkedOrderKindsRaw
    ? Array.from(new Set(linkedOrderKindsRaw.map((entry) => entry.toLowerCase())))
    : undefined;

  const linkedOrders =
    toLinkedOrders(
      (combinedMeta as { linkedOrders?: unknown })?.linkedOrders ??
        (record as { linked_orders?: unknown }).linked_orders ??
        (record as { linkedOrders?: unknown }).linkedOrders,
    ) ?? undefined;

  const narrative = pickString(sources, ['narrative', 'description', 'summary']);
  const correlationType =
    pickString(sources, ['correlationType', 'correlation_type']) ??
    (planType === 'limit' || planType === 'dca' ? planType : null);

  const placementDetailsRaw = parseMetadata(
    (combinedMeta as { limitOrderPlacementDetails?: unknown })?.limitOrderPlacementDetails ??
      (record as { limit_order_placement_details?: unknown }).limit_order_placement_details,
  );
  const placementBase = placementDetailsRaw
    ? toNumber(placementDetailsRaw.baseAmount ?? placementDetailsRaw.base_amount)
    : null;
  const placementQuote = placementDetailsRaw
    ? toNumber(placementDetailsRaw.quoteAmount ?? placementDetailsRaw.quote_amount)
    : null;
  const placementPrice = placementDetailsRaw
    ? toNumber(
        placementDetailsRaw.price ??
          placementDetailsRaw.limitPrice ??
          placementDetailsRaw.limit_price,
      )
    : null;
  const limitOrderPlacementDetails =
    placementDetailsRaw &&
    (placementBase != null || placementQuote != null || placementPrice != null)
      ? {
          baseAmount: placementBase ?? undefined,
          quoteAmount: placementQuote ?? undefined,
          price: placementPrice ?? undefined,
        }
      : undefined;

  return {
    id: idRaw,
    kind: eventKind as LiveMonitorEvent['kind'],
    side: sideValue as LiveMonitorEvent['side'],
    venue: venue ?? undefined,
    occurredAt,
    baseAmount: baseAmount ?? undefined,
    quoteAmount: quoteAmount ?? null,
    usdValue: usdValue ?? null,
    price: price ?? null,
    baseSymbol,
    quoteSymbol: quoteSymbol ?? null,
    baseMint: baseMint ?? null,
    quoteMint: quoteMint ?? null,
    metadata: combinedMeta ?? null,
    marketUrl: marketUrl ?? null,
    tradeUrl: tradeUrl ?? null,
    txHash: txHash ?? undefined,
    externalId: externalId ?? null,
    planId: planId ?? null,
    planType: planType ?? undefined,
    correlationType:
      correlationType === 'limit' || correlationType === 'dca' ? correlationType : undefined,
    linkedPlanId: linkedPlanId ?? null,
    linkedLimitOrder: linkedLimitOrderFillFlag ?? undefined,
    linkedLimitOrderFill: linkedLimitOrderFillFlag ?? undefined,
    linkedLimitOrderPlacement: linkedLimitOrderPlacementFlag ?? undefined,
    linkedDca: linkedDcaFlag ?? undefined,
    linkedLimitOrderIds,
    linkedOrderKinds,
    linkedOrders,
    limitOrderPlacementDetails: limitOrderPlacementDetails ?? undefined,
    narrative: narrative ?? undefined,
    timestampSource,
    ingestedAt: ingestionFallbackIso,
    sortTimestamp: sortTimestampMs,
  } satisfies LiveMonitorEvent;
}

const MAX_SEEN_EVENT_KEYS = 10_000;

export type MonitorDedupeMode = 'strict' | 'relaxed' | 'off';

const DEDUPE_MODE: MonitorDedupeMode = 'relaxed';

function createEventIdentity(event: LiveMonitorEvent) {
  const venuePart = event.venue != null ? String(event.venue) : 'unknown';
  return {
    venuePart,
    txHash: event.txHash || null,
    externalId: event.externalId || null,
    id: event.id != null ? String(event.id) : null,
  } as const;
}

function createEventDedupeKey(event: LiveMonitorEvent): string {
  if (DEDUPE_MODE === 'off') {
    return `${Math.random()}-${Date.now()}`;
  }
  const ident = createEventIdentity(event);
  if (DEDUPE_MODE === 'strict') {
    if (ident.txHash) return `${ident.venuePart}:tx:${ident.txHash}`;
    if (ident.id) {
      const pricePart = event.price != null ? `p:${event.price}` : 'p:?';
      let timePart = 't:?';
      try {
        const ms = Date.parse(event.occurredAt || '');
        if (Number.isFinite(ms)) timePart = `t:${Math.floor(ms / 1000)}`;
      } catch {}
      const kindPart = event.kind ? `k:${event.kind}` : 'k:?';
      return `${ident.venuePart}:id:${ident.id}:${pricePart}:${timePart}:${kindPart}`;
    }
    if (ident.externalId) return `${ident.venuePart}:ext:${ident.externalId}`;
    return `${ident.venuePart}:t:${event.occurredAt}:${event.price ?? ''}`;
  }
  if (ident.txHash) return `${ident.venuePart}:rtx:${ident.txHash}`;
  if (ident.id) return `${ident.venuePart}:rid:${ident.id}`;
  if (ident.externalId) return `${ident.venuePart}:rext:${ident.externalId}`;
  return `${ident.venuePart}:rtime:${event.occurredAt}`;
}

type SnapshotPayload = {
  events?: MonitorEventRow[];
  total?: number;
};

type UpdatePayload = {
  events?: MonitorEventRow[];
};

const hasEventArray = (value: unknown): value is { events: MonitorEventRow[] } => {
  if (!isRecord(value)) return false;
  const potential = value as { events?: unknown };
  return Array.isArray(potential.events);
};

export function useMonitorStream(opts: LiveStreamOptions = {}) {
  const { kinds, side, venue, venues, minUsd } = opts;
  const idOnlyMode = opts.idOnlyMode === true;
  const [events, setEvents] = useState<LiveMonitorEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof monitorWsClient.subscribe> | null>(null);
  const idSetRef = useRef<Set<string>>(new Set());
  const keyQueueRef = useRef<string[]>([]);
  const nextOffsetRef = useRef<number>(0);
  const lastTimestampRef = useRef<number | null>(null);
  const eventMapRef = useRef<Map<string, LiveMonitorEvent>>(new Map());
  const skewSamplesRef = useRef<number[]>([]);
  const medianSkewRef = useRef<number>(0);

  const kindKey = useMemo(() => {
    if (!Array.isArray(kinds) || !kinds.length) return '';
    const normalized = kinds
      .map((entry) => (typeof entry === 'string' ? entry.toLowerCase().trim() : ''))
      .filter((entry) => entry.length > 0);
    if (!normalized.length) return '';
    const unique = Array.from(new Set(normalized));
    unique.sort();
    return unique.join('|');
  }, [kinds]);

  const venueKey = useMemo(() => {
    const candidates: string[] = [];
    if (Array.isArray(venues)) {
      for (const entry of venues) {
        if (typeof entry === 'string' && entry.trim().length) {
          candidates.push(entry.toLowerCase().trim());
        }
      }
    }
    if (typeof venue === 'string' && venue.trim().length) {
      candidates.push(venue.toLowerCase().trim());
    }
    if (!candidates.length) return '';
    const unique = Array.from(new Set(candidates));
    unique.sort();
    return unique.join('|');
  }, [venue, venues]);

  const normalizedSide = side ?? null;
  const minUsdFilter =
    typeof minUsd === 'number' && Number.isFinite(minUsd) && minUsd > 0 ? minUsd : null;

  const subscriptionParams = useMemo(() => {
    const payload: Record<string, unknown> = {};
    if (opts.bootstrapLimit && Number.isFinite(opts.bootstrapLimit)) {
      payload.limit = Math.max(1, Math.min(Number(opts.bootstrapLimit), 500));
    }
    if (kindKey) payload.kinds = kindKey.split('|');
    if (venueKey) payload.venues = venueKey.split('|');
    if (normalizedSide) payload.side = normalizedSide;
    if (minUsdFilter != null) payload.minUsd = minUsdFilter;
    return payload;
  }, [opts.bootstrapLimit, kindKey, venueKey, normalizedSide, minUsdFilter]);

  const pushEvents = useCallback(
    (rows: MonitorEventRow[], replace = false) => {
      const seenKeys = idSetRef.current;
      const keyQueue = keyQueueRef.current;
      if (!rows?.length) {
        if (replace) {
          setEvents([]);
        }
        return;
      }
      const rawEvents = rows.map(enrichEvent);
      const mapped = rawEvents;
      let added: LiveMonitorEvent[] = [];

      if (idOnlyMode) {
        setEvents((prev) => {
          const existingIds = new Set(prev.map((e) => String(e.id)));
          const fresh: LiveMonitorEvent[] = [];
          for (const ev of mapped) {
            const idStr = String(ev.id);
            if (existingIds.has(idStr)) continue;
            fresh.push(ev);
            const sortMs = resolveEventSortMs(ev);
            const now = Date.now();
            if (Number.isFinite(sortMs)) {
              const skew = now - sortMs;
              if (Math.abs(skew) < 60 * 60 * 1000) {
                const arr = skewSamplesRef.current;
                arr.push(skew);
                if (arr.length > 50) arr.shift();
                const sorted = [...arr].sort((a, b) => a - b);
                medianSkewRef.current = sorted[Math.floor(sorted.length / 2)];
              }
            }
          }
          if (!fresh.length) return prev;
          const merged = [...prev, ...fresh];
          merged.sort((a, b) => {
            const diff = resolveEventSortMs(b) - resolveEventSortMs(a);
            if (diff !== 0) return diff;
            const na = Number(a.id);
            const nb = Number(b.id);
            const aNum = Number.isFinite(na);
            const bNum = Number.isFinite(nb);
            if (aNum && bNum) return nb - na;
            if (aNum && !bNum) return -1;
            if (!aNum && bNum) return 1;
            return 0;
          });
          return merged;
        });
        return;
      }

      setEvents((prev) => {
        const base = replace ? [] : prev.slice();
        const batchAdded: LiveMonitorEvent[] = [];
        for (const event of mapped) {
          const key = createEventDedupeKey(event);
          const alreadySeen = seenKeys.has(key);
          const existing = eventMapRef.current.get(key);
          const materiallyIdentical = (a: LiveMonitorEvent, b: LiveMonitorEvent) => {
            if (DEDUPE_MODE === 'strict') {
              return (
                a.price === b.price &&
                a.usdValue === b.usdValue &&
                a.side === b.side &&
                a.kind === b.kind &&
                a.baseAmount === b.baseAmount &&
                a.quoteAmount === b.quoteAmount &&
                a.occurredAt === b.occurredAt
              );
            }
            if (DEDUPE_MODE === 'relaxed') {
              const aSec = Math.floor(Date.parse(a.occurredAt || '0') / 1000);
              const bSec = Math.floor(Date.parse(b.occurredAt || '0') / 1000);
              return (
                a.side === b.side &&
                a.baseAmount === b.baseAmount &&
                a.quoteAmount === b.quoteAmount &&
                aSec === bSec
              );
            }
            return false;
          };
          if (DEDUPE_MODE !== 'off' && alreadySeen && !replace) {
            if (existing) {
              const identical = materiallyIdentical(existing, event);
              if (!identical) {
                const idx = base.findIndex((e) => createEventDedupeKey(e) === key);
                if (idx !== -1) {
                  const updated = { ...existing, ...event } as LiveMonitorEvent;
                  base[idx] = updated;
                  eventMapRef.current.set(key, updated);
                  batchAdded.push(updated);
                }
              }
            }
            continue;
          }
          if (!alreadySeen) {
            seenKeys.add(key);
            keyQueue.push(key);
          }
          base.push(event);
          batchAdded.push(event);
          eventMapRef.current.set(key, event);
          const occurredMs = resolveEventSortMs(event);
          const now = Date.now();
          if (Number.isFinite(occurredMs)) {
            const skew = now - occurredMs;
            if (Math.abs(skew) < 60 * 60 * 1000) {
              const arr = skewSamplesRef.current;
              arr.push(skew);
              if (arr.length > 50) arr.shift();
              const sorted = [...arr].sort((a, b) => a - b);
              medianSkewRef.current = sorted[Math.floor(sorted.length / 2)];
            }
          }
        }
        while (keyQueue.length > MAX_SEEN_EVENT_KEYS) {
          const staleKey = keyQueue.shift();
          if (staleKey) {
            seenKeys.delete(staleKey);
            eventMapRef.current.delete(staleKey);
          }
        }
        base.sort((a, b) => {
          const diff = resolveEventSortMs(b) - resolveEventSortMs(a);
          if (diff !== 0) return diff;
          const na = Number(a.id);
          const nb = Number(b.id);
          if (Number.isFinite(na) && Number.isFinite(nb)) return nb - na;
          return String(b.id).localeCompare(String(a.id));
        });
        const limited = base.slice(0, 500);
        added = batchAdded;
        return limited;
      });
      if (added.length && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('np:monitor-event', { detail: added }));
      }
    },
    [idOnlyMode],
  );

  useEffect(() => {
    if (!getMonitorApiKey()) {
      setError('monitor_api_key_missing');
      setConnected(false);
      setEvents([]);
      return;
    }
    let cancelled = false;
    setEvents([]);
    setTotal(null);
    idSetRef.current.clear();
    keyQueueRef.current.length = 0;
    lastTimestampRef.current = null;
    setConnected(false);
    setError(null);

    const listener: SubscriptionListener<SnapshotPayload, UpdatePayload> = {
      onSnapshot: (payload) => {
        if (cancelled) return;
        const rows = Array.isArray(payload?.events) ? payload.events : [];
        pushEvents(rows, true);
        setTotal(typeof payload?.total === 'number' ? payload.total : null);
        nextOffsetRef.current = rows.length;
        setConnected(true);
      },
      onEvent: (payload) => {
        if (cancelled) return;
        pushEvents([payload as MonitorEventRow]);
      },
      onUpdate: (payload) => {
        if (cancelled) return;
        if (hasEventArray(payload)) {
          pushEvents(payload.events, false);
        }
      },
      onError: (err: { code: string; message: string }) => {
        if (cancelled) return;
        setError(err.message || err.code || 'stream_error');
        setConnected(false);
      },
    } satisfies SubscriptionListener<SnapshotPayload, UpdatePayload>;

    const subscription = monitorWsClient.subscribe('monitor.events', subscriptionParams, listener);
    subscriptionRef.current = subscription;
    subscription.ready
      .then(() => {
        if (!cancelled) {
          setConnected(true);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err?.message || 'stream_error');
      });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [subscriptionParams, pushEvents]);

  const loadMore = useCallback(async () => {
    const subscription = subscriptionRef.current;
    if (!subscription) return;
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const offset = nextOffsetRef.current;
      const res = await subscription.request<{ rows?: MonitorEventRow[]; total?: number }>(
        'fetchMore',
        { offset, limit: 100 },
      );
      if (Array.isArray(res?.rows) && res.rows.length) {
        pushEvents(res.rows);
        nextOffsetRef.current = offset + res.rows.length;
        if (typeof res.total === 'number') setTotal(res.total);
      }
    } catch (err) {
      setError((err as Error)?.message ?? 'fetch_more_failed');
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pushEvents]);

  return {
    events,
    connected,
    error,
    loadMore,
    loadingMore,
    total,
    correctedNowMs: Date.now() - medianSkewRef.current,
  };
}
