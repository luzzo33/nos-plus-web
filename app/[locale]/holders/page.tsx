'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { apiClient, TimeRange } from '@/lib/api/client';
import { useToast } from '@/components/ui/Toast';
import { format } from 'date-fns';
import { useTranslations } from 'next-intl';

import { FontScaleProvider } from './hooks/useFontScale';
import { FontScaleControls } from './components/FontScaleControls';
import { HoldersHeader } from './components/HoldersHeader';
import { MarketOverview } from './components/MarketOverview';
import { SectionTabs } from './components/SectionTabs';
import { OverviewSection } from './components/OverviewSection';
import { ChartSection } from './components/ChartSection';
import { TableSection } from './components/TableSection';
import { StatisticsSection } from './components/StatisticsSection';
import { AnalysisSection } from './components/AnalysisSection';
import { DistributionSection } from './components/DistributionSection';
import { RichListSection } from './components/RichListSection';

export default function HoldersPage() {
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const t = useTranslations('holders.toast');
  const [mounted, setMounted] = useState(false);

  const initialRange = (searchParams.get('range') as TimeRange) || '30d';
  const initialSection = searchParams.get('section') || 'overview';

  const [selectedRange, setSelectedRange] = useState<TimeRange>(initialRange);
  const [statsRange, setStatsRange] = useState<TimeRange>(initialRange);
  const [activeSection, setActiveSection] = useState<string>(initialSection);
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
    queryKey: ['holders-widget-data'],
    queryFn: () => apiClient.getHoldersWidgetData(),
    refetchInterval: 60000,
  });

  const chartParams = useMemo(() => {
    if (dateRange.start && dateRange.end) {
      return {
        startDate: format(dateRange.start, 'yyyy-MM-dd'),
        endDate: format(dateRange.end, 'yyyy-MM-dd'),
        interval: 'auto' as const,
      };
    }
    return {
      range: selectedRange,
      interval: 'auto' as const,
    };
  }, [selectedRange, dateRange]);

  const {
    data: chartData,
    isLoading: chartLoading,
    isFetching: chartFetching,
  } = useQuery({
    queryKey: ['holders-chart-data', chartParams],
    queryFn: () => apiClient.getHoldersChartData(chartParams),
    refetchInterval: 300000,
  });

  const {
    data: statsData,
    isLoading: statsLoading,
    isFetching: statsFetching,
  } = useQuery({
    queryKey: ['holders-stats', statsRange],
    queryFn: () => apiClient.getHoldersStats({ range: statsRange }),
  });

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
    queryKey: ['holders-table', tableParams],
    queryFn: () => apiClient.getHoldersTableData(tableParams),
  });

  const widget = widgetData?.widget;
  const stats = statsData?.stats;
  const widgetIsLoading = !widget && (widgetLoading || widgetFetching);
  const statsIsLoading = !stats && (statsLoading || statsFetching);
  const chartArray = Array.isArray(chartData?.chart?.data)
    ? chartData?.chart?.data
    : Array.isArray((chartData?.chart?.data as any)?.data)
      ? (chartData?.chart?.data as any)?.data
      : [];
  const hasChartData = Array.isArray(chartArray) && chartArray.length > 0;
  const chartIsLoading = !hasChartData && (chartLoading || chartFetching);
  const tableRows = tableData?.table?.rows ?? [];
  const hasTableData = Array.isArray(tableRows) && tableRows.length > 0;
  const tableIsLoading = !hasTableData && (tableLoading || tableFetching);

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
        description: t('allHoldersDataUpdated'),
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

  const downloadData = async (type: 'chart' | 'table', format: 'csv' | 'json') => {
    let data: any[] = [];
    let filename = '';

    if (type === 'chart' && chartArray.length) {
      data = chartArray as any[];
      filename = `nos-holders-chart-${selectedRange}`;
    } else if (type === 'table' && hasTableData) {
      data = tableRows as any[];
      filename = `nos-holders-history-${tableTimeframe}`;
    }

    if (data.length === 0) return;

    if (format === 'csv') {
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
    } else if (format === 'json') {
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
        format: format.toUpperCase(),
      }),
    });
  };

  return (
    <FontScaleProvider>
      <div className="space-y-6 pb-12">
        {/* Header */}
        <HoldersHeader widget={widget} mounted={mounted} loading={widgetIsLoading} />

        {/* Market Overview */}
        {(mounted || widgetIsLoading) && (
          <MarketOverview
            widget={widget}
            stats={stats}
            statsRange={statsRange}
            mounted={mounted}
            loading={widgetIsLoading || statsIsLoading}
            onStatsRangeChange={handleStatsRangeChange}
            onRefresh={handleRefresh}
            refreshing={refreshing}
          />
        )}

        {/* Section Tabs */}
        <SectionTabs
          activeSection={activeSection}
          onSectionChange={setActiveSection}
          isMobile={isMobile}
        />

        {/* Content Sections */}
        {activeSection === 'overview' && (
          <OverviewSection
            widget={widget}
            stats={stats}
            statsRange={statsRange}
            mounted={mounted}
            loading={widgetIsLoading || statsIsLoading}
          />
        )}

        {activeSection === 'chart' && (
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

        {activeSection === 'table' && (
          <TableSection
            tableData={tableData}
            tableTimeframe={tableTimeframe}
            onTimeframeChange={setTableTimeframe}
            tableSort={tableSort}
            onSortChange={setTableSort}
            tablePage={tablePage}
            onPageChange={setTablePage}
            tableDateRange={tableDateRange}
            onDateRangeChange={setTableDateRange}
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
            loading={statsIsLoading}
          />
        )}

        {activeSection === 'analysis' &&
          ((stats && widget) || widgetIsLoading || statsIsLoading) && (
            <AnalysisSection
              stats={stats}
              widget={widget}
              mounted={mounted}
              loading={widgetIsLoading || statsIsLoading}
            />
          )}

        {activeSection === 'richlist' && <RichListSection mounted={mounted} />}

        {activeSection === 'distribution' && <DistributionSection mounted={mounted} />}
      </div>

      {/* Font Scale Controls */}
      {mounted && <FontScaleControls />}
    </FontScaleProvider>
  );
}
