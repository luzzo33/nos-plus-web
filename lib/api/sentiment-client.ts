import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';
import { SentimentWidgetData, SentimentChartResponse, TimeRange, ApiMeta } from './types';

export class SentimentApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/sentiment'), 'Sentiment');
  }

  async getChartData(params: {
    range?: TimeRange;
    includeComponents?: boolean;
    ma?: string;
  }): Promise<SentimentChartResponse> {
    try {
      const response = await this.axiosInstance.get('/chart', { params });
      const data = response.data.data || response.data;
      if (!data.success || !data.chart) {
        throw new Error('Invalid sentiment chart data response');
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
      const { sortBy, sortOrder, ...rest } = params || {};
      const mapped: Record<string, unknown> = { ...rest };
      if (sortBy) mapped.sort = sortBy;
      const order = typeof sortOrder === 'string' ? sortOrder.toLowerCase() : undefined;
      if (order) mapped.order = order;
      const response = await this.axiosInstance.get('/table', { params: mapped });
      const data = response.data.data || response.data;
      if (!data.success || !data.table) {
        throw new Error('Invalid sentiment table data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }

  async getWidgetData(): Promise<{ success: boolean; widget: SentimentWidgetData; meta: ApiMeta }> {
    try {
      const response = await this.axiosInstance.get('/widget');
      const data = response.data.data || response.data;
      if (!data.success || !data.widget) {
        throw new Error('Invalid sentiment widget data response');
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
        throw new Error('Invalid sentiment stats data response');
      }
      return data;
    } catch (error) {
      throw error;
    }
  }
}
