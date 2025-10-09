'use client';

import { motion } from 'framer-motion';
import { Activity, TrendingUpDown, AlertCircle, BarChart3, Calendar, Info } from 'lucide-react';
import { Tooltip as UiTooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils';
import { useFontScale, FONT_SCALE } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import type { TimeRange } from '@/lib/api/client';
import { useLocale } from 'next-intl';
import { format } from 'date-fns';
import { getDateLocale } from '@/lib/utils';
import { useMemo } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

interface StatisticsSectionProps {
  stats: any;
  statsRange: TimeRange;
  mounted: boolean;
}

export function StatisticsSection({ stats, statsRange, mounted }: StatisticsSectionProps) {
  const { text } = useFontScale();
  const t = useTranslations('holders.stats');
  const tt = useTranslations('holders.stats.tooltips');
  const tc = useTranslations('common');

  const locale = useLocale();
  const dfnsLocale = getDateLocale(locale);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  if (!mounted || !stats) return null;

  const chartFontSize = isMobile ? 10 * FONT_SCALE.mobile : 12 * FONT_SCALE.desktop;
  const smallChartFontSize = isMobile ? 8 * FONT_SCALE.mobile : 10 * FONT_SCALE.desktop;

  const formatHolders = (value: number) => {
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`;
    if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
    if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
    return value.toFixed(0);
  };

  const expectedDaysMap: Record<string, number> = {
    '24h': 1,
    '7d': 7,
    '30d': 30,
    '90d': 90,
    '180d': 180,
    '1y': 365,
  };

  const minVal = Number(stats?.historical?.min) || 0;
  const maxVal = Number(stats?.historical?.max) || 0;
  const rangeVal = Math.max(maxVal - minVal, 0);

  const dataPoints = Number(stats?.historical?.dataPoints) || 0;
  const expectedDays = expectedDaysMap[stats?.historical?.period ?? statsRange] || dataPoints || 1;
  const coverage = Math.min(Math.max((dataPoints / expectedDays) * 100, 0), 100);

  const volatility =
    typeof stats?.trends?.volatility === 'string' || typeof stats?.trends?.volatility === 'number'
      ? parseFloat(stats.trends.volatility as any)
      : 0;

  const DAY_INDEX: Record<string, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
  };
  const localizedDayOfWeek = useMemo(() => {
    const dayOfWeek = stats?.patterns?.dayOfWeek ?? [];
    return dayOfWeek.map(({ day, avgHolders }: any) => {
      const idx = DAY_INDEX[day] ?? 0;
      const base = new Date(1970, 0, 4);
      const date = new Date(base.getTime() + idx * 864e5);
      return {
        day: format(date, 'EEEE', { locale: dfnsLocale }),
        avgHolders,
      };
    });
  }, [stats?.patterns?.dayOfWeek, dfnsLocale]);

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
            {t('averageHolders')}
            <UiTooltip content={tt('averageHolders')}>
              <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>{stats.historical.averageDisplay}</p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {tc(`timeRanges.${stats?.historical?.period ?? statsRange}`)}
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
            {t('holdersRange')}
            <UiTooltip content={tt('holdersRange')}>
              <Info className="w-3.5 h-3.5 text-muted-foreground/80" />
            </UiTooltip>
          </p>
          <p className={text('base', 'xl', 'font-bold')}>
            {formatHolders(minVal)} - {formatHolders(maxVal)}
          </p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {formatHolders(rangeVal)}
          </p>
        </div>

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
            {Number.isFinite(volatility) ? volatility.toFixed(1) : '0'}%
          </p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {volatility < 20 ? tc('low') : volatility < 50 ? tc('moderate') : tc('high')}
          </p>
        </div>

        <div className="card-base p-3 md:p-4 text-center hover:shadow-lg transition-all">
          <BarChart3 className="w-6 h-6 md:w-8 md:h-8 mx-auto mb-2 text-primary" />
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
            {t('dataCoverage')}
          </p>
          <p className={text('base', 'xl', 'font-bold')}>{coverage.toFixed(0)}%</p>
          <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mt-1')}>
            {dataPoints} {tc('dataPoints')}
          </p>
        </div>
      </div>

      {/* Additional Insights */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="card-base p-4 md:p-6">
          <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-3 md:mb-4')}>{t('trends')}</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>Consistency</p>
              <p className={text('xs', 'base', 'font-bold')}>
                {(Number(stats?.trends?.consistency) || 0).toFixed(1)}%
              </p>
            </div>
            <div className="p-3 bg-secondary/50 rounded-lg text-center">
              <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>Phase</p>
              <p className={text('xs', 'base', 'font-bold')}>{stats?.trends?.growthPhase || '-'}</p>
            </div>
          </div>
        </div>
        <div className="card-base p-4 md:p-6">
          <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-3 md:mb-4')}>
            {t('keyMetrics')}
          </h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>Daily Growth</p>
              <p className={text('xs', 'base', 'font-bold')}>
                {(Number(stats?.growth?.daily?.average) || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>
                Weekly Growth
              </p>
              <p className={text('xs', 'base', 'font-bold')}>
                {(Number(stats?.growth?.weekly?.average) || 0).toLocaleString()}
              </p>
            </div>
            <div className="text-center p-3 bg-secondary/50 rounded-lg">
              <p className={cn(text('3xs', '2xs'), 'text-muted-foreground mb-0.5')}>Acceleration</p>
              <p className={text('xs', 'base', 'font-bold')}>
                {stats?.growth?.acceleration || '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Holders Distribution (use API distribution metrics) */}
      <div className="card-base p-4 md:p-6">
        <h3
          className={cn(
            text('base', 'lg', 'font-semibold'),
            'mb-4 md:mb-6 flex items-center gap-2',
          )}
        >
          <BarChart3 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
          {t('holdersDistribution')}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              Gini
              <UiTooltip content={tt('gini')}>
                <span className="inline-flex">
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </span>
              </UiTooltip>
            </p>
            <p className={text('xs', 'base', 'font-bold')}>
              {((Number(stats?.distribution?.giniCoefficient) || 0) * 100).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              HHI
              <UiTooltip content={tt('hhi')}>
                <span className="inline-flex">
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </span>
              </UiTooltip>
            </p>
            <p className={text('xs', 'base', 'font-bold')}>
              {(Number(stats?.distribution?.herfindahlIndex) || 0).toFixed(0)}
            </p>
          </div>
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              CR10
              <UiTooltip content={tt('cr10')}>
                <span className="inline-flex">
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </span>
              </UiTooltip>
            </p>
            <p className={text('xs', 'base', 'font-bold')}>
              {(Number(stats?.distribution?.concentrationRatio) || 0).toFixed(1)}%
            </p>
          </div>
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              Diversity
              <UiTooltip content={tt('diversity')}>
                <span className="inline-flex">
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </span>
              </UiTooltip>
            </p>
            <p className={text('xs', 'base', 'font-bold')}>
              {(Number(stats?.distribution?.diversityScore) || 0).toFixed(2)}
            </p>
          </div>
          <div className="text-center p-3 md:p-4 bg-secondary/50 rounded-lg">
            <p
              className={cn(
                text('3xs', '2xs'),
                'text-muted-foreground mb-0.5 flex items-center justify-center gap-1',
              )}
            >
              Health
              <UiTooltip content={tt('health')}>
                <span className="inline-flex">
                  <Info className="w-3 h-3 text-muted-foreground/80" />
                </span>
              </UiTooltip>
            </p>
            <p className={text('xs', 'base', 'font-bold')}>
              {(Number(stats?.distribution?.health) || 0).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Patterns (these keys may not be available; render only when present) */}
      {stats.patterns && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {stats.patterns.dayOfWeek && stats.patterns.dayOfWeek.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3
                className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 flex items-center gap-2')}
              >
                <Calendar className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                {t('dayOfWeekPattern')}
              </h3>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={localizedDayOfWeek}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="day"
                      fontSize={chartFontSize}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis
                      tickFormatter={(value) => formatHolders(value)}
                      fontSize={smallChartFontSize}
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <Tooltip
                      formatter={(value: number) => [formatHolders(value), t('avgHolders')]}
                      labelStyle={{ color: 'hsl(var(--foreground))' }}
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Bar dataKey="avgHolders" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {stats.patterns.monthly && stats.patterns.monthly.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3
                className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 flex items-center gap-2')}
              >
                <TrendingUpDown className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                {t('monthlyHolders')}
              </h3>
              <div className="space-y-3 max-h-[250px] overflow-y-auto scrollbar-thin">
                {stats.patterns.monthly.map((month: any) => (
                  <div
                    key={month.month}
                    className="flex items-center justify-between p-2 hover:bg-secondary/50 rounded-lg transition-colors"
                  >
                    <div>
                      <p className={text('xs', 'sm', 'font-medium')}>{month.month}</p>
                      <p className={cn(text('3xs', '2xs'), 'text-muted-foreground')}>
                        {t('dailyAvg')}: {month.avgHoldersDisplay}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={text('xs', 'sm', 'font-bold')}>{month.totalHoldersDisplay}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Events - render only if API provides them */}
      {stats.events && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {stats.events.highest && stats.events.highest.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 text-green-500')}>
                {t('highestHoldersDays')}
              </h3>
              <div className="space-y-2">
                {stats.events.highest.slice(0, 5).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                    <p className={text('xs', 'sm', 'font-bold')}>{event.holdersDisplay}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.events.lowest && stats.events.lowest.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 text-red-500')}>
                {t('lowestHoldersDays')}
              </h3>
              <div className="space-y-2">
                {stats.events.lowest.slice(0, 5).map((event: any, index: number) => (
                  <div key={index} className="flex items-center justify-between">
                    <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                      {new Date(event.date).toLocaleDateString()}
                    </p>
                    <p className={text('xs', 'sm', 'font-bold')}>{event.holdersDisplay}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.events.unusual && stats.events.unusual.length > 0 && (
            <div className="card-base p-4 md:p-6">
              <h3 className={cn(text('base', 'lg', 'font-semibold'), 'mb-4 text-yellow-500')}>
                {t('unusualHoldersDays')}
              </h3>
              <div className="space-y-2">
                {stats.events.unusual.slice(0, 5).map((event: any, index: number) => (
                  <div key={index} className="space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={cn(text('xs', 'sm'), 'text-muted-foreground')}>
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                      <p className={text('xs', 'sm', 'font-bold')}>{event.holdersDisplay}</p>
                    </div>
                    <p className={cn(text('3xs', '2xs'), 'text-yellow-500')}>
                      {event.deviations} {t('stdDeviations')}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
