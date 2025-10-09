export function getUserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getUserLocale(): string {
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en-US';
}

export function toDate(input: string | number | Date): Date | null {
  try {
    if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
    if (typeof input === 'number') {
      const d = new Date(input);
      return isNaN(d.getTime()) ? null : d;
    }
    if (typeof input === 'string') {
      const hasTime = /\d{2}:\d{2}/.test(input);
      const containsT = /T\d{2}:\d{2}/.test(input);
      const hasZone = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(input);
      const normalised = hasTime && !containsT ? input.replace(/\s+/, 'T') : input;
      const str = hasTime && !hasZone ? `${normalised}Z` : normalised;
      const d = new Date(str);
      return isNaN(d.getTime()) ? null : d;
    }
    return null;
  } catch {
    return null;
  }
}

export type TimeLabelPreset =
  | 'HH:mm'
  | 'HH:mm:ss'
  | 'dd'
  | 'MMM'
  | 'MMM dd'
  | 'MMM yyyy'
  | 'yyyy'
  | 'MMM dd, HH:mm'
  | 'MM/dd HH:mm'
  | 'MMM dd, yyyy HH:mm';

export function formatLocal(date: Date, preset: TimeLabelPreset, locale = getUserLocale()): string {
  const tz = getUserTimeZone();
  try {
    switch (preset) {
      case 'HH:mm':
        return date.toLocaleTimeString(locale, {
          timeZone: tz,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
        });
      case 'HH:mm:ss':
        return date.toLocaleTimeString(locale, {
          timeZone: tz,
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      case 'dd':
        return date.toLocaleDateString(locale, { timeZone: tz, day: '2-digit' });
      case 'MMM':
        return date.toLocaleDateString(locale, { timeZone: tz, month: 'short' });
      case 'MMM dd':
        return date.toLocaleDateString(locale, { timeZone: tz, month: 'short', day: '2-digit' });
      case 'MMM yyyy':
        return date.toLocaleDateString(locale, { timeZone: tz, month: 'short', year: 'numeric' });
      case 'yyyy':
        return date.toLocaleDateString(locale, { timeZone: tz, year: 'numeric' });
      case 'MMM dd, HH:mm':
        return `${date.toLocaleDateString(locale, { timeZone: tz, month: 'short', day: '2-digit' })}, ${date.toLocaleTimeString(locale, { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })}`;
      case 'MM/dd HH:mm':
        return `${date.toLocaleDateString(locale, { timeZone: tz, month: '2-digit', day: '2-digit' })} ${date.toLocaleTimeString(locale, { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })}`;
      case 'MMM dd, yyyy HH:mm':
        return `${date.toLocaleDateString(locale, { timeZone: tz, month: 'short', day: '2-digit', year: 'numeric' })} ${date.toLocaleTimeString(locale, { timeZone: tz, hour12: false, hour: '2-digit', minute: '2-digit' })}`;
      default:
        return date.toLocaleString(locale, { timeZone: tz });
    }
  } catch {
    return date.toISOString().replace('T', ' ').slice(0, 16);
  }
}

export function formatLocalFromInput(
  input: string | number | Date,
  preset: TimeLabelPreset,
  locale?: string,
): string {
  const date = toDate(input);
  if (!date) return '';
  return formatLocal(date, preset, locale);
}

export function formatRangeTick(
  ts: string | number | Date,
  rangeKey: string,
  locale?: string,
): string {
  const d = toDate(ts);
  if (!d) return '';
  switch (rangeKey) {
    case '1h':
    case '4h':
    case '24h':
      return formatLocal(d, 'HH:mm', locale);
    case '7d':
    case '30d':
    case '90d':
      return formatLocal(d, 'MMM dd', locale);
    case '180d':
    case '1y':
      return formatLocal(d, 'MMM yyyy', locale);
    case 'all':
      return formatLocal(d, 'yyyy', locale);
    default:
      return formatLocal(d, 'MMM dd', locale);
  }
}
