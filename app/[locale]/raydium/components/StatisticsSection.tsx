'use client';

import { motion } from 'framer-motion';
import { Activity, TrendingUpDown, AlertCircle, BarChart3, Gauge, Info } from 'lucide-react';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { useFontScale, FONT_SCALE } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { TimeRange } from '@/lib/api/client';

interface StatisticsSectionProps {
  stats: any;
  meta?: any;
  statsRange: TimeRange;
  mounted: boolean;
  metric?: 'liquidity' | 'apr';
  loading?: boolean;
}

export function StatisticsSection({
  stats,
  meta,
  statsRange,
  mounted,
  metric,
  loading = false,
}: StatisticsSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('raydium.stats');
  const tt = useTranslations('raydium.stats.tooltips');
  const I = Info;
  const tc = useTranslations('common');

  const isHydrated = mounted || loading;
  if (!isHydrated) return null;

  if (loading || !stats) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="card-base p-3 md:p-4 text-center">
              <div className="relative skeleton h-6 w-6 md:w-8 md:h-8 mx-auto mb-3 rounded-full">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
              <div className="relative skeleton h-3 w-24 mx-auto rounded mb-2">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
              <div className="relative skeleton h-4 w-20 mx-auto rounded">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={idx} className="card-base p-4 md:p-6 space-y-3">
              <div className="relative skeleton h-5 w-40 rounded">
                <div className="absolute inset-0 skeleton-shimmer" />
              </div>
              {Array.from({ length: 3 }).map((__, innerIdx) => (
                <div key={innerIdx} className="relative skeleton h-4 w-full rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="card-base p-4 md:p-6 space-y-3">
          <div className="relative skeleton h-5 w-48 rounded">
            <div className="absolute inset-0 skeleton-shimmer" />
          </div>
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="relative skeleton h-4 w-full rounded">
              <div className="absolute inset-0 skeleton-shimmer" />
            </div>
          ))}
        </div>
      </motion.div>
    );
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const chartFontSize = isMobile ? 10 * FONT_SCALE.mobile : 12 * FONT_SCALE.desktop;

  if (!stats) return null;

  const fmtUSD = (n?: number) =>
    typeof n === 'number' && isFinite(n) ? `$${Math.round(n).toLocaleString()}` : '—';
  const fmtPct = (n?: number, d = 1) =>
    typeof n === 'number' && isFinite(n) ? `${n.toFixed(d)}%` : '—';
  const shortUSD = (n?: number) => {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    const sign = n < 0 ? '-' : '';
    const v = Math.abs(n);
    if (v >= 1e9) return `${sign}${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${sign}${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${sign}${(v / 1e3).toFixed(1)}K`;
    return `${sign}${v.toFixed(0)}`;
  };

  const expectedDaysMap: Record<string, number> = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '1y': 365,
    all: (stats?.historical?.dataPoints as number) || 1,
  };

  const summary = stats?.summary || {};
  const hist = stats?.historical || {};
  const liq = hist?.liquidity || {};
  const apr = stats?.metrics?.apr || hist?.apr || {};
  const liqMetrics = stats?.metrics?.liquidity || {};
  const volume = stats?.metrics?.volume || undefined;
  const performance = stats?.metrics?.performance || undefined;
  const extended = stats?.metrics?.extended || {};
  const health = stats?.health || {};
  const distribution = stats?.distribution;

  const minL = Number(liq?.min) || 0;
  const maxL = Number(liq?.max) || 0;
  const avgL = Number(liq?.avg) || Number(liqMetrics?.depth?.average) || 0;
  const rangeL = Math.max(maxL - minL, 0);
  const dataPoints = Number(hist?.dataPoints) || 0;
  const expectedDays = expectedDaysMap[statsRange] || dataPoints || 1;
  const coverage = Math.min(Math.max((dataPoints / expectedDays) * 100, 0), 100);
  const volatility = Number(liqMetrics?.stability?.volatility) || 0;
  const coveragePct = Number(extended?.completeness?.coveragePct) || coverage || 0;
  const aprStreak = extended?.streaks?.apr as { direction: string; length: number } | undefined;
  const liqStreak = extended?.streaks?.liquidity as
    | { direction: string; length: number }
    | undefined;
  const maxDDL = Number(extended?.drawdowns?.liquidity) || 0;
  const maxDDA = Number(extended?.drawdowns?.apr) || 0;
  const maxDD = Math.max(maxDDL, maxDDA);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <Activity className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
          <p
            className={cn(
              text('3xs', '2xs'),
              'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
            )}
          >
            {t('averageLiquidity')}
            <UiTooltip content={tt('averageLiquidity')}>
              <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>{fmtUSD(avgL)}</p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {tc(`timeRanges.${statsRange}`)}
          </p>
        </div>

        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <TrendingUpDown className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
          <p
            className={cn(
              text('3xs', '2xs'),
              'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
            )}
          >
            {t('liquidityRange')}
            <UiTooltip content={tt('liquidityRange')}>
              <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>
            {shortUSD(minL)} - {shortUSD(maxL)}
          </p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>{shortUSD(rangeL)}</p>
        </div>

        {apr && (apr.average != null || apr.avg != null) && (
          <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
            <Gauge className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              {t('aprAverage')}
              <UiTooltip content={tt('aprAverage')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <p className={text('base', 'xl', 'font-bold')}>
              {fmtPct(Number(apr?.average) || Number(apr?.avg) || 0, 2)}
            </p>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
              {apr?.range
                ? `${fmtPct(Number(apr.range.min))} - ${fmtPct(Number(apr.range.max))}`
                : tc('na')}
            </p>
          </div>
        )}

        {liqMetrics?.stability?.volatility != null && (
          <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
            <AlertCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-yellow-500" />
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              {t('dailyVolatility')}
              <UiTooltip content={tt('dailyVolatility')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <p className={text('base', 'xl', 'font-bold')}>
              {Number.isFinite(volatility) ? volatility.toFixed(1) : tc('na')}
            </p>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
              {volatility < 10 ? tc('low') : volatility < 20 ? tc('moderate') : tc('high')}
            </p>
          </div>
        )}
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-base p-4 md:p-6">
          <h3
            className={cn(
              text('base', 'lg', 'font-semibold'),
              'mb-3 md:mb-4 flex items-center gap-1',
            )}
          >
            {t('trends')}
            <UiTooltip content={tt('trends')}>
              <Info className="w-4 h-4 text-muted-foreground/80" />
            </UiTooltip>
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <p
                className={cn(
                  text('3xs', '2xs'),
                  'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                )}
              >
                {t('aprTrend')}
                <UiTooltip content={tt('aprTrend')}>
                  <I className="w-3 h-3 text-muted-foreground/80" />
                </UiTooltip>
              </p>
              <p className={text('xs', 'base', 'font-bold')}>{(apr?.trend as string) || '-'}</p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <p
                className={cn(
                  text('3xs', '2xs'),
                  'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                )}
              >
                {t('healthGrade')}
                <UiTooltip content={tt('healthGrade')}>
                  <I className="w-3 h-3 text-muted-foreground/80" />
                </UiTooltip>
              </p>
              <p className={text('xs', 'base', 'font-bold')}>{health?.grade || '-'}</p>
            </div>
          </div>
        </div>
        {(summary || apr || liqMetrics) && (
          <div className="card-base p-4 md:p-6">
            <h3
              className={cn(
                text('base', 'lg', 'font-semibold'),
                'mb-3 md:mb-4 flex items-center gap-1',
              )}
            >
              {t('keyMetrics')}
              <UiTooltip content={tt('keyMetrics')}>
                <Info className="w-4 h-4 text-muted-foreground/80" />
              </UiTooltip>
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {apr?.percentiles && (
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <p
                    className={cn(
                      text('3xs', '2xs'),
                      'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                    )}
                  >
                    {t('aprP50')}
                    <UiTooltip content={tt('aprP50')}>
                      <I className="w-3 h-3 text-muted-foreground/80" />
                    </UiTooltip>
                  </p>
                  <p className={text('xs', 'base', 'font-bold')}>
                    {fmtPct(Number(apr.percentiles.p50), 2)}
                  </p>
                </div>
              )}
              {apr?.percentiles && (
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <p
                    className={cn(
                      text('3xs', '2xs'),
                      'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                    )}
                  >
                    {t('aprP75')}
                    <UiTooltip content={tt('aprP75')}>
                      <I className="w-3 h-3 text-muted-foreground/80" />
                    </UiTooltip>
                  </p>
                  <p className={text('xs', 'base', 'font-bold')}>
                    {fmtPct(Number(apr.percentiles.p75), 2)}
                  </p>
                </div>
              )}
              {apr?.percentiles && (
                <div className="text-center p-3 bg-secondary/50 rounded-lg">
                  <p
                    className={cn(
                      text('3xs', '2xs'),
                      'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                    )}
                  >
                    {t('aprP90')}
                    <UiTooltip content={tt('aprP90')}>
                      <I className="w-3 h-3 text-muted-foreground/80" />
                    </UiTooltip>
                  </p>
                  <p className={text('xs', 'base', 'font-bold')}>
                    {fmtPct(Number(apr.percentiles.p90), 2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Completeness & Streaks */}
      {extended && (
        <div className="card-base p-4 md:p-6">
          <h3
            className={cn(
              text('base', 'lg', 'font-semibold'),
              'mb-3 md:mb-4 flex items-center gap-1',
            )}
          >
            {t('completeness')}
            <UiTooltip content={tt('completeness')}>
              <Info className="w-4 h-4 text-muted-foreground/80" />
            </UiTooltip>
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p
                className={cn(
                  text('3xs', '2xs'),
                  'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                )}
              >
                {t('coverage')}
                <UiTooltip content={tt('coverage')}>
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </UiTooltip>
              </p>
              <p className={text('xs', 'base', 'font-bold')}>{fmtPct(coveragePct, 1)}</p>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p
                className={cn(
                  text('3xs', '2xs'),
                  'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                )}
              >
                {t('aprStreak')}
                <UiTooltip content={tt('aprStreak')}>
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </UiTooltip>
              </p>
              <p className={text('xs', 'base', 'font-bold')}>
                {aprStreak ? `${aprStreak.direction} x${aprStreak.length}` : '—'}
              </p>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p
                className={cn(
                  text('3xs', '2xs'),
                  'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                )}
              >
                {t('liquidityStreak')}
                <UiTooltip content={tt('liquidityStreak')}>
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </UiTooltip>
              </p>
              <p className={text('xs', 'base', 'font-bold')}>
                {liqStreak ? `${liqStreak.direction} x${liqStreak.length}` : '—'}
              </p>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p
                className={cn(
                  text('3xs', '2xs'),
                  'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                )}
              >
                {t('maxDrawdown')}
                <UiTooltip content={tt('maxDrawdown')}>
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </UiTooltip>
              </p>
              <p className={text('xs', 'base', 'font-bold')}>{fmtPct(maxDD, 1)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Distribution (only if API provides meaningful data) */}
      {distribution &&
        (Array.isArray(distribution.brackets)
          ? distribution.brackets.length > 0
          : false || !!distribution.concentration) && (
          <div className="card-base p-4 md:p-6">
            <h3
              className={cn(
                text('base', 'lg', 'font-semibold'),
                'mb-4 md:mb-6 flex items-center gap-2',
              )}
            >
              <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
              {t('liquidityDistribution')}
              <UiTooltip content={tt('distribution')}>
                <Info className="w-4 h-4 text-muted-foreground/80" />
              </UiTooltip>
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
                <p
                  className={cn(
                    text('3xs', '2xs'),
                    'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                  )}
                >
                  {t('gini')}
                  <UiTooltip content={tt('gini')}>
                    <Info className="w-3 h-3 text-muted-foreground/80" />
                  </UiTooltip>
                </p>
                {distribution?.concentration && (
                  <p className={text('xs', 'base', 'font-bold')}>
                    {distribution?.concentration?.gini == null
                      ? tc('na')
                      : fmtPct(Number(distribution.concentration.gini) * 100, 1)}
                  </p>
                )}
              </div>
              <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
                <p
                  className={cn(
                    text('3xs', '2xs'),
                    'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                  )}
                >
                  {t('top20Concentration')}
                  <UiTooltip content={tt('top20Concentration')}>
                    <Info className="w-3 h-3 text-muted-foreground/80" />
                  </UiTooltip>
                </p>
                {distribution?.concentration && (
                  <p className={text('xs', 'base', 'font-bold')}>
                    {distribution?.concentration?.top20Percent == null
                      ? tc('na')
                      : fmtPct(Number(distribution.concentration.top20Percent), 1)}
                  </p>
                )}
              </div>
              <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
                <p
                  className={cn(
                    text('3xs', '2xs'),
                    'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
                  )}
                >
                  {t('concentration')}
                  <UiTooltip content={tt('concentration')}>
                    <Info className="w-3 h-3 text-muted-foreground/80" />
                  </UiTooltip>
                </p>
                {distribution?.concentration && (
                  <p className={text('xs', 'base', 'font-bold')}>
                    {distribution?.concentration?.distribution === 'Not Applicable'
                      ? tc('na')
                      : distribution?.concentration?.distribution || '-'}
                  </p>
                )}
              </div>
              <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg col-span-2 md:col-span-2">
                <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
                  {t('dataPoints')}
                </p>
                <p className={text('xs', 'base', 'font-bold')}>
                  {dataPoints} {tc('dataPoints')}
                </p>
              </div>
            </div>
          </div>
        )}
    </motion.div>
  );
}
