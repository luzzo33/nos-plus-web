import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';
import {
  ForecastChartResponse,
  ForecastWidgetData,
  ForecastRange,
  TimeRange,
  ApiMeta,
} from './types';

export class ForecastApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/forecast'), 'Forecast');
  }

  async getChartData(params: {
    range?: ForecastRange;
    startDate?: string;
    endDate?: string;
    interval?: string;
    includeHistorical?: boolean;
    indicators?: boolean;
  }): Promise<ForecastChartResponse> {
    try {
      const response = await this.axiosInstance.get('/chart', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.chart) {
        throw new Error('Invalid forecast chart data response');
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
    startDate?: string;
    endDate?: string;
  }): Promise<Record<string, unknown>> {
    try {
      const response = await this.axiosInstance.get('/table', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.table) {
        throw new Error('Invalid forecast table data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getWidgetData(): Promise<{ success: boolean; widget: ForecastWidgetData; meta: ApiMeta }> {
    try {
      const response = await this.axiosInstance.get('/widget');
      const data = response.data.data || response.data;
      if (!data.success || !data.widget) {
        throw new Error('Invalid forecast widget data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getStats(params: { range?: TimeRange }): Promise<Record<string, unknown>> {
    try {
      const response = await this.axiosInstance.get('/stats', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.stats) {
        throw new Error('Invalid forecast stats data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }
}
