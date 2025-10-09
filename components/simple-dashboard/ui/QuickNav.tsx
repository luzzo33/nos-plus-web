'use client';

import { memo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import styles from '@/components/simple-dashboard/SimpleDashboardShell.module.css';
import {
  SIMPLE_SECTIONS,
  type SimpleSectionKey,
} from '@/components/simple-dashboard/state/presets';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { useSimpleDashboardContext } from '@/components/simple-dashboard/context/SimpleDashboardContext';

interface QuickNavProps {
  sections: SimpleSectionKey[];
  className?: string;
}

export const QuickNav = memo(function QuickNav({ sections, className }: QuickNavProps) {
  const { activeSection } = useSimpleDashboardContext();
  const t = useTranslations();

  const handleNavigate = (anchor: string) => {
    const el = document.getElementById(anchor);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <nav className={cn(styles.navShell, className)} aria-label={t('simple.quickNav.ariaLabel')}>
      <div className={styles.navList}>
        {sections.map((key) => {
          const section = SIMPLE_SECTIONS[key];
          const isActive = activeSection === key;

          return (
            <div key={section.anchor} className={styles.navItem}>
              <button
                type="button"
                className={cn(styles.navButton, isActive && styles.navButtonActive)}
                onClick={() => handleNavigate(section.anchor)}
              >
                {t(section.titleKey)}
              </button>
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    layoutId="simple-nav-underline"
                    className={styles.navUnderline}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    exit={{ scaleX: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 32 }}
                    aria-hidden="true"
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </nav>
  );
});
