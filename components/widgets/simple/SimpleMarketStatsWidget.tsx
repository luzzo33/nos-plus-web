'use client';

import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { SimpleWidgetCard, SimpleWidgetMetric } from './SimpleWidgetCard';
import { apiClient } from '@/lib/api/client';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface SimpleMarketStatsWidgetProps {
  isMobile?: boolean;
  className?: string;
}

export function SimpleMarketStatsWidget({
  isMobile = false,
  className,
}: SimpleMarketStatsWidgetProps) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');

  const { data, isLoading } = useQuery({
    queryKey: ['simple-market-stats'],
    queryFn: () => apiClient.getWidgetData('usd'),
    refetchInterval: 60000,
    staleTime: 30000,
  });

  const widget = data?.widget;
  const range24h = widget?.ranges?.['24h'];
  const change7d = widget?.changes?.['7d'];
  const change30d = widget?.changes?.['30d'];

  if (isLoading) {
    return (
      <SimpleWidgetCard variant="default" className={className}>
        <div className="animate-pulse space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-md bg-muted" />
            <div className="h-3 w-24 bg-muted rounded" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-9 bg-muted rounded" />
            ))}
          </div>
        </div>
      </SimpleWidgetCard>
    );
  }

  if (!widget) return null;

  const metrics = [
    {
      label: tw('high24h'),
      value: range24h?.highDisplay ?? '--',
      trend: 'neutral' as const,
    },
    {
      label: tw('low24h'),
      value: range24h?.lowDisplay ?? '--',
      trend: 'neutral' as const,
    },
    {
      label: tc('timeRanges.7d'),
      value: change7d?.display ?? '--',
      trend: change7d?.trend ?? 'neutral',
    },
  ];

  if (change30d?.display) {
    metrics.push({
      label: tc('timeRanges.30d'),
      value: change30d.display,
      trend: change30d.trend ?? 'neutral',
    });
  }

  return (
    <SimpleWidgetCard variant="default" className={cn('h-full min-h-[160px]', className)}>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-md bg-secondary text-secondary-foreground">
          <Activity className="w-4 h-4" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {tw('priceRange')}
          </p>
          <p className="text-sm font-semibold">{tc('timeRanges.24h')}</p>
        </div>
      </div>

      <div
        className={cn(
          'grid gap-2',
          metrics.length > 3 ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2',
        )}
      >
        {metrics.map((metric) => (
          <SimpleWidgetMetric
            key={`${metric.label}-${metric.value}`}
            label={metric.label}
            value={metric.value}
            trend={metric.trend}
          />
        ))}
      </div>
    </SimpleWidgetCard>
  );
}
