'use client';

import React, { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { LimitWallDepthPoint } from '@/services/limitWall';

type Props = {
  bids: LimitWallDepthPoint[];
  asks: LimitWallDepthPoint[];
  depthMode: 'base' | 'usd';
  className?: string;
};

export default function DepthChartRecharts({ bids, asks, depthMode, className }: Props) {
  const data = useMemo(() => {
    const map = (p: LimitWallDepthPoint) => ({
      price: Number(p.price),
      bid: Number(depthMode === 'usd' ? p.cumulativeUsd : p.cumulativeBase),
      ask: Number(depthMode === 'usd' ? p.cumulativeUsd : p.cumulativeBase),
    });
    const left = (bids || []).map(map);
    const right = (asks || []).map(map);
    return { left, right };
  }, [bids, asks, depthMode]);

  const formatY = (v: number) => {
    if (depthMode === 'usd') return v >= 1000 ? `$${(v / 1000).toFixed(0)}K` : `$${v.toFixed(0)}`;
    return v >= 1000 ? `${(v / 1000).toFixed(1)}K` : `${v.toFixed(0)}`;
  };

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="price"
            domain={['auto', 'auto']}
            tickFormatter={(v) => (v >= 1 ? v.toFixed(2) : v.toFixed(4))}
          />
          <YAxis tickFormatter={formatY} />
          <Tooltip
            formatter={(v: any) => [
              formatY(Number(v)),
              depthMode === 'usd' ? 'Cum USD' : 'Cum Amount',
            ]}
            labelFormatter={(l: any) => `Price: ${l}`}
          />
          <Legend />
          <Area
            dataKey="bid"
            name="Bids"
            data={data.left}
            type="step"
            stroke="#22c55e"
            fill="#22c55e"
            fillOpacity={0.6}
            isAnimationActive={false}
          />
          <Area
            dataKey="ask"
            name="Asks"
            data={data.right}
            type="step"
            stroke="#ef4444"
            fill="#ef4444"
            fillOpacity={0.6}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
