'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import {
  Crown,
  Users,
  Shield,
  TrendingUp,
  TrendingDown,
  Activity,
  Wallet,
  LineChart,
  Table,
  BarChart3,
  ExternalLink,
} from 'lucide-react';
import {
  apiClient,
  RichListRange,
  RichListWidgetData,
  RichListChartResponse,
  RichListChartPoint,
  RichListChartHolderPoint,
  RichListTableResponse,
  RichListTableRow,
  RichListChartAnalytics,
  RichListTablePayload,
} from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Line,
} from 'recharts';

interface RichListSectionProps {
  mounted: boolean;
}

type ViewType = 'current' | 'chart' | 'table' | 'stats';

const RANGE_OPTIONS: RichListRange[] = ['24h', '7d', '30d', '90d', '1y', 'all'];
const TOP_OPTIONS = [5, 10, 20];

const KNOWN_HOLDER_LABELS: Record<string, { owner: string }> = {
  ADZwnGpCC3hvALEPCuZ1jb6rHA3UU9vZhjMhZncTk5g2: { owner: 'Project Related*' },
  gS9CKU9PD1Z9ZS1U6G2aXuqe8BkBuEBxRJ4UCR1NbSt: { owner: 'Team Tokens Wallet' },
  '56FyPotBFEaXzhspgzBoToPpaUzwnirR8gmpmxVuzcXk': { owner: 'Mining Wallet' },
  '7xyu2jjQ3TduMzSBpaPcEVLAgaXZrE2MVifKRtR1gnqa': { owner: 'Liquidity Wallet' },
  '8Y87i49njH7f5djbEAjowZQiCaVSK1nyefzVmQ3zXY3t': { owner: 'Company Wallet' },
  EVU9EVNiP2dXDVGV9uN6jRdcx7bsZsepwCUrC8gnPYPE: { owner: 'Gate.io' },
  AmD63mU7RyRSmgpizrM5dVZVLgokF5BzXLCpXDRFApx1: { owner: 'Individual' },
  '35ck6jeGbE8Mt6rV6LmJoxvJN3uRT1NmP2w7sJnZPzgb': { owner: 'Individual' },
  '3ih2fvQsYKP1Ws1a7GK43NGqdE7KiWcwywpKKbngbhGR': { owner: 'Project Related*' },
  '8nTNtxznMiGcmY6EKCsCD1ewGDXjmsYqtsxiS7LSgavW': { owner: 'Individual' },
  zASb9Q74YcJxunXooKMwctFXLCxn9BnbHrbuSFohoQ9: { owner: 'MEXC' },
  GWUcYBJJmUT9mL8ws7GP56QZbVNKSaheS1sbkZzYN4Ai: { owner: 'MEXC' },
  Byig39uQPFLw9EWHixreXkB31wSmnH3WjzEdMZULDvxh: { owner: 'Individual' },
  '4xhnApxwALJtY6NDE6ytMJ2NDvaYZXrE4Hq6CW4YQTDQ': { owner: 'Individual' },
  GnyfdHu6cbftE5cXeD6vWK8S7LaeuxtCHvYKC3F6LvdA: { owner: 'Individual' },
  HqikZqy2Fevzc6b5WP4CExLfsLMhri7z5HhL3L5NbiTz: { owner: 'Individual' },
  '9iF8E59Bj2rN7i1Te3nbHGXGH8cNC7ZFaP8m5hHF39Rj': { owner: 'Individual' },
  CD6iQBBkgZuoSY8PNUp4v8fDoDQ5bRScpDkaouX8FPRJ: { owner: 'Individual' },
  '9Gs4LvFZw18EBLrSmZbQBw4G2SpTu4bJRCWH1Dz33cUZ': { owner: 'Raydium Liquidity' },
  '8F4LgX2hqPxoEaiMPFrJjgpK4x2A3kchynYqYezXPiQK': { owner: 'Individual' },
};

interface HolderChangeEntry {
  address: string;
  owner?: string | null;
  rank?: number;
  badge?: string | null;
  balance: number;
  percentage: number;
  changeAbsolute: number;
  changePercent: number | null;
  previousRank?: number | null;
  rankChange?: number | null;
}

interface ChartHolderWithAddress extends RichListChartHolderPoint {
  address: string;
}

function isChartPointArray(value: unknown): value is RichListChartPoint[] {
  return Array.isArray(value);
}

function isChartEnvelope(value: unknown): value is { data: RichListChartPoint[] } {
  return (
    typeof value === 'object' && value !== null && Array.isArray((value as { data?: unknown }).data)
  );
}

function normalizeChartData(response?: RichListChartResponse): RichListChartPoint[] {
  const raw = response?.chart?.data;
  if (isChartPointArray(raw)) return raw;
  if (isChartEnvelope(raw)) return raw.data;
  return [];
}

function isHolderRecord(value: unknown): value is Record<string, RichListChartHolderPoint> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeHolderCollection(
  holders?: RichListChartPoint['holders'],
): ChartHolderWithAddress[] {
  if (!holders) return [];
  if (Array.isArray(holders)) {
    return holders
      .map((holder) => {
        const address =
          typeof holder.address === 'string' && holder.address.length ? holder.address : null;
        if (!address) return null;
        return {
          ...holder,
          address,
        };
      })
      .filter((value): value is ChartHolderWithAddress => value !== null);
  }
  if (isHolderRecord(holders)) {
    return Object.entries(holders).map(([address, holder]) => ({
      ...holder,
      address:
        typeof holder.address === 'string' && holder.address.length ? holder.address : address,
    }));
  }
  return [];
}

function buildHolderLookup(holders: ChartHolderWithAddress[]): Map<string, ChartHolderWithAddress> {
  const map = new Map<string, ChartHolderWithAddress>();
  holders.forEach((holder) => {
    map.set(holder.address, holder);
  });
  return map;
}

function computeConcentrationFromPoint(point?: RichListChartPoint): number {
  if (!point) return 0;
  if (typeof point.concentration === 'number' && Number.isFinite(point.concentration)) {
    return point.concentration;
  }
  const holders = normalizeHolderCollection(point.holders).sort((a, b) => {
    const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
    const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
    return rankA - rankB;
  });
  if (!holders.length) return 0;
  const totalBalance = holders.reduce((sum, holder) => sum + toNumeric(holder.balance), 0);
  if (totalBalance <= 0) return 0;
  const topFive = holders.slice(0, Math.min(5, holders.length));
  const topFiveTotal = topFive.reduce((sum, holder) => sum + toNumeric(holder.balance), 0);
  return (topFiveTotal / totalBalance) * 100;
}

function getTrendClass(trend?: string | null): string {
  if (!trend) return 'text-muted-foreground';
  const normalized = trend.toLowerCase();
  if (['up', 'increasing', 'positive', 'accumulation'].includes(normalized)) {
    return 'text-emerald-400';
  }
  if (['down', 'decreasing', 'negative', 'distribution'].includes(normalized)) {
    return 'text-rose-400';
  }
  return 'text-muted-foreground';
}

function mapOwnerLabel(address: string, fallback?: string | null): string | null {
  const preset = KNOWN_HOLDER_LABELS[address]?.owner;
  if (preset) return preset;
  return fallback ?? null;
}

function formatCompactNumber(value?: number | null, digits = 2): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(Math.min(digits, 3))}B`;
  }
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(Math.min(digits, 3))}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(Math.min(digits, 3))}K`;
  }
  const factorDigits = abs >= 1 ? Math.min(digits, 3) : 3;
  return Number(value.toFixed(factorDigits)).toString();
}

function formatConcentration(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  return `${value.toFixed(Math.min(value === 0 ? 0 : 3, 3))}%`;
}

function toOwnerLabel(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length ? trimmed : null;
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    for (const key of ['display', 'label', 'name', 'text', 'value']) {
      const candidate = obj[key];
      if (typeof candidate === 'string') {
        const trimmed = candidate.trim();
        if (trimmed.length) return trimmed;
      }
    }
  }
  return null;
}

function toBadgeIcon(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    const icon = (value as { icon?: unknown }).icon;
    if (typeof icon === 'string') return icon;
    const text = (value as { text?: unknown }).text;
    if (typeof text === 'string') return text;
  }
  return null;
}

function toNumeric(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

function formatNos(value?: number | null, digits = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '-';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(digits)}M`;
  }
  if (abs >= 1_000) {
    return `${(value / 1_000).toFixed(digits)}K`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatPercent(value?: number | string | null, digits = 2) {
  if (value === null || value === undefined) return '-';
  const num = typeof value === 'string' ? parseFloat(value) : value;
  if (!Number.isFinite(num)) return '-';
  return `${num.toFixed(digits)}%`;
}

function truncateAddress(address?: string | null, size = 4) {
  if (!address) return '-';
  if (address.length <= size * 2) return address;
  return `${address.slice(0, size)}…${address.slice(-size)}`;
}

function formatDateLabel(value?: string | null) {
  if (!value) return '—';
  try {
    return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <div className={cn('skeleton', className)}>
      <div className="absolute inset-0 skeleton-shimmer" />
    </div>
  );
}

export function RichListSection({ mounted }: RichListSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('holders.richList');
  const tc = useTranslations('common');

  const [selectedView, setSelectedView] = useState<ViewType>('current');
  const [selectedRange, setSelectedRange] = useState<RichListRange>('30d');
  const [topCount, setTopCount] = useState<number>(10);
  const [tablePage, setTablePage] = useState(1);
  const [sortField, setSortField] = useState('rank');
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC'>('ASC');

  const { data: widgetData, isLoading } = useQuery<{
    success: boolean;
    widget: RichListWidgetData;
    meta?: Record<string, unknown>;
  }>({
    queryKey: ['richlist-widget'],
    queryFn: () => apiClient.getRichListWidgetData(),
    enabled: mounted,
    staleTime: 60_000,
  });

  const {
    data: chartData,
    isLoading: isLoadingChart,
    isFetching: isFetchingChart,
  } = useQuery<RichListChartResponse>({
    queryKey: ['richlist-chart', selectedRange, topCount],
    queryFn: () => apiClient.getRichListChartData({ range: selectedRange, top: topCount }),
    enabled: mounted,
    staleTime: 300_000,
  });

  const widget = widgetData?.widget;
  const concentration = widget?.concentration;
  const whaleActivity = widget?.whaleActivity;
  const selectedRangeLabel = tc(`timeRanges.${selectedRange}`);

  const chartPoints = useMemo(() => normalizeChartData(chartData), [chartData]);
  const chartAnalytics: RichListChartAnalytics | undefined = chartData?.chart?.analytics;
  const latestTimestamp = chartPoints.length
    ? chartPoints[chartPoints.length - 1]?.timestamp
    : undefined;
  const comparisonTimestamp = chartPoints.length ? chartPoints[0]?.timestamp : undefined;

  const {
    data: tableData,
    isFetching: isFetchingTable,
    isLoading: isLoadingTable,
  } = useQuery<RichListTableResponse>({
    queryKey: [
      'richlist-table',
      tablePage,
      sortField,
      sortOrder,
      selectedRange,
      topCount,
      comparisonTimestamp,
    ],
    queryFn: () =>
      apiClient.getRichListTableData({
        page: tablePage,
        limit: topCount,
        sortBy: sortField,
        sortOrder,
        date: comparisonTimestamp,
        range: selectedRange,
        maxRank: topCount,
        top: topCount,
      }),
    enabled:
      mounted && (selectedView === 'table' || selectedView === 'stats') && chartPoints.length > 0,
    staleTime: 300_000,
    keepPreviousData: true,
  });

  const chartSeries = useMemo(() => {
    return chartPoints.map((point) => {
      const concentrationValueRaw = computeConcentrationFromPoint(point);
      const concentrationValue = Math.round(concentrationValueRaw * 1000) / 1000;
      return {
        timestamp: point.timestamp,
        label: formatDateLabel(point.timestamp),
        totalBalance: toNumeric(point.totalBalance),
        concentration: concentrationValue,
      };
    });
  }, [chartPoints]);

  const chartDomain = useMemo<[number, number] | undefined>(() => {
    if (!chartSeries.length) return undefined;
    const values = chartSeries
      .map((point) => point.totalBalance)
      .filter((value) => Number.isFinite(value));
    if (!values.length) return undefined;
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return undefined;
    if (min === max) {
      const bufferBase = Math.abs(min) * 0.05;
      const buffer = bufferBase === 0 ? 1 : bufferBase;
      return [min - buffer, max + buffer];
    }
    const paddingBase = (max - min) * 0.05;
    const padding = paddingBase === 0 ? 1 : paddingBase;
    return [min - padding, max + padding];
  }, [chartSeries]);

  const concentrationTrend = useMemo(() => {
    return chartPoints.map((point) => {
      const concentrationValueRaw = computeConcentrationFromPoint(point);
      const concentrationValue = Math.round(concentrationValueRaw * 1000) / 1000;
      return {
        timestamp: point.timestamp,
        date: formatDateLabel(point.timestamp),
        concentration: concentrationValue,
      };
    });
  }, [chartPoints]);

  const baselineHolders = useMemo(
    () => normalizeHolderCollection(chartPoints[0]?.holders),
    [chartPoints],
  );
  const baselineLookup = useMemo(() => buildHolderLookup(baselineHolders), [baselineHolders]);
  const latestHolders = useMemo(
    () => normalizeHolderCollection(chartPoints[chartPoints.length - 1]?.holders),
    [chartPoints],
  );

  const holderEntries = useMemo<HolderChangeEntry[]>(() => {
    if (latestHolders.length) {
      return latestHolders
        .sort((a, b) => {
          const rankA = a.rank ?? Number.MAX_SAFE_INTEGER;
          const rankB = b.rank ?? Number.MAX_SAFE_INTEGER;
          return rankA - rankB;
        })
        .slice(0, topCount)
        .map((holder, index) => {
          const address = holder.address;
          const rank = Number.isFinite(holder.rank) ? Number(holder.rank) : index + 1;
          const badge = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
          const currentBalance = toNumeric(holder.balance);
          const currentPercent = toNumeric(holder.percentage);
          const baseline = baselineLookup.get(address);
          const previousBalance = baseline ? toNumeric(baseline.balance) : 0;
          const hasBaseline = Boolean(baseline);
          const balanceChange = hasBaseline ? currentBalance - previousBalance : currentBalance;
          const changePercent =
            hasBaseline && previousBalance !== 0
              ? (balanceChange / previousBalance) * 100
              : hasBaseline
                ? null
                : null;
          const ownerLabel = mapOwnerLabel(address, toOwnerLabel(holder.owner));
          const previousRank = baseline?.rank ?? null;
          const rankChange =
            previousRank !== null && Number.isFinite(previousRank)
              ? (previousRank as number) - rank
              : null;

          return {
            address,
            owner: ownerLabel,
            rank,
            badge,
            percentage: currentPercent,
            balance: currentBalance,
            changeAbsolute: balanceChange,
            changePercent,
            previousRank,
            rankChange,
          };
        });
    }

    return (widget?.topHolders ?? []).slice(0, topCount).map((holder) => {
      const address = holder.fullAddress ?? holder.address;
      const ownerLabel = mapOwnerLabel(address, toOwnerLabel(holder.owner));
      const percentRaw =
        typeof holder.percentOfSupply === 'string'
          ? holder.percentOfSupply.replace('%', '')
          : (holder.percentOfSupply ?? holder.percentage);
      return {
        address,
        owner: ownerLabel,
        rank: holder.rank,
        badge: toBadgeIcon(holder.badge),
        percentage: toNumeric(percentRaw),
        balance: toNumeric(holder.balance),
        changeAbsolute: 0,
        changePercent: 0,
        previousRank: holder.rank ?? null,
        rankChange: null,
      };
    });
  }, [latestHolders, topCount, baselineLookup, widget?.topHolders]);

  const tablePayload = useMemo<RichListTablePayload | undefined>(() => {
    const rows = tableData?.table?.rows;
    if (!rows) return undefined;
    if (Array.isArray(rows)) {
      return {
        data: rows,
      } as RichListTablePayload;
    }
    return rows as RichListTablePayload;
  }, [tableData]);

  const tableRows = useMemo(() => tablePayload?.data ?? [], [tablePayload]);
  const tableComparison = tablePayload?.comparison;
  const tableSummary = tablePayload?.summary;
  const tableComparisonLabel = useMemo(() => {
    if (tableComparison?.label) return tableComparison.label;
    if (tableComparison?.timestamp) {
      return `Change vs ${formatDateLabel(tableComparison.timestamp)}`;
    }
    return `Change vs ${selectedRangeLabel}`;
  }, [tableComparison, selectedRangeLabel]);
  const balanceAnalytics = chartAnalytics?.totalBalance;
  const concentrationAnalytics = chartAnalytics?.concentration;
  const holderAnalytics = chartAnalytics?.holders;
  const volatilityValue = chartAnalytics?.volatility;
  const concentrationSummary = tableSummary?.concentration;
  const supplySummary = tableSummary?.supply;
  const balanceChangePercentText =
    typeof balanceAnalytics?.changePercent === 'number'
      ? `${balanceAnalytics.changePercent >= 0 ? '+' : ''}${balanceAnalytics.changePercent.toFixed(2)}%`
      : '—';
  const holderChangeSummary = useMemo(() => {
    if (!holderEntries.length) {
      return null;
    }
    let accumulating = 0;
    let distributing = 0;
    let stable = 0;
    let newEntrants = 0;
    let netFlow = 0;
    holderEntries.forEach((entry) => {
      netFlow += entry.changeAbsolute;
      if (entry.changePercent === null) {
        newEntrants += 1;
        return;
      }
      if (entry.changeAbsolute > 0) {
        accumulating += 1;
      } else if (entry.changeAbsolute < 0) {
        distributing += 1;
      } else {
        stable += 1;
      }
    });
    return {
      accumulating,
      distributing,
      stable,
      newEntrants,
      netFlow,
    };
  }, [holderEntries]);

  const whaleSummary = useMemo(() => {
    if (holderChangeSummary) {
      return holderChangeSummary;
    }
    const summary = whaleActivity?.summary;
    return {
      accumulating: summary?.accumulating ?? 0,
      distributing: summary?.distributing ?? 0,
      stable: summary?.stable ?? 0,
      netFlow: summary?.netFlow ?? 0,
    };
  }, [holderChangeSummary, whaleActivity?.summary]);

  const concentrationStart =
    concentrationAnalytics?.start ?? concentrationTrend[0]?.concentration ?? null;
  const concentrationEnd =
    concentrationAnalytics?.end ??
    concentrationTrend[concentrationTrend.length - 1]?.concentration ??
    null;

  const chartDataReady = chartSeries.length > 0;
  const showInitialSkeleton = isLoading && !widget;
  const fetchingChart = isLoadingChart || isFetchingChart;
  const showChartSkeleton = selectedView === 'chart' && !chartDataReady && fetchingChart;
  const waitingOnChartForTable = selectedView === 'table' && !chartDataReady && fetchingChart;
  const showTableSkeleton =
    selectedView === 'table' &&
    (((isLoadingTable || isFetchingTable) && !tableRows.length) || waitingOnChartForTable);
  const showStatsSkeleton =
    selectedView === 'stats' &&
    (!balanceAnalytics || !concentrationAnalytics || !holderAnalytics) &&
    fetchingChart;

  const views = [
    { id: 'current' as ViewType, label: t('views.current'), icon: Activity },
    { id: 'chart' as ViewType, label: t('views.chart'), icon: LineChart },
    { id: 'table' as ViewType, label: t('views.table'), icon: Table },
    { id: 'stats' as ViewType, label: t('views.stats'), icon: BarChart3 },
  ];

  if (showInitialSkeleton) {
    return (
      <div className="space-y-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-sm border border-primary/10">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
          <div className="relative p-4 sm:p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <SkeletonBlock className="h-12 w-12 rounded-2xl" />
                <div className="space-y-2">
                  <SkeletonBlock className="h-6 w-48 rounded-lg" />
                  <SkeletonBlock className="h-4 w-64 rounded-lg" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock key={index} className="h-9 w-20 rounded-lg" />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/40 bg-background p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-border/40 bg-muted/20 space-y-3"
              >
                <SkeletonBlock className="h-4 w-28 rounded-lg" />
                <SkeletonBlock className="h-6 w-36 rounded-lg" />
                <SkeletonBlock className="h-3 w-24 rounded-lg" />
              </div>
            ))}
          </div>

          <div className="relative h-56 rounded-2xl border border-dashed border-border/40 bg-muted/10 overflow-hidden">
            <SkeletonBlock className="absolute inset-0" />
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="p-4 rounded-xl border border-border/40 bg-background/70 space-y-2"
              >
                <SkeletonBlock className="h-3 w-32 rounded-lg" />
                <SkeletonBlock className="h-4 w-40 rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Modern Header with Gradient Background - EXACT COPY from DistributionSection */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent backdrop-blur-sm border border-primary/10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-50" />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 rounded-xl bg-primary/10 backdrop-blur-sm">
                  <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                </div>
                <h2 className={cn(text('lg', '2xl', 'font-bold'))}>{t('title')}</h2>
              </div>
              <p className={cn(text('xs', 'base'), 'text-muted-foreground')}>
                Track the wealthiest NOS holders and market concentration
              </p>
            </div>

            {/* View Selector - Modern Pills */}
            <div className="flex items-center gap-1.5 sm:gap-2 p-1 bg-background/50 backdrop-blur-sm rounded-xl border border-border/50">
              {views.map((view) => {
                const Icon = view.icon;
                return (
                  <button
                    key={view.id}
                    onClick={() => setSelectedView(view.id)}
                    className={cn(
                      'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-lg font-medium transition-all duration-200',
                      text('xs', 'sm'),
                      selectedView === view.id
                        ? 'bg-primary text-primary-foreground shadow'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="hidden sm:inline">{view.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Current View */}
      {selectedView === 'current' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Main Rich List Card */}
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-background via-background/95 to-background/90 border backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-15" />

              <div className="relative p-4 sm:p-6 lg:p-8">
                {/* Header with controls */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                  <div>
                    <h3 className={cn(text('base', 'lg', 'font-semibold'))}>
                      Concentration Overview
                    </h3>
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      Top holder statistics and trends
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex flex-wrap gap-2">
                    {/* Range selector */}
                    <div className="flex gap-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                      {RANGE_OPTIONS.map((option) => (
                        <button
                          key={option}
                          onClick={() => setSelectedRange(option)}
                          className={cn(
                            'px-3 py-1.5 text-xs font-medium transition-colors',
                            selectedRange === option
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          {tc(`timeRanges.${option}`)}
                        </button>
                      ))}
                    </div>

                    {/* Top count selector */}
                    <div className="flex gap-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                      {TOP_OPTIONS.map((option) => (
                        <button
                          key={option}
                          onClick={() => setTopCount(option)}
                          className={cn(
                            'px-3 py-1.5 text-xs font-medium transition-colors',
                            topCount === option
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground',
                          )}
                        >
                          Top {option}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid gap-4 md:grid-cols-3 mb-6">
                  <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-amber-500/10 to-amber-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Crown className="w-4 h-4 text-amber-500" />
                      <span className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                        Top Holder
                      </span>
                    </div>
                    <p className={cn(text('xl', '2xl', 'font-bold'))}>
                      {formatCompactNumber(concentration?.top1?.balance)}
                    </p>
                    <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                      {formatPercent(concentration?.top1?.percentage)} of supply
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-blue-500/10 to-blue-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-500" />
                      <span className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                        Top 10 Holdings
                      </span>
                    </div>
                    <p className={cn(text('xl', '2xl', 'font-bold'))}>
                      {formatCompactNumber(concentration?.top10?.balance)}
                    </p>
                    <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                      {formatPercent(concentration?.top10?.percentage)} of supply
                    </p>
                  </div>

                  <div className="p-4 rounded-xl border border-border/40 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      <span className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                        Top 20 Holdings
                      </span>
                    </div>
                    <p className={cn(text('xl', '2xl', 'font-bold'))}>
                      {formatCompactNumber(concentration?.top20?.balance)}
                    </p>
                    <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                      {formatPercent(concentration?.top20?.percentage)} of supply
                    </p>
                  </div>
                </div>

                {/* Chart */}
                <div className="h-80 mb-6">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartSeries}>
                      <defs>
                        <linearGradient id="richListGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="hsl(var(--border))"
                        opacity={0.3}
                      />
                      <XAxis
                        dataKey="label"
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                      />
                      <YAxis
                        tickFormatter={(value) => formatCompactNumber(value as number, 3)}
                        tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        domain={chartDomain ?? ['dataMin', 'dataMax']}
                        allowDecimals
                      />
                      <Tooltip
                        contentStyle={{
                          background: 'hsl(var(--background))',
                          borderRadius: '0.75rem',
                          border: '1px solid hsl(var(--border))',
                        }}
                        formatter={(value: number) => [
                          `${formatCompactNumber(value, 3)} NOS`,
                          'Balance',
                        ]}
                        labelFormatter={(label) => formatDateLabel(String(label))}
                      />
                      <Area
                        type="monotone"
                        dataKey="totalBalance"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#richListGradient)"
                        baseValue="dataMin"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Top Holders List */}
                <div className="border-t border-border/30 pt-6">
                  <h4 className={cn(text('sm', 'base', 'font-semibold'), 'mb-4')}>
                    Top {topCount} Holders
                  </h4>
                  <div className="space-y-3">
                    {holderEntries.map((entry) => {
                      const isPositive = entry.changeAbsolute > 0;
                      const isNegative = entry.changeAbsolute < 0;
                      const changeMagnitude = formatCompactNumber(Math.abs(entry.changeAbsolute));
                      const changePercentDisplay =
                        entry.changePercent !== null
                          ? `${Math.abs(entry.changePercent).toFixed(2)}%`
                          : null;
                      const changeClass =
                        entry.changePercent === null
                          ? 'text-muted-foreground'
                          : isPositive
                            ? 'text-emerald-400'
                            : isNegative
                              ? 'text-rose-400'
                              : 'text-muted-foreground';
                      const rankShiftLabel =
                        entry.previousRank !== null &&
                        entry.previousRank !== undefined &&
                        entry.previousRank !== entry.rank
                          ? `#${entry.previousRank} → #${entry.rank}`
                          : null;
                      const getRankColor = (rank?: number) => {
                        if (rank === 1) return 'from-amber-500 to-yellow-600';
                        if (rank === 2) return 'from-slate-400 to-slate-500';
                        if (rank === 3) return 'from-orange-600 to-orange-700';
                        return 'from-primary to-primary/70';
                      };

                      return (
                        <div
                          key={entry.address}
                          className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-background/50 hover:bg-background/80 transition-colors"
                        >
                          <div
                            className={cn(
                              'flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br text-white font-bold',
                              getRankColor(entry.rank),
                            )}
                          >
                            #{entry.rank}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              {entry.badge && <span>{entry.badge}</span>}
                              <a
                                href={`https://solscan.io/account/${entry.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  text('sm', 'base'),
                                  'font-semibold truncate flex items-center gap-1 hover:underline',
                                )}
                              >
                                <span className="truncate">
                                  {truncateAddress(entry.address, 6)}
                                </span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              </a>
                            </div>
                            <div className="flex items-center gap-3">
                              <a
                                href={`https://solscan.io/account/${entry.address}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  text('2xs', 'xs'),
                                  'text-muted-foreground truncate hover:underline',
                                )}
                              >
                                {entry.owner || 'Unknown'}
                              </a>
                              <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                •
                              </span>
                              <div className="flex items-center gap-1">
                                <Wallet className="w-3 h-3 text-muted-foreground" />
                                <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                  {formatCompactNumber(entry.balance)} NOS
                                </span>
                              </div>
                              {rankShiftLabel && (
                                <>
                                  <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                    •
                                  </span>
                                  <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                    {rankShiftLabel}
                                  </span>
                                </>
                              )}
                            </div>
                            <div
                              className={cn(
                                'flex items-center gap-2 mt-2',
                                text('2xs', 'xs'),
                                changeClass,
                              )}
                            >
                              {entry.changePercent === null ? (
                                <span className="text-muted-foreground">New in top {topCount}</span>
                              ) : (
                                <>
                                  {isPositive ? (
                                    <TrendingUp className="w-3 h-3" />
                                  ) : isNegative ? (
                                    <TrendingDown className="w-3 h-3" />
                                  ) : (
                                    <Activity className="w-3 h-3 text-muted-foreground" />
                                  )}
                                  <span>{`${isPositive ? '+' : isNegative ? '-' : ''}${changeMagnitude} NOS`}</span>
                                  <span>({changePercentDisplay})</span>
                                  <span className="text-muted-foreground">
                                    over {selectedRangeLabel}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={cn(text('base', 'lg'), 'font-bold text-primary')}>
                              {formatPercent(entry.percentage)}
                            </p>
                            <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                              of supply
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Chart View */}
      {selectedView === 'chart' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {showChartSkeleton && (
              <>
                <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/5 p-6 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <SkeletonBlock className="h-5 w-44 rounded-lg" />
                      <SkeletonBlock className="h-3 w-56 rounded-lg" />
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: 2 }).map((_, index) => (
                        <SkeletonBlock key={index} className="h-9 w-24 rounded-lg" />
                      ))}
                    </div>
                  </div>
                  <div className="relative h-96 rounded-2xl border border-dashed border-border/40 bg-muted/10 overflow-hidden">
                    <SkeletonBlock className="absolute inset-0" />
                  </div>
                </div>

                <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/5 p-6 space-y-4">
                  <SkeletonBlock className="h-4 w-40 rounded-lg" />
                  <SkeletonBlock className="h-3 w-52 rounded-lg" />
                  <div className="relative h-48 rounded-2xl border border-dashed border-border/40 bg-muted/10 overflow-hidden">
                    <SkeletonBlock className="absolute inset-0" />
                  </div>
                </div>
              </>
            )}

            {!showChartSkeleton && (
              <>
                <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/5 p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                    <div>
                      <h3 className={cn(text('base', 'lg', 'font-semibold'))}>
                        Concentration Trend
                      </h3>
                      <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                        Top {topCount} holders balance over {tc(`timeRanges.${selectedRange}`)}
                      </p>
                    </div>

                    {/* Controls */}
                    <div className="flex flex-wrap gap-2">
                      {/* Range selector */}
                      <div className="flex gap-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                        {RANGE_OPTIONS.map((option) => (
                          <button
                            key={option}
                            onClick={() => setSelectedRange(option)}
                            className={cn(
                              'px-3 py-1.5 text-xs font-medium transition-colors',
                              selectedRange === option
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            {tc(`timeRanges.${option}`)}
                          </button>
                        ))}
                      </div>

                      {/* Top count selector */}
                      <div className="flex gap-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                        {TOP_OPTIONS.map((option) => (
                          <button
                            key={option}
                            onClick={() => setTopCount(option)}
                            className={cn(
                              'px-3 py-1.5 text-xs font-medium transition-colors',
                              topCount === option
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground',
                            )}
                          >
                            Top {option}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartSeries}>
                        <defs>
                          <linearGradient id="chartBalance" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          opacity={0.3}
                        />
                        <XAxis
                          dataKey="label"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <YAxis
                          yAxisId="left"
                          tickFormatter={(value) => formatCompactNumber(value as number, 3)}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                          domain={chartDomain ?? ['dataMin', 'dataMax']}
                          allowDecimals
                          allowDataOverflow
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tickFormatter={(value) => formatConcentration(value as number)}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                          axisLine={{ stroke: 'hsl(var(--border))' }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--background))',
                            borderRadius: '0.75rem',
                            border: '1px solid hsl(var(--border))',
                          }}
                          formatter={(value: number, name) => {
                            if (name === 'concentration') {
                              return [formatConcentration(value), 'Concentration'];
                            }
                            return [`${formatCompactNumber(value, 3)} NOS`, 'Balance'];
                          }}
                          labelFormatter={(label) => formatDateLabel(String(label))}
                        />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="totalBalance"
                          stroke="hsl(var(--primary))"
                          strokeWidth={3}
                          fill="url(#chartBalance)"
                          baseValue="dataMin"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="concentration"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/5 p-6">
                  <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-4')}>
                    Top {topCount} Concentration Trend
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={concentrationTrend}>
                        <defs>
                          <linearGradient id="sparkConcentration" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.45} />
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.05} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="hsl(var(--border))"
                          opacity={0.2}
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <YAxis
                          tickFormatter={(value) => `${Number(value).toFixed(1)}%`}
                          tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                        />
                        <Tooltip
                          contentStyle={{
                            background: 'hsl(var(--background))',
                            borderRadius: '0.75rem',
                            border: '1px solid hsl(var(--border))',
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey="concentration"
                          stroke="#10b981"
                          strokeWidth={2}
                          fill="url(#sparkConcentration)"
                          baseValue="dataMin"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Table View */}
      {selectedView === 'table' && (
        <div className="rounded-2xl border border-border/40 bg-background p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className={cn(text('base', 'lg', 'font-semibold'))}>Holders Table</h3>
              {tableComparison?.timestamp && (
                <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                  Comparing against snapshot from {formatDateLabel(tableComparison.timestamp)}
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="flex flex-wrap gap-2 justify-end">
              <div className="flex gap-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                {RANGE_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedRange(option)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium transition-colors',
                      selectedRange === option
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {tc(`timeRanges.${option}`)}
                  </button>
                ))}
              </div>

              <div className="flex gap-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                {TOP_OPTIONS.map((option) => (
                  <button
                    key={option}
                    onClick={() => setTopCount(option)}
                    className={cn(
                      'px-3 py-1.5 text-xs font-medium transition-colors',
                      topCount === option
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    Top {option}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th
                    className={cn(
                      text('xs', 'sm'),
                      'text-left p-3 text-muted-foreground font-medium',
                    )}
                  >
                    Rank
                  </th>
                  <th
                    className={cn(
                      text('xs', 'sm'),
                      'text-left p-3 text-muted-foreground font-medium',
                    )}
                  >
                    Holder
                  </th>
                  <th
                    className={cn(
                      text('xs', 'sm'),
                      'text-right p-3 text-muted-foreground font-medium',
                    )}
                  >
                    Current Balance
                  </th>
                  <th
                    className={cn(
                      text('xs', 'sm'),
                      'text-right p-3 text-muted-foreground font-medium',
                    )}
                  >
                    {tableComparisonLabel}
                  </th>
                  <th
                    className={cn(
                      text('xs', 'sm'),
                      'text-right p-3 text-muted-foreground font-medium',
                    )}
                  >
                    Baseline
                  </th>
                </tr>
              </thead>
              <tbody>
                {showTableSkeleton ? (
                  Array.from({ length: 6 }).map((_, index) => (
                    <tr
                      key={`richlist-table-skeleton-${index}`}
                      className="border-b border-border/30"
                    >
                      {Array.from({ length: 5 }).map((__, cellIndex) => (
                        <td key={cellIndex} className="p-3">
                          <SkeletonBlock className="h-4 w-full max-w-[140px] rounded-lg" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : (
                  <>
                    {!isFetchingTable && tableRows.length === 0 && (
                      <tr>
                        <td
                          colSpan={5}
                          className={cn(
                            text('sm', 'base'),
                            'p-6 text-center text-muted-foreground',
                          )}
                        >
                          No holder data found for this range.
                        </td>
                      </tr>
                    )}

                    {tableRows.map((row) => {
                      const rankValue =
                        row.rank?.value ?? (typeof row.rank === 'number' ? row.rank : null);
                      const addressValue = row.address?.fullAddress ?? row.address?.value ?? '';
                      const addressDisplay =
                        row.address?.display ?? truncateAddress(addressValue, 8);
                      const ownerRaw = row.owner?.display ?? row.owner?.value ?? 'Unknown';
                      const ownerDisplay = mapOwnerLabel(addressValue, ownerRaw) ?? ownerRaw;
                      const ownerLink = `https://solscan.io/account/${addressValue}`;
                      const percentDisplay =
                        row.percentOfSupply?.display ?? formatPercent(row.percentOfSupply?.value);
                      const changeCell = row.change ?? row.change24h?.balance ?? null;
                      const changeTrend =
                        changeCell?.trend ?? row.change24h?.balance?.trend ?? null;
                      const changeAbsolute = changeCell?.absolute ?? 0;
                      const changePercentage =
                        typeof changeCell?.percentage === 'number' ? changeCell.percentage : null;
                      const changeClass = getTrendClass(changeTrend);
                      const changeSign = changeAbsolute > 0 ? '+' : changeAbsolute < 0 ? '-' : '';
                      const changeMagnitude =
                        changeAbsolute !== 0 ? formatCompactNumber(Math.abs(changeAbsolute)) : '0';
                      const changePercentLabel =
                        changePercentage !== null && row.comparison?.balance !== null
                          ? `${changePercentage >= 0 ? '+' : ''}${changePercentage.toFixed(2)}%`
                          : null;
                      const isNewEntry =
                        row.comparison &&
                        (row.comparison.balance === null || row.comparison.balance === undefined);
                      const baselineDisplay = row.comparison?.display ?? '—';
                      const baselineRank = row.comparison?.rank ? `#${row.comparison.rank}` : null;
                      const rankChangeCell = row.change24h?.rank;
                      const rankTrendClass = getTrendClass(rankChangeCell?.trend);
                      const rankChangeDisplay = rankChangeCell?.display ?? '—';

                      return (
                        <tr
                          key={`${addressValue}-${rankValue}`}
                          className="border-b border-border/40 hover:bg-muted/20 transition-colors"
                        >
                          <td className={cn(text('sm', 'base'), 'p-3 font-semibold')}>
                            #{rankValue ?? '—'}
                          </td>
                          <td className="p-3">
                            <div className="flex flex-col gap-1">
                              <a
                                href={`https://solscan.io/account/${addressValue}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  text('sm', 'base'),
                                  'font-mono flex items-center gap-1 hover:underline',
                                )}
                              >
                                <span className="truncate">{addressDisplay}</span>
                                <ExternalLink className="w-3 h-3 text-muted-foreground" />
                              </a>
                              <a
                                href={ownerLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={cn(
                                  text('2xs', 'xs'),
                                  'text-muted-foreground truncate hover:underline',
                                )}
                              >
                                {ownerDisplay}
                              </a>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={cn(text('sm', 'base'), 'font-semibold')}>
                                {row.balance?.display ??
                                  `${formatCompactNumber(row.balance?.value)} NOS`}
                              </span>
                              <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                {percentDisplay} of supply
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              {isNewEntry ? (
                                <span
                                  className={cn(
                                    text('2xs', 'xs'),
                                    'text-muted-foreground font-medium',
                                  )}
                                >
                                  New in this range
                                </span>
                              ) : (
                                <span
                                  className={cn(text('sm', 'base'), 'font-semibold', changeClass)}
                                >
                                  {`${changeSign}${changeMagnitude} NOS`}
                                </span>
                              )}
                              {changePercentLabel && (
                                <span className={cn(text('2xs', 'xs'), changeClass)}>
                                  {changePercentLabel}
                                </span>
                              )}
                              {rankChangeDisplay && rankChangeDisplay !== '-' && (
                                <span className={cn(text('2xs', 'xs'), rankTrendClass)}>
                                  Rank {rankChangeDisplay}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex flex-col items-end gap-1">
                              <span className={cn(text('sm', 'base'), 'font-semibold')}>
                                {baselineDisplay}
                              </span>
                              {baselineRank && (
                                <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                                  {baselineRank}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>
            </table>
          </div>

          <div className="space-y-4 md:hidden">
            {showTableSkeleton
              ? Array.from({ length: Math.max(tableRows.length || 1, topCount) }).map(
                  (_, index) => (
                    <div
                      key={`richlist-table-card-skeleton-${index}`}
                      className="p-4 rounded-xl border border-border/30 bg-muted/10 space-y-3"
                    >
                      <SkeletonBlock className="h-4 w-24 rounded-lg" />
                      <SkeletonBlock className="h-5 w-48 rounded-lg" />
                      <SkeletonBlock className="h-4 w-32 rounded-lg" />
                      <SkeletonBlock className="h-4 w-full rounded-lg" />
                    </div>
                  ),
                )
              : tableRows.map((row) => {
                  const rankValue =
                    row.rank?.value ?? (typeof row.rank === 'number' ? row.rank : null);
                  const addressValue = row.address?.fullAddress ?? row.address?.value ?? '';
                  const addressDisplay = row.address?.display ?? truncateAddress(addressValue, 8);
                  const ownerRaw = row.owner?.display ?? row.owner?.value ?? 'Unknown';
                  const ownerDisplay = mapOwnerLabel(addressValue, ownerRaw) ?? ownerRaw;
                  const ownerLink = `https://solscan.io/account/${addressValue}`;
                  const changeCell = row.change ?? row.change24h?.balance ?? null;
                  const changeTrend = changeCell?.trend ?? row.change24h?.balance?.trend ?? null;
                  const changeAbsolute = changeCell?.absolute ?? 0;
                  const changePercentage =
                    typeof changeCell?.percentage === 'number' ? changeCell.percentage : null;
                  const changeClass = getTrendClass(changeTrend);
                  const changeSign = changeAbsolute > 0 ? '+' : changeAbsolute < 0 ? '-' : '';
                  const changeMagnitude =
                    changeAbsolute !== 0 ? formatCompactNumber(Math.abs(changeAbsolute)) : '0';
                  const changePercentLabel =
                    changePercentage !== null
                      ? `${changePercentage >= 0 ? '+' : ''}${changePercentage.toFixed(2)}%`
                      : null;
                  const percentDisplay =
                    row.percentOfSupply?.display ?? formatPercent(row.percentOfSupply?.value);
                  const baselineDisplay = row.comparison?.display ?? '—';
                  const baselineRank = row.comparison?.rank ? `#${row.comparison.rank}` : null;
                  const isNewEntry =
                    row.comparison &&
                    (row.comparison.balance === null || row.comparison.balance === undefined);

                  return (
                    <div
                      key={`${addressValue}-${rankValue}-card`}
                      className="p-4 rounded-xl border border-border/40 bg-muted/10 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className={cn(text('sm', 'base'), 'font-semibold')}>
                          #{rankValue ?? '—'}
                        </span>
                        <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                          {tableComparisonLabel}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <a
                          href={`https://solscan.io/account/${addressValue}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            text('sm', 'base'),
                            'font-mono flex items-center gap-1 hover:underline',
                          )}
                        >
                          <span className="truncate">{addressDisplay}</span>
                          <ExternalLink className="w-3 h-3 text-muted-foreground" />
                        </a>
                        <a
                          href={ownerLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={cn(
                            text('2xs', 'xs'),
                            'text-muted-foreground truncate hover:underline',
                          )}
                        >
                          {ownerDisplay}
                        </a>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                            Current Balance
                          </span>
                          <span className={cn(text('sm', 'base'), 'font-semibold')}>
                            {row.balance?.display ??
                              `${formatCompactNumber(row.balance?.value)} NOS`}
                          </span>
                          <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                            {percentDisplay} of supply
                          </span>
                        </div>
                        <div className="space-y-1 text-right">
                          <span className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                            {tableComparisonLabel}
                          </span>
                          {isNewEntry ? (
                            <span
                              className={cn(text('2xs', 'xs'), 'text-muted-foreground font-medium')}
                            >
                              New in this range
                            </span>
                          ) : (
                            <span className={cn(text('sm', 'base'), 'font-semibold', changeClass)}>
                              {`${changeSign}${changeMagnitude} NOS`}
                            </span>
                          )}
                          {changePercentLabel && (
                            <span className={cn(text('2xs', 'xs'), changeClass)}>
                              {changePercentLabel}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-muted-foreground">
                        <span className={cn(text('2xs', 'xs'))}>Baseline</span>
                        <span className={cn(text('2xs', 'xs'))}>{baselineDisplay}</span>
                        {baselineRank && (
                          <span className={cn(text('2xs', 'xs'))}>{baselineRank}</span>
                        )}
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* Stats View */}
      {selectedView === 'stats' && (
        <AnimatePresence mode="wait">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex justify-end">
              <div className="flex flex-wrap gap-2">
                <div className="flex gap-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                  {RANGE_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => setSelectedRange(option)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium transition-colors',
                        selectedRange === option
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      {tc(`timeRanges.${option}`)}
                    </button>
                  ))}
                </div>

                <div className="flex gap-1 rounded-lg overflow-hidden border border-border/50 bg-muted/30">
                  {TOP_OPTIONS.map((option) => (
                    <button
                      key={option}
                      onClick={() => setTopCount(option)}
                      className={cn(
                        'px-3 py-1.5 text-xs font-medium transition-colors',
                        topCount === option
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground',
                      )}
                    >
                      Top {option}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {showStatsSkeleton ? (
              <div className="grid gap-6 lg:grid-cols-2">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/5 p-6 space-y-4"
                  >
                    <SkeletonBlock className="h-4 w-40 rounded-lg" />
                    {Array.from({ length: 4 }).map((__, rowIndex) => (
                      <div key={rowIndex} className="p-4 rounded-xl bg-muted/20">
                        <div className="flex items-center justify-between">
                          <SkeletonBlock className="h-3 w-28 rounded-lg" />
                          <SkeletonBlock className="h-4 w-24 rounded-lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/5 p-6">
                    <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-6')}>
                      Range Overview
                    </h3>
                    <dl className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          Start Balance
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold')}>
                          {formatCompactNumber(balanceAnalytics?.start)} NOS
                        </dd>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          End Balance
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold')}>
                          {formatCompactNumber(balanceAnalytics?.end)} NOS
                        </dd>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          {tableComparisonLabel}
                        </dt>
                        <dd
                          className={cn(
                            text('base', 'lg'),
                            getTrendClass(
                              balanceAnalytics?.change
                                ? balanceAnalytics.change > 0
                                  ? 'up'
                                  : balanceAnalytics.change < 0
                                    ? 'down'
                                    : undefined
                                : undefined,
                            ),
                            'font-bold',
                          )}
                        >
                          {formatCompactNumber(balanceAnalytics?.change)} NOS (
                          {balanceChangePercentText})
                        </dd>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          Volatility
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold')}>
                          {volatilityValue ? `${volatilityValue.toFixed(2)}%` : '—'}
                        </dd>
                      </div>
                      {typeof supplySummary?.tracked === 'number' && (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                          <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                            Tracked Supply
                          </dt>
                          <dd className={cn(text('base', 'lg'), 'font-bold')}>
                            {formatPercent(supplySummary.tracked)}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/5 p-6">
                    <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-6')}>
                      Holder Dynamics
                    </h3>
                    <dl className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          Tracked Holders
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold')}>
                          {holderAnalytics?.total ?? '—'}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          Consistent
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold')}>
                          {holderAnalytics?.consistent ?? '—'}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          New Entrants
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold text-emerald-400')}>
                          {holderAnalytics?.newEntrants ?? holderChangeSummary?.newEntrants ?? '—'}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          Exits
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold text-rose-400')}>
                          {holderAnalytics?.exits ?? holderChangeSummary?.distributing ?? '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/5 p-6">
                    <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-6')}>
                      Concentration Metrics
                    </h3>
                    <dl className="space-y-4">
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          Top 10 Share
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold')}>
                          {formatPercent(concentrationSummary?.top10?.percentage)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          Top 20 Share
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold')}>
                          {formatPercent(concentrationSummary?.top20?.percentage)}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          Range Trend
                        </dt>
                        <dd
                          className={cn(
                            text('base', 'lg'),
                            getTrendClass(concentrationAnalytics?.trend),
                            'font-bold',
                          )}
                        >
                          {concentrationAnalytics?.trend ?? '—'}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between p-4 rounded-xl bg-muted/20">
                        <dt className={cn(text('xs', 'sm'), 'text-muted-foreground font-medium')}>
                          Start → End
                        </dt>
                        <dd className={cn(text('base', 'lg'), 'font-bold')}>
                          {concentrationStart !== null && concentrationEnd !== null
                            ? `${formatConcentration(concentrationStart)} → ${formatConcentration(concentrationEnd)}`
                            : '—'}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="rounded-2xl border border-border/40 bg-gradient-to-br from-background to-muted/5 p-6">
                    <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-6')}>
                      Whale Activity
                    </h3>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-1')}>
                          Accumulating
                        </p>
                        <p className={cn(text('xl', '2xl'), 'font-bold text-emerald-400')}>
                          {whaleSummary.accumulating}
                        </p>
                      </div>
                      <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20">
                        <p className={cn(text('xs', 'sm'), 'text-muted-foreground mb-1')}>
                          Distributing
                        </p>
                        <p className={cn(text('xl', '2xl'), 'font-bold text-rose-400')}>
                          {whaleSummary.distributing}
                        </p>
                      </div>
                    </div>

                    <p
                      className={cn(
                        text('2xs', 'xs'),
                        whaleSummary.netFlow >= 0 ? 'text-emerald-400' : 'text-rose-400',
                        'font-medium mb-6',
                      )}
                    >
                      Net Flow:{' '}
                      {whaleSummary.netFlow === 0
                        ? '0'
                        : `${whaleSummary.netFlow > 0 ? '+' : ''}${formatCompactNumber(Math.abs(whaleSummary.netFlow))}`}{' '}
                      NOS
                    </p>

                    <div className="space-y-3">
                      {(whaleActivity?.movements ?? []).slice(0, 5).map((movement, index) => {
                        const isPositive = (movement.type ?? '').toLowerCase() === 'accumulation';
                        return (
                          <div
                            key={`${movement.address}-${index}`}
                            className="p-4 rounded-xl border border-border/40 bg-background/50"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className={cn(text('sm', 'base'), 'font-mono font-semibold')}>
                                {truncateAddress(movement.address, 6)}
                              </span>
                              <span
                                className={cn(
                                  'flex items-center gap-1 font-bold',
                                  text('xs', 'sm'),
                                  isPositive ? 'text-emerald-400' : 'text-rose-400',
                                )}
                              >
                                {isPositive ? (
                                  <TrendingUp className="w-3 h-3" />
                                ) : (
                                  <TrendingDown className="w-3 h-3" />
                                )}
                                {formatCompactNumber(movement.change)}
                              </span>
                            </div>
                            <div
                              className={cn(
                                'flex items-center justify-between',
                                text('2xs', 'xs'),
                                'text-muted-foreground',
                              )}
                            >
                              <span>
                                #{movement.previousRank} → #{movement.currentRank}
                              </span>
                              <span>{toOwnerLabel(movement.owner) || '—'}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      )}
    </div>
  );
}
