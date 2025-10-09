import { getMonitorApiBase } from '@/lib/api/monitorConfig';
export interface LimitWallV2Bucket {
  side: 'buy' | 'sell';
  priceFloor: number;
  priceCeil: number;
  priceLabel: string;
  orders: number;
  baseLiquidity: number;
  usdLiquidity: number;
  cumulativeBase: number;
  source?: string;
}

export interface LimitWallDepthPoint {
  price: number;
  cumulativeBase: number;
  cumulativeUsd: number;
}

export interface LimitWallDepthChart {
  bids: LimitWallDepthPoint[];
  asks: LimitWallDepthPoint[];
}

export interface LimitWallV2Response {
  base: string;
  quote: string | null;
  decimals: number;
  bucketSize: number;
  side: string;
  buyBuckets: LimitWallV2Bucket[];
  sellBuckets: LimitWallV2Bucket[];
  totalBuyBase: number;
  totalSellBase: number;
  sources?: string[];
  depthChart?: LimitWallDepthChart;
}

export async function fetchLimitWallV2(params: {
  base?: string;
  quote?: string | null;
  decimals?: number;
  side?: 'buy' | 'sell' | 'both';
  minPrice?: number;
  maxPrice?: number;
  signal?: AbortSignal;
  apiBase?: string;
  venues?: string[];
  aggregateLevel?: number;
  limit?: number;
}): Promise<LimitWallV2Response> {
  const {
    base = 'NOS',
    quote = null,
    decimals = 1,
    side = 'both',
    minPrice,
    maxPrice,
    signal,
    apiBase,
    venues,
    aggregateLevel,
    limit,
  } = params;

  const qs = new URLSearchParams();
  qs.set('base', base);
  if (quote) qs.set('quote', quote);
  qs.set('decimals', String(decimals));
  if (side && side !== 'both') qs.set('side', side);
  if (minPrice != null) qs.set('minPrice', String(minPrice));
  if (maxPrice != null) qs.set('maxPrice', String(maxPrice));
  if (venues && venues.length) qs.set('venues', venues.join(','));
  if (aggregateLevel && Number(aggregateLevel) > 1)
    qs.set('aggregateLevel', String(aggregateLevel));
  if (limit && Number(limit) > 0) qs.set('limit', String(limit));

  const baseUrl = (apiBase ?? getMonitorApiBase()).replace(/\/$/, '');
  const url = `${baseUrl}/limit-wall-v2?${qs.toString()}`;
  const res = await fetch(url, { signal, cache: 'no-store' });
  if (!res.ok) throw new Error(`Failed fetching limit wall: ${res.status}`);
  return res.json();
}
