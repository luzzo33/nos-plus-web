'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, BarChart3, BookOpen, TrendingUp, Target, PieChart } from 'lucide-react';
import { cn } from '@/lib/utils';

export type MobileSection = 'live-feed' | 'charts' | 'order-book' | 'plans' | 'stats';

interface MobileNavigationProps {
  activeSection: MobileSection;
  onSectionChange: (section: MobileSection) => void;
}

const MOBILE_SECTIONS = [
  {
    id: 'live-feed' as const,
    title: 'Live Feed',
    icon: Activity,
    description: 'Live transactions',
  },
  {
    id: 'charts' as const,
    title: 'Charts',
    icon: BarChart3,
    description: 'Price & volume',
  },
  {
    id: 'order-book' as const,
    title: 'Order Book',
    icon: BookOpen,
    description: 'Order depth',
  },
  {
    id: 'plans' as const,
    title: 'Plans',
    icon: Target,
    description: 'DCA & Limit',
  },
  {
    id: 'stats' as const,
    title: 'Stats',
    icon: PieChart,
    description: 'Summary data',
  },
];

export function MobileNavigation({ activeSection, onSectionChange }: MobileNavigationProps) {
  return (
    <div className="md:hidden bg-background/95 backdrop-blur-sm border-b border-border/60 px-4 py-3">
      <div className="flex items-center justify-between overflow-x-auto scrollbar-thin">
        {MOBILE_SECTIONS.map((section) => {
          const Icon = section.icon;
          const isActive = activeSection === section.id;

          return (
            <button
              key={section.id}
              onClick={() => onSectionChange(section.id)}
              className={cn(
                'relative flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-all duration-200 min-w-0 flex-shrink-0',
                isActive
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              )}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {isActive && (
                  <motion.div
                    layoutId="mobile-nav-indicator"
                    className="absolute -inset-1 bg-primary/20 rounded-full"
                    initial={false}
                    transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  />
                )}
              </div>
              <span className="text-xs font-medium leading-tight">{section.title}</span>
              {isActive && (
                <motion.div
                  layoutId="mobile-nav-underline"
                  className="absolute bottom-0 left-1/2 w-8 h-0.5 bg-primary rounded-full"
                  initial={false}
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.5 }}
                  style={{ x: '-50%' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function MobileSectionContainer({
  children,
  activeSection,
  className,
}: {
  children: React.ReactNode;
  activeSection: MobileSection;
  className?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className={cn('md:hidden w-full min-h-0', className)}
    >
      {children}
    </motion.div>
  );
}
