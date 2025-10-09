'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';
import { LAYOUT_PRESETS, type LayoutPreset } from '@/components/simple-dashboard/state/presets';
import { useSimpleDashboardContext } from '@/components/simple-dashboard/context/SimpleDashboardContext';

interface PresetSwitcherProps {
  className?: string;
}

export const PresetSwitcher = memo(function PresetSwitcher({ className }: PresetSwitcherProps) {
  const { preset, setPreset } = useSimpleDashboardContext();
  const t = useTranslations();

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsla(var(--muted-foreground),0.7)]">
        {t('simple.presets.label')}
      </span>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        {Object.values(LAYOUT_PRESETS).map((item) => (
          <motion.button
            key={item.key}
            type="button"
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPreset(item.key)}
            className={cn(
              'group relative overflow-hidden rounded-2xl border border-[hsla(var(--border-card),0.32)] px-3 py-3 text-left transition-colors',
              'bg-[hsla(var(--background),0.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsla(var(--accent),0.35)] focus-visible:ring-offset-2',
              preset === item.key
                ? 'border-[hsla(var(--accent),0.45)] shadow-[var(--simple-shadow-hover)]'
                : 'shadow-[var(--simple-shadow-base)]',
            )}
            aria-pressed={preset === item.key}
          >
            <span className="text-sm font-semibold text-[var(--simple-text-primary)]">
              {t(item.labelKey)}
            </span>
            <span className="mt-1 block text-[12px] font-medium text-[hsla(var(--muted-foreground),0.75)]">
              {t(item.descriptionKey)}
            </span>
            {preset === item.key && (
              <motion.div
                layoutId="preset-active-indicator"
                className="absolute inset-x-3 bottom-2 h-[2px] rounded-full bg-gradient-to-r from-[var(--simple-pos)] to-[var(--simple-neg)]"
              />
            )}
          </motion.button>
        ))}
      </div>
    </div>
  );
});
