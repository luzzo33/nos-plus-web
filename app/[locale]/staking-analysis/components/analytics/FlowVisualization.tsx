'use client';

import { motion } from 'framer-motion';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ShoppingCart,
  TrendingUp,
  ArrowLeftRight,
  Sparkles,
} from 'lucide-react';

import type { StakingAnalyticsAggregates } from '../../analytics';

interface FlowVisualizationProps {
  aggregates: StakingAnalyticsAggregates;
  className?: string;
}

export function FlowVisualization({ aggregates, className = '' }: FlowVisualizationProps) {
  const flow = aggregates.flow;
  const fmt = (value: number) =>
    value.toLocaleString(undefined, { maximumFractionDigits: 2 });

  const totalInflow = flow?.walletInflow ?? 0;
  const totalOutflow = flow?.walletOutflow ?? 0;
  const netFlow = flow?.net ?? totalInflow - totalOutflow;

  const flows = [
    {
      label: 'Purchases',
      amount: flow?.categories.purchases.amount ?? 0,
      color: 'from-blue-500/20 to-blue-500/5',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-500',
      icon: ShoppingCart,
      direction: 'in' as const,
    },
    {
      label: 'Transfers In',
      amount: flow?.categories.transfersIn.amount ?? 0,
      color: 'from-green-500/20 to-green-500/5',
      borderColor: 'border-green-500/30',
      textColor: 'text-green-500',
      icon: ArrowLeftRight,
      direction: 'in' as const,
    },
    {
      label: 'Stake Withdrawals',
      amount: flow?.categories.stakeWithdrawals.amount ?? 0,
      color: 'from-cyan-500/20 to-cyan-500/5',
      borderColor: 'border-cyan-500/30',
      textColor: 'text-cyan-500',
      icon: ArrowUpFromLine,
      direction: 'in' as const,
    },
    {
      label: 'Sales',
      amount: flow?.categories.sales.amount ?? 0,
      color: 'from-rose-500/20 to-rose-500/5',
      borderColor: 'border-rose-500/30',
      textColor: 'text-rose-500',
      icon: TrendingUp,
      direction: 'out' as const,
    },
    {
      label: 'Transfers Out',
      amount: flow?.categories.transfersOut.amount ?? 0,
      color: 'from-orange-500/20 to-orange-500/5',
      borderColor: 'border-orange-500/30',
      textColor: 'text-orange-500',
      icon: ArrowLeftRight,
      direction: 'out' as const,
    },
    {
      label: 'Stake Deposits (Principal)',
      amount: flow?.categories.stakePrincipalDeposits.amount ?? 0,
      color: 'from-purple-500/20 to-purple-500/5',
      borderColor: 'border-purple-500/30',
      textColor: 'text-purple-500',
      icon: ArrowDownToLine,
      direction: 'out' as const,
    },
  ];

  const informationalFlows =
    (flow?.categories.stakeRewardRestaked.amount ?? 0) > 0
      ? [
          {
            label: 'Rewards Restaked (excluded from totals)',
            amount: flow?.categories.stakeRewardRestaked.amount ?? 0,
            color: 'from-emerald-500/20 to-emerald-500/5',
            borderColor: 'border-emerald-500/30',
            textColor: 'text-emerald-500',
            icon: Sparkles,
            direction: 'info' as const,
          },
        ]
      : [];

  const directionalFlows = flows.filter((flowEntry) => flowEntry.amount > 0);
  const maxFlow = Math.max(
    ...directionalFlows.map((entry) => entry.amount),
    totalInflow,
    totalOutflow,
    1,
  );
  const allFlows = [...flows, ...informationalFlows];

  return (
    <div className={`card-base p-3 sm:p-4 md:p-6 ${className}`}>
      <div className="mb-4 sm:mb-6">
        <h3 className="text-base font-semibold sm:text-lg md:text-xl">NOS Flow Analysis</h3>
        <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
          Visual breakdown of inflows and outflows
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-green-500/20 bg-gradient-to-br from-green-500/10 to-green-500/5 p-4"
        >
          <p className="type-meta text-green-500">Total Inflow</p>
          <p className="mt-2 text-2xl font-bold text-green-500">
            +{fmt(totalInflow)}
          </p>
          <p className="text-xs text-muted-foreground">NOS</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-rose-500/5 p-4"
        >
          <p className="type-meta text-rose-500">Total Outflow</p>
          <p className="mt-2 text-2xl font-bold text-rose-500">
            -{fmt(totalOutflow)}
          </p>
          <p className="text-xs text-muted-foreground">NOS</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`rounded-xl border p-4 ${
            netFlow >= 0
              ? 'border-blue-500/20 bg-gradient-to-br from-blue-500/10 to-blue-500/5'
              : 'border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-500/5'
          }`}
        >
          <p
            className={`type-meta ${
              netFlow >= 0 ? 'text-blue-500' : 'text-amber-500'
            }`}
          >
            Net Flow
          </p>
          <p
            className={`mt-2 text-2xl font-bold ${
              netFlow >= 0 ? 'text-blue-500' : 'text-amber-500'
            }`}
          >
            {netFlow >= 0 ? '+' : ''}
            {fmt(netFlow)}
          </p>
          <p className="text-xs text-muted-foreground">NOS</p>
        </motion.div>
      </div>

      <div className="space-y-4">
        {allFlows.map((flowEntry, index) => {
          const percentage = maxFlow > 0 ? (flowEntry.amount / maxFlow) * 100 : 0;
          const Icon = flowEntry.icon;
          const isInfo = flowEntry.direction === 'info';

          return (
            <motion.div
              key={flowEntry.label}
              initial={{
                opacity: 0,
                x:
                  flowEntry.direction === 'in'
                    ? -50
                    : flowEntry.direction === 'out'
                    ? 50
                    : 0,
              }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className="space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icon className={`h-4 w-4 ${flowEntry.textColor}`} />
                  <span className={`text-sm font-medium ${isInfo ? 'text-muted-foreground' : ''}`}>
                    {flowEntry.label}
                  </span>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-semibold ${isInfo ? 'text-muted-foreground' : ''}`}>
                    {fmt(flowEntry.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">NOS</p>
                </div>
              </div>
              <div className={`h-3 overflow-hidden rounded-full ${isInfo ? 'bg-secondary/60' : 'bg-secondary'}`}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(percentage, 100)}%` }}
                  transition={{ duration: 1, delay: index * 0.1 + 0.3, ease: 'easeOut' }}
                  className={`h-full rounded-full bg-gradient-to-r ${flowEntry.color} border-r-2 ${flowEntry.borderColor} ${
                    isInfo ? 'opacity-70' : ''
                  }`}
                />
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
