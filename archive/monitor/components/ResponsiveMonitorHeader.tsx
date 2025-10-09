'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, X, ChevronDown, Filter, MoreVertical, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ResponsiveMonitorHeaderProps {
  title: string;
  titleIcon?: React.ReactNode;
  badge?: React.ReactNode;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';

  primaryControls?: React.ReactNode;

  secondaryControls?: React.ReactNode;

  settingsContent?: React.ReactNode;
  onSettingsToggle?: (open: boolean) => void;

  rightActions?: React.ReactNode;

  mobileCollapsible?: boolean;
  className?: string;
}

export function ResponsiveMonitorHeader({
  title,
  titleIcon,
  badge,
  connectionStatus,
  primaryControls,
  secondaryControls,
  settingsContent,
  onSettingsToggle,
  rightActions,
  mobileCollapsible = true,
  className,
}: ResponsiveMonitorHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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

      if (showMobileMenu) {
        if (
          !mobileMenuRef.current?.contains(target) &&
          !mobileMenuButtonRef.current?.contains(target)
        ) {
          setShowMobileMenu(false);
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
  }, [showSettings, showMobileMenu, onSettingsToggle]);

  const handleSettingsToggle = () => {
    const newState = !showSettings;
    setShowSettings(newState);
    onSettingsToggle?.(newState);
  };

  const connectionIndicator = connectionStatus && (
    <div
      className={cn(
        'h-1.5 w-1.5 rounded-full transition-all duration-300',
        connectionStatus === 'connected'
          ? 'bg-emerald-500'
          : connectionStatus === 'connecting'
            ? 'bg-amber-500 animate-pulse'
            : 'bg-red-500',
      )}
      title={connectionStatus}
    />
  );

  return (
    <div className={cn('relative', className)}>
      {/* Main Header */}
      <div className="border-b border-border/50 bg-gradient-to-r from-card/50 via-background/50 to-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 px-3 py-2.5 md:px-4 md:py-3">
          {/* Left: Title Section */}
          <div className="flex items-center gap-2 min-w-0">
            {titleIcon && <div className="flex-shrink-0 text-primary">{titleIcon}</div>}
            <h3 className="text-sm md:text-base font-semibold text-foreground truncate">{title}</h3>
            {badge && <div className="flex-shrink-0">{badge}</div>}
            {connectionIndicator}
          </div>

          {/* Center: Primary Controls (Hidden on mobile if collapsible) */}
          {primaryControls && (
            <div
              className={cn(
                'flex items-center gap-1.5 flex-1 justify-center max-w-3xl',
                isMobile && mobileCollapsible && 'hidden',
              )}
            >
              {primaryControls}
            </div>
          )}

          {/* Right: Actions */}
          <div className="flex items-center gap-1.5">
            {/* Secondary controls - visible on desktop, in menu on mobile */}
            {secondaryControls && !isMobile && (
              <div className="flex items-center gap-1.5">{secondaryControls}</div>
            )}

            {/* Custom right actions */}
            {rightActions}

            {/* Mobile menu button */}
            {isMobile && (primaryControls || secondaryControls) && mobileCollapsible && (
              <button
                ref={mobileMenuButtonRef}
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  'hover:bg-muted/50 active:scale-95',
                  showMobileMenu && 'bg-muted/50',
                )}
                aria-label="Toggle filters"
              >
                <Filter className="h-4 w-4" />
              </button>
            )}

            {/* Settings button */}
            {settingsContent && (
              <button
                ref={settingsButtonRef}
                onClick={handleSettingsToggle}
                className={cn(
                  'p-2 rounded-lg transition-all duration-200',
                  'hover:bg-muted/50 active:scale-95',
                  showSettings && 'bg-primary text-primary-foreground',
                )}
                aria-label="Settings"
              >
                <Settings className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile Controls Panel */}
        {isMobile && showMobileMenu && mobileCollapsible && (
          <div
            ref={mobileMenuRef}
            className="border-t border-border/30 bg-card/50 backdrop-blur-sm"
          >
            <div className="p-3 space-y-3">
              {/* Primary controls in mobile view */}
              {primaryControls && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Filters
                  </div>
                  <div className="flex flex-wrap gap-2">{primaryControls}</div>
                </div>
              )}

              {/* Secondary controls in mobile view */}
              {secondaryControls && (
                <div className="space-y-2">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Options
                  </div>
                  <div className="flex flex-wrap gap-2">{secondaryControls}</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Settings Panel */}
      {showSettings && settingsContent && (
        <div
          ref={settingsRef}
          className={cn(
            'absolute right-0 top-full z-50 mt-1',
            'w-80 max-w-[calc(100vw-2rem)]',
            'rounded-lg border border-border/60',
            'bg-background/95 backdrop-blur-md',
            'shadow-xl animate-in fade-in-0 slide-in-from-top-2',
          )}
        >
          <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
            <span className="text-sm font-semibold text-foreground">Settings</span>
            <button
              onClick={() => {
                setShowSettings(false);
                onSettingsToggle?.(false);
              }}
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close settings"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="max-h-[400px] overflow-y-auto">{settingsContent}</div>
        </div>
      )}
    </div>
  );
}

export function HeaderControlButton({
  active,
  onClick,
  children,
  className,
  variant = 'default',
  size = 'sm',
  ...props
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'primary' | 'success' | 'danger' | 'ghost';
  size?: 'xs' | 'sm' | 'md';
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = {
    xs: 'px-1.5 py-0.5 text-[10px]',
    sm: 'px-2 py-1 text-[11px]',
    md: 'px-3 py-1.5 text-xs',
  };

  const variantClasses = {
    default: active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted/70',
    primary: active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'text-primary hover:bg-primary/10',
    success: active
      ? 'bg-emerald-500 text-white shadow-sm'
      : 'text-emerald-600 hover:bg-emerald-500/10',
    danger: active ? 'bg-red-500 text-white shadow-sm' : 'text-red-600 hover:bg-red-500/10',
    ghost: active
      ? 'bg-muted text-foreground'
      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'font-medium rounded-md transition-all duration-200',
        'focus:outline-none focus:ring-2 focus:ring-primary/30',
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

export function HeaderControlGroup({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('inline-flex items-center gap-0.5 bg-muted/30 rounded-lg p-0.5', className)}>
      {children}
    </div>
  );
}
