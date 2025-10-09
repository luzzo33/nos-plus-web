import { BalancesApiClient } from './balances-client';
import type { TimeRange } from './types';

interface SimplifiedMetric {
  current?: number;
  value?: number;
  display?: string;
}

interface SimplifiedWidget {
  stakers?: unknown;
  unstakers?: unknown;
  total?: unknown;
  lastUpdate?: string;
  timestamp?: string;
  ranges?: unknown;
  changes?: unknown;
  ath?: unknown;
  atl?: unknown;
}

interface AccountSummary {
  count: number;
  display?: string;
  lastUpdate: string;
}

interface DeltaSummary {
  absolute: number | null;
  percentage: number | null;
  display: string | null;
}

interface AccountsChangeSummary {
  accounts: {
    total?: DeltaSummary;
    staking?: DeltaSummary;
    unstaking?: DeltaSummary;
  };
}

interface RangeBounds {
  low: number | null;
  high: number | null;
  average: number | null;
  lowDisplay?: string;
  highDisplay?: string;
  averageDisplay?: string;
}

interface RangeSummary {
  accounts: {
    total?: RangeBounds;
    staking?: RangeBounds;
    unstaking?: RangeBounds;
  };
}

interface RecordSide {
  value: number | null;
  display: string | null;
  date: string | null;
}

interface AccountsRecord {
  accounts: {
    total?: RecordSide;
    staking?: RecordSide;
    unstaking?: RecordSide;
  };
}

export class StakersUnstakersApiClient {
  constructor(private readonly balancesClient = new BalancesApiClient()) {}

  getWidget() {
    return this.balancesClient.getAccountsWidget().then((res) => {
      try {
        const rawWidget = res?.widget;
        if (!isSimplifiedWidget(rawWidget)) return res;

        const nowUpdate =
          typeof rawWidget.lastUpdate === 'string'
            ? rawWidget.lastUpdate
            : typeof rawWidget.timestamp === 'string'
              ? rawWidget.timestamp
              : new Date().toISOString();

        const totalSummary = buildSummary(extractMetric(rawWidget.total), nowUpdate);
        const stakingSummary = buildSummary(extractMetric(rawWidget.stakers), nowUpdate);
        const unstakingSummary = buildSummary(extractMetric(rawWidget.unstakers), nowUpdate);
        const ratio = calculateRatio(totalSummary.count, stakingSummary.count);

        const widget = {
          accounts: {
            total: totalSummary,
            staking: stakingSummary,
            unstaking: unstakingSummary,
          },
          ranges: adaptRangeLike(rawWidget.ranges),
          changes: adaptChangeLike(rawWidget.changes),
          ath: adaptRecords(rawWidget.ath),
          atl: adaptRecords(rawWidget.atl),
          current: {
            accounts: {
              total: totalSummary.count,
              staking: stakingSummary.count,
              unstaking: unstakingSummary.count,
              ratio,
            },
            amounts: { total: 0, staking: 0, unstaking: 0, avgPerAccount: 0 },
            lastUpdate: nowUpdate,
          },
        };

        return { ...res, widget };
      } catch {
        return res;
      }
    });
  }

  getChart(params: Parameters<BalancesApiClient['getAccountsChart']>[0]) {
    return this.balancesClient.getAccountsChart(params);
  }

  getTable(params: Parameters<BalancesApiClient['getAccountsTable']>[0]) {
    return this.balancesClient.getAccountsTable(params);
  }

  getStats(range?: TimeRange) {
    return this.balancesClient.getAccountsStats(range);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined;
const toNumberOrNull = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const toStringOrUndefined = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined;
const toStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

const isSimplifiedWidget = (value: unknown): value is SimplifiedWidget => {
  if (!isRecord(value)) return false;
  const hasCoreKeys = 'stakers' in value || 'unstakers' in value || 'total' in value;
  const alreadyStructured = 'accounts' in value;
  return hasCoreKeys && !alreadyStructured;
};

const extractMetric = (value: unknown): SimplifiedMetric | undefined => {
  if (!isRecord(value)) return undefined;
  const current = toNumber(value.current);
  const metricValue = toNumber(value.value);
  const display = toStringOrUndefined(value.display);
  if (current === undefined && metricValue === undefined && display === undefined) return undefined;
  return {
    current,
    value: metricValue,
    display,
  };
};

const buildSummary = (metric: SimplifiedMetric | undefined, lastUpdate: string): AccountSummary => {
  const primary =
    typeof metric?.current === 'number'
      ? metric.current
      : typeof metric?.value === 'number'
        ? metric.value
        : undefined;
  const count = typeof primary === 'number' ? primary : 0;
  const display =
    metric?.display ?? (typeof primary === 'number' ? primary.toLocaleString() : undefined);
  return {
    count,
    display,
    lastUpdate,
  };
};

const calculateRatio = (total: number, staking: number): number =>
  total > 0 ? staking / total : 0;

function adaptRecords(records: unknown): AccountsRecord | undefined {
  if (!isRecord(records)) return undefined;
  const mapSide = (side: unknown): RecordSide | undefined => {
    if (!isRecord(side)) return undefined;
    const value = toNumberOrNull(side.value ?? side.current);
    const display = toStringOrNull(side.display) ?? (value != null ? value.toLocaleString() : null);
    const date = toStringOrNull(side.date);
    return { value, display, date };
  };
  return {
    accounts: {
      total: mapSide(records.total),
      staking: mapSide(records.stakers ?? records.staking),
      unstaking: mapSide(records.unstakers),
    },
  };
}

function adaptChangeLike(changes: unknown): Record<string, AccountsChangeSummary> {
  if (!isRecord(changes)) return {};
  const out: Record<string, AccountsChangeSummary> = {};
  for (const [range, entry] of Object.entries(changes)) {
    const changeRecord = isRecord(entry) ? entry : {};
    out[range] = {
      accounts: {
        total: normalizeDelta(changeRecord.total),
        staking: normalizeDelta(changeRecord.stakers ?? changeRecord.staking),
        unstaking: normalizeDelta(changeRecord.unstakers),
      },
    };
  }
  return out;
}

function adaptRangeLike(ranges: unknown): Record<string, RangeSummary> {
  if (!isRecord(ranges)) return {};
  const out: Record<string, RangeSummary> = {};
  for (const [range, entry] of Object.entries(ranges)) {
    const rangeRecord = isRecord(entry) ? entry : {};
    out[range] = {
      accounts: {
        total: maybeRange(rangeRecord.total),
        staking: maybeRange(rangeRecord.stakers ?? rangeRecord.staking),
        unstaking: maybeRange(rangeRecord.unstakers),
      },
    };
  }
  return out;
}

function maybeRange(node: unknown): RangeBounds | undefined {
  if (!isRecord(node)) return undefined;
  const low = toNumberOrNull(node.low ?? node.min);
  const high = toNumberOrNull(node.high ?? node.max);
  const average =
    toNumberOrNull(node.average ?? node.avg) ??
    (low != null && high != null ? (low + high) / 2 : null);
  const lowDisplay =
    toStringOrUndefined(node.lowDisplay) ?? (low != null ? low.toLocaleString() : undefined);
  const highDisplay =
    toStringOrUndefined(node.highDisplay) ?? (high != null ? high.toLocaleString() : undefined);
  const averageDisplay =
    toStringOrUndefined(node.averageDisplay) ??
    (average != null ? average.toLocaleString() : undefined);
  return {
    low,
    high,
    average,
    lowDisplay,
    highDisplay,
    averageDisplay,
  };
}

function normalizeDelta(delta: unknown): DeltaSummary | undefined {
  if (!isRecord(delta)) return undefined;
  const absolute = toNumberOrNull(delta.absolute ?? delta.change);
  const percentage = toNumberOrNull(delta.percentage ?? delta.pct);
  const display =
    toStringOrNull(delta.display) ??
    (typeof percentage === 'number'
      ? `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`
      : typeof absolute === 'number'
        ? absolute.toLocaleString()
        : null);
  return {
    absolute,
    percentage,
    display,
  };
}
