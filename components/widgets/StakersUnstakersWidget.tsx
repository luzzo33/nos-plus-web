'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, UserCheck, UserMinus, TrendingUp, TrendingDown, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';

import { WidgetContainer } from './WidgetLayout';
import { apiClient } from '@/lib/api/client';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import type { AccountsWidgetData } from '@/lib/api/balances-client';

type WidgetTimeRange = '24h' | '7d' | '30d' | '90d' | '180d' | '1y';
type AccountsSide = 'staking' | 'unstaking';

type SideConfig = {
  key: AccountsSide;
  labelKey: 'stakers' | 'unstakers';
  Icon: typeof UserCheck;
  gradient: string;
  knobClass: string;
};

const TIMEFRAME_ORDER: WidgetTimeRange[] = ['24h', '7d', '30d', '90d', '180d', '1y'];

const SIDES: SideConfig[] = [
  {
    key: 'staking',
    labelKey: 'stakers',
    Icon: UserCheck,
    gradient: 'from-emerald-500 to-cyan-500',
    knobClass: 'bg-emerald-500',
  },
  {
    key: 'unstaking',
    labelKey: 'unstakers',
    Icon: UserMinus,
    gradient: 'from-orange-500 to-rose-500',
    knobClass: 'bg-orange-500',
  },
];

export function StakersUnstakersWidget({ isMobile = false }: { isMobile?: boolean }) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const [selectedTimeframe, setSelectedTimeframe] = useState<WidgetTimeRange>('24h');
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const { data, isLoading, error, refetch, isFetching } = useQuery<{
    success: boolean;
    widget: AccountsWidgetData;
  }>({
    queryKey: ['widget-stakers-unstakers'],
    queryFn: () => apiClient.getStakersUnstakersWidget(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const widget = data?.widget;

  const availableTimeframes = (() => {
    const present = new Set<WidgetTimeRange>();
    const consider = (record?: Record<string, any>) => {
      if (!record) return;
      for (const key of Object.keys(record)) {
        if (TIMEFRAME_ORDER.includes(key as WidgetTimeRange)) {
          present.add(key as WidgetTimeRange);
        }
      }
    };

    consider(widget?.changes);
    consider(widget?.ranges);

    const ordered = TIMEFRAME_ORDER.filter((tf) => present.has(tf));
    return ordered.length ? ordered : TIMEFRAME_ORDER;
  })();

  useEffect(() => {
    if (!availableTimeframes.length) return;
    if (!availableTimeframes.includes(selectedTimeframe)) {
      setSelectedTimeframe(availableTimeframes[0]);
    }
  }, [availableTimeframes, selectedTimeframe]);

  const lastUpdated = widget?.accounts?.total?.lastUpdate ?? widget?.current?.lastUpdate;
  const lastUpdatedLabel = useFormattedTimestamp(lastUpdated, {
    absoluteFormat: 'HH:mm',
    fallbackRelative: '—',
  });

  const timeframeOptions = availableTimeframes.map((tf) => ({
    value: tf,
    label: tc(`timeRanges.${tf}`),
  }));

  const summaryGridClass = cn(
    'grid gap-3',
    isMobile ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2',
  );

  const sideMetrics = SIDES.map((side) => {
    const sideKey = side.key;
    const change = widget?.changes?.[selectedTimeframe]?.accounts?.[sideKey];
    const range = widget?.ranges?.[selectedTimeframe]?.accounts?.[sideKey];

    const currentCount = (() => {
      const fromAccounts = widget?.accounts?.[sideKey]?.count;
      if (typeof fromAccounts === 'number') return fromAccounts;
      const current = widget?.current?.accounts?.[sideKey];
      return typeof current === 'number' ? current : undefined;
    })();

    const valueDisplay =
      widget?.accounts?.[sideKey]?.display ??
      (currentCount != null ? formatCount(currentCount) : '-');

    const changeMagnitude =
      typeof change?.percentage === 'number'
        ? change.percentage
        : typeof change?.absolute === 'number'
          ? change.absolute
          : null;

    const changeLabel =
      change?.display ??
      (() => {
        if (typeof change?.percentage === 'number') {
          const percent = change.percentage;
          const decimals = Math.abs(percent) >= 10 ? 1 : 2;
          return `${percent >= 0 ? '+' : ''}${percent.toFixed(decimals)}%`;
        }
        if (typeof change?.absolute === 'number') {
          const absChange = change.absolute;
          return `${absChange >= 0 ? '+' : ''}${formatCount(absChange)}`;
        }
        return null;
      })();

    const progress = computeProgress(currentCount, range?.low, range?.high);
    const lowLabel = range?.lowDisplay ?? (range?.low != null ? formatCount(range.low) : tc('na'));
    const highLabel =
      range?.highDisplay ?? (range?.high != null ? formatCount(range.high) : tc('na'));

    return {
      side,
      currentCount,
      valueDisplay,
      changeMagnitude,
      changeLabel,
      range,
      progress,
      lowLabel,
      highLabel,
    };
  });

  const skeleton = (
    <div className="animate-pulse space-y-3">
      <div className={summaryGridClass}>
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="space-y-2">
            <div className="h-3 w-20 bg-muted rounded" />
            <div className="h-6 w-24 bg-muted rounded" />
            <div className="h-3 w-16 bg-muted rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-2">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="space-y-1">
            <div className="flex justify-between text-[10px]">
              <div className="h-2 w-16 bg-muted rounded" />
              <div className="h-2 w-16 bg-muted rounded" />
            </div>
            <div className="h-2.5 w-full bg-muted rounded-full" />
          </div>
        ))}
      </div>
      <div className="h-2 w-24 bg-muted rounded" />
    </div>
  );

  return (
    <WidgetContainer
      title={tw('stakersUnstakers') || 'Stakers & Unstakers'}
      icon={Users}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      href="stakers-unstakers"
      headerAction={
        <div className="relative">
          <motion.button
            className="flex items-center gap-1 px-2 py-1 text-xs rounded hover:bg-secondary transition-colors"
            onClick={() => setDropdownOpen((prev) => !prev)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tc(`timeRanges.${selectedTimeframe}`)}
            <ChevronDown
              className={cn('w-3 h-3 transition-transform', dropdownOpen && 'rotate-180')}
            />
          </motion.button>
          <AnimatePresence>
            {dropdownOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute right-0 mt-1 bg-card border border-border rounded-lg shadow-lg z-20 min-w-[90px] overflow-hidden"
                >
                  {timeframeOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setSelectedTimeframe(option.value);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        'block w-full px-3 py-1.5 text-xs text-left transition-colors hover:bg-secondary',
                        selectedTimeframe === option.value && 'bg-secondary',
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      }
      className="h-full"
      contentClassName="p-2 md:p-3"
      isMobile={isMobile}
    >
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center h-full gap-1.5 md:gap-2 text-xs md:text-sm text-muted-foreground">
          <span>
            {tc('error')}: {error.message}
          </span>
          <button
            onClick={() => refetch()}
            className="px-2 py-1 text-xs border rounded hover:bg-secondary"
          >
            {isFetching ? tc('loading') : tc('retry')}
          </button>
        </div>
      )}

      {widget && !isLoading && !error ? (
        <div className="flex h-full flex-col gap-3">
          <div className={summaryGridClass}>
            {sideMetrics.map(({ side, valueDisplay, changeMagnitude, changeLabel }) => (
              <div key={side.key} className="flex flex-col gap-1">
                <div className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                  <side.Icon className="w-3.5 h-3.5" />
                  <span>{tw(side.labelKey)}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <motion.p
                    className="widget-value font-bold"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {valueDisplay}
                  </motion.p>
                  {changeLabel && (
                    <motion.div
                      className={cn(
                        'flex items-center gap-1 text-xs font-medium',
                        changeMagnitude != null
                          ? changeMagnitude >= 0
                            ? 'text-green-500'
                            : 'text-red-500'
                          : 'text-muted-foreground',
                      )}
                      initial={{ opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                    >
                      {changeMagnitude != null &&
                        (changeMagnitude >= 0 ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        ))}
                      <span>{changeLabel}</span>
                    </motion.div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            {sideMetrics.map(({ side, range, progress, lowLabel, highLabel }) =>
              range ? (
                <motion.div
                  key={side.key}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="mb-1 flex items-center justify-between text-[10px] font-medium">
                    <span className="text-muted-foreground">
                      {tw('low')}: <span className="text-foreground">{lowLabel}</span>
                    </span>
                    <span className="text-muted-foreground">
                      {tw('high')}: <span className="text-foreground">{highLabel}</span>
                    </span>
                  </div>
                  <div className="relative h-2 bg-secondary rounded-full">
                    <div className="absolute inset-y-0 left-0 right-0 flex items-center">
                      <div className="w-full h-1 bg-muted rounded-full mx-0.5">
                        <motion.div
                          className={cn(
                            'h-full bg-gradient-to-r rounded-full relative',
                            side.gradient,
                          )}
                          initial={{ width: 0 }}
                          animate={{ width: `${progress ?? 0}%` }}
                          transition={{ duration: 0.45, ease: 'easeOut' }}
                          style={{ overflow: 'visible' }}
                        >
                          {progress != null && (
                            <div
                              className={cn(
                                'absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full border border-background',
                                side.knobClass,
                              )}
                            />
                          )}
                        </motion.div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : null,
            )}
          </div>

          <motion.div
            className="mt-auto flex items-center justify-between pt-1 text-[10px] text-muted-foreground"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <span>
              {tc(`timeRanges.${selectedTimeframe}`)} {tw('range')}
            </span>
            {lastUpdated && (
              <span>
                {tw('lastUpdated')}: {lastUpdatedLabel}
              </span>
            )}
          </motion.div>
        </div>
      ) : (
        !isLoading &&
        !error && (
          <div className="flex items-center justify-center h-full text-xs md:text-sm text-muted-foreground">
            {tc('noData')}
          </div>
        )
      )}
    </WidgetContainer>
  );
}

function formatCount(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(2)}B`;
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return value.toLocaleString();
}

function computeProgress(current?: number, rawLow?: unknown, rawHigh?: unknown) {
  const low = toNumber(rawLow);
  const high = toNumber(rawHigh);
  if (current == null || low == null || high == null) return null;
  if (!Number.isFinite(current) || !Number.isFinite(low) || !Number.isFinite(high) || high === low)
    return null;
  const clamped = Math.min(Math.max(((current - low) / (high - low)) * 100, 0), 100);
  return Number.isFinite(clamped) ? clamped : null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}
