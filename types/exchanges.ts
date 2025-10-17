export interface ExchangeTicker {
  base: string;
  target: string;
  tradeUrl: string | null;
  volumeUsd: number | null;
  priceUsd: number | null;
  lastTradedAt: string | null;
}

export interface ExchangeMarket {
  name: string;
  identifier: string;
  slug: string;
  country?: string | null;
  trustScore?: string | null;
  tickers: ExchangeTicker[];
  totalVolumeUsd: number;
  updatedAt: string | null;
}

export interface ExchangeWidgetData {
  updatedAt: string;
  markets: ExchangeMarket[];
  count?: number;
  source?: string;
  stale?: boolean;
  error?: string | null;
  lastSuccessfulUpdate?: string | null;
}
