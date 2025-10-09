import type { TimeRange, ContractWidgetData } from './types';
import { buildNosApiUrl } from './monitorConfig';

const BALANCES_PATH = '/v3/balances';

const stripTrailingSlashes = (value: string) => value.replace(/\/+$/, '');

const normalizeBalancesPath = (pathname: string) => {
  const cleaned = stripTrailingSlashes(pathname || '');
  if (!cleaned || cleaned === '' || cleaned === '/') return BALANCES_PATH;
  if (cleaned.endsWith(BALANCES_PATH)) return cleaned;
  if (cleaned.endsWith('/v3/monitor')) return cleaned.replace(/\/v3\/monitor$/, BALANCES_PATH);
  if (cleaned.endsWith('/v3')) return `${cleaned}/balances`;
  return BALANCES_PATH;
};

const coerceBalancesBase = (candidate: string): string | null => {
  try {
    const parsed = new URL(candidate);
    parsed.pathname = normalizeBalancesPath(parsed.pathname);
    parsed.search = '';
    parsed.hash = '';
    return stripTrailingSlashes(parsed.toString());
  } catch {
    return null;
  }
};

const isLoopbackHost = (hostname: string) => {
  const normalized = hostname.toLowerCase();
  return (
    normalized === 'localhost' ||
    normalized === '127.0.0.1' ||
    normalized === '::1' ||
    normalized === '0.0.0.0'
  );
};

const acceptsAsApiHost = (urlString: string): boolean => {
  try {
    const { hostname, pathname } = new URL(urlString);
    const normalizedHost = hostname.toLowerCase();
    const hostLooksApi = normalizedHost.includes('api') || isLoopbackHost(normalizedHost);
    const hostIsNosPlus = normalizedHost.endsWith('nos.plus');
    const pathHasVersion = /\/v\d+(?:\/|$)/.test(pathname);
    if (hostIsNosPlus && !hostLooksApi) {
      return false;
    }
    return hostLooksApi || pathHasVersion;
  } catch {
    return false;
  }
};

const normalizeOverride = (candidate: string): string | null => {
  const normalized = coerceBalancesBase(candidate);
  if (!normalized) return null;
  if (!acceptsAsApiHost(normalized)) return null;
  return normalized;
};

export const resolveBalancesBaseOverride = (raw?: string | null): string | null => {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed.length) return null;

  const direct = normalizeOverride(trimmed);
  if (direct) return direct;

  if (!/^https?:\/\//i.test(trimmed)) {
    return normalizeOverride(`https://${trimmed}`);
  }

  return null;
};

const resolveBalancesBase = () => {
  const directEnv =
    process.env.NOS_BALANCES_BASE ||
    process.env.NEXT_PUBLIC_NOS_BALANCES_BASE ||
    process.env.NEXT_PUBLIC_BALANCES_BASE_URL ||
    process.env.BALANCES_HTTP_BASE;

  const override = resolveBalancesBaseOverride(directEnv);
  if (override) return override;

  return buildNosApiUrl(BALANCES_PATH);
};

export interface AccountsWidgetData {
  accounts: any;
  amounts: any;
  changes: any;
  current?: {
    accounts: { total: number; staking: number; unstaking: number; ratio: number };
    amounts: { total: number; staking: number; unstaking: number; avgPerAccount: number };
    lastUpdate: string;
  };
  ranges?: Record<'24h' | '7d' | '30d', any>;
  ath?: any;
  atl?: any;
  distribution?: any;
  activity?: any;
  growth?: any;
  health?: any;
  sparkline?: any;
}

export interface BalancesChartResponse {
  success: boolean;
  chart: {
    data: any[];
    interval: string;
    range?: string;
    metric?: string;
    dataPoints: number;
    summary?: any;
  };
  meta?: any;
}

export interface BalancesTableResponse {
  success: boolean;
  table: {
    columns: Array<{ key: string; label: string; type: string; sortable: boolean }>;
    rows: any[];
  };
  pagination?: any;
  meta?: any;
}

export interface BalancesStatsResponse {
  success: boolean;
  stats: any;
  meta: { range: string; timestamp: string; type: string };
}

export class BalancesApiClient {
  private baseUrl: string;
  constructor(baseUrl: string = resolveBalancesBase()) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const isServer = typeof window === 'undefined';
    const headers = new Headers(init?.headers ?? {});
    if (!headers.has('Accept')) {
      headers.set('Accept', 'application/json');
    }

    const serverApiKey = (
      process.env.NOS_API_KEY ||
      process.env.MONITOR_API_KEY ||
      process.env.NEXT_PUBLIC_MONITOR_API_KEY ||
      process.env.NEXT_PUBLIC_NOS_API_KEY ||
      ''
    ).trim();
    const browserApiKey = (
      process.env.NEXT_PUBLIC_MONITOR_API_KEY ||
      process.env.NEXT_PUBLIC_NOS_API_KEY ||
      ''
    ).trim();

    if (isServer) {
      if (serverApiKey) {
        headers.set('X-API-Key', serverApiKey);
        headers.set('Authorization', `Bearer ${serverApiKey}`);
      }
    } else if (browserApiKey && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${browserApiKey}`);
    }

    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      cache: 'no-store',
      headers,
      credentials: 'omit',
    });
    if (!res.ok) throw new Error(`Balances API ${res.status}: ${res.statusText}`);
    return res.json();
  }

  async getAccountsWidget(): Promise<{ success: boolean; widget: AccountsWidgetData; meta?: any }> {
    return this.request(`/accounts/widget`);
  }
  async getAccountsChart(
    params: {
      range?: TimeRange;
      startDate?: string;
      endDate?: string;
      interval?: string;
      metric?: 'counts' | 'amounts' | 'all';
      ma?: string;
    } = {},
  ): Promise<BalancesChartResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(
      ([k, v]) => v !== undefined && v !== null && search.set(k, String(v)),
    );
    const qs = search.toString() ? `?${search.toString()}` : '';
    return this.request(`/accounts/chart${qs}`);
  }
  async getAccountsTable(
    params: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
      timeframe?: string;
    } = {},
  ): Promise<BalancesTableResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(
      ([k, v]) => v !== undefined && v !== null && search.set(k, String(v)),
    );
    const qs = search.toString() ? `?${search.toString()}` : '';
    return this.request(`/accounts/table${qs}`);
  }
  async getAccountsStats(range?: TimeRange): Promise<BalancesStatsResponse> {
    const qs = range ? `?range=${encodeURIComponent(range)}` : '';
    return this.request(`/accounts/stats${qs}`);
  }

  async getContractWidget(): Promise<{ success: boolean; widget: ContractWidgetData; meta?: any }> {
    return this.request(`/contract/widget`);
  }
  async getContractChart(
    params: {
      range?: TimeRange;
      startDate?: string;
      endDate?: string;
      interval?: string;
      ma?: string;
    } = {},
  ): Promise<BalancesChartResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(
      ([k, v]) => v !== undefined && v !== null && search.set(k, String(v)),
    );
    const qs = search.toString() ? `?${search.toString()}` : '';
    return this.request(`/contract/chart${qs}`);
  }
  async getContractTable(
    params: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: string;
      startDate?: string;
      endDate?: string;
      timeframe?: string;
    } = {},
  ): Promise<BalancesTableResponse> {
    const search = new URLSearchParams();
    Object.entries(params).forEach(
      ([k, v]) => v !== undefined && v !== null && search.set(k, String(v)),
    );
    const qs = search.toString() ? `?${search.toString()}` : '';
    return this.request(`/contract/table${qs}`);
  }
  async getContractStats(range?: TimeRange): Promise<BalancesStatsResponse> {
    const qs = range ? `?range=${encodeURIComponent(range)}` : '';
    return this.request(`/contract/stats${qs}`);
  }
}
