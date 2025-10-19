'use client';

import type { StakingWidgetData } from '@/lib/api/types';
import { Layers, Gauge } from 'lucide-react';
import { cn } from '@/lib/utils';

type NetworkSnapshotProps = {
  className?: string;
  widget?: StakingWidgetData;
};

export function NetworkSnapshot({ widget, className }: NetworkSnapshotProps) {
  return (
    <div className={cn('card-base border border-border/70 bg-background/95 p-5 md:p-6', className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Network snapshot</h2>
          <p className="text-sm text-muted-foreground">
            Live xNOS supply & APR context pulled from the staking API for quick orientation.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 min-w-[260px]">
          <div className="rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 text-primary p-2">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Total xNOS</span>
              <div className="text-lg font-semibold">
                {widget ? widget.xnos.display : '—'}
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-secondary/50 px-4 py-3 flex items-center gap-3">
            <div className="rounded-xl bg-primary/10 text-primary p-2">
              <Gauge className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Current APR</span>
              <div className={cn('text-lg font-semibold', widget?.apr.current ? 'text-emerald-500' : undefined)}>
                {widget ? widget.apr.display : '—'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
