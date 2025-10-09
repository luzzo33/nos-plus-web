'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { getUserLocale, getUserTimeZone } from '@/lib/time';
import { LineChart, Activity, BarChart3, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMonitorStream } from '@/lib/monitor/useMonitorStream';

interface ChartDataPoint {
  timestamp: number;
  price?: number;
  volume?: number;
  usdValue?: number;
  count: number;
}

export function TransactionChart() {
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '15m' | '1h'>('5m');
  const [chartType, setChartType] = useState<'price' | 'volume' | 'activity'>('price');
  const [mounted, setMounted] = useState(false);

  const { events, connected } = useMonitorStream({
    kinds: ['trade', 'limit_order', 'dca'],
    pollMs: 2000,
    bootstrapLimit: 200,
    debug: false,
  });

  useEffect(() => setMounted(true), []);

  const chartData = useMemo(() => {
    if (!events.length) return [];

    const now = Date.now();
    const timeRangeMs = {
      '1m': 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
    }[timeRange];

    const cutoff = now - timeRangeMs;
    const recentEvents = events.filter((evt) => new Date(evt.occurredAt).getTime() > cutoff);

    if (recentEvents.length === 0) return [];

    const bucketSize =
      timeRange === '1m' ? 5000 : timeRange === '5m' ? 15000 : timeRange === '15m' ? 30000 : 120000;
    const buckets = new Map<number, ChartDataPoint>();

    const oldestTime = Math.min(...recentEvents.map((e) => new Date(e.occurredAt).getTime()));
    for (
      let time = Math.floor(oldestTime / bucketSize) * bucketSize;
      time <= now;
      time += bucketSize
    ) {
      buckets.set(time, { timestamp: time, count: 0, volume: 0, usdValue: 0 });
    }

    recentEvents.forEach((evt) => {
      const eventTime = new Date(evt.occurredAt).getTime();
      const bucketKey = Math.floor(eventTime / bucketSize) * bucketSize;

      const bucket = buckets.get(bucketKey);
      if (bucket) {
        bucket.count++;
        if (evt.usdValue) bucket.usdValue = (bucket.usdValue || 0) + evt.usdValue;
        if (evt.baseAmount) bucket.volume = (bucket.volume || 0) + evt.baseAmount;
        if (evt.price) bucket.price = evt.price;
      }
    });

    return Array.from(buckets.values())
      .filter((d) => d.timestamp >= cutoff)
      .sort((a, b) => a.timestamp - b.timestamp);
  }, [events, timeRange]);

  const maxValue = useMemo(() => {
    if (!chartData.length) return 1;

    switch (chartType) {
      case 'price':
        return Math.max(...chartData.map((d) => d.price || 0));
      case 'volume':
        return Math.max(...chartData.map((d) => d.volume || 0));
      case 'activity':
      default:
        return Math.max(...chartData.map((d) => d.count));
    }
  }, [chartData, chartType]);

  const minValue = useMemo(() => {
    if (!chartData.length) return 0;

    switch (chartType) {
      case 'price':
        const prices = chartData.map((d) => d.price || 0).filter((p) => p > 0);
        return prices.length > 0 ? Math.min(...prices) : 0;
      default:
        return 0;
    }
  }, [chartData, chartType]);

  const formatValue = (value: number) => {
    if (chartType === 'price') return `$${value.toFixed(6)}`;
    if (chartType === 'volume')
      return value < 1000 ? value.toFixed(2) : `${(value / 1000).toFixed(1)}K`;
    return value.toString();
  };

  const currentStats = useMemo(() => {
    const last10 = chartData.slice(-10);
    if (!last10.length) return null;

    const totalTx = last10.reduce((sum, d) => sum + d.count, 0);
    const totalUsd = last10.reduce((sum, d) => sum + (d.usdValue || 0), 0);
    const pricePoints = last10.filter((d) => d.price && d.price > 0);
    const avgPrice =
      pricePoints.length > 0
        ? pricePoints.reduce((sum, d) => sum + (d.price || 0), 0) / pricePoints.length
        : 0;
    const latestPrice = pricePoints.length > 0 ? pricePoints[pricePoints.length - 1].price : 0;

    return { totalTx, totalUsd, avgPrice, latestPrice };
  }, [chartData]);

  if (!mounted) {
    return (
      <div className="h-[350px] rounded-xl border border-border bg-card dark:bg-card/50 animate-pulse">
        <div className="p-4">
          <div className="h-4 bg-muted rounded w-1/4 mb-4"></div>
          <div className="h-[250px] bg-muted/50 dark:bg-muted/20 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card dark:bg-card/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/50 dark:border-border/30 bg-muted/20 dark:bg-muted/10">
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-primary" />
              <div>
                <h3 className="font-semibold text-foreground">Live Chart</h3>
                <p className="text-sm text-muted-foreground">
                  {connected ? 'Live updates' : 'Connecting...'}
                  {currentStats?.latestPrice && chartType === 'price' && (
                    <span className="ml-2 font-mono">
                      Current: ${currentStats.latestPrice.toFixed(6)}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row gap-3 sm:justify-between">
            {/* Time Range */}
            <div className="flex rounded-lg border border-border bg-background dark:bg-background/50 p-1">
              {(['1m', '5m', '15m', '1h'] as const).map((range) => (
                <button
                  key={range}
                  onClick={() => setTimeRange(range)}
                  className={cn(
                    'px-3 py-1 text-sm rounded transition-colors',
                    timeRange === range
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted text-muted-foreground',
                  )}
                >
                  {range}
                </button>
              ))}
            </div>

            {/* Chart Type */}
            <div className="flex rounded-lg border border-border bg-background dark:bg-background/50 p-1">
              <button
                onClick={() => setChartType('price')}
                className={cn(
                  'px-3 py-1 text-sm rounded transition-colors flex items-center gap-1',
                  chartType === 'price'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground',
                )}
              >
                <DollarSign className="w-3 h-3" />
                Price
              </button>
              <button
                onClick={() => setChartType('volume')}
                className={cn(
                  'px-3 py-1 text-sm rounded transition-colors flex items-center gap-1',
                  chartType === 'volume'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground',
                )}
              >
                <BarChart3 className="w-3 h-3" />
                Volume
              </button>
              <button
                onClick={() => setChartType('activity')}
                className={cn(
                  'px-3 py-1 text-sm rounded transition-colors flex items-center gap-1',
                  chartType === 'activity'
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted text-muted-foreground',
                )}
              >
                <Activity className="w-3 h-3" />
                Activity
              </button>
            </div>
          </div>

          {/* Quick Stats */}
          {currentStats && (
            <div className="grid grid-cols-3 gap-4 text-sm bg-background/50 dark:bg-background/20 p-3 rounded-lg border border-border/30">
              <div>
                <div className="text-muted-foreground">Transactions</div>
                <div className="font-semibold text-foreground">{currentStats.totalTx}</div>
              </div>
              <div>
                <div className="text-muted-foreground">Volume</div>
                <div className="font-semibold text-foreground">
                  ${currentStats.totalUsd.toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Avg Price</div>
                <div className="font-semibold text-foreground">
                  ${currentStats.avgPrice.toFixed(6)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chart Area */}
      <div className="p-4">
        {chartData.length === 0 ? (
          <div className="h-[250px] flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <LineChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <div className="font-medium">Waiting for transaction data...</div>
              <div className="text-sm">
                {connected ? 'Connected to live feed' : 'Connecting...'}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-[250px] relative">
            {/* Canvas Chart */}
            <canvas
              ref={(canvas) => {
                if (!canvas || !chartData.length) return;

                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;

                canvas.width = rect.width * dpr;
                canvas.height = rect.height * dpr;
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';

                ctx.scale(dpr, dpr);
                ctx.clearRect(0, 0, rect.width, rect.height);

                const padding = 30;
                const chartWidth = rect.width - padding * 2;
                const chartHeight = rect.height - padding * 2;

                const isDark = document.documentElement.classList.contains('dark');
                const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
                const lineColor =
                  chartType === 'price'
                    ? '#3b82f6'
                    : chartType === 'volume'
                      ? '#10b981'
                      : '#8b5cf6';
                const pointColor = lineColor;

                ctx.strokeStyle = gridColor;
                ctx.lineWidth = 1;
                for (let i = 1; i < 5; i++) {
                  const y = padding + (chartHeight / 5) * i;
                  ctx.beginPath();
                  ctx.moveTo(padding, y);
                  ctx.lineTo(padding + chartWidth, y);
                  ctx.stroke();
                }

                for (let i = 1; i < 6; i++) {
                  const x = padding + (chartWidth / 6) * i;
                  ctx.beginPath();
                  ctx.moveTo(x, padding);
                  ctx.lineTo(x, padding + chartHeight);
                  ctx.stroke();
                }

                if (chartData.length < 2) return;

                const valueRange = maxValue - minValue;
                const safeRange = valueRange > 0 ? valueRange : 1;

                ctx.fillStyle = lineColor + '20';
                ctx.beginPath();
                chartData.forEach((point, index) => {
                  const x = padding + (chartWidth / (chartData.length - 1)) * index;
                  let value = 0;

                  switch (chartType) {
                    case 'price':
                      value = point.price || minValue;
                      break;
                    case 'volume':
                      value = point.volume || 0;
                      break;
                    case 'activity':
                    default:
                      value = point.count;
                      break;
                  }

                  const y = padding + chartHeight - ((value - minValue) / safeRange) * chartHeight;

                  if (index === 0) {
                    ctx.moveTo(x, y);
                  } else {
                    ctx.lineTo(x, y);
                  }
                });
                const lastX = padding + chartWidth;
                const bottomY = padding + chartHeight;
                ctx.lineTo(lastX, bottomY);
                ctx.lineTo(padding, bottomY);
                ctx.closePath();
                ctx.fill();

                ctx.strokeStyle = lineColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                chartData.forEach((point, index) => {
                  const x = padding + (chartWidth / (chartData.length - 1)) * index;
                  let value = 0;

                  switch (chartType) {
                    case 'price':
                      value = point.price || minValue;
                      break;
                    case 'volume':
                      value = point.volume || 0;
                      break;
                    case 'activity':
                    default:
                      value = point.count;
                      break;
                  }

                  const y = padding + chartHeight - ((value - minValue) / safeRange) * chartHeight;

                  if (index === 0) {
                    ctx.moveTo(x, y);
                  } else {
                    ctx.lineTo(x, y);
                  }
                });
                ctx.stroke();

                ctx.fillStyle = pointColor;
                chartData.forEach((point, index) => {
                  const x = padding + (chartWidth / (chartData.length - 1)) * index;
                  let value = 0;

                  switch (chartType) {
                    case 'price':
                      value = point.price || minValue;
                      break;
                    case 'volume':
                      value = point.volume || 0;
                      break;
                    case 'activity':
                    default:
                      value = point.count;
                      break;
                  }

                  const y = padding + chartHeight - ((value - minValue) / safeRange) * chartHeight;

                  ctx.beginPath();
                  ctx.arc(x, y, 3, 0, 2 * Math.PI);
                  ctx.fill();
                });
              }}
              className="w-full h-full"
            />

            {/* Y-axis labels */}
            <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-muted-foreground font-mono py-2 pr-2">
              <div>{formatValue(maxValue)}</div>
              <div>{formatValue(minValue + (maxValue - minValue) * 0.75)}</div>
              <div>{formatValue(minValue + (maxValue - minValue) * 0.5)}</div>
              <div>{formatValue(minValue + (maxValue - minValue) * 0.25)}</div>
              <div>{formatValue(minValue)}</div>
            </div>

            {/* X-axis labels */}
            <div className="absolute bottom-0 left-0 w-full flex justify-between text-xs text-muted-foreground font-mono px-8">
              {chartData.length > 1 && (
                <>
                  <div>
                    {(() => {
                      const tz = getUserTimeZone();
                      const lc = getUserLocale();
                      return new Date(chartData[0].timestamp).toLocaleTimeString(lc, {
                        timeZone: tz,
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                    })()}
                  </div>
                  <div>Now</div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
