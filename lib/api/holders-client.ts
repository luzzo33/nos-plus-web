import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';
import {
  HoldersChartResponse,
  HoldersWidgetData,
  HoldersTableResponse,
  HoldersStatsResponse,
  TimeRange,
  Interval,
  ApiMeta,
} from './types';

export class HoldersApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/holders'), 'Holders');
  }

  async getChartData(params: {
    range?: TimeRange;
    startDate?: string;
    endDate?: string;
    interval?: Interval | string;
    ma?: string;
  }): Promise<HoldersChartResponse> {
    const response = await this.axiosInstance.get('/chart', { params });
    const data = response.data.data || response.data;
    if (!data.success || !data.chart) {
      throw new Error('Invalid holders chart data response');
    }
    return data;
  }

  async getTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    timeframe?: TimeRange;
    startDate?: string;
    endDate?: string;
  }): Promise<HoldersTableResponse> {
    const response = await this.axiosInstance.get('/table', { params });
    const data = response.data.data || response.data;
    if (!data.success || !data.table) {
      throw new Error('Invalid holders table data response');
    }
    return data;
  }

  async getWidgetData(): Promise<{ success: boolean; widget: HoldersWidgetData; meta: ApiMeta }> {
    const response = await this.axiosInstance.get('/widget');
    const data = response.data.data || response.data;
    if (!data.success || !data.widget) {
      throw new Error('Invalid holders widget data response');
    }
    return data;
  }

  async getStats(params: { range?: TimeRange }): Promise<HoldersStatsResponse> {
    const response = await this.axiosInstance.get('/stats', { params });
    const data = response.data.data || response.data;
    if (!data.success || !data.stats) {
      throw new Error('Invalid holders stats data response');
    }
    return data;
  }
}
