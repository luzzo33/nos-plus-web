'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderControl {
  id: string;
  label: string;
  items: HeaderControlItem[];
  appearance?: 'pills' | 'buttons' | 'compact';
}

interface HeaderControlItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  onClick?: () => void;
}

interface ProperHeaderProps {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: 'online' | 'offline' | 'loading';

  primaryControls?: HeaderControl[];

  secondaryControls?: HeaderControl[];

  quickActions?: React.ReactNode;
  settingsPanel?: React.ReactNode;
  className?: string;
}

export function ProperHeader({
  title,
  titleIcon,
  subtitle,
  status,
  primaryControls = [],
  secondaryControls = [],
  quickActions,
  settingsPanel,
  className,
}: ProperHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!settingsRef.current?.contains(target) && !settingsButtonRef.current?.contains(target)) {
        setShowSettings(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowSettings(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSettings]);

  return (
    <div className={cn('@container relative', className)}>
      {/* Header Container */}
      <div className="bg-gradient-to-r from-background via-muted/5 to-background border-b border-border/50 backdrop-blur-sm">
        {/* Top Section - Title & Primary Controls */}
        <div className="p-2.5 @lg:p-3">
          {/* Title Bar */}
          <div className="flex items-center justify-between gap-3 mb-2.5">
            <div className="flex items-center gap-2 @lg:gap-2.5 min-w-0 flex-1">
              {titleIcon && <div className="text-primary flex-shrink-0">{titleIcon}</div>}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm @lg:text-base font-bold text-foreground truncate">
                    {title}
                  </h3>
                  {status && <StatusBadge status={status} />}
                </div>
                {subtitle && (
                  <div className="text-[10px] @lg:text-xs text-muted-foreground truncate mt-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {quickActions}

              {/* Secondary Controls Toggle (Mobile) */}
              {secondaryControls.length > 0 && (
                <button
                  onClick={() => setShowSecondary(!showSecondary)}
                  className={cn(
                    'md:hidden p-1.5 rounded-lg transition-colors',
                    'hover:bg-muted/80',
                    showSecondary && 'bg-muted text-foreground',
                  )}
                >
                  <ChevronDown
                    className={cn('h-4 w-4 transition-transform', showSecondary && 'rotate-180')}
                  />
                </button>
              )}

              {settingsPanel && (
                <button
                  ref={settingsButtonRef}
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    'p-1.5 rounded-lg transition-colors',
                    'hover:bg-muted/80',
                    showSettings && 'bg-muted text-foreground',
                  )}
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Primary Controls - Always Visible */}
          {primaryControls.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 @lg:gap-4">
              {primaryControls.map((control) => (
                <ControlGroup key={control.id} control={control} />
              ))}
            </div>
          )}
        </div>

        {/* Secondary Controls - Collapsible on Mobile, Always on Desktop */}
        {secondaryControls.length > 0 && (
          <div
            className={cn(
              'border-t border-border/30 overflow-hidden transition-all',
              'md:block',
              showSecondary ? 'block' : 'hidden',
            )}
          >
            <div className="p-2.5 @lg:p-3 pt-2 bg-muted/10">
              <div className="flex flex-wrap items-center gap-3 @lg:gap-4">
                {secondaryControls.map((control) => (
                  <ControlGroup key={control.id} control={control} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && settingsPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] z-50">
          <div
            ref={settingsRef}
            className="rounded-xl border border-border/60 bg-background/98 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50 bg-muted/20">
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
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'online' | 'offline' | 'loading' }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-muted/50 border border-border/50">
      <div
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'online' && 'bg-emerald-500',
          status === 'offline' && 'bg-red-500',
          status === 'loading' && 'bg-amber-500 animate-pulse',
        )}
      />
      <span className="text-[10px] font-medium text-muted-foreground capitalize">{status}</span>
    </div>
  );
}

function ControlGroup({ control }: { control: HeaderControl }) {
  const appearance = control.appearance || 'pills';

  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] @lg:text-xs font-semibold text-muted-foreground/80 uppercase tracking-wide flex-shrink-0">
        {control.label}
      </span>

      <div
        className={cn(
          'flex items-center flex-wrap',
          appearance === 'pills' && 'gap-1',
          appearance === 'buttons' && 'gap-1.5',
          appearance === 'compact' && 'gap-0.5',
        )}
      >
        {control.items.map((item) => {
          if (appearance === 'buttons') {
            return <ControlButton key={item.id} item={item} />;
          } else if (appearance === 'compact') {
            return <CompactButton key={item.id} item={item} />;
          }
          return <ControlPill key={item.id} item={item} />;
        })}
      </div>
    </div>
  );
}

function ControlPill({ item }: { item: HeaderControlItem }) {
  const variantStyles = {
    default: item.active
      ? 'bg-primary/90 text-primary-foreground border-primary shadow-sm'
      : 'bg-card hover:bg-muted border-border/50 text-foreground',
    success: item.active
      ? 'bg-emerald-500 text-white border-emerald-500 shadow-sm'
      : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    danger: item.active
      ? 'bg-red-500 text-white border-red-500 shadow-sm'
      : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-300',
    warning: item.active
      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
      : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300',
  };

  return (
    <button
      onClick={item.onClick}
      className={cn(
        'px-2.5 @lg:px-3 py-1 @lg:py-1.5 rounded-lg border text-xs @lg:text-sm font-medium transition-all',
        'hover:scale-[1.02] active:scale-[0.98]',
        variantStyles[item.variant || 'default'],
      )}
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        {item.icon}
        {item.label}
      </span>
    </button>
  );
}

function ControlButton({ item }: { item: HeaderControlItem }) {
  const variantStyles = {
    default: item.active
      ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20'
      : 'bg-muted/80 hover:bg-muted text-foreground',
    success: item.active
      ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20'
      : 'bg-muted/80 hover:bg-muted text-foreground',
    danger: item.active
      ? 'bg-red-500 text-white shadow-md shadow-red-500/20'
      : 'bg-muted/80 hover:bg-muted text-foreground',
    warning: item.active
      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/20'
      : 'bg-muted/80 hover:bg-muted text-foreground',
  };

  return (
    <button
      onClick={item.onClick}
      className={cn(
        'px-3 @lg:px-4 py-1.5 @lg:py-2 rounded-lg text-xs @lg:text-sm font-semibold transition-all',
        'hover:scale-[1.02] active:scale-[0.98]',
        variantStyles[item.variant || 'default'],
      )}
    >
      <span className="flex items-center gap-2 whitespace-nowrap">
        {item.icon}
        {item.label}
      </span>
    </button>
  );
}

function CompactButton({ item }: { item: HeaderControlItem }) {
  return (
    <button
      onClick={item.onClick}
      className={cn(
        'px-2 py-0.5 rounded text-[10px] @lg:text-xs font-medium transition-colors',
        item.active
          ? 'bg-primary text-primary-foreground'
          : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground',
      )}
    >
      {item.label}
    </button>
  );
}

export function ActionButton({
  icon,
  label,
  onClick,
  active,
  variant = 'default',
  disabled,
  className,
}: {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
  active?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  disabled?: boolean;
  className?: string;
}) {
  const variantStyles = {
    default: active
      ? 'bg-muted text-foreground'
      : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground',
    primary: active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'bg-primary/10 text-primary hover:bg-primary/20',
    danger: active
      ? 'bg-red-500 text-white shadow-sm'
      : 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1.5 @lg:p-2 rounded-lg transition-all',
        'hover:scale-[1.05] active:scale-[0.95]',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100',
        variantStyles[variant],
        className,
      )}
      title={label}
      aria-label={label}
    >
      {icon}
    </button>
  );
}
