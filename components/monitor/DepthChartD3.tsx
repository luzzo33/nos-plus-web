'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { area as d3Area, curveStepAfter, line as d3Line } from 'd3-shape';
import { ticks as d3Ticks, max as d3Max, bisector } from 'd3-array';
import type { LimitWallDepthPoint } from '@/services/limitWall';

type DepthMode = 'base' | 'usd';

type Props = {
  bids: LimitWallDepthPoint[];
  asks: LimitWallDepthPoint[];
  depthMode: DepthMode;
  className?: string;
  onRequestDomain?: (domain: [number, number]) => void;
  midPrice?: number | null;
  dataDomain?: [number, number] | null;
};

type Point = { price: number; depth: number };

const DEPTH_CLAMP_PCT = 0.2;

function computeSeries(
  points: LimitWallDepthPoint[],
  side: 'bid' | 'ask',
  depthMode: DepthMode,
  mid: number,
  clampDomain?: [number, number] | null,
): Point[] {
  if (!Array.isArray(points) || points.length === 0) return [];
  const mapped: Point[] = points
    .map((p) => ({
      price: Number(p.price),
      depth: depthMode === 'usd' ? Number(p.cumulativeUsd ?? 0) : Number(p.cumulativeBase ?? 0),
    }))
    .filter((p) => Number.isFinite(p.price) && p.price > 0)
    .sort((a, b) => a.price - b.price);
  if (!mapped.length) return [];

  const originPoint = side === 'bid' ? mapped[mapped.length - 1] : mapped[0];

  let windowed = mapped;
  const hasExplicitDomain = Array.isArray(clampDomain) && clampDomain.length === 2;

  if (hasExplicitDomain) {
    const [minBoundRaw, maxBoundRaw] = clampDomain as [number, number];
    const minBound = Number.isFinite(minBoundRaw) ? Math.max(0, minBoundRaw) : 0;
    const maxBound = Number.isFinite(maxBoundRaw) ? maxBoundRaw : Number.POSITIVE_INFINITY;
    if (minBound < maxBound) {
      const within = mapped.filter((p) => p.price >= minBound && p.price <= maxBound);
      if (within.length >= 2) {
        const hasOrigin = within.some(
          (p) => p.price === originPoint.price && p.depth === originPoint.depth,
        );
        windowed = hasOrigin ? within : [...within, originPoint];
      } else if (within.length === 1) {
        windowed = within;
      }
    }
  } else if (mid > 0 && Number.isFinite(mid)) {
    const minBound = Math.max(0, mid * (1 - DEPTH_CLAMP_PCT));
    const maxBound = mid * (1 + DEPTH_CLAMP_PCT);
    const within = mapped.filter((p) => p.price >= minBound && p.price <= maxBound);
    if (within.length >= 2) {
      const hasOrigin = within.some(
        (p) => p.price === originPoint.price && p.depth === originPoint.depth,
      );
      windowed = hasOrigin ? within : [...within, originPoint];
    }
  }

  const seriesInput = [...windowed].sort((a, b) => a.price - b.price);
  if (!seriesInput.length) return [];

  const originIndex = side === 'bid' ? seriesInput.length - 1 : 0;
  const originDepth = seriesInput[originIndex].depth;
  const farDepth =
    side === 'bid' ? seriesInput[0].depth : seriesInput[seriesInput.length - 1].depth;
  const increasesAwayFromMid = farDepth >= originDepth;

  const normalised = seriesInput.map((p) => ({
    price: p.price,
    depth: Math.max(0, increasesAwayFromMid ? p.depth - originDepth : originDepth - p.depth),
  }));

  if (normalised.some((p) => p.depth > 0)) return normalised;

  const minDepth = Math.min(...seriesInput.map((p) => p.depth));
  return seriesInput.map((p) => ({ price: p.price, depth: Math.max(0, p.depth - minDepth) }));
}

function formatPriceTick(value: number, min: number, max: number): string {
  const range = Math.max(1e-12, max - min);
  let decimals = 2;
  if (range < 0.001) decimals = 6;
  else if (range < 0.01) decimals = 5;
  else if (range < 0.1) decimals = 4;
  else if (range < 1) decimals = 3;
  else decimals = 2;
  return value.toFixed(decimals);
}

function formatDepthTick(value: number, depthMode: DepthMode): string {
  if (depthMode === 'usd') {
    return value >= 1000 ? `$${(value / 1000).toFixed(0)}K` : `$${value.toFixed(0)}`;
  }
  return value >= 1000 ? `${(value / 1000).toFixed(1)}K` : `${value.toFixed(0)}`;
}

export default function DepthChartD3({
  bids,
  asks,
  depthMode,
  className,
  onRequestDomain,
  midPrice,
  dataDomain,
}: Props) {
  const clipId = useMemo(
    () => `plot-clip-${Math.random().toString(36).slice(2)}`,
    [
      /* once */
    ],
  );
  const computedMid = useMemo(() => {
    const validBids = bids.filter((b) => Number(b.price) > 0);
    const validAsks = asks.filter((a) => Number(a.price) > 0);
    const bestBid = validBids.length ? Math.max(...validBids.map((b) => Number(b.price))) : 0;
    const bestAsk = validAsks.length ? Math.min(...validAsks.map((a) => Number(a.price))) : 0;
    if (bestBid > 0 && bestAsk > 0) return (bestBid + bestAsk) / 2;
    return bestBid || bestAsk || 1;
  }, [bids, asks]);

  const mid = useMemo(() => {
    const candidate = Number(midPrice);
    if (Number.isFinite(candidate) && candidate > 0) return candidate;
    return computedMid;
  }, [computedMid, midPrice]);

  const clampDomain = useMemo<[number, number] | null>(() => {
    if (!dataDomain) return null;
    const [min, max] = dataDomain;
    if (!Number.isFinite(min) || !Number.isFinite(max) || max <= min) return null;
    return [Math.max(1e-9, min), max];
  }, [dataDomain]);

  const autoDomain = useMemo<[number, number]>(() => {
    if (clampDomain) {
      return clampDomain;
    }
    const pct = 0.2;
    const min = Math.max(1e-9, mid * (1 - pct));
    const max = mid * (1 + pct);
    if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0 || max <= min) {
      return [Math.max(1e-9, mid * 0.9), mid * 1.1];
    }
    return [min, max];
  }, [clampDomain, mid]);

  const left = useMemo(
    () => computeSeries(bids, 'bid', depthMode, mid, clampDomain),
    [bids, depthMode, mid, clampDomain],
  );
  const right = useMemo(
    () => computeSeries(asks, 'ask', depthMode, mid, clampDomain),
    [asks, depthMode, mid, clampDomain],
  );

  const [showBids, setShowBids] = useState<boolean>(true);
  const [showAsks, setShowAsks] = useState<boolean>(true);

  const bidRawBounds = useMemo(() => {
    const xs = bids.map((p) => Number(p.price)).filter((x) => Number.isFinite(x) && x > 0);
    if (xs.length < 1) return null;
    return [Math.min(...xs), Math.max(...xs)] as [number, number];
  }, [bids]);
  const askRawBounds = useMemo(() => {
    const xs = asks.map((p) => Number(p.price)).filter((x) => Number.isFinite(x) && x > 0);
    if (xs.length < 1) return null;
    return [Math.min(...xs), Math.max(...xs)] as [number, number];
  }, [asks]);

  const dataBounds = useMemo(() => {
    const allPrices: number[] = [];
    for (const p of bids) {
      const x = Number(p.price);
      if (Number.isFinite(x) && x > 0) allPrices.push(x);
    }
    for (const p of asks) {
      const x = Number(p.price);
      if (Number.isFinite(x) && x > 0) allPrices.push(x);
    }
    if (allPrices.length >= 2) {
      const minX = Math.min(...allPrices);
      const maxX = Math.max(...allPrices);
      if (minX < maxX) return [minX, maxX] as [number, number];
    }
    const span = mid * 0.1 || 0.1;
    return [Math.max(1e-9, mid - span), mid + span] as [number, number];
  }, [bids, asks, mid]);

  const allowedBounds = useMemo(() => {
    const factor = 3;
    const min = Math.max(1e-9, mid / factor);
    const max = Math.max(min * 1.01, mid * factor);
    return [min, max] as [number, number];
  }, [mid]);

  const defaultWindow = useMemo(() => {
    if (clampDomain) return clampDomain;
    const [a0, a1] = allowedBounds;
    const desiredHalf = Math.max(mid * 0.2, (a1 - a0) * 0.08);
    const maxHalf = Math.min(mid - a0, a1 - mid);
    const half = Math.max(Math.min(desiredHalf, maxHalf), (a1 - a0) * 0.005);
    return [mid - half, mid + half] as [number, number];
  }, [allowedBounds, mid, clampDomain]);

  const [viewDomain, setViewDomain] = useState<[number, number]>(defaultWindow);
  const userInteractedRef = useRef<boolean>(false);
  useEffect(() => {
    setViewDomain((prev) => {
      if (!prev) return defaultWindow;
      if (userInteractedRef.current) return prev;
      if (showBids && showAsks) return autoDomain;
      return prev;
    });
  }, [mid, allowedBounds, defaultWindow, showBids, showAsks, autoDomain]);

  useEffect(() => {
    if (!(showBids && showAsks)) return;
    if (userInteractedRef.current) return;
    const priceValues: number[] = [];
    for (const p of bids) {
      const v = Number(p.price);
      if (Number.isFinite(v) && v > 0) priceValues.push(v);
    }
    for (const p of asks) {
      const v = Number(p.price);
      if (Number.isFinite(v) && v > 0) priceValues.push(v);
    }
    if (priceValues.length < 2) return;
    const minPrice = Math.min(...priceValues);
    const maxPrice = Math.max(...priceValues);
    const priceSpan = Math.max(1e-12, maxPrice - minPrice);
    const [vd0, vd1] = viewDomain;
    const domainSpan = vd1 - vd0;
    if (domainSpan > priceSpan * 15 || mid < minPrice * 0.1) {
      const half = Math.min(priceSpan / 2, mid * 0.25 || priceSpan / 2);
      if (Number.isFinite(half) && half > 0) {
        const next: [number, number] = [Math.max(1e-9, mid - half), mid + half];
        setViewDomain(next);
      } else {
        setViewDomain([minPrice, maxPrice]);
      }
    }
  }, [showBids, showAsks, bids, asks, mid, viewDomain]);

  useEffect(() => {
    if (!userInteractedRef.current && showBids && showAsks) {
      setViewDomain(autoDomain);
    }
  }, [autoDomain, showBids, showAsks]);

  useEffect(() => {
    userInteractedRef.current = true;
    if (!showBids && !showAsks) {
      setShowBids(true);
      setShowAsks(true);
      return;
    }
    if (showBids && showAsks) {
      setViewDomain(defaultWindow);
      return;
    }
    if (showAsks && askRawBounds) {
      const [a0, a1] = askRawBounds;
      setViewDomain([Math.max(1e-9, a0), a1]);
      return;
    }
    if (showBids && bidRawBounds) {
      const [b0, b1] = bidRawBounds;
      setViewDomain([Math.max(1e-9, b0), b1]);
      return;
    }
  }, [showBids, showAsks]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      setSize({ w: Math.max(100, rect.width), h: Math.max(180, rect.height) });
    });
    ro.observe(el);
    const rect = el.getBoundingClientRect();
    setSize({ w: Math.max(100, rect.width), h: Math.max(180, rect.height) });
    return () => ro.disconnect();
  }, []);

  const maxDepth = useMemo(() => {
    const [v0, v1] = viewDomain;
    const lArr = showBids ? left : [];
    const rArr = showAsks ? right : [];
    const ld =
      d3Max(
        lArr.filter((p) => p.price >= v0 && p.price <= v1),
        (d) => d.depth,
      ) || 0;
    const rd =
      d3Max(
        rArr.filter((p) => p.price >= v0 && p.price <= v1),
        (d) => d.depth,
      ) || 0;
    return Math.max(1, ld, rd);
  }, [left, right, viewDomain, showBids, showAsks]);
  const bottomPad = 28;
  const leftPad = 50;
  const padding = { top: 10, right: 12, bottom: bottomPad, left: leftPad };
  const innerW = Math.max(10, size.w - padding.left - padding.right);
  const innerH = Math.max(10, size.h - padding.top - padding.bottom);

  const xDomain = useMemo<[number, number]>(() => {
    let [min, max] = viewDomain;
    if (showBids && left.length) {
      const bidMin = left[0].price;
      if (bidMin > min && bidMin < max) {
        min = bidMin;
      }
      if (!showAsks) {
        const bidMax = left[left.length - 1].price;
        if (bidMax < max && bidMax > min) {
          max = bidMax;
        }
      }
    }
    if (showAsks && right.length) {
      const askMax = right[right.length - 1].price;
      if (askMax < max && askMax > min) {
        max = askMax;
      }
      if (!showBids) {
        const askMin = right[0].price;
        if (askMin > min && askMin < max) {
          min = askMin;
        }
      }
    }
    if (!(showBids || showAsks)) {
      return viewDomain;
    }
    if (min >= max) {
      const epsilon = Math.max(Math.abs(min) * 1e-6, 1e-9);
      max = min + epsilon;
    }
    return [min, max] as [number, number];
  }, [viewDomain, showBids, showAsks, left, right]);

  const xScale = useMemo(() => scaleLinear().domain(xDomain).range([0, innerW]), [xDomain, innerW]);
  const yScale = useMemo(
    () => scaleLinear().domain([0, maxDepth]).range([innerH, 0]).nice(),
    [maxDepth, innerH],
  );

  const area = useMemo(
    () =>
      d3Area<Point>()
        .x((d) => xScale(d.price))
        .y0(yScale(0))
        .y1((d) => yScale(d.depth))
        .curve(curveStepAfter),
    [xScale, yScale],
  );

  const stroke = useMemo(
    () =>
      d3Line<Point>()
        .x((d) => xScale(d.price))
        .y((d) => yScale(d.depth))
        .curve(curveStepAfter),
    [xScale, yScale],
  );

  const priceTicks = useMemo(() => d3Ticks(xDomain[0], xDomain[1], 7), [xDomain]);
  const depthTicks = useMemo(() => d3Ticks(0, maxDepth, 4), [maxDepth]);

  const [hover, setHover] = useState<{
    x: number;
    y: number;
    price: number;
    depth: number;
    side: 'bid' | 'ask';
  } | null>(null);
  const bisectPrice = useMemo(() => bisector<Point, number>((d) => d.price).center, []);

  function updateHover(clientX: number, clientY: number) {
    const el = containerRef.current;
    if (!el) return setHover(null);
    const rect = el.getBoundingClientRect();
    const px = clientX - rect.left - padding.left;
    const py = clientY - rect.top - padding.top;
    if (px < 0 || px > innerW || py < 0 || py > innerH) return setHover(null);
    const price = xScale.invert(px);
    let side: 'bid' | 'ask';
    if (showBids && !showAsks) side = 'bid';
    else if (!showBids && showAsks) side = 'ask';
    else side = price <= mid ? 'bid' : 'ask';
    const arr = side === 'bid' ? left : right;
    if (!arr.length) return setHover(null);
    const idx = Math.max(0, Math.min(arr.length - 1, bisectPrice(arr, price)));
    const pt = arr[idx];
    setHover({
      x: padding.left + xScale(pt.price),
      y: padding.top + yScale(pt.depth),
      price: pt.price,
      depth: pt.depth,
      side,
    });
  }

  function zoom(factor: number) {
    userInteractedRef.current = true;
    const [v0, v1] = viewDomain;
    const curWidth = Math.max(1e-9, v1 - v0);
    const zoomingOut = factor > 1;
    if (showBids && showAsks) {
      const [a0, a1] = allowedBounds;
      const maxWidth = Math.max(1e-6, 2 * Math.min(mid - a0, a1 - mid));
      const minWidth = Math.max((a1 - a0) / 5000, mid * 1e-6);
      let newWidth = Math.max(minWidth, Math.min(maxWidth, curWidth * factor));
      let n0 = mid - newWidth / 2;
      let n1 = mid + newWidth / 2;
      const [d0, d1] = dataBounds;
      if (zoomingOut && typeof onRequestDomain === 'function') {
        const needLeft = n0 < d0;
        const needRight = n1 > d1;
        if (needLeft || needRight) {
          const pad = newWidth * 0.2;
          const want0 = Math.max(a0, Math.min(n0, d0) - pad);
          const want1 = Math.min(a1, Math.max(n1, d1) + pad);
          if (want1 > want0) onRequestDomain([want0, want1]);
        }
      }
      setViewDomain([n0, n1]);
      return;
    }
    const sideBounds = showAsks ? askRawBounds : bidRawBounds;
    if (!sideBounds) return;
    const [s0, s1] = sideBounds;
    const minWidth = Math.max((s1 - s0) / 5000, Math.min(s0, s1) * 1e-6);
    const maxWidth = Math.max(1e-6, s1 - s0);
    let newWidth = Math.max(minWidth, Math.min(maxWidth, curWidth * factor));
    const center = (s0 + s1) / 2;
    let n0 = center - newWidth / 2;
    let n1 = center + newWidth / 2;
    if (zoomingOut && typeof onRequestDomain === 'function') {
      const [d0, d1] = dataBounds;
      const needLeft = n0 < d0;
      const needRight = n1 > d1;
      if (needLeft || needRight) {
        const pad = newWidth * 0.2;
        const want0 = Math.max(1e-9, Math.min(n0, d0) - pad);
        const want1 = Math.max(n1, d1) + pad;
        if (want1 > want0) onRequestDomain([want0, want1]);
      }
    }
    if (n0 < s0) {
      const d = s0 - n0;
      n0 += d;
      n1 += d;
    }
    if (n1 > s1) {
      const d = n1 - s1;
      n0 -= d;
      n1 -= d;
    }
    setViewDomain([n0, n1]);
  }

  function onWheel(e: React.WheelEvent) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const mobileMinHeight = size.w && size.w < 480 ? 330 : 200;

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ minHeight: mobileMinHeight, position: 'relative' }}
      onWheel={onWheel}
      onMouseMove={(e) => updateHover(e.clientX, e.clientY)}
      onMouseLeave={() => setHover(null)}
    >
      <svg width={size.w} height={size.h} role="img" aria-label="Depth chart">
        <g transform={`translate(${padding.left},${padding.top})`}>
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={innerW} height={innerH} />
            </clipPath>
          </defs>
          {/* All plot elements inside clip so they don't overlap axes */}
          <g clipPath={`url(#${clipId})`}>
            {/* Grid: horizontal */}
            {depthTicks.map((t, i) => (
              <line
                key={`dg-${i}`}
                x1={0}
                y1={yScale(t)}
                x2={innerW}
                y2={yScale(t)}
                stroke="rgba(125,125,125,0.2)"
                strokeDasharray="3 3"
              />
            ))}
            {priceTicks.map((t, i) => (
              <line
                key={`pg-${i}`}
                x1={xScale(t)}
                y1={0}
                x2={xScale(t)}
                y2={innerH}
                stroke="rgba(125,125,125,0.12)"
              />
            ))}

            {/* Areas */}
            {showBids && left.length > 0 && (
              <g>
                <path d={area(left) || undefined} fill="#22c55eAA" />
                <path d={stroke(left) || undefined} fill="none" stroke="#22c55e" strokeWidth={2} />
              </g>
            )}
            {showAsks && right.length > 0 && (
              <g>
                <path d={area(right) || undefined} fill="#ef4444AA" />
                <path d={stroke(right) || undefined} fill="none" stroke="#ef4444" strokeWidth={2} />
              </g>
            )}
            {/* Mid line only when both sides visible */}
            {showBids && showAsks && (
              <line
                x1={xScale(mid)}
                y1={0}
                x2={xScale(mid)}
                y2={innerH}
                stroke="#9ca3af"
                strokeDasharray="4 4"
              />
            )}
          </g>

          {/* Axes labels */}
          {/* Y-axis */}
          {depthTicks.map((t, i) => (
            <text
              key={`dl-${i}`}
              x={-8}
              y={yScale(t)}
              dominantBaseline="middle"
              textAnchor="end"
              fill="#6b7280"
              fontSize={10}
            >
              {formatDepthTick(t, depthMode)}
            </text>
          ))}
          {priceTicks.map((t, i) => (
            <text
              key={`pl-${i}`}
              x={xScale(t)}
              y={innerH + 14}
              dominantBaseline="hanging"
              textAnchor="middle"
              fill="#6b7280"
              fontSize={9}
            >
              {formatPriceTick(t, xDomain[0], xDomain[1])}
            </text>
          ))}

          {/* Axis lines (above clipped plots) */}
          <line x1={0} y1={innerH} x2={innerW} y2={innerH} stroke="#d1d5db" />
          <line x1={0} y1={0} x2={0} y2={innerH} stroke="#d1d5db" />

          {/* Edge indicators removed per spec */}

          {/* Hover crosshair/marker */}
          {hover && (
            <g pointerEvents="none">
              <line
                x1={hover.x - padding.left}
                y1={0}
                x2={hover.x - padding.left}
                y2={innerH}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              <line
                x1={0}
                y1={hover.y - padding.top}
                x2={innerW}
                y2={hover.y - padding.top}
                stroke="#94a3b8"
                strokeDasharray="3 3"
              />
              <circle
                cx={hover.x - padding.left}
                cy={hover.y - padding.top}
                r={3}
                fill={hover.side === 'bid' ? '#22c55e' : '#ef4444'}
              />
            </g>
          )}
        </g>
      </svg>
      {/* Zoom controls */}
      <div style={{ position: 'absolute', right: 8, top: 8, display: 'flex', gap: 6, zIndex: 20 }}>
        <button
          aria-label="Zoom in"
          onClick={() => zoom(0.7)}
          className="px-2 py-1 text-xs rounded border border-border bg-background hover:bg-muted"
        >
          +
        </button>
        <button
          aria-label="Zoom out"
          onClick={() => zoom(1.3)}
          className="px-2 py-1 text-xs rounded border border-border bg-background hover:bg-muted"
        >
          −
        </button>
        <button
          aria-label="Toggle bids"
          onClick={() => {
            userInteractedRef.current = true;
            setShowBids((v) => (v ? (showAsks ? false : true) : true));
          }}
          className={`px-2 py-1 text-xs rounded border border-border ${showBids ? 'bg-emerald-500/20 text-emerald-600' : 'bg-background hover:bg-muted'}`}
        >
          Bids
        </button>
        <button
          aria-label="Toggle asks"
          onClick={() => {
            userInteractedRef.current = true;
            setShowAsks((v) => (v ? (showBids ? false : true) : true));
          }}
          className={`px-2 py-1 text-xs rounded border border-border ${showAsks ? 'bg-red-500/20 text-red-600' : 'bg-background hover:bg-muted'}`}
        >
          Asks
        </button>
        <button
          aria-label="Center on Mid"
          onClick={() => {
            userInteractedRef.current = true;
            if (showBids && showAsks) {
              const [a0, a1] = allowedBounds;
              const maxWidth = 2 * Math.min(mid - a0, a1 - mid);
              const width = Math.max(1e-6, Math.min(maxWidth, viewDomain[1] - viewDomain[0]));
              const next: [number, number] = [mid - width / 2, mid + width / 2];
              setViewDomain(next);
            } else if (showAsks && askRawBounds) {
              const [a0, a1] = askRawBounds;
              const span = Math.max(1e-6, a1 - a0);
              const width = Math.min(span, Math.max(1e-6, viewDomain[1] - viewDomain[0]));
              const c = (a0 + a1) / 2;
              setViewDomain([c - width / 2, c + width / 2]);
            } else if (showBids && bidRawBounds) {
              const [b0, b1] = bidRawBounds;
              const span = Math.max(1e-6, b1 - b0);
              const width = Math.min(span, Math.max(1e-6, viewDomain[1] - viewDomain[0]));
              const c = (b0 + b1) / 2;
              setViewDomain([c - width / 2, c + width / 2]);
            }
          }}
          className="px-2 py-1 text-xs rounded border border-border bg-background hover:bg-muted"
        >
          Center
        </button>
        <button
          aria-label="Reset"
          onClick={() => {
            userInteractedRef.current = false;
            if (showBids && showAsks) setViewDomain(defaultWindow);
            else if (showAsks && askRawBounds) {
              const [a0, a1] = askRawBounds;
              setViewDomain([Math.max(1e-9, a0), a1]);
            } else if (showBids && bidRawBounds) {
              const [b0, b1] = bidRawBounds;
              setViewDomain([Math.max(1e-9, b0), b1]);
            }
          }}
          className="px-2 py-1 text-xs rounded border border-border bg-background hover:bg-muted"
        >
          Reset
        </button>
      </div>
      {/* Tooltip */}
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(Math.max(8, hover.x + 8), Math.max(8, size.w - 160)),
            top: Math.max(8, hover.y - 28),
            zIndex: 10,
          }}
          className="rounded bg-popover text-popover-foreground border border-border shadow px-2 py-1 text-[11px] font-mono"
        >
          <div>{hover.side.toUpperCase()}</div>
          <div>Price: {formatPriceTick(hover.price, xDomain[0], xDomain[1])}</div>
          <div>
            {depthMode === 'usd' ? 'Cum USD' : 'Cum Amount'}:{' '}
            {formatDepthTick(hover.depth, depthMode)}
          </div>
        </div>
      )}
    </div>
  );
}
