'use client';

import React from 'react';
import { cn } from '@/lib/utils';

export type MonitorWidgetStatusTone = 'success' | 'warning' | 'danger' | 'muted';

export interface MonitorWidgetStatus {
  label?: string;
  tone?: MonitorWidgetStatusTone;
  pulse?: boolean;
}

export interface MonitorWidgetFrameProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  status?: MonitorWidgetStatus;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
}

const toneMap: Record<MonitorWidgetStatusTone, string> = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  muted: 'bg-muted-foreground',
};

function StatusBadge({ status }: { status: MonitorWidgetStatus }) {
  const tone = status.tone ?? 'muted';
  const base = toneMap[tone] || toneMap.muted;

  return (
    <div className="flex items-center gap-2 rounded-full border border-border/40 bg-background/40 px-2.5 py-1 text-xs font-semibold text-foreground/80">
      <div className="relative h-2.5 w-2.5">
        <span className={cn('absolute inset-0 rounded-full', base)} aria-hidden="true" />
        {status.pulse && (
          <span
            className={cn('absolute inset-0 rounded-full', base, 'animate-ping opacity-40')}
            aria-hidden="true"
          />
        )}
      </div>
      {status.label && <span className="tracking-wide text-[11px] uppercase">{status.label}</span>}
    </div>
  );
}

export function MonitorWidgetFrame({
  title,
  subtitle,
  icon,
  actions,
  status,
  className,
  headerClassName,
  contentClassName,
  style,
  children,
}: MonitorWidgetFrameProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border/60 bg-card/90 shadow-xl backdrop-blur-sm transition-all',
        'hover:shadow-2xl hover:border-border/40',
        className,
      )}
      style={style}
    >
      <div className={cn('border-b border-border/60 px-4 py-3', headerClassName)}>
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              {icon && (
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  {icon}
                </div>
              )}
              <div className="flex min-w-0 flex-col">
                <h3 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs font-medium text-muted-foreground sm:text-sm">{subtitle}</p>
                )}
              </div>
            </div>
            {status && <StatusBadge status={status} />}
          </div>
          {actions && (
            <div className="flex w-full flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3">
              {actions}
            </div>
          )}
        </div>
      </div>

      <div className={cn('space-y-5 px-4 py-4 sm:space-y-6', contentClassName)}>{children}</div>
    </div>
  );
}
