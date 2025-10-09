export type MonitorRange = '15m' | '1h' | '6h' | '1d';
export type MonitorInterval = '1m' | '2m' | '5m' | '15m';

export const RANGE_CONFIG: Record<MonitorRange, { label: string; interval: MonitorInterval }> = {
  '15m': { label: '15m', interval: '1m' },
  '1h': { label: '1h', interval: '2m' },
  '6h': { label: '6h', interval: '5m' },
  '1d': { label: '1d', interval: '15m' },
};

const UNIT_IN_MS: Record<string, number> = {
  ms: 1,
  s: 1000,
  m: 60_000,
  h: 3_600_000,
  d: 86_400_000,
};

const UNIT_LABEL: Record<string, { singular: string; plural: string }> = {
  ms: { singular: 'millisecond', plural: 'milliseconds' },
  s: { singular: 'second', plural: 'seconds' },
  m: { singular: 'minute', plural: 'minutes' },
  h: { singular: 'hour', plural: 'hours' },
  d: { singular: 'day', plural: 'days' },
};

function parseInterval(interval: string): { value: number; unit: string } | null {
  const trimmed = String(interval).trim();
  const match = trimmed.match(/^(\d+)(ms|s|m|h|d)$/);
  if (!match) return null;
  const value = Number(match[1]);
  const unit = match[2];
  if (!Number.isFinite(value) || value <= 0) return null;
  return { value, unit };
}

export function intervalToMs(interval: string): number {
  const parsed = parseInterval(interval);
  if (!parsed) return 60_000;
  const factor = UNIT_IN_MS[parsed.unit];
  if (!factor) return 60_000;
  return parsed.value * factor;
}

export function msToInterval(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '60s';
  if (ms % UNIT_IN_MS.d === 0) return `${ms / UNIT_IN_MS.d}d`;
  if (ms % UNIT_IN_MS.h === 0) return `${ms / UNIT_IN_MS.h}h`;
  if (ms % UNIT_IN_MS.m === 0) return `${ms / UNIT_IN_MS.m}m`;
  if (ms % UNIT_IN_MS.s === 0) return `${ms / UNIT_IN_MS.s}s`;
  return `${ms}ms`;
}

export function getIntervalForRange(range: MonitorRange): MonitorInterval {
  return RANGE_CONFIG[range].interval;
}

export function formatIntervalLabel(interval: string, { short = false } = {}): string {
  const parsed = parseInterval(interval);
  if (!parsed) return interval;
  const { value, unit } = parsed;
  if (short) {
    if (unit === 'ms') return `${value} ms`;
    if (unit === 's') return value === 1 ? '1 sec' : `${value} sec`;
    if (unit === 'm') return value === 1 ? '1 min' : `${value} min`;
    if (unit === 'h') return value === 1 ? '1 hr' : `${value} hrs`;
    if (unit === 'd') return value === 1 ? '1 day' : `${value} days`;
  }
  const labels = UNIT_LABEL[unit];
  if (!labels) return interval;
  const noun = value === 1 ? labels.singular : labels.plural;
  return `${value} ${noun}`;
}

export function buildResolutionHint(interval: string): string {
  const label = formatIntervalLabel(interval, { short: true });
  return `${label} per point`;
}
