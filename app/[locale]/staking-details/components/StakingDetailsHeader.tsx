'use client';

import { format } from 'date-fns';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import type { ContractWidgetData, ContractWidgetChange } from '@/lib/api/types';

interface StakingDetailsHeaderProps {
  widget: ContractWidgetData | undefined;
  mounted: boolean;
  loading?: boolean;
}

const stripNosSuffix = (value: string | null | undefined): string | undefined => {
  if (typeof value !== 'string') return value ?? undefined;
  return value.replace(/\s*NOS$/i, '').trim();
};

const formatDelta = (delta?: ContractWidgetChange) => {
  if (!delta) return '—';
  if (typeof delta.display === 'string' && delta.display.trim().length > 0) {
    return stripNosSuffix(delta.display) ?? delta.display;
  }
  if (typeof delta.percentage === 'number' && Number.isFinite(delta.percentage)) {
    return `${delta.percentage >= 0 ? '+' : ''}${delta.percentage.toFixed(2)}%`;
  }
  if (typeof delta.absolute === 'number' && Number.isFinite(delta.absolute)) {
    const abs = Math.abs(delta.absolute);
    const sign = delta.absolute >= 0 ? '+' : '-';
    if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(2)}B`;
    if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(2)}M`;
    if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(2)}K`;
    return `${sign}${abs.toFixed(2)}`;
  }
  return '—';
};

export function StakingDetailsHeader({
  widget,
  mounted,
  loading = false,
}: StakingDetailsHeaderProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakingDetails');

  const showSkeleton = loading || !widget;
  const showContent = mounted && widget && !loading;

  const stakingDelta = widget?.changes?.['24h']?.staking;
  const unstakingDelta = widget?.changes?.['24h']?.unstaking;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className={text('3xl', '4xl', 'font-bold')}>{t('title')}</h1>
            <p className={cn(text('base', 'base'), 'text-muted-foreground mt-1')}>
              {t('subtitle')}
            </p>
          </div>

          {showSkeleton && (
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 min-w-[260px]">
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="relative skeleton h-3 w-20 rounded">
                      <div className="absolute inset-0 skeleton-shimmer" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
                      <div className="relative skeleton h-7 w-32 rounded">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                      <div className="relative skeleton h-5 w-20 rounded">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="relative skeleton h-3 w-40 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            </div>
          )}

          {showContent && (
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MetricCard
                  title={t('header.totalStaked')}
                  value={stripNosSuffix(widget?.staking?.display) ?? '—'}
                  delta={stakingDelta}
                  text={text}
                />
                <MetricCard
                  title={t('header.unstaking')}
                  value={stripNosSuffix(widget?.unstaking?.display) ?? '—'}
                  delta={unstakingDelta}
                  text={text}
                />
              </div>
              <p className={cn(text('xs', 'xs'), 'text-muted-foreground mt-2')}>
                {t('header.lastUpdated')}:{' '}
                {widget?.lastUpdate ? format(new Date(widget.lastUpdate), 'HH:mm:ss') : '—'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({
  title,
  value,
  delta,
  text,
}: {
  title: string;
  value: string;
  delta?: ContractWidgetChange;
  text: ReturnType<typeof useFontScale>['text'];
}) {
  const formattedDelta = formatDelta(delta);
  const isPositive = (delta?.absolute ?? delta?.percentage ?? 0) >= 0;
  return (
    <div>
      <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>{title}</p>
      <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 gap-1">
        <p className={text('2xl', '3xl', 'font-bold')}>{value}</p>
        {delta && (
          <div
            className={cn(
              'flex items-center gap-1',
              isPositive ? 'text-green-500' : 'text-red-500',
            )}
          >
            {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            <span className={text('sm', 'sm', 'font-medium')}>{formattedDelta}</span>
          </div>
        )}
      </div>
    </div>
  );
}
