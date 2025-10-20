'use client';

import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Filter,
  ExternalLink,
  Copy,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useToast } from '@/components/ui/Toast';

import type { StakingAnalyticsEvent, StakingEventType } from '../../analytics';
import { KNOWN_EVENT_TYPES } from '../../analytics';

interface EventsTableProps {
  events: StakingAnalyticsEvent[];
  className?: string;
}

type SortKey = 'timestamp' | 'type' | 'amount' | 'usdValue';
type SortOrder = 'asc' | 'desc';

const COLOR_MAP: Partial<Record<StakingEventType, string>> = {
  purchase: 'bg-blue-500/20 text-blue-500 border-blue-500/30',
  sale: 'bg-rose-500/20 text-rose-500 border-rose-500/30',
  transfer_in: 'bg-green-500/20 text-green-500 border-green-500/30',
  transfer_out: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
  stake_deposit: 'bg-purple-500/20 text-purple-500 border-purple-500/30',
  stake_withdrawal: 'bg-cyan-500/20 text-cyan-500 border-cyan-500/30',
  stake_slash: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
};

export function EventsTable({ events, className = '' }: EventsTableProps) {
  const t = useTranslations('stakingAnalysis.eventsTable');
  const tCopy = useTranslations('stakingAnalysis.copy');
  const { addToast } = useToast();
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortKey, setSortKey] = useState<SortKey>('timestamp');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [filterType, setFilterType] = useState<StakingEventType | 'all'>('all');

  const usdFormatter = useMemo(
    () =>
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    [],
  );

  const formatType = (type: StakingEventType) => {
    try {
      return t(`labels.${type}` as const);
    } catch {
      return type;
    }
  };

  const formatDate = (value: string) => {
    if (!value) return t('unknown');
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return t('unknown');
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  };

  const filteredEvents = useMemo(() => {
    const result = (filterType === 'all'
      ? [...events]
      : events.filter((event) => event.type === filterType)
    ).sort((a, b) => {
      let aValue: number | string | null = (a as any)[sortKey];
      let bValue: number | string | null = (b as any)[sortKey];

      if (sortKey === 'timestamp') {
        aValue = a.timestamp ? Date.parse(a.timestamp) : Number.NEGATIVE_INFINITY;
        bValue = b.timestamp ? Date.parse(b.timestamp) : Number.NEGATIVE_INFINITY;
      } else if (sortKey === 'usdValue') {
        aValue = a.usdValue ?? 0;
        bValue = b.usdValue ?? 0;
      } else if (sortKey === 'type') {
        aValue = String(a.type);
        bValue = String(b.type);
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      const aString = String(aValue).toLowerCase();
      const bString = String(bValue).toLowerCase();
      if (aString < bString) return sortOrder === 'asc' ? -1 : 1;
      if (aString > bString) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [events, filterType, sortKey, sortOrder, t]);

  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = filteredEvents.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  const eventTypeOptions: Array<StakingEventType | 'all'> = [
    'all',
    ...new Set([
      ...KNOWN_EVENT_TYPES,
      ...events.map((event) => event.type),
    ]),
  ];

  const SortIcon = ({ column }: { column: SortKey }) => {
    if (sortKey !== column) return <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />;
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5" />
    );
  };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const handleCopy = async (signature: string) => {
    if (!signature) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(signature);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = signature;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        const success = document.execCommand('copy');
        document.body.removeChild(textarea);
        if (!success) {
          throw new Error('clipboard copy failed');
        }
      }
      addToast({
        title: t('toast.copied'),
        type: 'success',
      });
    } catch {
      addToast({
        title: t('toast.failed'),
        type: 'error',
      });
    }
  };

  const eventsCountLabel = t('subtitle', { count: filteredEvents.length });
  const rowsLabel = t('rowsLabel');
  const pageLabel = t('pageLabel', { current: currentPage, total: totalPages });

  return (
    <div className={`card-base overflow-hidden ${className}`}>
      <div className="border-b border-border/60 p-3 sm:p-4 md:p-6">
        <div className="mb-2 flex flex-col gap-2 sm:mb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div>
            <h3 className="text-base font-semibold sm:text-lg md:text-xl">{t('title')}</h3>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">{eventsCountLabel}</p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value as StakingEventType | 'all');
                setCurrentPage(1);
              }}
              className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {eventTypeOptions.map((type) => (
                <option key={type} value={type}>
                  {type === 'all' ? t('filters.all') : formatType(type)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[700px]">
          <thead className="border-b border-border/60 bg-secondary/30">
            <tr>
              <th
                className="cursor-pointer px-1.5 py-1.5 text-left transition-colors hover:bg-secondary/50 sm:px-3.5 sm:py-3 md:px-5.5 md:py-4"
                onClick={() => handleSort('timestamp')}
              >
                <div className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground sm:gap-2 sm:text-xs">
                  {t('columns.date')} <SortIcon column="timestamp" />
                </div>
              </th>
              <th
                className="cursor-pointer px-1.5 py-1.5 text-left transition-colors hover:bg-secondary/50 sm:px-3.5 sm:py-3 md:px-5.5 md:py-4"
                onClick={() => handleSort('type')}
              >
                <div className="flex items-center gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground sm:gap-2 sm:text-xs">
                  {t('columns.type')} <SortIcon column="type" />
                </div>
              </th>
              <th
                className="cursor-pointer px-1.5 py-1.5 text-right transition-colors hover:bg-secondary/50 sm:px-3.5 sm:py-3 md:px-5.5 md:py-4"
                onClick={() => handleSort('amount')}
              >
                <div className="flex items-center justify-end gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground sm:gap-2 sm:text-xs">
                  {t('columns.amount')} <SortIcon column="amount" />
                </div>
              </th>
              <th
                className="cursor-pointer px-1.5 py-1.5 text-right transition-colors hover:bg-secondary/50 sm:px-3.5 sm:py-3 md:px-5.5 md:py-4"
                onClick={() => handleSort('usdValue')}
              >
                <div className="flex items-center justify-end gap-1 text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground sm:gap-2 sm:text-xs">
                  {t('columns.usdValue')} <SortIcon column="usdValue" />
                </div>
              </th>
              <th className="px-1.5 py-1.5 text-right sm:px-3.5 sm:py-3 md:px-5.5 md:py-4">
                <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground sm:text-xs">
                  {t('columns.signature')}
                </span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/40">
            <AnimatePresence mode="popLayout">
              {paginatedEvents.map((event, index) => {
                const badgeClasses =
                  COLOR_MAP[event.type] ??
                  'bg-secondary/30 text-foreground border-border/40';
                const usdDisplay =
                  event.usdValue != null ? usdFormatter.format(event.usdValue) : '—';
                const amountDisplay = event.amount.toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                });
                const signature = event.signature || '—';

                return (
                  <motion.tr
                    key={`${event.id}-${event.signature}-${index}`}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.02 }}
                    className="transition-colors hover:bg-secondary/20"
                  >
                    <td className="px-1.5 py-1.5 sm:px-3.5 sm:py-3 md:px-5.5 md:py-4">
                      <span className="text-[0.7rem] sm:text-xs md:text-sm">
                        {formatDate(event.timestamp)}
                      </span>
                    </td>
                    <td className="px-1.5 py-1.5 sm:px-3.5 sm:py-3 md:px-5.5 md:py-4">
                      <span
                        className={`inline-flex rounded-full border px-1.5 py-0.5 text-[0.65rem] font-medium sm:px-2 sm:py-1 sm:text-xs ${badgeClasses}`}
                      >
                        {formatType(event.type)}
                      </span>
                    </td>
                    <td className="px-1.5 py-1.5 text-right sm:px-3.5 sm:py-3 md:px-5.5 md:py-4">
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="font-mono text-[0.7rem] font-medium sm:text-xs md:text-sm">
                          {amountDisplay}
                        </span>
                        <span className="text-[0.6rem] text-muted-foreground sm:hidden">{usdDisplay}</span>
                      </div>
                    </td>
                    <td className="px-1.5 py-1.5 text-right sm:px-3.5 sm:py-3 md:px-5.5 md:py-4">
                      <span className="font-mono text-[0.7rem] font-medium sm:text-xs md:text-sm">
                        {usdDisplay}
                      </span>
                    </td>
                    <td className="px-1.5 py-1.5 text-right sm:px-3.5 sm:py-3 md:px-5.5 md:py-4">
                      {signature !== '—' ? (
                        <div className="flex items-center justify-end gap-2">
                          <a
                            href={`https://solscan.io/tx/${encodeURIComponent(signature)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1 font-mono text-[0.7rem] text-primary transition-colors hover:text-primary/80 sm:text-xs"
                          >
                            <span>
                              {signature.length > 11
                                ? `${signature.slice(0, 8)}…${signature.slice(-3)}`
                                : signature}
                            </span>
                            <ExternalLink className="h-3 w-3 transition-opacity group-hover:opacity-80 sm:h-3.5 sm:w-3.5" />
                          </a>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              void handleCopy(signature);
                            }}
                            className="rounded-full border border-border/60 p-1 text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary sm:p-1.5"
                            aria-label={tCopy('signature')}
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ) : (
                        <span className="font-mono text-[0.7rem] text-muted-foreground sm:text-xs">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 border-t border-border/60 p-2 sm:flex-row sm:gap-4 sm:p-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground sm:text-sm">{rowsLabel}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded border border-border bg-background px-1.5 py-0.5 text-xs transition-colors hover:border-primary focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:px-2 sm:py-1 sm:text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <span className="text-xs text-muted-foreground sm:text-sm">{pageLabel}</span>

          <div className="flex items-center gap-0.5 sm:gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="rounded p-1 transition-colors hover:bg-secondary disabled:opacity-50 disabled:hover:bg-transparent sm:p-1.5"
            >
              <ChevronsLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="rounded p-1 transition-colors hover:bg-secondary disabled:opacity-50 disabled:hover:bg-transparent sm:p-1.5"
            >
              <ChevronLeft className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="rounded p-1 transition-colors hover:bg-secondary disabled:opacity-50 disabled:hover:bg-transparent sm:p-1.5"
            >
              <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="rounded p-1 transition-colors hover:bg-secondary disabled:opacity-50 disabled:hover:bg-transparent sm:p-1.5"
            >
              <ChevronsRight className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
