'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Building2, ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

import { WidgetContainer } from './WidgetLayout';
import type { ExchangeMarket, ExchangeWidgetData } from '@/types/exchanges';
import { cn, formatCurrency } from '@/lib/utils';
import { useFormattedTimestamp } from '@/lib/hooks/useFormattedTimestamp';
import { ExchangesApiClient } from '@/lib/api/exchanges-client';

type ExchangeWidgetMode = 'single' | 'double';
type SlideDirection = 1 | -1;

interface ExchangeWidgetProps {
  isMobile?: boolean;
  mode?: ExchangeWidgetMode;
}

const GRID_LAYOUTS: Record<ExchangeWidgetMode, number[]> = {
  single: [3, 3, 2],
  double: [5, 5, 4],
};

const COLUMN_CLASS_MAP: Record<number, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-2',
  3: 'grid-cols-3',
  4: 'grid-cols-4',
  5: 'grid-cols-5',
};

const PAGE_ANIMATION_VARIANTS = {
  enter: (direction: SlideDirection) => ({
    opacity: 0,
    x: direction > 0 ? 32 : -32,
    filter: 'blur(6px)',
  }),
  center: {
    opacity: 1,
    x: 0,
    filter: 'blur(0px)',
  },
  exit: (direction: SlideDirection) => ({
    opacity: 0,
    x: direction > 0 ? -32 : 32,
    filter: 'blur(6px)',
  }),
};

const LOGO_MAP: Record<string, string> = {
  'bitvenus-spot': '/exchanges/bitvenus-spot.svg',
  bitvenus_spot: '/exchanges/bitvenus-spot.svg',
  'blofin-spot': '/exchanges/blofin-spot.svg',
  blofin_spot: '/exchanges/blofin-spot.svg',
  coinex: '/exchanges/coinex.svg',
  'crypto-com': '/exchanges/crypto-com.svg',
  crypto_com: '/exchanges/crypto-com.svg',
  meteora: '/exchanges/meteora.svg',
  novadax: '/exchanges/novadax.svg',
  orca: '/exchanges/orca.svg',
  ourbit: '/exchanges/ourbit.svg',
  xt: '/exchanges/xt.svg',
  gate: '/gate-io.svg',
  bitvavo: '/bitvavo.svg',
  kraken: '/kraken.svg',
  mxc: '/mexc.svg',
  mexc: '/mexc.svg',
  raydium: '/raydium.svg',
  raydium2: '/raydium.svg',
  jupiter: '/jupiter.svg',
  swissborg: '/exchanges/swissborg.svg',
};

function resolveLogoPath(market: ExchangeMarket): string | null {
  return LOGO_MAP[market.slug] ?? LOGO_MAP[market.identifier] ?? null;
}

function buildFallbackInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed.length) return '?';
  const firstLetter = trimmed[0];
  return firstLetter.toUpperCase();
}

const exchangesClient = new ExchangesApiClient();

function useExchangeListings() {
  return useQuery<ExchangeWidgetData>({
    queryKey: ['widget-exchanges'],
    queryFn: async () => {
      const { widget } = await exchangesClient.getWidgetData();
      return widget;
    },
    refetchInterval: 5 * 60 * 1000,
    staleTime: 2 * 60 * 1000,
  });
}

function TrustDot({ trustScore }: { trustScore?: string | null }) {
  let colorClass = 'bg-muted-foreground/50';
  if (trustScore === 'green') colorClass = 'bg-emerald-500';
  else if (trustScore === 'yellow') colorClass = 'bg-amber-400';
  else if (trustScore && trustScore.length) colorClass = 'bg-rose-500';

  const label = trustScore ? trustScore.toUpperCase() : 'UNKNOWN';

  return (
    <span
      className={cn(
        'relative flex h-2 w-2 flex-shrink-0 items-center justify-center rounded-full',
        colorClass,
      )}
      title={label}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

function chunkByLayout(markets: ExchangeMarket[], layout: number[]): ExchangeMarket[][] {
  if (!markets.length) return [];

  const rows: ExchangeMarket[][] = [];
  let cursor = 0;

  for (const size of layout) {
    if (cursor >= markets.length) break;
    rows.push(markets.slice(cursor, cursor + size));
    cursor += size;
  }

  if (cursor < markets.length) {
    rows.push(markets.slice(cursor));
  }

  return rows;
}

export function ExchangeWidget({ isMobile = false, mode = 'single' }: ExchangeWidgetProps) {
  const tw = useTranslations('widgets');
  const tc = useTranslations('common');
  const { data, isLoading, error, refetch, isFetching } = useExchangeListings();

  const [page, setPage] = useState(0);
  const [direction, setDirection] = useState<SlideDirection>(1);
  const [selectedMarket, setSelectedMarket] = useState<ExchangeMarket | null>(null);

  const modalTitleId = selectedMarket ? `exchange-modal-${selectedMarket.identifier}` : undefined;
  const topModalTickers = 3;

  const markets = useMemo(() => data?.markets ?? [], [data?.markets]);
  const layoutPattern = GRID_LAYOUTS[mode];
  const baseItemsPerPage = useMemo(
    () => layoutPattern.reduce((sum, size) => sum + size, 0),
    [layoutPattern],
  );
  const itemsPerPage = mode === 'double' ? Math.max(baseItemsPerPage, markets.length) : baseItemsPerPage;
  const baseRowCount = layoutPattern.length;
  const contentMinHeight = !isMobile ? `${baseRowCount * 56}px` : undefined;
  const totalCount = data?.count ?? markets.length;
  const totalPages = Math.max(1, Math.ceil(markets.length / itemsPerPage));
  const hasMultiplePages = totalPages > 1;
  const isFirstPage = page === 0;
  const hasNextPage = page < totalPages - 1;

  useEffect(() => {
    setDirection(1);
    setPage(0);
  }, [mode, isMobile, itemsPerPage, markets.length]);

  useEffect(() => {
    setPage((prev) => {
      if (prev >= totalPages) {
        return Math.max(0, totalPages - 1);
      }
      return prev;
    });
  }, [totalPages]);

  useEffect(() => {
    if (!selectedMarket) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSelectedMarket(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedMarket]);

  const pageMarkets = useMemo(() => {
    const start = page * itemsPerPage;
    return markets.slice(start, start + itemsPerPage);
  }, [itemsPerPage, markets, page]);

  const gridRows = useMemo(
    () => chunkByLayout(pageMarkets, layoutPattern),
    [layoutPattern, pageMarkets],
  );

  const displayedCount = Math.min(totalCount, page * itemsPerPage + pageMarkets.length);
  const hiddenCount = Math.max(0, totalCount - displayedCount);

  const lastUpdatedLabel = useFormattedTimestamp(data?.updatedAt ?? null, {
    absoluteFormat: 'HH:mm',
    fallbackAbsolute: '--:--',
    fallbackRelative: tc('na'),
  });

  const selectedUpdatedLabel = useFormattedTimestamp(selectedMarket?.updatedAt ?? null, {
    absoluteFormat: 'HH:mm',
    fallbackAbsolute: '--:--',
    fallbackRelative: tc('na'),
  });

  const handleNextPage = useCallback(() => {
    if (!hasMultiplePages || !hasNextPage) return;
    setDirection(1);
    setPage((prev) => Math.min(totalPages - 1, prev + 1));
  }, [hasMultiplePages, hasNextPage, totalPages]);

  const handlePrevPage = useCallback(() => {
    if (!hasMultiplePages || isFirstPage) return;
    setDirection(-1);
    setPage((prev) => Math.max(0, prev - 1));
  }, [hasMultiplePages, isFirstPage]);

  const handleMarketClick = useCallback((market: ExchangeMarket) => {
    setSelectedMarket(market);
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedMarket(null);
  }, []);

  const skeleton = useMemo(
    () => (
      <div className="space-y-2">
        {layoutPattern.map((cols, rowIndex) => (
          <div key={`skeleton-${rowIndex}`} className={cn('grid gap-2', COLUMN_CLASS_MAP[cols] ?? 'grid-cols-2')}>
            {Array.from({ length: cols }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-1.5 rounded-md border border-border/40 bg-secondary/35 p-2 animate-pulse"
              >
                <div className="h-6 w-6 rounded bg-muted flex-shrink-0" />
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 w-full rounded bg-muted/70" />
                </div>
                <div className="h-2 w-2 rounded-full bg-muted/50 flex-shrink-0" />
              </div>
            ))}
          </div>
        ))}
      </div>
    ),
    [layoutPattern],
  );

  const renderMarket = (market: ExchangeMarket) => {
    const logoPath = resolveLogoPath(market);
    const extraCount = Math.max(0, market.tickers.length - 1);

    return (
      <button
        key={market.identifier}
        type="button"
        onClick={() => handleMarketClick(market)}
        className={cn(
          'flex items-center gap-2 rounded-md border border-border/50 bg-secondary/40 p-2 transition-all',
          'hover:border-primary/50 hover:bg-secondary/60 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      >
        <div className="relative h-6 w-6 flex-shrink-0 overflow-hidden rounded border border-border/40 bg-background/70">
          {logoPath ? (
            <Image src={logoPath} alt={market.name} fill sizes="24px" className="object-contain p-0.5" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-[10px] font-semibold text-primary">
              {buildFallbackInitial(market.name)}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 text-left">
          <p className="truncate text-[11px] font-medium text-foreground leading-tight">{market.name}</p>
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          <TrustDot trustScore={market.trustScore} />
          {extraCount > 0 && (
            <span className="text-[8px] text-muted-foreground/70 font-medium" title={tw('exchangeMorePairs', { count: extraCount })}>
              +{extraCount}
            </span>
          )}
        </div>
      </button>
    );
  };

  return (
    <WidgetContainer
      title={tw('exchanges')}
      icon={Building2}
      loading={isLoading}
      loadingSkeleton={skeleton}
      error={error?.message}
      className="h-full"
      contentClassName={cn(
        'p-2 md:p-2.5 flex h-full flex-col gap-2',
        isMobile ? 'text-[12px]' : 'text-sm',
      )}
      isMobile={isMobile}
      linkLabel={tw('exchanges')}
      headerAction={
        data ? (
          <div className="flex flex-wrap items-center justify-end gap-1 text-[9px] text-muted-foreground">
            <span>
              {tc('lastUpdated')}: {lastUpdatedLabel}
            </span>
            {data.stale && (
              <span className="rounded-full border border-amber-400/60 bg-amber-500/10 px-2 py-0.5 text-amber-500">
                {tw('exchangeStale')}
              </span>
            )}
          </div>
        ) : null
      }
    >
      {!isLoading && error && (
        <div className="flex flex-col items-center justify-center gap-2 py-8 text-center text-sm">
          <p>
            {tc('error')}: {error.message}
          </p>
          <button
            onClick={() => refetch()}
            className="rounded-full border border-border px-3 py-1 text-xs hover:border-primary/50"
          >
            {isFetching ? tc('loading') : tc('retry')}
          </button>
        </div>
      )}

      {!isLoading && !error && data?.error && (
        <div className="rounded-md border border-amber-400/40 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-500">
          {tw('exchangeStaleNotice', { reason: data.error })}
        </div>
      )}

      {!isLoading && !error && markets.length === 0 && (
        <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
          {tc('noData')}
        </div>
      )}

      {!isLoading && !error && markets.length > 0 && (
        <div className="relative flex h-full flex-col">
          <div className="flex-1">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={`${mode}-${page}`}
                custom={direction}
                variants={PAGE_ANIMATION_VARIANTS}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.35, ease: 'easeInOut' }}
                className="space-y-2"
                style={contentMinHeight ? { minHeight: contentMinHeight } : undefined}
              >
                {gridRows.map((row, rowIndex) => (
                  <motion.div
                    key={`row-${rowIndex}-${row[0]?.identifier || 'empty'}`}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rowIndex * 0.05 }}
                    className={cn('grid gap-2', COLUMN_CLASS_MAP[row.length] ?? 'grid-cols-2')}
                  >
                    {row.map(renderMarket)}
                  </motion.div>
                ))}
              </motion.div>
            </AnimatePresence>
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto_1fr] items-center text-[10px] font-medium text-muted-foreground">
            <span className="text-left">
              {tc('page')} {page + 1}/{totalPages}
            </span>

            {hasMultiplePages ? (
              <motion.button
                type="button"
                onClick={hasNextPage ? handleNextPage : handlePrevPage}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.96 }}
                className={cn(
                  'inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary px-3 py-0.5 text-[10px] font-semibold text-primary-foreground shadow-md transition-colors',
                )}
                title={hasNextPage ? tc('next') : tc('previous')}
                aria-label={hasNextPage ? tc('next') : tc('previous')}
              >
                {hasNextPage ? (
                  <>
                    <span>{tc('next')}</span>
                    <ChevronRight className="h-3 w-3" />
                  </>
                ) : (
                  <>
                    <ChevronLeft className="h-3 w-3" />
                    <span>{tc('previous')}</span>
                  </>
                )}
              </motion.button>
            ) : (
              <span className="inline-block h-6 min-w-[48px]" aria-hidden="true" />
            )}

            <span className="text-right">
              {isFirstPage && hiddenCount > 0 ? tw('exchangeHidden', { count: hiddenCount }) : '\u00A0'}
            </span>
          </div>

          <AnimatePresence>
            {selectedMarket && (
              <motion.div
                key={selectedMarket.identifier}
                className="absolute inset-0 z-20 flex flex-col bg-background/92 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                role="dialog"
                aria-modal="true"
                aria-labelledby={modalTitleId}
                onClick={handleCloseModal}
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className="relative m-2 flex-1 overflow-hidden rounded-lg border border-border/60 bg-background/98 shadow-xl"
                  onClick={(event) => event.stopPropagation()}
                >
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
                    aria-label={tw('exchangeClose')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>

                  <div className="flex h-full flex-col gap-4 overflow-y-auto p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative h-8 w-8 overflow-hidden rounded-md border border-border/40 bg-secondary/60">
                        {resolveLogoPath(selectedMarket) ? (
                          <Image
                            src={resolveLogoPath(selectedMarket)!}
                            alt={selectedMarket.name}
                            fill
                            sizes="32px"
                            className="object-contain p-1"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-primary/10 text-[10px] font-semibold text-primary">
                            {buildFallbackInitial(selectedMarket.name)}
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <p id={modalTitleId} className="truncate text-sm font-semibold text-foreground">
                          {selectedMarket.name}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                          <span>
                            {tc('lastUpdated')}: {selectedUpdatedLabel}
                          </span>
                          <span className="flex items-center gap-1">
                            <TrustDot trustScore={selectedMarket.trustScore} />
                            <span className="font-medium text-foreground">{tw('exchangeTrustScore')}</span>
                            <span className="uppercase text-muted-foreground/80">
                              {selectedMarket.trustScore ? selectedMarket.trustScore : tc('na')}
                            </span>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-lg border border-border/40 bg-secondary/40 p-3">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                          {tw('exchangeTotalVolume')}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {typeof selectedMarket.totalVolumeUsd === 'number'
                            ? formatCurrency(selectedMarket.totalVolumeUsd)
                            : tc('na')}
                        </p>
                      </div>
                      <div className="rounded-lg border border-border/40 bg-secondary/40 p-3">
                        <p className="text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                          {tw('exchangeMarkets')}
                        </p>
                        <p className="mt-1 text-sm font-semibold text-foreground">
                          {selectedMarket.tickers.length}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                        {tw('exchangeMarketsList')}
                      </p>
                      <div className="mt-2 space-y-1.5">
                        {selectedMarket.tickers.length === 0 && (
                          <p className="rounded-md border border-dashed border-border/50 bg-secondary/30 px-3 py-2 text-[11px] text-muted-foreground">
                            {tw('exchangeNoMarkets')}
                          </p>
                        )}

                        {selectedMarket.tickers.slice(0, topModalTickers).map((ticker, index) => (
                          <div
                            key={`${ticker.base}-${ticker.target}-${index}`}
                            className="flex items-center justify-between rounded-md border border-border/40 bg-secondary/30 px-3 py-2 text-[11px]"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-foreground">
                                {ticker.base}/{ticker.target}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {tw('exchangeVolume')}:{' '}
                                {typeof ticker.volumeUsd === 'number' ? formatCurrency(ticker.volumeUsd) : tc('na')}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-muted-foreground">{tw('price')}</p>
                              <p className="text-[11px] font-semibold text-foreground">
                                {typeof ticker.priceUsd === 'number' ? formatCurrency(ticker.priceUsd) : tc('na')}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {selectedMarket.tickers.length > topModalTickers && (
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {tw('exchangeMorePairs', { count: selectedMarket.tickers.length - topModalTickers })}
                        </p>
                      )}
                    </div>

                    {selectedMarket.tickers.some((ticker) => ticker.tradeUrl) && (
                      <a
                        href={selectedMarket.tickers.find((ticker) => ticker.tradeUrl)?.tradeUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex w-fit items-center gap-1 rounded-md border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary transition-colors hover:bg-primary/20"
                      >
                        {tw('exchangeVisit')}
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </WidgetContainer>
  );
}
