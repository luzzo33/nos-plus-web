'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Settings, X, ChevronDown, Menu, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CompactMonitorHeaderProps {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  connectionStatus?: 'connected' | 'connecting' | 'disconnected';

  inlineControls?: React.ReactNode;

  expandableControls?: React.ReactNode;
  defaultExpanded?: boolean;

  quickActions?: React.ReactNode;

  settingsContent?: React.ReactNode;
  onSettingsToggle?: (open: boolean) => void;

  mobileMenuContent?: React.ReactNode;

  className?: string;
}

export function CompactMonitorHeader({
  title,
  titleIcon,
  subtitle,
  badge,
  connectionStatus,
  inlineControls,
  expandableControls,
  defaultExpanded = false,
  quickActions,
  settingsContent,
  onSettingsToggle,
  mobileMenuContent,
  className,
}: CompactMonitorHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showExpandable, setShowExpandable] = useState(defaultExpanded);
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const [settingsPosition, setSettingsPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (showSettings && settingsButtonRef.current) {
      const rect = settingsButtonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const modalWidth = 320;

      const left =
        rect.right + modalWidth > viewportWidth ? rect.left - modalWidth - 8 : rect.right + 8;

      setSettingsPosition({
        top: rect.top,
        left: Math.max(8, left),
      });
    }
  }, [showSettings]);

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

    if (showSettings) {
      document.addEventListener('mousedown', handleClick);
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('mousedown', handleClick);
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [showSettings, onSettingsToggle]);

  const handleSettingsToggle = () => {
    const newState = !showSettings;
    setShowSettings(newState);
    onSettingsToggle?.(newState);
  };

  const connectionDot = connectionStatus && (
    <div className="relative">
      <div
        className={cn(
          'h-1.5 w-1.5 rounded-full transition-all duration-500',
          connectionStatus === 'connected'
            ? 'bg-emerald-500'
            : connectionStatus === 'connecting'
              ? 'bg-amber-500'
              : 'bg-red-500',
        )}
      />
      {connectionStatus === 'connecting' && (
        <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" />
      )}
    </div>
  );

  return (
    <>
      <div
        className={cn(
          'relative bg-background/80 backdrop-blur-sm border-b border-border/50',
          className,
        )}
      >
        {/* Main Header Row */}
        <div className="px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Title Area */}
            <div className="flex items-center gap-2 min-w-0">
              {titleIcon && (
                <div className="text-primary/80 transition-colors hover:text-primary">
                  {titleIcon}
                </div>
              )}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  {badge}
                  {connectionDot}
                </div>
                {subtitle && (
                  <div className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</div>
                )}
              </div>
            </div>

            {/* Center: Inline Controls */}
            <div className="flex-1 flex items-center justify-center px-2 overflow-x-auto scrollbar-hide">
              {inlineControls}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
              {quickActions}

              {/* Expandable Toggle */}
              {expandableControls && (
                <button
                  onClick={() => setShowExpandable(!showExpandable)}
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200',
                    'hover:bg-muted/50',
                    showExpandable && 'bg-muted/50 rotate-180',
                  )}
                  style={{ transform: showExpandable ? 'rotate(180deg)' : 'rotate(0deg)' }}
                >
                  <ChevronDown className="h-3.5 w-3.5 transition-transform duration-200" />
                </button>
              )}

              {/* Mobile Menu */}
              {mobileMenuContent && (
                <button
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                  className="md:hidden p-1.5 rounded-md hover:bg-muted/50 transition-all duration-200"
                >
                  <Menu className="h-4 w-4" />
                </button>
              )}

              {/* Settings */}
              {settingsContent && (
                <button
                  ref={settingsButtonRef}
                  onClick={handleSettingsToggle}
                  className={cn(
                    'p-1.5 rounded-md transition-all duration-200',
                    'hover:bg-muted/50 hover:rotate-90',
                    showSettings && 'bg-muted text-foreground rotate-90',
                  )}
                >
                  <Settings className="h-3.5 w-3.5 transition-transform duration-300" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Expandable Controls */}
        <div
          className={cn(
            'overflow-hidden transition-all duration-300 ease-in-out',
            showExpandable ? 'max-h-32 opacity-100' : 'max-h-0 opacity-0',
          )}
        >
          <div className="px-3 pb-2 pt-1 border-t border-border/30 animate-in slide-in-from-top-2">
            {expandableControls}
          </div>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && mobileMenuContent && (
          <div className="md:hidden border-t border-border/30 bg-background/50 animate-in slide-in-from-top-2">
            <div className="p-3 space-y-3">{mobileMenuContent}</div>
          </div>
        )}
      </div>

      {/* Settings Panel - Fixed Position */}
      {showSettings && settingsContent && (
        <div
          ref={settingsRef}
          className={cn(
            'fixed z-[100] w-[320px] md:w-[360px]',
            'rounded-xl border border-border/60',
            'bg-background/95 backdrop-blur-xl',
            'shadow-2xl animate-in fade-in-0 zoom-in-95',
          )}
          style={{
            top: `${settingsPosition.top}px`,
            left: `${settingsPosition.left}px`,
            maxHeight: 'calc(100vh - 100px)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/20">
            <span className="text-sm font-semibold">Settings</span>
            <button
              onClick={() => {
                setShowSettings(false);
                onSettingsToggle?.(false);
              }}
              className="p-1 rounded-lg hover:bg-muted transition-all duration-200"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-[400px] overflow-y-auto">{settingsContent}</div>
        </div>
      )}
    </>
  );
}

export function FilterChip({
  active,
  onClick,
  children,
  variant = 'default',
  className,
  ...props
}: {
  active?: boolean;
  onClick?: () => void;
  children: React.ReactNode;
  variant?: 'default' | 'primary' | 'success' | 'danger';
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const baseClasses =
    'px-2.5 py-1 text-xs font-medium rounded-full transition-all duration-200 hover:scale-105';

  const variants = {
    default: active
      ? 'bg-primary/90 text-primary-foreground shadow-sm'
      : 'bg-muted/50 text-muted-foreground hover:bg-muted',
    primary: active
      ? 'bg-primary text-primary-foreground shadow-sm'
      : 'bg-primary/10 text-primary hover:bg-primary/20',
    success: active
      ? 'bg-emerald-500 text-white shadow-sm'
      : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20',
    danger: active
      ? 'bg-red-500 text-white shadow-sm'
      : 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
  };

  return (
    <button onClick={onClick} className={cn(baseClasses, variants[variant], className)} {...props}>
      <span className="relative">
        {children}
        {active && (
          <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-white/30 animate-pulse" />
        )}
      </span>
    </button>
  );
}

export function CompactControlGroup({
  children,
  label,
  className,
}: {
  children: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      {label && (
        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
          {label}:
        </span>
      )}
      <div className="flex items-center gap-1">{children}</div>
    </div>
  );
}

export function IconToggle({
  active,
  onClick,
  icon,
  label,
  className,
}: {
  active?: boolean;
  onClick?: () => void;
  icon: React.ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'p-1.5 rounded-lg border transition-all duration-200',
        'hover:scale-110',
        active
          ? 'bg-primary/10 border-primary shadow-sm'
          : 'bg-background border-border/40 hover:border-border',
        className,
      )}
      title={label}
    >
      {icon}
    </button>
  );
}

const scrollbarHideStyles = `
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
`;

if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = scrollbarHideStyles;
  document.head.appendChild(style);
}
