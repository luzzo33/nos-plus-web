'use client';

import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import { DollarSign, Activity, BarChart3 } from 'lucide-react';

import { getUserLocale, getUserTimeZone } from '@/lib/time';
import { useDashboardSnapshot } from '@/lib/monitor/dashboardBootstrap';
import { useMetricsStream } from '@/lib/monitor/useMetricsStream';
import { bucketMetricsPoints } from '@/lib/monitor/bucketMetrics';
import {
  RANGE_CONFIG,
  buildResolutionHint,
  getIntervalForRange,
  intervalToMs,
  type MonitorRange,
} from '@/lib/monitor/chartConfig';
import { cn } from '@/lib/utils';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { MonitorWidgetFrame } from '@/components/monitor/MonitorWidgetFrame';
import {
  MONITOR_EXCHANGES,
  buildDefaultExchangeSelection,
  selectedExchangeIds,
  type MonitorExchangeSelection,
} from '@/lib/monitor/exchanges';

import type { MetricsPoint } from '@/lib/monitor/useMetricsStream';

const PERFORMANCE_CHART_EXCHANGES = MONITOR_EXCHANGES.filter(
  (exchange) => exchange.id !== 'jupiter',
);

type Kind = 'price' | 'volume' | 'activity';
type ReadyCb = () => void;

type Props = {
  metric?: Kind;
  range?: MonitorRange;
  onReady?: ReadyCb;
  forceMobile?: boolean;
  metricOptions?: Array<{ key: Kind; label: string }>;
  onMetricChange?: (metric: Kind) => void;
  className?: string;
};

const RANGE_OPTIONS: MonitorRange[] = ['15m', '1h', '6h', '1d'];

export function LiveMetricsChart({
  metric = 'price',
  range: rangeProp = '1h',
  onReady,
  forceMobile,
  metricOptions,
  onMetricChange,
  className,
}: Props) {
  const [range, setRange] = useState<MonitorRange>(rangeProp);
  const [hoverText, setHoverText] = useState<string | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(forceMobile || false);
  const [statsExpanded, setStatsExpanded] = useState(false);
  const [exchangeSelection, setExchangeSelection] = useState<MonitorExchangeSelection>(() =>
    buildDefaultExchangeSelection(PERFORMANCE_CHART_EXCHANGES),
  );
  const selectedExchangeIdsList = useMemo(
    () => selectedExchangeIds(exchangeSelection, PERFORMANCE_CHART_EXCHANGES),
    [exchangeSelection],
  );
  const allExchangesSelected =
    selectedExchangeIdsList.length === PERFORMANCE_CHART_EXCHANGES.length;
  const venuesParam = useMemo(() => {
    if (allExchangesSelected) return undefined;
    return selectedExchangeIdsList.map((id) => id.toLowerCase()).join(',');
  }, [allExchangesSelected, selectedExchangeIdsList]);
  const selectedExchangeCount = Math.max(selectedExchangeIdsList.length, 1);
  const totalExchanges = PERFORMANCE_CHART_EXCHANGES.length;
  const handleExchangeToggle = useCallback(
    (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
      const exclusive = event.ctrlKey || event.metaKey;
      setExchangeSelection((prev) => {
        if (exclusive) {
          const next: MonitorExchangeSelection = {};
          for (const exchange of PERFORMANCE_CHART_EXCHANGES) {
            next[exchange.id] = exchange.id === id;
          }
          return next;
        }
        const next = { ...prev, [id]: !prev[id] } as MonitorExchangeSelection;
        if (!PERFORMANCE_CHART_EXCHANGES.some((exchange) => next[exchange.id])) {
          return prev;
        }
        return next;
      });
    },
    [],
  );
  const prevRangeProp = useRef<MonitorRange>(rangeProp);

  const resolution = getIntervalForRange(range);
  const resolutionHint = buildResolutionHint(resolution);
  const intervalMs = intervalToMs(resolution);
  const rangeMs = intervalToMs(range);

  const dashboard = useDashboardSnapshot();
  const icon = metric === 'price' ? DollarSign : metric === 'volume' ? BarChart3 : Activity;

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (forceMobile) return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [forceMobile]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<boolean>).detail;
      setStatsExpanded(Boolean(detail));
    };
    window.addEventListener('np:stats-advanced-view', handler);
    return () => window.removeEventListener('np:stats-advanced-view', handler);
  }, []);

  useEffect(() => {
    setIsLoading(true);
  }, [range, metric, venuesParam]);

  useEffect(() => {
    if (prevRangeProp.current !== rangeProp) {
      prevRangeProp.current = rangeProp;
      setRange(rangeProp);
    }
  }, [rangeProp]);

  const initialSeries = useMemo(() => {
    if (!dashboard) return undefined;

    const mapSeries = (
      series:
        | { points?: MetricsPoint[]; total?: number | null; latestPrice?: number | null }
        | undefined,
    ) => {
      if (!series) return undefined;
      const points = (series.points || []).map((point) => {
        const typed = point as MetricsPoint;
        return {
          ...typed,
          t: typeof typed.t === 'number' ? typed.t : toMs(typed.t),
        };
      });
      return {
        points,
        meta: { total: series.total ?? null, latestPrice: series.latestPrice ?? null },
      };
    };

    if (allExchangesSelected) {
      return mapSeries(dashboard.metrics?.[metric]?.[range]);
    }

    if (selectedExchangeIdsList.length === 1) {
      const exchangeId = selectedExchangeIdsList[0];
      const perVenueSeries = dashboard.metricsByVenue?.[exchangeId]?.[metric]?.[range];
      return mapSeries(perVenueSeries);
    }

    return undefined;
  }, [dashboard, metric, range, allExchangesSelected, selectedExchangeIdsList]);

  const {
    points: streamPoints,
    connected,
    total,
    latestPrice,
  } = useMetricsStream({
    metric,
    interval: resolution,
    range,
    chart: 'line',
    initialSeries: initialSeries?.points,
    initialMeta: initialSeries?.meta,
    venues: venuesParam,
  });

  const displayPoints = useMemo(() => {
    return bucketMetricsPoints(streamPoints, {
      intervalMs,
      metric,
      fillGaps: true,
      limitMs: rangeMs,
    });
  }, [streamPoints, intervalMs, metric, rangeMs]);

  const latestDisplayPoint = displayPoints.length ? displayPoints[displayPoints.length - 1] : null;

  const [minV, maxV] = useMemo(() => {
    if (!displayPoints.length) return [0, 1];
    const raw = displayPoints
      .map((point) => Number(point.v ?? point.c ?? point.o ?? 0))
      .filter((value) => Number.isFinite(value));
    if (!raw.length) return [0, 1];
    let minValue = Math.min(...raw);
    let maxValue = Math.max(...raw);
    if (metric === 'price') {
      raw.forEach((value) => {
        if (value > 0) {
          minValue = Math.min(minValue, value);
          maxValue = Math.max(maxValue, value);
        }
      });
    }
    if (minValue === maxValue) {
      const padding =
        metric === 'price'
          ? Math.max(minValue * 0.01, 0.01)
          : Math.max(Math.abs(minValue) * 0.1, 1);
      return [Math.max(0, minValue - padding), maxValue + padding];
    }
    const spread = maxValue - minValue;
    const padding = spread * 0.05 || (metric === 'price' ? Math.max(maxValue * 0.02, 0.02) : 1);
    const lower = metric === 'price' ? Math.max(0, minValue - padding) : minValue - padding;
    return [lower, maxValue + padding];
  }, [displayPoints, metric]);

  const geometry = useMemo(
    () => buildTimeGeometry(displayPoints, intervalMs),
    [displayPoints, intervalMs],
  );
  const lastCanvasSize = useRef({ width: 0, height: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !displayPoints.length || !geometry) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
    const sizeChanged =
      rect.width !== lastCanvasSize.current.width || rect.height !== lastCanvasSize.current.height;
    if (sizeChanged) {
      lastCanvasSize.current = { width: rect.width, height: rect.height };
    }
    const padLeft = metric === 'price' ? (isMobile ? 12 : 16) : isMobile ? 40 : 48;
    const padRight = metric === 'price' ? (isMobile ? 44 : 56) : isMobile ? 12 : 16;
    const padTop = isMobile ? 6 : 12;
    const padBottom = isMobile ? 20 : 32;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.resetTransform();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const width = rect.width - (padLeft + padRight);
    const height = rect.height - (padTop + padBottom);
    const timeSpan = Math.max(1, geometry.rangeMs);

    const xForTime = (ts: number) => padLeft + ((ts - geometry.minTime) / timeSpan) * width;
    const yRange = Math.max(1e-9, maxV - minV);
    const yForValue = (value: number) => padTop + height - ((value - minV) / yRange) * height;

    ctx.save();
    ctx.font =
      '10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial';
    ctx.textBaseline = 'middle';
    ctx.strokeStyle = 'rgba(120, 120, 120, 0.25)';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(padLeft, padTop);
    ctx.lineTo(padLeft, padTop + height);
    ctx.moveTo(padLeft, padTop + height);
    ctx.lineTo(padLeft + width, padTop + height);
    ctx.stroke();

    ctx.fillStyle = 'rgba(120, 120, 120, 0.75)';
    ctx.textAlign = metric === 'price' ? 'left' : 'right';
    const yTicks = 4;
    for (let i = 0; i <= yTicks; i++) {
      const ratio = i / yTicks;
      const value = maxV - (maxV - minV) * ratio;
      const y = padTop + height * ratio;
      if (i !== yTicks) {
        ctx.strokeStyle = 'rgba(120, 120, 120, 0.15)';
        ctx.beginPath();
        ctx.moveTo(padLeft, y);
        ctx.lineTo(padLeft + width, y);
        ctx.stroke();
      }
      const label = metric === 'activity' ? formatInteger(value) : `$${formatNumber(value)}`;
      const xLabel = metric === 'price' ? padLeft + width + 6 : padLeft - 6;
      ctx.fillStyle = 'rgba(120, 120, 120, 0.75)';
      ctx.fillText(label, xLabel, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const xTicks = 4;
    for (let i = 0; i <= xTicks; i++) {
      const ratio = i / xTicks;
      const targetTime = geometry.minTime + geometry.rangeMs * ratio;
      const x = xForTime(targetTime);
      ctx.fillStyle = 'rgba(120, 120, 120, 0.75)';
      ctx.fillText(formatTimeLocal(targetTime), x, padTop + height + 6);
      ctx.strokeStyle = 'rgba(120, 120, 120, 0.12)';
      ctx.beginPath();
      ctx.moveTo(x, padTop);
      ctx.lineTo(x, padTop + height);
      ctx.stroke();
    }

    const color = metric === 'price' ? '#3b82f6' : metric === 'volume' ? '#0ea5e9' : '#8b5cf6';

    ctx.beginPath();
    displayPoints.forEach((point, index) => {
      const x = xForTime(Number(point.t));
      const y = yForValue(Number(point.v ?? point.c ?? 0));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.lineTo(padLeft + width, padTop + height);
    ctx.lineTo(padLeft, padTop + height);
    ctx.closePath();
    ctx.fillStyle = `${color}22`;
    ctx.fill();

    ctx.beginPath();
    displayPoints.forEach((point, index) => {
      const x = xForTime(Number(point.t));
      const y = yForValue(Number(point.v ?? point.c ?? 0));
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.stroke();

    if (displayPoints.length) {
      const last = displayPoints[displayPoints.length - 1];
      const lx = xForTime(Number(last.t));
      const ly = yForValue(Number(last.v ?? last.c ?? 0));
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(lx, ly, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 0.3;
      ctx.beginPath();
      ctx.arc(lx, ly, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (hoverText && hoverPos) {
      const padding = 6;
      ctx.font =
        '11px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Noto Sans, Ubuntu, Cantarell, Helvetica Neue, Arial';
      const textWidth = ctx.measureText(hoverText).width;
      const boxWidth = textWidth + padding * 2;
      const boxHeight = 22;
      const bx = Math.min(Math.max(hoverPos.x - boxWidth / 2, 8), rect.width - boxWidth - 8);
      const by = Math.max(hoverPos.y - boxHeight - 10, 8);

      ctx.fillStyle = 'rgba(17, 24, 39, 0.92)';
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      roundRect(ctx, bx, by, boxWidth, boxHeight, 6);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(hoverText, bx + padding, by + boxHeight / 2);
    }

    ctx.restore();
    try {
      if (onReady) {
        onReady();
      }
    } catch {}
    if (displayPoints.length) setIsLoading(false);
  }, [
    displayPoints,
    geometry,
    minV,
    maxV,
    metric,
    hoverText,
    hoverPos,
    onReady,
    statsExpanded,
    isMobile,
  ]);

  const latestValueLabel = useMemo(() => {
    if (!latestDisplayPoint) return '--';
    if (metric === 'activity') return formatInteger(latestDisplayPoint.v ?? 0);
    const value =
      metric === 'price'
        ? typeof latestPrice === 'number'
          ? latestPrice
          : Number(latestDisplayPoint.v ?? latestDisplayPoint.c ?? 0)
        : Number(latestDisplayPoint.v ?? 0);
    if (!Number.isFinite(value)) return '--';
    return `$${formatNumber(value)}`;
  }, [latestDisplayPoint, latestPrice, metric]);

  const totalsLabel = useMemo(() => {
    if (metric === 'price') return null;
    if (metric === 'activity') {
      const effective = typeof total === 'number' ? total : sumValues(displayPoints);
      return formatInteger(effective);
    }
    const effective = typeof total === 'number' ? total : sumValues(displayPoints);
    return `$${formatNumber(effective)}`;
  }, [metric, total, displayPoints]);

  const metricLabel = useMemo(() => {
    if (!metricOptions?.length) return metric;
    return metricOptions.find((option) => option.key === metric)?.label ?? metric;
  }, [metricOptions, metric]);

  const handleMetricSelect = (next: Kind) => {
    if (next === metric) return;
    onMetricChange?.(next);
  };

  const headerStatus = connected
    ? { label: 'Live', tone: 'success' as const, pulse: true }
    : isLoading
      ? { label: 'Syncing', tone: 'warning' as const, pulse: false }
      : { label: 'Offline', tone: 'danger' as const, pulse: false };

  const rangeOptionsUi = useMemo(
    () => RANGE_OPTIONS.map((value) => ({ value, label: RANGE_CONFIG[value].label })),
    [],
  );

  const unitLabel = metric === 'activity' ? 'Count' : 'USD';
  const controlPillBase =
    'h-8 rounded-xl border border-border/40 bg-background/85 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground';
  const infoPillBase =
    'rounded-full border border-border/40 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide';

  const headerControls = (
    <div className="flex w-full flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
        {metricOptions?.length ? (
          <div className="inline-flex rounded-xl border border-border/40 bg-background/70 p-0.5">
            {metricOptions.map((option) => (
              <button
                key={option.key}
                onClick={() => handleMetricSelect(option.key)}
                className={cn(
                  'rounded-lg px-3 py-1 text-xs font-semibold transition-colors',
                  option.key === metric
                    ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/40'
                    : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
                )}
                type="button"
              >
                {option.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {metricLabel}
          </span>
        )}

        <CustomDropdown
          options={rangeOptionsUi}
          value={range}
          onSelect={(value) => setRange(value as MonitorRange)}
          size="sm"
          variant="ghost"
          className="w-full min-[420px]:w-auto"
          triggerClassName={cn(controlPillBase, 'w-full min-[420px]:w-auto justify-between')}
        />

        <span className={cn(infoPillBase, 'bg-background/70 text-foreground/80')}>
          {resolutionHint}
        </span>
        <span className={cn(infoPillBase, 'bg-background/60 text-primary')}>
          Latest: {latestValueLabel}
        </span>
        {totalsLabel && (
          <span className={cn(infoPillBase, 'bg-background/60 text-emerald-500')}>
            Total: {totalsLabel}
          </span>
        )}
        <span className={cn(infoPillBase, 'bg-background/60 text-foreground')}>
          Window: {RANGE_CONFIG[range].label} · {unitLabel}
        </span>
        <span className={cn(infoPillBase, 'ml-auto bg-background/60 text-foreground/80')}>
          {selectedExchangeCount}/{totalExchanges}
        </span>
      </div>

      <div className="flex flex-wrap gap-2" aria-label="Exchange filters">
        {PERFORMANCE_CHART_EXCHANGES.map((exchange) => {
          const selected = !!exchangeSelection[exchange.id];
          return (
            <button
              key={exchange.id}
              type="button"
              onClick={(event) => handleExchangeToggle(exchange.id, event)}
              className={cn(
                'flex items-center gap-2 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/40',
                selected
                  ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                  : 'border-border/40 bg-background/60 text-muted-foreground hover:text-foreground',
              )}
              aria-pressed={selected}
              title={exchange.label}
            >
              {exchange.icon && (
                <Image
                  src={exchange.icon}
                  alt=""
                  width={14}
                  height={14}
                  className="rounded border border-border/50 bg-background p-[1px]"
                />
              )}
              <span className="max-w-[88px] truncate">
                {exchange.label.replace(/\s*\(.*\)$/, '')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const mobileChartHeight = isMobile ? (statsExpanded ? 360 : 280) : undefined;
  const mobileHeightsClass = statsExpanded
    ? 'min-h-[360px] max-h-none'
    : 'min-h-[280px] max-h-none';
  const desktopHeightsClass = statsExpanded
    ? 'min-h-[260px] sm:min-h-[360px] max-h-none'
    : 'min-h-[180px] max-h-[320px] sm:min-h-[210px]';
  const chartContainerClassName = cn(
    'relative flex-1 rounded-2xl border border-border/40 bg-background/70',
    isMobile ? `p-2 ${mobileHeightsClass}` : `p-3 ${desktopHeightsClass}`,
  );
  const chartContainerStyle = mobileChartHeight
    ? { minHeight: mobileChartHeight, height: mobileChartHeight }
    : undefined;

  return (
    <MonitorWidgetFrame
      title="Performance Charts"
      subtitle={`Live ${metricLabel.toLowerCase()} trend`}
      icon={React.createElement(icon, { className: 'h-5 w-5 text-primary' })}
      status={headerStatus}
      actions={headerControls}
      className={cn('h-full flex flex-col', className)}
      contentClassName="flex flex-1 flex-col space-y-3 sm:space-y-4 px-2 py-2 sm:px-4 sm:py-4"
    >
      <div className={chartContainerClassName} style={chartContainerStyle}>
        <canvas
          ref={canvasRef}
          className="h-full w-full"
          onMouseMove={(event) => {
            if (!canvasRef.current || !displayPoints.length || !geometry) {
              setHoverText(null);
              setHoverPos(null);
              return;
            }
            const rect = canvasRef.current.getBoundingClientRect();
            const padLeft = metric === 'price' ? (isMobile ? 12 : 16) : isMobile ? 40 : 48;
            const padRight = metric === 'price' ? (isMobile ? 44 : 56) : isMobile ? 12 : 16;
            const padTop = isMobile ? 6 : 12;
            const padBottom = isMobile ? 20 : 32;
            const usableWidth = rect.width - (padLeft + padRight);
            const usableHeight = rect.height - (padTop + padBottom);
            const x = event.clientX - rect.left;
            if (x < padLeft || x > padLeft + usableWidth) {
              setHoverText(null);
              setHoverPos(null);
              return;
            }
            const ratio = (x - padLeft) / Math.max(1, usableWidth);
            const targetTime = geometry.minTime + geometry.rangeMs * ratio;
            const idx = findNearestIndex(geometry.times, targetTime);
            const point = displayPoints[idx];
            if (!point) {
              setHoverText(null);
              setHoverPos(null);
              return;
            }
            const value = Number(point.v ?? point.c ?? 0);
            const labelValue =
              metric === 'activity' ? formatInteger(value) : `$${formatNumber(value)}`;
            const label = `${formatTimeLocal(point.t)}  ·  ${labelValue}`;
            setHoverText(label);
            const yRange = Math.max(1e-9, maxV - minV);
            const yValue = padTop + usableHeight - ((value - minV) / yRange) * usableHeight;
            const xCenter =
              padLeft + ((geometry.times[idx] - geometry.minTime) / geometry.rangeMs) * usableWidth;
            setHoverPos({ x: xCenter, y: yValue });
          }}
          onMouseLeave={() => {
            setHoverText(null);
            setHoverPos(null);
          }}
        />
        {isLoading && (
          <div className="absolute inset-0 bg-background/60" aria-busy="true" aria-live="polite">
            {isMobile ? (
              <div className="absolute inset-2 flex h-16 items-end justify-center rounded-lg bg-gradient-to-br from-muted/40 to-muted/20 p-4">
                <div className="flex h-full w-full items-end gap-1">
                  {Array.from({ length: 10 }).map((_, index) => (
                    <div
                      key={index}
                      className="flex-1 animate-pulse rounded-sm bg-gradient-to-t from-muted to-muted/60"
                      style={{
                        height: `${20 + Math.random() * 50}%`,
                        animationDelay: `${index * 80}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="absolute inset-3 rounded-lg border border-border/40 bg-muted/40">
                <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted/50 to-muted/30" />
              </div>
            )}
          </div>
        )}
      </div>
    </MonitorWidgetFrame>
  );
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function formatNumber(value: number): string {
  const n = Number(value);
  const abs = Math.abs(n);
  if (!Number.isFinite(abs)) return '--';
  if (abs >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (abs >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (abs >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  if (abs >= 1) return n.toFixed(2);
  if (abs >= 0.01) return n.toFixed(4);
  return n.toPrecision(2);
}

function formatInteger(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  return Math.round(n).toLocaleString();
}

function toMs(value: unknown): number {
  const num = Number(value);
  if (Number.isFinite(num)) {
    return num < 10_000_000_000 ? num * 1000 : num;
  }
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.getTime() : Date.now();
}

function formatTimeLocal(timestamp: unknown): string {
  const t = typeof timestamp === 'number' ? timestamp : toMs(timestamp);
  const date = new Date(t);
  try {
    return date.toLocaleTimeString(getUserLocale(), {
      timeZone: getUserTimeZone(),
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  }
}

function sumValues(points: MetricsPoint[]): number {
  return points.reduce((acc, point) => acc + Number(point.v ?? 0), 0);
}

interface ChartGeometry {
  times: number[];
  minTime: number;
  maxTime: number;
  rangeMs: number;
  stepMs: number;
}

function buildTimeGeometry(points: MetricsPoint[], intervalMs: number): ChartGeometry | null {
  if (!points.length) return null;
  const times = points
    .map((point) => Number(point.t ?? 0))
    .filter((value) => Number.isFinite(value));
  if (!times.length) return null;
  const sorted = [...times].sort((a, b) => a - b);
  const minTime = sorted[0];
  const maxTime = sorted[sorted.length - 1];
  const step = Math.max(1, intervalMs);
  const range = Math.max(step, maxTime - minTime || step);
  return { times: sorted, minTime, maxTime, rangeMs: range, stepMs: step };
}

function findNearestIndex(times: number[], target: number): number {
  if (!times.length) return 0;
  let low = 0;
  let high = times.length - 1;
  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (times[mid] === target) return mid;
    if (times[mid] < target) low = mid + 1;
    else high = mid;
  }
  if (low === 0) return 0;
  const prev = times[low - 1];
  const curr = times[low];
  return Math.abs(curr - target) < Math.abs(target - prev) ? low : low - 1;
}
