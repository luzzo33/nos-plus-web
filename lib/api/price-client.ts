import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';
import {
  ChartResponse,
  TableResponse,
  WidgetData,
  StatsResponse,
  TimeRange,
  Interval,
  Currency,
  ApiMeta,
} from './types';

export class PriceApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/prices'), 'Price');
  }

  async getChartData(params: {
    range?: TimeRange;
    startDate?: string;
    endDate?: string;
    interval?: Interval;
    currency?: Currency;
    indicators?: string;
  }): Promise<ChartResponse> {
    try {
      const response = await this.axiosInstance.get('/chart', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.chart) {
        throw new Error('Invalid chart data response');
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
  }): Promise<TableResponse> {
    try {
      const response = await this.axiosInstance.get('/table', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.table) {
        throw new Error('Invalid table data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getWidgetData(
    currency: Currency = 'usd',
  ): Promise<{ success: boolean; widget: WidgetData; meta: ApiMeta }> {
    try {
      const response = await this.axiosInstance.get('/widget', {
        params: { currency },
      });
      const data = response.data.data || response.data;
      if (!data.success || !data.widget) {
        throw new Error('Invalid widget data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getStats(params: { range?: TimeRange; currency?: Currency }): Promise<StatsResponse> {
    try {
      const response = await this.axiosInstance.get('/stats', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.stats) {
        throw new Error('Invalid stats data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }
}
