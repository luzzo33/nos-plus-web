export interface LinkedOrderSummary {
  kind: string;
  action?: string | null;
  externalId?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface LiveMonitorEvent {
  id: number | string;
  kind: 'swap' | 'limit' | 'dca_execution' | 'transfer' | string;
  side: 'buy' | 'sell' | 'neutral';
  baseSymbol?: string;
  quoteSymbol?: string | null;
  baseMint?: string | null;
  quoteMint?: string | null;
  baseAmount?: number;
  quoteAmount?: number | null;
  price?: number | null;
  usdValue?: number | null;
  occurredAt: string;
  timestampSource?: 'stream' | 'db' | 'unknown';
  venue?: string;
  txHash?: string;
  externalId?: string | null;
  planId?: string | null | number;
  planType?: 'dca' | 'limit' | string | null;
  correlationType?: 'limit' | 'dca';
  marketUrl?: string | null;
  tradeUrl?: string | null;
  metadata?: Record<string, unknown> | null;
  linkedOrders?: LinkedOrderSummary[];
  linkedOrderKinds?: string[];
  linkedLimitOrder?: boolean;
  linkedLimitOrderFill?: boolean;
  linkedLimitOrderPlacement?: boolean;
  linkedDca?: boolean;
  linkedLimitOrderIds?: string[];
  linkedPlanId?: string | null;
  limitOrderPlacementDetails?: {
    baseAmount?: number | null;
    quoteAmount?: number | null;
    price?: number | null;
  } | null;
  narrative?: string;
  ingestedAt?: string | null;
  sortTimestamp?: number | null;
}

export interface LiveStreamOptions {
  kinds?: string[];
  side?: 'buy' | 'sell' | 'neutral';
  venue?: string;
  venues?: string[];
  pollMs?: number;
  bootstrapLimit?: number;
  debug?: boolean;
  minUsd?: number;
  idOnlyMode?: boolean;
}
