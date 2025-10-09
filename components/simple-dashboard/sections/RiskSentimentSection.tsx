'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { ThermometerSun, Gauge, AlertTriangle } from 'lucide-react';
import { SectionCard } from '@/components/simple-dashboard/ui/SectionCard';
import {
  SectionLoading,
  SectionError,
  SectionEmpty,
} from '@/components/simple-dashboard/ui/SectionStates';
import { SIMPLE_SECTIONS } from '@/components/simple-dashboard/state/presets';
import { apiClient } from '@/lib/api/client';
import type { SentimentWidgetData, StatsResponse } from '@/lib/api/types';
import { cn } from '@/lib/utils';
import { extractErrorMessage } from '@/components/simple-dashboard/utils/error';

function useSentimentWidget() {
  return useQuery({
    queryKey: ['simple', 'risk', 'sentiment-widget'],
    queryFn: () => apiClient.getSentimentWidgetData(),
    refetchInterval: 90_000,
    staleTime: 45_000,
  });
}

function usePriceStats() {
  return useQuery({
    queryKey: ['simple', 'risk', 'price-stats'],
    queryFn: () => apiClient.getStats({ range: '30d' }),
    refetchInterval: 5 * 60_000,
    staleTime: 2 * 60_000,
  });
}

export function RiskSentimentSection() {
  const t = useTranslations();
  const copy = SIMPLE_SECTIONS.riskSentiment;

  const {
    data: sentimentData,
    isLoading: loadingSentiment,
    error: sentimentError,
    refetch: refetchSentiment,
  } = useSentimentWidget();

  const {
    data: statsData,
    isLoading: loadingStats,
    error: statsError,
    refetch: refetchStats,
  } = usePriceStats();

  const loading = loadingSentiment || loadingStats;
  const errorRaw = sentimentError ?? statsError;
  const errorMessage = extractErrorMessage(errorRaw);

  const handleRetry = () => {
    refetchSentiment();
    refetchStats();
  };

  const sentiment = sentimentData?.widget;
  const stats = statsData?.stats;

  const alerts = useMemo(() => buildAlerts(sentiment, stats, t), [sentiment, stats, t]);

  return (
    <SectionCard
      id={copy.anchor}
      title={t(copy.titleKey)}
      subtitle={copy.subtitleKey ? t(copy.subtitleKey) : undefined}
      moreContent={
        stats ? (
          <div className="grid gap-2 text-sm text-[hsla(var(--muted-foreground),0.78)]">
            <div className="flex justify-between">
              <span>{t('simple.sections.riskSentiment.more.volatility')}</span>
              <span>{stats.price?.volatility?.toFixed?.(2)}%</span>
            </div>
            <div className="flex justify-between">
              <span>{t('simple.sections.riskSentiment.more.support')}</span>
              <span>{formatNumber(stats.technical?.support)}</span>
            </div>
            <div className="flex justify-between">
              <span>{t('simple.sections.riskSentiment.more.resistance')}</span>
              <span>{formatNumber(stats.technical?.resistance)}</span>
            </div>
          </div>
        ) : null
      }
    >
      {loading && <SectionLoading rows={5} />}
      {!loading && errorRaw && <SectionError message={errorMessage} onRetry={handleRetry} />}
      {!loading && !errorRaw && !sentiment && (
        <SectionEmpty message={t('simple.sections.riskSentiment.empty')} />
      )}

      {!loading && !errorRaw && sentiment && (
        <div className="grid gap-4 md:grid-cols-[1.2fr_1fr]">
          <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
            <div className="flex items-center gap-2">
              <ThermometerSun className="h-5 w-5 text-[var(--simple-text-primary)]" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                  {t('simple.sections.riskSentiment.labels.index')}
                </p>
                <p className="text-2xl font-semibold text-[var(--simple-text-primary)]">
                  {sentiment.index?.display ?? '—'}
                </p>
                <p className="text-xs text-[hsla(var(--muted-foreground),0.65)]">
                  {sentiment.summary ?? t('simple.sections.riskSentiment.labels.noSummary')}
                </p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 text-sm text-[var(--simple-text-primary)]">
              <SentimentComponent
                label={t('simple.sections.riskSentiment.labels.market')}
                value={sentiment.components?.market?.score ?? null}
                labelTone={sentiment.components?.market?.label}
              />
              <SentimentComponent
                label={t('simple.sections.riskSentiment.labels.social')}
                value={sentiment.components?.social?.score ?? null}
                labelTone={sentiment.components?.social?.label}
              />
              <SentimentComponent
                label={t('simple.sections.riskSentiment.labels.development')}
                value={sentiment.components?.development?.score ?? null}
                labelTone={sentiment.components?.development?.label}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-[hsla(var(--border-card),0.25)] bg-[hsla(var(--background),0.6)] p-4">
            <div className="flex items-center gap-2">
              <Gauge className="h-5 w-5 text-[var(--simple-text-primary)]" />
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.7)]">
                {t('simple.sections.riskSentiment.labels.alerts')}
              </p>
            </div>
            {alerts.length ? (
              <ul className="mt-3 space-y-2 text-sm text-[var(--simple-text-primary)]">
                {alerts.map((item, idx) => (
                  <li
                    key={`${item.title}-${idx}`}
                    className="flex items-start gap-3 rounded-xl border border-[hsla(var(--border-card),0.22)] bg-[hsla(var(--background),0.5)] px-3 py-2"
                  >
                    <AlertTriangle
                      className={cn(
                        'h-4 w-4',
                        item.severity === 'high'
                          ? 'text-[var(--simple-neg)]'
                          : 'text-[var(--simple-text-primary)]',
                      )}
                    />
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.12em]">
                        {item.title}
                      </p>
                      <p className="text-sm text-[hsla(var(--muted-foreground),0.7)]">
                        {item.message}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[hsla(var(--muted-foreground),0.65)]">
                {t('simple.sections.riskSentiment.noAlerts')}
              </p>
            )}
          </div>
        </div>
      )}
    </SectionCard>
  );
}

function SentimentComponent({
  label,
  value,
  labelTone,
}: {
  label: string;
  value: number | null;
  labelTone?: string;
}) {
  const tone =
    labelTone === 'Positive'
      ? 'text-[var(--simple-pos)]'
      : labelTone === 'Negative'
        ? 'text-[var(--simple-neg)]'
        : 'text-[hsla(var(--muted-foreground),0.7)]';
  return (
    <div className="flex items-center justify-between rounded-xl border border-[hsla(var(--border-card),0.2)] bg-[hsla(var(--background),0.55)] px-3 py-2">
      <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[hsla(var(--muted-foreground),0.65)]">
        {label}
      </span>
      <span className={cn('text-sm font-semibold', tone)}>
        {value != null ? value.toFixed(1) : '—'}
      </span>
    </div>
  );
}

function buildAlerts(
  sentiment: SentimentWidgetData | undefined,
  stats: StatsResponse['stats'] | undefined,
  t: ReturnType<typeof useTranslations>,
) {
  const items: Array<{ title: string; message: string; severity: 'high' | 'medium' }> = [];

  if (sentiment?.trend?.isExtreme) {
    items.push({
      title: t('simple.sections.riskSentiment.alerts.extreme'),
      message: t('simple.sections.riskSentiment.alerts.extremeMessage', {
        zone: sentiment.current?.zone ?? sentiment.trend?.direction ?? '',
      }),
      severity: 'high',
    });
  }

  const vol = stats?.price?.volatility;
  if (vol && vol > 8) {
    items.push({
      title: t('simple.sections.riskSentiment.alerts.volatility'),
      message: t('simple.sections.riskSentiment.alerts.volatilityMessage', {
        value: vol.toFixed(2),
      }),
      severity: vol > 12 ? 'high' : 'medium',
    });
  }

  const change = stats?.price?.changeFromStartPercent;
  if (change && Math.abs(change) > 5) {
    items.push({
      title: t('simple.sections.riskSentiment.alerts.priceMove'),
      message: t('simple.sections.riskSentiment.alerts.priceMoveMessage', {
        value: change.toFixed(2),
      }),
      severity: 'medium',
    });
  }

  const sentimentChange = sentiment?.changes?.['24h']?.percentage;
  if (sentimentChange && Math.abs(sentimentChange) > 5) {
    items.push({
      title: t('simple.sections.riskSentiment.alerts.sentimentMove'),
      message: t('simple.sections.riskSentiment.alerts.sentimentMoveMessage', {
        value: sentiment.changes['24h'].display,
      }),
      severity: 'medium',
    });
  }

  return items.slice(0, 3);
}

function formatNumber(value: number | undefined) {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value >= 1) return `$${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${value.toFixed(4)}`;
}
