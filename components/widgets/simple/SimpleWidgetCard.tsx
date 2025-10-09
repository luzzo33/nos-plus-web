'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';
import { useId } from 'react';

type SimpleWidgetCardVariant = 'default' | 'accent';

interface SimpleWidgetCardProps {
  children: ReactNode;
  className?: string;
  variant?: SimpleWidgetCardVariant;
  density?: 'compact' | 'cozy';
  disableHover?: boolean;
}

const variantStyles: Record<SimpleWidgetCardVariant, string> = {
  default: '',
  accent: 'border-[hsl(var(--accent-1)_/_0.35)]',
};

export function SimpleWidgetCard({
  children,
  className,
  variant = 'default',
  density = 'compact',
  disableHover = false,
}: SimpleWidgetCardProps) {
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      whileHover={disableHover ? undefined : { y: -2 }}
      className={cn(
        'card-base relative isolate flex flex-col overflow-hidden',
        'p-3 md:p-4',
        density === 'compact' ? 'density-compact gap-3 md:gap-4' : 'gap-4 md:gap-5',
        'text-[hsl(var(--text-primary))]',
        'focus-visible:outline-none focus-within:border-[hsl(var(--accent-1)_/_0.45)]',
        !disableHover && 'card-hover',
        variantStyles[variant],
        className,
      )}
      data-density={density}
    >
      {children}
    </motion.article>
  );
}

interface SimpleWidgetHeaderProps {
  icon?: ReactNode;
  title: string;
  meta?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SimpleWidgetHeader({
  icon,
  title,
  meta,
  description,
  action,
  className,
}: SimpleWidgetHeaderProps) {
  return (
    <div
      className={cn(
        'flex items-start justify-between gap-3 border-b border-[hsl(var(--border-card)_/_0.45)] pb-3',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--border-card)_/_0.6)] text-[hsl(var(--accent-1))]">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-[hsl(var(--text-primary))]">
            {title}
          </p>
          {description && (
            <p className="mt-1 text-xs font-medium text-[hsl(var(--text-secondary))]">
              {description}
            </p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-2 text-right md:flex-row md:items-center md:gap-3">
        {meta && <span className="type-meta">{meta}</span>}
        {action}
      </div>
    </div>
  );
}

interface SimpleWidgetValueProps {
  value: string | number;
  label?: string;
  unit?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const valueSizeMap: Record<NonNullable<SimpleWidgetValueProps['size']>, string> = {
  sm: 'text-base font-semibold',
  md: 'text-lg font-semibold',
  lg: 'kpi-standard',
  xl: 'kpi-large',
};

export function SimpleWidgetValue({
  value,
  label,
  unit,
  size = 'lg',
  align = 'start',
  className,
}: SimpleWidgetValueProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div
        className={cn(
          'flex items-baseline gap-2 text-[hsl(var(--text-primary))]',
          align === 'center' && 'justify-center text-center',
          align === 'end' && 'justify-end text-right',
        )}
      >
        <span className={cn(valueSizeMap[size], 'tracking-tight')}>{value}</span>
        {unit && (
          <span className="text-sm font-medium text-[hsl(var(--text-secondary))]">{unit}</span>
        )}
      </div>
      {label && (
        <span
          className={cn(
            'type-label',
            align === 'center' && 'text-center',
            align === 'end' && 'text-right',
          )}
        >
          {label}
        </span>
      )}
    </div>
  );
}

interface SimpleWidgetMetricProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export function SimpleWidgetMetric({
  label,
  value,
  icon,
  trend = 'neutral',
  className,
}: SimpleWidgetMetricProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 rounded-lg border border-transparent px-3 py-2 transition-colors',
        'bg-[hsl(var(--border-card)_/_0.12)] hover:border-[hsl(var(--border-card)_/_0.35)]',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        {icon && <span className="text-[hsl(var(--text-secondary))]">{icon}</span>}
        <span className="type-label">{label}</span>
      </div>
      <div className="flex items-center gap-2 text-sm font-semibold text-[hsl(var(--text-primary))]">
        {value}
        {trend !== 'neutral' && (
          <span
            className={cn(
              'text-xs font-semibold',
              trend === 'up' ? 'text-[hsl(var(--pos))]' : 'text-[hsl(var(--neg))]',
            )}
          >
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </div>
    </div>
  );
}

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  strokeWidth?: number;
  className?: string;
}

export function Sparkline({
  data,
  color = 'hsl(var(--accent-1))',
  height = 48,
  strokeWidth = 2,
  className,
}: SparklineProps) {
  const gradientId = useId();

  if (!data || data.length < 2) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((value, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <motion.svg
      initial={{ opacity: 0, scaleY: 0.9 }}
      animate={{ opacity: 1, scaleY: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      width="100%"
      height={height}
      className={cn('overflow-visible', className)}
      preserveAspectRatio="none"
      viewBox={`0 0 100 ${height}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.3} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <motion.polyline
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        points={points}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <motion.polygon
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.9 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        points={`0,${height} ${points} 100,${height}`}
        fill={`url(#${gradientId})`}
      />
    </motion.svg>
  );
}

interface SimpleRangeBarProps {
  minLabel: string;
  maxLabel: string;
  currentLabel?: string;
  progress: number;
  tone?: 'positive' | 'negative' | 'neutral';
  className?: string;
}

export function SimpleRangeBar({
  minLabel,
  maxLabel,
  currentLabel,
  progress,
  tone = 'neutral',
  className,
}: SimpleRangeBarProps) {
  const clampedProgress = Number.isFinite(progress) ? Math.min(Math.max(progress, 0), 1) : 0.5;
  const markerColor =
    tone === 'positive'
      ? 'border-[hsl(var(--pos))]'
      : tone === 'negative'
        ? 'border-[hsl(var(--neg))]'
        : 'border-[hsl(var(--accent-1))]';
  const markerBg =
    tone === 'positive'
      ? 'bg-[hsl(var(--pos)_/_0.25)]'
      : tone === 'negative'
        ? 'bg-[hsl(var(--neg)_/_0.25)]'
        : 'bg-[hsl(var(--accent-1)_/_0.25)]';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="range-bar">
        <span
          className="range-bar__fill"
          style={{ transform: `scaleX(${clampedProgress})` }}
          aria-hidden="true"
        />
        <span
          className={cn('range-bar__marker', markerBg, markerColor)}
          style={{ left: `${clampedProgress * 100}%` }}
          aria-hidden="true"
        />
      </div>
      <div className="flex items-center justify-between text-[11px] font-medium uppercase tracking-[0.08em]">
        <span className="text-[hsl(var(--text-secondary))]">{minLabel}</span>
        {currentLabel && <span className="text-[hsl(var(--text-primary))]">{currentLabel}</span>}
        <span className="text-[hsl(var(--text-secondary))]">{maxLabel}</span>
      </div>
    </div>
  );
}
