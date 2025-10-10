import type { AccountsWidgetData, BalancesStatsResponse } from '@/lib/api/balances-client';
import type { ContractRecordEntry, ContractWidgetData } from '@/lib/api/types';

type Stats = BalancesStatsResponse['stats'];
type MetricKey = 'total' | 'stakers' | 'unstakers';

type AnyRecord = Record<string, unknown>;

const METRIC_ALIASES: Record<MetricKey, string[]> = {
  total: ['total', 'totalAmount', 'totalAccounts', 'xnos'],
  stakers: ['stakers', 'staking', 'staked'],
  unstakers: ['unstakers', 'unstaking'],
};

const DISPLAY_SUFFIXES = ['Display', 'display'];

export function normalizeContractStats(stats?: Stats): Stats | undefined {
  if (!stats || typeof stats !== 'object') {
    return stats;
  }

  const clone = cloneDeep(stats);

  if (clone.current && typeof clone.current === 'object') {
    clone.current = aliasMetricRecord(clone.current as AnyRecord);
  }

  clone.historical = aliasMetricContainer(clone.historical);
  clone.metrics = normalizeMetrics(clone.metrics);
  clone.growth = aliasMetricContainer(clone.growth);
  clone.distribution = aliasMetricContainer(clone.distribution);
  clone.patterns = normalizePatterns(clone.patterns);
  clone.events = normalizeEvents(clone.events);

  return clone;
}

export function normalizeContractWidget(
  widget?: ContractWidgetData | null,
): AccountsWidgetData | null {
  if (!widget) {
    return null;
  }

  return {
    ath: {
      accounts: normalizeWidgetRecords(widget.ath),
    },
    atl: {
      accounts: normalizeWidgetRecords(widget.atl),
    },
    ranges: normalizeWidgetRanges(widget.ranges ?? {}),
  } as unknown as AccountsWidgetData;
}

function normalizeWidgetRecords(records?: ContractWidgetData['ath'] | null) {
  if (!records || typeof records !== 'object') {
    return {
      total: null,
      staking: null,
      unstaking: null,
      stakers: null,
      unstakers: null,
    } as Record<string, ContractRecordEntry | null>;
  }

  const normalized = {
    total: cloneRecord(records.total),
    staking: cloneRecord((records as AnyRecord).staking ?? (records as AnyRecord).stakers ?? null),
    unstaking: cloneRecord(
      (records as AnyRecord).unstaking ?? (records as AnyRecord).unstakers ?? null,
    ),
  } as Record<string, ContractRecordEntry | null>;

  normalized.stakers = normalized.staking;
  normalized.unstakers = normalized.unstaking;

  return normalized;
}

function normalizeWidgetRanges(ranges: ContractWidgetData['ranges']): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [range, value] of Object.entries(ranges ?? {})) {
    if (!value || typeof value !== 'object') {
      continue;
    }
    result[range] = {
      total: cloneRecord(value.total),
      stakers: cloneRecord((value as AnyRecord).stakers ?? value.staking),
      unstakers: cloneRecord((value as AnyRecord).unstakers ?? value.unstaking),
    };
  }
  return result;
}

function cloneDeep<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch (error) {
      // Fallback to JSON if structuredClone fails (e.g. due to unsupported types)
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function aliasMetricContainer(container: unknown): unknown {
  if (!container || typeof container !== 'object') {
    return container;
  }

  if (Array.isArray(container)) {
    return container.map((item) => aliasMetricContainer(item)) as unknown[];
  }

  const record = { ...(container as AnyRecord) } as AnyRecord;

  if (record.stakers === undefined && record.staking !== undefined) {
    record.stakers = record.staking;
  }
  if (record.stakers === undefined && record.staked !== undefined) {
    record.stakers = record.staked;
  }
  if (record.unstakers === undefined && record.unstaking !== undefined) {
    record.unstakers = record.unstaking;
  }
  if (record.total === undefined && record.totalAmount !== undefined) {
    record.total = record.totalAmount;
  }
  if (record.total === undefined && record.xnos !== undefined) {
    record.total = record.xnos;
  }

  for (const key of Object.keys(record)) {
    const value = record[key];
    if (value && typeof value === 'object') {
      record[key] = aliasMetricRecord(value as AnyRecord);
    }
  }

  return record;
}

function aliasMetricRecord(record: unknown): AnyRecord {
  if (!record || typeof record !== 'object') {
    return record as AnyRecord;
  }

  if (Array.isArray(record)) {
    return record.map((item) => aliasMetricRecord(item)) as unknown as AnyRecord;
  }

  const result = { ...(record as AnyRecord) };

  for (const metric of Object.keys(METRIC_ALIASES) as MetricKey[]) {
    for (const alias of METRIC_ALIASES[metric]) {
      if (result[metric] === undefined && result[alias] !== undefined) {
        result[metric] = result[alias];
      }
      for (const suffix of DISPLAY_SUFFIXES) {
        const canonicalDisplayKey = `${metric}${suffix}`;
        const aliasDisplayKey = `${alias}${suffix}`;
        if (result[canonicalDisplayKey] === undefined && result[aliasDisplayKey] !== undefined) {
          result[canonicalDisplayKey] = result[aliasDisplayKey];
        }
      }
    }
  }

  if (result.avgStakers === undefined && result.avgStaking !== undefined) {
    result.avgStakers = result.avgStaking;
  }
  if (result.avgStakersDisplay === undefined && result.avgStakingDisplay !== undefined) {
    result.avgStakersDisplay = result.avgStakingDisplay;
  }
  if (result.avgUnstakers === undefined && result.avgUnstaking !== undefined) {
    result.avgUnstakers = result.avgUnstaking;
  }
  if (result.avgUnstakersDisplay === undefined && result.avgUnstakingDisplay !== undefined) {
    result.avgUnstakersDisplay = result.avgUnstakingDisplay;
  }
  if (result.total === undefined && result.xnos !== undefined) {
    result.total = result.xnos;
  }
  if (result.totalDisplay === undefined && result.xnosDisplay !== undefined) {
    result.totalDisplay = result.xnosDisplay;
  }

  return result;
}

function normalizeMetrics(metrics: unknown): unknown {
  if (!metrics || typeof metrics !== 'object') {
    return metrics;
  }

  const result = { ...(metrics as AnyRecord) };

  if (result.changes) {
    result.changes = aliasMetricContainer(result.changes);
  }
  if (result.accounts && typeof result.accounts === 'object') {
    const accounts = { ...(result.accounts as AnyRecord) };
    if (accounts.stability) {
      accounts.stability = aliasMetricContainer(accounts.stability);
    }
    if (accounts.activity) {
      accounts.activity = aliasMetricContainer(accounts.activity);
    }
    result.accounts = accounts;
  }
  if (result.health) {
    result.health = aliasMetricRecord(result.health);
  }
  if (result.extended && typeof result.extended === 'object') {
    const extended = { ...(result.extended as AnyRecord) };
    for (const key of Object.keys(extended)) {
      extended[key] = aliasMetricContainer(extended[key]);
    }
    result.extended = extended;
  }

  return result;
}

function normalizePatterns(patterns: unknown): unknown {
  if (!patterns || typeof patterns !== 'object') {
    return patterns;
  }

  const result = { ...(patterns as AnyRecord) };

  if (Array.isArray(result.dayOfWeek)) {
    result.dayOfWeek = result.dayOfWeek.map((entry: unknown) => aliasMetricRecord(entry));
  }
  if (Array.isArray(result.monthly)) {
    result.monthly = result.monthly.map((entry: unknown) => aliasMetricRecord(entry));
  }

  return result;
}

function normalizeEvents(events: unknown): unknown {
  if (!events || typeof events !== 'object') {
    return events;
  }

  const result = { ...(events as AnyRecord) };

  for (const key of ['highest', 'lowest', 'unusual']) {
    if (Array.isArray(result[key])) {
      result[key] = result[key].map((entry: unknown) => aliasMetricRecord(entry));
    }
  }

  return result;
}

function cloneRecord(record?: ContractRecordEntry | null) {
  if (!record) {
    return null;
  }
  return { ...record };
}
