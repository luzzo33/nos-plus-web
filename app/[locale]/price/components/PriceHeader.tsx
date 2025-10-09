'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useLocale, useTranslations } from 'next-intl';
import { formatLocalFromInput } from '@/lib/time';

interface PriceHeaderProps {
  widget: any;
  mounted: boolean;
  loading?: boolean;
}

export function PriceHeader({ widget, mounted, loading = false }: PriceHeaderProps) {
  const { text } = useFontScale();
  const t = useTranslations('price');
  const locale = useLocale();
  const priceChange24h = widget?.changes?.['24h'];
  const isPositive = priceChange24h?.value >= 0;
  const showData = mounted && widget && !loading;
  const showSkeleton = loading || !widget;
  const lastUpdatedDisplay = widget?.lastUpdate
    ? formatLocalFromInput(widget.lastUpdate, 'HH:mm:ss', locale)
    : '';

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
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50 min-w-[220px]">
              <div className="space-y-3">
                <div className="relative skeleton h-8 w-32">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative skeleton h-6 w-20 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                  <div className="relative skeleton h-4 w-12 rounded">
                    <div className="absolute inset-0 skeleton-shimmer" />
                  </div>
                </div>
                <div className="relative skeleton h-3 w-28 rounded">
                  <div className="absolute inset-0 skeleton-shimmer" />
                </div>
              </div>
            </div>
          )}

          {showData && (
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              <div className="flex items-baseline gap-3">
                <p className={text('2xl', '3xl', 'font-bold')}>{widget.price.display}</p>
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
                  <span className={text('sm', 'sm', 'font-medium')}>
                    {priceChange24h?.value.toFixed(2)}%
                  </span>
                </div>
              </div>
              <p className={cn(text('xs', 'xs'), 'text-muted-foreground mt-1')}>
                {t('header.lastUpdated')}: {lastUpdatedDisplay || '—'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
