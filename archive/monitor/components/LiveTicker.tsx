'use client';
import React, { useMemo } from 'react';
import { useMonitorStream } from '@/lib/monitor/useMonitorStream';
import { cn } from '@/lib/utils';

function format(n?: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  const v = Number(n);
  const a = Math.abs(v);
  if (a < 0.001) return '<0.001';
  if (a < 1) return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  if (a < 1000) return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  if (a < 1_000_000) return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  return (v / 1_000_000).toFixed(1) + 'M';
}

export function LiveTicker() {
  const { events, connected } = useMonitorStream({
    kinds: ['trade'],
    pollMs: 2500,
    bootstrapLimit: 120,
  });
  const chips = useMemo(() => {
    return events.slice(0, 60).map((e) => ({
      key: String(e.id),
      side: e.side,
      pair: `${e.baseSymbol ?? 'BASE'}/${e.quoteSymbol ?? 'QUOTE'}`,
      qty: format(e.baseAmount),
      usd: format(e.usdValue),
      price: format(e.price),
      time: new Date(e.occurredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }));
  }, [events]);

  return (
    <div className="rounded-xl border border-border overflow-hidden bg-card">
      <div className="h-9 flex items-center gap-3 px-3 text-xs border-b border-border/50">
        <span
          className={cn('h-2 w-2 rounded-full', connected ? 'bg-emerald-500' : 'bg-yellow-500')}
        />
        <span className="text-muted-foreground">Live Ticker</span>
      </div>
      <div className="relative h-10 overflow-hidden">
        <div className="absolute whitespace-nowrap animate-[ticker_30s_linear_infinite] will-change-transform">
          {chips.map((c, i) => (
            <span
              key={c.key}
              className={cn(
                'inline-flex items-center gap-2 px-2 py-1 mx-1 rounded border text-[11px]',
                c.side === 'buy'
                  ? 'border-emerald-300/50 text-emerald-600 bg-emerald-50/50'
                  : c.side === 'sell'
                    ? 'border-red-300/50 text-red-600 bg-red-50/50'
                    : 'border-border/50 text-foreground bg-background',
              )}
            >
              <span className="text-muted-foreground">{c.time}</span>
              <span
                className={cn(
                  'font-semibold',
                  c.side === 'buy'
                    ? 'text-emerald-600'
                    : c.side === 'sell'
                      ? 'text-red-600'
                      : 'text-foreground',
                )}
              >
                {c.side.toUpperCase()}
              </span>
              <span>{c.qty}</span>
              <span className="text-muted-foreground">@</span>
              <span>${c.price}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-mono">${c.usd}</span>
              <span className="text-muted-foreground">•</span>
              <span>{c.pair}</span>
            </span>
          ))}
          {/* duplicate to make loop seamless */}
          {chips.map((c, i) => (
            <span
              key={c.key + '-dup'}
              className={cn(
                'inline-flex items-center gap-2 px-2 py-1 mx-1 rounded border text-[11px]',
                c.side === 'buy'
                  ? 'border-emerald-300/50 text-emerald-600 bg-emerald-50/50'
                  : c.side === 'sell'
                    ? 'border-red-300/50 text-red-600 bg-red-50/50'
                    : 'border-border/50 text-foreground bg-background',
              )}
            >
              <span className="text-muted-foreground">{c.time}</span>
              <span
                className={cn(
                  'font-semibold',
                  c.side === 'buy'
                    ? 'text-emerald-600'
                    : c.side === 'sell'
                      ? 'text-red-600'
                      : 'text-foreground',
                )}
              >
                {c.side.toUpperCase()}
              </span>
              <span>{c.qty}</span>
              <span className="text-muted-foreground">@</span>
              <span>${c.price}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-mono">${c.usd}</span>
              <span className="text-muted-foreground">•</span>
              <span>{c.pair}</span>
            </span>
          ))}
        </div>
        <style jsx>{`
          @keyframes ticker {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
        `}</style>
      </div>
    </div>
  );
}
