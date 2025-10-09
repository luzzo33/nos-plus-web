import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';
import {
  RichListChartResponse,
  RichListTableResponse,
  RichListWidgetData,
  RichListStatsResponse,
  RichListRange,
} from './types';

export class RichListApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/rich-list'), 'RichList');
  }

  async getChartData(params: {
    range?: RichListRange;
    startDate?: string;
    endDate?: string;
    interval?: string;
    top?: number;
    address?: string;
  }): Promise<RichListChartResponse> {
    const response = await this.axiosInstance.get('/chart', { params });
    const data = response.data?.data || response.data;
    if (!data?.success || !data?.chart) {
      throw new Error('Invalid rich list chart data response');
    }
    return data;
  }

  async getTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    date?: string;
  }): Promise<RichListTableResponse> {
    const response = await this.axiosInstance.get('/table', { params });
    const data = response.data?.data || response.data;
    if (!data?.success || !data?.table) {
      throw new Error('Invalid rich list table data response');
    }
    return data;
  }

  async getWidgetData(): Promise<{
    success: boolean;
    widget: RichListWidgetData;
    meta?: Record<string, unknown>;
  }> {
    const response = await this.axiosInstance.get('/widget');
    const data = response.data?.data || response.data;
    if (!data?.success || !data?.widget) {
      throw new Error('Invalid rich list widget data response');
    }
    return data;
  }

  async getStats(params: { range?: RichListRange }): Promise<RichListStatsResponse> {
    const response = await this.axiosInstance.get('/stats', { params });
    const data = response.data?.data || response.data;
    if (!data?.success || !data?.stats) {
      throw new Error('Invalid rich list stats data response');
    }
    return data;
  }
}
