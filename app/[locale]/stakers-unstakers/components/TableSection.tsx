'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, FileDown, ArrowUpDown, X } from 'lucide-react';
import { format, startOfDay, endOfDay, subDays } from 'date-fns';
import { useLocale, useTranslations } from 'next-intl';

import type { TimeRange } from '@/lib/api/client';
import type { BalancesTableResponse } from '@/lib/api/balances-client';
import { cn, getDateLocale } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';

interface TableRowDisplayChange {
  value?: string;
  percent?: string;
}
interface TableRowDisplay {
  date?: string;
  totalAccounts?: string;
  stakingAccounts?: string;
  unstakingAccounts?: string;
  stakingRatio?: string;
  totalAmount?: string;
  stakingAmount?: string;
  unstakingAmount?: string;
  accountsChange?: TableRowDisplayChange;
  amountChange?: TableRowDisplayChange;
  avgBalance?: string;
}
interface AccountsTableRowLegacy {
  date: string;
  accounts?: { total?: number; staking?: number; unstaking?: number; stakingRatio?: number };
  amounts?: { total?: number; staking?: number; unstaking?: number };
  changes?: { accounts?: number; amount?: number };
  averages?: { overall?: number };
  display?: TableRowDisplay;
}
interface AccountsTableRowSimplified {
  id?: string | number;
  timestamp: string;
  total: number;
  stakers: number;
  unstakers: number;
  change?: number;
  dataPoints?: number;
  display?: { total?: string; stakers?: string; unstakers?: string; change?: string } & {
    [k: string]: any;
  };
}
type AnyAccountsRow =
  | AccountsTableRowLegacy
  | AccountsTableRowSimplified
  | (Record<string, any> & { display?: any });

interface TableSectionProps {
  tableData: BalancesTableResponse | null;
  tableTimeframe: TimeRange;
  onTimeframeChange: (timeframe: TimeRange) => void;
  tableSort: { field: string; order: 'asc' | 'desc' };
  onSortChange: (sort: { field: string; order: 'asc' | 'desc' }) => void;
  tablePage: number;
  onPageChange: (page: number) => void;
  tableDateRange: { start: Date | null; end: Date | null };
  onDateRangeChange: (range: { start: Date | null; end: Date | null }) => void;
  onDownload: (type: 'table', format: 'csv' | 'json') => void;
  isMobile: boolean;
  mounted: boolean;
}

const timeRanges: TimeRange[] = ['24h', '7d', '30d', '90d', '180d', '1y', 'all'];

export function TableSection({
  tableData,
  tableTimeframe,
  onTimeframeChange,
  tableSort,
  onSortChange,
  tablePage,
  onPageChange,
  tableDateRange,
  onDateRangeChange,
  onDownload,
  isMobile,
  mounted,
}: TableSectionProps) {
  const { text } = useFontScale();
  const locale = useLocale();
  const t = useTranslations('stakersUnstakers.table');
  const tc = useTranslations('common');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [tempRange, setTempRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const rawRowsContainer: any = tableData?.table?.rows;
  let extractedRows: AnyAccountsRow[] = [];
  if (Array.isArray(rawRowsContainer)) {
    extractedRows = rawRowsContainer as AnyAccountsRow[];
  } else if (rawRowsContainer?.rows && Array.isArray(rawRowsContainer.rows)) {
    extractedRows = rawRowsContainer.rows as AnyAccountsRow[];
  } else if (rawRowsContainer?.data && Array.isArray(rawRowsContainer.data)) {
    extractedRows = rawRowsContainer.data as AnyAccountsRow[];
  }
  const rows: AnyAccountsRow[] = extractedRows;
  const pagination =
    (tableData as any)?.pagination ||
    (tableData?.table as any)?.pagination ||
    rawRowsContainer?.pagination ||
    tableData?.table?.columns;
  const summary = rawRowsContainer?.summary;

  const translatedRanges = timeRanges.map((range) => ({
    value: range,
    label: tc(`timeRanges.${range}`),
    description: tc(`timeRangeDescriptions.${range}`),
  }));

  const dateRangePresets = [
    {
      label: tc('days.today'),
      value: () => ({ start: startOfDay(new Date()), end: endOfDay(new Date()) }),
    },
    {
      label: tc('days.last7Days'),
      value: () => ({ start: subDays(new Date(), 7), end: new Date() }),
    },
    {
      label: tc('days.last30Days'),
      value: () => ({ start: subDays(new Date(), 30), end: new Date() }),
    },
    {
      label: tc('days.last90Days'),
      value: () => ({ start: subDays(new Date(), 90), end: new Date() }),
    },
  ];

  const hasAmounts = useMemo(
    () => rows.some((r) => (r as any).amounts || (r as any).display?.totalAmount),
    [rows],
  );
  const hasAvgBalance = useMemo(
    () =>
      rows.some(
        (r) => (r as any).averages?.overall != null || (r as any).display?.avgBalance != null,
      ),
    [rows],
  );

  const columns = useMemo(() => {
    const base = [
      { key: 'date', label: t('columns.date'), sortable: true, width: '140px' },
      { key: 'totalAccounts', label: t('columns.totalAccounts'), sortable: true },
      { key: 'stakingAccounts', label: t('columns.stakingAccounts'), sortable: true },
      { key: 'unstakingAccounts', label: t('columns.unstakingAccounts'), sortable: true },
      { key: 'stakingRatio', label: t('columns.stakingRatio'), sortable: true },
    ];
    if (hasAmounts) {
      base.push(
        { key: 'totalAmount', label: t('columns.totalAmount'), sortable: true },
        { key: 'stakingAmount', label: t('columns.stakingAmount'), sortable: true },
        { key: 'unstakingAmount', label: t('columns.unstakingAmount'), sortable: true },
      );
    }
    base.push({ key: 'accountsChange', label: t('columns.accountsChange'), sortable: true });
    if (hasAmounts)
      base.push({ key: 'amountChange', label: t('columns.amountChange'), sortable: true });
    if (hasAvgBalance)
      base.push({ key: 'avgBalance', label: t('columns.avgBalance'), sortable: false });
    return base;
  }, [t, hasAmounts, hasAvgBalance]);

  const tableRows = rows.map((row: AnyAccountsRow) => {
    const isSimplified = 'timestamp' in row && 'total' in row && 'stakers' in row;
    let dateRaw: string | undefined;
    if (isSimplified) dateRaw = (row as AccountsTableRowSimplified).timestamp;
    else dateRaw = (row as AccountsTableRowLegacy).date;

    const totalAccounts = isSimplified ? (row as any).total : (row as any).accounts?.total;
    const stakingAccounts = isSimplified ? (row as any).stakers : (row as any).accounts?.staking;
    const unstakingAccounts = isSimplified
      ? (row as any).unstakers
      : (row as any).accounts?.unstaking;
    const stakingRatioNum = totalAccounts ? (stakingAccounts / totalAccounts) * 100 : 0;

    const legacyAccountsChangeRaw = (row as any).changes?.accounts as number | undefined;
    const simplifiedChangePct = isSimplified ? (row as any).change : undefined;
    const accountsChangeValue =
      (row as any).display?.accountsChange?.value ||
      (isSimplified && typeof simplifiedChangePct === 'number'
        ? `${simplifiedChangePct.toFixed(2)}%`
        : formatSignedInt(legacyAccountsChangeRaw));
    const accountsChangePercent = (row as any).display?.accountsChange?.percent;

    const legacyAmounts = (row as any).amounts;
    const amountChangeValue =
      (row as any).display?.amountChange?.value ?? formatNumber((row as any).changes?.amount);
    const amountChangePercent = (row as any).display?.amountChange?.percent;

    return {
      key: dateRaw || Math.random().toString(36).slice(2),
      date: (row as any).display?.date ?? (dateRaw ? format(new Date(dateRaw), 'yyyy-MM-dd') : ''),
      totalAccounts:
        (row as any).display?.totalAccounts ??
        (isSimplified
          ? (row as any).display?.total || totalAccounts?.toLocaleString()
          : totalAccounts?.toLocaleString()),
      stakingAccounts:
        (row as any).display?.stakingAccounts ??
        (isSimplified
          ? (row as any).display?.stakers || stakingAccounts?.toLocaleString()
          : stakingAccounts?.toLocaleString()),
      unstakingAccounts:
        (row as any).display?.unstakingAccounts ??
        (isSimplified
          ? (row as any).display?.unstakers || unstakingAccounts?.toLocaleString()
          : unstakingAccounts?.toLocaleString()),
      stakingRatio: (row as any).display?.stakingRatio ?? `${stakingRatioNum.toFixed(2)}%`,
      totalAmount: (row as any).display?.totalAmount ?? legacyAmounts?.total?.toLocaleString(),
      stakingAmount:
        (row as any).display?.stakingAmount ?? legacyAmounts?.staking?.toLocaleString(),
      unstakingAmount:
        (row as any).display?.unstakingAmount ?? legacyAmounts?.unstaking?.toLocaleString(),
      accountsChange: accountsChangePercent
        ? `${accountsChangeValue} (${accountsChangePercent})`
        : accountsChangeValue,
      amountChange: amountChangePercent
        ? `${amountChangeValue} (${amountChangePercent})`
        : amountChangeValue,
      avgBalance: hasAvgBalance
        ? ((row as any).display?.avgBalance ??
          (row as any).averages?.overall?.toLocaleString(undefined, { maximumFractionDigits: 2 }))
        : undefined,
    } as Record<string, any>;
  });

  const handleSort = (key: string) => {
    if (tableSort.field === key) {
      onSortChange({ field: key, order: tableSort.order === 'asc' ? 'desc' : 'asc' });
    } else {
      onSortChange({ field: key, order: 'desc' });
    }
  };

  const formatLocal = (date: string) => {
    try {
      const parsed = new Date(date);
      return format(parsed, isMobile ? 'MM/dd HH:mm' : 'MMM dd, yyyy', {
        locale: getDateLocale(locale),
      });
    } catch {
      return date;
    }
  };

  if (!mounted) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card-base overflow-hidden"
    >
      <div className="p-3 md:p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
          {isMobile ? (
            <div className="flex gap-2 w-full">
              <div className="relative flex-1">
                <select
                  value={tableTimeframe}
                  onChange={(e) => onTimeframeChange(e.target.value as TimeRange)}
                  className={cn(
                    'w-full px-3 py-2 bg-secondary rounded-lg appearance-none pr-8',
                    text('xs', 'sm'),
                  )}
                >
                  {translatedRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
              </div>
              <button
                onClick={() => {
                  setTempRange(tableDateRange);
                  setShowDatePicker(true);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                  text('xs', 'sm'),
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {tc('customDate')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                {translatedRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => onTimeframeChange(range.value as TimeRange)}
                    className={cn(
                      'px-2 py-1 font-medium rounded transition-all',
                      text('xs', 'xs'),
                      tableTimeframe === range.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setTempRange(tableDateRange);
                  setShowDatePicker(true);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                  text('xs', 'sm'),
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {t('dateRange')}
              </button>
            </div>
          )}
        </div>

        {/* Export menu to match Raydium */}
        <div className="relative group self-end md:self-auto">
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
              text('xs', 'sm'),
            )}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{t('export', { default: 'Export' } as any)}</span>
          </button>
          <div className="absolute right-0 mt-2 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 min-w-[160px]">
            <button
              onClick={() => onDownload('table', 'csv')}
              className={cn(
                'block w-full px-4 py-2 text-left hover:bg-secondary transition-colors whitespace-nowrap',
                text('xs', 'sm'),
              )}
            >
              {t('exportAsCSV', { default: t('exportCsv') } as any)}
            </button>
            <button
              onClick={() => onDownload('table', 'json')}
              className={cn(
                'block w-full px-4 py-2 text-left hover:bg-secondary transition-colors whitespace-nowrap',
                text('xs', 'sm'),
              )}
            >
              {t('exportAsJSON', { default: t('exportJson') } as any)}
            </button>
          </div>
        </div>
      </div>

      {showDatePicker && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setShowDatePicker(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl z-50 w-[90vw] max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className={text('lg', 'lg', 'font-semibold')}>{tc('chart.selectDateRange')}</h3>
              <button
                onClick={() => setShowDatePicker(false)}
                className="p-1 rounded hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className={cn(text('xs', 'xs'), 'text-muted-foreground mb-1 block')}>
                  {tc('chart.startDate')}
                </label>
                <input
                  type="date"
                  value={tempRange.start ? format(tempRange.start, 'yyyy-MM-dd') : ''}
                  max={
                    tempRange.end
                      ? format(tempRange.end, 'yyyy-MM-dd')
                      : format(new Date(), 'yyyy-MM-dd')
                  }
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    if (!Number.isNaN(date.getTime()))
                      setTempRange((prev) => ({ ...prev, start: date }));
                  }}
                  className={cn(
                    'w-full px-3 py-2 bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary',
                    text('xs', 'sm'),
                  )}
                />
              </div>
              <div>
                <label className={cn(text('xs', 'xs'), 'text-muted-foreground mb-1 block')}>
                  {tc('chart.endDate')}
                </label>
                <input
                  type="date"
                  value={tempRange.end ? format(tempRange.end, 'yyyy-MM-dd') : ''}
                  max={format(new Date(), 'yyyy-MM-dd')}
                  onChange={(e) => {
                    const date = new Date(e.target.value);
                    if (!Number.isNaN(date.getTime()))
                      setTempRange((prev) => ({ ...prev, end: date }));
                  }}
                  className={cn(
                    'w-full px-3 py-2 bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary',
                    text('xs', 'sm'),
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                {dateRangePresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => setTempRange(preset.value())}
                    className={cn(
                      'px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                      text('2xs', 'xs'),
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setTempRange({ start: null, end: null });
                    onDateRangeChange({ start: null, end: null });
                    setShowDatePicker(false);
                  }}
                  className={cn(
                    'flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                    text('xs', 'sm'),
                  )}
                >
                  {tc('clear')}
                </button>
                <button
                  onClick={() => {
                    onDateRangeChange(tempRange);
                    setShowDatePicker(false);
                  }}
                  className={cn(
                    'flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors',
                    text('xs', 'sm'),
                  )}
                >
                  {tc('apply')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'text-left px-3 py-2 md:py-3 font-medium text-muted-foreground uppercase tracking-wider',
                    text('3xs', '2xs'),
                    column.width && `w-[${column.width}]`,
                  )}
                >
                  <button
                    disabled={!column.sortable}
                    onClick={() => column.sortable && handleSort(column.key)}
                    className={cn(
                      'flex items-center gap-1',
                      column.sortable
                        ? 'cursor-pointer hover:bg-secondary/70 transition-colors px-1 py-0.5 rounded'
                        : 'cursor-default',
                    )}
                  >
                    {column.label}
                    {column.sortable && (
                      <ArrowUpDown
                        className={cn(
                          'w-3 h-3',
                          tableSort.field === column.key &&
                            tableSort.order === 'desc' &&
                            'rotate-180',
                        )}
                      />
                    )}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="text-center py-12 text-muted-foreground">
                  {t('noRows')}
                </td>
              </tr>
            ) : (
              tableRows.map((row) => (
                <tr
                  key={row.key}
                  className="border-b border-border/60 hover:bg-secondary/40 transition-colors"
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn('px-3 py-3', text('xs', 'sm'))}>
                      {col.key === 'date' ? formatLocal(row.date) : ((row as any)[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {summary && (
        <div className="p-3 md:p-4 border-t border-border bg-secondary/20 text-xs text-muted-foreground">
          <p>
            {t('summary', {
              accounts: summary.accounts?.current?.toLocaleString?.() ?? '—',
              growth: summary.accounts?.growth?.toLocaleString?.() ?? '—',
              ratio: summary.stakingRatio?.current ?? '—',
            })}
          </p>
        </div>
      )}

      {pagination && (
        <div className="p-3 md:p-4 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {(() => {
              const limit = pagination.limit ?? tableRows.length;
              const from = ((pagination.page ?? 1) - 1) * limit + 1;
              const to = Math.min(
                from + tableRows.length - 1,
                pagination.total ?? from + tableRows.length - 1,
              );
              return (
                <p
                  className={cn(text('xs', 'sm'), 'text-muted-foreground text-center sm:text-left')}
                >
                  {tc('showing')} {from} {tc('to')} {to} {tc('of')} {pagination.total}
                </p>
              );
            })()}
            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  pagination.hasPrev &&
                  onPageChange(Math.max(1, pagination.prevPage ?? (pagination.page ?? 1) - 1))
                }
                disabled={!pagination.hasPrev}
                className={cn(
                  'px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  text('xs', 'sm'),
                )}
              >
                {tc('previous')}
              </button>
              <span className={text('xs', 'sm')}>
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                onClick={() =>
                  pagination.hasNext &&
                  onPageChange(pagination.nextPage ?? (pagination.page ?? 1) + 1)
                }
                disabled={!pagination.hasNext}
                className={cn(
                  'px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                  text('xs', 'sm'),
                )}
              >
                {tc('next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
}

function formatNumber(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  const prefix = value >= 0 ? '+' : '-';
  if (abs >= 1_000_000) return `${prefix}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${prefix}${(abs / 1_000).toFixed(1)}K`;
  return `${prefix}${abs.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function formatSignedInt(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '0';
  const prefix = value >= 0 ? '+' : '';
  return `${prefix}${Math.round(value).toLocaleString()}`;
}
