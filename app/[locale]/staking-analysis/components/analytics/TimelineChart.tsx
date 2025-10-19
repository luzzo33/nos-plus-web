'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import type { TimelineDataPoint } from '../../analytics';

interface TimelineChartProps {
  data: TimelineDataPoint[];
  className?: string;
}

type MetricKey = 'deposits' | 'withdrawals' | 'purchases' | 'sales' | 'netFlow';
type ViewMode = 'daily' | 'cumulative';

const METRICS: { key: MetricKey; label: string; color: string }[] = [
  { key: 'deposits', label: 'Stake Deposits', color: '#8b5cf6' },
  { key: 'withdrawals', label: 'Withdrawals', color: '#0ea5e9' },
  { key: 'purchases', label: 'Purchases', color: '#38bdf8' },
  { key: 'sales', label: 'Sales', color: '#fb7185' },
  { key: 'netFlow', label: 'Net Flow', color: '#22c55e' },
];

const METRIC_KEY_BY_MODE: Record<
  MetricKey,
  { daily: keyof TimelineDataPoint; cumulative: keyof TimelineDataPoint }
> = {
  deposits: { daily: 'deposits', cumulative: 'cumulativeDeposits' },
  withdrawals: { daily: 'withdrawals', cumulative: 'cumulativeWithdrawals' },
  purchases: { daily: 'purchases', cumulative: 'cumulativePurchases' },
  sales: { daily: 'sales', cumulative: 'cumulativeSales' },
  netFlow: { daily: 'netFlow', cumulative: 'cumulativeNetFlow' },
};

export function TimelineChart({ data, className = '' }: TimelineChartProps) {
  const [selectedMetrics, setSelectedMetrics] = useState<Set<MetricKey>>(
    () => new Set(['deposits', 'withdrawals', 'netFlow']),
  );
  const [viewMode, setViewMode] = useState<ViewMode>('cumulative');

  const chartData = useMemo(() => {
    if (!data?.length) return [];
    const sampleRate = Math.max(1, Math.ceil(data.length / 120));
    return data.filter((_, index) => index % sampleRate === 0);
  }, [data]);

  const toggleMetric = (key: MetricKey) => {
    setSelectedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const resolveDataKey = (metric: MetricKey) =>
    METRIC_KEY_BY_MODE[metric][viewMode] as string;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-base p-4 shadow-xl"
      >
        <p className="type-meta mb-2 text-foreground">{label}</p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs text-muted-foreground">{entry.name}</span>
              </div>
              <span className="text-sm font-semibold">
                {entry.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} NOS
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    );
  };

  return (
    <div className={`card-base p-3 sm:p-4 md:p-6 ${className}`}>
      <div className="mb-4 space-y-3 sm:mb-6 sm:space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-base font-semibold sm:text-lg md:text-xl">Activity Timeline</h3>
            <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
              Historical flow of staking events over time
            </p>
          </div>
          <div className="inline-flex items-center gap-1 rounded-lg border border-border/60 bg-secondary/40 p-1">
            {(['daily', 'cumulative'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors sm:text-sm ${
                  viewMode === mode
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {mode === 'daily' ? 'Daily totals' : 'Cumulative totals'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {METRICS.map((metric) => (
            <motion.button
              key={metric.key}
              onClick={() => toggleMetric(metric.key)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                selectedMetrics.has(metric.key)
                  ? 'bg-primary/20 text-primary ring-1 ring-primary/30'
                  : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
              }`}
            >
              <div className="h-2 w-2 rounded-full" style={{ backgroundColor: metric.color }} />
              {metric.label}
            </motion.button>
          ))}
        </div>
      </div>

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              {METRICS.map((metric) => (
                <linearGradient key={metric.key} id={`gradient-${metric.key}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={metric.color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={metric.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
            <XAxis
              dataKey="date"
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              tickFormatter={(value: string) => {
                const date = new Date(value);
                if (Number.isNaN(date.getTime())) return value;
                return `${date.getMonth() + 1}/${date.getDate()}`;
              }}
            />
            <YAxis
              stroke="hsl(var(--muted-foreground))"
              fontSize={11}
              tickLine={false}
              tickFormatter={(value: number) => `${(value / 1000).toFixed(0)}K`}
            />
            <Tooltip content={<CustomTooltip />} />
            {METRICS.filter((metric) => selectedMetrics.has(metric.key)).map((metric) => (
              <Area
                key={metric.key}
                type="monotone"
                dataKey={resolveDataKey(metric.key)}
                stroke={metric.color}
                strokeWidth={2}
                fill={`url(#gradient-${metric.key})`}
                name={metric.label}
                animationDuration={1000}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
