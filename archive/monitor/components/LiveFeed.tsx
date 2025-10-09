'use client';
import React, { useMemo, useState, useCallback } from 'react';
import { useMonitorStream } from '@/lib/monitor/useMonitorStream';
import { useRelativeTime } from '@/lib/monitor/useRelativeTime';
import { toDate } from '@/lib/time';
import type { LiveMonitorEvent } from '@/lib/monitor/liveTypes';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, TrendingUp, TrendingDown, ExternalLink, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  MONITOR_EXCHANGES,
  buildDefaultExchangeSelection,
  selectedVenues as resolveSelectedVenues,
  type MonitorExchangeSelection,
} from '@/lib/monitor/exchanges';
import { usePlanModal } from '@/components/monitor/PlanModalProvider';
import type { PlanType } from '@/components/monitor/PlanModalProvider';

function formatCompact(raw: unknown) {
  if (raw === null || raw === undefined) return '';
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return '';
  const abs = Math.abs(n);
  if (abs === 0) return '0';
  if (abs < 0.001 && abs > 0) return '<0.001';
  if (abs < 0.01) return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  if (abs < 1) return n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');
  if (abs < 1000) return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  if (abs < 1_000_000) return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (n / 1_000_000).toFixed(2) + 'M';
}

function deriveDisplayTotal(evt: LiveMonitorEvent): { value: number | null; symbol: string } {
  const usd =
    evt.usdValue != null && Number.isFinite(Number(evt.usdValue)) && Number(evt.usdValue) > 0
      ? Number(evt.usdValue)
      : null;
  if (usd != null) return { value: usd, symbol: '$' };
  const q = (evt.quoteSymbol || '').toUpperCase();
  const isUsdStable =
    q === 'USDC' || q === 'USDT' || q === 'USD' || q === 'UST' || q === 'USDC.SOL';
  const isEur = q === 'EUR';
  const baseAmt = evt.baseAmount != null ? Number(evt.baseAmount) : null;
  const quoteAmt = evt.quoteAmount != null ? Number(evt.quoteAmount) : null;
  const price = evt.price != null ? Number(evt.price) : null;
  if (isUsdStable) {
    if (quoteAmt != null && quoteAmt > 0) return { value: quoteAmt, symbol: '$' };
    if (price != null && baseAmt != null && baseAmt > 0)
      return { value: price * baseAmt, symbol: '$' };
  }
  if (isEur) {
    if (quoteAmt != null && quoteAmt > 0) return { value: quoteAmt, symbol: '€' };
    if (price != null && baseAmt != null && baseAmt > 0)
      return { value: price * baseAmt, symbol: '€' };
  }
  return { value: null, symbol: '$' };
}

function formatUtcTimestamp(iso: string | undefined): string {
  if (!iso) return '';
  const d = toDate(iso);
  if (!d) return '';
  const isoStr = d.toISOString();
  return `${isoStr.slice(0, 19).replace('T', ' ')} UTC`;
}

function TransactionRow({ evt, index }: { evt: LiveMonitorEvent; index: number }) {
  const rel = useRelativeTime(evt.occurredAt, 1000);
  const total = deriveDisplayTotal(evt);
  const usdValue = total.value ?? 0;
  const isLimitFill = Boolean(evt.linkedLimitOrder);
  const isDcaFill = Boolean(evt.linkedDca);
  const kindLower = (evt.kind || '').toLowerCase();
  const planLinkId = evt.linkedPlanId ?? (evt.planId != null ? String(evt.planId) : null);
  const planType: PlanType | null = planLinkId
    ? ((evt.planType as PlanType | undefined) ??
      (isLimitFill || kindLower.includes('limit') ? 'limit' : 'dca'))
    : null;
  const meta = evt.metadata as Record<string, unknown> | null | undefined;
  const metaActionRaw = meta?.action ?? meta?.status ?? meta?.state;
  const metaAction = typeof metaActionRaw === 'string' ? metaActionRaw.toLowerCase() : null;
  const { openPlan } = usePlanModal();

  const baseSideLabel = evt.side === 'buy' ? 'BUY' : evt.side === 'sell' ? 'SELL' : 'TRADE';
  let displayLabel = baseSideLabel;
  if (isLimitFill) {
    displayLabel = `${baseSideLabel} (LIMIT FILL)`;
  } else if (isDcaFill) {
    displayLabel = `${baseSideLabel} (DCA FILL)`;
  } else if (kindLower.includes('limit')) {
    let base = 'LIMIT ORDER';
    if (metaAction === 'open') base = 'LO PLACED';
    else if (metaAction === 'closed') base = 'LO CLOSED';
    else if (metaAction === 'updated') base = 'LO UPDATE';
    displayLabel = `${base}${evt.side ? ` (${evt.side.toUpperCase()})` : ''}`;
  } else if (kindLower.includes('dca')) {
    let base = 'DCA ORDER';
    if (metaAction === 'open') base = 'DCA PLACED';
    else if (metaAction === 'closed') base = 'DCA CLOSED';
    else if (metaAction === 'updated') base = 'DCA UPDATE';
    displayLabel = `${base}${evt.side ? ` (${evt.side.toUpperCase()})` : ''}`;
  }

  const sideConfig =
    evt.side === 'buy'
      ? {
          color: 'text-emerald-600 dark:text-emerald-400',
          bg: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/30',
          icon: TrendingUp,
          label: displayLabel,
        }
      : evt.side === 'sell'
        ? {
            color: 'text-red-600 dark:text-red-400',
            bg: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/30',
            icon: TrendingDown,
            label: displayLabel,
          }
        : {
            color: 'text-muted-foreground',
            bg: 'bg-muted/10 border-border dark:bg-muted/5 dark:border-border/30',
            icon: Activity,
            label: displayLabel,
          };

  const baseLabel =
    evt.baseSymbol ??
    (evt.baseMint ? `${evt.baseMint.slice(0, 4)}…${evt.baseMint.slice(-4)}` : '—');
  const quoteLabel =
    evt.quoteSymbol ??
    (evt.quoteMint ? `${evt.quoteMint.slice(0, 4)}…${evt.quoteMint.slice(-4)}` : '—');
  const isLimitPlacement = !isLimitFill && kindLower.includes('limit');
  const isDcaPlacement = !isDcaFill && kindLower.includes('dca');
  const limitPlacementLabel =
    metaAction === 'open'
      ? 'limit order placed'
      : metaAction === 'closed'
        ? 'limit order closed'
        : metaAction === 'updated'
          ? 'limit order updated'
          : 'limit order event';
  const dcaPlacementLabel =
    metaAction === 'open'
      ? 'DCA order placed'
      : metaAction === 'closed'
        ? 'DCA order closed'
        : metaAction === 'updated'
          ? 'DCA order updated'
          : 'DCA order event';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ delay: index * 0.02 }}
      className={cn(
        'relative rounded-lg border p-4 transition-all duration-200 hover:shadow-sm',
        sideConfig.bg,
        usdValue >= 10000 && 'ring-2 ring-orange-300 dark:ring-orange-600/50',
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'p-2 rounded-lg bg-background/50 dark:bg-background/20',
              sideConfig.color,
            )}
          >
            <sideConfig.icon className="w-4 h-4" />
          </div>
          <div>
            <div className="font-semibold text-foreground">
              {sideConfig.label} {baseLabel}/{quoteLabel}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatCompact(evt.baseAmount)} for ${formatCompact(evt.price)} • {rel}
              {(() => {
                const utcLabel = formatUtcTimestamp(evt.occurredAt);
                return utcLabel ? ` • ${utcLabel}` : '';
              })()}
              {isLimitFill && ' • limit fill'}
              {isDcaFill && ' • DCA fill'}
              {isLimitPlacement && ` • ${limitPlacementLabel}`}
              {isDcaPlacement && ` • ${dcaPlacementLabel}`}
              {(isLimitFill || isDcaFill || isLimitPlacement || isDcaPlacement) && ' • …'}
              {planLinkId && planType && (
                <>
                  {' • '}
                  <button
                    type="button"
                    className="text-primary underline decoration-dotted hover:text-primary/80"
                    onClick={() => openPlan({ planType, planId: planLinkId })}
                  >
                    view plan
                  </button>
                </>
              )}
              {' • ID:'} <span className="font-mono text-xs">{String(evt.id)}</span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="font-bold text-foreground">
            {total.value != null ? `${total.symbol}${formatCompact(total.value)}` : '—'}
          </div>
          {evt.txHash ? (
            <a
              className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 justify-end mt-1"
              href={`https://solscan.io/tx/${evt.txHash}`}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="w-3 h-3" />
              View TX
            </a>
          ) : evt.tradeUrl || evt.marketUrl ? (
            <a
              className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1 justify-end mt-1"
              href={(evt.tradeUrl || evt.marketUrl) as string}
              target="_blank"
              rel="noreferrer"
            >
              <ExternalLink className="w-3 h-3" />
              Open
            </a>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

export function LiveFeed() {
  const [sideFilter, setSideFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [minUsdFilter, setMinUsdFilter] = useState<number>(0);
  const [customMinUsd, setCustomMinUsd] = useState('');
  const [displayLimit, setDisplayLimit] = useState<number>(100);
  const [search, setSearch] = useState('');
  const [selectedExchanges, setSelectedExchanges] = useState<MonitorExchangeSelection>(() =>
    buildDefaultExchangeSelection(MONITOR_EXCHANGES),
  );
  const toggleExchange = useCallback((id: string) => {
    setSelectedExchanges((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      if (Object.values(next).some(Boolean)) return next;
      return prev;
    });
  }, []);
  const activeVenueSlugs = useMemo(
    () => resolveSelectedVenues(selectedExchanges, MONITOR_EXCHANGES),
    [selectedExchanges],
  );

  const { events, connected, error, loadMore, loadingMore } = useMonitorStream({
    kinds: ['trade', 'limit_order', 'dca', 'dca_execution'],
    pollMs: 4000,
    bootstrapLimit: 300,
    side: sideFilter === 'all' ? undefined : sideFilter,
    minUsd: minUsdFilter || undefined,
    venues: activeVenueSlugs.length ? activeVenueSlugs : undefined,
  });

  const display = useMemo(() => {
    const term = search.trim().toLowerCase();
    return events
      .slice()
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .filter((evt) => {
        if (!term) return true;
        const idStr = String(evt.id).toLowerCase();
        if (idStr.includes(term)) return true;
        const venue = (evt.venue || '').toLowerCase();
        if (venue.includes(term)) return true;
        const base = (evt.baseSymbol || '').toLowerCase();
        if (base.includes(term)) return true;
        const quote = (evt.quoteSymbol || '').toLowerCase();
        if (quote.includes(term)) return true;
        return false;
      });
  }, [events, search]);

  const handleCustomThreshold = (value: string) => {
    setCustomMinUsd(value);
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      setMinUsdFilter(Math.max(0, parsed));
    }
  };

  const stats = useMemo(() => {
    const recent = display.slice(0, 20);
    const totalValue = recent.reduce((sum, evt) => sum + (evt.usdValue ?? 0), 0);
    const buyCount = recent.filter((evt) => evt.side === 'buy').length;
    const sellCount = recent.filter((evt) => evt.side === 'sell').length;

    return {
      totalValue,
      buyCount,
      sellCount,
      totalTx: recent.length,
    };
  }, [display]);

  return (
    <div className="rounded-xl border border-border bg-card dark:bg-card/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border/50 dark:border-border/30 bg-muted/20 dark:bg-muted/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <div>
              <h3 className="font-semibold text-foreground">Live Transaction Feed</h3>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>
                  {display.length} events • {connected ? 'Connected' : 'Connecting...'}
                </span>
                <span>
                  <DollarSign className="w-3 h-3 inline mr-1" />${formatCompact(stats.totalValue)}{' '}
                  volume
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div className="space-y-4">
          {/* Search */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">Search:</span>
            <input
              type="text"
              value={search}
              placeholder="id / venue / base / quote"
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-2 text-sm border border-border rounded-lg bg-background dark:bg-background/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-64"
            />
          </div>
          {/* Venue Filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-foreground">Venues:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {MONITOR_EXCHANGES.map((ex) => {
                const checked = !!selectedExchanges[ex.id];
                return (
                  <label
                    key={ex.id}
                    className={cn(
                      'flex items-center gap-1.5 rounded border px-2 py-1 text-xs font-medium transition-all duration-200 cursor-pointer',
                      checked
                        ? 'border-primary/50 bg-primary/10 text-primary'
                        : 'border-border/60 bg-background/50 text-muted-foreground hover:text-foreground hover:border-border',
                    )}
                  >
                    <input
                      type="checkbox"
                      className="h-3 w-3 accent-primary"
                      checked={checked}
                      onChange={() => toggleExchange(ex.id)}
                    />
                    <span>{ex.label}</span>
                  </label>
                );
              })}
            </div>
          </div>
          {/* Side Filter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Side:</span>
              <div className="flex rounded border border-border bg-background dark:bg-background/50 p-1">
                {(['all', 'buy', 'sell'] as const).map((opt) => (
                  <button
                    key={opt}
                    onClick={() => setSideFilter(opt)}
                    className={cn(
                      'px-3 py-1 text-xs rounded transition-colors',
                      sideFilter === opt
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground',
                    )}
                  >
                    {opt === 'all' ? 'All' : opt === 'buy' ? 'Buy' : 'Sell'}
                  </button>
                ))}
              </div>
            </div>

            {/* Display Limit */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Show:</span>
              <div className="flex rounded border border-border bg-background dark:bg-background/50 p-1">
                {[50, 100, 200, 500].map((limit) => (
                  <button
                    key={limit}
                    onClick={() => setDisplayLimit(limit)}
                    className={cn(
                      'px-3 py-1 text-xs rounded transition-colors',
                      displayLimit === limit
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground',
                    )}
                  >
                    {limit}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* USD Value Filter */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Min USD Value:</span>
              <div className="flex rounded border border-border bg-background dark:bg-background/50 p-1">
                {[0, 100, 1000, 10000].map((val) => (
                  <button
                    key={val}
                    onClick={() => {
                      setMinUsdFilter(val);
                      setCustomMinUsd('');
                    }}
                    className={cn(
                      'px-3 py-1 text-xs rounded transition-colors',
                      minUsdFilter === val && customMinUsd === ''
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted text-muted-foreground',
                    )}
                  >
                    {val === 0 ? 'All' : `$${val.toLocaleString()}+`}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Threshold Input */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">Custom:</span>
              <input
                type="number"
                min={0}
                value={customMinUsd}
                placeholder="Enter custom USD threshold"
                className="px-3 py-2 text-sm border border-border rounded-lg bg-background dark:bg-background/50 focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all w-48"
                onChange={(e) => handleCustomThreshold(e.target.value)}
                onBlur={(e) => handleCustomThreshold(e.target.value)}
              />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800/30 text-yellow-800 dark:text-yellow-300 text-sm">
            Connection issue: {error}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="max-h-[600px] overflow-auto">
        {display.length === 0 ? (
          <div className="p-8 text-center">
            <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
            <h4 className="font-medium mb-1 text-foreground">No transactions found</h4>
            <p className="text-sm text-muted-foreground">
              {connected
                ? 'Try adjusting your filters or wait for new activity...'
                : 'Connecting to live feed...'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {display.slice(0, displayLimit).map((evt, index) => {
                const compositeKey = `${evt.venue || 'unknown'}:${evt.id}`;
                return <TransactionRow key={compositeKey} evt={evt} index={index} />;
              })}
            </AnimatePresence>

            {display.length > displayLimit && (
              <div className="text-center text-sm text-muted-foreground py-4 border-t border-border/30">
                <div className="space-y-2">
                  <div>
                    Showing {displayLimit} of {display.length} transactions
                  </div>
                  <button
                    onClick={() => setDisplayLimit((prev) => Math.min(prev + 100, display.length))}
                    className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    Show 100 More
                  </button>
                  <div>
                    <button
                      onClick={() => loadMore()}
                      disabled={loadingMore}
                      className="mt-2 px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted/50 transition-colors disabled:opacity-50"
                    >
                      {loadingMore ? 'Loading…' : 'Load More'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
