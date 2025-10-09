'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, X, ChevronDown, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModernMonitorHeaderProps {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: string;
  badge?: React.ReactNode;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';

  mainFilters?: React.ReactNode;

  secondaryControls?: React.ReactNode;

  quickActions?: React.ReactNode;

  settingsContent?: React.ReactNode;
  onSettingsToggle?: (open: boolean) => void;

  mobileMenuContent?: React.ReactNode;

  className?: string;
}

export function ModernMonitorHeader({
  title,
  titleIcon,
  subtitle,
  badge,
  connectionStatus,
  mainFilters,
  secondaryControls,
  quickActions,
  settingsContent,
  onSettingsToggle,
  mobileMenuContent,
  className,
}: ModernMonitorHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;

      if (showSettings) {
        if (
          !settingsRef.current?.contains(target) &&
          !settingsButtonRef.current?.contains(target)
        ) {
          setShowSettings(false);
          onSettingsToggle?.(false);
        }
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettings(false);
        setShowMobileMenu(false);
        onSettingsToggle?.(false);
      }
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [showSettings, onSettingsToggle]);

  const handleSettingsToggle = () => {
    const newState = !showSettings;
    setShowSettings(newState);
    onSettingsToggle?.(newState);
  };

  return (
    <div className={cn('relative', className)}>
      {/* Main Header Container */}
      <div className="bg-gradient-to-b from-background via-background/95 to-background/90 border-b border-border/50">
        {/* Top Row: Title and Quick Actions */}
        <div className="px-4 py-3 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              {titleIcon && (
                <div className="flex-shrink-0 text-primary opacity-80">{titleIcon}</div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-base md:text-lg font-semibold text-foreground truncate">
                    {title}
                  </h3>
                  {badge}
                  {connectionStatus && (
                    <div
                      className={cn(
                        'h-2 w-2 rounded-full animate-pulse',
                        connectionStatus === 'connected'
                          ? 'bg-emerald-500 animate-none'
                          : connectionStatus === 'connecting'
                            ? 'bg-amber-500'
                            : 'bg-red-500',
                      )}
                    />
                  )}
                </div>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
              </div>
            </div>
          </div>

          {/* Quick Actions Area */}
          <div className="flex items-center gap-2">
            {quickActions}

            {/* Mobile Menu Toggle */}
            {mobileMenuContent && (
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="md:hidden p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <Menu className="h-5 w-5" />
              </button>
            )}

            {/* Settings Button */}
            {settingsContent && (
              <button
                ref={settingsButtonRef}
                onClick={handleSettingsToggle}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  'hover:bg-muted/50',
                  showSettings && 'bg-muted text-foreground',
                )}
              >
                <Settings className="h-4 w-4 md:h-5 md:w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Main Filters Row - Desktop */}
        {mainFilters && (
          <div className="hidden md:block px-4 pb-3">
            <div className="flex flex-wrap items-center gap-3">{mainFilters}</div>
          </div>
        )}

        {/* Secondary Controls Row - Desktop */}
        {secondaryControls && (
          <div className="hidden md:block px-4 pb-3 pt-2 border-t border-border/30">
            <div className="flex flex-wrap items-center gap-2">{secondaryControls}</div>
          </div>
        )}

        {/* Mobile Menu */}
        {showMobileMenu && mobileMenuContent && (
          <div className="md:hidden border-t border-border/30 bg-background/50">
            <div className="p-4 space-y-4">{mobileMenuContent}</div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && settingsContent && (
        <div
          ref={settingsRef}
          className={cn(
            'absolute right-0 top-full z-50 mt-2 mr-2',
            'w-[320px] md:w-[380px] max-w-[calc(100vw-1rem)]',
            'rounded-xl border border-border/60',
            'bg-background/95 backdrop-blur-xl',
            'shadow-2xl animate-in fade-in-0 slide-in-from-top-2',
          )}
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
            <span className="text-sm font-semibold">Settings</span>
            <button
              onClick={() => {
                setShowSettings(false);
                onSettingsToggle?.(false);
              }}
              className="p-1 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto">{settingsContent}</div>
        </div>
      )}
    </div>
  );
}

export function HeaderFilterSection({
  title,
  children,
  className,
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {title && (
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </span>
      )}
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function FilterButton({
  active,
  onClick,
  children,
  variant = 'default',
  size = 'default',
  className,
  ...props
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'outline';
  size?: 'xs' | 'sm' | 'default' | 'lg';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = {
    xs: 'px-2 py-1 text-[10px]',
    sm: 'px-2.5 py-1.5 text-xs',
    default: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-sm',
  };

  const variantClasses = {
    default: cn(
      'bg-background border border-border/60',
      active ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted/50',
    ),
    primary: cn(
      active
        ? 'bg-primary text-primary-foreground'
        : 'bg-primary/10 text-primary hover:bg-primary/20',
    ),
    success: cn(
      active
        ? 'bg-emerald-500 text-white'
        : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
    ),
    danger: cn(active ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20'),
    outline: cn(
      'border',
      active
        ? 'border-primary bg-primary/10 text-primary'
        : 'border-border hover:border-muted-foreground/50',
    ),
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'font-medium rounded-lg transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/20',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function FilterGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center p-1 bg-muted/30 rounded-lg', className)}>
      {children}
    </div>
  );
}
