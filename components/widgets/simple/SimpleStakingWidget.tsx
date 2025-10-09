'use client';

import { useQuery } from '@tanstack/react-query';
import { Layers, BadgePercent, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import {
  SimpleWidgetCard,
  SimpleWidgetHeader,
  SimpleWidgetValue,
  SimpleRangeBar,
} from './SimpleWidgetCard';
import { apiClient } from '@/lib/api/client';
import { useTranslations } from 'next-intl';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';
import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

interface SimpleStakingWidgetProps {
  isMobile?: boolean;
  className?: string;
}

function buildSkeleton() {
  const shimmer = 'relative overflow-hidden rounded-md bg-[hsl(var(--border-card)_/_0.2)]';
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${shimmer} h-8 w-8`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <div className={`${shimmer} h-3 w-24`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className={`${shimmer} h-3 w-20`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className={`${shimmer} h-3 w-16`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className={`${shimmer} h-12`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 2 }).map((_, index) => (
          <div key={index} className={`${shimmer} h-8`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SimpleStakingWidget({ isMobile = false, className }: SimpleStakingWidgetProps) {
  const tw = useTranslations('widgets');
  const td = useTranslations('dashboard');
  const tc = useTranslations('common');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['simple-staking-widget'],
    queryFn: () => apiClient.getStakingWidget(),
    refetchInterval: 90_000,
    staleTime: 45_000,
  });

  const widget = data?.widget;
  const change24h = widget?.changes?.['24h'];
  const ranges24h = widget?.ranges?.['24h'] ?? widget?.ranges?.['7d'] ?? widget?.ranges?.['30d'];

  const lastUpdatedLabel = useFormattedTimestamp(widget?.lastUpdate, {
    absoluteFormat: 'MMM d • HH:mm:ss',
    fallbackAbsolute: '—',
  });

  const xnosCurrent = widget?.xnos?.display ?? tc('noData');
  const aprCurrent = widget?.apr?.display ?? tc('noData');

  const xnosChange = change24h?.xnos;
  const aprChange = change24h?.apr;

  const xnosValue =
    typeof widget?.xnos?.value === 'number'
      ? widget.xnos.value
      : typeof widget?.xnos?.current === 'number'
        ? widget.xnos.current
        : null;

  const aprValue =
    typeof widget?.apr?.value === 'number'
      ? widget.apr.value
      : typeof widget?.apr?.current === 'number'
        ? widget.apr.current
        : null;

  const xnosRange = ranges24h?.xnos;
  const aprRange = ranges24h?.apr;

  const computeProgress = (value: number | null, range?: { low?: number; high?: number }) => {
    if (
      value == null ||
      typeof range?.low !== 'number' ||
      typeof range?.high !== 'number' ||
      range.high === range.low
    ) {
      return 0.5;
    }
    return (value - range.low) / (range.high - range.low);
  };

  const xnosProgress = computeProgress(xnosValue, xnosRange);
  const aprProgress = computeProgress(aprValue, aprRange);

  const getBadgeTrend = (change?: { value?: number }) => {
    if (!change?.value) return 'neutral';
    if (change.value > 0) return 'up';
    if (change.value < 0) return 'down';
    return 'neutral';
  };

  if (isLoading) {
    return (
      <SimpleWidgetCard className={cn('h-full', className)} disableHover>
        {buildSkeleton()}
      </SimpleWidgetCard>
    );
  }

  if (isError || !widget) {
    return (
      <SimpleWidgetCard className={cn('h-full', className)} disableHover>
        <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-[hsl(var(--text-secondary))]">
          <span>{tc('noData')}</span>
          {error instanceof Error && (
            <span className="text-xs text-[hsl(var(--text-secondary))]">{error.message}</span>
          )}
        </div>
      </SimpleWidgetCard>
    );
  }

  const Badge = ({
    change,
    children,
  }: {
    change?: { value?: number; display?: string };
    children?: ReactNode;
  }) => {
    const trend = getBadgeTrend(change);
    const Icon = trend === 'up' ? ArrowUpRight : trend === 'down' ? ArrowDownRight : null;
    return (
      <span className={cn('badge-delta', change?.value != null && 'is-updated')} data-trend={trend}>
        {Icon && <Icon className="h-3.5 w-3.5" />}
        <span>{change?.display ?? tc('noData')}</span>
        {children}
      </span>
    );
  };

  return (
    <SimpleWidgetCard className={cn('h-full', className)}>
      <SimpleWidgetHeader
        icon={<Layers className="h-4 w-4" />}
        title={tw('staking')}
        meta={td('stakingRewardsDesc')}
      />

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-[hsl(var(--border-card)_/_0.35)] bg-[hsl(var(--border-card)_/_0.12)] p-3">
            <div className="flex items-center justify-between gap-2">
              <SimpleWidgetValue value={xnosCurrent} label="xNOS" size="md" />
              <Badge change={xnosChange} />
            </div>
            <div className="mt-3 space-y-2">
              <SimpleRangeBar
                minLabel={xnosRange?.lowDisplay ?? tc('noData')}
                maxLabel={xnosRange?.highDisplay ?? tc('noData')}
                currentLabel={xnosCurrent}
                progress={xnosProgress}
                tone={
                  getBadgeTrend(xnosChange) === 'up'
                    ? 'positive'
                    : getBadgeTrend(xnosChange) === 'down'
                      ? 'negative'
                      : 'neutral'
                }
              />
            </div>
          </div>
          <div className="rounded-lg border border-[hsl(var(--border-card)_/_0.35)] bg-[hsl(var(--border-card)_/_0.12)] p-3">
            <div className="flex items-center justify-between gap-2">
              <SimpleWidgetValue value={aprCurrent} label="APR" size="md" />
              <Badge change={aprChange}>
                <BadgePercent className="ml-1 h-3 w-3 text-[hsl(var(--text-secondary))]" />
              </Badge>
            </div>
            <div className="mt-3 space-y-2">
              <SimpleRangeBar
                minLabel={aprRange?.lowDisplay ?? tc('noData')}
                maxLabel={aprRange?.highDisplay ?? tc('noData')}
                currentLabel={aprCurrent}
                progress={aprProgress}
                tone={
                  getBadgeTrend(aprChange) === 'up'
                    ? 'positive'
                    : getBadgeTrend(aprChange) === 'down'
                      ? 'negative'
                      : 'neutral'
                }
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end text-[11px] text-[hsl(var(--text-secondary))]">
          <span className="uppercase tracking-[0.08em]">{tc('lastUpdated')}:</span>
          <span className="ml-2 text-[hsl(var(--text-primary))]">{lastUpdatedLabel}</span>
        </div>
      </div>
    </SimpleWidgetCard>
  );
}
