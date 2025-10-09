'use client';

import { useState } from 'react';
import { apiClient } from '@/lib/api/client';
import { TimeRange, Interval, Currency, ForecastRange } from '@/lib/api/types';

interface EndpointConfig {
  name: string;
  category: string;
  description: string;
  params: {
    [key: string]: {
      type: 'select' | 'number' | 'text' | 'date' | 'boolean';
      options?: string[] | number[];
      default?: any;
      description?: string;
      required?: boolean;
    };
  };
  execute: (params: any) => Promise<any>;
}

const timeRanges: TimeRange[] = ['1h', '4h', '24h', '7d', '30d', '90d', '180d', '1y', 'all'];
const intervals: Interval[] = ['5m', '15m', '1h', '4h', '1d', '1w', '1M', 'raw', 'auto'];
const currencies: Currency[] = ['usd'];
const forecastRanges: ForecastRange[] = ['1m', '3m', '6m', '1y', 'all'];

const endpoints: EndpointConfig[] = [
  {
    name: 'getChartData',
    category: 'Price',
    description: 'Get price chart data with technical indicators',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '7d',
        description: 'Time range for data',
      },
      startDate: { type: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'date', description: 'End date (YYYY-MM-DD)' },
      interval: {
        type: 'select',
        options: intervals,
        default: 'auto',
        description: 'Data interval',
      },
      currency: {
        type: 'select',
        options: currencies,
        default: 'usd',
        description: 'Currency for price data',
      },
      indicators: { type: 'text', description: 'Technical indicators (comma-separated)' },
    },
    execute: (params) => apiClient.getChartData(params),
  },
  {
    name: 'getTableData',
    category: 'Price',
    description: 'Get paginated price table data',
    params: {
      page: { type: 'number', default: 1, description: 'Page number' },
      limit: { type: 'number', default: 20, description: 'Items per page' },
      sortBy: { type: 'text', description: 'Sort field' },
      sortOrder: {
        type: 'select',
        options: ['ASC', 'DESC'],
        default: 'DESC',
        description: 'Sort order',
      },
      timeframe: { type: 'select', options: timeRanges, description: 'Time frame filter' },
      startDate: { type: 'date', description: 'Start date filter' },
      endDate: { type: 'date', description: 'End date filter' },
      currency: { type: 'select', options: currencies, default: 'usd', description: 'Currency' },
    },
    execute: (params) => apiClient.getTableData(params),
  },
  {
    name: 'getWidgetData',
    category: 'Price',
    description: 'Get current price widget data',
    params: {
      currency: {
        type: 'select',
        options: currencies,
        default: 'usd',
        description: 'Currency for price data',
      },
    },
    execute: (params) => apiClient.getWidgetData(params.currency),
  },
  {
    name: 'getStats',
    category: 'Price',
    description: 'Get price statistics',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '24h',
        description: 'Time range for stats',
      },
      currency: { type: 'select', options: currencies, default: 'usd', description: 'Currency' },
    },
    execute: (params) => apiClient.getStats(params),
  },

  {
    name: 'getVolumeChartData',
    category: 'Volume',
    description: 'Get volume chart data',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '7d',
        description: 'Time range for data',
      },
      startDate: { type: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'date', description: 'End date (YYYY-MM-DD)' },
      interval: {
        type: 'select',
        options: intervals,
        default: 'auto',
        description: 'Data interval',
      },
      cumulative: { type: 'boolean', default: false, description: 'Show cumulative volume' },
      ma: { type: 'text', description: 'Moving average periods (comma-separated)' },
    },
    execute: (params) => apiClient.getVolumeChartData(params),
  },
  {
    name: 'getVolumeTableData',
    category: 'Volume',
    description: 'Get paginated volume table data',
    params: {
      page: { type: 'number', default: 1, description: 'Page number' },
      limit: { type: 'number', default: 20, description: 'Items per page' },
      sortBy: { type: 'text', description: 'Sort field' },
      sortOrder: {
        type: 'select',
        options: ['ASC', 'DESC'],
        default: 'DESC',
        description: 'Sort order',
      },
      timeframe: { type: 'select', options: timeRanges, description: 'Time frame filter' },
      startDate: { type: 'date', description: 'Start date filter' },
      endDate: { type: 'date', description: 'End date filter' },
      currency: { type: 'select', options: currencies, default: 'usd', description: 'Currency' },
    },
    execute: (params) => apiClient.getVolumeTableData(params),
  },
  {
    name: 'getVolumeWidgetData',
    category: 'Volume',
    description: 'Get current volume widget data',
    params: {},
    execute: () => apiClient.getVolumeWidgetData(),
  },
  {
    name: 'getVolumeStats',
    category: 'Volume',
    description: 'Get volume statistics',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '24h',
        description: 'Time range for stats',
      },
    },
    execute: (params) => apiClient.getVolumeStats(params),
  },

  {
    name: 'getSentimentChartData',
    category: 'Sentiment',
    description: 'Get sentiment chart data',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '7d',
        description: 'Time range for data',
      },
      includeComponents: {
        type: 'boolean',
        default: false,
        description: 'Include sentiment components',
      },
    },
    execute: (params) => apiClient.getSentimentChartData(params),
  },
  {
    name: 'getSentimentTableData',
    category: 'Sentiment',
    description: 'Get paginated sentiment table data',
    params: {
      page: { type: 'number', default: 1, description: 'Page number' },
      limit: { type: 'number', default: 20, description: 'Items per page' },
      sortBy: { type: 'text', description: 'Sort field' },
      sortOrder: {
        type: 'select',
        options: ['ASC', 'DESC'],
        default: 'DESC',
        description: 'Sort order',
      },
      startDate: { type: 'date', description: 'Start date filter' },
      endDate: { type: 'date', description: 'End date filter' },
    },
    execute: (params) => apiClient.getSentimentTableData(params),
  },
  {
    name: 'getSentimentWidgetData',
    category: 'Sentiment',
    description: 'Get current sentiment widget data',
    params: {},
    execute: () => apiClient.getSentimentWidgetData(),
  },
  {
    name: 'getSentimentStats',
    category: 'Sentiment',
    description: 'Get sentiment statistics',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '24h',
        description: 'Time range for stats',
      },
    },
    execute: (params) => apiClient.getSentimentStats(params),
  },
  {
    name: 'getSentimentFeedbackStats',
    category: 'Sentiment',
    description: 'Get community sentiment feedback statistics',
    params: {
      period: {
        type: 'select',
        options: ['24h', '7d', '30d'],
        default: '24h',
        description: 'Period for aggregating votes',
      },
    },
    execute: (params) => apiClient.getSentimentFeedbackStats(params),
  },

  {
    name: 'getForecastChartData',
    category: 'Forecast',
    description: 'Get forecast chart data',
    params: {
      range: {
        type: 'select',
        options: forecastRanges,
        default: '1m',
        description: 'Forecast range',
      },
      startDate: { type: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'date', description: 'End date (YYYY-MM-DD)' },
      interval: { type: 'text', description: 'Data interval' },
      includeHistorical: { type: 'boolean', default: true, description: 'Include historical data' },
      indicators: { type: 'boolean', default: false, description: 'Include technical indicators' },
    },
    execute: (params) => apiClient.getForecastChartData(params),
  },
  {
    name: 'getForecastTableData',
    category: 'Forecast',
    description: 'Get paginated forecast table data',
    params: {
      page: { type: 'number', default: 1, description: 'Page number' },
      limit: { type: 'number', default: 20, description: 'Items per page' },
      sortBy: { type: 'text', description: 'Sort field' },
      sortOrder: {
        type: 'select',
        options: ['ASC', 'DESC'],
        default: 'DESC',
        description: 'Sort order',
      },
      startDate: { type: 'date', description: 'Start date filter' },
      endDate: { type: 'date', description: 'End date filter' },
    },
    execute: (params) => apiClient.getForecastTableData(params),
  },
  {
    name: 'getForecastWidgetData',
    category: 'Forecast',
    description: 'Get current forecast widget data',
    params: {},
    execute: () => apiClient.getForecastWidgetData(),
  },
  {
    name: 'getForecastStats',
    category: 'Forecast',
    description: 'Get forecast statistics',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '24h',
        description: 'Time range for stats',
      },
    },
    execute: (params) => apiClient.getForecastStats(params),
  },
  {
    name: 'getHoldersChartData',
    category: 'Holders',
    description: 'Get holders chart data',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '7d',
        description: 'Time range for data',
      },
      startDate: { type: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'date', description: 'End date (YYYY-MM-DD)' },
      interval: {
        type: 'select',
        options: intervals,
        default: 'auto',
        description: 'Data interval',
      },
      ma: { type: 'text', description: 'Moving average periods (comma-separated)' },
    },
    execute: (params) => apiClient.getHoldersChartData(params),
  },
  {
    name: 'getHoldersTableData',
    category: 'Holders',
    description: 'Get paginated holders table data',
    params: {
      page: { type: 'number', default: 1, description: 'Page number' },
      limit: { type: 'number', default: 20, description: 'Items per page' },
      sortBy: { type: 'text', description: 'Sort field' },
      sortOrder: {
        type: 'select',
        options: ['ASC', 'DESC'],
        default: 'DESC',
        description: 'Sort order',
      },
      timeframe: {
        type: 'select',
        options: timeRanges,
        default: '7d',
        description: 'Time frame filter',
      },
      startDate: { type: 'date', description: 'Start date filter' },
      endDate: { type: 'date', description: 'End date filter' },
    },
    execute: (params) => apiClient.getHoldersTableData(params),
  },
  {
    name: 'getHoldersWidgetData',
    category: 'Holders',
    description: 'Get current holders widget data',
    params: {},
    execute: () => apiClient.getHoldersWidgetData(),
  },
  {
    name: 'getHoldersStats',
    category: 'Holders',
    description: 'Get holders statistics',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '30d',
        description: 'Time range for stats',
      },
    },
    execute: (params) => apiClient.getHoldersStats(params),
  },

  {
    name: 'getDistributionChartData',
    category: 'Distribution',
    description: 'Get distribution chart data with wallet category breakdowns',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '7d',
        description: 'Time range for data',
      },
      startDate: { type: 'date', description: 'Start date (YYYY-MM-DD)' },
      endDate: { type: 'date', description: 'End date (YYYY-MM-DD)' },
      interval: {
        type: 'select',
        options: intervals,
        default: 'auto',
        description: 'Data interval',
      },
    },
    execute: (params) => apiClient.getDistributionChartData(params),
  },
  {
    name: 'getDistributionTableData',
    category: 'Distribution',
    description: 'Get paginated distribution table data',
    params: {
      page: { type: 'number', default: 1, description: 'Page number' },
      limit: { type: 'number', default: 20, description: 'Items per page' },
      sortBy: { type: 'text', description: 'Sort field' },
      sortOrder: {
        type: 'select',
        options: ['ASC', 'DESC'],
        default: 'DESC',
        description: 'Sort order',
      },
      timeframe: {
        type: 'select',
        options: timeRanges,
        default: '7d',
        description: 'Time frame filter',
      },
      startDate: { type: 'date', description: 'Start date filter' },
      endDate: { type: 'date', description: 'End date filter' },
    },
    execute: (params) => apiClient.getDistributionTableData(params),
  },
  {
    name: 'getDistributionWidgetData',
    category: 'Distribution',
    description: 'Get current distribution widget data with category-based insights',
    params: {},
    execute: () => apiClient.getDistributionWidgetData(),
  },
  {
    name: 'getDistributionStats',
    category: 'Distribution',
    description: 'Get distribution statistics across wallet categories',
    params: {
      range: {
        type: 'select',
        options: timeRanges,
        default: '30d',
        description: 'Time range for stats',
      },
    },
    execute: (params) => apiClient.getDistributionStats(params),
  },
];

export default function ApiTestPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('');
  const [params, setParams] = useState<{ [key: string]: any }>({});
  const [results, setResults] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [responseTime, setResponseTime] = useState<number | null>(null);

  const [selectedEndpoints, setSelectedEndpoints] = useState<string[]>([]);
  const [bulkResults, setBulkResults] = useState<{ [key: string]: any }>({});
  const [bulkLoading, setBulkLoading] = useState<boolean>(false);
  const [showBulkMode, setShowBulkMode] = useState<boolean>(false);

  const categories = Array.from(new Set(endpoints.map((e) => e.category)));
  const filteredEndpoints = selectedCategory
    ? endpoints.filter((e) => e.category === selectedCategory)
    : [];

  const currentEndpoint = endpoints.find((e) => e.name === selectedEndpoint);

  const handleParamChange = (paramName: string, value: any) => {
    setParams((prev) => ({
      ...prev,
      [paramName]: value,
    }));
  };

  const executeEndpoint = async () => {
    if (!currentEndpoint) return;

    setLoading(true);
    const startTime = Date.now();

    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, v]) => v !== '' && v !== null && v !== undefined),
      );

      const result = await currentEndpoint.execute(cleanParams);
      const endTime = Date.now();

      setResults({
        success: true,
        data: result,
        timestamp: new Date().toISOString(),
        params: cleanParams,
      });
      setResponseTime(endTime - startTime);
    } catch (error: any) {
      const endTime = Date.now();
      setResults({
        success: false,
        error: error.message,
        details: error.response?.data || error,
        timestamp: new Date().toISOString(),
        params,
      });
      setResponseTime(endTime - startTime);
    } finally {
      setLoading(false);
    }
  };

  const initializeParams = (endpoint: EndpointConfig) => {
    const initialParams: { [key: string]: any } = {};
    Object.entries(endpoint.params).forEach(([key, config]) => {
      if (config.default !== undefined) {
        initialParams[key] = config.default;
      }
    });
    setParams(initialParams);
  };

  const handleEndpointSelect = (endpointName: string) => {
    setSelectedEndpoint(endpointName);
    const endpoint = endpoints.find((e) => e.name === endpointName);
    if (endpoint) {
      initializeParams(endpoint);
    }
    setResults({});
    setResponseTime(null);
  };

  const handleBulkEndpointToggle = (endpointName: string) => {
    setSelectedEndpoints((prev) =>
      prev.includes(endpointName)
        ? prev.filter((name) => name !== endpointName)
        : [...prev, endpointName],
    );
  };

  const executeBulkTest = async () => {
    if (selectedEndpoints.length === 0) return;

    setBulkLoading(true);
    setBulkResults({});

    const results: { [key: string]: any } = {};

    for (const endpointName of selectedEndpoints) {
      const endpoint = endpoints.find((e) => e.name === endpointName);
      if (!endpoint) continue;

      const startTime = Date.now();

      try {
        const defaultParams: { [key: string]: any } = {};
        Object.entries(endpoint.params).forEach(([key, config]) => {
          if (config.default !== undefined) {
            defaultParams[key] = config.default;
          }
        });

        const result = await endpoint.execute(defaultParams);
        const endTime = Date.now();

        results[endpointName] = {
          success: true,
          data: result,
          responseTime: endTime - startTime,
          params: defaultParams,
          category: endpoint.category,
          description: endpoint.description,
        };
      } catch (error: any) {
        const endTime = Date.now();
        results[endpointName] = {
          success: false,
          error: error.message,
          details: error.response?.data || error,
          responseTime: endTime - startTime,
          category: endpoint.category,
          description: endpoint.description,
        };
      }
    }

    setBulkResults(results);
    setBulkLoading(false);
  };

  const getEndpointsByCategory = (category: string) => {
    return endpoints.filter((e) => e.category === category);
  };

  const getCategoryInsights = (category: string) => {
    const categoryEndpoints = getEndpointsByCategory(category);
    const allParams = new Set<string>();
    const paramTypes: { [key: string]: string } = {};

    categoryEndpoints.forEach((endpoint) => {
      Object.entries(endpoint.params).forEach(([paramName, config]) => {
        allParams.add(paramName);
        paramTypes[paramName] = config.type;
      });
    });

    return {
      totalEndpoints: categoryEndpoints.length,
      endpoints: categoryEndpoints.map((e) => ({
        name: e.name,
        description: e.description,
        paramCount: Object.keys(e.params).length,
      })),
      commonParams: Array.from(allParams),
      paramTypes,
    };
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">NOS API Test Suite</h1>
        <p className="text-muted-foreground">
          Interactive testing interface for all NOS API endpoints
        </p>

        {/* Mode Toggle */}
        <div className="flex justify-center mt-4">
          <div className="flex bg-muted rounded-lg p-1">
            <button
              onClick={() => setShowBulkMode(false)}
              className={`px-4 py-2 rounded-md transition-colors ${
                !showBulkMode ? 'bg-background shadow-sm' : 'hover:bg-muted-foreground/10'
              }`}
            >
              Single Test
            </button>
            <button
              onClick={() => setShowBulkMode(true)}
              className={`px-4 py-2 rounded-md transition-colors ${
                showBulkMode ? 'bg-background shadow-sm' : 'hover:bg-muted-foreground/10'
              }`}
            >
              Bulk Test
            </button>
          </div>
        </div>
      </div>

      {showBulkMode ? (
        /* Bulk Testing Mode */
        <div className="space-y-6">
          {/* Endpoint Selection for Bulk */}
          <div className="card-base p-6">
            <h2 className="text-xl font-semibold mb-4">Bulk Test Configuration</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {categories.map((category) => {
                const categoryEndpoints = getEndpointsByCategory(category);
                const selectedInCategory = selectedEndpoints.filter((name) =>
                  categoryEndpoints.some((e) => e.name === name),
                ).length;

                return (
                  <div key={category} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-medium">{category} API</h3>
                      <span className="text-xs bg-muted px-2 py-1 rounded">
                        {selectedInCategory}/{categoryEndpoints.length}
                      </span>
                    </div>

                    <div className="space-y-2">
                      {categoryEndpoints.map((endpoint) => (
                        <label
                          key={endpoint.name}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedEndpoints.includes(endpoint.name)}
                            onChange={() => handleBulkEndpointToggle(endpoint.name)}
                            className="rounded"
                          />
                          <span className="text-sm">{endpoint.name}</span>
                        </label>
                      ))}
                    </div>

                    <div className="mt-3 pt-3 border-t">
                      <button
                        onClick={() => {
                          const categoryEndpointNames = categoryEndpoints.map((e) => e.name);
                          const allSelected = categoryEndpointNames.every((name) =>
                            selectedEndpoints.includes(name),
                          );

                          if (allSelected) {
                            setSelectedEndpoints((prev) =>
                              prev.filter((name) => !categoryEndpointNames.includes(name)),
                            );
                          } else {
                            setSelectedEndpoints((prev) => [
                              ...new Set([...prev, ...categoryEndpointNames]),
                            ]);
                          }
                        }}
                        className="text-xs text-primary hover:text-primary/80"
                      >
                        {categoryEndpoints.every((e) => selectedEndpoints.includes(e.name))
                          ? 'Deselect All'
                          : 'Select All'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {selectedEndpoints.length} endpoint{selectedEndpoints.length !== 1 ? 's' : ''}{' '}
                selected
              </div>
              <button
                onClick={executeBulkTest}
                disabled={bulkLoading || selectedEndpoints.length === 0}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {bulkLoading ? 'Testing...' : `Test ${selectedEndpoints.length} Endpoints`}
              </button>
            </div>
          </div>

          {/* Bulk Results */}
          {Object.keys(bulkResults).length > 0 && (
            <div className="card-base p-6">
              <h2 className="text-xl font-semibold mb-4">Bulk Test Results</h2>

              {/* Summary */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-2xl font-bold">{Object.keys(bulkResults).length}</div>
                  <div className="text-sm text-muted-foreground">Total Tests</div>
                </div>
                <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-green-700 dark:text-green-400">
                    {Object.values(bulkResults).filter((r: any) => r.success).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Successful</div>
                </div>
                <div className="text-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-red-700 dark:text-red-400">
                    {Object.values(bulkResults).filter((r: any) => !r.success).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Failed</div>
                </div>
                <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                    {Math.round(
                      Object.values(bulkResults).reduce(
                        (acc: number, r: any) => acc + r.responseTime,
                        0,
                      ) / Object.keys(bulkResults).length,
                    )}
                    ms
                  </div>
                  <div className="text-sm text-muted-foreground">Avg Response</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-4">
                {Object.entries(bulkResults).map(([endpointName, result]: [string, any]) => (
                  <div key={endpointName} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            result.success ? 'bg-green-500' : 'bg-red-500'
                          }`}
                        />
                        <h3 className="font-medium">{endpointName}</h3>
                        <span className="text-xs bg-muted px-2 py-1 rounded">
                          {result.category}
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">{result.responseTime}ms</span>
                    </div>

                    <p className="text-sm text-muted-foreground mb-3">{result.description}</p>

                    <details className="group">
                      <summary className="cursor-pointer text-sm font-medium mb-2">
                        {result.success ? 'View Response' : 'View Error'}
                        <span className="ml-2 group-open:rotate-90 transition-transform">▶</span>
                      </summary>
                      <pre
                        className={`p-3 rounded-lg overflow-auto text-xs max-h-64 ${
                          result.success
                            ? 'bg-green-50 dark:bg-green-900/10 text-green-900 dark:text-green-100'
                            : 'bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-100'
                        }`}
                      >
                        {JSON.stringify(
                          result.success ? result.data : result.details || result.error,
                          null,
                          2,
                        )}
                      </pre>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Single Testing Mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Endpoint Selection */}
          <div className="lg:col-span-1 space-y-4">
            <div className="card-base p-4">
              <h2 className="text-lg font-semibold mb-4">Select Endpoint</h2>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => {
                      setSelectedCategory(e.target.value);
                      setSelectedEndpoint('');
                      setResults({});
                    }}
                    className="w-full p-2 border rounded-lg bg-background"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedCategory && (
                  <div>
                    <label className="block text-sm font-medium mb-1">Endpoint</label>
                    <select
                      value={selectedEndpoint}
                      onChange={(e) => handleEndpointSelect(e.target.value)}
                      className="w-full p-2 border rounded-lg bg-background"
                    >
                      <option value="">Select Endpoint</option>
                      {filteredEndpoints.map((endpoint) => (
                        <option key={endpoint.name} value={endpoint.name}>
                          {endpoint.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {currentEndpoint && (
                <div className="mt-4 p-3 bg-muted rounded-lg">
                  <p className="text-sm text-muted-foreground">{currentEndpoint.description}</p>
                </div>
              )}
            </div>

            {/* Parameters */}
            {currentEndpoint && Object.keys(currentEndpoint.params).length > 0 && (
              <div className="card-base p-4">
                <h3 className="text-md font-semibold mb-3">Parameters</h3>
                <div className="space-y-3">
                  {Object.entries(currentEndpoint.params).map(([paramName, config]) => (
                    <div key={paramName}>
                      <label className="block text-sm font-medium mb-1">
                        {paramName}
                        {config.required && <span className="text-red-500 ml-1">*</span>}
                      </label>

                      {config.type === 'select' && config.options ? (
                        <select
                          value={params[paramName] || ''}
                          onChange={(e) => handleParamChange(paramName, e.target.value)}
                          className="w-full p-2 border rounded bg-background text-sm"
                        >
                          <option value="">Select {paramName}</option>
                          {config.options.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      ) : config.type === 'boolean' ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            checked={params[paramName] || false}
                            onChange={(e) => handleParamChange(paramName, e.target.checked)}
                            className="rounded"
                          />
                          <span className="text-sm">Enable</span>
                        </div>
                      ) : config.type === 'number' ? (
                        <input
                          type="number"
                          value={params[paramName] || ''}
                          onChange={(e) =>
                            handleParamChange(paramName, parseInt(e.target.value) || undefined)
                          }
                          className="w-full p-2 border rounded bg-background text-sm"
                          placeholder={`Enter ${paramName}`}
                        />
                      ) : (
                        <input
                          type={config.type}
                          value={params[paramName] || ''}
                          onChange={(e) => handleParamChange(paramName, e.target.value)}
                          className="w-full p-2 border rounded bg-background text-sm"
                          placeholder={`Enter ${paramName}`}
                        />
                      )}

                      {config.description && (
                        <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Execute Button */}
            {currentEndpoint && (
              <button
                onClick={executeEndpoint}
                disabled={loading}
                className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 font-medium"
              >
                {loading ? 'Executing...' : `Execute ${currentEndpoint.name}`}
              </button>
            )}
          </div>

          {/* Results */}
          <div className="lg:col-span-2">
            <div className="card-base p-4 h-full">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">API Response</h2>
                {responseTime && (
                  <span className="text-sm text-muted-foreground">{responseTime}ms</span>
                )}
              </div>

              {Object.keys(results).length === 0 ? (
                <div className="text-center text-muted-foreground py-12">
                  <p>Select an endpoint and click execute to see results</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Response Status */}
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        results.success ? 'bg-green-500' : 'bg-red-500'
                      }`}
                    />
                    <span
                      className={`font-medium ${
                        results.success ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {results.success ? 'Success' : 'Error'}
                    </span>
                    <span className="text-sm text-muted-foreground">{results.timestamp}</span>
                  </div>

                  {/* Request Parameters */}
                  {results.params && Object.keys(results.params).length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium mb-2">Request Parameters</h3>
                      <pre className="p-3 bg-muted rounded-lg overflow-auto text-xs">
                        {JSON.stringify(results.params, null, 2)}
                      </pre>
                    </div>
                  )}

                  {/* Response Data */}
                  <div>
                    <h3 className="text-sm font-medium mb-2">
                      {results.success ? 'Response Data' : 'Error Details'}
                    </h3>
                    <div className="relative">
                      <pre
                        className={`p-4 rounded-lg overflow-auto text-xs max-h-96 ${
                          results.success
                            ? 'bg-green-50 dark:bg-green-900/10 text-green-900 dark:text-green-100'
                            : 'bg-red-50 dark:bg-red-900/10 text-red-900 dark:text-red-100'
                        }`}
                      >
                        {JSON.stringify(
                          results.success ? results.data : results.details || results.error,
                          null,
                          2,
                        )}
                      </pre>
                      <button
                        onClick={() => {
                          const text = JSON.stringify(
                            results.success ? results.data : results.details || results.error,
                            null,
                            2,
                          );
                          navigator.clipboard.writeText(text);
                        }}
                        className="absolute top-2 right-2 px-2 py-1 bg-black/10 hover:bg-black/20 rounded text-xs"
                        title="Copy to clipboard"
                      >
                        Copy
                      </button>
                    </div>
                  </div>

                  {/* Response Summary */}
                  {results.success && results.data && (
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Response Size</h4>
                        <p className="text-sm">
                          {new Blob([JSON.stringify(results.data)]).size} bytes
                        </p>
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-muted-foreground">Data Points</h4>
                        <p className="text-sm">
                          {Array.isArray(results.data?.chart?.data)
                            ? results.data.chart.data.length
                            : Array.isArray(results.data?.table?.data)
                              ? results.data.table.data.length
                              : Array.isArray(results.data?.data)
                                ? results.data.data.length
                                : typeof results.data === 'object'
                                  ? Object.keys(results.data).length
                                  : 'N/A'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Test Section */}
      {!showBulkMode && (
        <div className="card-base p-6">
          <h2 className="text-xl font-semibold mb-4">Quick Tests</h2>
          <p className="text-muted-foreground mb-4">
            Try these common endpoint combinations to quickly test the API
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              onClick={() => {
                setSelectedCategory('Price');
                handleEndpointSelect('getWidgetData');
              }}
              className="p-4 border rounded-lg hover:bg-muted transition-colors text-left"
            >
              <h3 className="font-medium">Price Widget</h3>
              <p className="text-sm text-muted-foreground">Current price data</p>
            </button>

            <button
              onClick={() => {
                setSelectedCategory('Volume');
                handleEndpointSelect('getVolumeChartData');
              }}
              className="p-4 border rounded-lg hover:bg-muted transition-colors text-left"
            >
              <h3 className="font-medium">Volume Chart</h3>
              <p className="text-sm text-muted-foreground">7-day volume data</p>
            </button>

            <button
              onClick={() => {
                setSelectedCategory('Sentiment');
                handleEndpointSelect('getSentimentWidgetData');
              }}
              className="p-4 border rounded-lg hover:bg-muted transition-colors text-left"
            >
              <h3 className="font-medium">Sentiment Widget</h3>
              <p className="text-sm text-muted-foreground">Current sentiment</p>
            </button>

            <button
              onClick={() => {
                setSelectedCategory('Forecast');
                handleEndpointSelect('getForecastChartData');
              }}
              className="p-4 border rounded-lg hover:bg-muted transition-colors text-left"
            >
              <h3 className="font-medium">Forecast Chart</h3>
              <p className="text-sm text-muted-foreground">Price predictions</p>
            </button>
          </div>
        </div>
      )}

      {/* API Documentation */}
      <div className="card-base p-6">
        <h2 className="text-xl font-semibold mb-4">API Documentation</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Available Endpoints</h3>
            <div className="space-y-2">
              {categories.map((category) => (
                <div key={category} className="p-3 border rounded-lg">
                  <h4 className="font-medium mb-2">{category} API</h4>
                  <div className="space-y-1">
                    {endpoints
                      .filter((e) => e.category === category)
                      .map((endpoint) => (
                        <div key={endpoint.name} className="text-sm text-muted-foreground">
                          • {endpoint.name}
                        </div>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Common Parameters</h3>
            <div className="space-y-3">
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium">Time Ranges</h4>
                <p className="text-sm text-muted-foreground">{timeRanges.join(', ')}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium">Intervals</h4>
                <p className="text-sm text-muted-foreground">{intervals.join(', ')}</p>
              </div>
              <div className="p-3 border rounded-lg">
                <h4 className="font-medium">Forecast Ranges</h4>
                <p className="text-sm text-muted-foreground">{forecastRanges.join(', ')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Category Insights Section */}
      {selectedCategory && (
        <div className="card-base p-6">
          <h2 className="text-xl font-semibold mb-4">{selectedCategory} API Insights</h2>

          {(() => {
            const insights = getCategoryInsights(selectedCategory);
            return (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-medium mb-3">Endpoints Overview</h3>
                  <div className="space-y-3">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-2xl font-bold">{insights.totalEndpoints}</div>
                      <div className="text-sm text-muted-foreground">Total Endpoints</div>
                    </div>

                    <div className="space-y-2">
                      {insights.endpoints.map((endpoint) => (
                        <div key={endpoint.name} className="p-3 border rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium">{endpoint.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {endpoint.description}
                              </p>
                            </div>
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {endpoint.paramCount} params
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium mb-3">Available Parameters</h3>
                  <div className="space-y-2">
                    {insights.commonParams.map((param) => (
                      <div
                        key={param}
                        className="flex justify-between items-center p-2 bg-muted rounded"
                      >
                        <span className="font-mono text-sm">{param}</span>
                        <span className="text-xs px-2 py-1 bg-background rounded">
                          {insights.paramTypes[param]}
                        </span>
                      </div>
                    ))}
                  </div>

                  {insights.commonParams.length === 0 && (
                    <p className="text-muted-foreground text-center py-8">
                      No parameters available for this category
                    </p>
                  )}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
