'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Settings, X, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HeaderControl {
  id: string;
  label: string;
  items: HeaderControlItem[];
  appearance?: 'tabs' | 'pills' | 'compact';
}

interface HeaderControlItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  variant?: 'default' | 'success' | 'danger' | 'warning';
  onClick?: () => void;
}

interface FinalHeaderProps {
  title: string;
  titleIcon?: React.ReactNode;
  subtitle?: React.ReactNode;
  status?: 'online' | 'offline' | 'loading';

  valueDisplay?: React.ReactNode;

  primaryControls?: HeaderControl[];

  secondaryControls?: HeaderControl[];

  quickActions?: React.ReactNode;
  settingsPanel?: React.ReactNode;

  className?: string;
}

export function FinalHeader({
  title,
  titleIcon,
  subtitle,
  status,
  valueDisplay,
  primaryControls = [],
  secondaryControls = [],
  quickActions,
  settingsPanel,
  className,
}: FinalHeaderProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showSecondary, setShowSecondary] = useState(false);
  const [settingsTransform, setSettingsTransform] = useState<string>('');
  const settingsRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);

  const computeSettingsPosition = useCallback(() => {
    if (!settingsButtonRef.current) return;
    const triggerRect = settingsButtonRef.current.getBoundingClientRect();
    const navbar = document.querySelector('[data-app-nav]') as HTMLElement | null;
    const navHeight = navbar ? navbar.getBoundingClientRect().height : 0;
    const gap = 4;
    let y = triggerRect.bottom + gap;
    if (y < navHeight + gap) y = navHeight + gap;
    setSettingsTransform(`translate(calc(${triggerRect.right}px - 100%), ${y}px)`);
  }, []);

  useEffect(() => {
    if (showSettings) {
      computeSettingsPosition();
    }
  }, [showSettings, computeSettingsPosition]);

  useEffect(() => {
    if (!showSettings) return;
    const handler = () => computeSettingsPosition();
    window.addEventListener('scroll', handler, { capture: true, passive: true });
    window.addEventListener('resize', handler, { passive: true });
    return () => {
      window.removeEventListener('scroll', handler, { capture: true } as any);
      window.removeEventListener('resize', handler as any);
    };
  }, [showSettings, computeSettingsPosition]);

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
      <div className="bg-background border-b border-border/50">
        <div className="p-3">
          {/* Top Row - Title LEFT, Value Display & Actions RIGHT */}
          {/* Stacks on 2 lines on mobile to prevent overlapping */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-2 mb-2">
            {/* LEFT: Title Section */}
            <div className="flex items-center gap-2 min-w-0 flex-1">
              {titleIcon && <div className="text-primary flex-shrink-0">{titleIcon}</div>}
              <h3 className="text-base font-semibold text-foreground truncate">{title}</h3>
              {status && <StatusBadge status={status} />}
              {subtitle && (
                <span className="text-xs text-muted-foreground ml-1 truncate">{subtitle}</span>
              )}
            </div>

            {/* RIGHT: Value Display & Actions */}
            {/* Will wrap to second line on mobile if needed */}
            <div className="flex items-center gap-1.5 flex-shrink-0 flex-wrap">
              {valueDisplay && <div className="text-right">{valueDisplay}</div>}
              {/* On very small screens push quick actions to next line to avoid overlap */}
              <div className="flex items-center gap-1.5 flex-wrap">{quickActions}</div>
              {secondaryControls.length > 0 && (
                <button
                  onClick={() => setShowSecondary(!showSecondary)}
                  className={cn(
                    'md:hidden p-1 rounded-lg transition-colors',
                    'hover:bg-muted/80',
                    showSecondary && 'bg-muted',
                  )}
                >
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      showSecondary && 'rotate-180',
                    )}
                  />
                </button>
              )}
              {settingsPanel && (
                <div className="relative">
                  <button
                    ref={settingsButtonRef}
                    onClick={() => setShowSettings(!showSettings)}
                    className={cn(
                      'p-1 rounded-lg transition-colors',
                      'hover:bg-muted/80',
                      showSettings && 'bg-muted',
                    )}
                    aria-haspopup="dialog"
                    aria-expanded={showSettings}
                    aria-label="Settings"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Primary Controls - Always Visible */}
          {primaryControls.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              {primaryControls.map((control) => (
                <ControlGroup key={control.id} control={control} />
              ))}
            </div>
          )}
        </div>

        {/* Secondary Controls - Collapsible */}
        {secondaryControls.length > 0 && (
          <div
            className={cn(
              'border-t border-border/30 overflow-hidden transition-all',
              'md:block',
              showSecondary ? 'block' : 'hidden',
            )}
          >
            <div className="p-3 pt-2 bg-muted/5 flex flex-wrap items-center gap-x-4 gap-y-2">
              {secondaryControls.map((control) => (
                <ControlGroup key={control.id} control={control} />
              ))}
            </div>
          </div>
        )}
      </div>

      {showSettings && settingsPanel && (
        <div
          ref={settingsRef}
          className="pointer-events-auto absolute z-50 w-80 md:w-96 max-w-[calc(100vw-2rem)] rounded-lg border border-border/60 bg-background shadow-xl overflow-hidden"
          style={{ transform: settingsTransform }}
          role="dialog"
          aria-label="Settings Panel"
        >
          <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/20">
            <span className="text-sm font-semibold">Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 rounded-md hover:bg-muted/50 transition-colors"
              aria-label="Close settings"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto p-3">{settingsPanel}</div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: 'online' | 'offline' | 'loading' }) {
  return (
    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted/40 border border-border/40">
      <div
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'online' && 'bg-emerald-500',
          status === 'offline' && 'bg-red-500',
          status === 'loading' && 'bg-amber-500 animate-pulse',
        )}
      />
      <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wide">
        {status}
      </span>
    </div>
  );
}

function ControlGroup({ control }: { control: HeaderControl }) {
  const appearance = control.appearance || 'pills';

  return (
    <div className="flex items-center gap-1.5">
      {control.label && (
        <span className="text-[10px] font-medium text-muted-foreground/80 uppercase tracking-wide">
          {control.label}
        </span>
      )}

      <div
        className={cn(
          'flex items-center flex-wrap',
          appearance === 'tabs' && 'gap-0 border border-border/50 rounded-md overflow-hidden',
          appearance === 'pills' && 'gap-1',
          appearance === 'compact' && 'gap-0.5',
        )}
      >
        {control.items.map((item, idx) => {
          if (appearance === 'tabs') {
            return (
              <TabButton
                key={item.id}
                item={item}
                isFirst={idx === 0}
                isLast={idx === control.items.length - 1}
              />
            );
          } else if (appearance === 'compact') {
            return <CompactButton key={item.id} item={item} />;
          }
          return <PillButton key={item.id} item={item} />;
        })}
      </div>
    </div>
  );
}

function TabButton({
  item,
  isFirst,
  isLast,
}: {
  item: HeaderControlItem;
  isFirst: boolean;
  isLast: boolean;
}) {
  return (
    <button
      onClick={item.onClick}
      className={cn(
        'px-2.5 py-1.5 text-[11px] @md:text-xs font-medium transition-colors touch-manipulation leading-none',
        !isLast && 'border-r border-border/50',
        item.active
          ? 'bg-primary text-primary-foreground'
          : 'bg-background hover:bg-muted text-foreground',
      )}
    >
      <span className="flex items-center gap-1.5">
        {item.icon}
        {item.label}
      </span>
    </button>
  );
}

function PillButton({ item }: { item: HeaderControlItem }) {
  const variantStyles = {
    default: item.active
      ? 'bg-primary text-primary-foreground'
      : 'bg-muted/60 hover:bg-muted text-foreground',
    success: item.active
      ? 'bg-emerald-500 text-white'
      : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20',
    danger: item.active
      ? 'bg-red-500 text-white'
      : 'bg-red-500/10 hover:bg-red-500/20 text-red-700 dark:text-red-300 border border-red-500/20',
    warning: item.active
      ? 'bg-amber-500 text-white'
      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/20',
  };

  return (
    <button
      onClick={item.onClick}
      className={cn(
        'px-2 py-1 rounded-md text-[11px] font-medium transition-colors leading-none',
        variantStyles[item.variant || 'default'],
      )}
    >
      <span className="flex items-center gap-1">
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
        'px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors leading-none',
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
      ? 'bg-primary text-primary-foreground'
      : 'bg-primary/10 text-primary hover:bg-primary/20',
    danger: active ? 'bg-red-500 text-white' : 'bg-red-500/10 text-red-600 hover:bg-red-500/20',
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'p-1 rounded-md transition-colors',
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

export function ValueDisplay({
  label,
  value,
  subValue,
  variant = 'default',
  className,
}: {
  label: string;
  value: string | number;
  subValue?: string;
  variant?: 'default' | 'success' | 'danger';
  className?: string;
}) {
  const variantColors = {
    default: 'text-foreground',
    success: 'text-emerald-600 dark:text-emerald-400',
    danger: 'text-red-600 dark:text-red-400',
  };

  return (
    <div className={cn('text-right h-[52px] flex flex-col justify-center', className)}>
      <div className="text-[10px] text-muted-foreground leading-[14px] h-[14px]">{label}</div>
      <div
        className={cn('text-base font-semibold leading-[20px] h-[20px]', variantColors[variant])}
      >
        {value}
      </div>
      {/* Always reserve space for subValue to prevent height jumping */}
      <div className="text-[10px] text-muted-foreground leading-[14px] h-[14px]">
        {subValue || '\u00A0'}
      </div>
    </div>
  );
}

export function ExchangeSelector({
  label = 'Exchanges',
  exchanges,
  selection,
  onToggle,
  className,
}: {
  label?: string;
  exchanges: Array<{ id: string; label: string; icon?: string }>;
  selection: Record<string, boolean>;
  onToggle: (id: string) => void;
  className?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [dropdownTransform, setDropdownTransform] = useState<string>('');
  const [dropdownPlacement, setDropdownPlacement] = useState<'bottom' | 'top'>('bottom');

  const selectedCount = Object.values(selection).filter(Boolean).length;
  const allSelected = exchanges.every((ex) => selection[ex.id]);

  const someSelected = selectedCount > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    const handleClick = (e: MouseEvent) => {
      if (!dropdownRef.current) return;
      if (dropdownRef.current.contains(e.target as Node)) return;
      if (buttonRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [isOpen]);

  const handleSelectAll = () => {
    if (allSelected) {
      exchanges.forEach((ex) => {
        if (selection[ex.id]) onToggle(ex.id);
      });
    } else {
      exchanges.forEach((ex) => {
        if (!selection[ex.id]) onToggle(ex.id);
      });
    }
  };

  const isolateExchange = useCallback(
    (id: string) => {
      exchanges.forEach((ex) => {
        const shouldBeOn = ex.id === id;
        if (selection[ex.id] !== shouldBeOn) {
          onToggle(ex.id);
        }
      });
    },
    [exchanges, selection, onToggle],
  );

  const handleExchangeClick = (
    id: string,
    e: React.MouseEvent<HTMLInputElement | HTMLLabelElement>,
  ) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      isolateExchange(id);
      return;
    }
    onToggle(id);
  };

  const recomputeDropdownPosition = useCallback(() => {
    if (!isOpen || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const maxHeight = 340;
    let y = rect.bottom + 4;
    let placement: 'bottom' | 'top' = 'bottom';
    if (y + maxHeight > viewportHeight && rect.top - 4 - maxHeight > 0) {
      y = rect.top - 4 - maxHeight;
      placement = 'top';
    }
    setDropdownPlacement(placement);
    setDropdownTransform(`translate(${rect.left}px, ${y}px)`);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) recomputeDropdownPosition();
  }, [isOpen, recomputeDropdownPosition]);
  useEffect(() => {
    if (!isOpen) return;
    const handler = () => recomputeDropdownPosition();
    window.addEventListener('resize', handler);
    window.addEventListener('scroll', handler, true);
    return () => {
      window.removeEventListener('resize', handler);
      window.removeEventListener('scroll', handler, true);
    };
  }, [isOpen, recomputeDropdownPosition]);

  const dropdownInner = isOpen ? (
    <div
      ref={dropdownRef}
      className="absolute z-50 min-w-[240px] max-w-[260px] rounded-lg border border-border bg-background shadow-xl overflow-hidden"
      style={{ transform: dropdownTransform }}
      data-placement={dropdownPlacement}
      role="menu"
      aria-label="Exchange selection"
    >
      <div className="p-2 space-y-1 max-h-[340px] overflow-y-auto">
        <label
          onClick={(e) => {
            e.preventDefault();
            handleSelectAll();
          }}
          className="flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors select-none hover:bg-muted"
        >
          <input
            ref={selectAllRef}
            type="checkbox"
            checked={allSelected}
            onChange={handleSelectAll}
            className="rounded border-border accent-primary h-4 w-4"
            aria-checked={allSelected ? 'true' : someSelected ? 'mixed' : 'false'}
          />
          <span className="text-sm font-medium">Alle auswählen</span>
        </label>
        <div className="h-px bg-border my-1" />
        <div className="px-3 py-1.5 text-[10px] text-muted-foreground bg-muted/30 rounded">
          💡 <strong>Ctrl+Click</strong> to show only this exchange
        </div>
        {exchanges.map((exchange) => (
          <label
            key={exchange.id}
            onClick={(e) => handleExchangeClick(exchange.id, e)}
            className={cn(
              'flex items-center gap-2 px-3 py-2 rounded-md cursor-pointer transition-colors select-none',
              selection[exchange.id] ? 'bg-primary/10 text-primary' : 'hover:bg-muted',
            )}
          >
            <input
              type="checkbox"
              checked={selection[exchange.id]}
              onChange={(e) => handleExchangeClick(exchange.id, e as any)}
              onClick={(e) => e.stopPropagation()}
              className="rounded border-border accent-primary"
            />
            {exchange.icon && <img src={exchange.icon} alt={exchange.label} className="h-4 w-4" />}
            <span className="text-sm font-medium">{exchange.label}</span>
          </label>
        ))}
      </div>
    </div>
  ) : null;

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/60 hover:bg-muted text-[11px] font-medium transition-colors',
          className,
        )}
        title="Filter by exchanges"
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <span>{label}</span>
        <span className="text-[10px] text-muted-foreground">({selectedCount})</span>
        <ChevronDown
          className={cn('h-3 w-3 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      </button>
      {dropdownInner}
    </div>
  );
}
