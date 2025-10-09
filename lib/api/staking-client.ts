import type {
  StakingWidgetData,
  StakingWidgetResponse,
  StakingTimeframe,
  StakingWidgetValueChange,
  StakingWidgetRangeEntry,
  ApiMeta,
} from './types';
import { buildNosApiUrl } from './monitorConfig';

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

  private async request<T = unknown>(path: string, init?: RequestInit): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      ...init,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`Staking API ${res.status}: ${text || res.statusText}`);
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
  ): Promise<Record<string, unknown>> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) search.set(k, String(v));
    });
    const qs = search.toString() ? `?${search.toString()}` : '';
    return this.request<Record<string, unknown>>(`/chart${qs}`);
  }

  async getStats(range?: string): Promise<Record<string, unknown>> {
    const qs = range ? `?range=${encodeURIComponent(range)}` : '';
    return this.request<Record<string, unknown>>(`/stats${qs}`);
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
  ): Promise<Record<string, unknown>> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) search.set(k, String(v));
    });
    const qs = search.toString() ? `?${search.toString()}` : '';
    return this.request<Record<string, unknown>>(`/table${qs}`);
  }
}
