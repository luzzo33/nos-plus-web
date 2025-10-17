import { nosApiFetch } from './nosApi';
import type { ApiMeta } from './types';
import type { ExchangeMarket, ExchangeTicker, ExchangeWidgetData } from '@/types/exchanges';

interface RawExchangeWidgetResponse {
  success?: boolean;
  widget?: unknown;
  meta?: ApiMeta;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
};

function normalizeTicker(raw: unknown): ExchangeTicker | null {
  if (!isRecord(raw)) return null;
  const base =
    typeof raw.base === 'string' && raw.base.trim().length ? raw.base.trim() : 'NOS';
  const target =
    typeof raw.target === 'string' && raw.target.trim().length ? raw.target.trim() : '';
  const tradeUrl =
    typeof raw.tradeUrl === 'string' && raw.tradeUrl.trim().length ? raw.tradeUrl.trim() : null;
  const volumeUsd = toNumber(raw.volumeUsd);
  const priceUsd = toNumber(raw.priceUsd);
  const lastTradedAt =
    typeof raw.lastTradedAt === 'string' && raw.lastTradedAt.length ? raw.lastTradedAt : null;

  return {
    base,
    target,
    tradeUrl,
    volumeUsd,
    priceUsd,
    lastTradedAt,
  };
}

function normalizeMarket(raw: unknown): ExchangeMarket | null {
  if (!isRecord(raw)) return null;
  const name =
    typeof raw.name === 'string' && raw.name.trim().length ? raw.name.trim() : null;
  const identifier =
    typeof raw.identifier === 'string' && raw.identifier.trim().length
      ? raw.identifier.trim().toLowerCase()
      : null;
  const slug =
    typeof raw.slug === 'string' && raw.slug.trim().length ? raw.slug.trim().toLowerCase() : null;

  if (!name || !identifier || !slug) return null;

  const country =
    typeof raw.country === 'string' && raw.country.trim().length ? raw.country.trim() : null;
  const trustScore =
    typeof raw.trustScore === 'string' && raw.trustScore.trim().length
      ? raw.trustScore.trim()
      : null;

  const tickersRaw = Array.isArray(raw.tickers) ? raw.tickers : [];
  const tickers = tickersRaw
    .map((ticker) => normalizeTicker(ticker))
    .filter((ticker): ticker is ExchangeTicker => Boolean(ticker));

  const totalVolumeUsd = toNumber(raw.totalVolumeUsd) ?? 0;
  const updatedAt =
    typeof raw.updatedAt === 'string' && raw.updatedAt.length ? raw.updatedAt : null;

  return {
    name,
    identifier,
    slug,
    country,
    trustScore,
    tickers,
    totalVolumeUsd,
    updatedAt,
  };
}

function normalizeWidget(raw: unknown): ExchangeWidgetData | null {
  if (!isRecord(raw)) return null;

  const updatedAt =
    typeof raw.updatedAt === 'string' && raw.updatedAt.length
      ? raw.updatedAt
      : new Date().toISOString();

  const marketsRaw = Array.isArray(raw.markets) ? raw.markets : [];
  const markets = marketsRaw
    .map((market) => normalizeMarket(market))
    .filter((market): market is ExchangeMarket => Boolean(market));

  const count =
    typeof raw.count === 'number' && Number.isFinite(raw.count)
      ? raw.count
      : markets.length;

  const source =
    typeof raw.source === 'string' && raw.source.trim().length ? raw.source.trim() : undefined;
  const stale =
    typeof raw.stale === 'boolean'
      ? raw.stale
      : typeof raw.stale === 'string'
        ? raw.stale.toLowerCase() === 'true'
        : undefined;
  const error =
    typeof raw.error === 'string' && raw.error.trim().length ? raw.error.trim() : undefined;
  const lastSuccessfulUpdate =
    typeof raw.lastSuccessfulUpdate === 'string' && raw.lastSuccessfulUpdate.length
      ? raw.lastSuccessfulUpdate
      : undefined;

  return {
    updatedAt,
    markets,
    count,
    source,
    stale,
    error: error ?? null,
    lastSuccessfulUpdate,
  };
}

export interface ExchangeWidgetResponse {
  success: boolean;
  widget: ExchangeWidgetData;
  meta?: ApiMeta;
}

export class ExchangesApiClient {
  async getWidgetData(): Promise<ExchangeWidgetResponse> {
    const raw = (await nosApiFetch('/v3/exchanges/widget')) as RawExchangeWidgetResponse;
    if (!raw?.success) {
      throw new Error('Exchange widget request failed');
    }
    const widget = normalizeWidget(raw.widget);
    if (!widget) {
      throw new Error('Exchange widget payload invalid');
    }
    return {
      success: true,
      widget,
      meta: raw.meta,
    };
  }
}
