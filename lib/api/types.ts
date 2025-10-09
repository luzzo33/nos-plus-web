export interface ChartDataPoint {
  timestamp: string;
  price: number;
  ohlc?: {
    open: number;
    high: number;
    low: number;
    close: number;
  };
  sma7?: number;
  sma20?: number;
  sma50?: number;
  rsi?: number;
  source?: 'live' | 'historical';
}

export interface VolumeChartDataPoint {
  timestamp: string;
  volumeUSD: number;
  interval: string;
  source: 'live' | 'historical';
}

export interface ApiMeta {
  timestamp?: string;
  type?: string;
  [key: string]: unknown;
}

export interface SentimentChartDataPoint {
  timestamp: string;
  index: number;
  sentiment: string;
  zone: string;
  change?: number;
  changePercent?: number;
  ma7?: number;
  ma14?: number;
  ma30?: number;
  zones?: {
    extremeFear: { start: number; end: number; active: boolean };
    fear: { start: number; end: number; active: boolean };
    neutral: { start: number; end: number; active: boolean };
    greed: { start: number; end: number; active: boolean };
    extremeGreed: { start: number; end: number; active: boolean };
  };
  components?: {
    price: { weight: number; value: number; contribution: number };
    volume: { weight: number; value: number; contribution: number };
    holders: { weight: number; value: number; contribution: number };
    staking: { weight: number; value: number; contribution: number };
    social: { weight: number; value: number; contribution: number };
  };
}

export interface ForecastChartDataPoint {
  timestamp: string;
  price: number;
  type: 'historical' | 'forecast';
  isFuture: boolean;
  confidence?: {
    upper95: number;
    upper68: number;
    lower68: number;
    lower95: number;
    uncertainty: number;
  };
  trendLine?: number;
  trendDirection?: string;
  trendStrength?: number;
}

export interface ChartResponse {
  success: boolean;
  chart: {
    data: ChartDataPoint[];
    summary: {
      current: number;
      high: number;
      low: number;
      average: number;
      volatility: number;
      trend: 'up' | 'down' | 'neutral';
      change: number;
    };
    metadata: {
      range: string;
      interval: string;
      dataPoints: number;
      startDate: string;
      endDate: string;
      indicators?: string[];
    };
  };
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface VolumeChartResponse {
  success: boolean;
  chart: {
    data: {
      data: VolumeChartDataPoint[];
      summary: {
        totalVolume: number;
        avgVolume: number;
        maxVolume: number;
        minVolume: number;
        dataPoints: number;
      };
      metadata: {
        range: string;
        interval: string;
        dataPoints: number;
        startDate: string;
        endDate: string;
      };
    };
  };
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface SentimentChartResponse {
  success: boolean;
  chart: {
    data: SentimentChartDataPoint[];
    interval: string;
    range: string;
    dataPoints: number;
    summary: {
      current: {
        index: number;
        sentiment: string;
        zone: string;
      };
      period: {
        min: number;
        max: number;
        avg: number;
        stdDev: number;
        volatility: number;
      };
      distribution: {
        extremeFear: number;
        fear: number;
        neutral: number;
        greed: number;
        extremeGreed: number;
      };
      trend: string;
    };
    currentSentiment: string;
  };
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface ForecastChartResponse {
  success: boolean;
  chart: {
    data: ForecastChartDataPoint[];
    interval: string;
    range: string;
    dataPoints: number;
    forecastHorizon: {
      start: string;
      end: string;
      days: number;
    };
    summary: {
      current: {
        price: number;
        date: string;
      };
      forecast: {
        min: number;
        max: number;
        avg: number;
        final: number;
        horizon: string;
      };
      targets: {
        '1w': {
          price: number;
          change: number;
          changePercent: number;
          date: string;
        };
        '1m': {
          price: number;
          change: number;
          changePercent: number;
          date: string;
        };
        '3m': {
          price: number;
          change: number;
          changePercent: number;
          date: string;
        };
        '6m': {
          price: number;
          change: number;
          changePercent: number;
          date: string;
        };
      };
      trend: {
        direction: string;
        strength: string;
        slope: number;
        annualizedReturn: number;
        confidence: number;
      };
      potential: {
        upside: number;
        downside: number;
        expected: number;
      };
      accuracy: {
        confidence: number;
        volatility: number;
      };
    };
  };
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface SentimentWidgetData {
  current: {
    index: number;
    display: string;
    sentiment: string;
    zone: string;
    description: string;
    date: string;
  };
  gauge: {
    value: number;
    min: number;
    max: number;
    zones: Array<{
      name: string;
      start: number;
      end: number;
      color: string;
    }>;
  };
  changes: {
    '24h': {
      absolute: number;
      percentage: number;
      display: string;
      trend: 'up' | 'down';
    };
    '7d': {
      absolute: number;
      percentage: number;
      display: string;
      trend: 'up' | 'down';
    };
    '30d': {
      absolute: number;
      percentage: number;
      display: string;
      trend: 'up' | 'down';
    };
  };
  history: {
    extremes: {
      highest: {
        value: number;
        date: string;
        sentiment: string;
      };
      lowest: {
        value: number;
        date: string;
        sentiment: string;
      };
      average: {
        value: number;
        sentiment: string;
      };
      volatility: number;
    };
    zoneDistribution: {
      extremeFear: { count: number; percentage: string };
      fear: { count: number; percentage: string };
      neutral: { count: number; percentage: string };
      greed: { count: number; percentage: string };
      extremeGreed: { count: number; percentage: string };
    };
  };
  trend: {
    direction: string;
    strength: number;
    momentum: string;
    isExtreme: boolean;
    movingAverages: {
      ma7: string;
      ma14: string;
      ma30: string;
    };
  };
  marketContext: {
    price: number;
    volume: number;
    holders: number;
    stakingRatio: number;
    stakingAPR: number;
  };
  interpretation: {
    primary: string;
    action: string;
    riskLevel: string;
    marketPhase: string;
  };
  sparkline: Array<{
    date: string;
    value: number;
  }>;
}

export interface ForecastWidgetData {
  current: {
    price: number;
    priceDisplay: string;
    lastUpdate: string;
    change24h: number;
    change24hDisplay: string;
  };
  forecast: {
    day1: {
      price: number;
      priceDisplay: string;
      change: number;
      changeDisplay: string;
    };
    day7: {
      price: number;
      priceDisplay: string;
      change: number;
      changeDisplay: string;
    };
    day30: {
      price: number;
      priceDisplay: string;
      change: number;
      changeDisplay: string;
    };
    day60: {
      price: number;
      priceDisplay: string;
      change: number;
      changeDisplay: string;
    };
    day90: {
      price: number;
      priceDisplay: string;
      change: number;
      changeDisplay: string;
    };
    day180: {
      price: number;
      priceDisplay: string;
      change: number;
      changeDisplay: string;
    };
    day365: {
      price: number;
      priceDisplay: string;
      change: number;
      changeDisplay: string;
    };
  };
  accuracy: {
    overall: number;
    display: string;
    rating: string;
    trend: string;
  };
  performance: {
    within5Percent: number;
    within10Percent: number;
    totalPredictions: number;
  };
  signals: {
    trend: string;
    strength: string;
    recommendation: string;
  };
  model: {
    lastForecastDate: string;
    version: string;
  };
}

export interface WidgetData {
  price: {
    current: number;
    display: string;
    currency: string;
  };
  changes: {
    '24h': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '7d': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '30d': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '90d': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '180d': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '1y': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
  };
  ranges: {
    '24h': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '7d': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '30d': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '90d': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '180d': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '1y': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
  };
  marketCap: {
    current: number;
    display: string;
    fullyDiluted: number;
    fullyDilutedDisplay: string;
  };
  supply: {
    circulating: number;
    total: number;
    max: number;
    percentCirculating: number;
  };
  metadata: {
    lastUpdate: string;
    exchanges: number;
    pairs: number;
  };
  sparkline: Array<{
    price: number;
    timestamp: string;
  }>;
}

export interface VolumeWidgetData {
  volume: {
    current: number;
    display: string;
    interval: string;
  };
  changes: {
    '24h': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '7d': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '30d': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '90d': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '180d': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
    '1y': {
      value: number;
      display: string;
      trend: 'up' | 'down';
    };
  };
  ranges: {
    '24h': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '7d': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '30d': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '90d': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '180d': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
    '1y': {
      high: number;
      low: number;
      highDisplay: string;
      lowDisplay: string;
    };
  };
  averages: {
    daily: number;
    weekly: number;
    monthly: number;
    dailyDisplay: string;
    weeklyDisplay: string;
    monthlyDisplay: string;
  };
  distribution: {
    dex: number;
    cex: number;
    dexPercentage: number;
    cexPercentage: number;
  };
  metadata: {
    lastUpdate: string;
    dataPoints: number;
  };
  sparkline: Array<{
    volume: number;
    timestamp: string;
  }>;
}

export interface TableColumn {
  key: string;
  label: string;
  type: string;
  sortable: boolean;
}

export interface TableChangeDisplay {
  value: string;
  color: 'green' | 'red';
}

export interface PriceTableRowDisplay {
  price: string;
  change: TableChangeDisplay;
  high: string;
  low: string;
}

export interface PriceTableRow {
  id: number | string;
  timestamp: string;
  price: number;
  change: number;
  high: number;
  low: number;
  dataPoints: number;
  display: PriceTableRowDisplay;
}

export interface TableResponse {
  success: boolean;
  table: {
    columns: TableColumn[];
    rows: PriceTableRow[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface VolumeTableRowDisplay {
  volume: string;
  change: TableChangeDisplay;
  high: string;
  low: string;
}

export interface VolumeTableRow {
  id: string | number;
  timestamp: string;
  volume: number;
  change: number;
  high: number;
  low: number;
  dataPoints: number;
  display: VolumeTableRowDisplay;
}

export interface VolumeTableResponse {
  success: boolean;
  table: {
    columns: TableColumn[];
    rows: VolumeTableRow[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface StatsData {
  range: string;
  period: {
    start: string;
    end: string;
    days: number;
  };
  current: {
    price: number;
    priceDisplay: string;
    marketCap: number;
    marketCapDisplay: string;
    rank: number;
  };
  price: {
    high: number;
    low: number;
    average: number;
    volatility: number;
    standardDeviation: number;
    changeFromStart: number;
    changeFromStartPercent: number;
  };
  performance: {
    bestDay: {
      date: string;
      price: number;
      change: number;
      changePercent: number;
    };
    worstDay: {
      date: string;
      price: number;
      change: number;
      changePercent: number;
    };
    volatileDays: number;
    stableDays: number;
    positiveDays: number;
    negativeDays: number;
  };
  technical: {
    rsi: number;
    sma7: number;
    sma30: number;
    sma90: number;
    trend: string;
    momentum: string;
    support: number;
    resistance: number;
  };
  correlations: {
    bitcoin: number;
    ethereum: number;
    marketIndex: number;
  };
  distribution: {
    priceRanges: Array<{
      range: string;
      count: number;
      percentage: number;
    }>;
    volumeProfile: Array<{
      price: number;
      volume: number;
      percentage: number;
    }>;
  };
  dataQuality: {
    completeness: number;
    dataPoints: number;
    missingPoints: number;
    sources: string[];
  };
}

export interface VolumeStatsData {
  range: string;
  period: {
    start: string;
    end: string;
    days: number;
  };
  current: {
    volume: number;
    volumeDisplay: string;
    date: string;
    intervalType: string;
  };
  aggregates: {
    total: number;
    average: number;
    median: number;
    standardDeviation: number;
    coefficientOfVariation: number;
    totalDisplay: string;
    averageDisplay: string;
    medianDisplay: string;
  };
  trends: {
    direction: string;
    strength: number;
    momentum: string;
    growthRate: number;
    acceleration: number;
  };
  distribution: {
    byInterval: {
      hourly: Array<{
        hour: number;
        avgVolume: number;
        percentage: number;
      }>;
      daily: Array<{
        dayOfWeek: string;
        avgVolume: number;
        percentage: number;
      }>;
      monthly: Array<{
        month: string;
        totalVolume: number;
        avgVolume: number;
        percentage: number;
      }>;
    };
    byRange: Array<{
      range: string;
      count: number;
      percentage: number;
      avgVolume: number;
    }>;
    percentiles: {
      p10: number;
      p25: number;
      p50: number;
      p75: number;
      p90: number;
      p95: number;
      p99: number;
    };
  };
  patterns: {
    seasonality: {
      detected: boolean;
      period: number;
      strength: number;
      description: string;
    };
    cycles: {
      detected: boolean;
      primaryCycle: number;
      secondaryCycle: number;
    };
    outliers: {
      count: number;
      threshold: number;
      impact: string;
    };
  };
  extremes: {
    highest: Array<{
      date: string;
      volume: number;
      volumeDisplay: string;
    }>;
    lowest: Array<{
      date: string;
      volume: number;
      volumeDisplay: string;
    }>;
    unusual: Array<{
      date: string;
      volume: number;
      volumeDisplay: string;
      deviations: string;
    }>;
  };
  dataQuality: {
    missingDays: number;
    completeness: string;
    dataSource: string;
    lastUpdate: string;
  };
}

export interface StatsResponse {
  success: boolean;
  stats: StatsData;
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface VolumeStatsResponse {
  success: boolean;
  stats: VolumeStatsData;
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface HoldersChartDataPoint {
  timestamp: string;
  holders: number;
  interval?: string;
  dataPoints?: number;
  source?: 'live' | 'historical';
}

export interface HoldersChartResponse {
  success: boolean;
  chart: {
    data:
      | HoldersChartDataPoint[]
      | {
          data: HoldersChartDataPoint[];
          summary: {
            total: number;
            average: number;
            high: number;
            low: number;
          };
          metadata: {
            range: string;
            interval: string;
            dataPoints: number;
            startDate?: string;
            endDate?: string;
          };
        };
    summary?: {
      total: number;
      average: number;
      high: number;
      low: number;
    };
    metadata?: {
      range: string;
      interval: string;
      dataPoints: number;
      startDate?: string;
      endDate?: string;
    };
  };
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface HoldersWidgetData {
  current: {
    holders: number;
    display: string;
    lastUpdate: string;
  };
  changes: {
    '24h': { value: number; display: string; trend: 'up' | 'down' };
    '7d': { value: number; display: string; trend: 'up' | 'down' };
    '30d': { value: number; display: string; trend: 'up' | 'down' };
    '90d': { value: number; display: string; trend: 'up' | 'down' };
    '180d': { value: number; display: string; trend: 'up' | 'down' };
    '1y': { value: number; display: string; trend: 'up' | 'down' };
  };
  ranges: {
    '24h'?: {
      average: number;
      averageDisplay: string;
      change: number;
      changeDisplay: string;
      trend: 'up' | 'down';
      high: number;
      low: number;
    };
    '7d'?: {
      average: number;
      averageDisplay: string;
      change: number;
      changeDisplay: string;
      trend: 'up' | 'down';
      high: number;
      low: number;
      highDate?: string;
      lowDate?: string;
    };
    '30d'?: {
      average: number;
      averageDisplay: string;
      change: number;
      changeDisplay: string;
      trend: 'up' | 'down';
      high: number;
      low: number;
      highDate?: string;
      lowDate?: string;
    };
    '90d'?: {
      average: number;
      averageDisplay: string;
      change: number;
      changeDisplay: string;
      trend: 'up' | 'down';
      high: number;
      low: number;
      highDate?: string;
      lowDate?: string;
    };
    '180d'?: {
      average: number;
      averageDisplay: string;
      change: number;
      changeDisplay: string;
      trend: 'up' | 'down';
      high: number;
      low: number;
      highDate?: string;
      lowDate?: string;
    };
    '1y'?: {
      average: number;
      averageDisplay: string;
      change: number;
      changeDisplay: string;
      trend: 'up' | 'down';
      high: number;
      low: number;
      highDate?: string;
      lowDate?: string;
    };
  };
  growth?: Record<string, unknown> | null;
  milestones?: Record<string, unknown> | null;
  allTime?: Record<string, unknown> | null;
}

export interface HoldersTableRowDisplay {
  holders: string;
  change?: TableChangeDisplay;
  high: string;
  low: string;
}

export interface HoldersTableRow {
  id?: string | number;
  timestamp: string;
  holders: number;
  change: number;
  high: number;
  low: number;
  dataPoints: number;
  display?: HoldersTableRowDisplay;
}

export interface HoldersTableResponse {
  success: boolean;
  table: {
    columns: TableColumn[];
    rows: HoldersTableRow[];
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface HoldersStatsResponse {
  success: boolean;
  stats: Record<string, unknown>;
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface DistributionWidgetData {
  current: {
    total: number;
    display: string;
    lastUpdate: string;
    brackets: Record<BracketKey, number>;
    percentages: Record<BracketKey, number>;
  };
  changes: Record<
    '24h' | '7d' | '30d' | '90d' | '180d' | '1y',
    {
      brackets: Record<
        BracketKey,
        {
          absolute: number;
          percentage: number;
          display: string;
          trend: 'up' | 'down';
        }
      >;
    }
  >;
  sparkline: Record<BracketKey, Array<{ time: string; value: number }>>;
  insights: Array<{ type: string; severity: string; message: string }>;
}

type BracketKey = 'micro' | 'small' | 'medium' | 'large' | 'xlarge' | 'whale' | 'megaWhale';

export interface DistributionChartResponse {
  success: boolean;
  chart: {
    data: Array<{
      timestamp: string;
      total: number;
      distribution: {
        micro: number;
        small: number;
        medium: number;
        large: number;
        xlarge: number;
        whale: number;
        megaWhale: number;
      };
      percentages: {
        micro: number;
        small: number;
        medium: number;
        large: number;
        xlarge: number;
        whale: number;
        megaWhale: number;
      };
      interval: string;
    }>;
    summary: {
      currentTotal: number;
      high: number;
      low: number;
      average: number;
      whalePercent: number;
      retailPercent: number;
    };
    metadata: {
      range: string;
      interval: string;
      dataPoints: number;
      startDate: string;
      endDate: string;
    };
  };
  meta: { timestamp: string; type: string };
}

export interface DistributionTableResponse {
  success: boolean;
  table: {
    columns: Array<{ key: string; label: string; type: string; sortable: boolean }>;
    rows: Array<Record<string, unknown>>;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  meta: { timestamp: string; type: string };
}

export type BracketName = BracketKey;
export type DistributionRange = '7d' | '30d' | '90d' | '180d' | '1y' | 'all';

export interface DistributionStats {
  overview: {
    totalHolders: number;
    totalSupply: number;
    lastUpdate: string;
    dataRange: { start: string; end: string; days: number };
    entropyNormalized?: number;
    currentDrawdown?: number;
    medianIntervalMs?: number;
  };
  current: {
    totalHolders: number;
    distribution: Record<BracketName, { count: number; range: string; percentage: string }>;
    lastUpdate: string;
    concentration: {
      whales: { count: number; percentage: string };
      retail: { count: number; percentage: string };
      middle: { count: number; percentage: string };
    };
    entropy?: number;
    entropyNormalized?: number;
  };
  historical: {
    dataPoints: number;
    holders: {
      start: number;
      end: number;
      min: number;
      max: number;
      avg: number;
      growth: number;
      growthPercent: string;
    };
    brackets: Record<
      BracketName,
      {
        start: number;
        end: number;
        change: number;
        changePercent: string;
      }
    >;
    entropy: {
      start: { entropy: number; normalized: number };
      end: { entropy: number; normalized: number };
      min: number;
      max: number;
      avg: number;
      normalizedAvg: number;
      change: number;
    };
    growthAttribution: {
      totalChange: number;
      byBracket: Array<{ name: BracketName; change: number; contributionPct: number }>;
    };
    drawdown: {
      currentDrawdown: number;
      maxDrawdown: number;
      peakIndex: number;
      maxDDIndex: number;
    };
    dataQuality?: {
      medianIntervalMs: number;
      gapCount: number;
      totalGapMs: number;
      maxGapMs: number;
      maxGapFrom?: string;
      maxGapTo?: string;
    };
  };
  movement: {
    dailyAverage: Record<BracketName, number>;
    totalChanges: Record<BracketName, number>;
    largestIncrease: { date: string; value: number };
    largestDecrease: { date: string; value: number };
    volatility: string;
    perBracketVolatility: Record<
      BracketName,
      {
        stddev: number;
        mean: number;
        cv: number | null;
      }
    >;
    correlations: {
      micro_vs_whale: number;
      small_vs_whale: number;
      retail_vs_whale: number;
    };
  };
  whaleBehavior: {
    averageWhaleCount: number;
    currentWhaleCount: number;
    whaleGrowth: number;
    whaleGrowthPercent: number;
    phases: Array<{
      type: 'stable' | 'accumulation' | 'distribution';
      start: number;
      end: number;
      duration: number;
      change: number;
    }>;
    currentPhase: 'stable' | 'accumulation' | 'distribution';
    accumulationDays: number;
    distributionDays: number;
  };
}

export interface DistributionStatsResponse {
  success: boolean;
  stats: DistributionStats;
  meta: { timestamp: string; type: 'stats' };
}

export type RichListRange = '24h' | '7d' | '30d' | '90d' | '1y' | 'all';

export interface RichListChartHolderPoint {
  address?: string;
  balance: number;
  percentage?: number;
  rank?: number;
  owner?: string | null;
  change?: number;
  changePercent?: number;
  rankChange?: number;
}

export type RichListHolders = RichListChartHolderPoint[] | Record<string, RichListChartHolderPoint>;

export interface RichListChartPoint {
  timestamp: string;
  totalBalance?: number;
  avgBalance?: number;
  concentration?: number;
  holderCount?: number;
  concentrationChange?: number;
  totalChange?: number;
  totalChangePercent?: number;
  holders?: RichListHolders;
}

export interface RichListChartResponse {
  success: boolean;
  chart: {
    data: RichListChartPoint[];
    interval: string;
    range: string;
    dataPoints: number;
    topCount?: number;
    summary?: Record<string, unknown>;
  };
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface RichListWidgetTopHolder {
  rank: number;
  address: string;
  fullAddress?: string;
  balance: number;
  balanceDisplay?: string;
  percentOfSupply?: string;
  owner?: string | null;
  badge?: string;
  type?: string;
}

export interface RichListWhaleMovement {
  address: string;
  owner?: string | null;
  change?: number;
  changePercent?: number;
  type?: string;
  currentRank?: number | null;
  previousRank?: number | null;
  rankChange?: number | null;
}

export interface RichListWidgetData {
  topHolders: RichListWidgetTopHolder[];
  concentration?: {
    top1?: {
      address?: string | null;
      balance?: number;
      percentage?: string;
      owner?: string | null;
    };
    top10?: { balance?: number; percentage?: string; avgBalance?: number; holders?: number };
    top20?: { balance?: number; percentage?: string; avgBalance?: number; holders?: number };
    metrics?: {
      giniCoefficient?: string;
      cr5?: string;
      herfindahlIndex?: string;
    };
    distribution?: string;
  };
  whaleActivity?: {
    movements?: RichListWhaleMovement[];
    summary?: {
      accumulating?: number;
      distributing?: number;
      stable?: number;
      totalAccumulation?: number;
      totalDistribution?: number;
      netFlow?: number;
      sentiment?: string;
    };
  };
  distribution?: {
    changes?: {
      newEntrants?: number;
      dropouts?: number;
      turnoverRate?: string;
    };
    newEntrants?: Array<{ address: string; balance: number; rank: number; owner?: string | null }>;
    stability?: {
      score?: number;
      rating?: string;
    };
  };
  comparison?: Record<string, unknown>;
  summary?: {
    totalWhales?: number;
    top1Balance?: number;
    top1Percentage?: number;
    lastUpdate?: string;
  };
  sparkline?: Array<{ date?: string; top10?: number; top20?: number }>;
}

export interface RichListTableRankBadge {
  icon: string;
  color?: string;
}

export interface RichListTableRankCell {
  value: number;
  display: string;
  badge?: RichListTableRankBadge | null;
}

export interface RichListTableAddressCell {
  value: string;
  display: string;
  fullAddress?: string;
  link?: string;
}

export interface RichListTableBalanceCell {
  value: number;
  display: string;
  formatted?: string;
}

export interface RichListTablePercentCell {
  value: number;
  display: string;
  bar?: { width: number; color?: string };
}

export interface RichListTableOwnerCell {
  value: string;
  display: string;
  type?: string;
}

export interface RichListTableLastUpdateCell {
  value: string;
  display: string;
  relative?: string;
}

export interface RichListTableChangeBalanceCell {
  absolute: number;
  percentage: number;
  display: string;
  trend: 'up' | 'down' | 'stable';
}

export interface RichListTableChangeRankCell {
  value: number;
  display: string;
  trend: 'up' | 'down' | 'stable';
}

export interface RichListTableChangeCell {
  balance: RichListTableChangeBalanceCell;
  rank: RichListTableChangeRankCell;
}

export interface RichListTableRow {
  rank: RichListTableRankCell;
  address: RichListTableAddressCell;
  balance: RichListTableBalanceCell;
  percentOfSupply: RichListTablePercentCell;
  owner: RichListTableOwnerCell;
  lastUpdate?: RichListTableLastUpdateCell;
  change24h?: RichListTableChangeCell;
}

export interface RichListTableSummary {
  holders?: {
    total?: number;
    top10?: number;
    top20?: number;
    top50?: number;
  };
  balance?: {
    total?: number;
    average?: number;
    max?: number;
    min?: number;
  };
  concentration?: {
    top10?: { balance?: number; percentage?: number };
    top20?: { balance?: number; percentage?: number };
    top50?: { balance?: number; percentage?: number };
  };
  supply?: {
    total?: number;
    tracked?: number;
    circulating?: number;
  };
  lastUpdate?: string;
}

export interface RichListTablePayload {
  data: RichListTableRow[];
  summary?: RichListTableSummary;
  pagination?: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  columns?: TableColumn[];
  lastUpdate?: string;
}

export interface RichListTableResponse {
  success: boolean;
  table: {
    columns: TableColumn[];
    rows: RichListTableRow[] | RichListTablePayload;
  };
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
  summary?: RichListTableSummary;
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface RichListStatsResponse {
  success: boolean;
  stats: Record<string, unknown>;
  meta: {
    timestamp: string;
    type: string;
  };
}

export interface ContractWidgetMetric {
  current: number;
  display: string;
}

export interface ContractWidgetChange {
  absolute: number;
  percentage?: number;
  display: string;
}

export interface ContractWidgetRangeEntry {
  high?: number;
  low?: number;
  average?: number;
  highDisplay?: string;
  lowDisplay?: string;
  averageDisplay?: string;
  changePercentage?: number;
  changeDisplay?: string;
}

export interface ContractRecordEntry {
  value: number;
  display: string;
  date?: string | null;
}

export interface ContractWidgetData {
  staking: ContractWidgetMetric;
  unstaking: ContractWidgetMetric;
  total: ContractWidgetMetric;
  changes?: Partial<
    Record<
      TimeRange,
      {
        staking?: ContractWidgetChange;
        unstaking?: ContractWidgetChange;
        total?: ContractWidgetChange;
      }
    >
  >;
  ranges?: Partial<
    Record<
      TimeRange,
      {
        staking?: ContractWidgetRangeEntry;
        unstaking?: ContractWidgetRangeEntry;
        total?: ContractWidgetRangeEntry;
      }
    >
  >;
  ath?: {
    staking?: ContractRecordEntry | null;
    unstaking?: ContractRecordEntry | null;
    total?: ContractRecordEntry | null;
  };
  atl?: {
    staking?: ContractRecordEntry | null;
    unstaking?: ContractRecordEntry | null;
    total?: ContractRecordEntry | null;
  };
  lastUpdate?: string;
  source?: string;
}

export interface ContractWidgetResponse {
  success: boolean;
  widget: ContractWidgetData;
  meta?: ApiMeta;
}

export interface RaydiumWidgetData {
  current: {
    apr: {
      value: number;
      display: string;
    };
    liquidity: {
      value: number;
      display: string;
    };
    lastUpdate: string;
  };
  changes: {
    '24h'?: {
      apr?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
      liquidity?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
    };
    '7d'?: {
      apr?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
      liquidity?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
    };
    '30d'?: {
      apr?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
      liquidity?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
    };
    '90d'?: {
      apr?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
      liquidity?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
    };
    '180d'?: {
      apr?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
      liquidity?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
    };
    '1y'?: {
      apr?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
      liquidity?: {
        absolute: number;
        percentage: number;
        display: string;
        trend: 'up' | 'down' | 'neutral';
      };
    };
  };
  ranges?: {
    '24h'?: {
      apr: { high: number; low: number; highDisplay: string; lowDisplay: string };
      liquidity: { high: number; low: number; highDisplay: string; lowDisplay: string };
    };
    '7d'?: {
      apr: { high: number; low: number; highDisplay: string; lowDisplay: string };
      liquidity: { high: number; low: number; highDisplay: string; lowDisplay: string };
    };
    '30d'?: {
      apr: { high: number; low: number; highDisplay: string; lowDisplay: string };
      liquidity: { high: number; low: number; highDisplay: string; lowDisplay: string };
    };
    '90d'?: {
      apr: { high: number; low: number; highDisplay: string; lowDisplay: string };
      liquidity: { high: number; low: number; highDisplay: string; lowDisplay: string };
    };
    '180d'?: {
      apr: { high: number; low: number; highDisplay: string; lowDisplay: string };
      liquidity: { high: number; low: number; highDisplay: string; lowDisplay: string };
    };
    '1y'?: {
      apr: { high: number; low: number; highDisplay: string; lowDisplay: string };
      liquidity: { high: number; low: number; highDisplay: string; lowDisplay: string };
    };
  };
  ath?: {
    liquidity?: { value: number | null; display: string | null; date?: string | null };
    apr?: { value: number | null; display: string | null; date?: string | null };
  };
  atl?: {
    liquidity?: { value: number | null; display: string | null; date?: string | null };
    apr?: { value: number | null; display: string | null; date?: string | null };
  };
  meta?: {
    source?: string;
  };
}

export type StakingTimeframe = '24h' | '7d' | '30d' | '90d' | '180d' | '1y';

export interface StakingWidgetValueChange {
  absolute: number;
  percentage?: number;
  display: string;
  trend: 'up' | 'down' | 'neutral';
}

export interface StakingWidgetRangeEntry {
  high?: number;
  low?: number;
  average?: number;
  start?: number;
  changePercentage?: number;
  highDisplay?: string;
  lowDisplay?: string;
  averageDisplay?: string;
  startDisplay?: string;
  changeDisplay?: string;
}

export interface StakingWidgetData {
  xnos: {
    current: number;
    display: string;
  };
  apr: {
    current: number;
    display: string;
    tier?: string;
  };
  changes?: Partial<
    Record<
      StakingTimeframe,
      {
        xnos?: StakingWidgetValueChange;
        apr?: StakingWidgetValueChange;
      }
    >
  >;
  ranges?: Partial<
    Record<
      StakingTimeframe,
      {
        xnos?: StakingWidgetRangeEntry;
        apr?: StakingWidgetRangeEntry;
      }
    >
  >;
  ath?: {
    xnos?: { value: number | null; display: string | null; date?: string | null };
    apr?: { value: number | null; display: string | null; date?: string | null };
  };
  atl?: {
    xnos?: { value: number | null; display: string | null; date?: string | null };
    apr?: { value: number | null; display: string | null; date?: string | null };
  };
  lastUpdate?: string;
  source?: string;
}

export interface StakingWidgetResponse {
  success: boolean;
  widget: StakingWidgetData;
  meta?: ApiMeta;
}

export type TimeRange = '1h' | '4h' | '24h' | '7d' | '30d' | '90d' | '180d' | '1y' | 'all';
export type ForecastRange = '1m' | '3m' | '6m' | '1y' | 'all';
export type Interval = '5m' | '15m' | '1h' | '4h' | '1d' | '1w' | '1M' | 'raw' | 'auto';
export type Currency = 'usd';

export interface SentimentFeedbackStats {
  total: number;
  bullish: {
    count: number;
    percentage: number;
  };
  bearish: {
    count: number;
    percentage: number;
  };
  period: string;
  lastUpdate: string | null;
}

export interface SentimentFeedbackVoteResponse {
  success: boolean;
  message: string;
  vote: {
    id: number;
    sentiment: 'bullish' | 'bearish';
    created_at: string;
  };
  alreadyVoted?: boolean;
  updated?: boolean;
}

export interface SentimentFeedbackStatsResponse {
  success: boolean;
  stats: SentimentFeedbackStats;
  meta: {
    timestamp: string;
    type: string;
  };
}

export type SentimentType = 'bullish' | 'bearish';
export type SentimentPeriod = '24h' | '7d' | '30d';

export interface BlogPostSummary {
  id: number;
  slug: string;
  title: string;
  localizedTitle?: string | null;
  url?: string | null;
  summary: string;
  aiSummary?: string | null;
  preview: string;
  thumbnailUrl?: string | null;
  publishedAt: string;
  author?: string | null;
  tags: string[];
  language: string;
  originalLanguage: string;
  translated: boolean;
  readingTimeMinutes: number;
}

export interface BlogPostDetail extends BlogPostSummary {
  contentHtml: string;
}

export interface BlogListPayload {
  posts: BlogPostSummary[];
  availableLanguages: string[];
  requestedLanguage: string;
}

export interface BlogDetailPayload {
  post: BlogPostDetail;
  related: BlogPostSummary[];
  requestedLanguage: string;
}
