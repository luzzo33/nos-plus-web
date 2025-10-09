'use client';

import { format } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

interface StakingDappHeaderProps {
  widget: any;
  mounted: boolean;
  loading?: boolean;
}

export function StakingDappHeader({ widget, mounted, loading = false }: StakingDappHeaderProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakingDapp');
  const change24h = widget?.changes?.['24h'];
  const xnosChange = change24h?.xnos;
  const aprChange = change24h?.apr;
  const showData = mounted && widget && !loading;
  const showSkeleton = loading || !widget;

  const resolvePositive = (change?: {
    percentage?: number | null;
    absolute?: number | null;
    display?: string | null;
  }) => {
    if (typeof change?.percentage === 'number' && Number.isFinite(change.percentage))
      return change.percentage >= 0;
    if (typeof change?.absolute === 'number' && Number.isFinite(change.absolute))
      return change.absolute >= 0;
    if (typeof change?.display === 'string') return !change.display.trim().startsWith('-');
    return true;
  };

  const xnosPositive = resolvePositive(xnosChange);
  const aprPositive = resolvePositive(aprChange);

  const currentXnosValue = (() => {
    const raw = widget?.current?.xnos?.value ?? widget?.current?.xnos;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  })();

  const currentXnosDisplay =
    widget?.current?.xnos?.display ??
    (currentXnosValue !== undefined ? currentXnosValue.toLocaleString() : '—');

  const currentAprValue = (() => {
    const raw = widget?.current?.apr?.value ?? widget?.current?.apr;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  })();

  const currentAprDisplay =
    widget?.current?.apr?.display ??
    (currentAprValue !== undefined ? `${currentAprValue.toFixed(2)}%` : '—');

  const lastUpdatedLabel = (() => {
    const raw = widget?.current?.lastUpdate;
    if (!raw) return '—';
    try {
      return format(new Date(raw), 'HH:mm:ss');
    } catch {
      return '—';
    }
  })();

  const formatChangeDisplay = (display?: string) => display ?? '—';

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className={text('3xl', '4xl', 'font-bold')}>{t('title')}</h1>
            <p className={cn(text('base', 'base'), 'text-muted-foreground mt-1')}>
              {t('subtitle', {
                default: 'xNOS and APR analytics for the Nosana staking contract',
              } as any)}
            </p>
          </div>
          {showSkeleton && (
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 min-w-[280px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="space-y-3">
                    <SkeletonBlock className="h-3 w-24 rounded-lg" />
                    <SkeletonBlock className="h-8 w-28 rounded-lg" />
                    <div className="flex items-center gap-3">
                      <SkeletonBlock className="h-4 w-4 rounded-full" />
                      <SkeletonBlock className="h-3 w-16 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
              <SkeletonBlock className="mt-4 h-3 w-32 rounded-lg" />
            </div>
          )}
          {showData && (
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              {/* Stack values vertically on mobile; two columns on md+ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* xNOS */}
                <div>
                  <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                    {t('header.xnos', { default: 'xNOS' } as any)}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 gap-1">
                    <p className={text('2xl', '3xl', 'font-bold')}>{currentXnosDisplay}</p>
                    {xnosChange && currentXnosDisplay !== '—' && (
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          xnosPositive ? 'text-green-500' : 'text-red-500',
                        )}
                      >
                        {xnosPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className={text('sm', 'sm', 'font-medium')}>
                          {formatChangeDisplay(xnosChange.display)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* APR */}
                <div>
                  <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                    {t('header.apr', { default: 'APR' } as any)}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 gap-1">
                    <p className={text('2xl', '3xl', 'font-bold')}>{currentAprDisplay}</p>
                    {aprChange && currentAprDisplay !== '—' && (
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          aprPositive ? 'text-green-500' : 'text-red-500',
                        )}
                      >
                        {aprPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className={text('sm', 'sm', 'font-medium')}>
                          {formatChangeDisplay(aprChange.display)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className={cn(text('xs', 'xs'), 'text-muted-foreground mt-2')}>
                {t('header.lastUpdated', { default: 'Last updated' } as any)}: {lastUpdatedLabel}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
