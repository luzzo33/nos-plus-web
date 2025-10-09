'use client';

import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Calendar, ChevronDown, FileDown, ArrowUpDown, X } from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useLocale, useTranslations } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';
import type { HoldersTableResponse } from '@/lib/api/types';
import { formatLocalFromInput } from '@/lib/time';

interface TableSectionProps {
  tableData?: HoldersTableResponse;
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

const timeRanges: { value: TimeRange; label: string; description: string }[] = [
  { value: '24h', label: '24H', description: 'Last 24 hours' },
  { value: '7d', label: '7D', description: 'Last 7 days' },
  { value: '30d', label: '30D', description: 'Last 30 days' },
  { value: '90d', label: '90D', description: 'Last 90 days' },
  { value: '180d', label: '180D', description: 'Last 180 days' },
  { value: '1y', label: '1Y', description: 'Last year' },
  { value: 'all', label: 'ALL', description: 'All available data' },
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
  const t = useTranslations('holders.table');

  const [showTableDatePicker, setShowTableDatePicker] = useState(false);
  const [tempTableDateRange, setTempTableDateRange] = useState<{
    start: Date | null;
    end: Date | null;
  }>({
    start: null,
    end: null,
  });

  const tableColumns: HoldersTableResponse['table']['columns'] = tableData?.table?.columns ?? [];
  const tableRows: HoldersTableResponse['table']['rows'] = tableData?.table?.rows ?? [];
  const pagination = tableData?.pagination ?? null;
  const totalItems = pagination?.total ?? 0;
  const pageLimit = pagination?.limit ?? 0;
  const firstItem = totalItems === 0 ? 0 : Math.min((tablePage - 1) * pageLimit + 1, totalItems);
  const lastItem = totalItems === 0 ? 0 : Math.min(tablePage * pageLimit, totalItems);

  const translatedTimeRanges = timeRanges.map((range) => ({
    ...range,
    label: tc(`timeRanges.${range.value}`),
    description: tc(`timeRangeDescriptions.${range.value}`),
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

  const DatePicker = ({
    value,
    onChange,
    label,
    maxDate = new Date(),
  }: {
    value: Date | null;
    onChange: (date: Date) => void;
    label: string;
    maxDate?: Date;
  }) => {
    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const date = new Date(e.target.value);
      if (!Number.isNaN(date.getTime())) {
        onChange(date);
      }
    };

    return (
      <div className="space-y-1">
        <label className={cn(text('xs', 'xs'), 'text-muted-foreground')}>{label}</label>
        <input
          type="date"
          value={value ? format(value, 'yyyy-MM-dd') : ''}
          onChange={handleDateChange}
          max={format(maxDate, 'yyyy-MM-dd')}
          className={cn(
            'w-full px-3 py-2 bg-secondary rounded-lg border-0 focus:ring-2 focus:ring-primary',
            text('sm', 'sm'),
          )}
        />
      </div>
    );
  };

  const handleApplyDateRange = () => {
    onDateRangeChange(tempTableDateRange);
    setShowTableDatePicker(false);
  };

  const formatNumber = (value: number | undefined) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return tc('na');
    return value.toLocaleString();
  };

  const renderCell = (
    key: string,
    row: HoldersTableResponse['table']['rows'][number],
  ): ReactNode => {
    switch (key) {
      case 'timestamp':
        return mounted
          ? formatLocalFromInput(
              row.timestamp,
              isMobile ? 'MM/dd HH:mm' : 'MMM dd, yyyy HH:mm',
              locale,
            )
          : row.timestamp;
      case 'holders':
        return row.display?.holders ?? formatNumber(row.holders);
      case 'change': {
        const display = row.display?.change;
        const value = display?.value ?? `${(row.change ?? 0).toFixed(2)}%`;
        const color = display?.color ?? (row.change >= 0 ? 'green' : 'red');
        return (
          <span className={color === 'green' ? 'text-emerald-400' : 'text-red-400'}>{value}</span>
        );
      }
      case 'high':
        return row.display?.high ?? formatNumber(row.high);
      case 'low':
        return row.display?.low ?? formatNumber(row.low);
      case 'dataPoints':
        return typeof row.dataPoints === 'number' ? row.dataPoints.toLocaleString() : tc('na');
      default: {
        const fallback = (row as Record<string, unknown>)[key];
        if (typeof fallback === 'number') return fallback.toLocaleString();
        if (typeof fallback === 'string') return fallback;
        return tc('na');
      }
    }
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="card-base overflow-hidden"
      >
        <div className="p-3 md:p-4 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
            <div className="flex gap-2 w-full">
              <div className="relative skeleton h-10 flex-1 rounded-lg">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
              <div className="relative skeleton h-10 w-28 rounded-lg">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
            </div>
          </div>
          <div className="relative skeleton h-10 w-32 rounded-lg">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        </div>

        <div className="divide-y divide-border">
          {Array.from({ length: 6 }).map((_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid grid-cols-1 md:grid-cols-6 gap-3 md:gap-4 px-3 md:px-4 py-4"
            >
              {Array.from({ length: 5 }).map((__, colIndex) => (
                <div key={colIndex} className="relative skeleton h-4 w-full rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="p-3 md:p-4 border-t border-border flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="relative skeleton h-4 w-40 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative skeleton h-9 w-9 rounded-lg">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className="relative skeleton h-9 w-20 rounded-lg">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className="relative skeleton h-9 w-9 rounded-lg">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>
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
      {/* Table Controls */}
      <div className="p-3 md:p-4 border-b border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3 md:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full md:w-auto">
          {isMobile ? (
            <div className="flex gap-2 w-full">
              <div className="relative flex-1">
                <select
                  value={tableTimeframe}
                  onChange={(e) => onTimeframeChange(e.target.value as TimeRange)}
                  className={cn(
                    'w-full px-3 py-2 bg-secondary rounded-lg appearance-none pr-8',
                    text('sm', 'sm'),
                  )}
                >
                  {translatedTimeRanges.map((range) => (
                    <option key={range.value} value={range.value}>
                      {range.label} - {range.description}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none" />
              </div>

              <button
                onClick={() => {
                  setShowTableDatePicker(!showTableDatePicker);
                  setTempTableDateRange(tableDateRange);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                  text('sm', 'sm'),
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{tc('customDate')}</span>
              </button>
            </div>
          ) : (
            <>
              <div className="flex gap-1 p-1 bg-secondary rounded-lg">
                {translatedTimeRanges.map((range) => (
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
                  setShowTableDatePicker(!showTableDatePicker);
                  setTempTableDateRange(tableDateRange);
                }}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                  text('sm', 'sm'),
                )}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>{t('dateRange')}</span>
              </button>
            </>
          )}
        </div>

        {/* Download Button */}
        <div className="relative group">
          <button
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
              text('sm', 'sm'),
            )}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>{t('export')}</span>
          </button>
          <div className="absolute right-0 mt-2 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
            <button
              onClick={() => onDownload('table', 'csv')}
              className={cn(
                'block w-full px-4 py-2 text-left hover:bg-secondary transition-colors whitespace-nowrap',
                text('sm', 'sm'),
              )}
            >
              {t('exportAsCSV')}
            </button>
            <button
              onClick={() => onDownload('table', 'json')}
              className={cn(
                'block w-full px-4 py-2 text-left hover:bg-secondary transition-colors whitespace-nowrap',
                text('sm', 'sm'),
              )}
            >
              {t('exportAsJSON')}
            </button>
          </div>
        </div>
      </div>

      {/* Table Date Range Picker Modal */}
      {showTableDatePicker && (
        <>
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setShowTableDatePicker(false)}
          />
          <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card border border-border rounded-lg shadow-xl z-50 p-6 w-[90vw] max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className={text('lg', 'lg', 'font-semibold')}>{tc('chart.selectDateRange')}</h3>
              <button
                onClick={() => setShowTableDatePicker(false)}
                className="p-1 rounded hover:bg-secondary transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <DatePicker
                label={tc('chart.startDate')}
                value={tempTableDateRange.start}
                onChange={(date) => setTempTableDateRange((prev) => ({ ...prev, start: date }))}
                maxDate={tempTableDateRange.end || new Date()}
              />

              <DatePicker
                label={tc('chart.endDate')}
                value={tempTableDateRange.end}
                onChange={(date) => setTempTableDateRange((prev) => ({ ...prev, end: date }))}
                maxDate={new Date()}
              />

              <div className="grid grid-cols-2 gap-2 pt-2">
                {dateRangePresets.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      const range = preset.value();
                      setTempTableDateRange(range);
                    }}
                    className={cn(
                      'px-3 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                      text('xs', 'xs'),
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={() => {
                    setTempTableDateRange({ start: null, end: null });
                    onDateRangeChange({ start: null, end: null });
                    setShowTableDatePicker(false);
                  }}
                  className={cn(
                    'flex-1 px-4 py-2 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors',
                    text('sm', 'sm'),
                  )}
                >
                  {tc('clear')}
                </button>
                <button
                  onClick={handleApplyDateRange}
                  className={cn(
                    'flex-1 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors',
                    text('sm', 'sm'),
                  )}
                >
                  {tc('apply')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-secondary/50">
              {tableColumns.map((column) => (
                <th
                  key={column.key}
                  className={cn(
                    'px-3 md:px-4 py-2 md:py-3 text-left font-medium text-muted-foreground uppercase tracking-wider',
                    text('3xs', '2xs'),
                    column.sortable && 'cursor-pointer hover:bg-secondary/70',
                  )}
                  onClick={() => {
                    if (column.sortable) {
                      onSortChange({
                        field: column.key,
                        order:
                          tableSort.field === column.key && tableSort.order === 'asc'
                            ? 'desc'
                            : 'asc',
                      });
                    }
                  }}
                >
                  <div className="flex items-center gap-1">
                    {column.label || column.key}
                    {column.sortable && <ArrowUpDown className="w-3 h-3" />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.length === 0 ? (
              <tr>
                <td
                  colSpan={Math.max(tableColumns.length, 1)}
                  className={cn('px-4 py-8 text-center text-muted-foreground', text('sm', 'md'))}
                >
                  {tc('noData')}
                </td>
              </tr>
            ) : (
              tableRows.map((row, index) => (
                <tr
                  key={`${row.id ?? row.timestamp ?? index}`}
                  className="border-b border-border hover:bg-secondary/30 transition-colors"
                >
                  {tableColumns.map((column) => (
                    <td
                      key={column.key}
                      className={cn(
                        'px-3 md:px-4 py-2 md:py-3',
                        text('xs', 'sm'),
                        column.key === 'holders' ? 'font-medium' : '',
                        column.key === 'dataPoints' ? 'text-muted-foreground' : '',
                      )}
                    >
                      {renderCell(column.key, row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="p-3 md:p-4 border-t border-border">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className={cn(text('xs', 'sm'), 'text-muted-foreground text-center sm:text-left')}>
              {tc('showing')} {firstItem} {tc('to')} {lastItem} {tc('of')} {pagination.total}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onPageChange(Math.max(1, tablePage - 1))}
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
                onClick={() => onPageChange(tablePage + 1)}
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
