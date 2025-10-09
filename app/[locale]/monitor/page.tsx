'use client';

import { useEffect, useState, useCallback } from 'react';
import { Pen, Activity, Layout, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { LiveMetricsChart } from '@/components/monitor/LiveMetricsChart';
import { MobileChartPager } from '@/components/monitor/MobileChartPager';
import { LiveFeedVirtualized } from '@/components/monitor/LiveFeedVirtualized';
import { ProfessionalOrderBook } from '@/components/monitor/ProfessionalOrderBook';
import { PlansSection } from '@/components/monitor/PlansSection';
import { TechnicalLayoutEditor } from '@/components/monitor/TechnicalLayoutEditor';
import MultiTabNotice from '@/components/monitor/MultiTabNotice';
import { MonitorDashboardProvider } from '@/lib/monitor/dashboardBootstrap';
import { PlanModalProvider } from '@/components/monitor/PlanModalProvider';
import { useMetricsStream } from '@/lib/monitor/useMetricsStream';
import {
  MobileNavigation,
  MobileSectionContainer,
  type MobileSection,
} from '@/components/monitor/MobileNavigation';
import { StatsSummaryCard } from '@/components/monitor/StatsSummaryCard';
import { MonitorLocaleNotice } from '@/components/monitor/MonitorLocaleNotice';

type Range = '15m' | '1h' | '6h' | '1d';
function TechnicalMonitorView({
  range,
  isLayoutEditing,
}: {
  range: Range;
  isLayoutEditing: boolean;
}) {
  return <TechnicalLayoutEditor range={range} editMode={isLayoutEditing} />;
}

export default function MonitorPage() {
  const [mounted, setMounted] = useState(false);
  const range: Range = '15m';
  const [isLayoutEditing, setIsLayoutEditing] = useState(false);
  const [mobileActiveSection, setMobileActiveSection] = useState<MobileSection>('live-feed');

  const { latestPrice } = useMetricsStream({
    metric: 'price',
    interval: '10s',
    range: '15m',
  });

  useEffect(() => {
    if (typeof latestPrice === 'number' && latestPrice > 0) {
      const formattedPrice =
        latestPrice >= 1
          ? `$${latestPrice.toFixed(2)}`
          : latestPrice >= 0.01
            ? `$${latestPrice.toFixed(4)}`
            : `$${latestPrice.toPrecision(2)}`;
      document.title = `${formattedPrice} NOS - Monitor | NOS.plus`;
    } else {
      document.title = 'Monitor | NOS.plus - Nosana Dashboard';
    }
  }, [latestPrice]);

  useEffect(() => {
    setMounted(true);
    document.body.style.overflowX = 'hidden';
    return () => {
      document.body.style.overflowX = 'auto';
    };
  }, []);

  const applyPreset = useCallback((presetKey: string) => {
    const event = new CustomEvent('applyPreset', { detail: presetKey });
    window.dispatchEvent(event);
  }, []);

  const handleEditToggle = () => {
    if (isLayoutEditing) {
      const event = new CustomEvent('saveLayout');
      window.dispatchEvent(event);
    }
    setIsLayoutEditing(!isLayoutEditing);
  };

  const renderMobileSection = () => {
    switch (mobileActiveSection) {
      case 'live-feed':
        return <LiveFeedVirtualized forceMobile={true} showInitialSkeleton={true} />;
      case 'charts':
        return <LiveMetricsChart range={range} forceMobile={true} />;
      case 'order-book':
        return <ProfessionalOrderBook />;
      case 'plans':
        return <PlansSection />;
      case 'stats':
        return <StatsSummaryCard />;
      default:
        return <LiveFeedVirtualized forceMobile={true} showInitialSkeleton={true} />;
    }
  };

  if (!mounted) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <PlanModalProvider>
      <MonitorDashboardProvider>
        <MonitorLocaleNotice />
        <div className="-mx-4 -my-6 md:-my-8 w-[100vw] relative left-1/2 right-1/2 ml-[-50vw] mr-[-50vw] px-2 py-3 md:px-24 md:py-4 space-y-4 md:space-y-6 bg-background overflow-x-hidden">
          <MultiTabNotice />

          {/* Desktop Header */}
          <div className="hidden md:flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Monitor</h1>
                <p className="text-sm text-muted-foreground">
                  Live transactions, charts, orders, and DCA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              {/* Layout Presets Dropdown */}
              <CustomDropdown
                options={[
                  { value: 'default', label: 'Default', description: 'Standard layout' },
                  {
                    value: 'chartsFirst',
                    label: 'Charts First',
                    description: 'Charts prioritized',
                  },
                  { value: 'dataFocus', label: 'Data Focus', description: 'Live data first' },
                  { value: 'minimal', label: 'Minimal', description: 'Essential only' },
                ]}
                onSelect={applyPreset}
                placeholder="Layout"
                icon={<Layout className="w-4 h-4" />}
                align="right"
                variant="default"
                size="md"
              />

              {/* Edit Mode Toggle */}
              <button
                onClick={handleEditToggle}
                className={cn(
                  'p-2 rounded-lg transition-colors',
                  isLayoutEditing
                    ? 'bg-green-600 hover:bg-green-700 text-white'
                    : 'bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground',
                )}
                title={isLayoutEditing ? 'Save Layout' : 'Customize Layout'}
              >
                {isLayoutEditing ? <Check className="w-4 h-4" /> : <Pen className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Mobile Header */}
          <div className="md:hidden flex items-center gap-3 px-2">
            <Activity className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-bold">Monitor</h1>
              <p className="text-xs text-muted-foreground">Live trading data</p>
            </div>
          </div>

          {/* Mobile Navigation */}
          <MobileNavigation
            activeSection={mobileActiveSection}
            onSectionChange={setMobileActiveSection}
          />

          {/* Mobile Content */}
          <div className="md:hidden px-2">{renderMobileSection()}</div>

          {/* Desktop Content */}
          <div className="hidden md:block">
            <TechnicalMonitorView range={range} isLayoutEditing={isLayoutEditing} />
          </div>
        </div>
      </MonitorDashboardProvider>
    </PlanModalProvider>
  );
}
