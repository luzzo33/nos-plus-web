'use client';

import { format } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { AccountsWidgetData } from '@/lib/api/balances-client';
import { cn } from '@/lib/utils';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';
import { useFontScale } from '../hooks/useFontScale';

interface HeaderProps {
  widget: AccountsWidgetData | null;
  mounted: boolean;
  loading?: boolean;
}

const fmtSigned = (n?: number, suffix = '') => {
  if (typeof n !== 'number' || !isFinite(n)) return '—';
  const sign = n >= 0 ? '+' : '-';
  const v = Math.abs(n);
  if (v >= 1e9) return `${sign}${(v / 1e9).toFixed(2).replace(/\.00$/, '')}B${suffix}`;
  if (v >= 1e6) return `${sign}${(v / 1e6).toFixed(2).replace(/\.00$/, '')}M${suffix}`;
  if (v >= 1e3) return `${sign}${(v / 1e3).toFixed(2).replace(/\.00$/, '')}K${suffix}`;
  return `${sign}${v.toFixed(2).replace(/\.00$/, '')}${suffix}`;
};

export function StakersUnstakersHeader({ widget, mounted, loading = false }: HeaderProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakersUnstakers');
  const showData = mounted && widget && !loading;
  const showSkeleton = loading || !widget;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-background p-6 md:p-8">
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32" />
      <div className="relative">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className={text('3xl', '4xl', 'font-bold')}>{t('title')}</h1>
            <p className={cn(text('base', 'base'), 'text-muted-foreground mt-1')}>
              {t('subtitle')}
            </p>
          </div>

          {showSkeleton && (
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 min-w-[280px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="space-y-3">
                    <SkeletonBlock className="h-3 w-32 rounded-lg" />
                    <SkeletonBlock className="h-8 w-32 rounded-lg" />
                    <div className="flex items-center gap-3">
                      <SkeletonBlock className="h-4 w-4 rounded-full" />
                      <SkeletonBlock className="h-3 w-20 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
              <SkeletonBlock className="mt-4 h-3 w-40 rounded-lg" />
            </div>
          )}

          {showData && (
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 min-w-[280px]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Accounts */}
                <div>
                  <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                    {t('header.totalAccounts')}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 gap-1">
                    <p className={text('2xl', '3xl', 'font-bold')}>
                      {widget.accounts?.total?.display ??
                        widget.accounts?.total?.count?.toLocaleString?.() ??
                        '—'}
                    </p>
                    {(() => {
                      const delta = widget.changes?.['24h']?.accounts?.total?.absolute;
                      if (typeof delta !== 'number') return null;
                      const positive = delta >= 0;
                      return (
                        <div
                          className={cn(
                            'flex items-center gap-1',
                            positive ? 'text-green-500' : 'text-red-500',
                          )}
                        >
                          {positive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className={text('sm', 'sm', 'font-medium')}>
                            {`${positive ? '+' : ''}${Math.abs(delta).toLocaleString()}`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Staking Accounts */}
                <div>
                  <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                    {t('header.stakingAccounts')}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 gap-1">
                    <p className={text('2xl', '3xl', 'font-bold')}>
                      {widget.accounts?.staking?.display ??
                        widget.accounts?.staking?.count?.toLocaleString?.() ??
                        '—'}
                    </p>
                    {(() => {
                      const delta = widget.changes?.['24h']?.accounts?.staking?.absolute;
                      if (typeof delta !== 'number') return null;
                      const positive = delta >= 0;
                      return (
                        <div
                          className={cn(
                            'flex items-center gap-1',
                            positive ? 'text-green-500' : 'text-red-500',
                          )}
                        >
                          {positive ? (
                            <TrendingUp className="w-4 h-4" />
                          ) : (
                            <TrendingDown className="w-4 h-4" />
                          )}
                          <span className={text('sm', 'sm', 'font-medium')}>
                            {`${positive ? '+' : ''}${Math.abs(delta).toLocaleString()}`}
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <p className={cn(text('xs', 'xs'), 'text-muted-foreground mt-2')}>
                {t('header.lastUpdated')}:{' '}
                {(() => {
                  const ts = widget.accounts?.total?.lastUpdate ?? widget.current?.lastUpdate;
                  return ts ? format(new Date(ts), 'HH:mm:ss') : '—';
                })()}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
