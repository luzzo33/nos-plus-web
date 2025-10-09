'use client';

import Link from 'next/link';
import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface WidgetContainerProps {
  title?: ReactNode;
  icon?: LucideIcon;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  loading?: boolean;
  error?: string;
  headerAction?: ReactNode;
  loadingSkeleton?: ReactNode;
  href?: string;
  linkLabel?: string;
  isMobile?: boolean;
}

export function WidgetContainer({
  title,
  icon: Icon,
  children,
  className,
  contentClassName,
  loading = false,
  error,
  headerAction,
  loadingSkeleton,
  href,
  linkLabel,
  isMobile = false,
}: WidgetContainerProps) {
  const showOverlaySpinner = loading && !loadingSkeleton;

  const renderHeader = () => {
    if (!title && !Icon && !headerAction) {
      return null;
    }

    const isLink = Boolean(href);

    const iconNode = Icon ? (
      <motion.div
        initial={{ rotate: -180, opacity: 0 }}
        animate={{ rotate: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Icon
          className={cn(
            'text-muted-foreground',
            isMobile ? 'w-3 h-3' : 'w-3.5 h-3.5',
            isLink && 'transition-colors group-hover:text-primary',
          )}
        />
      </motion.div>
    ) : null;

    const titleNode = title ? (
      <h3
        className={cn(
          'font-medium',
          isMobile ? 'text-[11px]' : 'text-xs',
          isLink && 'transition-colors group-hover:text-primary',
        )}
      >
        {title}
      </h3>
    ) : null;

    const headerLeading = isLink ? (
      <Link
        href={href!}
        className={cn(
          'group flex items-center rounded px-1 -mx-1 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
          isMobile ? 'gap-1.5' : 'gap-2',
        )}
        aria-label={linkLabel ?? (typeof title === 'string' ? title : undefined)}
      >
        {iconNode}
        {titleNode}
      </Link>
    ) : (
      <div className={cn('flex items-center', isMobile ? 'gap-1.5' : 'gap-2')}>
        {iconNode}
        {titleNode}
      </div>
    );

    return (
      <div
        data-slot="widget-header"
        className={cn(
          'flex items-center justify-between border-b border-border flex-shrink-0',
          isMobile ? 'px-2 py-1.5' : 'px-3 py-2',
        )}
      >
        {headerLeading}
        {headerAction && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {headerAction}
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div
      className={cn(
        'card-base flex flex-col overflow-hidden h-full relative group',
        'shadow-sm transition-shadow duration-300',
        'hover:shadow-md',
        isMobile ? 'text-[13px]' : 'text-sm',
        'md:text-sm',
        className,
      )}
      data-compact={isMobile ? 'true' : undefined}
    >
      {renderHeader()}

      <div className={cn('flex-1 relative overflow-hidden', contentClassName)}>
        <AnimatePresence mode="wait">
          {showOverlaySpinner && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-10"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full"
              />
            </motion.div>
          )}

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex items-center justify-center p-4"
            >
              <p className="text-sm text-destructive text-center">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {loading && loadingSkeleton && !error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="h-full"
          >
            {loadingSkeleton}
          </motion.div>
        ) : (!loading || showOverlaySpinner) && !error ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="h-full"
          >
            {children}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
