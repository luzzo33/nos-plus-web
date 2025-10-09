'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { useSimpleDashboardContext } from '@/components/simple-dashboard/context/SimpleDashboardContext';

interface DensityToggleProps {
  className?: string;
}

export const DensityToggle = memo(function DensityToggle({ className }: DensityToggleProps) {
  const { density, toggleDensity } = useSimpleDashboardContext();
  const t = useTranslations();

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsla(var(--muted-foreground),0.7)]">
        {t('simple.density.label')}
      </span>
      <div className="inline-flex items-center gap-1 rounded-full border border-[hsla(var(--border-card),0.32)] bg-[hsla(var(--background),0.85)] p-1 shadow-[var(--simple-shadow-base)]">
        <DensityChip
          active={density === 'compact'}
          label={t('simple.density.compact')}
          onClick={density === 'compact' ? undefined : toggleDensity}
        />
        <DensityChip
          active={density === 'comfort'}
          label={t('simple.density.comfort')}
          onClick={density === 'comfort' ? undefined : toggleDensity}
        />
      </div>
    </div>
  );
});

interface DensityChipProps {
  active: boolean;
  label: string;
  onClick?: () => void;
}

function DensityChip({ active, label, onClick }: DensityChipProps) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className={cn(
        'relative min-w-[96px] rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em]',
        'transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsla(var(--accent),0.4)] focus-visible:ring-offset-1',
        active ? 'text-[var(--simple-text-primary)]' : 'text-[hsla(var(--muted-foreground),0.68)]',
      )}
      aria-pressed={active}
    >
      {active && (
        <motion.span
          layoutId="density-active-pill"
          className="absolute inset-0 rounded-full bg-gradient-to-r from-[hsla(var(--accent),0.28)] to-[hsla(var(--accent),0.45)]"
          transition={{ type: 'spring', stiffness: 200, damping: 28 }}
          aria-hidden="true"
        />
      )}
      <span className="relative z-10 mix-blend-plus-lighter">{label}</span>
    </motion.button>
  );
}
