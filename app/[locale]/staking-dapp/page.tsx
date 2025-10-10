'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiClient, TimeRange } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

import { FontScaleProvider } from './hooks/useFontScale';
import { FontScaleControls } from './components/FontScaleControls';
import { StakingDappHeader as StakingHeader } from './components/StakingDappHeader';
import { MarketOverview } from './components/MarketOverview';
import { SectionTabs } from './components/SectionTabs';
import { OverviewSection } from './components/OverviewSection';
import { ChartSection } from './components/ChartSection';
import { TableSection } from './components/TableSection';
import { StatisticsSection } from './components/StatisticsSection';
import { AnalysisSection } from './components/AnalysisSection';
import { normalizeStakingDappStats } from './utils/normalizeStakingData';

export default function RaydiumPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const t = useTranslations('stakingDapp.toast');
  const [mounted, setMounted] = useState(false);

  const initialRange = (searchParams.get('range') as TimeRange) || '30d';
  const initialSection = searchParams.get('section') || 'overview';

  const [selectedRange, setSelectedRange] = useState<TimeRange>(initialRange);
  const [statsRange, setStatsRange] = useState<TimeRange>(initialRange);
  const [activeSection, setActiveSection] = useState<string>(initialSection);
  const [metric, setMetric] = useState<'xnos' | 'apr'>('xnos');
  const [dateRange, setDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });
  const [isMobile, setIsMobile] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshing, setRefreshing] = useState(false);
  const viewportRef = useRef<{ scrollY: number }>({ scrollY: 0 });

  const [tableTimeframe, setTableTimeframe] = useState<TimeRange>('7d');
  const [tableSort, setTableSort] = useState<{ field: string; order: 'asc' | 'desc' }>({
    field: 'timestamp',
    order: 'desc',
  });
  const [tablePage, setTablePage] = useState(1);
  const [tableDateRange, setTableDateRange] = useState<{ start: Date | null; end: Date | null }>({
    start: null,
    end: null,
  });

  useEffect(() => {
    setMounted(true);
    setIsMobile(window.innerWidth < 768);

    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

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
    data: widgetData,
    isLoading: widgetLoading,
    isFetching: widgetFetching,
  } = useQuery({
    queryKey: ['staking-widget'],
    queryFn: () => apiClient.getStakingWidget(),
    refetchInterval: 60000,
  });

  const chartParams = useMemo(() => {
    if (dateRange.start && dateRange.end) {
      return {
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
        interval: 'auto' as const,
        metric: 'both',
      };
    }
    return {
      range: selectedRange,
      interval: 'auto' as const,
      metric: 'both',
    };
  }, [selectedRange, dateRange]);

  const {
    data: chartData,
    isLoading: chartLoading,
    isFetching: chartFetching,
  } = useQuery({
    queryKey: ['staking-chart-data', chartParams],
    queryFn: () => apiClient.getStakingChart(chartParams as any),
    refetchInterval: 300000,
  });

  const {
    data: statsData,
    isLoading: statsLoading,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ['staking-stats', statsRange],
    queryFn: () => apiClient.getStakingStats(statsRange),
  });
  const rawStats = (statsData as any)?.stats;
  const statsMeta = (statsData as any)?.meta;
  const normalizedStats = useMemo(() => normalizeStakingDappStats(rawStats), [rawStats]);
  const stats = normalizedStats ?? rawStats;

  const tableParams = useMemo(() => {
    const params: any = {
      page: tablePage,
      limit: 20,
      sortBy: tableSort.field,
      sortOrder: tableSort.order.toUpperCase() as 'ASC' | 'DESC',
      timeframe: tableTimeframe,
    };
    if (tableDateRange.start && tableDateRange.end) {
      params.startDate = format(tableDateRange.start, 'yyyy-MM-dd');
      params.endDate = format(tableDateRange.end, 'yyyy-MM-dd');
    }

    return params;
  }, [tablePage, tableSort, tableTimeframe, tableDateRange]);

  const {
    data: tableData,
    isLoading: tableLoading,
    isFetching: tableFetching,
  } = useQuery({
    queryKey: ['staking-table', tableParams],
    queryFn: () => apiClient.getStakingTable(tableParams as any),
  });

  const handleTableTimeframeChange = useCallback((timeframe: string) => {
    setTableTimeframe(timeframe as TimeRange);
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

  const widget = useMemo(() => {
    const w = (widgetData as any)?.widget;
    if (!w) return undefined;
    const currXnos = Number(w.xnos?.current ?? w.xnos?.value ?? w.xnos ?? 0);
    const currApr = Number(w.apr?.current ?? 0);
    const makeChange = (key: string) => {
      const r = w.ranges?.[key];
      const startX = Number(r?.xnos?.start ?? currXnos);
      const startA = Number(r?.apr?.start ?? currApr);
      const absX = currXnos - startX;
      const absA = currApr - startA;
      return {
        xnos: r?.xnos
          ? {
              absolute: absX,
              percentage: r.xnos.changePercentage ?? 0,
              display: r.xnos.changeDisplay ?? '—',
            }
          : undefined,
        apr: r?.apr
          ? {
              absolute: absA,
              percentage: r.apr.changePercentage ?? 0,
              display: r.apr.changeDisplay ?? '—',
            }
          : undefined,
      };
    };

    const result = {
      current: {
        xnos: { value: currXnos, display: w.xnos?.display ?? String(w.xnos?.current ?? '') },
        apr: { value: currApr, display: w.apr?.display ?? '—' },
        lastUpdate: w.lastUpdate,
      },
      changes: {
        '24h': makeChange('24h'),
        '7d': makeChange('7d'),
        '30d': makeChange('30d'),
        '90d': makeChange('90d'),
        '180d': makeChange('180d'),
        '1y': makeChange('1y'),
      },
      ranges: {
        ...(w.ranges || {}),
      },
      ath: {
        xnos: {
          value: Number(w.ath?.xnos?.value ?? 0),
          display: w.ath?.xnos?.display ?? '—',
          date: w.ath?.xnos?.date,
        },
        apr: {
          value: Number(w.ath?.apr?.value ?? 0),
          display: w.ath?.apr?.display ?? '—',
          date: w.ath?.apr?.date,
        },
      },
      atl: {
        xnos: {
          value: Number(w.atl?.xnos?.value ?? 0),
          display: w.atl?.xnos?.display ?? '—',
          date: w.atl?.xnos?.date,
        },
        apr: {
          value: Number(w.atl?.apr?.value ?? 0),
          display: w.atl?.apr?.display ?? '—',
          date: w.atl?.apr?.date,
        },
      },
    } as any;
    return result;
  }, [widgetData]);
  const rawChart = (chartData as any)?.chart;
  const chartDataset = Array.isArray(rawChart?.data?.data)
    ? rawChart.data.data
    : Array.isArray(rawChart?.data)
      ? rawChart.data
      : [];
  const tableRows = Array.isArray((tableData as any)?.table?.rows)
    ? (tableData as any).table.rows
    : Array.isArray((tableData as any)?.table?.data)
      ? (tableData as any).table.data
      : [];
  const widgetIsLoading = (!widget && (widgetLoading || widgetFetching)) || false;
  const chartIsLoading = (!chartDataset.length && (chartLoading || chartFetching)) || false;
  const statsIsLoading = (!stats && (statsLoading || statsFetching)) || false;
  const tableIsLoading = (!tableRows.length && (tableLoading || tableFetching)) || false;

  const handleStatsRangeChange = (range: TimeRange) => {
    viewportRef.current.scrollY = window.scrollY;
    setStatsRange(range);
    requestAnimationFrame(() => {
      window.scrollTo(0, viewportRef.current.scrollY);
    });
  };

  const handleRefresh = async () => {
    const now = new Date();
    const timeSinceLastRefresh = now.getTime() - lastRefresh.getTime();

    if (timeSinceLastRefresh < 3000) {
      addToast({
        type: 'warning',
        title: t('pleaseWait'),
        description: t('refreshAgainIn', {
          seconds: Math.ceil((3000 - timeSinceLastRefresh) / 1000),
        }),
      });
      return;
    }

    setRefreshing(true);
    setLastRefresh(now);

    await queryClient.invalidateQueries();

    setTimeout(() => {
      setRefreshing(false);
      addToast({
        type: 'success',
        title: t('dataRefreshed'),
        description: t('allStakingDataUpdated'),
      });
    }, 1000);
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

  const downloadData = async (type: 'chart' | 'table', formatType: 'csv' | 'json') => {
    let data: any[] = [];
    let filename = '';

    const chartPoints = ((chartData as any)?.chart?.data ?? []) as any[];

    if (type === 'chart' && Array.isArray(chartPoints)) {
      data = chartPoints;
      filename = `nos-staking-contract-chart-${selectedRange}`;
    } else if (type === 'table' && (tableData as any)?.table?.rows) {
      data = (tableData as any).table.rows;
      filename = `nos-staking-contract-history-${tableTimeframe}`;
    }

    if (data.length === 0) return;

    if (formatType === 'csv') {
      const headers = Object.keys(data[0]).join(',');
      const rows = data.map((row) => Object.values(row).join(',')).join('\n');
      const csv = `${headers}\n${rows}`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } else if (formatType === 'json') {
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.json`;
      a.click();
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
        <StakingHeader widget={widget} mounted={mounted} loading={widgetIsLoading} />

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
            meta={statsMeta}
            statsRange={statsRange}
            mounted={mounted}
            metric={metric}
            loading={statsIsLoading}
          />
        )}

        {activeSection === 'analysis' &&
          (stats || statsIsLoading || widgetIsLoading) &&
          (widget || widgetIsLoading) && (
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
