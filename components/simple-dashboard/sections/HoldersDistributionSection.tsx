'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Users, ChevronDown } from 'lucide-react';
import { SectionCard } from '@/components/simple-dashboard/ui/SectionCard';
import {
  SectionLoading,
  SectionError,
  SectionEmpty,
} from '@/components/simple-dashboard/ui/SectionStates';
import { SIMPLE_SECTIONS } from '@/components/simple-dashboard/state/presets';
import { apiClient } from '@/lib/api/client';
import type { HoldersWidgetData, DistributionWidgetData } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/components/simple-dashboard/utils/error';

type HolderRange = '24h' | '7d' | '30d';

const RANGE_OPTIONS: Array<{ value: HolderRange; labelKey: string }> = [
  { value: '24h', labelKey: 'timeRanges.24h' },
  { value: '7d', labelKey: 'timeRanges.7d' },
  { value: '30d', labelKey: 'timeRanges.30d' },
];

function useHoldersWidget() {
  return useQuery({
    queryKey: ['simple', 'holders', 'widget'],
    queryFn: () => apiClient.getHoldersWidgetData(),
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
  });
}

function useDistributionWidget() {
  return useQuery({
    queryKey: ['simple', 'holders', 'distribution-widget'],
    queryFn: () => apiClient.getDistributionWidgetData(),
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
}

export function HoldersDistributionSection() {
  const t = useTranslations();
  const tc = useTranslations('common');
  const copy = SIMPLE_SECTIONS.holdersDistribution;

  const [range, setRange] = useState<HolderRange>('24h');

  const {
    data: holdersData,
    isLoading: loadingHolders,
    error: holdersError,
    refetch: refetchHolders,
  } = useHoldersWidget();

  const {
    data: distributionData,
    isLoading: loadingDistribution,
    error: distributionError,
    refetch: refetchDistribution,
  } = useDistributionWidget();

  const loading = loadingHolders || loadingDistribution;
  const errorRaw = holdersError ?? distributionError;
  const errorMessage = extractErrorMessage(errorRaw);

  const handleRetry = () => {
    refetchHolders();
    refetchDistribution();
  };

  const holders = holdersData?.widget;
  const distribution = distributionData?.widget;

  const rangeStats = holders?.ranges?.[range];
  const topBuckets = useMemo(
    () => computeTopBuckets(distribution?.current?.percentages, distribution?.current?.brackets),
    [distribution?.current],
  );

  return (
    <SectionCard
      id={copy.anchor}
      title={t(copy.titleKey)}
      subtitle={copy.subtitleKey ? t(copy.subtitleKey) : undefined}
      action={
        <RangeSelector
          current={range}
          onChange={setRange}
          options={RANGE_OPTIONS.map((option) => ({
            value: option.value,
            label: tc(option.labelKey),
          }))}
          label={t('simple.sections.holdersDistribution.range')}
        />
      }
      moreContent={
        holders?.milestones ? (
          <div className="grid gap-2 text-sm text-[hsla(var(--muted-foreground),0.78)]">
            <div className="flex justify-between">
              <span>{t('simple.sections.holdersDistribution.more.nextMilestone')}</span>
              <span>{holders.milestones.next?.toLocaleString() ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('simple.sections.holdersDistribution.more.progress')}</span>
              <span>{holders.milestones.progress ?? 0}%</span>
            </div>
            {holders.milestones.estimatedDate && (
              <div className="flex justify-between">
                <span>{t('simple.sections.holdersDistribution.more.estimate')}</span>
                <span>{new Date(holders.milestones.estimatedDate).toLocaleDateString()}</span>
              </div>
            )}
          </div>
        ) : null
      }
    >
      {loading && <SectionLoading rows={6} />}
      {!loading && errorRaw && <SectionError message={errorMessage} onRetry={handleRetry} />}
      {!loading && !errorRaw && !holders && (
        <SectionEmpty message={t('simple.sections.holdersDistribution.empty')} />
      )}

      {!loading && !errorRaw && holders && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
            <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-[var(--simple-text-primary)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                    {t('simple.sections.holdersDistribution.labels.currentHolders')}
                  </p>
                  <p className="text-2xl font-semibold text-[var(--simple-text-primary)]">
                    {holders.current.display}
                  </p>
                  <p className="text-xs text-[hsla(var(--muted-foreground),0.65)]">
                    {t('simple.sections.holdersDistribution.labels.updated', {
                      time: holders.current.lastUpdate.slice(11, 16),
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <HolderMetric
                  label={t('simple.sections.holdersDistribution.labels.change24h')}
                  change={holders.changes?.['24h']}
                />
                <HolderMetric
                  label={t('simple.sections.holdersDistribution.labels.change7d')}
                  change={holders.changes?.['7d']}
                />
                <HolderMetric
                  label={t('simple.sections.holdersDistribution.labels.change30d')}
                  change={holders.changes?.['30d']}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                {t('simple.sections.holdersDistribution.labels.rangeStats', {
                  range: tc(`timeRanges.${range}`),
                })}
              </p>
              {rangeStats ? (
                <div className="mt-4 space-y-2 text-sm text-[var(--simple-text-primary)]">
                  <div className="flex items-center justify-between">
                    <span>{t('simple.sections.holdersDistribution.labels.average')}</span>
                    <span>
                      {Number(rangeStats.average).toLocaleString(undefined, {
                        maximumFractionDigits: 0,
                      })}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('simple.sections.holdersDistribution.labels.rangeHigh')}</span>
                    <span>{rangeStats.high?.toLocaleString() ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>{t('simple.sections.holdersDistribution.labels.rangeLow')}</span>
                    <span>{rangeStats.low?.toLocaleString() ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-[hsla(var(--muted-foreground),0.7)]">
                    <span>{t('simple.sections.holdersDistribution.labels.trend')}</span>
                    <span>
                      {rangeStats.trend
                        ? t(`simple.sections.holdersDistribution.trends.${rangeStats.trend}`)
                        : '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[hsla(var(--muted-foreground),0.65)]">
                  {t('simple.sections.holdersDistribution.noRangeData')}
                </p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
              {t('simple.sections.holdersDistribution.labels.brackets')}
            </p>
            {topBuckets.length ? (
              <div className="mt-3 space-y-2">
                <DistributionBar percentages={distribution?.current?.percentages} />
                <ul className="grid gap-2 md:grid-cols-2">
                  {topBuckets.map((bucket) => (
                    <li
                      key={bucket.key}
                      className="flex items-center justify-between rounded-xl border border-[hsla(var(--border-card),0.22)] bg-[hsla(var(--background),0.55)] px-3 py-2 text-sm text-[var(--simple-text-primary)]"
                    >
                      <span className="font-semibold">
                        {t(`simple.sections.holdersDistribution.brackets.${bucket.key}`)}
                      </span>
                      <span className="text-xs text-[hsla(var(--muted-foreground),0.65)]">
                        {bucket.countDisplay} · {bucket.percent.toFixed(2)}%
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[hsla(var(--muted-foreground),0.65)]">
                {t('simple.sections.holdersDistribution.noDistribution')}
              </p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

interface RangeSelectorProps {
  current: HolderRange;
  onChange: (value: HolderRange) => void;
  options: Array<{ value: HolderRange; label: string }>;
  label: string;
}

function RangeSelector({ current, onChange, options, label }: RangeSelectorProps) {
  return (
    <div className="relative inline-flex items-center gap-2 rounded-full border border-[hsla(var(--border-card),0.3)] bg-[hsla(var(--background),0.55)] px-3 py-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.6)]">
        {label}
      </span>
      <select
        className="appearance-none bg-transparent text-xs font-semibold uppercase tracking-[0.12em] text-[var(--simple-text-primary)] focus:outline-none"
        value={current}
        onChange={(event) => onChange(event.target.value as HolderRange)}
        aria-label={label}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-background text-foreground">
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="h-3.5 w-3.5 text-[hsla(var(--muted-foreground),0.6)]" />
    </div>
  );
}

interface HolderMetricProps {
  label: string;
  change?: HoldersWidgetData['changes']['24h'];
}

function HolderMetric({ label, change }: HolderMetricProps) {
  const value = change?.display ?? '—';
  const trend =
    change?.trend === 'up'
      ? 'text-[var(--simple-pos)]'
      : change?.trend === 'down'
        ? 'text-[var(--simple-neg)]'
        : 'text-[hsla(var(--muted-foreground),0.7)]';

  return (
    <div className="rounded-xl border border-[hsla(var(--border-card),0.2)] bg-[hsla(var(--background),0.55)] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
        {label}
      </p>
      <p className={cn('text-sm font-semibold', trend)}>{value}</p>
    </div>
  );
}

interface DistributionBarProps {
  percentages?: DistributionWidgetData['current']['percentages'];
}

function DistributionBar({ percentages }: DistributionBarProps) {
  if (!percentages) return null;
  const entries = Object.entries(percentages) as Array<[keyof typeof percentages, number]>;
  const total = entries.reduce((sum, [, value]) => sum + value, 0) || 1;
  return (
    <div className="flex h-3 w-full overflow-hidden rounded-full border border-[hsla(var(--border-card),0.2)] bg-[hsla(var(--background),0.45)]">
      {entries.map(([key, value]) => (
        <div
          key={key}
          className={cn(
            'h-full',
            key === 'micro' && 'bg-[hsla(var(--accent),0.25)]',
            key === 'small' && 'bg-[hsla(var(--accent),0.35)]',
            key === 'medium' && 'bg-[hsla(var(--accent),0.45)]',
            key === 'large' && 'bg-[hsla(var(--accent),0.6)]',
            key === 'xlarge' && 'bg-[hsla(var(--accent),0.7)]',
            key === 'whale' && 'bg-[hsla(var(--chart-pos),0.65)]',
            key === 'megaWhale' && 'bg-[hsla(var(--chart-pos),0.8)]',
          )}
          style={{ width: `${(value / total) * 100}%` }}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}

function computeTopBuckets(
  percentages: DistributionWidgetData['current']['percentages'] | undefined,
  counts: DistributionWidgetData['current']['brackets'] | undefined,
) {
  if (!percentages || !counts) return [];
  return Object.entries(percentages)
    .map(([key, percent]) => ({
      key,
      percent,
      count: counts?.[key as keyof typeof counts] ?? 0,
      countDisplay: (counts?.[key as keyof typeof counts] ?? 0).toLocaleString(),
    }))
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 4);
}
