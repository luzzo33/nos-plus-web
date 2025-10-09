'use client';

import { useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Zap, Activity } from 'lucide-react';
import { SectionCard } from '@/components/simple-dashboard/ui/SectionCard';
import {
  SectionLoading,
  SectionError,
  SectionEmpty,
} from '@/components/simple-dashboard/ui/SectionStates';
import { SIMPLE_SECTIONS } from '@/components/simple-dashboard/state/presets';
import { useStatsStream, type StatsSnapshot } from '@/lib/monitor/useStatsStream';
import { cn } from '@/lib/utils';

export function LivePulseSection() {
  const t = useTranslations();
  const copy = SIMPLE_SECTIONS.livePulse;

  const { rows, loading, error, connected, refresh, updatedAt } = useStatsStream({
    range: '24h',
    aggregate: 'total',
    view: 'default',
    groupBy: null,
  });

  const aggregateRow = rows[0];
  const topVenues = useMemo(() => rows.slice(1, 4), [rows]);

  return (
    <SectionCard
      id={copy.anchor}
      title={t(copy.titleKey)}
      subtitle={copy.subtitleKey ? t(copy.subtitleKey) : undefined}
      moreContent={
        <div className="flex items-center justify-between text-xs text-[hsla(var(--muted-foreground),0.65)]">
          <span>
            {connected
              ? t('simple.sections.livePulse.status.online')
              : t('simple.sections.livePulse.status.offline')}
          </span>
          <span>
            {t('simple.sections.livePulse.updated', {
              time: updatedAt
                ? new Date(updatedAt).toLocaleTimeString(undefined, {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--:--',
            })}
          </span>
        </div>
      }
    >
      {loading && <SectionLoading rows={4} />}
      {!loading && error && <SectionError message={error} onRetry={() => refresh()} />}
      {!loading && !error && !aggregateRow && (
        <SectionEmpty message={t('simple.sections.livePulse.empty')} />
      )}

      {!loading && !error && aggregateRow && (
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-[var(--simple-text-primary)]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                  {t('simple.sections.livePulse.labels.snapshot')}
                </p>
                <p className="text-xs text-[hsla(var(--muted-foreground),0.65)]">
                  {t('simple.sections.livePulse.labels.last24h')}
                </p>
              </div>
            </div>
            <div className="mt-3 grid gap-3 md:grid-cols-4">
              <PulseMetric
                label={t('simple.sections.livePulse.labels.price')}
                value={formatPrice(aggregateRow.priceNow)}
                change={aggregateRow.change24h ?? aggregateRow.change}
              />
              <PulseMetric
                label={t('simple.sections.livePulse.labels.volume')}
                value={formatCompact(aggregateRow.volume)}
              />
              <PulseMetric
                label={t('simple.sections.livePulse.labels.transactions')}
                value={formatCompact(aggregateRow.tx)}
              />
              <PulseMetric
                label={t('simple.sections.livePulse.labels.participants')}
                value={`${formatCompact(aggregateRow.buyers)} / ${formatCompact(aggregateRow.sellers)}`}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[var(--simple-text-primary)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                {t('simple.sections.livePulse.labels.topVenues')}
              </p>
            </div>
            {topVenues.length ? (
              <ul className="mt-3 space-y-2 text-sm text-[var(--simple-text-primary)]">
                {topVenues.map((venue) => (
                  <li
                    key={venue.venue ?? venue.slug ?? Math.random()}
                    className="flex items-center justify-between rounded-xl border border-[hsla(var(--border-card),0.22)] bg-[hsla(var(--background),0.5)] px-3 py-2"
                  >
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                        {venue.venue ??
                          venue.label ??
                          t('simple.sections.livePulse.labels.unknownVenue')}
                      </p>
                      <p className="text-[11px] text-[hsla(var(--muted-foreground),0.65)]">
                        {t('simple.sections.livePulse.labels.lastPrice', {
                          value: formatPrice(venue.priceNow),
                        })}
                      </p>
                    </div>
                    <div className="text-right text-xs text-[hsla(var(--muted-foreground),0.65)]">
                      <p className="font-semibold text-[var(--simple-text-primary)]">
                        {formatCompact(venue.volume)}{' '}
                        {t('simple.sections.livePulse.labels.volumeShort')}
                      </p>
                      <p
                        className={cn(
                          'font-semibold',
                          toneFromChange(venue.change24h ?? venue.change),
                        )}
                      >
                        {formatChange(venue.change24h ?? venue.change)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[hsla(var(--muted-foreground),0.65)]">
                {t('simple.sections.livePulse.noVenues')}
              </p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function PulseMetric({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: number | null;
}) {
  return (
    <div className="rounded-xl border border-[hsla(var(--border-card),0.2)] bg-[hsla(var(--background),0.55)] px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
        {label}
      </p>
      <p className="text-sm font-semibold text-[var(--simple-text-primary)]">{value}</p>
      {change != null && (
        <p className={cn('text-xs font-semibold', toneFromChange(change))}>
          {formatChange(change)}
        </p>
      )}
    </div>
  );
}

function formatPrice(value: number | null | undefined) {
  if (value == null) return '—';
  if (Math.abs(value) >= 1)
    return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  if (Math.abs(value) >= 0.01) return `$${value.toFixed(4)}`;
  return `$${value.toPrecision(3)}`;
}

function formatCompact(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toFixed(2);
}

function formatChange(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  const prefix = value > 0 ? '+' : '';
  return `${prefix}${value.toFixed(2)}%`;
}

function toneFromChange(value: number | null | undefined) {
  if (value == null || !Number.isFinite(value) || value === 0)
    return 'text-[hsla(var(--muted-foreground),0.7)]';
  return value > 0 ? 'text-[var(--simple-pos)]' : 'text-[var(--simple-neg)]';
}
