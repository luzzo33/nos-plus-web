'use client';

import { type ReactNode, memo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useSimpleDashboardContext } from '@/components/simple-dashboard/context/SimpleDashboardContext';
import styles from '@/components/simple-dashboard/SimpleDashboardShell.module.css';

interface SectionCardProps {
  id: string;
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  moreContent?: ReactNode;
  densityAware?: boolean;
}

export const SectionCard = memo(function SectionCard({
  id,
  title,
  subtitle,
  action,
  children,
  className,
  bodyClassName,
  moreContent,
  densityAware = true,
}: SectionCardProps) {
  const { density } = useSimpleDashboardContext();
  const detailsId = useId();

  return (
    <motion.section
      layout
      id={id}
      aria-labelledby={`${id}-heading`}
      className={cn(
        styles.section,
        'relative rounded-[20px] border border-[hsla(var(--border-card),0.32)] bg-[hsla(var(--background),0.92)]',
        'shadow-[var(--simple-shadow-base)] backdrop-blur-[18px]',
        densityAware && density === 'compact'
          ? 'px-4 py-4 md:px-5 md:py-5'
          : 'px-5 py-6 md:px-6 md:py-7',
        className,
      )}
      data-density={densityAware ? density : undefined}
    >
      <header className="flex flex-col gap-2 border-b border-[hsla(var(--border-card),0.18)] pb-3 md:flex-row md:items-start md:justify-between md:gap-3">
        <div className="flex flex-col gap-1">
          <h2
            id={`${id}-heading`}
            className="text-[15px] font-semibold uppercase tracking-[0.12em] text-[var(--simple-text-primary)]"
          >
            {title}
          </h2>
          {subtitle && (
            <p className="text-[12px] font-medium text-[hsla(var(--muted-foreground),0.75)]">
              {subtitle}
            </p>
          )}
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </header>

      <div className={cn('mt-4 flex flex-col gap-4', bodyClassName)}>{children}</div>

      {moreContent && (
        <details className="group mt-4 rounded-2xl border border-dashed border-[hsla(var(--border-card),0.28)] bg-[hsla(var(--background),0.78)] px-4 py-3">
          <summary
            id={detailsId}
            className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em] text-[hsla(var(--muted-foreground),0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsla(var(--accent),0.4)] focus-visible:ring-offset-2"
          >
            More
          </summary>
          <AnimatePresence initial={false}>
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-3 text-[13px] text-[hsla(var(--muted-foreground),0.85)]"
              aria-labelledby={detailsId}
            >
              {moreContent}
            </motion.div>
          </AnimatePresence>
        </details>
      )}
    </motion.section>
  );
});
