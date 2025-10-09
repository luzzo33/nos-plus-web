'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FluidHeaderProps {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  status?: 'online' | 'offline' | 'loading';
  controls?: React.ReactNode;
  quickActions?: React.ReactNode;
  settingsPanel?: React.ReactNode;
  className?: string;
}

export function FluidHeader({
  title,
  titleIcon,
  subtitle,
  badge,
  status,
  controls,
  quickActions,
  settingsPanel,
  className,
}: FluidHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
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
      if (e.key === 'Escape') {
        setShowSettings(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSettings]);

  const statusIndicator = status && (
    <div
      className={cn(
        'h-2 w-2 rounded-full',
        status === 'online' && 'bg-emerald-500',
        status === 'offline' && 'bg-red-500',
        status === 'loading' && 'bg-amber-500 animate-pulse',
      )}
    />
  );

  return (
    <div className={cn('@container relative', className)}>
      {/* Main Header */}
      <div className="bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="p-2 @sm:p-2.5 @lg:p-3">
          {/* Title Row */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 @lg:gap-2.5 min-w-0 flex-1">
              {titleIcon && <div className="text-primary/80 flex-shrink-0">{titleIcon}</div>}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm @lg:text-base font-semibold text-foreground truncate">
                    {title}
                  </h3>
                  {badge}
                  {statusIndicator}
                </div>
                {subtitle && (
                  <div className="text-[10px] @sm:text-xs text-muted-foreground truncate mt-0.5">
                    {subtitle}
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 flex-shrink-0">
              {quickActions}
              {settingsPanel && (
                <button
                  ref={settingsButtonRef}
                  onClick={() => setShowSettings(!showSettings)}
                  className={cn(
                    'p-1.5 @lg:p-2 rounded-lg transition-colors',
                    'hover:bg-muted/80',
                    showSettings && 'bg-muted text-foreground',
                  )}
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Controls - Fluid Wrap */}
          {controls && <div className="text-xs @lg:text-sm">{controls}</div>}
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && settingsPanel && (
        <div className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] z-50">
          <div
            ref={settingsRef}
            className="rounded-xl border border-border/60 bg-background/95 backdrop-blur-xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
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

export function ControlGroup({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-1.5 @lg:gap-2', className)}>
      {label && (
        <span className="text-[10px] @lg:text-xs font-medium text-muted-foreground uppercase tracking-wider flex-shrink-0">
          {label}:
        </span>
      )}
      <div className="flex items-center gap-1 flex-wrap">{children}</div>
    </div>
  );
}

export function PillButton({
  active,
  onClick,
  children,
  icon,
  variant = 'default',
  size = 'default',
  className,
  disabled,
  ...props
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  size?: 'default' | 'sm';
  className?: string;
  disabled?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = {
    default: 'px-2.5 @lg:px-3 py-1 @lg:py-1.5 text-xs',
    sm: 'px-2 py-0.5 text-xs',
  };

  const variantClasses = {
    default: active
      ? 'bg-primary text-primary-foreground border-primary'
      : 'bg-muted/50 hover:bg-muted border-border/50 text-foreground',
    success: active
      ? 'bg-emerald-500 text-white border-emerald-500'
      : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-700 dark:text-emerald-300',
    danger: active
      ? 'bg-red-500 text-white border-red-500'
      : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-300',
    warning: active
      ? 'bg-amber-500 text-white border-amber-500'
      : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-700 dark:text-amber-300',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'font-medium rounded-lg border transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-1.5 whitespace-nowrap">
        {icon}
        {children}
      </span>
    </button>
  );
}

export function ActionButton({
  icon,
  label,
  onClick,
  active,
  variant = 'default',
  className,
  disabled,
}: {
  icon: React.ReactNode;
  label?: string;
  onClick?: () => void;
  active?: boolean;
  variant?: 'default' | 'primary' | 'danger';
  className?: string;
  disabled?: boolean;
}) {
  const variantStyles = {
    default: active
      ? 'bg-muted text-foreground'
      : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground',
    primary: active
      ? 'bg-primary text-primary-foreground'
      : 'bg-primary/10 text-primary hover:bg-primary/20',
    danger: active ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1.5 @lg:p-2 rounded-lg transition-colors',
        'disabled:opacity-50 disabled:cursor-not-allowed',
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

export function ControlsWrapper({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2 @lg:gap-3', className)}>{children}</div>
  );
}
