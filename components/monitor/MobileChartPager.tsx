'use client';

import React, { useState } from 'react';

import { LiveMetricsChart } from '@/components/monitor/LiveMetricsChart';
import type { MonitorRange } from '@/lib/monitor/chartConfig';

type Metric = 'price' | 'volume' | 'activity';

const METRIC_OPTIONS: Array<{ key: Metric; label: string }> = [
  { key: 'price', label: 'Price' },
  { key: 'volume', label: 'Volume' },
  { key: 'activity', label: 'Activity' },
];

export function MobileChartPager({ range }: { range: MonitorRange }) {
  const [metric, setMetric] = useState<Metric>('price');

  return (
    <LiveMetricsChart
      metric={metric}
      range={range}
      forceMobile
      metricOptions={METRIC_OPTIONS}
      onMetricChange={setMetric}
    />
  );
}
