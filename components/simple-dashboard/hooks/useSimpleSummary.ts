'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/client';

export type SummaryMetricDirection = 'up' | 'down' | 'neutral';

export interface SummaryMetric {
  key: string;
  labelKey: string;
  value: string;
  changeLabel?: string;
  direction?: SummaryMetricDirection;
  hintKey?: string;
  unavailable?: boolean;
}

interface UseSimpleSummaryResult {
  metrics: SummaryMetric[];
  isLoading: boolean;
}

const FALLBACK_METRICS: SummaryMetric[] = [
  {
    key: 'price',
    labelKey: 'simple.summary.price',
    value: '—',
    changeLabel: '—',
    direction: 'neutral',
  },
  {
    key: 'change24h',
    labelKey: 'simple.summary.change24h',
    value: '—',
    changeLabel: '—',
    direction: 'neutral',
  },
  {
    key: 'change7d',
    labelKey: 'simple.summary.change7d',
    value: '—',
    changeLabel: '—',
    direction: 'neutral',
  },
  {
    key: 'volume24h',
    labelKey: 'simple.summary.volume24h',
    value: '—',
    changeLabel: '—',
    direction: 'neutral',
  },
  {
    key: 'staked',
    labelKey: 'simple.summary.staked',
    value: '—',
    changeLabel: '—',
    direction: 'neutral',
  },
];

export function useSimpleSummary(): UseSimpleSummaryResult {
  const priceQuery = useQuery({
    queryKey: ['simple', 'summary', 'price'],
    queryFn: () => apiClient.getWidgetData('usd'),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const volumeQuery = useQuery({
    queryKey: ['simple', 'summary', 'volume'],
    queryFn: () => apiClient.getVolumeWidgetData(),
    refetchInterval: 90_000,
    staleTime: 45_000,
  });

  const stakingQuery = useQuery({
    queryKey: ['simple', 'summary', 'staking'],
    queryFn: () => apiClient.getStakingWidget(),
    refetchInterval: 120_000,
    staleTime: 60_000,
  });

  const metrics = useMemo(() => {
    const priceWidget = priceQuery.data?.widget;
    const volumeWidget = volumeQuery.data?.widget;
    const stakingWidget = stakingQuery.data?.widget;

    if (!priceWidget && !volumeWidget && !stakingWidget) {
      return FALLBACK_METRICS;
    }

    const stakedAbsolute = stakingWidget?.xnos?.current ?? null;
    const totalSupply = priceWidget?.supply?.total ?? null;
    const stakedPercentage =
      stakedAbsolute != null && totalSupply ? (stakedAbsolute / totalSupply) * 100 : null;

    const price24h = priceWidget?.changes?.['24h'];
    const price7d = priceWidget?.changes?.['7d'];
    const volume24h = volumeWidget?.changes?.['24h'];
    const staked24h = stakingWidget?.changes?.['24h']?.xnos;

    return [
      {
        key: 'price',
        labelKey: 'simple.summary.price',
        value: priceWidget?.price?.display ?? '—',
        changeLabel: price24h?.display ?? '—',
        direction: toDirection(price24h?.trend),
      },
      {
        key: 'change24h',
        labelKey: 'simple.summary.change24h',
        value: price24h?.display ?? '—',
        changeLabel: '',
        direction: toDirection(price24h?.trend),
      },
      {
        key: 'change7d',
        labelKey: 'simple.summary.change7d',
        value: price7d?.display ?? '—',
        changeLabel: '',
        direction: toDirection(price7d?.trend),
      },
      {
        key: 'volume24h',
        labelKey: 'simple.summary.volume24h',
        value: volumeWidget?.current?.display ?? volumeWidget?.volume?.display ?? '—',
        changeLabel: volume24h?.display ?? '',
        direction: toDirection(volume24h?.trend),
      },
      {
        key: 'staked',
        labelKey: 'simple.summary.staked',
        value: stakedPercentage != null ? `${stakedPercentage.toFixed(2)}%` : '—',
        changeLabel: staked24h?.display ?? '',
        direction: toDirectionFromNumber(staked24h?.absolute),
      },
    ];
  }, [priceQuery.data, volumeQuery.data, stakingQuery.data]);

  return {
    metrics,
    isLoading: priceQuery.isLoading || volumeQuery.isLoading || stakingQuery.isLoading,
  };
}

function toDirection(trend?: 'up' | 'down' | 'neutral' | string | null): SummaryMetricDirection {
  if (trend === 'up' || trend === 'down' || trend === 'neutral') return trend;
  return 'neutral';
}

function toDirectionFromNumber(value: number | null | undefined): SummaryMetricDirection {
  if (value == null) return 'neutral';
  if (value > 0) return 'up';
  if (value < 0) return 'down';
  return 'neutral';
}
