'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { SimpleWidgetCard, SimpleWidgetHeader } from './SimpleWidgetCard';
import { apiClient, type TimeRange } from '@/lib/api/client';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
} from 'recharts';
import { formatRangeTick, toDate, formatLocal } from '@/lib/time';

type ChartRange = Extract<TimeRange, '24h' | '7d' | '30d'>;

interface SimplePriceChartWidgetProps {
  isMobile?: boolean;
  className?: string;
}

const RANGE_OPTIONS: Array<{ value: ChartRange; labelKey: string }> = [
  { value: '24h', labelKey: 'timeRanges.24h' },
  { value: '7d', labelKey: 'timeRanges.7d' },
  { value: '30d', labelKey: 'timeRanges.30d' },
];

const chartSkeleton = (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="h-3 w-24 rounded bg-[hsl(var(--border-card)_/_0.3)]" />
      <div className="h-3 w-16 rounded bg-[hsl(var(--border-card)_/_0.3)]" />
    </div>
    <div className="h-36 w-full rounded-lg bg-[hsl(var(--border-card)_/_0.2)]" />
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: 3 }).map((_, index) => (
        <div key={index} className="h-10 rounded bg-[hsl(var(--border-card)_/_0.2)]" />
      ))}
    </div>
  </div>
);

function useChartData(range: ChartRange) {
  return useQuery({
    queryKey: ['simple-price-chart', range],
    queryFn: () =>
      apiClient.getChartData({
        range,
        currency: 'usd',
        interval: 'auto',
      }),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });
}

export function SimplePriceChartWidget({
  isMobile = false,
  className,
}: SimplePriceChartWidgetProps) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const locale = useLocale();
  const [selectedRange, setSelectedRange] = useState<ChartRange>('24h');

  const { data, isLoading, isError, error } = useChartData(selectedRange);

  const chartPoints = useMemo(() => {
    const rawPoints = data?.chart?.data;
    if (Array.isArray(rawPoints)) return rawPoints;
    if (rawPoints && Array.isArray((rawPoints as any).data)) {
      return (rawPoints as any).data;
    }
    return [];
  }, [data]);

  const chartValues = useMemo(() => {
    return chartPoints
      .map((point: any) => Number(point?.price ?? point?.close ?? point?.value))
      .filter((value: number) => Number.isFinite(value));
  }, [chartPoints]);

  const chartStats = useMemo(() => {
    if (!chartValues.length) {
      return {
        changePct: 0,
        changeDisplay: '—',
        highDisplay: '—',
        lowDisplay: '—',
        rangeDisplay: '—',
      };
    }

    const first = chartValues[0];
    const last = chartValues[chartValues.length - 1];
    const max = Math.max(...chartValues);
    const min = Math.min(...chartValues);
    const range = max - min;

    const formatter = (value: number) =>
      value >= 1
        ? `$${value.toLocaleString(locale, { maximumFractionDigits: 2 })}`
        : `$${value.toFixed(4)}`;

    const changePct = first ? ((last - first) / first) * 100 : 0;

    return {
      changePct,
      changeDisplay: `${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}%`,
      highDisplay: formatter(max),
      lowDisplay: formatter(min),
      rangeDisplay: formatter(range),
    };
  }, [chartValues, locale]);

  const isUp = chartStats.changePct > 0;
  const isDown = chartStats.changePct < 0;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;
    try {
      const date = toDate(label);
      const value = payload[0].value;
      return (
        <div className="rounded-md border border-[hsl(var(--border-card)_/_0.6)] bg-[hsl(var(--bg-card))] px-3 py-2 text-xs shadow-lg">
          <p className="text-[hsl(var(--text-secondary))]">
            {date ? formatLocal(date, 'MMM d, HH:mm') : label}
          </p>
          <p className="font-semibold text-[hsl(var(--text-primary))]">
            ${Number(value).toFixed(4)}
          </p>
        </div>
      );
    } catch {
      return null;
    }
  };

  return (
    <SimpleWidgetCard className={cn('h-full', className)}>
      <SimpleWidgetHeader
        icon={<Activity className="h-4 w-4" />}
        title={tw('priceChart')}
        meta={`${tc(`timeRanges.${selectedRange}`)} · ${chartStats.changeDisplay}`}
      />

      {isLoading ? (
        chartSkeleton
      ) : isError ? (
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[hsl(var(--text-secondary))]">
          <span>{tc('noData')}</span>
          {error instanceof Error && (
            <span className="text-xs text-[hsl(var(--text-secondary))]">{error.message}</span>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-1.5">
            <div className="inline-flex rounded-full bg-[hsl(var(--border-card)_/_0.25)] p-1">
              {RANGE_OPTIONS.map((option) => {
                const active = selectedRange === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedRange(option.value)}
                    className={cn(
                      'h-7 rounded-full px-3 text-[11px] font-medium uppercase tracking-[0.08em] transition-colors',
                      active
                        ? 'bg-[hsl(var(--accent-1))] text-white shadow-[0_8px_16px_-12px_rgba(59,130,246,0.9)]'
                        : 'text-[hsl(var(--text-secondary))] hover:text-[hsl(var(--text-primary))]',
                    )}
                  >
                    {tc(option.labelKey)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-3 h-[clamp(180px,40vh,240px)] w-full rounded-xl bg-[hsl(var(--border-card)_/_0.12)] p-3">
            {chartPoints.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartPoints} margin={{ top: 10, right: 12, bottom: 0, left: -12 }}>
                  <defs>
                    <linearGradient id="simple-price-gradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--accent-1))" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="hsl(var(--accent-1))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="hsl(var(--border-card)_/_0.2)"
                    strokeDasharray="4 8"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => formatRangeTick(value, selectedRange)}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }}
                    minTickGap={24}
                  />
                  <YAxis
                    width={45}
                    tickFormatter={(value) => `$${Number(value).toFixed(2)}`}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: 'hsl(var(--text-secondary))', fontSize: 10 }}
                    domain={['dataMin', 'dataMax']}
                  />
                  <RechartsTooltip content={<CustomTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    stroke={
                      isUp ? 'hsl(var(--pos))' : isDown ? 'hsl(var(--neg))' : 'hsl(var(--accent-1))'
                    }
                    strokeWidth={2}
                    fill="url(#simple-price-gradient)"
                    activeDot={{ r: 3 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-xs text-[hsl(var(--text-secondary))]">
                {tc('noData')}
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-lg border border-[hsl(var(--border-card)_/_0.35)] bg-[hsl(var(--border-card)_/_0.12)] px-3 py-2">
              <p className="type-label text-[hsl(var(--text-secondary))]">{tw('high')}</p>
              <p className="font-semibold text-[hsl(var(--text-primary))]">
                {chartStats.highDisplay}
              </p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border-card)_/_0.35)] bg-[hsl(var(--border-card)_/_0.12)] px-3 py-2">
              <p className="type-label text-[hsl(var(--text-secondary))]">{tw('low')}</p>
              <p className="font-semibold text-[hsl(var(--text-primary))]">
                {chartStats.lowDisplay}
              </p>
            </div>
            <div className="rounded-lg border border-[hsl(var(--border-card)_/_0.35)] bg-[hsl(var(--border-card)_/_0.12)] px-3 py-2">
              <p className="type-label text-[hsl(var(--text-secondary))]">{tw('range')}</p>
              <p className="font-semibold text-[hsl(var(--text-primary))]">
                {chartStats.rangeDisplay}
              </p>
            </div>
          </div>
        </>
      )}
    </SimpleWidgetCard>
  );
}
