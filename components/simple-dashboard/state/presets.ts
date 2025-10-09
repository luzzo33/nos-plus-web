'use client';

export type LayoutPreset = 'overview' | 'trader' | 'research';
export type SimpleDensity = 'compact' | 'comfort';

export type SimpleSectionKey =
  | 'marketSnapshot'
  | 'trendMomentum'
  | 'liquidityVolume'
  | 'holdersDistribution'
  | 'stakingRewards'
  | 'riskSentiment'
  | 'newsUpdates'
  | 'livePulse';

export interface SimpleSectionDefinition {
  key: SimpleSectionKey;
  anchor: string;
  titleKey: string;
  subtitleKey?: string;
}

export interface LayoutPresetDefinition {
  key: LayoutPreset;
  labelKey: string;
  descriptionKey: string;
  sectionOrder: SimpleSectionKey[];
}

export const SIMPLE_SECTIONS: Record<SimpleSectionKey, SimpleSectionDefinition> = {
  marketSnapshot: {
    key: 'marketSnapshot',
    anchor: 'market-snapshot',
    titleKey: 'simple.sections.marketSnapshot.title',
    subtitleKey: 'simple.sections.marketSnapshot.subtitle',
  },
  trendMomentum: {
    key: 'trendMomentum',
    anchor: 'trend-momentum',
    titleKey: 'simple.sections.trendMomentum.title',
    subtitleKey: 'simple.sections.trendMomentum.subtitle',
  },
  liquidityVolume: {
    key: 'liquidityVolume',
    anchor: 'liquidity-volume',
    titleKey: 'simple.sections.liquidityVolume.title',
    subtitleKey: 'simple.sections.liquidityVolume.subtitle',
  },
  holdersDistribution: {
    key: 'holdersDistribution',
    anchor: 'holders-distribution',
    titleKey: 'simple.sections.holdersDistribution.title',
    subtitleKey: 'simple.sections.holdersDistribution.subtitle',
  },
  stakingRewards: {
    key: 'stakingRewards',
    anchor: 'staking-rewards',
    titleKey: 'simple.sections.stakingRewards.title',
    subtitleKey: 'simple.sections.stakingRewards.subtitle',
  },
  riskSentiment: {
    key: 'riskSentiment',
    anchor: 'risk-sentiment',
    titleKey: 'simple.sections.riskSentiment.title',
    subtitleKey: 'simple.sections.riskSentiment.subtitle',
  },
  newsUpdates: {
    key: 'newsUpdates',
    anchor: 'news-updates',
    titleKey: 'simple.sections.newsUpdates.title',
    subtitleKey: 'simple.sections.newsUpdates.subtitle',
  },
  livePulse: {
    key: 'livePulse',
    anchor: 'live-pulse',
    titleKey: 'simple.sections.livePulse.title',
    subtitleKey: 'simple.sections.livePulse.subtitle',
  },
};

export const LAYOUT_PRESETS: Record<LayoutPreset, LayoutPresetDefinition> = {
  overview: {
    key: 'overview',
    labelKey: 'simple.presets.overview.label',
    descriptionKey: 'simple.presets.overview.description',
    sectionOrder: [
      'marketSnapshot',
      'trendMomentum',
      'liquidityVolume',
      'riskSentiment',
      'newsUpdates',
    ],
  },
  trader: {
    key: 'trader',
    labelKey: 'simple.presets.trader.label',
    descriptionKey: 'simple.presets.trader.description',
    sectionOrder: ['trendMomentum', 'liquidityVolume', 'livePulse', 'riskSentiment', 'newsUpdates'],
  },
  research: {
    key: 'research',
    labelKey: 'simple.presets.research.label',
    descriptionKey: 'simple.presets.research.description',
    sectionOrder: [
      'marketSnapshot',
      'holdersDistribution',
      'stakingRewards',
      'riskSentiment',
      'newsUpdates',
    ],
  },
};

export const DEFAULT_PRESET: LayoutPreset = 'overview';
export const DEFAULT_DENSITY: SimpleDensity = 'compact';
