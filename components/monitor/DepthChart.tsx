'use client';

import dynamic from 'next/dynamic';
import React, { useMemo } from 'react';
import type { ApexOptions } from 'apexcharts';

import { roundUsd, formatNumber } from '@/lib/monitor/numberFormat';
import type { LimitWallDepthPoint } from '@/services/limitWall';

type DepthMode = 'base' | 'usd';

type DepthChartProps = {
  bids: LimitWallDepthPoint[];
  asks: LimitWallDepthPoint[];
  depthMode: DepthMode;
  className?: string;
};

const ApexChart = dynamic(() => import('react-apexcharts'), { ssr: false });

function mapSeries(
  points: LimitWallDepthPoint[],
  key: 'bid' | 'ask',
  depthMode: DepthMode,
  midPrice: number,
) {
  if (!Array.isArray(points) || points.length === 0) return [];

  const priceRangePercent = 0.2;
  const minPrice = midPrice * (1 - priceRangePercent);
  const maxPrice = midPrice * (1 + priceRangePercent);

  const filtered = points
    .filter((point) => {
      if (!point || typeof point !== 'object' || point.price == null) return false;
      const price = Number(point.price);
      return price >= minPrice && price <= maxPrice && price > 0;
    })
    .map((point) => ({
      x: Number(point.price || 0),
      y: depthMode === 'usd' ? Number(point.cumulativeUsd ?? 0) : Number(point.cumulativeBase ?? 0),
    }))
    .sort((a, b) => a.x - b.x);

  if (filtered.length === 0) return [];

  const makeStepped = (pts: { x: number; y: number }[], ascending: boolean) => {
    const out: { x: number; y: number }[] = [];
    if (!pts.length) return out;
    const sorted = [...pts].sort((a, b) => (ascending ? a.x - b.x : b.x - a.x));
    let lastY = 0;
    for (const p of sorted) {
      out.push({ x: p.x, y: lastY });
      out.push({ x: p.x, y: p.y });
      lastY = p.y;
    }
    return out;
  };

  if (key === 'bid') {
    const bidPtsAsc = filtered.filter((p) => p.x <= midPrice);
    let last = 0;
    const cumulative = bidPtsAsc.map((p) => {
      last = Math.max(last, p.y);
      return { x: p.x, y: last };
    });
    if (!cumulative.length) return [];
    const baseAtMid = cumulative[cumulative.length - 1].y;
    const mirrored = cumulative.map((p) => ({ x: p.x, y: Math.max(0, baseAtMid - p.y) }));
    const withMid = [...mirrored, { x: midPrice, y: 0 }].sort((a, b) => a.x - b.x);
    return makeStepped(withMid, true);
  } else {
    const askPtsAsc = filtered.filter((p) => p.x >= midPrice);
    let last = 0;
    const cumulative = askPtsAsc.map((p) => {
      last = Math.max(last, p.y);
      return { x: p.x, y: last };
    });
    if (!cumulative.length) return [];
    const baseAtMid = cumulative[0].y;
    const mirrored = cumulative.map((p) => ({ x: p.x, y: Math.max(0, p.y - baseAtMid) }));
    const withMid = [{ x: midPrice, y: 0 }, ...mirrored].sort((a, b) => a.x - b.x);
    return makeStepped(withMid, true);
  }
}

export function DepthChart({ bids, asks, depthMode, className }: DepthChartProps) {
  const midPrice = useMemo(() => {
    const validBids = bids.filter((b) => b?.price && Number(b.price) > 0);
    const validAsks = asks.filter((a) => a?.price && Number(a.price) > 0);

    if (validBids.length === 0 && validAsks.length === 0) return 1;

    const bestBid = validBids.length > 0 ? Math.max(...validBids.map((b) => Number(b.price))) : 0;
    const bestAsk = validAsks.length > 0 ? Math.min(...validAsks.map((a) => Number(a.price))) : 0;

    if (bestBid > 0 && bestAsk > 0) return (bestBid + bestAsk) / 2;
    return bestBid || bestAsk || 1;
  }, [bids, asks]);

  const domain = useMemo(() => {
    const range = 0.2;
    const min = midPrice * (1 - range);
    const max = midPrice * (1 + range);
    return { min, max };
  }, [midPrice]);

  const series = useMemo(() => {
    return [
      { name: 'Bids', data: mapSeries(bids, 'bid', depthMode, midPrice) },
      { name: 'Asks', data: mapSeries(asks, 'ask', depthMode, midPrice) },
    ];
  }, [bids, asks, depthMode, midPrice]);

  const xBounds = domain;

  const options = useMemo<ApexOptions>(() => {
    const isDark = document?.documentElement?.classList?.contains('dark') ?? false;
    const textColor = isDark ? '#e5e7eb' : '#6b7280';
    const borderColor = isDark ? '#374151' : '#d1d5db';

    return {
      chart: {
        type: 'area',
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: false },
        background: 'transparent',
        foreColor: textColor,
        fontFamily: 'inherit',
        sparkline: { enabled: false },
        parentHeightOffset: 0,
      },
      grid: {
        borderColor: borderColor,
        strokeDashArray: 2,
        padding: { left: 15, right: 15, top: 10, bottom: 10 },
        xaxis: { lines: { show: true } },
        yaxis: { lines: { show: true } },
      },
      dataLabels: { enabled: false },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'center',
        floating: false,
        fontSize: '10px',
        fontWeight: 500,
        labels: {
          colors: textColor,
        },
        markers: {
          size: 8,
        },
      },
      stroke: {
        curve: 'stepline',
        width: [2, 2],
      },
      fill: {
        type: 'solid',
        opacity: [0.7, 0.7],
      },
      colors: ['#22c55e', '#ef4444'],
      tooltip: {
        theme: isDark ? 'dark' : 'light',
        shared: true,
        intersect: false,
        style: {
          fontSize: '11px',
          fontFamily: 'inherit',
        },
        y: {
          formatter: (value: number) =>
            depthMode === 'usd' ? roundUsd(value) : formatNumber(value),
        },
        x: {
          formatter: (value: number) => `Price: ${roundUsd(value)}`,
        },
      },
      xaxis: {
        type: 'numeric',
        title: {
          text: 'Price (USD)',
          style: {
            fontSize: '10px',
            fontWeight: 600,
            color: textColor,
          },
        },
        labels: {
          style: {
            fontSize: '9px',
            colors: textColor,
          },
          formatter: (value: string) => {
            const num = Number(value);
            const range = Math.max(1e-12, xBounds.max - xBounds.min);
            let decimals = 2;
            if (range < 0.001) decimals = 6;
            else if (range < 0.01) decimals = 5;
            else if (range < 0.1) decimals = 4;
            else if (range < 1) decimals = 3;
            else decimals = 2;
            return num.toFixed(decimals);
          },
        },
        axisBorder: {
          show: true,
          color: borderColor,
        },
        axisTicks: {
          show: false,
        },
        forceNiceScale: true,
        tickAmount: 9,
        tickPlacement: 'between',
        tooltip: { enabled: true },
        min: xBounds.min,
        max: xBounds.max,
      },
      yaxis: {
        title: {
          text: depthMode === 'usd' ? 'Cumulative USD' : 'Cumulative Amount',
          style: {
            fontSize: '10px',
            fontWeight: 600,
            color: textColor,
          },
        },
        labels: {
          style: {
            fontSize: '9px',
            colors: textColor,
          },
          formatter: (value: number) => {
            if (depthMode === 'usd') {
              return value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value.toFixed(0)}`;
            }
            return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value.toFixed(0)}`;
          },
        },
        axisBorder: { show: false },
        axisTicks: { show: false },
      },
    };
  }, [depthMode, xBounds.min, xBounds.max, midPrice]);

  return (
    <div className={className}>
      <ApexChart options={options} series={series} type="area" width="100%" height="100%" />
    </div>
  );
}
