'use client';

import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, TrendingUpDown, AlertCircle, BarChart3, Gauge, Info } from 'lucide-react';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { useFontScale, FONT_SCALE } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import type { TimeRange } from '@/lib/api/client';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { normalizeStakingDappStats } from '../utils/normalizeStakingData';

interface StatisticsSectionProps {
  stats: any;
  meta?: any;
  statsRange: TimeRange;
  mounted: boolean;
  metric?: 'xnos' | 'apr';
  loading?: boolean;
}

export function StatisticsSection({
  stats,
  meta,
  statsRange,
  mounted,
  metric = 'xnos',
  loading = false,
}: StatisticsSectionProps) {
  const { text } = useFontScale();
  const tCommon = useTranslations('common');
  const tStats = useTranslations('stakingDapp.stats');
  const tTooltips = useTranslations('stakingDapp.stats.tooltips');
  const isHydrated = mounted || loading;
  const normalizedStats = useMemo(() => normalizeStakingDappStats(stats), [stats]);
  const data = normalizedStats ?? stats;

  if (!isHydrated) return null;

  if (loading || !data) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="card-base p-3 md:p-4 space-y-3 text-center">
              <SkeletonBlock className="h-6 w-6 mx-auto rounded-full" />
              <SkeletonBlock className="h-3 w-28 mx-auto rounded-lg" />
              <SkeletonBlock className="h-5 w-20 mx-auto rounded-lg" />
              <SkeletonBlock className="h-3 w-16 mx-auto rounded-lg" />
            </div>
          ))}
        </div>

        <div className="card-base p-4 md:p-6 space-y-4">
          <SkeletonBlock className="h-5 w-48 rounded-lg" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="space-y-2 text-center">
                <SkeletonBlock className="h-3 w-24 mx-auto rounded-lg" />
                <SkeletonBlock className="h-4 w-20 mx-auto rounded-lg" />
              </div>
            ))}
          </div>
          <SkeletonBlock className="h-40 w-full rounded-xl" />
        </div>
      </motion.div>
    );
  }

  if (!data) return null;

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const chartFontSize = isMobile ? 10 * FONT_SCALE.mobile : 12 * FONT_SCALE.desktop;

  const fmtNumber = (value: unknown) => {
    const numeric = coerceNumber(value);
    if (numeric === null) return '\u2014';
    return Math.round(numeric).toLocaleString();
  };
  const fmtPct = (value: unknown, d = 1) => {
    const numeric = coerceNumber(value);
    if (numeric === null) return '\u2014';
    return `${numeric.toFixed(d)}%`;
  };
  const shortNum = (value: unknown) => {
    const numeric = coerceNumber(value);
    if (numeric === null) return '\u2014';
    const sign = numeric < 0 ? '-' : '';
    const v = Math.abs(numeric);
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
    all: coerceNumber(data?.historical?.dataPoints) ?? 1,
  };

  const hist = data?.historical || {};
  const x = hist?.xnos || {};
  const apr = data?.metrics?.apr || hist?.apr || {};
  const xMetrics = data?.metrics?.xnos || {};
  const extended = data?.metrics?.extended || {};
  const distribution = data?.distribution;

  const minX = coerceNumber(x?.min) ?? 0;
  const maxX = coerceNumber(x?.max) ?? 0;
  const avgX = coerceNumber(x?.avg) ?? coerceNumber(xMetrics?.depth?.average) ?? 0;
  const rangeX = Math.max(maxX - minX, 0);
  const dataPoints = coerceNumber(hist?.dataPoints) ?? 0;
  const expectedDays = expectedDaysMap[statsRange] || dataPoints || 1;
  const coverage = expectedDays
    ? Math.min(Math.max((dataPoints / expectedDays) * 100, 0), 100)
    : 0;
  const volatilityValue = coerceNumber(xMetrics?.stability?.volatility);
  const volatility = volatilityValue ?? 0;
  const coveragePctRaw = coerceNumber(extended?.completeness?.coveragePct);
  const coveragePct =
    coveragePctRaw == null
      ? coverage
      : coveragePctRaw > 1
        ? coveragePctRaw
        : coveragePctRaw * 100;
  const aprStreak = extended?.streaks?.apr as { direction: string; length: number } | undefined;
  const xStreak = extended?.streaks?.xnos as { direction: string; length: number } | undefined;
  const maxDDX = coerceNumber(extended?.drawdowns?.xnos) ?? 0;
  const maxDDA = coerceNumber(extended?.drawdowns?.apr) ?? 0;
  const maxDD = Math.max(maxDDX, maxDDA);
  const aprRecord = (apr ?? {}) as Record<string, unknown>;
  const aprRangeRecord = (aprRecord.range ?? {}) as Record<string, unknown>;
  const aprAverageValue = coerceNumber(aprRecord.average ?? aprRecord.avg);
  const aprRangeMin = coerceNumber(aprRangeRecord.min);
  const aprRangeMax = coerceNumber(aprRangeRecord.max);
  const concentrationRecord = (distribution?.concentration ?? {}) as Record<string, unknown>;
  const giniValue = coerceNumber(concentrationRecord.gini);
  const top20Value = coerceNumber(concentrationRecord.top20Percent);

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
            {tStats('averageXnos')}
            <UiTooltip content={tTooltips('averageXnos')}>
              <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>{fmtNumber(avgX)}</p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {tCommon(`timeRanges.${statsRange}`)}
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
            {tStats('xnosRange')}
            <UiTooltip content={tTooltips('xnosRange')}>
              <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>
            {shortNum(minX)} - {shortNum(maxX)}
          </p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>{shortNum(rangeX)}</p>
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
              {tStats('aprAverage')}
              <UiTooltip content={tTooltips('aprAverage')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <p className={text('base', 'xl', 'font-bold')}>
              {fmtPct(aprAverageValue, 2)}
            </p>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
              {apr?.range && (aprRangeMin !== null || aprRangeMax !== null)
                ? `${fmtPct(aprRangeMin)} - ${fmtPct(aprRangeMax)}`
                : tCommon('na')}
            </p>
          </div>
        )}

        {xMetrics?.stability?.volatility != null && (
          <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
            <AlertCircle className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-yellow-500" />
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              Daily Volatility
              <UiTooltip content={tTooltips('dailyVolatility')}>
                <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <p className={text('base', 'xl', 'font-bold')}>
              {volatilityValue != null ? volatilityValue.toFixed(1) : tCommon('na')}
            </p>
            <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
              {volatilityValue == null
                ? tCommon('na')
                : volatilityValue < 10
                  ? tCommon('low')
                  : volatilityValue < 20
                    ? tCommon('moderate')
                    : tCommon('high')}
            </p>
          </div>
        )}
      </div>

      {/* Completeness & Streaks */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-3 md:mb-4 flex items-center gap-1',
          )}
        >
          {tStats('keyMetrics')}
          <UiTooltip content={tTooltips('keyMetrics')}>
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
              {tStats('coverage')}
              <UiTooltip content={tTooltips('coverage')}>
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
              {tStats('aprStreak')}
              <UiTooltip content={tTooltips('streaks')}>
                <Info className="w-3 h-3 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <p className={text('xs', 'base', 'font-bold')}>
              {aprStreak ? `${aprStreak.direction} x${aprStreak.length}` : '\u2014'}
            </p>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              {tStats('xnosStreak')}
              <UiTooltip content={tTooltips('streaks')}>
                <Info className="w-3 h-3 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <p className={text('xs', 'base', 'font-bold')}>
              {xStreak ? `${xStreak.direction} x${xStreak.length}` : '\u2014'}
            </p>
          </div>
          <div className="text-center p-3 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              {tStats('maxDrawdown')}
              <UiTooltip content={tTooltips('maxDrawdown')}>
                <Info className="w-3 h-3 text-muted-foreground/80" />
              </UiTooltip>
            </p>
            <p className={text('xs', 'base', 'font-bold')}>{fmtPct(maxDD, 1)}</p>
          </div>
        </div>
      </div>

      {/* Optional: Distribution summary (if present) */}
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
              xNOS Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
              <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
                <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>Gini</p>
                {distribution?.concentration && (
                  <p className={text('xs', 'base', 'font-bold')}>
                    {giniValue == null ? tCommon('na') : fmtPct(giniValue * 100, 1)}
                  </p>
                )}
              </div>
              <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
                <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
                  Top 20% Concentration
                </p>
                {distribution?.concentration && (
                  <p className={text('xs', 'base', 'font-bold')}>
                    {top20Value == null ? tCommon('na') : fmtPct(top20Value, 1)}
                  </p>
                )}
              </div>
              <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
                <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
                  Concentration
                </p>
                {distribution?.concentration && (
                  <p className={text('xs', 'base', 'font-bold')}>
                  {distribution?.concentration?.distribution === 'Not Applicable'
                      ? tCommon('na')
                      : distribution?.concentration?.distribution || '-'}
                  </p>
                )}
              </div>
              <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg col-span-2 md:col-span-2">
                <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
                  {tCommon('dataPoints')}
                </p>
                <p className={text('xs', 'base', 'font-bold')}>
                  {dataPoints} {tCommon('dataPoints')}
                </p>
              </div>
            </div>
          </div>
        )}
    </motion.div>
  );
}

function coerceNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parenMatch = trimmed.match(/^\((-?\d[\d,]*(?:\.\d+)?)\)$/);
    const target = parenMatch ? `-${parenMatch[1]}` : trimmed;
    const match = target.match(/-?\d[\d,]*(?:\.\d+)?/);
    if (!match) return null;
    const normalized = match[0].replace(/,/g, '');
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  if (value && typeof value === 'object' && 'value' in (value as Record<string, unknown>)) {
    return coerceNumber((value as Record<string, unknown>).value);
  }
  return null;
}
