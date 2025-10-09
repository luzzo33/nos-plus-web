import type { ApiMeta } from './types';

export type MonitorOrder = 'ASC' | 'DESC';
export type MonitorKind = 'limit_order' | 'dca' | 'trade' | 'all';
export type MonitorSide = 'buy' | 'sell' | 'all';

export interface MonitorEventRow {
  id?: number | string;
  event_time?: string;
  venue?: string;
  event_kind?: string;
  side?: string;
  base_asset?: string;
  quote_asset?: string;
  base_mint?: string;
  quote_mint?: string;
  base_decimals?: number;
  quote_decimals?: number;
  base_name?: string;
  quote_name?: string;
  base_amount?: number;
  quote_amount?: number;
  price?: number;
  usd_value?: number;
  wallet?: string;
  tx_signature?: string;
  narrative?: string;
  metadata?: unknown;
  market_link?: string;
  trade_link?: string;
  market_url?: string;
  trade_url?: string;
  [key: string]: unknown;
}

export interface MonitorEventsResponse {
  success: boolean;
  total: number;
  rows: MonitorEventRow[];
  meta?: ApiMeta;
}

export interface MonitorSummaryResponse {
  success: boolean;
  totals?: Record<string, number>;
  kinds?: Array<{ kind: string; count: number }>;
  venues?: Array<{ venue: string; count: number }>;
  pairs?: Array<{ base: string; quote: string; count: number }>;
  dcaPlans?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

export interface MetricsSeriesPoint {
  t: string;
  v?: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  aux?: { count?: number; usd?: number };
}

export interface MetricsSeriesResponse {
  points: MetricsSeriesPoint[];
  meta: { range: string; interval: string; total?: number | null; latestPrice?: number };
}

export interface DashboardStatsSnapshot {
  venue?: string | null;
  priceNow: number | null;
  change5m: number | null;
  change1h: number | null;
  change6h: number | null;
  change24h: number | null;
  volume: number | null;
  tx: number | null;
  buyers: number | null;
  sellers: number | null;
  updatedAt: string | null;
}

export interface DashboardMetricsPoint {
  t: string;
  v: number;
  o?: number;
  h?: number;
  l?: number;
  c?: number;
  aux?: Record<string, number>;
}

export interface DashboardMetricsSeries {
  points: DashboardMetricsPoint[];
  total?: number | null;
  latestPrice?: number | null;
}

export interface MonitorDashboardSnapshot {
  generatedAt: string;
  stats: {
    total: Record<string, DashboardStatsSnapshot>;
    average: Record<string, DashboardStatsSnapshot>;
    perVenue: Record<string, Record<string, DashboardStatsSnapshot>>;
  };
  metrics: {
    price: Record<string, DashboardMetricsSeries>;
    volume: Record<string, DashboardMetricsSeries>;
    activity: Record<string, DashboardMetricsSeries>;
  };
  dca: Record<string, unknown> | null;
  summary: Record<string, unknown> | null;
}

export interface DcaPlanRow {
  plan_id: string;
  started_at: string;
  last_event_at: string;
  next_execution_at: string | null;
  status: 'active' | 'scheduled' | 'closed' | 'completed' | 'paused' | string;
  side: 'buy' | 'sell' | string;
  base_symbol: string;
  quote_symbol: string;
  avg_base_slice?: number | null;
  avg_quote_slice?: number | null;
  total_base_executed?: number | null;
  total_quote_spent?: number | null;
  total_input_spent?: number | null;
  per_slice_input?: number | null;
  slices: number;
  frequency_seconds?: number | null;
  input_symbol?: string | null;
  output_symbol?: string | null;
  input_decimals?: number | null;
  output_decimals?: number | null;
  plan_total_input?: number | null;
  wallet?: string | null;
  progress_pct?: number | null;
  slices_expected?: number | null;
  slices_remaining?: number | null;
  remaining_quote?: number | null;
  remaining_input?: number | null;
  estimated_completion_at?: string | null;
  usd_total_spent?: number | null;
  is_quote_stable?: boolean;
  has_executions?: boolean;
  start_price?: number | null;
  min_price?: number | null;
  max_price?: number | null;
  trigger_price?: number | null;
  activation?: string | null;
  start_after_seconds?: number | null;
  last_execution_at?: string | null;
}

export interface DcaPlansResponse {
  total: number;
  rows: DcaPlanRow[];
  summary?: {
    totalPlans: number;
    activeCount: number;
    scheduledCount: number;
    closedCount: number;
    pausedCount?: number;
    totalValue: number;
    avgProgress: number;
  };
}

export interface LimitPlanRow {
  plan_id: string;
  plan_type?: 'limit';
  side: 'buy' | 'sell' | 'neutral' | string;
  status: string;
  status_reason?: string | null;
  wallet?: string | null;
  started_at: string | null;
  last_event_at: string | null;
  base_symbol: string;
  quote_symbol: string | null;
  base_decimals: number;
  quote_decimals: number | null;
  initial_base_amount: number | null;
  initial_quote_amount: number | null;
  filled_base_amount: number | null;
  filled_quote_amount: number | null;
  remaining_base_amount: number | null;
  remaining_quote_amount: number | null;
  progress_pct: number | null;
  price_target: number | null;
  avg_fill_price: number | null;
  current_price?: number | null;
  price_distance?: number | null;
  price_distance_abs?: number | null;
  price_distance_pct?: number | null;
  fee_bps: number | null;
  slippage_bps: number | null;
  expired_at: string | null;
  unique_id: string | null;
  usd_filled: number | null;
  usd_remaining: number | null;
}

export interface LimitPlansResponse {
  total: number;
  rows: LimitPlanRow[];
  summary?: {
    totalPlans: number;
    activeCount: number;
    completedCount: number;
    closedCount: number;
    scheduledCount: number;
    avgProgress: number;
    totalValue: number;
    totalFilledBase?: number;
    totalFilledQuote?: number;
    totalRemainingBase?: number;
    totalRemainingQuote?: number;
    statusBreakdown?: Record<
      string,
      {
        count: number;
        totalFilledBase: number;
        totalFilledQuote: number;
        totalRemainingBase: number;
        totalRemainingQuote: number;
        avgProgress: number;
      }
    >;
  };
  pagination?: {
    limit: number;
    offset: number;
    count: number;
    nextOffset: number | null;
    hasMore: boolean;
    total: number;
  };
  cachedAt?: string | null;
}
