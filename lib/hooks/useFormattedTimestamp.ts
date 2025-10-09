'use client';

import { useEffect, useMemo, useState } from 'react';
import { format, formatDistanceToNow } from 'date-fns';
import { useLocale } from 'next-intl';

import { getDateLocale } from '@/lib/utils';
import { useDashboardSettingsStore } from '@/lib/stores/dashboardSettingsStore';

interface UseFormattedTimestampOptions {
  absoluteFormat?: string;
  fallback?: string;
  fallbackAbsolute?: string;
  fallbackRelative?: string;
  relativeIntervalMs?: number;
}

type TimestampInput = string | number | Date | null | undefined;

export function useFormattedTimestamp(
  timestamp: TimestampInput,
  {
    absoluteFormat = 'HH:mm:ss',
    fallback,
    fallbackAbsolute,
    fallbackRelative,
    relativeIntervalMs = 60_000,
  }: UseFormattedTimestampOptions = {},
) {
  const locale = useLocale();
  const dateLocale = useMemo(() => getDateLocale(locale), [locale]);
  const { timeDisplayMode } = useDashboardSettingsStore();

  const dateValue = useMemo(() => {
    if (timestamp == null) return null;
    const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
    return Number.isNaN(date.getTime()) ? null : date;
  }, [timestamp]);

  const [tick, setTick] = useState(() => Date.now());

  useEffect(() => {
    if (timeDisplayMode !== 'relative') return;

    const interval = window.setInterval(() => setTick(Date.now()), relativeIntervalMs);
    return () => window.clearInterval(interval);
  }, [timeDisplayMode, relativeIntervalMs]);

  const resolvedFallback =
    timeDisplayMode === 'relative'
      ? (fallbackRelative ?? fallback ?? '—')
      : (fallbackAbsolute ?? fallback ?? '—');

  return useMemo(() => {
    if (!dateValue) return resolvedFallback;

    if (timeDisplayMode === 'relative') {
      return formatDistanceToNow(dateValue, { addSuffix: true, locale: dateLocale, now: tick });
    }

    return format(dateValue, absoluteFormat, { locale: dateLocale });
  }, [dateValue, timeDisplayMode, absoluteFormat, resolvedFallback, dateLocale, tick]);
}
