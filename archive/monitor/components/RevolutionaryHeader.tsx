'use client';

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Collapsible from '@radix-ui/react-collapsible';
import * as Tooltip from '@radix-ui/react-tooltip';
import { Settings, ChevronDown, Sparkles, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Control {
  id: string;
  label?: string;
  icon?: React.ReactNode;
  items: ControlItem[];
  priority?: 'high' | 'medium' | 'low';
}

interface ControlItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  onClick?: () => void;
}

interface RevolutionaryHeaderProps {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: 'online' | 'offline' | 'loading';
  controls?: Control[];
  quickActions?: React.ReactNode;
  settingsPanel?: React.ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  className?: string;
}

export function RevolutionaryHeader({
  title,
  titleIcon,
  subtitle,
  status = 'online',
  controls = [],
  quickActions,
  settingsPanel,
  gradientFrom = 'from-violet-500/10',
  gradientTo = 'to-fuchsia-500/10',
  className,
}: RevolutionaryHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!showSettings) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-settings-panel]') && !target.closest('[data-settings-trigger]')) {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  const toggleGroup = (id: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const statusColors = {
    online: 'bg-emerald-500 shadow-emerald-500/50',
    offline: 'bg-red-500 shadow-red-500/50',
    loading: 'bg-amber-500 shadow-amber-500/50 animate-pulse',
  };

  const activeCount = controls.reduce(
    (acc, group) => acc + group.items.filter((item) => item.active).length,
    0,
  );

  return (
    <Tooltip.Provider delayDuration={300}>
      {/* Container with Container Query Support */}
      <div ref={containerRef} className={cn('relative overflow-hidden', '@container', className)}>
        {/* Animated Background Gradient */}
        <motion.div
          className={cn('absolute inset-0 bg-gradient-to-br opacity-50', gradientFrom, gradientTo)}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%'],
          }}
          transition={{
            duration: 15,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />

        {/* Glass Morphism Layer */}
        <div className="relative backdrop-blur-md bg-background/80 border-b border-border/50">
          {/* Main Header Container - Fluid Grid */}
          <div className="p-2 @sm:p-3 @lg:p-4">
            {/* Top Row - Title & Status */}
            <div className="flex items-center justify-between gap-2 @lg:gap-4 mb-2 @lg:mb-3">
              {/* Title Section */}
              <motion.div
                className="flex items-center gap-2 @lg:gap-3 min-w-0 flex-1"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
              >
                {/* Icon with Pulse Effect */}
                {titleIcon && (
                  <motion.div
                    className="flex-shrink-0 text-primary relative"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 400 }}
                  >
                    <div className="absolute inset-0 bg-primary/20 rounded-lg blur-md" />
                    <div className="relative">{titleIcon}</div>
                  </motion.div>
                )}

                {/* Title & Subtitle */}
                <div className="min-w-0 flex-1">
                  <h2 className="font-bold text-sm @sm:text-base @lg:text-lg text-foreground truncate bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
                    {title}
                  </h2>
                  {subtitle && (
                    <div className="text-[10px] @sm:text-xs text-muted-foreground truncate mt-0.5">
                      {subtitle}
                    </div>
                  )}
                </div>

                {/* Status Indicator with Glow */}
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <motion.div
                      className={cn(
                        'h-2 w-2 @lg:h-2.5 @lg:w-2.5 rounded-full shadow-lg',
                        statusColors[status],
                      )}
                      animate={{
                        scale: [1, 1.2, 1],
                        opacity: [1, 0.8, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                      }}
                    />
                  </Tooltip.Trigger>
                  <Tooltip.Portal>
                    <Tooltip.Content
                      className="bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-xs shadow-lg border border-border"
                      sideOffset={5}
                    >
                      {status === 'online'
                        ? 'Live'
                        : status === 'offline'
                          ? 'Offline'
                          : 'Connecting...'}
                      <Tooltip.Arrow className="fill-popover" />
                    </Tooltip.Content>
                  </Tooltip.Portal>
                </Tooltip.Root>
              </motion.div>

              {/* Floating Action Bar */}
              <motion.div
                className="flex items-center gap-1 @lg:gap-2 flex-shrink-0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                {/* Active Filters Badge */}
                {activeCount > 0 && (
                  <motion.div
                    className="hidden @md:flex items-center gap-1.5 px-2 @lg:px-3 py-1 rounded-full bg-primary/10 border border-primary/30 backdrop-blur-sm"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500 }}
                  >
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-xs font-medium text-primary">{activeCount}</span>
                  </motion.div>
                )}

                {/* Quick Actions */}
                {quickActions && <div className="flex items-center gap-1">{quickActions}</div>}

                {/* Settings Button */}
                {settingsPanel && (
                  <motion.button
                    data-settings-trigger
                    onClick={() => setShowSettings(!showSettings)}
                    className={cn(
                      'p-1.5 @lg:p-2 rounded-lg transition-all duration-200',
                      'hover:bg-muted/80 backdrop-blur-sm',
                      showSettings && 'bg-muted text-primary',
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Settings className="h-4 w-4" />
                  </motion.button>
                )}
              </motion.div>
            </div>

            {/* Control Pills - Fluid Wrap */}
            {controls.length > 0 && (
              <motion.div
                className="flex flex-wrap gap-1.5 @lg:gap-2"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: 0.2 }}
              >
                {controls.map((group, idx) => (
                  <ControlGroup
                    key={group.id}
                    group={group}
                    isExpanded={expandedGroups.has(group.id)}
                    onToggle={() => toggleGroup(group.id)}
                    delay={idx * 0.05}
                  />
                ))}
              </motion.div>
            )}
          </div>
        </div>

        {/* Settings Panel - Slide from Right */}
        <AnimatePresence>
          {showSettings && settingsPanel && (
            <motion.div
              data-settings-panel
              className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] z-50"
              initial={{ opacity: 0, x: 20, y: -10 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 20, y: -10 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <div className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-gradient-to-r from-muted/50 to-background">
                  <span className="text-sm font-semibold">Settings</span>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-1 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="max-h-[60vh] overflow-y-auto p-4">{settingsPanel}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Tooltip.Provider>
  );
}

interface ControlGroupProps {
  group: Control;
  isExpanded: boolean;
  onToggle: () => void;
  delay?: number;
}

function ControlGroup({ group, isExpanded, onToggle, delay = 0 }: ControlGroupProps) {
  const activeItems = group.items.filter((item) => item.active);
  const hasLabel = Boolean(group.label);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 500 }}
    >
      <Collapsible.Root open={isExpanded} onOpenChange={onToggle}>
        {/* Collapsed State - Compact Pill */}
        {!isExpanded && (
          <motion.button
            onClick={onToggle}
            className={cn(
              'group flex items-center gap-1.5 px-2.5 @lg:px-3 py-1.5 rounded-full',
              'bg-muted/50 hover:bg-muted border border-border/50',
              'transition-all duration-200 backdrop-blur-sm',
              activeItems.length > 0 && 'border-primary/50 bg-primary/5',
            )}
            whileHover={{ scale: 1.02, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            whileTap={{ scale: 0.98 }}
          >
            {group.icon && (
              <span className="text-muted-foreground group-hover:text-foreground transition-colors">
                {group.icon}
              </span>
            )}

            {hasLabel && (
              <span className="text-xs font-medium text-foreground/80 hidden @sm:inline">
                {group.label}
              </span>
            )}

            {activeItems.length > 0 && (
              <motion.span
                className="h-5 min-w-[20px] px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500 }}
              >
                {activeItems.length}
              </motion.span>
            )}

            <ChevronDown className="h-3 w-3 text-muted-foreground transition-transform group-hover:text-foreground" />
          </motion.button>
        )}

        {/* Expanded State - Full Pills */}
        <Collapsible.Content>
          <motion.div
            className="flex flex-wrap gap-1 p-1 rounded-lg bg-muted/30 backdrop-blur-sm border border-border/30"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {/* Group Label Header */}
            {hasLabel && (
              <div className="flex items-center justify-between w-full px-2 py-1 border-b border-border/30 mb-1">
                <div className="flex items-center gap-1.5">
                  {group.icon && <span className="text-muted-foreground">{group.icon}</span>}
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </span>
                </div>
                <button
                  onClick={onToggle}
                  className="p-0.5 rounded hover:bg-muted/50 transition-colors"
                >
                  <ChevronDown className="h-3 w-3 text-muted-foreground rotate-180" />
                </button>
              </div>
            )}

            {/* Control Items */}
            {group.items.map((item, idx) => (
              <ControlPill key={item.id} item={item} delay={idx * 0.02} />
            ))}
          </motion.div>
        </Collapsible.Content>
      </Collapsible.Root>
    </motion.div>
  );
}

interface ControlPillProps {
  item: ControlItem;
  delay?: number;
}

function ControlPill({ item, delay = 0 }: ControlPillProps) {
  const variantStyles = {
    default: item.active
      ? 'bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/25'
      : 'bg-background hover:bg-muted border-border/50',
    success: item.active
      ? 'bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-500/25'
      : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    danger: item.active
      ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/25'
      : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-300',
    warning: item.active
      ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/25'
      : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300',
  };

  return (
    <motion.button
      onClick={item.onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 @lg:px-3 py-1 rounded-lg',
        'border transition-all duration-200 backdrop-blur-sm',
        'text-xs font-medium',
        variantStyles[item.variant || 'default'],
      )}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, type: 'spring', stiffness: 500 }}
      whileHover={{ scale: 1.05, y: -1 }}
      whileTap={{ scale: 0.95 }}
    >
      {item.icon && <span className="flex-shrink-0">{item.icon}</span>}
      <span className="whitespace-nowrap">{item.label}</span>

      {item.active && (
        <motion.span
          className="h-1.5 w-1.5 rounded-full bg-current"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 500 }}
        />
      )}
    </motion.button>
  );
}

export function QuickActionButton({
  icon,
  label,
  onClick,
  variant = 'ghost',
  className,
}: {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
  variant?: 'ghost' | 'primary' | 'danger';
  className?: string;
}) {
  const variantStyles = {
    ghost: 'hover:bg-muted/80 text-muted-foreground hover:text-foreground',
    primary: 'bg-primary/10 text-primary hover:bg-primary/20',
    danger: 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
  };

  return (
    <Tooltip.Root>
      <Tooltip.Trigger asChild>
        <motion.button
          onClick={onClick}
          className={cn(
            'p-1.5 @lg:p-2 rounded-lg transition-all duration-200 backdrop-blur-sm',
            variantStyles[variant],
            className,
          )}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {icon}
        </motion.button>
      </Tooltip.Trigger>
      {label && (
        <Tooltip.Portal>
          <Tooltip.Content
            className="bg-popover text-popover-foreground px-3 py-1.5 rounded-lg text-xs shadow-lg border border-border"
            sideOffset={5}
          >
            {label}
            <Tooltip.Arrow className="fill-popover" />
          </Tooltip.Content>
        </Tooltip.Portal>
      )}
    </Tooltip.Root>
  );
}
