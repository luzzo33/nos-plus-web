'use client';

import { useEffect, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

import type { StakingAnalyticsAggregates, StakingEventType } from '../../analytics';
import { KNOWN_EVENT_TYPES } from '../../analytics';

interface DistributionChartProps {
  aggregates: StakingAnalyticsAggregates;
  className?: string;
}

const COLOR_MAP: Partial<Record<StakingEventType, string>> = {
  purchase: '#38bdf8',
  sale: '#fb7185',
  transfer_in: '#22c55e',
  transfer_out: '#f97316',
  stake_deposit: '#8b5cf6',
  stake_withdrawal: '#0ea5e9',
  stake_slash: '#eab308',
};

const LABEL_MAP: Partial<Record<StakingEventType, string>> = {
  purchase: 'Purchases',
  sale: 'Sales',
  transfer_in: 'Transfers In',
  transfer_out: 'Transfers Out',
  stake_deposit: 'Stake Deposits',
  stake_withdrawal: 'Withdrawals',
  stake_slash: 'Slashes',
};

const DEFAULT_COLOR = '#94a3b8';

export function DistributionChart({ aggregates, className = '' }: DistributionChartProps) {
  const totalCount = Math.max(aggregates.totals.count, 0);

  const computedData = useMemo(
    () =>
      Object.entries(aggregates.byType)
        .map(([type, data]) => {
          const eventType = type as StakingEventType;
          return {
            type: eventType,
            name: LABEL_MAP[eventType] ?? eventType,
            value: data.count,
            amount: data.amount,
            color: COLOR_MAP[eventType] ?? DEFAULT_COLOR,
          };
        })
        .filter((entry) => entry.value > 0)
        .sort((a, b) => b.value - a.value),
    [aggregates.byType],
  );

  const previousDataRef = useRef<typeof computedData>([]);
  useEffect(() => {
    if (computedData.length) {
      previousDataRef.current = computedData;
    }
  }, [computedData]);

  const chartData = computedData.length ? computedData : previousDataRef.current;

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0]?.payload;
    if (!data) return null;
    const count = data.value ?? 0;
    const percentage =
      totalCount > 0 ? ((count / totalCount) * 100).toFixed(1) : '0.0';

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-base p-4 shadow-xl"
      >
        <div className="mb-2 flex items-center gap-2">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.color }} />
          <p className="font-semibold">{data.name}</p>
        </div>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Count:</span>
            <span className="font-medium">{count.toLocaleString()}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-medium">
              {data.amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} NOS
            </span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-muted-foreground">Percentage:</span>
            <span className="font-medium">{percentage}%</span>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderCustomLabel = (entry: any) => {
    const value = entry.value ?? 0;
    const pct = totalCount > 0 ? (value / totalCount) * 100 : 0;
    if (pct < 5) return null;
    return `${pct.toFixed(1)}%`;
  };

  const legendEntries = useMemo(
    () =>
      chartData.length > 0
        ? chartData
        : KNOWN_EVENT_TYPES.map((type) => ({
            type,
            name: LABEL_MAP[type] ?? type,
            value: 0,
            amount: 0,
            color: COLOR_MAP[type] ?? DEFAULT_COLOR,
          })),
    [chartData],
  );

  return (
    <div className={`card-base p-3 sm:p-4 md:p-6 ${className}`}>
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base font-semibold sm:text-lg md:text-xl">Event Distribution</h3>
        <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
          Breakdown of transaction types by count
        </p>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart margin={{ top: 8, right: 24, bottom: 8, left: 24 }}>
              <Pie
                data={chartData.length ? chartData : legendEntries}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                innerRadius={46}
                fill="#8884d8"
                dataKey="value"
                isAnimationActive={false}
              >
                {(chartData.length ? chartData : legendEntries).map((entry, index) => (
                  <Cell key={`cell-${entry.type}-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="space-y-3">
          {legendEntries.map((entry, index) => {
            const percentage =
              totalCount > 0 ? ((entry.value / totalCount) * 100).toFixed(1) : '0.0';
            return (
              <motion.div
                key={`${entry.type}-${index}`}
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="flex items-center justify-between rounded-lg border border-border/50 bg-secondary/30 p-3 transition-all hover:bg-secondary/50"
              >
                <div className="flex items-center gap-3">
                  <div className="h-4 w-4 rounded-full" style={{ backgroundColor: entry.color }} />
                  <div>
                    <p className="text-sm font-medium">{entry.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {entry.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })} NOS
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{entry.value.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{percentage}%</p>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
