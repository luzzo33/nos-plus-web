'use client';

import { useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';
import type {
  StakingEarningsEvent,
  StakingEarningsEventsAggregates,
} from '@/lib/api/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

type TypePalette = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

type WalletBreakdownSectionProps = {
  className?: string;
  events: StakingEarningsEvent[];
  aggregates?: StakingEarningsEventsAggregates;
  palette: TypePalette;
  loading?: boolean;
};

const directionWeights: Record<string, number> = {
  purchase: 1,
  transfer_in: 1,
  stake_withdrawal: 1,
  sale: -1,
  transfer_out: -1,
  stake_deposit: -1,
  stake_slash: -1,
};

function formatXAxisLabel(value: number) {
  return format(new Date(value), 'MMM d');
}

function formatAmount(value: number) {
  if (!Number.isFinite(value)) return '—';
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (Math.abs(value) >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return value.toFixed(2);
}

export function WalletBreakdownSection({
  events,
  aggregates,
  palette,
  className,
  loading = false,
}: WalletBreakdownSectionProps) {
  const { timelineSeries, pieData, barData } = useMemo(() => {
    const eventsWithTime = events
      .filter((event) => event.timestamp)
      .map((event) => ({
        ...event,
        ts: new Date(event.timestamp as string).getTime(),
      }))
      .filter((event) => Number.isFinite(event.ts))
      .sort((a, b) => a.ts - b.ts);

    let runningNet = 0;
    const series = eventsWithTime.map((event) => {
      const weight = directionWeights[event.type] ?? 0;
      runningNet += (event.amount ?? 0) * weight;
      return {
        timestamp: event.ts,
        netAmount: runningNet,
        amount: event.amount ?? 0,
        type: event.type,
      };
    });

    const typeEntries = aggregates?.byType
      ? Object.entries(aggregates.byType)
      : Object.entries(
          events.reduce((acc, event) => {
            const entry = acc[event.type] || { amount: 0, count: 0 };
            entry.amount += event.amount ?? 0;
            entry.count += 1;
            acc[event.type] = entry;
            return acc;
          }, {} as Record<string, { amount: number; count: number }>),
        ).map(([type, value]) => ({
          amount: value.amount,
          count: value.count,
          usdValue: null,
          averageAmount: value.count ? value.amount / value.count : 0,
          averageUsdValue: null,
          firstSeen: null,
          lastSeen: null,
        }));

    const pie = (aggregates?.byType
      ? Object.entries(aggregates.byType)
      : typeEntries
    ).map(([type, stats]) => ({
      type,
      label: palette[type]?.label ?? type.replace(/_/g, ' '),
      value: Number(stats.amount ?? 0),
      color: palette[type]?.color ?? '#6366f1',
    }));

    const bar = (aggregates?.byType
      ? Object.entries(aggregates.byType)
      : typeEntries
    ).map(([type, stats]) => ({
      type,
      label: palette[type]?.label ?? type.replace(/_/g, ' '),
      count: stats.count ?? 0,
      average: stats.averageAmount ?? 0,
      color: palette[type]?.color ?? '#6366f1',
    }));

    return {
      timelineSeries: series,
      pieData: pie.filter((entry) => entry.value > 0),
      barData: bar.filter((entry) => entry.count > 0),
    };
  }, [events, aggregates, palette]);

  return (
    <div className={cn('grid gap-4 xl:grid-cols-[1.7fr_1fr]', className)}>
      <div className="card-base p-6 md:p-7 border border-border/70 bg-background/95 overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg md:text-xl font-semibold tracking-tight">Net NOS flow</h2>
            <p className="text-sm text-muted-foreground">
              Running balance of tokens entering vs leaving the wallet across all detected events.
            </p>
          </div>
        </div>
        <div className="h-[260px] md:h-[320px]">
          {loading ? (
            <SkeletonBlock className="h-full w-full rounded-xl" />
          ) : timelineSeries.length ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineSeries} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="netFlowGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={formatXAxisLabel}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  tickMargin={8}
                  minTickGap={24}
                />
                <YAxis
                  tickFormatter={formatAmount}
                  tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                />
                <Tooltip
                  formatter={(value: number) => `${formatAmount(value)} NOS`}
                  labelFormatter={(value: number) =>
                    format(new Date(value), 'PPpp')
                  }
                  contentStyle={{
                    background: 'hsl(var(--card))',
                    borderRadius: '12px',
                    border: '1px solid hsl(var(--border))',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="netAmount"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  fill="url(#netFlowGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              Not enough event data to build a timeline yet.
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="card-base p-6 border border-border/70 bg-background/95">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Event mix</h2>
              <p className="text-sm text-muted-foreground">
                Contribution of each event class to overall NOS flow.
              </p>
            </div>
          </div>
          <div className="h-[220px]">
            {loading ? (
              <SkeletonBlock className="h-full w-full rounded-xl" />
            ) : pieData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="label"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.type} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => `${formatAmount(value)} NOS`}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      borderRadius: '12px',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                No flow captured yet for this wallet.
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-4">
            {loading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock key={`pie-skeleton-${index}`} className="h-16 w-full rounded-lg" />
                ))
              : pieData.map((entry) => (
              <div
                key={entry.type}
                className="flex items-center justify-between rounded-lg border border-border/60 bg-secondary/40 px-3 py-2"
              >
                <span className="text-xs font-medium text-muted-foreground">{entry.label}</span>
                <span className="text-sm font-semibold" style={{ color: entry.color }}>
                  {formatAmount(entry.value)} NOS
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="card-base p-6 border border-border/70 bg-background/95">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold tracking-tight">Event cadence</h2>
            <span className="text-xs text-muted-foreground">Average NOS flow per event</span>
          </div>
          <div className="h-[180px]">
            {loading ? (
              <SkeletonBlock className="h-full w-full rounded-xl" />
            ) : barData.length ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" margin={{ left: 80, right: 24 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border)/0.4)" />
                  <XAxis type="number" tickFormatter={formatAmount} />
                  <YAxis
                    dataKey="label"
                    type="category"
                    width={80}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <Tooltip
                    formatter={(value: number) => `${formatAmount(value)} NOS / event`}
                    contentStyle={{
                      background: 'hsl(var(--card))',
                      borderRadius: '12px',
                      border: '1px solid hsl(var(--border))',
                    }}
                  />
                  <Bar dataKey="average" radius={[4, 4, 4, 4]}>
                    {barData.map((entry) => (
                      <Cell key={entry.type} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Not enough event diversity to calculate cadence.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
