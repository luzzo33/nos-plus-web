import type { ApiMeta, RaydiumWidgetData } from './types';
import { buildNosApiUrl } from './monitorConfig';

interface RawRaydiumWidgetResponse {
  success: boolean;
  widget: {
    liquidity: { current: number; display: string; tvl?: number; tvlDisplay?: string };
    apr: {
      current: number;
      display: string;
      tier?: string;
      spread?: number;
      spreadDisplay?: string;
    };
    ath?: {
      liquidity?: { value: number | null; display: string | null; date?: string | null };
      apr?: { value: number | null; display: string | null; date?: string | null };
    };
    atl?: {
      liquidity?: { value: number | null; display: string | null; date?: string | null };
      apr?: { value: number | null; display: string | null; date?: string | null };
    };
    changes: Record<
      string,
      {
        liquidity?: { absolute: number; percentage: number; display: string };
        apr?: { absolute: number; percentage: number; display: string };
      }
    >;
    ranges?: unknown;
    statistics?: unknown;
    records?: unknown;
    health?: unknown;
    comparison?: unknown;
    lastUpdate: string;
    source: string;
  };
  meta?: ApiMeta;
}

interface RaydiumWidgetResponse {
  success: boolean;
  widget: RaydiumWidgetData;
  meta?: ApiMeta;
}

export interface RaydiumChartPoint {
  timestamp: string;
  liquidity?: number;
  apr?: number;
  price?: number;
  volume?: number;
  priceImpact?: number;
  source?: string;
}

export interface RaydiumChartResponse {
  success: boolean;
  chart: {
    data: RaydiumChartPoint[];
    summary: Record<string, unknown>;
    metadata: {
      range: string;
      interval: string;
      dataPoints: number;
      startDate: string;
      endDate: string;
      metric: string;
      indicators?: string[];
    };
  };
  meta?: ApiMeta;
}

export interface RaydiumStatsResponse {
  success: boolean;
  stats: Record<string, unknown>;
  meta: { timestamp: string; type: string };
}

export interface RaydiumTableResponse {
  success: boolean;
  table: {
    columns: Array<{ key: string; label: string; type: string; sortable: boolean }>;
    rows: Array<Record<string, unknown>>;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  summary?: Record<string, unknown>;
  meta: { timestamp: string; type: string };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const toNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.length) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
};

const mapTrend = (absolute: number): 'up' | 'down' | 'neutral' => {
  if (absolute === 0) return 'neutral';
  return absolute > 0 ? 'up' : 'down';
};

type RawChangeEntry = { absolute: number; percentage: number; display: string };

const normalizeWidgetChange = (raw?: RawChangeEntry) => {
  if (!raw || typeof raw.absolute !== 'number' || typeof raw.display !== 'string') {
    return undefined;
  }
  const percentage =
    typeof raw.percentage === 'number' && Number.isFinite(raw.percentage)
      ? raw.percentage
      : (toNumber(raw.percentage) ?? 0);
  return {
    absolute: raw.absolute,
    percentage,
    display: raw.display,
    trend: mapTrend(raw.absolute),
  } as const;
};

const normalizeChartPoint = (value: unknown): RaydiumChartPoint | null => {
  if (!isRecord(value)) return null;
  const timestamp =
    typeof value.timestamp === 'string'
      ? value.timestamp
      : typeof value.t === 'string'
        ? value.t
        : null;
  if (!timestamp) return null;
  const point: RaydiumChartPoint = {
    timestamp,
  };
  const liquidity = toNumber(value.liquidity ?? value.tvl);
  if (liquidity !== undefined) point.liquidity = liquidity;
  const apr = toNumber(value.apr);
  if (apr !== undefined) point.apr = apr;
  const price = toNumber(value.price);
  if (price !== undefined) point.price = price;
  const volume = toNumber(value.volume);
  if (volume !== undefined) point.volume = volume;
  const priceImpact = toNumber(value.priceImpact ?? value.price_impact);
  if (priceImpact !== undefined) point.priceImpact = priceImpact;
  if (typeof value.source === 'string') point.source = value.source;
  return point;
};

export class RaydiumApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = buildNosApiUrl('/v3/raydium')) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      ...init,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(init?.headers || {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Raydium API ${res.status}: ${text || res.statusText}`);
    }
    return res.json();
  }

  private transformWidget(raw: RawRaydiumWidgetResponse): RaydiumWidgetResponse {
    const changes: RaydiumWidgetData['changes'] = {};
    for (const [rangeKey, changeValue] of Object.entries(raw.widget.changes ?? {})) {
      const key = rangeKey as keyof RaydiumWidgetData['changes'];
      changes[key] = {
        apr: normalizeWidgetChange(changeValue?.apr),
        liquidity: normalizeWidgetChange(changeValue?.liquidity),
      };
    }

    const ranges = raw.widget.ranges as unknown as RaydiumWidgetData['ranges'] | undefined;

    const widget: RaydiumWidgetData = {
      current: {
        apr: {
          value: toNumber(raw.widget.apr.current) ?? 0,
          display:
            typeof raw.widget.apr.display === 'string'
              ? raw.widget.apr.display
              : String(raw.widget.apr.display ?? ''),
        },
        liquidity: {
          value: toNumber(raw.widget.liquidity.current) ?? 0,
          display:
            typeof raw.widget.liquidity.display === 'string'
              ? raw.widget.liquidity.display
              : String(raw.widget.liquidity.display ?? ''),
        },
        lastUpdate: raw.widget.lastUpdate,
      },
      changes,
      ath: raw.widget.ath,
      atl: raw.widget.atl,
      meta: { source: raw.widget.source },
    };

    if (ranges) {
      widget.ranges = ranges;
    }

    return { success: raw.success, widget, meta: raw.meta };
  }

  async getWidget(range?: string): Promise<RaydiumWidgetResponse> {
    const qs = range ? `?range=${encodeURIComponent(range)}` : '';
    const raw = await this.request<RawRaydiumWidgetResponse>(`/widget${qs}`);
    return this.transformWidget(raw);
  }

  async getWidgetAll(): Promise<RaydiumWidgetResponse> {
    const raw = await this.request<RawRaydiumWidgetResponse>(`/widget`);
    return this.transformWidget(raw);
  }

  async getChart(
    params: {
      range?: string;
      interval?: string;
      metric?: string;
      ma?: string;
      include?: string;
    } = {},
  ): Promise<RaydiumChartResponse> {
    const search = new URLSearchParams();
    if (params.range) search.set('range', params.range);
    if (params.interval) search.set('interval', params.interval);
    if (params.metric) search.set('metric', params.metric);
    if (params.ma) search.set('ma', params.ma);
    if (params.include) search.set('include', params.include);
    const qs = search.toString() ? `?${search.toString()}` : '';

    const raw = await this.request<unknown>(`/chart${qs}`);
    const rawRecord = isRecord(raw) ? raw : {};
    const chartNode = isRecord(rawRecord.chart) ? rawRecord.chart : rawRecord;
    const dataSource = chartNode?.data;
    let candidateData: unknown[] = [];
    if (Array.isArray(dataSource)) {
      candidateData = dataSource;
    } else if (isRecord(dataSource) && Array.isArray(dataSource.data)) {
      candidateData = dataSource.data;
    }

    const dataArray = candidateData
      .map(normalizeChartPoint)
      .filter((point): point is RaydiumChartPoint => point !== null);

    const summary = isRecord(chartNode?.summary)
      ? chartNode.summary
      : isRecord(rawRecord.summary)
        ? rawRecord.summary
        : {};

    const metadataSource = isRecord(chartNode?.metadata) ? chartNode.metadata : {};
    const metadata: RaydiumChartResponse['chart']['metadata'] = {
      range: typeof metadataSource.range === 'string' ? metadataSource.range : (params.range ?? ''),
      interval:
        typeof metadataSource.interval === 'string'
          ? metadataSource.interval
          : (params.interval ?? ''),
      dataPoints:
        typeof metadataSource.dataPoints === 'number' && Number.isFinite(metadataSource.dataPoints)
          ? metadataSource.dataPoints
          : dataArray.length,
      startDate: typeof metadataSource.startDate === 'string' ? metadataSource.startDate : '',
      endDate: typeof metadataSource.endDate === 'string' ? metadataSource.endDate : '',
      metric:
        typeof metadataSource.metric === 'string' ? metadataSource.metric : (params.metric ?? ''),
      indicators: Array.isArray(metadataSource.indicators)
        ? metadataSource.indicators.filter((entry): entry is string => typeof entry === 'string')
        : undefined,
    };

    const meta = isRecord(rawRecord.meta) ? (rawRecord.meta as ApiMeta) : undefined;
    const success = typeof rawRecord.success === 'boolean' ? rawRecord.success : true;

    return {
      success,
      chart: { data: dataArray, summary, metadata },
      meta,
    };
  }

  async getStats(range?: string): Promise<RaydiumStatsResponse> {
    const qs = range ? `?range=${encodeURIComponent(range)}` : '';
    return this.request<RaydiumStatsResponse>(`/stats${qs}`);
  }

  async getTable(
    params: {
      page?: number;
      limit?: number;
      startDate?: string;
      endDate?: string;
      sortBy?: string;
      sortOrder?: string;
      timeframe?: string;
    } = {},
  ): Promise<RaydiumTableResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) search.set(k, String(v));
    });
    const qs = search.toString() ? `?${search.toString()}` : '';
    return this.request<RaydiumTableResponse>(`/table${qs}`);
  }
}
