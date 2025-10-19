'use client';

import { useMemo, useState, useCallback } from 'react';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { Filter, ExternalLink, Search, Settings, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { StakingEarningsEvent } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

const DIRECTION_WEIGHTS: Record<string, number> = {
  purchase: 1,
  transfer_in: 1,
  stake_withdrawal: 1,
  sale: -1,
  transfer_out: -1,
  stake_deposit: -1,
  stake_slash: -1,
};

type TypePalette = Record<
  string,
  {
    label: string;
    color: string;
  }
>;

type TimeDisplayMode = 'relative' | 'absolute';

type WalletTransactionsSectionProps = {
  className?: string;
  events: StakingEarningsEvent[];
  palette: TypePalette;
  loading?: boolean;
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortBy: 'timestamp' | 'type' | 'amount' | 'usdValue' | 'priceUsd';
  sortOrder: 'asc' | 'desc';
  onSortChange: (column: WalletTransactionsSectionProps['sortBy']) => void;
  timeDisplayMode: TimeDisplayMode;
  onOpenSettings: () => void;
  totalEvents: number;
  errorMessage?: string | null;
};

function formatNos(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: 4 });
}

function formatUsd(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function extractMetadataDetails(metadata: unknown): string[] {
  if (!metadata) return [];
  if (typeof metadata === 'string') return [metadata];
  if (typeof metadata !== 'object') return [];

  const record = metadata as Record<string, unknown>;
  const details: string[] = [];
  if (record.instruction) {
    details.push(`Instruction: ${String(record.instruction)}`);
  }
  if (record.vaultAccount) {
    details.push(`Vault: ${String(record.vaultAccount)}`);
  }
  if (record.stakeAccount) {
    details.push(`Stake: ${String(record.stakeAccount)}`);
  }
  if (record.walletDelta != null) {
    details.push(`Wallet Δ: ${Number(record.walletDelta).toFixed(4)} NOS`);
  }
  if (record.vaultDelta != null) {
    details.push(`Vault Δ: ${Number(record.vaultDelta).toFixed(4)} NOS`);
  }
  return details;
}

export function WalletTransactionsSection({
  className,
  events,
  palette,
  loading = false,
  page,
  totalPages,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
  timeDisplayMode,
  onOpenSettings,
  totalEvents,
  errorMessage,
}: WalletTransactionsSectionProps) {
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    events.forEach((event) => initial.add(event.type));
    return initial;
  });
  const [searchTerm, setSearchTerm] = useState('');

  const typeStats = useMemo(() => {
    const stats: Record<string, { label: string; count: number; amount: number; color: string }> = {};
    events.forEach((event) => {
      const entry = stats[event.type] || {
        label: palette[event.type]?.label ?? event.type.replace(/_/g, ' '),
        count: 0,
        amount: 0,
        color: palette[event.type]?.color ?? '#6366f1',
      };
      entry.count += 1;
      entry.amount += event.amount ?? 0;
      stats[event.type] = entry;
    });
    return stats;
  }, [events, palette]);

  const handleToggleType = useCallback(
    (type: string) => {
      setSelectedTypes((prev) => {
        const next = new Set(prev);
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
        return next;
      });
    },
    [setSelectedTypes],
  );

  const processedEvents = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return events
      .map((event) => {
        let metadata = event.metadata;
        if (metadata && typeof metadata === 'string') {
          try {
            metadata = JSON.parse(metadata);
          } catch {
            metadata = event.metadata;
          }
        }
        return { ...event, metadata };
      })
      .filter((event) => {
        if (selectedTypes.size && !selectedTypes.has(event.type)) {
          return false;
        }
        if (!term) return true;
        const haystack = [event.signature, event.type, JSON.stringify(event.metadata ?? {})]
          .join(' ')
          .toLowerCase();
        return haystack.includes(term);
      });
  }, [events, selectedTypes, searchTerm]);

  const renderSortIcon = (column: WalletTransactionsSectionProps['sortBy']) => {
    if (sortBy !== column) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-primary" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-primary" />
    );
  };

  const handleHeaderClick = (column: WalletTransactionsSectionProps['sortBy']) => {
    onSortChange(column);
  };

  const formatTimestampDisplay = (value?: string | null) => {
    if (!value) return '—';
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return value;
      if (timeDisplayMode === 'relative') {
        return `${formatDistanceToNowStrict(date)} ago`;
      }
      return format(date, 'PPpp');
    } catch {
      return value;
    }
  };

  const totalFiltered = processedEvents.length;

  return (
    <div className={cn('card-base p-6 md:p-8 border border-border/70 bg-background/95', className)}>
      <div className="flex flex-col gap-6">
        {errorMessage ? (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-500">
            {errorMessage}
          </div>
        ) : null}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg md:text-xl font-semibold tracking-tight">Transaction stream</h2>
            <p className="text-sm text-muted-foreground">
              Complete chronology of classified staking-related events with Solana on-chain context.
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Filter className="h-4 w-4" />
            <span>
              Showing {totalFiltered} / {totalEvents.toLocaleString()} events
            </span>
            <button
              onClick={onOpenSettings}
              className="ml-3 inline-flex items-center gap-1 rounded-full border border-border/60 px-3 py-1 text-xs font-semibold text-foreground transition hover:bg-secondary"
            >
              <Settings className="h-3.5 w-3.5" /> Settings
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-md flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search signature, instruction, or account"
              className="w-full rounded-lg border border-border/70 bg-background pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeStats).map(([type, stats]) => {
              const active = selectedTypes.size === 0 || selectedTypes.has(type);
              return (
                <button
                  key={type}
                  onClick={() => handleToggleType(type)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-xs font-semibold transition border',
                    active
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'border-border/70 text-muted-foreground hover:text-foreground hover:border-border',
                  )}
                >
                  {stats.label}{' '}
                  <span className="opacity-80 font-normal">({stats.count})</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-secondary/60">
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                {[
                  { key: 'timestamp', label: 'Time', align: 'left' },
                  { key: 'type', label: 'Event', align: 'left' },
                  { key: 'amount', label: 'NOS', align: 'right' },
                  { key: 'usdValue', label: 'USD', align: 'right' },
                  { key: 'priceUsd', label: 'Price', align: 'right' },
                ].map((column) => (
                  <th
                    key={column.key}
                    onClick={() => handleHeaderClick(column.key as WalletTransactionsSectionProps['sortBy'])}
                    className={cn(
                      'px-4 py-3 font-semibold select-none',
                      column.align === 'right' ? 'text-right' : 'text-left',
                      'cursor-pointer hover:text-foreground',
                    )}
                  >
                    <span className="inline-flex items-center gap-1">
                      {column.label}
                      {renderSortIcon(column.key as WalletTransactionsSectionProps['sortBy'])}
                    </span>
                  </th>
                ))}
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Details</th>
                <th className="px-4 py-3 text-left font-semibold uppercase tracking-wide">Signature</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading && !events.length ? (
                <>
                  {Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`transactions-skeleton-${index}`}>
                      <td className="px-4 py-3" colSpan={7}>
                        <SkeletonBlock className="h-10 w-full rounded-lg" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : processedEvents.length ? (
                processedEvents.map((event) => {
                  const stats = typeStats[event.type];
                  const color = stats?.color ?? palette[event.type]?.color ?? 'hsl(var(--primary))';
                  const label = stats?.label ?? palette[event.type]?.label ?? event.type;
                  const direction = DIRECTION_WEIGHTS[event.type] ?? 0;
                  const directionClass =
                    direction > 0 ? 'text-emerald-500' : direction < 0 ? 'text-red-500' : 'text-foreground';
                  const metadataDetails = extractMetadataDetails(event.metadata);
                  return (
                    <tr key={`${event.signature}-${event.timestamp ?? ''}`} className="hover:bg-secondary/40">
                      <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                        {formatTimestampDisplay(event.timestamp)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ backgroundColor: `${color}1A`, color }}
                        >
                          {label}
                        </span>
                      </td>
                      <td className={cn('px-4 py-3 whitespace-nowrap text-right font-semibold', directionClass)}>
                        {direction > 0 ? '+' : direction < 0 ? '-' : ''}
                        {formatNos(event.amount)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {event.usdValue != null ? formatUsd(event.usdValue) : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-right">
                        {event.priceUsd != null ? formatUsd(event.priceUsd) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          {metadataDetails.length
                            ? metadataDetails.map((detail) => <span key={detail}>{detail}</span>)
                            : '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {event.signature ? (
                          <a
                            href={`https://solscan.io/tx/${event.signature}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:underline"
                          >
                            {event.signature.slice(0, 4)}…{event.signature.slice(-4)}
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
                    No events match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <div>
            Page {page} of {Math.max(totalPages, 1)}
          </div>
          <div className="inline-flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="rounded-lg border border-border/70 px-3 py-1.5 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
            >
              Previous
            </button>
            <button
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="rounded-lg border border-border/70 px-3 py-1.5 font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed hover:bg-secondary"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
