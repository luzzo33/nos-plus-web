'use client';

import { motion } from 'framer-motion';
import { TrendingUp, Users } from 'lucide-react';
import { SimplePriceWidget } from '@/components/widgets/simple/SimplePriceWidget';
import { SimpleVolumeWidget } from '@/components/widgets/simple/SimpleVolumeWidget';
import { SimpleSentimentWidget } from '@/components/widgets/simple/SimpleSentimentWidget';
import { SimplePriceChartWidget } from '@/components/widgets/simple/SimplePriceChartWidget';
import { SimpleHoldersWidget } from '@/components/widgets/simple/SimpleHoldersWidget';
import { SimpleStakingWidget } from '@/components/widgets/simple/SimpleStakingWidget';
import { SimpleDistributionWidget } from '@/components/widgets/simple/SimpleDistributionWidget';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';

interface SimpleDashboardProps {
  isMobile?: boolean;
}

interface SegmentHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
}

function SegmentHeader({ icon, title, description }: SegmentHeaderProps) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--border-card)_/_0.6)] text-[hsl(var(--accent-1))]">
          {icon}
        </span>
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-semibold tracking-tight text-[hsl(var(--text-primary))] md:text-lg">
            {title}
          </h2>
          {description && (
            <p className="type-label text-[hsl(var(--text-secondary))]">{description}</p>
          )}
        </div>
      </div>
    </div>
  );
}

export function SimpleDashboard({ isMobile = false }: SimpleDashboardProps) {
  const t = useTranslations('dashboard');

  return (
    <div className="space-y-6 md:space-y-8">
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="space-y-4"
      >
        <SegmentHeader
          icon={<TrendingUp className="w-5 h-5" />}
          title={t('marketOverview')}
          description={t('marketOverviewDesc')}
        />

        <div
          className={cn(
            'grid grid-cols-1 auto-rows-fr gap-3 md:grid-cols-8 md:gap-4 xl:grid-cols-12',
          )}
        >
          <SimplePriceWidget isMobile={isMobile} className="md:col-span-4 xl:col-span-4" />
          <SimpleVolumeWidget isMobile={isMobile} className="md:col-span-4 xl:col-span-4" />
          <SimpleSentimentWidget isMobile={isMobile} className="md:col-span-4 xl:col-span-4" />
          <SimplePriceChartWidget isMobile={isMobile} className="md:col-span-8 xl:col-span-8" />
          <SimpleDistributionWidget isMobile={isMobile} className="md:col-span-8 xl:col-span-4" />
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="space-y-4"
      >
        <SegmentHeader
          icon={<Users className="w-5 h-5" />}
          title={t('communityHolders')}
          description={t('communityHoldersDesc')}
        />

        <div
          className={cn(
            'grid grid-cols-1 auto-rows-fr gap-3 md:grid-cols-8 md:gap-4 xl:grid-cols-12',
          )}
        >
          <SimpleHoldersWidget isMobile={isMobile} className="md:col-span-4 xl:col-span-6" />
          <SimpleStakingWidget isMobile={isMobile} className="md:col-span-4 xl:col-span-6" />
        </div>
      </motion.section>
    </div>
  );
}
