import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';
import {
  TimeRange,
  Interval,
  DistributionWidgetData,
  DistributionChartResponse,
  DistributionTableResponse,
  DistributionStatsResponse,
  ApiMeta,
} from './types';

export class DistributionApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/distribution'), 'Distribution');
  }

  async getChartData(params: {
    range?: TimeRange;
    startDate?: string;
    endDate?: string;
    interval?: Interval | string;
  }): Promise<DistributionChartResponse> {
    const response = await this.axiosInstance.get('/chart', { params });
    const data = response.data.data || response.data;
    if (!data.success || !data.chart) {
      throw new Error('Invalid distribution chart data response');
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
  }): Promise<DistributionTableResponse> {
    const { sortBy, sortOrder, timeframe, ...rest } = params || {};
    const mapped = {
      ...rest,
      sortBy,
      sortOrder,
      timeframe,
      range: timeframe,
      sort: sortBy,
      order: sortOrder ? sortOrder.toLowerCase() : undefined,
    };

    const response = await this.axiosInstance.get('/table', { params: mapped });
    const data = response.data.data || response.data;
    if (!data.success || !data.table) {
      throw new Error('Invalid distribution table data response');
    }
    return data;
  }

  async getWidgetData(): Promise<{
    success: boolean;
    widget: DistributionWidgetData;
    meta: ApiMeta;
  }> {
    const response = await this.axiosInstance.get('/widget');
    const data = response.data.data || response.data;
    if (!data.success || !data.widget) {
      throw new Error('Invalid distribution widget data response');
    }
    return data;
  }

  async getStats(params: { range?: TimeRange }): Promise<DistributionStatsResponse> {
    const response = await this.axiosInstance.get('/stats', { params });
    const data = response.data.data || response.data;
    if (!data.success || !data.stats) {
      throw new Error('Invalid distribution stats data response');
    }
    return data;
  }
}
