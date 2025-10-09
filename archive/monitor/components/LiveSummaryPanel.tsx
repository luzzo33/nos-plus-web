'use client';
import React, { useMemo } from 'react';
import { useMonitorStream } from '@/lib/monitor/useMonitorStream';
import { cn } from '@/lib/utils';

function formatCompact(n?: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  const v = Number(n);
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a < 0.001) return '<0.001';
  if (a < 1) return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  if (a < 1000) return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  if (a < 1_000_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return (v / 1_000_000).toFixed(1) + 'M';
}

export function LiveSummaryPanel() {
  const { events, connected } = useMonitorStream({
    kinds: ['trade', 'limit_order', 'dca', 'dca_execution'],
    pollMs: 4000,
    bootstrapLimit: 240,
  });

  const { recent, totals } = useMemo(() => {
    const recent = events.slice(0, 8);
    const totals = events.slice(0, 200).reduce(
      (acc, e) => {
        const usd = Number(e.usdValue || 0);
        if (e.side === 'buy') acc.buy += usd;
        else if (e.side === 'sell') acc.sell += usd;
        return acc;
      },
      { buy: 0, sell: 0 },
    );
    return { recent, totals };
  }, [events]);

  const net = totals.buy - totals.sell;
  const netClass = net >= 0 ? 'text-emerald-600' : 'text-red-600';

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <div className="h-9 flex items-center gap-3 px-3 text-xs border-b border-border/50">
        <span
          className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-yellow-500')}
        />
        <span className="text-muted-foreground">Live Summary</span>
        <div className="ml-auto flex items-center gap-4 text-[11px]">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Buy</span>
            <span className="font-mono">${formatCompact(totals.buy)}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">Sell</span>
            <span className="font-mono">${formatCompact(totals.sell)}</span>
          </div>
          <div className={cn('flex items-center gap-2 font-semibold', netClass)}>
            <span className="text-muted-foreground">Net</span>
            <span className="font-mono">${formatCompact(Math.abs(net))}</span>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-2">
        {recent.map((e) => {
          const side = e.side;
          const pair = `${e.baseSymbol ?? 'BASE'}/${e.quoteSymbol ?? 'QUOTE'}`;
          return (
            <div
              key={String(e.id)}
              className={cn(
                'rounded-lg border px-2 py-1 text-[11px] font-mono',
                side === 'buy'
                  ? 'border-emerald-400/30 bg-emerald-500/10 dark:border-emerald-400/30 dark:bg-emerald-500/10'
                  : 'border-red-400/30 bg-red-500/10 dark:border-red-400/30 dark:bg-red-500/10',
              )}
            >
              <div className="flex items-center justify-between">
                <div
                  className={cn(
                    'font-semibold',
                    side === 'buy' ? 'text-emerald-600' : 'text-red-500',
                  )}
                >
                  {(side || '').toUpperCase()}
                </div>
                <div className="text-muted-foreground">
                  {new Date(e.occurredAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span>{formatCompact(e.baseAmount)}</span>
                <span className="text-muted-foreground">@</span>
                <span>${formatCompact(e.price)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="truncate">{pair}</div>
                <div className="font-mono">${formatCompact(e.usdValue)}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
