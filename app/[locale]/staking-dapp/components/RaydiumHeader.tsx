'use client';

import { format } from 'date-fns';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';

interface RaydiumHeaderProps {
  widget: any;
  mounted: boolean;
}

export function RaydiumHeader({ widget, mounted }: RaydiumHeaderProps) {
  const { text } = useFontScale();
  const t = useTranslations('stakingDapp');
  const tc = useTranslations('common');
  const change24h = widget?.changes?.['24h'];
  const xnosChange = change24h?.xnos;
  const isPositive = (() => {
    if (typeof xnosChange?.percentage === 'number' && Number.isFinite(xnosChange.percentage)) {
      return xnosChange.percentage >= 0;
    }
    if (typeof xnosChange?.absolute === 'number' && Number.isFinite(xnosChange.absolute)) {
      return xnosChange.absolute >= 0;
    }
    if (typeof xnosChange?.display === 'string') {
      return !xnosChange.display.trim().startsWith('-');
    }
    return true;
  })();

  const currentXnosValue = (() => {
    const raw = widget?.current?.xnos?.value ?? widget?.current?.xnos;
    return typeof raw === 'number' && Number.isFinite(raw) ? raw : undefined;
  })();

  const currentXnosDisplay =
    widget?.current?.xnos?.display ??
    (currentXnosValue !== undefined ? currentXnosValue.toLocaleString() : '—');

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
            {/* Optional subtitle can be added to messages if desired */}
          </div>
          {mounted && widget && (
            <div className="bg-background/50 backdrop-blur-sm rounded-xl p-4 border border-border/50">
              {/* Stack values vertically on mobile; single metric for contract balance */}
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <p className={cn(text('2xs', 'xs'), 'text-muted-foreground')}>
                    {t('contractBalance')}
                  </p>
                  <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-3 gap-1">
                    <p className={text('2xl', '3xl', 'font-bold')}>{currentXnosDisplay}</p>
                    {xnosChange && currentXnosDisplay !== '—' && (
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
                          {formatChangeDisplay(xnosChange.display)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <p className={cn(text('xs', 'xs'), 'text-muted-foreground mt-2')}>
                {tc('lastUpdated')}: {lastUpdatedLabel}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
