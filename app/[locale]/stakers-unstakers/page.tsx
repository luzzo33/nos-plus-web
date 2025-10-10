'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

import { apiClient, TimeRange } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';

import type {
  AccountsWidgetData,
  BalancesChartResponse,
  BalancesStatsResponse,
  BalancesTableResponse,
} from '@/lib/api/balances-client';

import { FontScaleProvider } from './hooks/useFontScale';
import { FontScaleControls } from './components/FontScaleControls';
import { StakersUnstakersHeader } from './components/StakersUnstakersHeader';
import { MarketOverview } from './components/MarketOverview';
import { SectionTabs } from './components/SectionTabs';
import { OverviewSection } from './components/OverviewSection';
import { ChartSection } from './components/ChartSection';
import { TableSection } from './components/TableSection';
import { StatisticsSection } from './components/StatisticsSection';
import { AnalysisSection } from './components/AnalysisSection';

type MetricMode = 'total' | 'stakers' | 'unstakers';
type SectionKey = 'overview' | 'chart' | 'table' | 'stats' | 'analysis';

type DateRangeState = {
  start: Date | null;
  end: Date | null;
};

type TableSortState = {
  field: string;
  order: 'asc' | 'desc';
};

type TableDateRangeState = {
  start: Date | null;
  end: Date | null;
};

type ChartQueryParams =
  | {
      startDate: string;
      endDate: string;
      interval: string;
      metric: 'all';
    }
  | {
      range: TimeRange;
      interval: string;
      metric: 'all';
    };

export default function StakersUnstakersPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const t = useTranslations('stakersUnstakers.toast');
  const [mounted, setMounted] = useState(false);

  const initialRange = (searchParams.get('range') as TimeRange) || '30d';
  const initialSectionParam = searchParams.get('section');
  const isSectionKey = (value: string | null): value is SectionKey =>
    value === 'overview' ||
    value === 'chart' ||
    value === 'table' ||
    value === 'stats' ||
    value === 'analysis';
  const initialSection: SectionKey = isSectionKey(initialSectionParam)
    ? initialSectionParam
    : 'overview';

  const [selectedRange, setSelectedRange] = useState<TimeRange>(initialRange);
  const [statsRange, setStatsRange] = useState<TimeRange>(initialRange);
  const [activeSection, setActiveSection] = useState<SectionKey>(initialSection);
  const [metric, setMetric] = useState<MetricMode>('total');
  const [dateRange, setDateRange] = useState<DateRangeState>({ start: null, end: null });
  const [isMobile, setIsMobile] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const viewportRef = useRef<{ scrollY: number }>({ scrollY: 0 });

  const [tableTimeframe, setTableTimeframe] = useState<TimeRange>('7d');
  const [tableSort, setTableSort] = useState<TableSortState>({ field: 'date', order: 'desc' });
  const [tablePage, setTablePage] = useState(1);
  const [tableDateRange, setTableDateRange] = useState<TableDateRangeState>({
    start: null,
    end: null,
  });

  useEffect(() => {
    setMounted(true);
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    params.set('range', selectedRange);
    params.set('section', activeSection);
    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', newUrl);
  }, [selectedRange, activeSection]);

  const {
    data: widgetResponse,
    isLoading: widgetLoading,
    isFetching: widgetFetching,
  } = useQuery<{
    success: boolean;
    widget: AccountsWidgetData;
    meta?: unknown;
  }>({
    queryKey: ['stakers-unstakers', 'widget'],
    queryFn: () => apiClient.getStakersUnstakersWidget(),
    refetchInterval: 60000,
  });

  const chartParams = useMemo<ChartQueryParams>(() => {
    if (dateRange.start && dateRange.end) {
      return {
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
        interval: 'auto',
        metric: 'all',
      };
    }
    return {
      range: selectedRange,
      interval: 'auto',
      metric: 'all',
    };
  }, [selectedRange, dateRange]);

  const {
    data: chartResponse,
    isLoading: chartLoading,
    isFetching: chartFetching,
  } = useQuery<BalancesChartResponse>({
    queryKey: ['stakers-unstakers', 'chart', chartParams],
    queryFn: () => apiClient.getStakersUnstakersChart(chartParams),
    refetchInterval: 300000,
  });

  const {
    data: statsResponse,
    isLoading: statsLoading,
    isFetching: statsFetching,
  } = useQuery<BalancesStatsResponse>({
    queryKey: ['stakers-unstakers', 'stats', statsRange],
    queryFn: () => apiClient.getStakersUnstakersStats(statsRange),
  });

  const tableParams = useMemo(() => {
    const backendSortMap: Record<string, string> = {
      date: 'timestamp',
      timestamp: 'timestamp',
      totalAccounts: 'total',
      stakingAccounts: 'stakers',
      unstakingAccounts: 'unstakers',
      accountsChange: 'change',
      amountChange: 'change',
      totalAmount: 'total',
      stakingAmount: 'stakers',
      unstakingAmount: 'unstakers',
    };

    const mappedSortBy = backendSortMap[tableSort.field] || tableSort.field;

    const params: Record<string, string | number> = {
      page: tablePage,
      limit: 20,
      sortBy: mappedSortBy,
      sortOrder: tableSort.order.toUpperCase(),
      timeframe: tableTimeframe,
    };

    if (tableDateRange.start && tableDateRange.end) {
      params.startDate = format(tableDateRange.start, 'yyyy-MM-dd');
      params.endDate = format(tableDateRange.end, 'yyyy-MM-dd');
    }

    return params;
  }, [tablePage, tableSort, tableTimeframe, tableDateRange]);

  const {
    data: tableResponse,
    isLoading: tableLoading,
    isFetching: tableFetching,
  } = useQuery<BalancesTableResponse>({
    queryKey: ['stakers-unstakers', 'table', tableParams],
    queryFn: () => apiClient.getStakersUnstakersTable(tableParams),
  });

  const widget = widgetResponse?.widget ?? null;
  const chartData = chartResponse ?? null;
  const stats = statsResponse?.stats ?? null;
  const tableData = tableResponse ?? null;
  const rawChart = (chartResponse as any)?.chart;
  const rawChartDataset = Array.isArray(rawChart?.data?.data)
    ? rawChart.data.data
    : Array.isArray(rawChart?.data)
      ? rawChart.data
      : [];
  const hasChartData = Array.isArray(rawChartDataset) && rawChartDataset.length > 0;
  const rawTableRows = Array.isArray((tableResponse as any)?.table?.rows)
    ? (tableResponse as any)?.table?.rows
    : Array.isArray((tableResponse as any)?.table?.data)
      ? (tableResponse as any)?.table?.data
      : [];
  const widgetIsLoading = (!widget && (widgetLoading || widgetFetching)) || false;
  const chartIsLoading = (!hasChartData && (chartLoading || chartFetching)) || false;
  const statsIsLoading = (!stats && (statsLoading || statsFetching)) || false;
  const tableIsLoading = (!rawTableRows.length && (tableLoading || tableFetching)) || false;

  const handleStatsRangeChange = (range: TimeRange) => {
    viewportRef.current.scrollY = window.scrollY;
    setStatsRange(range);
    requestAnimationFrame(() => {
      window.scrollTo(0, viewportRef.current.scrollY);
    });

    addToast({
      type: 'success',
      title: t('timeframeUpdated'),
      description: t('showingData', { range: range.toUpperCase() }),
    });
  };

  const handleRefresh = async () => {
    const now = new Date();
    const elapsed = now.getTime() - lastRefresh.getTime();

    if (elapsed < 3000) {
      addToast({
        type: 'warning',
        title: t('pleaseWait'),
        description: t('refreshAgainIn', { seconds: Math.ceil((3000 - elapsed) / 1000) }),
      });
      return;
    }

    setRefreshing(true);
    setLastRefresh(now);

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['stakers-unstakers', 'widget'] }),
      queryClient.invalidateQueries({ queryKey: ['stakers-unstakers', 'chart'] }),
      queryClient.invalidateQueries({ queryKey: ['stakers-unstakers', 'stats'] }),
      queryClient.invalidateQueries({ queryKey: ['stakers-unstakers', 'table'] }),
    ]);

    setTimeout(() => {
      setRefreshing(false);
      addToast({
        type: 'success',
        title: t('dataRefreshed'),
        description: t('allDataUpdated'),
      });
    }, 600);
  };

  const handleChartRangeChange = (range: TimeRange) => {
    setSelectedRange(range);
    setDateRange({ start: null, end: null });
  };

  const handleDateRangeChange = (start: Date | null, end: Date | null) => {
    setDateRange({ start, end });
    if (start && end) {
      addToast({
        type: 'success',
        title: t('dateRangeApplied'),
        description: t('showingDataFromTo', {
          start: format(start, 'MMM dd'),
          end: format(end, 'MMM dd'),
        }),
      });
    }
  };

  const handleTableTimeframeChange = useCallback((timeframe: TimeRange) => {
    setTableTimeframe(timeframe);
    setTablePage(1);
  }, []);

  const handleTableSortChange = useCallback(
    (sort: { field: string; order: 'asc' | 'desc' }) => {
      setTableSort(sort);
      setTablePage(1);
    },
    [],
  );

  const handleTableDateRangeChange = useCallback(
    (range: { start: Date | null; end: Date | null }) => {
      setTableDateRange(range);
      setTablePage(1);
    },
    [],
  );

  const handleTablePageChange = useCallback((page: number) => {
    setTablePage(page);
  }, []);

  const normalizeRecords = (input: unknown): Record<string, unknown>[] => {
    if (!Array.isArray(input)) return [];
    return input.filter(
      (item): item is Record<string, unknown> => item !== null && typeof item === 'object',
    );
  };

  const downloadData = (type: 'chart' | 'table', formatType: 'csv' | 'json') => {
    let raw: Record<string, unknown>[] = [];
    let filename = '';

    if (type === 'chart') {
      const points = (chartData as BalancesChartResponse | null)?.chart?.data;
      raw = normalizeRecords(points);
      filename = `nos-stakers-unstakers-chart-${selectedRange}`;
    } else {
      const rows = (tableData as BalancesTableResponse | null)?.table?.rows;
      raw = normalizeRecords(rows);
      filename = `nos-stakers-unstakers-history-${tableTimeframe}`;
    }

    if (!raw.length) return;

    if (formatType === 'csv') {
      const headers = Object.keys(raw[0]);
      const csvLines = [headers.join(',')];
      raw.forEach((row) => {
        const line = headers.map((key) => JSON.stringify(row[key] ?? '')).join(',');
        csvLines.push(line);
      });
      const blob = new Blob([csvLines.join('\n')], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${filename}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } else {
      const jsonBlob = new Blob([JSON.stringify(raw, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(jsonBlob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${filename}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    }

    addToast({
      type: 'success',
      title: t('downloadStarted'),
      description: t('downloadingDataAs', {
        type,
        format: formatType.toUpperCase(),
      }),
    });
  };

  return (
    <FontScaleProvider>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <StakersUnstakersHeader widget={widget} mounted={mounted} loading={widgetIsLoading} />

        {/* Market Overview */}
        {(mounted || widgetIsLoading || statsIsLoading) && (
          <MarketOverview
            widget={widget}
            stats={stats}
            statsRange={statsRange}
            mounted={mounted}
            loading={widgetIsLoading || statsIsLoading}
            onStatsRangeChange={handleStatsRangeChange}
            onRefresh={handleRefresh}
            refreshing={refreshing}
            metric={metric}
            onMetricChange={setMetric}
          />
        )}

        {/* Section Tabs */}
        <SectionTabs
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isMobile={isMobile}
        />

        {/* Content Sections */}
        {activeSection === 'overview' && (widget || widgetIsLoading || statsIsLoading) && (
          <OverviewSection
            widget={widget}
            stats={stats}
            statsRange={statsRange}
            mounted={mounted}
            metric={metric}
            loading={widgetIsLoading || statsIsLoading}
          />
        )}

        {activeSection === 'chart' && (chartData || chartIsLoading) && (
          <ChartSection
            chartData={chartData}
            selectedRange={selectedRange}
            onRangeChange={handleChartRangeChange}
            onDateRangeChange={handleDateRangeChange}
            onDownload={downloadData}
            isMobile={isMobile}
            mounted={mounted}
            metric={metric}
            loading={chartIsLoading}
          />
        )}

        {activeSection === 'table' && (tableData || tableIsLoading) && (
          <TableSection
            tableData={tableData}
            tableTimeframe={tableTimeframe}
            onTimeframeChange={handleTableTimeframeChange}
            tableSort={tableSort}
            onSortChange={handleTableSortChange}
            tablePage={tablePage}
            onPageChange={handleTablePageChange}
            tableDateRange={tableDateRange}
            onDateRangeChange={handleTableDateRangeChange}
            onDownload={downloadData}
            isMobile={isMobile}
            mounted={mounted}
            loading={tableIsLoading}
          />
        )}

        {activeSection === 'stats' && (stats || statsIsLoading) && (
          <StatisticsSection
            stats={stats}
            statsRange={statsRange}
            mounted={mounted}
            metric={metric}
            loading={statsIsLoading}
          />
        )}

        {activeSection === 'analysis' && (stats || statsIsLoading || widgetIsLoading) && (
          <AnalysisSection
            stats={stats}
            widget={widget}
            mounted={mounted}
            metric={metric}
            loading={statsIsLoading || widgetIsLoading}
          />
        )}
      </div>

      {/* Font Scale Controls */}
      {mounted && <FontScaleControls />}
    </FontScaleProvider>
  );
}
