'use client';

import { motion } from 'framer-motion';
import { useEffect, useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import {
  Info,
  Users,
  Gauge,
  AlertCircle,
  TrendingUp,
  Calendar,
  BarChart3,
  Trophy,
} from 'lucide-react';

import type { AccountsWidgetData, BalancesStatsResponse } from '@/lib/api/balances-client';

import { cn } from '@/lib/utils';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { useFontScale } from '../hooks/useFontScale';

interface AnalysisSectionProps {
  stats: BalancesStatsResponse['stats'];
  widget: AccountsWidgetData | null;
  mounted: boolean;
  metric: SeriesKey;
  loading?: boolean;
}

type SeriesKey = 'total' | 'stakers' | 'unstakers';
type MomentumKey = 'accelerating' | 'decelerating' | 'stable' | 'neutral';
type InsightTone = 'positive' | 'negative' | 'neutral';

interface InsightLine {
  text: string;
  tone: InsightTone;
}

type InsightPanelKey = 'summary' | 'growth' | 'signals';

interface InsightPanelConfig {
  key: InsightPanelKey;
  title: string;
  icon: ReactNode;
  lines: InsightLine[];
}

const RING_RADIUS = 36;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function AnalysisSection({
  stats,
  widget,
  mounted,
  metric,
  loading = false,
}: AnalysisSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakersUnstakers.analysis');
  const ts = useTranslations('stakersUnstakers.stats');
  const tt = useTranslations('stakersUnstakers.stats.tooltips');
  const tc = useTranslations('common');

  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false,
  );
  const [activeInsight, setActiveInsight] = useState<InsightPanelKey>('summary');

  useEffect(() => {
    if (!mounted || typeof window === 'undefined') {
      return;
    }
    const detect = () => setIsMobile(window.innerWidth < 768);
    detect();
    window.addEventListener('resize', detect);
    return () => window.removeEventListener('resize', detect);
  }, [mounted]);

  useEffect(() => {
    if (!isMobile && activeInsight !== 'summary') {
      setActiveInsight('summary');
    }
  }, [isMobile, activeInsight]);

  if (!mounted || loading || !stats) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
        <div className="card-base p-4 md:p-6 space-y-4">
          <div className="relative skeleton h-5 w-48 rounded">
            <div className="skeleton-shimmer absolute inset-0" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`summary-skeleton-${idx}`}
                className="space-y-2 rounded-lg bg-secondary/50 p-3"
              >
                <div className="relative skeleton h-3 w-28 rounded">
                  <div className="skeleton-shimmer absolute inset-0" />
                </div>
                <div className="relative skeleton h-4 w-full rounded">
                  <div className="skeleton-shimmer absolute inset-0" />
                </div>
                <div className="relative skeleton h-3 w-24 rounded">
                  <div className="skeleton-shimmer absolute inset-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card-base p-4 md:p-6">
          <div className="relative skeleton h-5 w-56 mb-4 rounded">
            <div className="skeleton-shimmer absolute inset-0" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-6">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div
                key={`metric-skeleton-${idx}`}
                className="p-4 bg-secondary/40 rounded-lg space-y-3 text-center"
              >
                <div className="relative skeleton h-4 w-24 mx-auto rounded">
                  <div className="skeleton-shimmer absolute inset-0" />
                </div>
                <div className="relative skeleton h-16 w-16 md:h-24 md:w-24 mx-auto rounded-full">
                  <div className="skeleton-shimmer absolute inset-0 rounded-full" />
                </div>
                <div className="relative skeleton h-3 w-20 mx-auto rounded">
                  <div className="skeleton-shimmer absolute inset-0" />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, idx) => (
            <div key={`signals-skeleton-${idx}`} className="card-base p-4 md:p-6 space-y-3">
              <div className="relative skeleton h-5 w-40 rounded">
                <div className="skeleton-shimmer absolute inset-0" />
              </div>
              {Array.from({ length: 4 }).map((__, innerIdx) => (
                <div
                  key={`signals-row-${idx}-${innerIdx}`}
                  className="relative skeleton h-3 w-full rounded"
                >
                  <div className="skeleton-shimmer absolute inset-0" />
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="card-base p-4 md:p-6 space-y-3">
          <div className="relative skeleton h-5 w-44 rounded">
            <div className="skeleton-shimmer absolute inset-0" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, idx) => (
              <div
                key={`highlight-skeleton-${idx}`}
                className="space-y-2 rounded-lg bg-secondary/40 p-3"
              >
                <div className="relative skeleton h-3 w-28 rounded">
                  <div className="skeleton-shimmer absolute inset-0" />
                </div>
                <div className="relative skeleton h-4 w-20 rounded">
                  <div className="skeleton-shimmer absolute inset-0" />
                </div>
                <div className="relative skeleton h-4 w-24 rounded">
                  <div className="skeleton-shimmer absolute inset-0" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  const highLabel = tc('high');
  const moderateLabel = tc('moderate');
  const lowLabel = tc('low');

  const totalCurrent = stats.current?.total ?? 0;
  const totalDisplay = stats.current?.totalDisplay ?? formatInt(totalCurrent);
  const stakersCurrent = stats.current?.stakers ?? 0;
  const stakersDisplay = stats.current?.stakersDisplay ?? formatInt(stakersCurrent);
  const unstakersCurrent = stats.current?.unstakers ?? 0;
  const unstakersDisplay = stats.current?.unstakersDisplay ?? formatInt(unstakersCurrent);
  const avgPerAccount =
    typeof stats.current?.avgPerAccount === 'number' &&
    Number.isFinite(stats.current?.avgPerAccount)
      ? stats.current.avgPerAccount
      : null;

  const ratioRaw = stats.current?.ratio ?? null;
  const ratioPercent = normalizePercentage(ratioRaw);
  const ratioDisplay =
    stats.current?.ratioDisplay ?? (ratioPercent !== null ? `${ratioPercent.toFixed(2)}%` : '—');

  const totalAvg = getSeriesAverage(stats, 'total');
  const stakersAvg = getSeriesAverage(stats, 'stakers');
  const unstakersAvg = getSeriesAverage(stats, 'unstakers');

  const change7d = stats.metrics?.changes?.total?.change7d ?? null;
  const change30d = stats.metrics?.changes?.total?.change30d ?? null;

  const volatilityRaw = stats.metrics?.accounts?.stability?.total?.volatility ?? null;
  const volatilityPercent =
    typeof volatilityRaw === 'number' && Number.isFinite(volatilityRaw)
      ? Math.abs(volatilityRaw)
      : null;
  const volatilityCenter = volatilityPercent !== null ? `${volatilityPercent.toFixed(2)}%` : '—';

  const coverageRaw = stats.historical?.completeness ?? null;
  const coveragePercent =
    coverageRaw !== null && Number.isFinite(coverageRaw) ? clamp(coverageRaw, 0, 100) : null;
  const coverageDisplay = coveragePercent !== null ? `${Math.round(coveragePercent)}%` : '—';
  const dataPoints = stats.historical?.dataPoints ?? null;

  const weeklyFlow = stats.growth?.total?.weekly ?? null;
  const weeklyFlowDisplay = stats.growth?.total?.weeklyDisplay ?? formatSignedInt(weeklyFlow);
  const dailyFlow = stats.growth?.total?.daily ?? null;
  const dailyFlowDisplay = stats.growth?.total?.dailyDisplay ?? formatSignedInt(dailyFlow);
  const monthlyFlow = stats.growth?.total?.monthly ?? null;
  const monthlyFlowDisplay = stats.growth?.total?.monthlyDisplay ?? formatSignedInt(monthlyFlow);

  const momentumScore = change7d !== null && change30d !== null ? change7d - change30d / 4 : null;
  const momentumKey: MomentumKey =
    momentumScore !== null
      ? momentumScore > 3
        ? 'accelerating'
        : momentumScore < -3
          ? 'decelerating'
          : 'stable'
      : 'neutral';
  const momentumLabel = ts(`momentumStates.${momentumKey}`);
  const momentumTone = {
    accelerating: 'text-emerald-500',
    decelerating: 'text-red-500',
    stable: 'text-sky-500',
    neutral: 'text-amber-500',
  }[momentumKey];

  const coverageStatus =
    coveragePercent !== null
      ? coveragePercent >= 95
        ? 'high'
        : coveragePercent >= 80
          ? 'moderate'
          : 'low'
      : null;
  const coverageLabel =
    coverageStatus === 'high'
      ? highLabel
      : coverageStatus === 'moderate'
        ? moderateLabel
        : coverageStatus === 'low'
          ? lowLabel
          : null;
  const coverageTone =
    coverageStatus === 'high'
      ? 'text-emerald-500'
      : coverageStatus === 'moderate'
        ? 'text-amber-500'
        : coverageStatus === 'low'
          ? 'text-red-500'
          : 'text-muted-foreground';

  const volatilityDescriptor =
    volatilityPercent !== null
      ? volatilityPercent >= 1.5
        ? highLabel
        : volatilityPercent >= 0.6
          ? moderateLabel
          : lowLabel
      : null;
  const volatilityTone =
    volatilityDescriptor === highLabel
      ? 'text-red-500'
      : volatilityDescriptor === moderateLabel
        ? 'text-amber-500'
        : volatilityDescriptor === lowLabel
          ? 'text-emerald-500'
          : 'text-muted-foreground';

  const summaryLines: InsightLine[] = [];
  summaryLines.push({
    text: t('summaryCurrent', { accounts: formatInt(totalCurrent) }),
    tone: 'neutral',
  });
  if (ratioPercent !== null) {
    const ratioString = formatPct(ratioPercent, 1, false);
    if (ratioPercent >= 75) {
      summaryLines.push({
        text: t('summaryRatio.high', { ratio: ratioString }),
        tone: 'positive',
      });
    } else if (ratioPercent <= 35) {
      summaryLines.push({
        text: t('summaryRatio.low', { ratio: ratioString }),
        tone: 'negative',
      });
    } else {
      summaryLines.push({
        text: t('summaryRatio.balanced', { ratio: ratioString }),
        tone: 'neutral',
      });
    }
  }
  if (avgPerAccount !== null && avgPerAccount > 0) {
    summaryLines.push({
      text: t('summaryAverage', { value: formatNos(avgPerAccount) }),
      tone: 'neutral',
    });
  }
  if (totalAvg) {
    const deltaPct = ((totalCurrent - totalAvg) / totalAvg) * 100;
    summaryLines.push({
      text: t('summaryVsAverage', {
        average: formatInt(totalAvg),
        delta: formatPct(deltaPct, 2),
      }),
      tone: deltaPct >= 0 ? 'positive' : 'negative',
    });
  }
  const stakersDiff = stakersAvg !== null ? stakersCurrent - stakersAvg : null;
  summaryLines.push({
    text: t('summaryStakers', {
      stakers: formatInt(stakersCurrent),
      average: formatInt(stakersAvg),
    }),
    tone: stakersDiff !== null ? (stakersDiff >= 0 ? 'positive' : 'negative') : 'neutral',
  });
  const unstakersDiff = unstakersAvg !== null ? unstakersCurrent - unstakersAvg : null;
  summaryLines.push({
    text: t('summaryUnstakers', {
      unstakers: formatInt(unstakersCurrent),
      average: formatInt(unstakersAvg),
    }),
    tone: unstakersDiff !== null ? (unstakersDiff <= 0 ? 'positive' : 'negative') : 'neutral',
  });

  const growthLines: InsightLine[] = [];
  if (weeklyFlow !== null) {
    growthLines.push({
      text: t('growthWeekly', { value: formatInt(weeklyFlow) }),
      tone: weeklyFlow > 0 ? 'positive' : weeklyFlow < 0 ? 'negative' : 'neutral',
    });
  }
  if (change7d !== null) {
    growthLines.push({
      text: t('growthChange7d', { value: formatPct(change7d, 2) }),
      tone: change7d > 0 ? 'positive' : change7d < 0 ? 'negative' : 'neutral',
    });
  }
  if (change30d !== null) {
    growthLines.push({
      text: t('growthChange30d', { value: formatPct(change30d, 2) }),
      tone: change30d > 0 ? 'positive' : change30d < 0 ? 'negative' : 'neutral',
    });
  }
  const velocity = dailyFlow ?? 0;
  if (velocity > 0) {
    growthLines.push({
      text: t('growthVelocity.positive'),
      tone: 'positive',
    });
  } else if (velocity < 0) {
    growthLines.push({
      text: t('growthVelocity.negative'),
      tone: 'negative',
    });
  } else {
    growthLines.push({
      text: t('growthVelocity.neutral'),
      tone: 'neutral',
    });
  }
  if (momentumScore !== null) {
    const momentumLineTone: InsightTone =
      momentumKey === 'accelerating'
        ? 'positive'
        : momentumKey === 'decelerating'
          ? 'negative'
          : 'neutral';
    growthLines.push({
      text: t(`growthMomentum.${momentumKey}`),
      tone: momentumLineTone,
    });
  }

  const signalLines: InsightLine[] = [];
  if (change7d !== null) {
    signalLines.push({
      text: t('signalSevenDay', { value: formatPct(change7d, 2) }),
      tone: change7d > 0 ? 'positive' : change7d < 0 ? 'negative' : 'neutral',
    });
  } else {
    signalLines.push({
      text: t('signalSevenDayFallback'),
      tone: 'neutral',
    });
  }
  if (volatilityPercent !== null) {
    const volatilityToneInsight: InsightTone =
      volatilityDescriptor === lowLabel
        ? 'positive'
        : volatilityDescriptor === highLabel
          ? 'negative'
          : 'neutral';
    signalLines.push({
      text: t('signalVolatility', { value: volatilityPercent.toFixed(2) }),
      tone: volatilityToneInsight,
    });
  } else {
    signalLines.push({
      text: t('signalVolatilityFallback'),
      tone: 'neutral',
    });
  }
  if (coveragePercent !== null) {
    const coverageToneInsight: InsightTone =
      coverageStatus === 'high' ? 'positive' : coverageStatus === 'low' ? 'negative' : 'neutral';
    signalLines.push({
      text: t('signalCoverage', {
        value: `${Math.round(coveragePercent)}%`,
        status: coverageLabel ?? '—',
      }),
      tone: coverageToneInsight,
    });
  } else {
    signalLines.push({
      text: t('signalCoverageFallback'),
      tone: 'neutral',
    });
  }

  const healthStatus =
    typeof stats.health === 'object' && stats.health !== null && 'status' in stats.health
      ? String((stats.health as Record<string, unknown>).status ?? '')
      : typeof stats.metrics?.health?.status === 'string'
        ? stats.metrics?.health?.status
        : null;
  if (healthStatus && healthStatus.trim().length > 0) {
    const grade =
      typeof stats.health === 'object' && stats.health !== null && 'grade' in stats.health
        ? String((stats.health as Record<string, unknown>).grade ?? '')
        : typeof stats.metrics?.health?.grade === 'string'
          ? stats.metrics?.health?.grade
          : '';
    const qualifier =
      grade && grade.trim().length ? `${healthStatus} (${grade.trim()})` : healthStatus;
    const normalizedGrade = grade.trim().toUpperCase();
    const statusToneSource = healthStatus.trim().toLowerCase();
    let healthTone: InsightTone = 'neutral';
    if (normalizedGrade.startsWith('A') || normalizedGrade.startsWith('B')) {
      healthTone = 'positive';
    } else if (normalizedGrade.startsWith('D') || normalizedGrade.startsWith('F')) {
      healthTone = 'negative';
    } else if (statusToneSource.includes('strong') || statusToneSource.includes('improving')) {
      healthTone = 'positive';
    } else if (
      statusToneSource.includes('weak') ||
      statusToneSource.includes('poor') ||
      statusToneSource.includes('critical')
    ) {
      healthTone = 'negative';
    }
    signalLines.push({
      text: t('signalHealth', { status: qualifier }),
      tone: healthTone,
    });
  } else {
    signalLines.push({
      text: t('signalHealthFallback'),
      tone: 'neutral',
    });
  }

  const recommendations = Array.isArray(stats.recommendations) ? stats.recommendations : [];
  const recommendationLines = recommendations
    .map((rec) => (typeof rec?.title === 'string' ? rec.title.trim() : null))
    .filter((line): line is string => Boolean(line))
    .slice(0, 3);

  const insightPanels: InsightPanelConfig[] = [
    {
      key: 'summary',
      title: t('summaryTitle'),
      icon: <Users className="w-4 h-4 text-primary" />,
      lines: summaryLines,
    },
    {
      key: 'growth',
      title: t('growthTitle'),
      icon: <TrendingUp className="w-4 h-4 text-primary" />,
      lines: growthLines,
    },
    {
      key: 'signals',
      title: t('signalsTitle'),
      icon: <AlertCircle className="w-4 h-4 text-primary" />,
      lines: signalLines,
    },
  ];

  const activeInsightPanel =
    insightPanels.find((panel) => panel.key === activeInsight) ?? insightPanels[0];

  const radialMetrics = [
    {
      key: 'ratio',
      label: ts('currentStakingRatio'),
      tooltip: tt('currentStakingRatio'),
      value: ratioPercent,
      max: 100,
      center: ratioDisplay,
      caption: momentumLabel,
      captionTone: momentumTone,
      stroke: '#6366f1',
    },
    {
      key: 'volatility',
      label: ts('volatilityLabel'),
      tooltip: ts('volatilityHint'),
      value: volatilityPercent,
      max: 100,
      center: volatilityCenter,
      caption: volatilityDescriptor ?? undefined,
      captionTone: volatilityTone,
      stroke:
        volatilityDescriptor === highLabel
          ? '#ef4444'
          : volatilityDescriptor === moderateLabel
            ? '#f97316'
            : '#10b981',
    },
    {
      key: 'coverage',
      label: ts('dataCoverage'),
      tooltip:
        dataPoints !== null ? ts('dataPointsLabel', { value: formatInt(dataPoints) }) : undefined,
      value: coveragePercent,
      max: 100,
      center: coverageDisplay,
      caption: coverageLabel ?? undefined,
      captionTone: coverageTone,
      stroke: '#14b8a6',
    },
  ];

  const flows = [
    {
      key: 'daily',
      label: ts('dailyFlow'),
      value: dailyFlow,
      display: dailyFlowDisplay,
      suffix: ts('perDay'),
    },
    {
      key: 'weekly',
      label: ts('weeklyFlow'),
      value: weeklyFlow,
      display: weeklyFlowDisplay,
      suffix: ts('perWeek'),
    },
    {
      key: 'monthly',
      label: ts('monthlyFlow'),
      value: monthlyFlow,
      display: monthlyFlowDisplay,
      suffix: ts('perMonth'),
    },
  ];
  const flowMax = Math.max(
    ...flows.map((item) => (typeof item.value === 'number' ? Math.abs(item.value) : 0)),
    0,
  );

  const topDay = Array.isArray(stats.events?.highest) ? (stats.events?.highest?.[0] ?? null) : null;
  const lowDay = Array.isArray(stats.events?.lowest) ? (stats.events?.lowest?.[0] ?? null) : null;
  const unusualDays = Array.isArray(stats.events?.unusual) ? stats.events?.unusual.slice(0, 3) : [];
  const athRecord = resolveRecord(widget?.ath, metric);
  const atlRecord = resolveRecord(widget?.atl, metric);
  const hasRangeHighlights = Boolean(topDay || lowDay || unusualDays.length);
  const hasAllTimeRecords = Boolean(athRecord || atlRecord);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="card-base p-4 md:p-6 space-y-5">
        <div className="space-y-1.5">
          <h3 className={text('base', 'lg', 'font-semibold')}>{t('summaryTitle')}</h3>
          {avgPerAccount !== null && avgPerAccount > 0 ? (
            <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
              {t('summaryAverage', { value: formatNos(avgPerAccount) })}
            </p>
          ) : null}
        </div>

        {isMobile ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {insightPanels.map((panel) => {
                const selected = panel.key === activeInsightPanel?.key;
                return (
                  <button
                    key={panel.key}
                    type="button"
                    onClick={() => setActiveInsight(panel.key)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap',
                      selected
                        ? 'border-primary/40 bg-primary/10 text-primary'
                        : 'border-border/40 bg-secondary/40 text-muted-foreground hover:text-foreground',
                    )}
                  >
                    {panel.title}
                  </button>
                );
              })}
            </div>
            {activeInsightPanel ? (
              <InsightPanel
                key={activeInsightPanel.key}
                icon={activeInsightPanel.icon}
                title={activeInsightPanel.title}
                lines={activeInsightPanel.lines}
                text={text}
              />
            ) : null}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {insightPanels.map(({ key, title, icon, lines }) => (
              <InsightPanel key={key} icon={icon} title={title} lines={lines} text={text} />
            ))}
          </div>
        )}
      </div>

      <div className="card-base p-4 md:p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-primary" />
          <h3 className={text('base', 'lg', 'font-semibold')}>{ts('title')}</h3>
          <span
            className={cn(
              'ml-auto rounded-full px-2.5 py-0.5 text-xs font-medium',
              momentumTone,
              'bg-primary/10',
            )}
          >
            {momentumLabel}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-6">
          {radialMetrics.map((metric) => (
            <RadialMetric
              key={metric.key}
              label={metric.label}
              tooltip={metric.tooltip}
              value={metric.value}
              max={metric.max}
              center={metric.center}
              caption={metric.caption}
              captionTone={metric.captionTone}
              stroke={metric.stroke}
              text={text}
            />
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="card-base p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            <h3 className={text('base', 'lg', 'font-semibold')}>{t('growthTitle')}</h3>
          </div>
          <div className="space-y-3">
            {flows.map((flow) => (
              <FlowBar
                key={flow.key}
                label={flow.label}
                display={flow.display}
                suffix={flow.suffix}
                value={typeof flow.value === 'number' ? flow.value : null}
                maxValue={flowMax}
                text={text}
              />
            ))}
          </div>
        </div>

        <div className="card-base p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h3 className={text('base', 'lg', 'font-semibold')}>{t('highlightsTitle')}</h3>
          </div>
          {hasRangeHighlights ? (
            <div className="space-y-4">
              {topDay || lowDay ? (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {topDay ? (
                    <HighlightCard
                      title={t('highestHighlight')}
                      date={formatDate(topDay.date)}
                      value={formatEventMetric(topDay, metric)}
                      text={text}
                    />
                  ) : null}
                  {lowDay ? (
                    <HighlightCard
                      title={t('lowestHighlight')}
                      date={formatDate(lowDay.date)}
                      value={formatEventMetric(lowDay, metric)}
                      text={text}
                    />
                  ) : null}
                </div>
              ) : null}
              {unusualDays.length ? (
                <div className="space-y-2">
                  <p
                    className={cn(
                      text('3xs', '2xs'),
                      'uppercase tracking-wide text-muted-foreground',
                    )}
                  >
                    {ts('unusualDays')}
                  </p>
                  <ul className="space-y-1.5">
                    {unusualDays.map((event, idx) => (
                      <li
                        key={`unusual-inline-${idx}`}
                        className={cn(
                          text('xs', 'sm'),
                          'flex items-center justify-between text-muted-foreground',
                        )}
                      >
                        <span>{formatDate(event.date)}</span>
                        <span className="font-semibold text-primary/90">
                          {formatEventMetric(event, metric)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>{ts('noHighlightData')}</p>
          )}
          {recommendationLines.length ? (
            <div className="space-y-2 pt-3 border-t border-border/40">
              {recommendationLines.map((line, idx) => (
                <div
                  key={`highlight-rec-${idx}`}
                  className="rounded-lg bg-secondary/40 px-3 py-2 text-left shadow-sm shadow-black/5 dark:shadow-none"
                >
                  <p
                    className={cn(
                      text('3xs', '2xs'),
                      'uppercase tracking-wide text-muted-foreground mb-1',
                    )}
                  >
                    {t('signalsTitle')}
                  </p>
                  <p className={cn(text('xs', 'sm'), 'text-muted-foreground leading-snug')}>
                    {line}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {hasAllTimeRecords && (
        <div className="card-base p-4 md:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <h3 className={text('base', 'lg', 'font-semibold')}>{t('recordsTitle')}</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {athRecord ? (
              <HighlightCard
                title={t('allTimeHighHighlight')}
                date={formatDate(athRecord.date)}
                value={athRecord.display}
                text={text}
              />
            ) : null}
            {atlRecord ? (
              <HighlightCard
                title={t('allTimeLowHighlight')}
                date={formatDate(atlRecord.date)}
                value={atlRecord.display}
                text={text}
              />
            ) : null}
          </div>
        </div>
      )}
    </motion.div>
  );
}

interface InsightPanelProps {
  icon: ReactNode;
  title: string;
  lines: InsightLine[];
  text: ReturnType<typeof useFontScale>['text'];
}

function InsightPanel({ icon, title, lines, text }: InsightPanelProps) {
  const toneStyles: Record<InsightTone, { dot: string; container: string; text: string }> = {
    positive: {
      dot: 'bg-emerald-500 ring-emerald-500/25',
      container: 'border-emerald-500/25 bg-emerald-500/5',
      text: 'text-emerald-600 dark:text-emerald-400',
    },
    negative: {
      dot: 'bg-rose-500 ring-rose-500/25',
      container: 'border-rose-500/25 bg-rose-500/5',
      text: 'text-rose-500 dark:text-rose-400',
    },
    neutral: {
      dot: 'bg-muted ring-border/30',
      container: 'border-border/30 bg-background/80',
      text: 'text-muted-foreground',
    },
  };

  return (
    <div className="rounded-xl border border-border/40 bg-secondary/30 p-4 space-y-3 shadow-sm shadow-black/5 dark:shadow-none">
      <div className="flex items-center gap-2">
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
          {icon}
        </span>
        <h4 className={text('sm', 'base', 'font-semibold')}>{title}</h4>
      </div>
      <ul className="space-y-2">
        {lines.length ? (
          lines.map((line, idx) => {
            const tone = line.tone ?? 'neutral';
            const styles = toneStyles[tone];
            return (
              <li
                key={`${title}-${idx}`}
                className={cn(
                  'flex items-start gap-3 rounded-lg px-3 py-2 shadow-inner shadow-black/5 dark:shadow-none border',
                  styles.container,
                )}
              >
                <span className={cn('mt-1 h-2 w-2 flex-none rounded-full ring-4', styles.dot)} />
                <span
                  className={cn(
                    text('xs', 'sm'),
                    styles.text,
                    idx === 0 ? 'font-medium' : 'font-normal',
                    'leading-snug',
                  )}
                >
                  {line.text}
                </span>
              </li>
            );
          })
        ) : (
          <li className="flex items-start gap-3 rounded-lg border border-border/30 bg-background/80 px-3 py-2">
            <span className="mt-1 h-2 w-2 flex-none rounded-full bg-muted ring-4 ring-border/30" />
            <span className={cn(text('xs', 'sm'), 'text-muted-foreground leading-snug')}>—</span>
          </li>
        )}
      </ul>
    </div>
  );
}

interface RadialMetricProps {
  label: string;
  tooltip?: string;
  value: number | null;
  max: number;
  center: string;
  caption?: string;
  captionTone?: string;
  stroke: string;
  text: ReturnType<typeof useFontScale>['text'];
}

function RadialMetric({
  label,
  tooltip,
  value,
  max,
  center,
  caption,
  captionTone,
  stroke,
  text,
}: RadialMetricProps) {
  const safeValue = value !== null && Number.isFinite(value) ? clamp(value, 0, max) : null;
  const dash = safeValue !== null ? (safeValue / max) * RING_CIRCUMFERENCE : 0;

  return (
    <div className="rounded-xl bg-secondary/40 p-4 text-center space-y-3 border border-border/30 shadow-sm shadow-black/5 dark:shadow-none">
      <p
        className={cn(
          text('3xs', '2xs'),
          'text-muted-foreground flex items-center justify-center gap-1',
        )}
      >
        {label}
        {tooltip ? (
          <UiTooltip content={tooltip}>
            <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
          </UiTooltip>
        ) : null}
      </p>
      <div className="relative mx-auto h-20 w-20 md:h-24 md:w-24">
        <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={RING_RADIUS}
            stroke="hsl(var(--border))"
            strokeWidth="8"
            fill="none"
            strokeLinecap="round"
          />
          {safeValue !== null ? (
            <circle
              cx="50"
              cy="50"
              r={RING_RADIUS}
              stroke={stroke}
              strokeWidth="8"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${dash} ${RING_CIRCUMFERENCE}`}
              className="transition-all duration-700"
            />
          ) : null}
        </svg>
        <span
          className={cn(
            'absolute inset-0 flex items-center justify-center',
            text('sm', 'lg', 'font-bold'),
          )}
        >
          {center}
        </span>
      </div>
      {caption ? (
        <p
          className={cn(
            text('3xs', '2xs'),
            captionTone ?? 'text-muted-foreground',
            'leading-tight',
          )}
        >
          {caption}
        </p>
      ) : null}
    </div>
  );
}

interface FlowBarProps {
  label: string;
  display: string;
  suffix: string;
  value: number | null;
  maxValue: number;
  text: ReturnType<typeof useFontScale>['text'];
}

function FlowBar({ label, display, suffix, value, maxValue, text }: FlowBarProps) {
  const safeValue = value ?? 0;
  const width = maxValue > 0 ? Math.min(100, (Math.abs(safeValue) / maxValue) * 100) : 0;
  const tone =
    safeValue === 0 ? 'bg-secondary/60' : safeValue > 0 ? 'bg-emerald-500' : 'bg-red-500';
  const textTone =
    safeValue === 0 ? 'text-muted-foreground' : safeValue > 0 ? 'text-emerald-500' : 'text-red-500';
  const trimmedDisplay = (display ?? '').trim();
  const hasUnitSuffix = trimmedDisplay.length
    ? /\/\s*(day|week|month)/i.test(trimmedDisplay) || /\bper\b/i.test(trimmedDisplay.toLowerCase())
    : false;
  const showSuffix = value !== null && suffix && !hasUnitSuffix;
  const displayText = trimmedDisplay || (value !== null ? formatSignedInt(value) : '—');

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className={cn(text('xs', 'sm'), 'text-muted-foreground')}>{label}</span>
        <span className={cn(text('xs', 'sm', 'font-semibold'), textTone)}>
          {displayText}
          {showSuffix ? ` ${suffix}` : ''}
        </span>
      </div>
      <div className="h-2 rounded-full bg-secondary/30">
        <div
          className={cn('h-full rounded-full transition-all', tone)}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

interface HighlightCardProps {
  title: string;
  date: string;
  value: string;
  text: ReturnType<typeof useFontScale>['text'];
}

function HighlightCard({ title, date, value, text }: HighlightCardProps) {
  return (
    <div className="rounded-xl border border-border/40 bg-secondary/30 p-4 space-y-1.5 shadow-sm shadow-black/5 dark:shadow-none">
      <p className={cn(text('3xs', '2xs'), 'uppercase tracking-wide text-muted-foreground')}>
        {title}
      </p>
      <p className={cn(text('xs', 'sm', 'font-semibold'), 'text-muted-foreground')}>{date}</p>
      <p className={cn(text('sm', 'lg', 'font-bold'), 'text-primary/90')}>{value}</p>
    </div>
  );
}

function formatEventMetric(event: Record<string, unknown> | null, metric: SeriesKey) {
  if (!event) return '—';
  const key = metric === 'total' ? 'total' : metric === 'stakers' ? 'stakers' : 'unstakers';
  const displayKey = `${key}Display`;
  const display = event[displayKey];
  if (typeof display === 'string' && display.trim().length) {
    return display;
  }
  const value = event[key];
  if (typeof value === 'number' && Number.isFinite(value)) {
    return formatInt(value);
  }
  return '—';
}

function normalizePercentage(value?: number | null): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  return value > 1 ? value : value * 100;
}

function formatInt(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return Math.round(value).toLocaleString();
}

function formatNos(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const numeric = Number(value);
  if (Math.abs(numeric) >= 1_000_000_000) return `${(numeric / 1_000_000_000).toFixed(2)}B`;
  if (Math.abs(numeric) >= 1_000_000) return `${(numeric / 1_000_000).toFixed(2)}M`;
  if (Math.abs(numeric) >= 1_000) return `${(numeric / 1_000).toFixed(2)}K`;
  return numeric.toLocaleString(undefined, {
    minimumFractionDigits: numeric < 1 ? 2 : 0,
    maximumFractionDigits: numeric < 1 ? 4 : 2,
  });
}

function formatSignedInt(value?: number | null) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const rounded = Math.round(value);
  const abs = Math.abs(rounded).toLocaleString();
  if (rounded === 0) return '0';
  return `${rounded > 0 ? '+' : '−'}${abs}`;
}

function formatPct(value?: number | null, digits = 2, withSign = true) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '—';
  if (!withSign) {
    return `${numeric.toFixed(digits)}%`;
  }
  const fixed = Math.abs(numeric).toFixed(digits);
  const sign = numeric >= 0 ? '+' : '−';
  return `${sign}${fixed}%`;
}

function formatDate(date?: string) {
  if (!date) return '—';
  try {
    return new Date(date).toLocaleDateString();
  } catch {
    return date;
  }
}

function getSeriesAverage(stats: BalancesStatsResponse['stats'], key: SeriesKey): number | null {
  const historical = stats.historical as Record<string, unknown> | undefined;
  if (!historical || typeof historical !== 'object') return null;
  const series = historical[key];
  if (series && typeof series === 'object') {
    const avg = (series as Record<string, unknown>).avg;
    if (typeof avg === 'number' && Number.isFinite(avg)) return avg;
  }
  return null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

type RecordContainer = AccountsWidgetData['ath'] | AccountsWidgetData['atl'] | undefined;
type RecordMapKey = 'total' | 'staking' | 'unstaking';

function resolveRecord(recordContainer: RecordContainer, metric: SeriesKey) {
  if (!recordContainer || typeof recordContainer !== 'object') return null;
  const keyMap: Record<SeriesKey, RecordMapKey> = {
    total: 'total',
    stakers: 'staking',
    unstakers: 'unstaking',
  };
  const key = keyMap[metric];
  const record = recordContainer.accounts?.[key];
  if (!record) return null;

  const display =
    typeof record.display === 'string' && record.display.trim().length
      ? record.display.trim()
      : formatNos(record.value ?? null);
  const date = typeof record.date === 'string' ? record.date : null;

  return {
    display: display ?? '—',
    date,
  };
}
