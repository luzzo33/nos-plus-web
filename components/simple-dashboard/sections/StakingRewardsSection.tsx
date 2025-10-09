'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { Award, ShieldCheck } from 'lucide-react';
import { SectionCard } from '@/components/simple-dashboard/ui/SectionCard';
import {
  SectionLoading,
  SectionError,
  SectionEmpty,
} from '@/components/simple-dashboard/ui/SectionStates';
import { SIMPLE_SECTIONS } from '@/components/simple-dashboard/state/presets';
import { apiClient } from '@/lib/api/client';
import type { StakingWidgetData } from '@/lib/api/types';
import type { AccountsWidgetData } from '@/lib/api/balances-client';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/components/simple-dashboard/utils/error';

function useStakingWidget() {
  return useQuery({
    queryKey: ['simple', 'staking', 'widget'],
    queryFn: () => apiClient.getStakingWidget(),
    refetchInterval: 2 * 60_000,
    staleTime: 60_000,
  });
}

function useStakersUnstakersWidget() {
  return useQuery({
    queryKey: ['simple', 'staking', 'accounts-widget'],
    queryFn: () => apiClient.getStakersUnstakersWidget(),
    refetchInterval: 3 * 60_000,
    staleTime: 90_000,
  });
}

export function StakingRewardsSection() {
  const t = useTranslations();
  const copy = SIMPLE_SECTIONS.stakingRewards;

  const {
    data: stakingData,
    isLoading: loadingStaking,
    error: stakingError,
    refetch: refetchStaking,
  } = useStakingWidget();

  const {
    data: accountsData,
    isLoading: loadingAccounts,
    error: accountsError,
    refetch: refetchAccounts,
  } = useStakersUnstakersWidget();

  const loading = loadingStaking || loadingAccounts;
  const errorRaw = stakingError ?? accountsError;
  const errorMessage = extractErrorMessage(errorRaw);

  const handleRetry = () => {
    refetchStaking();
    refetchAccounts();
  };

  const staking = stakingData?.widget;
  const accounts = accountsData?.widget as AccountsWidgetData | undefined;

  const netFlow = useMemo(() => {
    if (!accounts?.changes?.['24h']) return null;
    const change = accounts.changes['24h'];
    const stakers = Number(change.stakers?.absolute ?? 0);
    const unstakers = Number(change.unstakers?.absolute ?? 0);
    const total = Number(change.total?.absolute ?? 0);
    return {
      stakers,
      unstakers,
      total,
      display: change.total?.display ?? `${total >= 0 ? '+' : ''}${total}`,
      trend: total === 0 ? 'neutral' : total > 0 ? 'up' : 'down',
    } as const;
  }, [accounts?.changes]);

  return (
    <SectionCard
      id={copy.anchor}
      title={t(copy.titleKey)}
      subtitle={copy.subtitleKey ? t(copy.subtitleKey) : undefined}
      moreContent={
        staking?.ranges?.['30d'] ? (
          <div className="grid gap-2 text-sm text-[hsla(var(--muted-foreground),0.78)]">
            <div className="flex justify-between">
              <span>{t('simple.sections.stakingRewards.more.streak')}</span>
              <span>{staking.ranges['30d'].xnos?.changeDisplay ?? '—'}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('simple.sections.stakingRewards.more.aprRange')}</span>
              <span>
                {staking.ranges['30d'].apr?.lowDisplay ?? '—'} →{' '}
                {staking.ranges['30d'].apr?.highDisplay ?? '—'}
              </span>
            </div>
          </div>
        ) : null
      }
    >
      {loading && <SectionLoading rows={6} />}
      {!loading && errorRaw && <SectionError message={errorMessage} onRetry={handleRetry} />}
      {!loading && !errorRaw && !staking && (
        <SectionEmpty message={t('simple.sections.stakingRewards.empty')} />
      )}

      {!loading && !errorRaw && staking && (
        <div className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
            <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
              <div className="flex items-center gap-2">
                <Award className="h-5 w-5 text-[var(--simple-text-primary)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                    {t('simple.sections.stakingRewards.labels.staked')}
                  </p>
                  <p className="text-2xl font-semibold text-[var(--simple-text-primary)]">
                    {staking.xnos.display}
                  </p>
                  <p className="text-xs text-[hsla(var(--muted-foreground),0.65)]">
                    {t('simple.sections.stakingRewards.labels.updated', {
                      time: staking.lastUpdate?.slice(11, 16) ?? '—',
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <StakingMetric
                  label={t('simple.sections.stakingRewards.labels.change24h')}
                  change={staking.changes?.['24h']?.xnos}
                />
                <StakingMetric
                  label={t('simple.sections.stakingRewards.labels.change7d')}
                  change={staking.changes?.['7d']?.xnos}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-[var(--simple-text-primary)]" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                    {t('simple.sections.stakingRewards.labels.apr')}
                  </p>
                  <p className="text-xl font-semibold text-[var(--simple-text-primary)]">
                    {staking.apr.display}
                  </p>
                  <p className="text-xs text-[hsla(var(--muted-foreground),0.65)]">
                    {staking.apr.tier
                      ? t('simple.sections.stakingRewards.labels.tier', { tier: staking.apr.tier })
                      : '—'}
                  </p>
                </div>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[var(--simple-text-primary)]">
                <div className="flex justify-between">
                  <span>{t('simple.sections.stakingRewards.labels.change24h')}</span>
                  <span className={changeTone(staking.changes?.['24h']?.apr?.absolute ?? 0)}>
                    {staking.changes?.['24h']?.apr?.display ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t('simple.sections.stakingRewards.labels.change30d')}</span>
                  <span className={changeTone(staking.changes?.['30d']?.apr?.absolute ?? 0)}>
                    {staking.changes?.['30d']?.apr?.display ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-[1.1fr_1fr]">
            <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                {t('simple.sections.stakingRewards.labels.netFlow')}
              </p>
              {accounts ? (
                <div className="mt-3 space-y-2 text-sm text-[var(--simple-text-primary)]">
                  <div className="flex justify-between">
                    <span>{t('simple.sections.stakingRewards.labels.stakers')}</span>
                    <span>+{accounts.changes?.['24h']?.stakers?.display ?? '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t('simple.sections.stakingRewards.labels.unstakers')}</span>
                    <span>{accounts.changes?.['24h']?.unstakers?.display ?? '—'}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl border border-[hsla(var(--border-card),0.22)] bg-[hsla(var(--background),0.5)] px-3 py-2">
                    <span className="text-xs uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
                      {t('simple.sections.stakingRewards.labels.net')}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        netFlow ? changeTone(netFlow.total) : '',
                      )}
                    >
                      {netFlow?.display ?? '—'}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="mt-3 text-sm text-[hsla(var(--muted-foreground),0.65)]">
                  {t('simple.sections.stakingRewards.noAccounts')}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                {t('simple.sections.stakingRewards.labels.forecast')}
              </p>
              <div className="mt-3 space-y-2 text-sm text-[var(--simple-text-primary)]">
                <div className="flex justify-between">
                  <span>{t('simple.sections.stakingRewards.labels.rewardCadence')}</span>
                  <span>{t('simple.sections.stakingRewards.cadence.daily')}</span>
                </div>
                <div className="flex justify-between">
                  <span>{t('simple.sections.stakingRewards.labels.estimate30d')}</span>
                  <span>
                    {staking.changes?.['30d']?.xnos?.absolute
                      ? formatUnits(staking.changes['30d'].xnos.absolute)
                      : '—'}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-[hsla(var(--muted-foreground),0.65)]">
                  <span>{t('simple.sections.stakingRewards.labels.note')}</span>
                  <span>{t('simple.sections.stakingRewards.labels.nonPromissory')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

interface StakingMetricProps {
  label: string;
  change?: StakingWidgetData['changes'] extends Record<string, infer T> ? T : never;
}

function StakingMetric({ label, change }: StakingMetricProps) {
  const display = change?.display ?? '—';
  const trend = changeTone(change?.absolute ?? 0);
  return (
    <div className="rounded-xl border border-[hsla(var(--border-card),0.2)] bg-[hsla(var(--background),0.55)] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
        {label}
      </p>
      <p className={cn('text-sm font-semibold', trend)}>{display}</p>
    </div>
  );
}

function changeTone(value: number) {
  if (value > 0) return 'text-[var(--simple-pos)]';
  if (value < 0) return 'text-[var(--simple-neg)]';
  return 'text-[hsla(var(--muted-foreground),0.7)]';
}

function formatUnits(value: number) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}
