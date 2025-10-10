import { normalizeContractStats } from '../../staking-details/utils/normalizeStakingData';

type AnyRecord = Record<string, unknown>;

const VOLATILITY_FALLBACK_KEYS = ['volatility', 'stdDev'];

const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value);
    } catch {
      // ignore and fallback
    }
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const pickFirstNumber = (...values: (unknown | undefined)[]): number | undefined => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
};

const pickFirstDisplay = (...values: (unknown | undefined)[]): string | undefined => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value;
    }
  }
  return undefined;
};

const ensureRecord = (value: unknown): AnyRecord =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as AnyRecord) : {};

const aliasDistributionKey = (distribution: AnyRecord | undefined, from: string, to: string) => {
  if (!distribution || distribution[to] !== undefined || distribution[from] === undefined) return;
  distribution[to] = distribution[from];
};

const coerceVolatility = (candidate: AnyRecord | number | undefined): number | undefined => {
  if (typeof candidate === 'number' && Number.isFinite(candidate)) {
    return candidate;
  }
  const record = ensureRecord(candidate);
  for (const key of VOLATILITY_FALLBACK_KEYS) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
  }
  return undefined;
};

export function normalizeStakingDappStats<TStats = AnyRecord | null | undefined>(
  rawStats: TStats,
): TStats {
  if (!rawStats || typeof rawStats !== 'object') {
    return rawStats;
  }

  const base = normalizeContractStats(rawStats as AnyRecord) ?? rawStats;
  if (!base || typeof base !== 'object') {
    return rawStats;
  }

  const stats = clone(base as AnyRecord);

  const current = ensureRecord(stats.current);
  const historical = ensureRecord(stats.historical);
  const summary = ensureRecord(stats.summary);
  const aggregate = ensureRecord(summary.aggregate);
  const aggTotal = ensureRecord(aggregate.total);
  const histTotal = ensureRecord(historical.total);
  const histStakers = ensureRecord(historical.stakers);
  const histRatio = ensureRecord(historical.ratio);
  const metrics = ensureRecord(stats.metrics);
  const accountsMetrics = ensureRecord(ensureRecord(metrics.accounts).stability);
  const distribution = ensureRecord(stats.distribution);
  const health = ensureRecord(stats.health);

  if (current.xnos === undefined) {
    const fallbackValue = pickFirstNumber(current.total, current.stakers);
    if (fallbackValue !== undefined) {
      current.xnos = fallbackValue;
    }
  }
  if (current.xnosDisplay === undefined) {
    current.xnosDisplay = pickFirstDisplay(
      current.totalDisplay,
      current.stakersDisplay,
      current.display,
    );
  }
  stats.current = current;

  if (historical.xnos === undefined && Object.keys(histTotal).length > 0) {
    historical.xnos = histTotal;
  }
  if (historical.apr === undefined && Object.keys(histRatio).length > 0) {
    // In new backend shapes APR may be absent; fall back to ratio to avoid blanks
    historical.apr = histRatio;
  }
  stats.historical = historical;

  if (!metrics.xnos || typeof metrics.xnos !== 'object') {
    metrics.xnos = {};
  }
  const xnosMetrics = metrics.xnos as AnyRecord;

  if (xnosMetrics.current === undefined) {
    xnosMetrics.current = current.xnos ?? aggTotal.current ?? histTotal.latest;
  }
  if (xnosMetrics.average === undefined) {
    xnosMetrics.average = pickFirstNumber(xnosMetrics.average, aggTotal.avg, histTotal.avg);
  }
  if (xnosMetrics.median === undefined) {
    xnosMetrics.median = pickFirstNumber(xnosMetrics.median, aggTotal.median, histTotal.median);
  }
  if (xnosMetrics.averageDisplay === undefined) {
    xnosMetrics.averageDisplay = pickFirstDisplay(xnosMetrics.averageDisplay, histTotal.avgDisplay);
  }
  if (xnosMetrics.medianDisplay === undefined) {
    xnosMetrics.medianDisplay = pickFirstDisplay(
      xnosMetrics.medianDisplay,
      histTotal.medianDisplay,
    );
  }

  if (!xnosMetrics.range || typeof xnosMetrics.range !== 'object') {
    xnosMetrics.range = {};
  }
  const xnosRange = xnosMetrics.range as AnyRecord;
  if (xnosRange.min === undefined) {
    xnosRange.min = pickFirstNumber(xnosRange.min, histTotal.min, histStakers.min);
  }
  if (xnosRange.max === undefined) {
    xnosRange.max = pickFirstNumber(xnosRange.max, histTotal.max, histStakers.max);
  }

  if (!xnosMetrics.stability || typeof xnosMetrics.stability !== 'object') {
    xnosMetrics.stability = {};
  }
  const xnosStability = xnosMetrics.stability as AnyRecord;
  if (xnosStability.volatility === undefined) {
    xnosStability.volatility = pickFirstNumber(
      xnosStability.volatility,
      coerceVolatility(histTotal),
      coerceVolatility(histStakers),
      coerceVolatility(accountsMetrics.total),
      coerceVolatility(health),
    );
  }

  metrics.xnos = xnosMetrics;

  if (!metrics.extended || typeof metrics.extended !== 'object') {
    metrics.extended = {};
  }
  const extended = metrics.extended as AnyRecord;

  if (!extended.completeness || typeof extended.completeness !== 'object') {
    extended.completeness = {};
  }
  const completeness = extended.completeness as AnyRecord;
  if (completeness.coveragePct === undefined) {
    completeness.coveragePct = pickFirstNumber(
      completeness.coveragePct,
      historical.completeness,
      health.coveragePct,
    );
  }

  if (!extended.drawdowns || typeof extended.drawdowns !== 'object') {
    extended.drawdowns = {};
  }
  const drawdowns = extended.drawdowns as AnyRecord;
  if (drawdowns.xnos === undefined) {
    const changePercent = pickFirstNumber(histTotal.changePercent, aggTotal.changePercent);
    drawdowns.xnos = typeof changePercent === 'number' ? Math.abs(changePercent) : 0;
  }
  if (drawdowns.apr === undefined) {
    const changePercent = pickFirstNumber(histRatio.changePercent);
    drawdowns.apr = typeof changePercent === 'number' ? Math.abs(changePercent) : 0;
  }

  metrics.extended = extended;

  if (!metrics.apr || typeof metrics.apr !== 'object') {
    metrics.apr = {};
  }
  const aprMetrics = metrics.apr as AnyRecord;
  if (aprMetrics.average === undefined) {
    aprMetrics.average = pickFirstNumber(aprMetrics.average, histRatio.avg);
  }
  if (aprMetrics.median === undefined) {
    aprMetrics.median = pickFirstNumber(aprMetrics.median, histRatio.median);
  }
  if (!aprMetrics.range || typeof aprMetrics.range !== 'object') {
    aprMetrics.range = {};
  }
  const aprRange = aprMetrics.range as AnyRecord;
  if (aprRange.min === undefined) {
    aprRange.min = pickFirstNumber(aprRange.min, histRatio.min);
  }
  if (aprRange.max === undefined) {
    aprRange.max = pickFirstNumber(aprRange.max, histRatio.max);
  }

  metrics.apr = aprMetrics;
  stats.metrics = metrics;

  aliasDistributionKey(distribution, 'total', 'xnos');
  stats.distribution = distribution;

  return stats as unknown as TStats;
}

