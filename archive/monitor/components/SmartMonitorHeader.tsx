'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SmartMonitorHeaderProps {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  status?: React.ReactNode;

  primaryControls?: React.ReactNode;

  secondaryControls?: React.ReactNode;

  quickActions?: React.ReactNode;

  settingsContent?: React.ReactNode;
  onSettingsToggle?: (open: boolean) => void;

  mobileCollapsible?: boolean;
  defaultMobileExpanded?: boolean;

  className?: string;
}

type ContainerSize = 'ultra-compact' | 'compact' | 'medium' | 'full';

function getContainerSize(width: number): ContainerSize {
  if (width < 400) return 'ultra-compact';
  if (width < 600) return 'compact';
  if (width < 900) return 'medium';
  return 'full';
}

export function SmartMonitorHeader({
  title,
  titleIcon,
  subtitle,
  badge,
  status,
  primaryControls,
  secondaryControls,
  quickActions,
  settingsContent,
  onSettingsToggle,
  mobileCollapsible = true,
  defaultMobileExpanded = false,
  className,
}: SmartMonitorHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [mobileExpanded, setMobileExpanded] = useState(defaultMobileExpanded);
  const [containerSize, setContainerSize] = useState<ContainerSize>('full');
  const [isMobile, setIsMobile] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.matchMedia('(max-width: 768px)').matches);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setContainerSize(getContainerSize(width));
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    if (!showSettings) return;

    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!settingsRef.current?.contains(target) && !settingsButtonRef.current?.contains(target)) {
        setShowSettings(false);
        onSettingsToggle?.(false);
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowSettings(false);
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

  if (containerSize === 'ultra-compact') {
    return (
      <>
        <div
          ref={containerRef}
          className={cn('bg-background/95 backdrop-blur-sm border-b border-border/50', className)}
        >
          <div className="px-2 py-1.5 space-y-1.5">
            {/* Title Row */}
            <div className="flex items-center justify-between gap-1">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                {titleIcon && <div className="text-primary/80 flex-shrink-0">{titleIcon}</div>}
                <div className="min-w-0 flex-1">
                  <h3 className="text-xs font-semibold text-foreground truncate">{title}</h3>
                  {subtitle && (
                    <div className="text-[9px] text-muted-foreground truncate">{subtitle}</div>
                  )}
                </div>
                {status && <div className="flex-shrink-0">{status}</div>}
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {quickActions}
                {settingsContent && (
                  <button
                    ref={settingsButtonRef}
                    onClick={handleSettingsToggle}
                    className={cn(
                      'p-1 rounded transition-all',
                      'hover:bg-muted/50',
                      showSettings && 'bg-muted text-foreground',
                    )}
                    aria-label="Settings"
                  >
                    <Settings className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Controls Grid */}
            {(primaryControls || secondaryControls) && (
              <div className="space-y-1">
                {primaryControls && <div className="text-[10px]">{primaryControls}</div>}
                {secondaryControls && (
                  <div className="pt-1 border-t border-border/30 text-[10px]">
                    {secondaryControls}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {showSettings && settingsContent && (
          <SettingsPanel
            settingsRef={settingsRef}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            onSettingsToggle={onSettingsToggle}
          >
            {settingsContent}
          </SettingsPanel>
        )}
      </>
    );
  }

  if (containerSize === 'compact') {
    return (
      <>
        <div
          ref={containerRef}
          className={cn('bg-background/95 backdrop-blur-sm border-b border-border/50', className)}
        >
          <div className="px-2.5 py-2 space-y-2">
            {/* Header Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                {titleIcon && <div className="text-primary/80 flex-shrink-0">{titleIcon}</div>}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
                  {subtitle && (
                    <div className="text-[10px] text-muted-foreground truncate">{subtitle}</div>
                  )}
                </div>
                {status && <div className="flex-shrink-0">{status}</div>}
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {quickActions}
                {settingsContent && (
                  <button
                    ref={settingsButtonRef}
                    onClick={handleSettingsToggle}
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      'hover:bg-muted/50',
                      showSettings && 'bg-muted text-foreground',
                    )}
                    aria-label="Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Controls - Stacked */}
            {primaryControls && <div className="text-xs">{primaryControls}</div>}
            {secondaryControls && (
              <div className="pt-1.5 border-t border-border/30 text-xs">{secondaryControls}</div>
            )}
          </div>
        </div>
        {showSettings && settingsContent && (
          <SettingsPanel
            settingsRef={settingsRef}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            onSettingsToggle={onSettingsToggle}
          >
            {settingsContent}
          </SettingsPanel>
        )}
      </>
    );
  }

  if (containerSize === 'medium') {
    return (
      <>
        <div
          ref={containerRef}
          className={cn('bg-background/95 backdrop-blur-sm border-b border-border/50', className)}
        >
          <div className="px-3 py-2.5">
            {/* Single Row - Compact Horizontal */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                {titleIcon && <div className="text-primary/80 flex-shrink-0">{titleIcon}</div>}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                    {badge}
                    {status}
                  </div>
                  {subtitle && (
                    <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>
                  )}
                </div>
              </div>

              {/* Controls Inline */}
              <div className="flex items-center gap-3 flex-shrink-0 text-xs">{primaryControls}</div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {quickActions}
                {settingsContent && (
                  <button
                    ref={settingsButtonRef}
                    onClick={handleSettingsToggle}
                    className={cn(
                      'p-1.5 rounded-lg transition-all',
                      'hover:bg-muted/50',
                      showSettings && 'bg-muted text-foreground',
                    )}
                    aria-label="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Secondary Controls Row */}
            {secondaryControls && (
              <div className="mt-2 pt-2 border-t border-border/30">
                <div className="flex items-center justify-center gap-3 flex-wrap text-xs">
                  {secondaryControls}
                </div>
              </div>
            )}
          </div>
        </div>
        {showSettings && settingsContent && (
          <SettingsPanel
            settingsRef={settingsRef}
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            onSettingsToggle={onSettingsToggle}
          >
            {settingsContent}
          </SettingsPanel>
        )}
      </>
    );
  }

  return (
    <>
      <div
        ref={containerRef}
        className={cn('bg-background/95 backdrop-blur-sm border-b border-border/50', className)}
      >
        {/* Desktop Layout - 2 rows */}
        <div className="hidden md:block">
          {/* First Row - Title and Primary Controls */}
          <div className="px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {titleIcon && (
                <div className="text-primary/80 hover:text-primary transition-colors">
                  {titleIcon}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  {badge}
                  {status}
                </div>
                {subtitle && (
                  <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>
                )}
              </div>
            </div>

            {/* Primary Controls - Centered */}
            {primaryControls && (
              <div className="flex-1 flex items-center justify-center">
                <div className="flex items-center gap-4 flex-wrap">{primaryControls}</div>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              {quickActions}
              {settingsContent && (
                <button
                  ref={settingsButtonRef}
                  onClick={handleSettingsToggle}
                  className={cn(
                    'p-2 rounded-lg transition-all duration-200',
                    'hover:bg-muted/50',
                    showSettings && 'bg-muted text-foreground',
                  )}
                  aria-label="Settings"
                >
                  <Settings className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {/* Second Row - Secondary Controls (if provided) */}
          {secondaryControls && (
            <div className="px-4 pb-2.5 border-t border-border/30">
              <div className="pt-2 flex items-center justify-center">
                <div className="flex items-center gap-4 flex-wrap max-w-4xl">
                  {secondaryControls}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Mobile Layout - Collapsible */}
        <div className="md:hidden">
          <div className="px-3 py-2.5">
            {/* Mobile Header Row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {titleIcon && <div className="text-primary/80">{titleIcon}</div>}
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground truncate">{title}</h3>
                  {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
                </div>
                {status}
              </div>

              {/* Mobile Actions */}
              <div className="flex items-center gap-1">
                {quickActions}
                {(primaryControls || secondaryControls) && mobileCollapsible && (
                  <button
                    onClick={() => setMobileExpanded(!mobileExpanded)}
                    className={cn(
                      'p-2 rounded-lg transition-all duration-200',
                      'hover:bg-muted/50',
                      mobileExpanded && 'bg-muted/50',
                    )}
                    aria-label="Toggle filters"
                  >
                    <Filter className="h-4 w-4" />
                  </button>
                )}
                {settingsContent && (
                  <button
                    ref={settingsButtonRef}
                    onClick={handleSettingsToggle}
                    className={cn(
                      'p-2 rounded-lg transition-all duration-200',
                      'hover:bg-muted/50',
                      showSettings && 'bg-muted text-foreground',
                    )}
                    aria-label="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Mobile Primary Controls - Always visible if not collapsible */}
            {primaryControls && !mobileCollapsible && (
              <div className="mt-3 pb-1">{primaryControls}</div>
            )}

            {/* Mobile Expandable Section */}
            {mobileCollapsible && mobileExpanded && (
              <div className="mt-3 space-y-3 animate-in slide-in-from-top-2">
                {primaryControls && <div className="space-y-2">{primaryControls}</div>}
                {secondaryControls && (
                  <div className="pt-2 border-t border-border/30 space-y-2">
                    {secondaryControls}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {showSettings && settingsContent && (
        <SettingsPanel
          settingsRef={settingsRef}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          onSettingsToggle={onSettingsToggle}
        >
          {settingsContent}
        </SettingsPanel>
      )}
    </>
  );
}

function SettingsPanel({
  settingsRef,
  showSettings,
  setShowSettings,
  onSettingsToggle,
  children,
}: {
  settingsRef: React.RefObject<HTMLDivElement>;
  showSettings: boolean;
  setShowSettings: (show: boolean) => void;
  onSettingsToggle?: (open: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[99] pointer-events-none">
      <div
        ref={settingsRef}
        className={cn(
          'absolute right-4 top-20 pointer-events-auto',
          'w-[320px] md:w-[380px] max-w-[calc(100vw-2rem)]',
          'rounded-xl border border-border/60',
          'bg-background/98 backdrop-blur-xl',
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
        <div className="max-h-[60vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

export function SmartFilterButton({
  active,
  onClick,
  children,
  icon,
  variant = 'default',
  size = 'auto',
  className,
  ...props
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger';
  size?: 'auto' | 'sm' | 'md';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizeClasses = {
    auto: 'px-3 py-1.5 text-xs',
    sm: 'px-2.5 py-1 text-xs',
    md: 'px-4 py-2 text-sm',
  };

  const variantClasses = {
    default: active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted/50 hover:bg-muted text-foreground',
    primary: active
      ? 'bg-primary text-primary-foreground'
      : 'bg-primary/10 text-primary hover:bg-primary/20',
    success: active
      ? 'bg-emerald-500 text-white'
      : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
    danger: active ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        'font-medium rounded-lg transition-all duration-200',
        'hover:shadow-sm',
        sizeClasses[size],
        variantClasses[variant],
        className,
      )}
      {...props}
    >
      <span className="flex items-center gap-1.5">
        {icon}
        {children}
      </span>
    </button>
  );
}

export function ExchangeToggle({
  active,
  onClick,
  icon,
  name,
  compact = false,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  icon?: React.ReactNode;
  name: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border transition-all duration-200',
        active
          ? 'bg-primary/10 border-primary text-primary'
          : 'bg-background border-border/50 text-muted-foreground hover:border-border hover:text-foreground',
        className,
      )}
      title={name}
    >
      {icon}
      {!compact && <span className="text-xs font-medium">{name}</span>}
    </button>
  );
}

export function ControlSection({
  label,
  children,
  className,
}: {
  label?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 flex-shrink-0', className)}>
      {label && label.length > 0 && (
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider flex-shrink-0 whitespace-nowrap">
          {label}:
        </span>
      )}
      <div className="flex items-center gap-1.5 flex-wrap">{children}</div>
    </div>
  );
}

export function MobileControlGroup({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
