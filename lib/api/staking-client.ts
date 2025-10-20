import type {
  ApiMeta,
  StakingChartResponse,
  StakingEarningsEventsResponse,
  StakingEarningsResponse,
  StakingJobResponse,
  StakingJobsResponse,
  StakingStatsResponse,
  StakingTableResponse,
  StakingTimeframe,
  StakingWidgetData,
  StakingWidgetRangeEntry,
  StakingWidgetResponse,
  StakingWidgetValueChange,
} from './types';
import { buildNosApiUrl, buildMonitorAuthHeaders, getMonitorApiKey } from './monitorConfig';

interface RawStakingWidgetChange {
  absolute?: number;
  percentage?: number;
  display: string;
}

interface RawStakingWidgetRangeEntry {
  high?: number;
  low?: number;
  average?: number;
  start?: number;
  changePercentage?: number;
  highDisplay?: string;
  lowDisplay?: string;
  averageDisplay?: string;
  startDisplay?: string;
  changeDisplay?: string;
}

interface RawStakingWidgetResponse {
  success: boolean;
  widget: {
    xnos: { current: number; display: string };
    apr: { current: number; display: string; tier?: string };
    ath?: {
      xnos?: { value: number | null; display: string | null; date?: string | null };
      apr?: { value: number | null; display: string | null; date?: string | null };
    };
    atl?: {
      xnos?: { value: number | null; display: string | null; date?: string | null };
      apr?: { value: number | null; display: string | null; date?: string | null };
    };
    changes?: Record<
      string,
      {
        xnos?: RawStakingWidgetChange;
        apr?: RawStakingWidgetChange;
      }
    >;
    ranges?: Record<
      string,
      {
        xnos?: RawStakingWidgetRangeEntry;
        apr?: RawStakingWidgetRangeEntry;
      }
    >;
    lastUpdate?: string;
    source?: string;
  };
  meta?: ApiMeta;
}

export class StakingApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = buildNosApiUrl('/v3/staking')) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers = new Headers(init.headers ?? {});
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }
    if (!headers.has('Content-Type') && init.body) {
      headers.set('Content-Type', 'application/json');
    }

    const defaultAuth = buildMonitorAuthHeaders();
    Object.entries(defaultAuth).forEach(([key, value]) => {
      if (value && !headers.has(key)) {
        headers.set(key, value);
      }
    });

    const apiKey = getMonitorApiKey();
    const isServer = typeof window === 'undefined';
    if (apiKey && isServer && !headers.has('x-api-key')) {
      headers.set('x-api-key', apiKey);
    }

    const res = await fetch(url, {
      cache: init.cache ?? 'no-store',
      ...init,
      headers,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      let parsed: Record<string, unknown> | null = null;
      let message =
        (res.statusText && res.statusText.trim().length > 0 ? res.statusText : '') ||
        `Request failed with status ${res.status}`;
      let code: string | undefined;
      if (text && text.trim().length > 0) {
        try {
          const candidate = JSON.parse(text);
          if (candidate && typeof candidate === 'object') {
            parsed = candidate as Record<string, unknown>;
            const parsedMessage = parsed.error;
            if (typeof parsedMessage === 'string' && parsedMessage.trim().length > 0) {
              message = parsedMessage.trim();
            } else if (!parsedMessage && typeof parsed.message === 'string') {
              const fallback = (parsed.message as string).trim();
              if (fallback.length > 0) {
                message = fallback;
              }
            }
            if (typeof parsed.code === 'string' && parsed.code.trim().length > 0) {
              code = parsed.code.trim();
            }
          } else if (text.trim().length > 0) {
            message = text.trim();
          }
        } catch {
          if (text.trim().length > 0) {
            message = text.trim();
          }
        }
      }
      const enhancedError = new Error(
        message || `Request failed with status ${res.status}`,
      ) as Error & {
        status?: number;
        code?: string;
        payload?: Record<string, unknown>;
      };
      enhancedError.status = res.status;
      if (code) {
        enhancedError.code = code;
      }
      if (parsed) {
        enhancedError.payload = parsed;
      }
      throw enhancedError;
    }
    return res.json();
  }

  private transformChange(raw?: RawStakingWidgetChange): StakingWidgetValueChange | undefined {
    if (!raw || raw.absolute === undefined || raw.absolute === null) {
      if (!raw) return undefined;
      return {
        absolute: 0,
        percentage: raw.percentage,
        display: raw.display,
        trend: 'neutral',
      };
    }
    const absolute = Number(raw.absolute);
    const percentage = raw.percentage !== undefined ? Number(raw.percentage) : undefined;
    const trend: StakingWidgetValueChange['trend'] =
      absolute === 0 ? 'neutral' : absolute > 0 ? 'up' : 'down';
    return {
      absolute,
      percentage,
      display: raw.display,
      trend,
    };
  }

  private transformRange(raw?: RawStakingWidgetRangeEntry): StakingWidgetRangeEntry | undefined {
    if (!raw) return undefined;
    return {
      high: raw.high,
      low: raw.low,
      average: raw.average,
      start: raw.start,
      changePercentage: raw.changePercentage,
      highDisplay: raw.highDisplay,
      lowDisplay: raw.lowDisplay,
      averageDisplay: raw.averageDisplay,
      startDisplay: raw.startDisplay,
      changeDisplay: raw.changeDisplay,
    };
  }

  private transformWidget(raw: RawStakingWidgetResponse): StakingWidgetResponse {
    const changeEntries = raw.widget.changes || {};
    const rangeEntries = raw.widget.ranges || {};

    const changes: StakingWidgetData['changes'] = {};
    Object.entries(changeEntries).forEach(([key, value]) => {
      const timeframe = key as StakingTimeframe;
      changes[timeframe] = {
        xnos: this.transformChange(value?.xnos),
        apr: this.transformChange(value?.apr),
      };
    });

    const ranges: StakingWidgetData['ranges'] = {};
    Object.entries(rangeEntries).forEach(([key, value]) => {
      const timeframe = key as StakingTimeframe;
      ranges[timeframe] = {
        xnos: this.transformRange(value?.xnos),
        apr: this.transformRange(value?.apr),
      };
    });

    const widget: StakingWidgetData = {
      xnos: {
        current: Number(raw.widget.xnos?.current ?? 0),
        display: raw.widget.xnos?.display ?? '—',
      },
      apr: {
        current: Number(raw.widget.apr?.current ?? 0),
        display: raw.widget.apr?.display ?? '—',
        tier: raw.widget.apr?.tier,
      },
      changes,
      ranges,
      ath: raw.widget.ath,
      atl: raw.widget.atl,
      lastUpdate: raw.widget.lastUpdate,
      source: raw.widget.source,
    };

    return { success: raw.success, widget, meta: raw.meta };
  }

  async getWidget(): Promise<StakingWidgetResponse> {
    const raw = await this.request<RawStakingWidgetResponse>('/widget');
    return this.transformWidget(raw);
  }

  async getChart(
    params: {
      range?: string;
      startDate?: string;
      endDate?: string;
      interval?: string;
      metric?: string;
    } = {},
  ): Promise<StakingChartResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) search.set(k, String(v));
    });
    const qs = search.toString() ? `?${search.toString()}` : '';
    return this.request<StakingChartResponse>(`/chart${qs}`);
  }

  async getStats(range?: string): Promise<StakingStatsResponse> {
    const qs = range ? `?range=${encodeURIComponent(range)}` : '';
    return this.request<StakingStatsResponse>(`/stats${qs}`);
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
  ): Promise<StakingTableResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) search.set(k, String(v));
    });
    const qs = search.toString() ? `?${search.toString()}` : '';
    return this.request<StakingTableResponse>(`/table${qs}`);
  }

  async getEarnings(params: {
    wallet: string;
    forceRefresh?: boolean;
    debug?: boolean;
  }): Promise<StakingEarningsResponse> {
    const search = new URLSearchParams();
    search.set('wallet', params.wallet);
    if (params.forceRefresh != null) search.set('forceRefresh', String(params.forceRefresh));
    if (params.debug) search.set('debug', '1');
    const qs = `?${search.toString()}`;
    return this.request<StakingEarningsResponse>(`/earnings${qs}`);
  }

  async getEarningsEvents(params: {
    wallet: string;
    limit?: number;
    offset?: number;
    order?: 'asc' | 'desc';
    types?: string[];
    start?: string;
    end?: string;
    page?: number;
    sortBy?: 'timestamp' | 'type' | 'amount' | 'usdValue' | 'priceUsd';
  }): Promise<StakingEarningsEventsResponse> {
    const search = new URLSearchParams();
    search.set('wallet', params.wallet);
    if (params.limit != null) search.set('limit', String(params.limit));
    if (params.offset != null) search.set('offset', String(params.offset));
    if (params.order) search.set('order', params.order);
    if (params.types && params.types.length) {
      search.set('types', params.types.join(','));
    }
    if (params.start) search.set('start', params.start);
    if (params.end) search.set('end', params.end);
    if (params.page != null) search.set('page', String(params.page));
    if (params.sortBy) search.set('sortBy', params.sortBy);
    const qs = `?${search.toString()}`;
    try {
      return await this.request<StakingEarningsEventsResponse>(`/earnings/events${qs}`);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        throw new Error(
          'Wallet event history is not available yet on this environment. Please sync again in a few minutes.',
        );
      }
      throw error;
    }
  }

  async refreshEarnings(params: {
    wallet: string;
    forceRefresh?: boolean;
    debug?: boolean;
  }): Promise<StakingEarningsResponse> {
    return this.request<StakingEarningsResponse>('/earnings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet: params.wallet,
        forceRefresh: params.forceRefresh,
        debug: params.debug,
      }),
    });
  }

  async listJobs(): Promise<StakingJobsResponse> {
    return this.request<StakingJobsResponse>('/jobs');
  }

  async getJob(jobId: string): Promise<StakingJobResponse> {
    return this.request<StakingJobResponse>(`/jobs/${encodeURIComponent(jobId)}`);
  }

  async createJob(params: {
    wallet: string;
    mode?: 'initial' | 'incremental' | 'force' | 'empty';
    debug?: boolean;
  }): Promise<StakingJobResponse> {
    return this.request<StakingJobResponse>('/jobs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        wallet: params.wallet,
        mode: params.mode,
        debug: params.debug,
      }),
    });
  }
}
