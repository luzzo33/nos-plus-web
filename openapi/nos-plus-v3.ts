const serverUrlCandidates = [
  process.env.NOS_PLUS_V3_SERVER,
  process.env.NEXT_PUBLIC_NOS_API_BASE,
  process.env.NOS_API_BASE,
  process.env.NEXT_PUBLIC_MONITOR_API_BASE,
  process.env.MONITOR_API_BASE,
];

const NOS_API_SERVER_URL = (() => {
  const selected = serverUrlCandidates.find(
    (value) => typeof value === 'string' && value.trim().length,
  );
  return (selected ?? 'http://localhost:3000').replace(/\/$/, '');
})();

const nosPlusV3Spec = {
  openapi: '3.0.3',
  info: {
    title: 'i18n:openapi.info.title',
    version: '3.0.0',
    description: 'i18n:openapi.info.description',
    contact: {
      name: 'NOS+ API Support',
      email: 'support@nos.plus',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: NOS_API_SERVER_URL,
      description: 'Production server',
    },
  ],
  tags: [
    { name: 'Prices', description: 'i18n:openapi.tags.prices' },
    { name: 'Volume', description: 'i18n:openapi.tags.volume' },
    { name: 'Holders', description: 'i18n:openapi.tags.holders' },
    { name: 'Flow', description: 'i18n:openapi.tags.flow' },
  ],
  security: [{ ApiKeyAuth: [] }, { BearerAuth: [] }],
  paths: {
    '/v3/prices': {
      get: {
        tags: ['Prices'],
        summary: 'i18n:openapi.prices.index.summary',
        description: 'i18n:openapi.prices.index.description',
        operationId: 'getPriceEndpoints',
        responses: {
          200: {
            description: 'i18n:openapi.prices.index.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EndpointsResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/prices/chart': {
      get: {
        tags: ['Prices'],
        summary: 'i18n:openapi.prices.chart.summary',
        description: 'i18n:openapi.prices.chart.description',
        operationId: 'getPriceChart',
        parameters: [
          { $ref: '#/components/parameters/Token' },
          { $ref: '#/components/parameters/Chain' },
          { $ref: '#/components/parameters/Range' },
          { $ref: '#/components/parameters/Interval' },
          { $ref: '#/components/parameters/StartDate' },
          { $ref: '#/components/parameters/EndDate' },
          { $ref: '#/components/parameters/Quote' },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.prices.chart.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PriceChartResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/prices/widget': {
      get: {
        tags: ['Prices'],
        summary: 'i18n:openapi.prices.widget.summary',
        description: 'i18n:openapi.prices.widget.description',
        operationId: 'getPriceWidget',
        parameters: [
          { $ref: '#/components/parameters/Token' },
          { $ref: '#/components/parameters/Chain' },
          { $ref: '#/components/parameters/Quote' },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.prices.widget.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PriceWidgetResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/prices/stats': {
      get: {
        tags: ['Prices'],
        summary: 'i18n:openapi.prices.stats.summary',
        description: 'i18n:openapi.prices.stats.description',
        operationId: 'getPriceStats',
        parameters: [
          { $ref: '#/components/parameters/Token' },
          { $ref: '#/components/parameters/Chain' },
          { $ref: '#/components/parameters/Range' },
          { $ref: '#/components/parameters/Quote' },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.prices.stats.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PriceStatsResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/prices/table': {
      get: {
        tags: ['Prices'],
        summary: 'i18n:openapi.prices.table.summary',
        description: 'i18n:openapi.prices.table.description',
        operationId: 'getPriceTable',
        parameters: [
          { $ref: '#/components/parameters/Token' },
          { $ref: '#/components/parameters/Chain' },
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/PriceSortBy' },
          { $ref: '#/components/parameters/SortOrder' },
          { $ref: '#/components/parameters/StartDate' },
          { $ref: '#/components/parameters/EndDate' },
          { $ref: '#/components/parameters/Timeframe' },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.prices.table.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PriceTableResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/volume': {
      get: {
        tags: ['Volume'],
        summary: 'i18n:openapi.volume.index.summary',
        description: 'i18n:openapi.volume.index.description',
        operationId: 'getVolumeEndpoints',
        responses: {
          200: {
            description: 'i18n:openapi.volume.index.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EndpointsResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/volume/chart': {
      get: {
        tags: ['Volume'],
        summary: 'i18n:openapi.volume.chart.summary',
        description: 'i18n:openapi.volume.chart.description',
        operationId: 'getVolumeChart',
        parameters: [
          { $ref: '#/components/parameters/Range' },
          { $ref: '#/components/parameters/Interval' },
          { $ref: '#/components/parameters/StartDate' },
          { $ref: '#/components/parameters/EndDate' },
          { $ref: '#/components/parameters/Cumulative' },
          { $ref: '#/components/parameters/MovingAverage' },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.volume.chart.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VolumeChartResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/volume/widget': {
      get: {
        tags: ['Volume'],
        summary: 'i18n:openapi.volume.widget.summary',
        description: 'i18n:openapi.volume.widget.description',
        operationId: 'getVolumeWidget',
        responses: {
          200: {
            description: 'i18n:openapi.volume.widget.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VolumeWidgetResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/volume/stats': {
      get: {
        tags: ['Volume'],
        summary: 'i18n:openapi.volume.stats.summary',
        description: 'i18n:openapi.volume.stats.description',
        operationId: 'getVolumeStats',
        parameters: [{ $ref: '#/components/parameters/Range' }],
        responses: {
          200: {
            description: 'i18n:openapi.volume.stats.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VolumeStatsResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/volume/table': {
      get: {
        tags: ['Volume'],
        summary: 'i18n:openapi.volume.table.summary',
        description: 'i18n:openapi.volume.table.description',
        operationId: 'getVolumeTable',
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/VolumeSortBy' },
          { $ref: '#/components/parameters/SortOrder' },
          { $ref: '#/components/parameters/StartDate' },
          { $ref: '#/components/parameters/EndDate' },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.volume.table.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VolumeTableResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/holders': {
      get: {
        tags: ['Holders'],
        summary: 'i18n:openapi.holders.index.summary',
        description: 'i18n:openapi.holders.index.description',
        operationId: 'getHolderEndpoints',
        responses: {
          200: {
            description: 'i18n:openapi.holders.index.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/EndpointsResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/holders/chart': {
      get: {
        tags: ['Holders'],
        summary: 'i18n:openapi.holders.chart.summary',
        description: 'i18n:openapi.holders.chart.description',
        operationId: 'getHolderChart',
        parameters: [
          { $ref: '#/components/parameters/Range' },
          { $ref: '#/components/parameters/Interval' },
          { $ref: '#/components/parameters/StartDate' },
          { $ref: '#/components/parameters/EndDate' },
          { $ref: '#/components/parameters/MovingAverage' },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.holders.chart.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HoldersChartResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/holders/widget': {
      get: {
        tags: ['Holders'],
        summary: 'i18n:openapi.holders.widget.summary',
        description: 'i18n:openapi.holders.widget.description',
        operationId: 'getHolderWidget',
        responses: {
          200: {
            description: 'i18n:openapi.holders.widget.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HoldersWidgetResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/holders/stats': {
      get: {
        tags: ['Holders'],
        summary: 'i18n:openapi.holders.stats.summary',
        description: 'i18n:openapi.holders.stats.description',
        operationId: 'getHolderStats',
        parameters: [{ $ref: '#/components/parameters/Range' }],
        responses: {
          200: {
            description: 'i18n:openapi.holders.stats.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HoldersStatsResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/holders/table': {
      get: {
        tags: ['Holders'],
        summary: 'i18n:openapi.holders.table.summary',
        description: 'i18n:openapi.holders.table.description',
        operationId: 'getHolderTable',
        parameters: [
          { $ref: '#/components/parameters/Page' },
          { $ref: '#/components/parameters/Limit' },
          { $ref: '#/components/parameters/HoldersSortBy' },
          { $ref: '#/components/parameters/SortOrder' },
          { $ref: '#/components/parameters/StartDate' },
          { $ref: '#/components/parameters/EndDate' },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.holders.table.response',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/HoldersTableResponse' },
              },
            },
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/flow/trace': {
      post: {
        tags: ['Flow'],
        summary: 'i18n:openapi.flow.trace.summary',
        description: 'i18n:openapi.flow.trace.description',
        operationId: 'traceTokenFlow',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  start: {
                    type: 'string',
                    description: 'Wallet address or signature to start from.',
                    example: '9u39MPZNRB78FnYDYSt2hTLJpUzRr1KZLbNJqdwPpZAr',
                  },
                  startType: {
                    type: 'string',
                    enum: ['wallet', 'signature', 'auto'],
                    default: 'wallet',
                  },
                  addressType: {
                    type: 'string',
                    enum: ['owner', 'token', 'auto'],
                    default: 'owner',
                  },
                  rpcUrl: {
                    type: 'string',
                    description: 'Custom Solana RPC endpoint to use.',
                    example: 'https://small-icy-log.solana-mainnet.quiknode.pro/...',
                  },
                  apiKey: {
                    type: 'string',
                    nullable: true,
                    description: 'Optional RPC provider API key (e.g. Helius).',
                  },
                  nosMint: {
                    type: 'string',
                    default: 'nosXBVxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
                    example: 'nosXBVvXAi4m5zVVnnXVw15zofH6Wm7AdgBzD6Y44445',
                  },
                  maxDepth: {
                    type: 'integer',
                    default: 2,
                  },
                  maxFanout: {
                    type: 'integer',
                    default: 12,
                  },
                  minAmount: {
                    type: 'number',
                    default: 10,
                  },
                  sinceDays: {
                    type: 'integer',
                    default: 90,
                  },
                  rpcBudget: {
                    type: 'integer',
                    default: 150,
                  },
                  maxSigsPerWallet: {
                    type: 'integer',
                    default: 60,
                  },
                  ttlHours: {
                    type: 'integer',
                    default: 24,
                  },
                },
                required: ['start'],
              },
            },
          },
        },
        responses: {
          200: {
            description: 'i18n:openapi.flow.trace.response',
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/flow/cache': {
      get: {
        tags: ['Flow'],
        summary: 'i18n:openapi.flow.cache.summary',
        description: 'i18n:openapi.flow.cache.description',
        operationId: 'getFlowCache',
        parameters: [
          {
            name: 'key',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Cache key returned from trace requests.',
          },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.flow.cache.response',
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
    '/v3/flow/job': {
      get: {
        tags: ['Flow'],
        summary: 'i18n:openapi.flow.job.summary',
        description: 'i18n:openapi.flow.job.description',
        operationId: 'getFlowJobStatus',
        parameters: [
          {
            name: 'key',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Job key returned from trace requests.',
          },
        ],
        responses: {
          200: {
            description: 'i18n:openapi.flow.job.response',
          },
          401: { $ref: '#/components/responses/UnauthorizedError' },
          429: { $ref: '#/components/responses/RateLimited' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'Provide your NOS API key in the X-API-Key header',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Alternatively, send the API key as a bearer token',
      },
    },
    parameters: {
      Token: {
        name: 'token',
        in: 'query',
        description: 'Token symbol to query (defaults to NOS).',
        schema: {
          type: 'string',
          default: 'NOS',
          example: 'NOS',
        },
      },
      Chain: {
        name: 'chain',
        in: 'query',
        description: 'Blockchain identifier (defaults to solana).',
        schema: {
          type: 'string',
          default: 'solana',
          example: 'solana',
        },
      },
      Quote: {
        name: 'quote',
        in: 'query',
        description: 'Optional ISO currency code for quote conversion.',
        schema: {
          type: 'string',
          example: 'USD',
        },
      },
      Range: {
        name: 'range',
        in: 'query',
        description: 'i18n:openapi.shared.params.range',
        schema: {
          type: 'string',
          enum: ['1d', '7d', '30d', '90d', '180d', '1y', 'all'],
          default: '30d',
        },
      },
      Interval: {
        name: 'interval',
        in: 'query',
        description: 'i18n:openapi.shared.params.interval',
        schema: {
          type: 'string',
          enum: ['auto', '15m', '1h', '4h', '1d'],
          default: 'auto',
        },
      },
      StartDate: {
        name: 'startDate',
        in: 'query',
        description: 'ISO 8601 start date to override the range.',
        schema: {
          type: 'string',
          format: 'date-time',
        },
        example: '2025-01-01T00:00:00Z',
      },
      EndDate: {
        name: 'endDate',
        in: 'query',
        description: 'ISO 8601 end date to override the range.',
        schema: {
          type: 'string',
          format: 'date-time',
        },
        example: '2025-02-01T00:00:00Z',
      },
      Page: {
        name: 'page',
        in: 'query',
        description: 'Page number (1-indexed).',
        schema: {
          type: 'integer',
          minimum: 1,
          default: 1,
        },
      },
      Limit: {
        name: 'limit',
        in: 'query',
        description: 'Rows per page.',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 1000,
          default: 100,
        },
      },
      SortOrder: {
        name: 'sortOrder',
        in: 'query',
        description: 'Sort direction.',
        schema: {
          type: 'string',
          enum: ['ASC', 'DESC'],
          default: 'DESC',
        },
      },
      PriceSortBy: {
        name: 'sortBy',
        in: 'query',
        description: 'Column to sort price rows by.',
        schema: {
          type: 'string',
          enum: ['timestamp', 'price', 'change', 'high', 'low'],
          default: 'timestamp',
        },
      },
      VolumeSortBy: {
        name: 'sortBy',
        in: 'query',
        description: 'Column to sort volume rows by.',
        schema: {
          type: 'string',
          enum: ['timestamp', 'volume', 'change', 'high', 'low'],
          default: 'timestamp',
        },
      },
      HoldersSortBy: {
        name: 'sortBy',
        in: 'query',
        description: 'Column to sort holder rows by.',
        schema: {
          type: 'string',
          enum: ['timestamp', 'holders', 'change', 'high', 'low'],
          default: 'timestamp',
        },
      },
      Cumulative: {
        name: 'cumulative',
        in: 'query',
        description: 'Include a cumulative series.',
        schema: {
          type: 'boolean',
          default: false,
        },
      },
      MovingAverage: {
        name: 'ma',
        in: 'query',
        description: 'Window (days) for moving-average overlays.',
        schema: {
          type: 'integer',
          minimum: 1,
          maximum: 365,
        },
        example: 7,
      },
      Timeframe: {
        name: 'timeframe',
        in: 'query',
        description: 'Bucket size for table aggregations.',
        schema: {
          type: 'string',
          enum: ['24h', '7d', '30d', '90d', '1y', 'all'],
          default: '24h',
        },
      },
    },
    schemas: {
      Meta: {
        type: 'object',
        properties: {
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-24T20:53:09.068Z',
          },
          type: {
            type: 'string',
            enum: ['chart', 'widget', 'stats', 'table', 'flow'],
            example: 'chart',
          },
        },
        required: ['timestamp', 'type'],
      },
      Pagination: {
        type: 'object',
        properties: {
          total: { type: 'integer', example: 24 },
          page: { type: 'integer', example: 1 },
          limit: { type: 'integer', example: 100 },
          totalPages: { type: 'integer', example: 12 },
          hasNext: { type: 'boolean', example: true },
          hasPrev: { type: 'boolean', example: false },
        },
        required: ['total', 'page', 'limit', 'totalPages', 'hasNext', 'hasPrev'],
      },
      DisplayChange: {
        type: 'object',
        properties: {
          value: { type: 'string', example: '-0.46%' },
          color: { type: 'string', example: 'red' },
        },
        required: ['value'],
      },
      PriceOhlc: {
        type: 'object',
        properties: {
          open: { type: 'number', format: 'double', example: 0.7594 },
          high: { type: 'number', format: 'double', example: 0.7594 },
          low: { type: 'number', format: 'double', example: 0.7316 },
          close: { type: 'number', format: 'double', example: 0.7337 },
        },
        required: ['open', 'high', 'low', 'close'],
      },
      PriceChartPoint: {
        type: 'object',
        properties: {
          timestamp: {
            type: 'string',
            format: 'date-time',
            example: '2025-09-23T21:00:00.000Z',
          },
          price: { type: 'number', format: 'double', example: 0.7495 },
          ohlc: { $ref: '#/components/schemas/PriceOhlc' },
          source: { type: 'string', enum: ['historical', 'live'], example: 'live' },
        },
        required: ['timestamp', 'price', 'ohlc', 'source'],
      },
      ChartMetadata: {
        type: 'object',
        properties: {
          range: { type: 'string', example: '7d' },
          interval: { type: 'string', example: '1h' },
          dataPoints: { type: 'integer', example: 31 },
          startDate: { type: 'string', format: 'date-time', example: '2025-09-17T20:52:34.000Z' },
          endDate: { type: 'string', format: 'date-time', example: '2025-09-24T20:52:34.000Z' },
          indicators: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['range', 'interval', 'dataPoints', 'startDate', 'endDate'],
      },
      PriceChartSummary: {
        type: 'object',
        properties: {
          current: { type: 'number', format: 'double', example: 0.7498 },
          high: { type: 'number', format: 'double', example: 1.0779 },
          low: { type: 'number', format: 'double', example: 0.7109 },
          average: { type: 'number', format: 'double', example: 0.7722 },
          volatility: { type: 'number', format: 'double', example: 0.0791 },
          trend: { type: 'string', example: 'neutral' },
          change: { type: 'number', format: 'double', example: 0.035 },
        },
        required: ['current', 'high', 'low', 'average', 'volatility', 'trend', 'change'],
      },
      PriceChartData: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/PriceChartPoint' },
              },
              summary: { $ref: '#/components/schemas/PriceChartSummary' },
              metadata: { $ref: '#/components/schemas/ChartMetadata' },
            },
            required: ['data', 'summary', 'metadata'],
          },
        },
        required: ['data'],
      },
      PriceChartResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          chart: { $ref: '#/components/schemas/PriceChartData' },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'chart', 'meta'],
      },
      PriceChangeEntry: {
        type: 'object',
        properties: {
          value: { type: 'number', format: 'double', example: -3.14 },
          display: { type: 'string', example: '-3.141' },
          trend: { type: 'string', enum: ['up', 'down', 'flat'], example: 'down' },
        },
        required: ['value', 'display', 'trend'],
      },
      PriceRangeEntry: {
        type: 'object',
        properties: {
          high: { type: 'number', format: 'double', example: 1.08 },
          low: { type: 'number', format: 'double', example: 0.7108 },
          highDisplay: { type: 'string', example: '$1.08' },
          lowDisplay: { type: 'string', example: '$0.7108' },
        },
        required: ['high', 'low', 'highDisplay', 'lowDisplay'],
      },
      PriceAllTimeHigh: {
        type: 'object',
        properties: {
          value: { type: 'number', format: 'double', example: 7.325 },
          display: { type: 'string', example: '$7.33' },
          date: { type: 'string', format: 'date-time', example: '2024-03-07T22:00:00.000Z' },
          percentFromATH: { type: 'number', format: 'double', example: -89.82 },
        },
        required: ['value', 'display', 'date'],
      },
      PriceAllTimeLow: {
        type: 'object',
        properties: {
          value: { type: 'number', format: 'double', example: 0.0107 },
          display: { type: 'string', example: '$0.0107' },
          date: { type: 'string', format: 'date-time', example: '2023-10-23T21:00:00.000Z' },
          percentFromATL: { type: 'number', format: 'double', example: 6897.15 },
        },
        required: ['value', 'display', 'date'],
      },
      PriceSparklinePoint: {
        type: 'object',
        properties: {
          time: { type: 'string', format: 'date-time', example: '2025-09-24T20:30:02.000Z' },
          value: { type: 'number', format: 'double', example: 0.7493 },
        },
        required: ['time', 'value'],
      },
      PriceWidget: {
        type: 'object',
        properties: {
          price: {
            type: 'object',
            properties: {
              current: { type: 'number', format: 'double', example: 0.7457 },
              display: { type: 'string', example: '$0.7457' },
              currency: { type: 'string', example: 'USD' },
            },
            required: ['current', 'display', 'currency'],
          },
          changes: {
            type: 'object',
            additionalProperties: { $ref: '#/components/schemas/PriceChangeEntry' },
          },
          ranges: {
            type: 'object',
            additionalProperties: { $ref: '#/components/schemas/PriceRangeEntry' },
          },
          allTime: {
            type: 'object',
            properties: {
              high: { $ref: '#/components/schemas/PriceAllTimeHigh' },
              low: { $ref: '#/components/schemas/PriceAllTimeLow' },
            },
            required: ['high', 'low'],
          },
          sparkline: {
            type: 'array',
            items: { $ref: '#/components/schemas/PriceSparklinePoint' },
          },
          lastUpdate: { type: 'string', format: 'date-time', example: '2025-09-24T20:52:40.678Z' },
          dataSource: { type: 'string', example: 'live' },
        },
        required: [
          'price',
          'changes',
          'ranges',
          'allTime',
          'sparkline',
          'lastUpdate',
          'dataSource',
        ],
      },
      PriceWidgetResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          widget: { $ref: '#/components/schemas/PriceWidget' },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'widget', 'meta'],
      },
      PriceStatsCurrent: {
        type: 'object',
        properties: {
          price: { type: 'number', format: 'double', example: 0.7457 },
          priceDisplay: { type: 'string', example: '$0.7457' },
          change24h: { type: 'number', format: 'double', example: -4.3948 },
          change24hDisplay: { type: 'string', example: '-4.395' },
          high24h: { type: 'number', format: 'double', example: 0.7654 },
          high24hDisplay: { type: 'string', example: '$0.7654' },
          low24h: { type: 'number', format: 'double', example: 0.7108 },
          low24hDisplay: { type: 'string', example: '$0.7108' },
          lastUpdate: { type: 'string', format: 'date-time', example: '2025-09-24T20:52:49.792Z' },
        },
        required: [
          'price',
          'priceDisplay',
          'change24h',
          'change24hDisplay',
          'high24h',
          'high24hDisplay',
          'low24h',
          'low24hDisplay',
          'lastUpdate',
        ],
      },
      PriceStatsHistorical: {
        type: 'object',
        properties: {
          period: { type: 'string', example: '30d' },
          startDate: { type: 'string', format: 'date-time', example: '2025-08-25T20:52:49.510Z' },
          endDate: { type: 'string', format: 'date-time', example: '2025-09-24T20:52:49.510Z' },
          dataPoints: { type: 'integer', example: 30 },
          min: { type: 'number', format: 'double', example: 0.38228 },
          max: { type: 'number', format: 'double', example: 1.07787 },
          average: { type: 'number', format: 'double', example: 0.59588 },
          standardDeviation: { type: 'number', format: 'double', example: 0.20917 },
          coverage: {
            oneOf: [
              { type: 'number', example: 100 },
              { type: 'string', example: '31/31 days' },
            ],
          },
          completeness: {
            oneOf: [
              { type: 'number', example: 100 },
              { type: 'string', example: '100' },
            ],
          },
        },
        required: ['period', 'startDate', 'endDate', 'dataPoints', 'min', 'max', 'average'],
      },
      PriceStatsDistribution: {
        type: 'object',
        properties: {
          median: { type: 'number', format: 'double', example: 0.48686 },
          percentiles: {
            type: 'object',
            properties: {
              p10: { type: 'number', format: 'double', example: 0.3984 },
              p25: { type: 'number', format: 'double', example: 0.45487 },
              p50: { type: 'number', format: 'double', example: 0.48686 },
              p75: { type: 'number', format: 'double', example: 0.76459 },
              p90: { type: 'number', format: 'double', example: 0.9205 },
            },
          },
          standardDeviation: { type: 'number', format: 'double', example: 0.20917 },
          skewness: { type: 'number', format: 'double', example: 0.86088 },
        },
        required: ['median', 'percentiles', 'standardDeviation'],
      },
      PriceStatsVolatility: {
        type: 'object',
        properties: {
          daily: { type: 'number', format: 'double', example: 15.397 },
          weekly: { type: 'number', format: 'double', example: 40.738 },
          monthly: { type: 'number', format: 'double', example: 84.335 },
          annualized: { type: 'number', format: 'double', example: 294.168 },
        },
        required: ['daily', 'weekly', 'monthly', 'annualized'],
      },
      PriceStatsTrends: {
        type: 'object',
        properties: {
          direction: { type: 'string', example: 'bullish' },
          strength: { type: 'number', format: 'double', example: 58.439 },
          support: { type: 'number', format: 'double', example: 0.38228 },
          resistance: { type: 'number', format: 'double', example: 1.07787 },
          movingAverages: {
            type: 'object',
            properties: {
              ma7: { type: 'number', format: 'double', example: 0.87587 },
              ma30: { type: 'number', format: 'double', example: 0.59588 },
              ma50: { type: 'number', format: 'double', example: 0.59588 },
              position: { type: 'string', example: 'below' },
            },
          },
        },
        required: ['direction', 'strength'],
      },
      PriceStatsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          stats: {
            type: 'object',
            properties: {
              current: { $ref: '#/components/schemas/PriceStatsCurrent' },
              historical: { $ref: '#/components/schemas/PriceStatsHistorical' },
              distribution: { $ref: '#/components/schemas/PriceStatsDistribution' },
              volatility: { $ref: '#/components/schemas/PriceStatsVolatility' },
              trends: { $ref: '#/components/schemas/PriceStatsTrends' },
            },
            required: ['current', 'historical'],
          },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'stats', 'meta'],
      },
      PriceTableColumn: {
        type: 'object',
        properties: {
          key: { type: 'string', example: 'price' },
          label: { type: 'string', example: 'Price (USD)' },
          type: { type: 'string', example: 'currency' },
          sortable: { type: 'boolean', example: true },
        },
        required: ['key', 'label', 'type'],
      },
      PriceTableDisplay: {
        type: 'object',
        properties: {
          price: { type: 'string', example: '$0.7533' },
          change: { $ref: '#/components/schemas/DisplayChange' },
          high: { type: 'string', example: '$0.7559' },
          low: { type: 'string', example: '$0.7517' },
        },
      },
      PriceTableRow: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 0 },
          timestamp: { type: 'string', format: 'date-time', example: '2025-09-24T17:00:00.000Z' },
          price: { type: 'string', example: '0.75330000000000' },
          change: { type: 'number', format: 'double', example: -0.8326 },
          high: { type: 'string', example: '0.7559000000' },
          low: { type: 'string', example: '0.7517000000' },
          dataPoints: { type: 'integer', example: 4 },
          display: { $ref: '#/components/schemas/PriceTableDisplay' },
        },
        required: ['id', 'timestamp', 'price', 'change', 'high', 'low', 'dataPoints'],
      },
      PriceTableResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          table: {
            type: 'object',
            properties: {
              columns: { $ref: '#/components/schemas/Pagination' },
              rows: {
                type: 'object',
                properties: {
                  columns: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PriceTableColumn' },
                  },
                  rows: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PriceTableRow' },
                  },
                },
                required: ['columns', 'rows'],
              },
            },
            required: ['columns', 'rows'],
          },
          meta: { $ref: '#/components/schemas/Meta' },
          pagination: {
            oneOf: [{ $ref: '#/components/schemas/Pagination' }, { type: 'null' }],
            nullable: true,
          },
        },
        required: ['success', 'table', 'meta'],
      },
      VolumeChartPoint: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time', example: '2025-09-23T21:00:00.000Z' },
          volumeUSD: { type: 'number', format: 'double', example: 1933956 },
          interval: { type: 'string', example: '1d' },
          source: { type: 'string', enum: ['historical', 'live'], example: 'live' },
        },
        required: ['timestamp', 'volumeUSD', 'interval', 'source'],
      },
      VolumeChartSummary: {
        type: 'object',
        properties: {
          totalVolume: { type: 'number', format: 'double', example: 33581678 },
          avgVolume: { type: 'number', format: 'double', example: 4197709.75 },
          maxVolume: { type: 'number', format: 'double', example: 11453800 },
          minVolume: { type: 'number', format: 'double', example: 1933956 },
          dataPoints: { type: 'integer', example: 8 },
        },
        required: ['totalVolume', 'avgVolume', 'maxVolume', 'minVolume', 'dataPoints'],
      },
      VolumeChartData: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/VolumeChartPoint' },
              },
              summary: { $ref: '#/components/schemas/VolumeChartSummary' },
              metadata: { $ref: '#/components/schemas/ChartMetadata' },
            },
            required: ['data', 'summary', 'metadata'],
          },
        },
        required: ['data'],
      },
      VolumeChartResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          chart: { $ref: '#/components/schemas/VolumeChartData' },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'chart', 'meta'],
      },
      VolumeChangeEntry: {
        type: 'object',
        properties: {
          value: { type: 'number', format: 'double', example: 1.04 },
          display: { type: 'string', example: '+1.04%' },
          trend: { type: 'string', enum: ['up', 'down', 'flat'], example: 'up' },
        },
        required: ['value', 'display', 'trend'],
      },
      VolumeRangeEntry: {
        type: 'object',
        properties: {
          total: { type: 'number', format: 'double', example: 1749761 },
          totalDisplay: { type: 'string', example: '$1.75M' },
          average: { type: 'number', format: 'double', example: 1731806.35 },
          averageDisplay: { type: 'string', example: '$1.73M' },
          change: { type: 'number', format: 'double', example: 1.0367 },
          changeDisplay: { type: 'string', example: '+1.04%' },
          trend: { type: 'string', enum: ['up', 'down', 'flat'], example: 'up' },
          low: { type: 'number', format: 'double', example: 811700 },
          lowDisplay: { type: 'string', example: '$811.70K' },
          high: { type: 'number', format: 'double', example: 1933956 },
          highDisplay: { type: 'string', example: '$1.93M' },
        },
        required: [
          'total',
          'totalDisplay',
          'average',
          'averageDisplay',
          'change',
          'changeDisplay',
          'trend',
          'low',
          'lowDisplay',
          'high',
          'highDisplay',
        ],
      },
      VolumeWidget: {
        type: 'object',
        properties: {
          current: {
            type: 'object',
            properties: {
              volume: { type: 'number', format: 'double', example: 1749761 },
              display: { type: 'string', example: '$1.75M' },
              lastUpdate: {
                type: 'string',
                format: 'date-time',
                example: '2025-09-24T20:45:02.000Z',
              },
            },
            required: ['volume', 'display', 'lastUpdate'],
          },
          changes: {
            type: 'object',
            additionalProperties: { $ref: '#/components/schemas/VolumeChangeEntry' },
          },
          ranges: {
            type: 'object',
            additionalProperties: { $ref: '#/components/schemas/VolumeRangeEntry' },
          },
          rankings: {
            type: 'object',
            properties: {
              today: { type: 'string', example: 'Low' },
              percentOfAvg: {
                type: 'object',
                properties: {
                  '7d': { type: 'number', format: 'double', example: 40.31 },
                  '30d': { type: 'number', format: 'double', example: 57.71 },
                  '90d': { type: 'number', format: 'double', example: 109.25 },
                },
              },
            },
          },
          allTime: {
            type: 'object',
            properties: {
              highest: {
                type: 'object',
                properties: {
                  value: { type: 'number', format: 'double', example: 33566063 },
                  display: { type: 'string', example: '$33.57M' },
                  date: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-09-15T06:45:02.000Z',
                  },
                },
              },
              lowest: {
                type: 'object',
                properties: {
                  value: { type: 'number', format: 'double', example: 165574 },
                  display: { type: 'string', example: '$165.57K' },
                  date: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-08-31T02:00:02.000Z',
                  },
                },
              },
              average: {
                type: 'object',
                properties: {
                  value: { type: 'number', format: 'double', example: 2366136.12 },
                  display: { type: 'string', example: '$2.37M' },
                },
              },
            },
          },
        },
        required: ['current', 'changes', 'ranges', 'rankings', 'allTime'],
      },
      VolumeWidgetResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          widget: { $ref: '#/components/schemas/VolumeWidget' },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'widget', 'meta'],
      },
      VolumeStatsCurrent: {
        type: 'object',
        properties: {
          volume: { type: 'number', format: 'double', example: 2108304 },
          volumeDisplay: { type: 'string', example: '$2.11M' },
          percentOfAvg30d: { type: 'number', format: 'double', example: 71.58 },
          ranking: { type: 'string', example: 'Low' },
          lastUpdate: { type: 'string', format: 'date-time', example: '2025-09-23T13:01:42.000Z' },
        },
        required: ['volume', 'volumeDisplay', 'percentOfAvg30d', 'ranking', 'lastUpdate'],
      },
      VolumeStatsHistorical: {
        type: 'object',
        properties: {
          period: { type: 'string', example: '30d' },
          startDate: { type: 'string', format: 'date-time', example: '2025-08-25T20:53:08.931Z' },
          endDate: { type: 'string', format: 'date-time', example: '2025-09-24T20:53:08.931Z' },
          dataPoints: { type: 'integer', example: 31 },
          total: { type: 'number', format: 'double', example: 91639464 },
          totalDisplay: { type: 'string', example: '$91.64M' },
          average: { type: 'number', format: 'double', example: 2956111.74 },
          averageDisplay: { type: 'string', example: '$2.96M' },
          median: { type: 'number', format: 'double', example: 617954 },
          standardDeviation: { type: 'number', format: 'double', example: 5002952.75 },
          volatility: { type: 'number', format: 'double', example: 169.241 },
          coverage: { type: 'string', example: '31/31 days' },
          completeness: { type: 'string', example: '100.0' },
        },
        required: ['period', 'startDate', 'endDate', 'dataPoints', 'total', 'average'],
      },
      VolumeStatsDistributionBucket: {
        type: 'object',
        properties: {
          range: { type: 'string', example: '$227.80K - $2.40M' },
          count: { type: 'integer', example: 20 },
          percentage: { type: 'number', format: 'double', example: 66.67 },
        },
        required: ['range', 'count', 'percentage'],
      },
      VolumeStatsDistribution: {
        type: 'object',
        properties: {
          percentiles: {
            type: 'object',
            properties: {
              p5: { type: 'number', format: 'double', example: 304726 },
              p10: { type: 'number', format: 'double', example: 313750 },
              p25: { type: 'number', format: 'double', example: 422721 },
              p50: { type: 'number', format: 'double', example: 617954 },
              p75: { type: 'number', format: 'double', example: 3532505 },
              p90: { type: 'number', format: 'double', example: 5122842 },
              p95: { type: 'number', format: 'double', example: 16799820 },
            },
          },
          iqr: { type: 'number', format: 'double', example: 3109784 },
          skewness: { type: 'number', format: 'double', example: 2.596 },
          buckets: {
            type: 'array',
            items: { $ref: '#/components/schemas/VolumeStatsDistributionBucket' },
          },
        },
        required: ['percentiles', 'iqr', 'skewness'],
      },
      VolumeStatsPatternEntry: {
        type: 'object',
        properties: {
          day: { type: 'string', example: 'Sunday' },
          avgVolume: { type: 'number', format: 'double', example: 6607640.75 },
          avgVolumeDisplay: { type: 'string', example: '$6.61M' },
          dataPoints: { type: 'integer', example: 4 },
        },
      },
      VolumeStatsMonthlyEntry: {
        type: 'object',
        properties: {
          month: { type: 'string', example: '2025-03' },
          avgVolume: { type: 'number', format: 'double', example: 1709800.9947 },
          totalVolume: { type: 'number', format: 'double', example: 53003831 },
          avgVolumeDisplay: { type: 'string', example: '$1.71M' },
          totalVolumeDisplay: { type: 'string', example: '$53.00M' },
        },
      },
      VolumeStatsEventsEntry: {
        type: 'object',
        properties: {
          date: { type: 'string', format: 'date-time', example: '2025-09-14T21:00:00.000Z' },
          volume: { type: 'number', format: 'double', example: 16799820 },
          volumeDisplay: { type: 'string', example: '$16.80M' },
          deviations: { type: 'string', example: '2.76' },
        },
        required: ['date', 'volume', 'volumeDisplay'],
      },
      VolumeStatsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          stats: {
            type: 'object',
            properties: {
              current: { $ref: '#/components/schemas/VolumeStatsCurrent' },
              historical: { $ref: '#/components/schemas/VolumeStatsHistorical' },
              distribution: { $ref: '#/components/schemas/VolumeStatsDistribution' },
              patterns: {
                type: 'object',
                properties: {
                  dayOfWeek: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/VolumeStatsPatternEntry' },
                  },
                  month: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/VolumeStatsMonthlyEntry' },
                  },
                },
              },
              trends: {
                type: 'object',
                properties: {
                  direction: { type: 'string', example: 'up' },
                  strength: { type: 'number', format: 'double', example: 1092.67 },
                  momentum: { type: 'number', format: 'double', example: -37.69 },
                  acceleration: { type: 'string', example: 'decreasing' },
                },
              },
              events: {
                type: 'object',
                properties: {
                  highestDays: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/VolumeStatsEventsEntry' },
                  },
                  lowestDays: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/VolumeStatsEventsEntry' },
                  },
                  unusualActivity: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/VolumeStatsEventsEntry' },
                  },
                },
              },
              dataQuality: {
                type: 'object',
                properties: {
                  missingDays: { type: 'integer', example: 0 },
                  completeness: { type: 'string', example: '100.0%' },
                  dataSource: { type: 'string', example: 'Historical daily volume data' },
                  lastUpdate: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-09-24T20:53:09.068Z',
                  },
                },
              },
            },
            required: ['current', 'historical'],
          },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'stats', 'meta'],
      },
      VolumeTableRow: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 0 },
          timestamp: { type: 'string', format: 'date-time', example: '2025-09-24T20:00:00.000Z' },
          volume: { type: 'number', format: 'double', example: 1755366 },
          change: { type: 'number', format: 'double', example: -0.461 },
          high: { type: 'number', format: 'double', example: 1755366 },
          low: { type: 'number', format: 'double', example: 1749761 },
          dataPoints: { type: 'integer', example: 4 },
          display: {
            type: 'object',
            properties: {
              volume: { type: 'string', example: '$1.76M' },
              change: { $ref: '#/components/schemas/DisplayChange' },
              high: { type: 'string', example: '$1.76M' },
              low: { type: 'string', example: '$1.75M' },
            },
          },
        },
        required: ['id', 'timestamp', 'volume', 'change', 'high', 'low', 'dataPoints'],
      },
      VolumeTableResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          table: {
            type: 'object',
            properties: {
              columns: {
                type: 'array',
                items: { $ref: '#/components/schemas/PriceTableColumn' },
              },
              rows: {
                type: 'array',
                items: { $ref: '#/components/schemas/VolumeTableResponseRow' },
              },
            },
            required: ['columns', 'rows'],
          },
          meta: { $ref: '#/components/schemas/Meta' },
          pagination: { $ref: '#/components/schemas/Pagination' },
        },
        required: ['success', 'table', 'meta', 'pagination'],
      },
      VolumeTableResponseRow: { $ref: '#/components/schemas/VolumeTableRow' },
      HoldersChartPoint: {
        type: 'object',
        properties: {
          timestamp: { type: 'string', format: 'date-time', example: '2025-09-24T20:00:00.000Z' },
          holders: { type: 'integer', example: 49891 },
          source: { type: 'string', enum: ['historical', 'live'], example: 'live' },
        },
        required: ['timestamp', 'holders', 'source'],
      },
      HoldersChartSummary: {
        type: 'object',
        properties: {
          current: { type: 'integer', example: 49891 },
          high: { type: 'integer', example: 49901 },
          low: { type: 'integer', example: 49408 },
          average: { type: 'number', format: 'double', example: 49628.84 },
          volatility: { type: 'number', format: 'double', example: 165.42 },
          trend: { type: 'string', example: 'neutral' },
          change: { type: 'number', format: 'double', example: 0.2975 },
        },
        required: ['current', 'high', 'low', 'average', 'volatility', 'trend', 'change'],
      },
      HoldersChartData: {
        type: 'object',
        properties: {
          data: {
            type: 'object',
            properties: {
              data: {
                type: 'array',
                items: { $ref: '#/components/schemas/HoldersChartPoint' },
              },
              summary: { $ref: '#/components/schemas/HoldersChartSummary' },
              metadata: { $ref: '#/components/schemas/ChartMetadata' },
            },
            required: ['data', 'summary', 'metadata'],
          },
        },
        required: ['data'],
      },
      HoldersChartResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          chart: { $ref: '#/components/schemas/HoldersChartData' },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'chart', 'meta'],
      },
      HoldersChangeEntry: {
        type: 'object',
        properties: {
          value: { type: 'number', format: 'double', example: 0.2834 },
          display: { type: 'string', example: '+141 (+0.28%)' },
          trend: { type: 'string', enum: ['up', 'down', 'flat'], example: 'up' },
        },
        required: ['value', 'display', 'trend'],
      },
      HoldersRangeEntry: {
        type: 'object',
        properties: {
          average: { type: 'number', format: 'double', example: 49850.29 },
          averageDisplay: { type: 'string', example: '49,850.286' },
          change: { type: 'number', format: 'double', example: 0.2834 },
          changeDisplay: { type: 'string', example: '+141 (+0.28%)' },
          trend: { type: 'string', enum: ['up', 'down', 'flat'], example: 'up' },
          high: { type: 'integer', example: 49901 },
          low: { type: 'integer', example: 49750 },
          highDate: { type: 'string', format: 'date-time', example: '2025-09-19T21:00:00.000Z' },
          lowDate: { type: 'string', format: 'date-time', example: '2025-09-16T21:00:00.000Z' },
        },
        required: ['average', 'averageDisplay', 'change', 'changeDisplay', 'trend', 'high', 'low'],
      },
      HoldersGrowthSegment: {
        type: 'object',
        properties: {
          average: { type: 'number', format: 'double', example: 4.7931 },
          display: { type: 'string', example: '4.793' },
        },
        required: ['average'],
      },
      HoldersWidget: {
        type: 'object',
        properties: {
          current: {
            type: 'object',
            properties: {
              holders: { type: 'integer', example: 49891 },
              display: { type: 'string', example: '49,891' },
              lastUpdate: {
                type: 'string',
                format: 'date-time',
                example: '2025-09-24T20:53:36.000Z',
              },
            },
            required: ['holders', 'display', 'lastUpdate'],
          },
          changes: {
            type: 'object',
            additionalProperties: { $ref: '#/components/schemas/HoldersChangeEntry' },
          },
          ranges: {
            type: 'object',
            additionalProperties: { $ref: '#/components/schemas/HoldersRangeEntry' },
          },
          growth: {
            type: 'object',
            properties: {
              daily: { $ref: '#/components/schemas/HoldersGrowthSegment' },
              weekly: { $ref: '#/components/schemas/HoldersGrowthSegment' },
              monthly: { $ref: '#/components/schemas/HoldersGrowthSegment' },
              velocity: { type: 'string', example: 'Slow' },
              acceleration: { type: 'string', example: 'Decelerating' },
            },
          },
          milestones: {
            type: 'object',
            properties: {
              next: { type: 'integer', example: 50000 },
              progress: { type: 'number', format: 'double', example: 100 },
              estimatedDate: {
                type: 'string',
                format: 'date-time',
                example: '2025-10-17T20:53:37.167Z',
              },
            },
          },
          allTime: {
            type: 'object',
            properties: {
              high: {
                type: 'object',
                properties: {
                  value: { type: 'integer', example: 52596 },
                  display: { type: 'string', example: '52,596' },
                  date: {
                    type: 'string',
                    format: 'date-time',
                    example: '2025-01-14T22:00:00.000Z',
                  },
                  daysAgo: { type: 'integer', example: 252 },
                },
              },
              low: {
                type: 'object',
                properties: {
                  value: { type: 'integer', example: 5449 },
                  display: { type: 'string', example: '5,449' },
                  date: {
                    type: 'string',
                    format: 'date-time',
                    example: '2023-12-15T22:00:00.000Z',
                  },
                  daysAgo: { type: 'integer', example: 648 },
                },
              },
              average: {
                type: 'object',
                properties: {
                  value: { type: 'number', format: 'double', example: 40883.02 },
                  display: { type: 'string', example: '40,883.02' },
                },
              },
            },
          },
        },
        required: ['current', 'changes', 'ranges', 'growth', 'milestones', 'allTime'],
      },
      HoldersWidgetResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          widget: { $ref: '#/components/schemas/HoldersWidget' },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'widget', 'meta'],
      },
      HoldersStatsCurrent: {
        type: 'object',
        properties: {
          holders: { type: 'integer', example: 49891 },
          holdersDisplay: { type: 'string', example: '49,891' },
          lastUpdate: { type: 'string', format: 'date-time', example: '2025-09-24T20:53:41.000Z' },
        },
        required: ['holders', 'holdersDisplay', 'lastUpdate'],
      },
      HoldersStatsHistorical: {
        type: 'object',
        properties: {
          period: { type: 'string', example: '30d' },
          startDate: { type: 'string', format: 'date-time', example: '2025-08-25T20:53:41.322Z' },
          endDate: { type: 'string', format: 'date-time', example: '2025-09-24T20:53:41.322Z' },
          dataPoints: { type: 'integer', example: 30 },
          min: { type: 'integer', example: 49408 },
          max: { type: 'integer', example: 49901 },
          average: { type: 'number', format: 'double', example: 49620.1 },
          median: { type: 'integer', example: 49597 },
          standardDeviation: { type: 'number', format: 'double', example: 160.96 },
          minDisplay: { type: 'string', example: '49,408' },
          maxDisplay: { type: 'string', example: '49,901' },
          averageDisplay: { type: 'string', example: '49,620' },
          medianDisplay: { type: 'string', example: '49,597' },
        },
        required: [
          'period',
          'startDate',
          'endDate',
          'dataPoints',
          'min',
          'max',
          'average',
          'median',
        ],
      },
      HoldersStatsDistribution: {
        type: 'object',
        properties: {
          giniCoefficient: { type: 'number', format: 'double', example: 0.00183 },
          herfindahlIndex: { type: 'number', format: 'double', example: 333.34 },
          concentrationRatio: { type: 'number', format: 'double', example: 33.46 },
          diversityScore: { type: 'number', format: 'double', example: 3.401 },
          health: { type: 'number', format: 'double', example: 99.817 },
        },
        required: ['giniCoefficient', 'herfindahlIndex'],
      },
      HoldersStatsGrowth: {
        type: 'object',
        properties: {
          absolute: { type: 'integer', example: 151 },
          percentage: { type: 'number', format: 'double', example: 0.3036 },
          daily: {
            type: 'object',
            properties: {
              average: { type: 'number', format: 'double', example: 5.3929 },
              percent: { type: 'number', format: 'double', example: 0.010875 },
              min: { type: 'integer', example: -67 },
              max: { type: 'integer', example: 147 },
            },
          },
          weekly: {
            type: 'object',
            properties: {
              average: { type: 'number', format: 'double', example: 37.75 },
              percent: { type: 'number', format: 'double', example: 0.076125 },
            },
          },
          monthly: {
            type: 'object',
            properties: {
              average: { type: 'number', format: 'double', example: 161.79 },
              percent: { type: 'number', format: 'double', example: 0.32625 },
            },
          },
          velocity: { type: 'string', example: 'Slow' },
          acceleration: { type: 'string', example: 'Steady' },
        },
        required: ['absolute', 'percentage'],
      },
      HoldersStatsMilestones: {
        type: 'object',
        properties: {
          achieved: {
            type: 'array',
            items: { type: 'integer', example: 1000 },
          },
          next: { type: 'integer', example: 50000 },
          progress: { type: 'number', format: 'double', example: 99.564 },
          estimatedDate: {
            type: 'string',
            format: 'date-time',
            example: '2025-10-17T20:53:41.449Z',
          },
          recent: {
            type: 'object',
            properties: {
              milestone: { type: 'integer', example: 25000 },
              date: { type: 'string', format: 'date-time', example: '2024-03-01T22:00:00.000Z' },
              daysAgo: { type: 'integer', example: 571 },
            },
          },
        },
      },
      HoldersStatsProjections: {
        type: 'object',
        properties: {
          week: { type: 'integer', example: 49929 },
          month: { type: 'integer', example: 50053 },
          quarter: { type: 'integer', example: 50376 },
          year: { type: 'integer', example: 51859 },
          confidence: { type: 'string', example: 'Medium' },
        },
      },
      HoldersStatsComparative: {
        type: 'object',
        properties: {
          vsAverage: { type: 'number', format: 'double', example: 22.0335 },
          vsMedian: { type: 'number', format: 'double', example: 0.9306 },
          percentile: { type: 'integer', example: 94 },
        },
      },
      HoldersStatsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          stats: {
            type: 'object',
            properties: {
              current: { $ref: '#/components/schemas/HoldersStatsCurrent' },
              historical: { $ref: '#/components/schemas/HoldersStatsHistorical' },
              distribution: { $ref: '#/components/schemas/HoldersStatsDistribution' },
              trends: {
                type: 'object',
                properties: {
                  trend: { type: 'string', example: 'Stable' },
                  seasonality: { type: 'string', example: 'None detected' },
                  volatility: { type: 'string', example: '0.33' },
                  consistency: { type: 'string', example: '46.4' },
                  growthPhase: { type: 'string', example: 'Plateau' },
                },
              },
              growth: { $ref: '#/components/schemas/HoldersStatsGrowth' },
              milestones: { $ref: '#/components/schemas/HoldersStatsMilestones' },
              projections: { $ref: '#/components/schemas/HoldersStatsProjections' },
              comparative: { $ref: '#/components/schemas/HoldersStatsComparative' },
            },
            required: ['current', 'historical'],
          },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'stats', 'meta'],
      },
      HoldersTableRow: {
        type: 'object',
        properties: {
          id: { type: 'integer', example: 0 },
          timestamp: { type: 'string', format: 'date-time', example: '2025-09-24T20:00:00.000Z' },
          holders: { type: 'integer', example: 49886 },
          change: { type: 'number', format: 'double', example: 0.0261 },
          high: { type: 'integer', example: 49892 },
          low: { type: 'integer', example: 49882 },
          dataPoints: { type: 'integer', example: 4 },
          display: {
            type: 'object',
            properties: {
              holders: { type: 'string', example: '49,886' },
              change: { $ref: '#/components/schemas/DisplayChange' },
              high: { type: 'string', example: '49,892' },
              low: { type: 'string', example: '49,882' },
            },
          },
        },
        required: ['id', 'timestamp', 'holders', 'change', 'high', 'low', 'dataPoints'],
      },
      HoldersTableResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          table: {
            type: 'object',
            properties: {
              columns: { $ref: '#/components/schemas/Pagination' },
              rows: {
                type: 'object',
                properties: {
                  columns: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/PriceTableColumn' },
                  },
                  rows: {
                    type: 'array',
                    items: { $ref: '#/components/schemas/HoldersTableRow' },
                  },
                },
                required: ['columns', 'rows'],
              },
            },
            required: ['columns', 'rows'],
          },
          meta: { $ref: '#/components/schemas/Meta' },
        },
        required: ['success', 'table', 'meta'],
      },
      EndpointDescriptor: {
        type: 'object',
        properties: {
          url: { type: 'string', example: '/v3/prices/chart' },
          description: { type: 'string', example: 'Get price data formatted for charts' },
          params: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['url', 'description'],
      },
      EndpointsResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          endpoints: {
            type: 'object',
            additionalProperties: { $ref: '#/components/schemas/EndpointDescriptor' },
          },
        },
        required: ['success', 'endpoints'],
      },
    },
    responses: {
      UnauthorizedError: {
        description: 'i18n:openapi.responses.unauthorized',
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'AUTH_REQUIRED' },
                    message: { type: 'string', example: 'API key required' },
                  },
                },
              },
            },
          },
        },
      },
      RateLimited: {
        description: 'i18n:openapi.responses.rateLimited',
        headers: {
          'Retry-After': {
            description: 'Seconds until you can retry',
            schema: { type: 'integer', minimum: 1 },
          },
        },
        content: {
          'application/json': {
            schema: {
              type: 'object',
              properties: {
                success: { type: 'boolean', example: false },
                error: {
                  type: 'object',
                  properties: {
                    code: { type: 'string', example: 'RATE_LIMITED' },
                    message: { type: 'string', example: 'Too many requests' },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
} as const;

export type NosPlusV3Spec = typeof nosPlusV3Spec;

export default nosPlusV3Spec;
