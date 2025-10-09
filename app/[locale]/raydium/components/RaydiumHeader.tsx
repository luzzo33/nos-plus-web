'use client';

import { format } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';

interface RaydiumHeaderProps {
  widget: any;
  mounted: boolean;
  loading?: boolean;
}

export function RaydiumHeader({ widget, mounted, loading = false }: RaydiumHeaderProps) {
  const { text } = useFontScale();
  const t = useTranslations('raydium');
  const change24h = widget?.changes?.['24h'];
  const aprChange = change24h?.apr;
  const isPositive = (aprChange?.absolute ?? 0) >= 0;
  const showData = mounted && widget && !loading;
  const showSkeleton = loading || !widget;

  const formatShortUSD2 = (n?: number) => {
    if (typeof n !== 'number' || !isFinite(n)) return '—';
    const sign = n >= 0 ? '+' : '-';
    const v = Math.abs(n);
    const withDecimals = (x: number) => {
      const s = x.toFixed(2);
      return s.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1');
    };
    if (v >= 1e9) return `${sign}$${withDecimals(v / 1e9)}B`;
    if (v >= 1e6) return `${sign}$${withDecimals(v / 1e6)}M`;
    if (v >= 1e3) return `${sign}$${withDecimals(v / 1e3)}K`;
    return `${sign}$${withDecimals(v)}`;
  };

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
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 min-w-[260px]">
              <div className="space-y-4">
                {Array.from({ length: 2 }).map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="relative skeleton h-3 w-24">
                      <div className="absolute inset-0 skeleton-shimmer" />
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:gap-3 gap-2">
                      <div className="relative skeleton h-7 w-32">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                      <div className="relative skeleton h-5 w-20">
                        <div className="absolute inset-0 skeleton-shimmer" />
                      </div>
                    </div>
                  </div>
                ))}
                <div className="relative skeleton h-3 w-40">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            </div>
          )}

          {showData && (
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              {/* Stack values vertically on mobile; two columns on md+ (Liquidity first by default) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Liquidity */}
                <div>
                  <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                    {t('header.liquidity')}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 gap-1">
                    <p className={text('2xl', '3xl', 'font-bold')}>
                      {widget.current.liquidity.display}
                    </p>
                    {change24h?.liquidity && (
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          (change24h.liquidity.absolute ?? 0) >= 0
                            ? 'text-green-500'
                            : 'text-red-500',
                        )}
                      >
                        {(change24h.liquidity.absolute ?? 0) >= 0 ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className={text('sm', 'sm', 'font-medium')}>
                          {formatShortUSD2(change24h.liquidity.absolute)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* APR */}
                <div>
                  <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                    {t('header.apr')}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 gap-1">
                    <p className={text('2xl', '3xl', 'font-bold')}>{widget.current.apr.display}</p>
                    {aprChange && (
                      <div
                        className={cn(
                          'flex items-center gap-1',
                          isPositive ? 'text-green-500' : 'text-red-500',
                        )}
                      >
                        {isPositive ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span className={text('sm', 'sm', 'font-medium')}>{aprChange.display}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className={cn(text('xs', 'xs'), 'text-muted-foreground mt-2')}>
                {t('header.lastUpdated')}: {format(new Date(widget.current.lastUpdate), 'HH:mm:ss')}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
