'use client';

import { useMemo, useState, isValidElement } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, FileDown, ArrowUpDown, X } from 'lucide-react';
import { format, endOfDay, startOfDay, subDays } from 'date-fns';
import { cn, getDateLocale } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useLocale, useTranslations } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';

interface TableSectionProps {
  tableData: any;
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
  loading?: boolean;
}

const TIME_RANGES: { value: TimeRange; label: string; descriptionKey: string }[] = [
  { value: '24h', label: '24H', descriptionKey: 'timeRangeDescriptions.24h' },
  { value: '7d', label: '7D', descriptionKey: 'timeRangeDescriptions.7d' },
  { value: '30d', label: '30D', descriptionKey: 'timeRangeDescriptions.30d' },
  { value: '90d', label: '90D', descriptionKey: 'timeRangeDescriptions.90d' },
  { value: '180d', label: '180D', descriptionKey: 'timeRangeDescriptions.180d' },
  { value: '1y', label: '1Y', descriptionKey: 'timeRangeDescriptions.1y' },
  { value: 'all', label: 'ALL', descriptionKey: 'timeRangeDescriptions.all' },
];

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
  loading = false,
}: TableSectionProps) {
  const { text } = useFontScale();
  const locale = useLocale();
  const tc = useTranslations('common');
  const t = useTranslations('stakingDetails.table');
  const chartT = useTranslations('stakingDetails.chart');

  const [showDateModal, setShowDateModal] = useState(false);
  const [tempDateRange, setTempDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  const translatedTimeRanges = TIME_RANGES.map((range) => ({
    ...range,
    description: tc(range.descriptionKey as any),
  }));

  const table = tableData?.table ?? tableData ?? {};
  const rawColumnDefs = Array.isArray(table?.columns) ? table.columns : [];
  const rawRows = Array.isArray(table?.rows) ? table.rows : [];

  const columns = useMemo(() => {
    if (rawColumnDefs.length) return rawColumnDefs;
    const fallbackKeys = ['timestamp', 'total', 'staking', 'unstaking', 'change'];
    return fallbackKeys.map((key) => ({
      key,
      label: key,
      sortable: key === 'timestamp' || key === 'change',
    }));
  }, [rawColumnDefs]);

  const rows = useMemo(() => rawRows, [rawRows]);

  const paginationMeta = tableData?.pagination ?? table?.pagination ?? null;
  const totalItems = paginationMeta?.total ?? rows.length;
  const limit = paginationMeta?.limit ?? paginationMeta?.pageSize ?? 20;
  const firstItem = totalItems === 0 ? 0 : Math.min((tablePage - 1) * limit + 1, totalItems);
  const lastItem = totalItems === 0 ? 0 : Math.min(tablePage * limit, totalItems);
  const totalPages = paginationMeta?.totalPages ?? (limit ? Math.ceil(totalItems / limit) : 1);
  const showPagination = totalPages > 1;

  const formatDateCell = (value: unknown) => {
    if (!value) return tc('na');
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return String(value);
    if (!mounted) return '…';
    return format(date, isMobile ? 'MM/dd HH:mm' : 'MMM dd, yyyy HH:mm', {
      locale: getDateLocale(locale),
    });
  };

  const formatNos = (value: unknown) => {
    const num =
      typeof value === 'number'
        ? value
        : value != null
          ? Number(String(value).replace(/,/g, ''))
          : NaN;
    if (!Number.isFinite(num)) return typeof value === 'string' ? value : tc('na');
    const abs = Math.abs(num);
    if (abs >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${(num / 1e3).toFixed(2)}K`;
    return num.toLocaleString();
  };

  const stripNosSuffix = (value: unknown) => {
    if (typeof value === 'string') return value.replace(/\s*NOS$/i, '').trim();
    return value;
  };

  const formatPercent = (value: unknown) => {
    if (value == null) return tc('na');
    const num = typeof value === 'number' ? value : Number(String(value));
    if (!Number.isFinite(num)) return String(value);
    return `${num >= 0 ? '+' : ''}${num.toFixed(2)}%`;
  };

  const renderCell = (row: Record<string, any>, columnKey: string) => {
    const display = row.display?.[columnKey];
    if (display != null) {
      if (isValidElement(display)) return display;
      if (typeof display === 'object' && display !== null && 'value' in display) {
        const { value, color } = display as { value: string; color?: string };
        const colorClass =
          color === 'green'
            ? 'text-green-500'
            : color === 'red'
              ? 'text-red-500'
              : color === 'amber'
                ? 'text-amber-500'
                : color === 'blue'
                  ? 'text-blue-500'
                  : color === 'neutral'
                    ? 'text-muted-foreground'
                    : 'text-foreground';
        return (
          <span className={cn('font-medium', colorClass)}>{stripNosSuffix(value) as string}</span>
        );
      }
      if (typeof display === 'number') return display.toLocaleString();
      return stripNosSuffix(display);
    }

    const value = row[columnKey];
    switch (columnKey) {
      case 'timestamp':
      case 'date':
      case 'time':
        return formatDateCell(value);
      case 'total':
      case 'staking':
      case 'unstaking':
      case 'amount':
      case 'value': {
        const formatted = formatNos(value);
        return formatted;
      }
      case 'change':
      case 'delta':
      case 'pct':
      case 'percentage':
        return formatPercent(value);
      default:
        if (typeof value === 'number') return value.toLocaleString();
        return value ?? tc('na');
    }
  };

  const datePresets = [
    {
      label: tc('days.today'),
      range: { start: startOfDay(new Date()), end: endOfDay(new Date()) },
    },
    { label: tc('days.last7Days'), range: { start: subDays(new Date(), 7), end: new Date() } },
    { label: tc('days.last30Days'), range: { start: subDays(new Date(), 30), end: new Date() } },
    { label: tc('days.last90Days'), range: { start: subDays(new Date(), 90), end: new Date() } },
  ];

  const applyDateRange = () => {
    onDateRangeChange(tempDateRange);
    setShowDateModal(false);
  };

  const headerLabels = useMemo(
    () => ({
      timestamp: t('timestamp'),
      date: t('timestamp'),
      total: t('total'),
      staking: t('stakers'),
      unstaking: t('unstakers'),
      change: t('change'),
      high: t('high'),
      low: t('low'),
      dataPoints: t('dataPoints'),
    }),
    [t],
  );

  if (loading && !rows.length) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card-base overflow-hidden"
      >
        <div className="p-3 md:p-4 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
            <div className="relative skeleton h-10 w-full rounded-lg">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>
          <div className="relative skeleton h-10 w-32 rounded-lg">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="grid grid-cols-4 md:grid-cols-6 gap-3 md:gap-4 px-3 md:px-4 py-4"
            >
              {Array.from({ length: 6 }).map((__, colIdx) => (
                <div key={colIdx} className="relative skeleton h-4 w-full rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="card-base overflow-hidden"
    >
      <div className="p-3 md:p-4 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
          {isMobile ? (
            <div className="w-full space-y-2">
              <div className="relative">
                <select
                  value={tableTimeframe}
                  onChange={(event) => onTimeframeChange(event.target.value as TimeRange)}
                  className={cn(
                    'w-full px-3 py-2 bg-secondary rounded-lg appearance-none pr-8',
                    text('sm', 'sm'),
                  )}
                >
                  {translatedTimeRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {tc(`timeRanges.${range.value}`)} — {range.description}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              </div>
              <button
                onClick={() => {
                  setTempDateRange({ start: tableDateRange.start, end: tableDateRange.end });
                  setShowDateModal(true);
                }}
                className={cn(
                  'flex items-center justify-center gap-2 w-full px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                  text('sm', 'sm'),
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {t('dateRange')}
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1">
                {translatedTimeRanges.map((range) => (
                  <button
                    key={range.value}
                    onClick={() => onTimeframeChange(range.value)}
                    className={cn(
                      'px-2.5 md:px-3 py-1.5 rounded-md transition-all font-medium',
                      text('xs', 'sm'),
                      tableTimeframe === range.value
                        ? 'bg-background text-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                    title={range.description}
                  >
                    {range.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => {
                  setTempDateRange({ start: tableDateRange.start, end: tableDateRange.end });
                  setShowDateModal(true);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                  text('xs', 'sm'),
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                {t('dateRange')}
              </button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => onDownload('table', 'csv')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
              text('xs', 'sm'),
            )}
          >
            <FileDown className="w-3.5 h-3.5" />
            CSV
          </button>
          <button
            onClick={() => onDownload('table', 'json')}
            className={cn(
              'flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
              text('xs', 'sm'),
            )}
          >
            <FileDown className="w-3.5 h-3.5" />
            JSON
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-secondary/50 border-b border-border">
            <tr>
              {columns.map((column) => {
                const headerLabel =
                  headerLabels[column.key as keyof typeof headerLabels] ??
                  column.label ??
                  column.key;
                return (
                  <th
                    key={column.key}
                    className={cn(
                      'px-3 md:px-4 py-2 md:py-3 text-left font-medium uppercase tracking-wide text-muted-foreground',
                      text('3xs', '2xs'),
                      column.sortable !== false && 'cursor-pointer hover:bg-secondary/70',
                    )}
                    onClick={() => {
                      if (column.sortable === false) return;
                      const nextOrder =
                        tableSort.field === column.key && tableSort.order === 'asc'
                          ? 'desc'
                          : 'asc';
                      onSortChange({ field: column.key, order: nextOrder });
                    }}
                  >
                    <div className="flex items-center gap-1">
                      {headerLabel}
                      {column.sortable !== false && <ArrowUpDown className="w-3 h-3" />}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className={cn('px-4 py-8 text-center text-muted-foreground', text('sm', 'md'))}
                >
                  {tc('noData')}
                </td>
              </tr>
            ) : (
              rows.map((row: Record<string, any>, idx: number) => (
                <tr
                  key={`${row.id ?? idx}-${row.timestamp ?? idx}`}
                  className="border-b border-border hover:bg-secondary/30 transition-colors"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={cn('px-3 md:px-4 py-2 md:py-3', text('xs', 'sm'))}
                    >
                      {renderCell(row, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {showPagination && (
        <div className="p-3 md:p-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
          <p className={cn(text('xs', 'sm'), 'text-muted-foreground text-center md:text-left')}>
            {tc('showing')} {firstItem} {tc('to')} {lastItem} {tc('of')} {totalItems}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onPageChange(Math.max(tablePage - 1, 1))}
              disabled={tablePage <= 1}
              className={cn(
                'px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                text('xs', 'sm'),
              )}
            >
              {tc('previous')}
            </button>
            <span className={text('xs', 'sm')}>
              {tablePage} / {totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(tablePage + 1, totalPages))}
              disabled={tablePage >= totalPages}
              className={cn(
                'px-3 py-1.5 rounded-lg hover:bg-secondary transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
                text('xs', 'sm'),
              )}
            >
              {tc('next')}
            </button>
          </div>
        </div>
      )}

      {showDateModal && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            onClick={() => setShowDateModal(false)}
          />
          <div className="fixed left-1/2 top-1/2 z-50 w-[90vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={text('lg', 'lg', 'font-semibold')}>{chartT('selectDateRange')}</h3>
              <button
                onClick={() => setShowDateModal(false)}
                className="p-1 rounded hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              <DatePicker
                label={chartT('startDate')}
                value={tempDateRange.start}
                maxDate={tempDateRange.end ?? new Date()}
                onChange={(date) => setTempDateRange((prev) => ({ ...prev, start: date }))}
                text={text}
              />
              <DatePicker
                label={chartT('endDate')}
                value={tempDateRange.end}
                onChange={(date) => setTempDateRange((prev) => ({ ...prev, end: date }))}
                text={text}
              />
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2">
              {datePresets.map(({ label, range }) => (
                <button
                  key={label}
                  onClick={() => setTempDateRange(range)}
                  className={cn(
                    'px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                    text('xs', 'xs'),
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setTempDateRange({ start: null, end: null });
                  onDateRangeChange({ start: null, end: null });
                  setShowDateModal(false);
                }}
                className={cn(
                  'flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                  text('sm', 'sm'),
                )}
              >
                {tc('clear')}
              </button>
              <button
                onClick={applyDateRange}
                className={cn(
                  'flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors',
                  text('sm', 'sm'),
                )}
              >
                {tc('apply')}
              </button>
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}

type DatePickerProps = {
  label: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  maxDate?: Date;
  text: ReturnType<typeof useFontScale>['text'];
};

function DatePicker({ label, value, onChange, maxDate = new Date(), text }: DatePickerProps) {
  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.value ? new Date(event.target.value) : null;
    if (next && Number.isNaN(next.getTime())) return;
    onChange(next);
  };

  return (
    <div className="space-y-1">
      <label className={cn(text('xs', 'xs'), 'text-muted-foreground')}>{label}</label>
      <input
        type="date"
        value={value ? format(value, 'yyyy-MM-dd') : ''}
        max={format(maxDate, 'yyyy-MM-dd')}
        onChange={handleChange}
        className={cn(
          'w-full px-3 py-2 bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary',
          text('sm', 'sm'),
        )}
      />
    </div>
  );
}
