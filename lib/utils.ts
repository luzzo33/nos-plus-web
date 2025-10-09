import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, currency: string = 'USD'): string {
  const formatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 6,
    maximumFractionDigits: value >= 100 ? 2 : value >= 1 ? 4 : 8,
  });

  return formatter.format(value);
}

export function formatPercentage(value: number, showSign: boolean = true): string {
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
}

export function formatLargeNumber(value: number): string {
  if (value >= 1e9) {
    return `${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${(value / 1e3).toFixed(2)}K`;
  }
  return value.toFixed(2);
}

export function getValueColorClass(value: number, type: 'change' | 'standard' = 'change'): string {
  if (type === 'change') {
    return value >= 0 ? 'text-green-500' : 'text-red-500';
  }
  return 'text-foreground';
}

export function calculatePercentageChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };

    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function groupDataByInterval(
  data: Array<{ timestamp: string; value: number }>,
  interval: 'hour' | 'day' | 'week' | 'month',
): Array<{ timestamp: string; value: number; count: number }> {
  const grouped = new Map<string, { sum: number; count: number }>();

  data.forEach((item) => {
    const date = new Date(item.timestamp);
    let key: string;

    switch (interval) {
      case 'hour':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}`;
        break;
      case 'day':
        key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
        break;
      case 'week':
        const week = Math.floor(date.getDate() / 7);
        key = `${date.getFullYear()}-${date.getMonth()}-W${week}`;
        break;
      case 'month':
        key = `${date.getFullYear()}-${date.getMonth()}`;
        break;
    }

    const existing = grouped.get(key) || { sum: 0, count: 0 };
    grouped.set(key, {
      sum: existing.sum + item.value,
      count: existing.count + 1,
    });
  });

  return Array.from(grouped.entries()).map(([key, data]) => ({
    timestamp: key,
    value: data.sum / data.count,
    count: data.count,
  }));
}

import { enUS, es, de, it, zhCN } from 'date-fns/locale';

export function getDateLocale(locale: string) {
  switch (locale) {
    case 'de':
      return de;
    case 'es':
      return es;
    case 'it':
      return it;
    case 'zh':
      return zhCN;
    default:
      return enUS;
  }
}
