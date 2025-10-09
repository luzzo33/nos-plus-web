import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';
import {
  VolumeChartResponse,
  VolumeTableResponse,
  VolumeWidgetData,
  VolumeStatsResponse,
  TimeRange,
  Interval,
  Currency,
  ApiMeta,
} from './types';

export class VolumeApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/volume'), 'Volume');
  }

  async getChartData(params: {
    range?: TimeRange;
    startDate?: string;
    endDate?: string;
    interval?: Interval;
    cumulative?: boolean;
    ma?: string;
  }): Promise<VolumeChartResponse> {
    try {
      const response = await this.axiosInstance.get('/chart', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.chart) {
        throw new Error('Invalid volume chart data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getTableData(params: {
    page?: number;
    limit?: number;
    sortBy?: string;
    sortOrder?: 'ASC' | 'DESC';
    timeframe?: TimeRange;
    startDate?: string;
    endDate?: string;
    currency?: Currency;
  }): Promise<VolumeTableResponse> {
    try {
      const response = await this.axiosInstance.get('/table', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.table) {
        throw new Error('Invalid volume table data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getWidgetData(): Promise<{ success: boolean; widget: VolumeWidgetData; meta: ApiMeta }> {
    try {
      const response = await this.axiosInstance.get('/widget');
      const data = response.data.data || response.data;
      if (!data.success || !data.widget) {
        throw new Error('Invalid volume widget data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getStats(params: { range?: TimeRange }): Promise<VolumeStatsResponse> {
    try {
      const response = await this.axiosInstance.get('/stats', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.stats) {
        throw new Error('Invalid volume stats data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }
}
