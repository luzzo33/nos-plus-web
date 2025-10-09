'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Gauge, Zap, AlertTriangle } from 'lucide-react';
import {
  SimpleWidgetCard,
  SimpleWidgetHeader,
  SimpleWidgetValue,
  Sparkline,
} from './SimpleWidgetCard';
import { Tooltip } from '@/components/ui/Tooltip';
import { apiClient } from '@/lib/api/client';
import { useTranslations, useLocale } from 'next-intl';
import { cn } from '@/lib/utils';

type SentimentZone = 'extremeFear' | 'fear' | 'neutral' | 'greed' | 'extremeGreed';

const zoneOrder: SentimentZone[] = ['extremeFear', 'fear', 'neutral', 'greed', 'extremeGreed'];

const zoneAccent: Record<SentimentZone, string> = {
  extremeFear: 'hsl(var(--neg))',
  fear: 'hsl(var(--warn))',
  neutral: 'hsl(var(--text-secondary))',
  greed: 'hsl(var(--pos))',
  extremeGreed: 'hsl(var(--pos))',
};

const zoneIcon: Record<SentimentZone, JSX.Element> = {
  extremeFear: <AlertTriangle className="h-4 w-4" />,
  fear: <AlertTriangle className="h-4 w-4" />,
  neutral: <Gauge className="h-4 w-4" />,
  greed: <Zap className="h-4 w-4" />,
  extremeGreed: <Zap className="h-4 w-4" />,
};

interface SimpleSentimentWidgetProps {
  isMobile?: boolean;
  className?: string;
}

function buildSkeleton() {
  const block = 'relative overflow-hidden rounded-md bg-[hsl(var(--border-card)_/_0.2)]';
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`${block} h-8 w-8`}>
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          <div className="space-y-2">
            <div className={`${block} h-3 w-24`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
            <div className={`${block} h-3 w-20`}>
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          </div>
        </div>
        <div className={`${block} h-6 w-20 rounded-full`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      </div>
      <div className="flex items-center gap-4">
        <div className={`${block} h-12 w-24`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
        <div className={`${block} h-16 flex-1`}>
          <div className="absolute inset-0 skeleton-shimmer" />
        </div>
      </div>
      <div className={`${block} h-10 w-full`}>
        <div className="absolute inset-0 skeleton-shimmer" />
      </div>
    </div>
  );
}

export function SimpleSentimentWidget({ isMobile = false, className }: SimpleSentimentWidgetProps) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const locale = useLocale();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['simple-sentiment-widget'],
    queryFn: () => apiClient.getSentimentWidgetData(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const widget = data?.widget;
  const currentZone = (widget?.current?.zone ?? 'neutral') as SentimentZone;
  const change24h = widget?.changes?.['24h'];

  const sparklineValues =
    widget?.sparkline
      ?.map((point) => Number(point?.value ?? point?.index ?? 0))
      .filter((value) => Number.isFinite(value)) ?? [];

  const sparklineTooltip = useMemo(() => {
    if (!widget?.sparkline || !widget.sparkline.length) return null;
    const formatter = new Intl.DateTimeFormat(locale, { month: 'short', day: 'numeric' });
    return (
      <div className="space-y-1">
        <p className="text-[hsl(var(--text-primary))] font-semibold">{tw('sentiment')}</p>
        {widget.sparkline.slice(-7).map((point: any, index: number) => {
          const timestamp = point?.timestamp ?? point?.time ?? point?.date;
          const value = Number(point?.value ?? point?.index ?? 0);
          return (
            <div key={`${timestamp ?? index}`} className="flex items-center justify-between gap-4">
              <span className="text-[hsl(var(--text-secondary))]">
                {timestamp ? formatter.format(new Date(timestamp)) : `#${index + 1}`}
              </span>
              <span className="text-[hsl(var(--text-primary))] font-semibold">{value}</span>
            </div>
          );
        })}
      </div>
    );
  }, [widget?.sparkline, locale, tw]);

  const topZones = useMemo(() => {
    const distribution = widget?.history?.zoneDistribution;
    if (!distribution) return [];
    return zoneOrder
      .map((zone) => ({
        zone,
        percentage: distribution[zone]?.percentage ?? null,
      }))
      .filter((entry) => entry.percentage)
      .slice(0, 3);
  }, [widget]);

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

  const indexDisplay =
    widget.current?.display && widget.current.display !== '--'
      ? widget.current.display
      : (widget.current?.value ?? tc('noData'));
  const sentimentLabel = widget.current?.sentiment ?? tw(currentZone);
  const sentimentDescription = widget.current?.description ?? '';

  const isPositive = (change24h?.value ?? 0) > 0;
  const isNegative = (change24h?.value ?? 0) < 0;
  const changeDisplay =
    change24h?.display ??
    (change24h?.value != null
      ? `${change24h.value > 0 ? '+' : ''}${change24h.value.toFixed(1)}`
      : tc('noData'));
  const badgeTrend = isPositive ? 'up' : isNegative ? 'down' : 'neutral';

  return (
    <SimpleWidgetCard className={cn('h-full', className)}>
      <SimpleWidgetHeader
        icon={<Gauge className="h-4 w-4" />}
        title={tw('fearAndGreed')}
        meta={tc('timeRanges.24h')}
        action={
          <span
            className={cn('badge-delta', change24h?.value != null && 'is-updated')}
            data-trend={badgeTrend}
          >
            {isPositive && <ArrowUpRight className="h-3.5 w-3.5" />}
            {isNegative && <ArrowDownRight className="h-3.5 w-3.5" />}
            <span>{changeDisplay}</span>
          </span>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <SimpleWidgetValue value={indexDisplay} label={sentimentLabel} size="lg" />
            <p className="text-sm text-[hsl(var(--text-secondary))]">{tw('sentimentRange')}</p>
            {sentimentDescription && (
              <p className="text-sm text-[hsl(var(--text-secondary))] leading-snug">
                {sentimentDescription}
              </p>
            )}
          </div>

          {sparklineValues.length > 3 &&
            (() => {
              const chart = (
                <div className="w-full min-w-[150px] flex-1">
                  <Sparkline
                    data={sparklineValues.slice(-30)}
                    height={isMobile ? 60 : 70}
                    color={zoneAccent[currentZone]}
                    strokeWidth={2}
                  />
                </div>
              );
              return sparklineTooltip ? (
                <Tooltip content={sparklineTooltip} className="w-48 text-xs" placement="left">
                  {chart}
                </Tooltip>
              ) : (
                chart
              );
            })()}
        </div>

        {topZones.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {topZones.map(({ zone, percentage }) => (
              <span
                key={zone}
                className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--border-card)_/_0.25)] px-2.5 py-1 text-xs font-semibold text-[hsl(var(--text-primary))]"
              >
                <span className="text-[hsl(var(--text-secondary))]">{zoneIcon[zone]}</span>
                {tw(zone)} · {percentage}
              </span>
            ))}
          </div>
        )}
      </div>
    </SimpleWidgetCard>
  );
}
