'use client';

import { useEffect, useMemo } from 'react';
import styles from '@/components/simple-dashboard/SimpleDashboardShell.module.css';
import {
  LAYOUT_PRESETS,
  SIMPLE_SECTIONS,
  type SimpleSectionKey,
} from '@/components/simple-dashboard/state/presets';
import { useSimpleDashboardContext } from '@/components/simple-dashboard/context/SimpleDashboardContext';
import { SummaryStrip } from '@/components/simple-dashboard/ui/SummaryStrip';
import { PresetSwitcher } from '@/components/simple-dashboard/ui/PresetSwitcher';
import { DensityToggle } from '@/components/simple-dashboard/ui/DensityToggle';
import { QuickNav } from '@/components/simple-dashboard/ui/QuickNav';
import { MarketSnapshotSection } from '@/components/simple-dashboard/sections/MarketSnapshotSection';
import { TrendMomentumSection } from '@/components/simple-dashboard/sections/TrendMomentumSection';
import { LiquidityVolumeSection } from '@/components/simple-dashboard/sections/LiquidityVolumeSection';
import { HoldersDistributionSection } from '@/components/simple-dashboard/sections/HoldersDistributionSection';
import { StakingRewardsSection } from '@/components/simple-dashboard/sections/StakingRewardsSection';
import { RiskSentimentSection } from '@/components/simple-dashboard/sections/RiskSentimentSection';
import { NewsUpdatesSection } from '@/components/simple-dashboard/sections/NewsUpdatesSection';
import { LivePulseSection } from '@/components/simple-dashboard/sections/LivePulseSection';
import { cn } from '@/lib/utils';

const SECTION_COMPONENTS: Record<SimpleSectionKey, () => JSX.Element> = {
  marketSnapshot: MarketSnapshotSection,
  trendMomentum: TrendMomentumSection,
  liquidityVolume: LiquidityVolumeSection,
  holdersDistribution: HoldersDistributionSection,
  stakingRewards: StakingRewardsSection,
  riskSentiment: RiskSentimentSection,
  newsUpdates: NewsUpdatesSection,
  livePulse: LivePulseSection,
};

export function SimpleDashboardShell() {
  const { preset, setActiveSection } = useSimpleDashboardContext();
  const layout = LAYOUT_PRESETS[preset];

  const sectionKeys = useMemo(() => [...layout.sectionOrder], [layout.sectionOrder]);

  useEffect(() => {
    setActiveSection(sectionKeys[0] ?? null);
  }, [sectionKeys, setActiveSection]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          const match = Object.values(SIMPLE_SECTIONS).find(
            (section) => section.anchor === visibleEntry.target.id,
          );
          if (match) {
            setActiveSection(match.key);
          }
        }
      },
      {
        rootMargin: '-25% 0px -50% 0px',
        threshold: [0.15, 0.35, 0.6],
      },
    );

    sectionKeys.forEach((key) => {
      const node = document.getElementById(SIMPLE_SECTIONS[key].anchor);
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [sectionKeys, setActiveSection]);

  return (
    <div className={styles.root}>
      <div className={styles.surface}>
        <div className={styles.container}>
          <SummaryStrip />

          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <PresetSwitcher className="md:flex-1" />
            <DensityToggle />
          </div>

          <QuickNav sections={sectionKeys} className="hidden md:block" />

          <div className={cn('flex flex-col gap-5 md:gap-6')}>
            {sectionKeys.map((key) => {
              const Component = SECTION_COMPONENTS[key];
              return <Component key={key} />;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
