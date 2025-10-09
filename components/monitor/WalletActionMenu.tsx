'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WalletPlanType = 'dca' | 'limit';

interface WalletActionMenuProps {
  wallet: string;
  planId: string;
  planType: WalletPlanType;
  className?: string;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
}

export function truncateAddress(address: string, leading = 4, trailing = 4) {
  if (!address) return '';
  const lead = address.slice(0, leading);
  const tail = address.slice(-trailing);
  return `${lead}\u2026${tail}`;
}

function buildPlanUrl(planType: WalletPlanType, planId: string): string {
  const base = planType === 'limit' ? 'https://jup.ag/limit/' : 'https://jup.ag/dca/';
  return `${base}${encodeURIComponent(planId)}`;
}

export function WalletActionMenu({
  wallet,
  planId,
  planType,
  className,
  size = 'md',
  align = 'right',
}: WalletActionMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const label = useMemo(() => truncateAddress(wallet, 4, 4), [wallet]);
  const menuAlignClass = align === 'left' ? 'left-0' : 'right-0';
  const planLabel = planType === 'limit' ? 'View Limit Plan' : 'View DCA Account';

  const closeMenu = useCallback(() => setOpen(false), []);

  const openInNewTab = useCallback((url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = url;
    }
  }, []);

  const handleSelect = useCallback(
    (action: 'solscan' | 'plan') => {
      if (!wallet || !planId) return;
      if (action === 'solscan') {
        openInNewTab(`https://solscan.io/address/${encodeURIComponent(wallet)}`);
      } else {
        openInNewTab(buildPlanUrl(planType, planId));
      }
      closeMenu();
    },
    [wallet, planId, planType, openInNewTab, closeMenu],
  );

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current &&
        menuRef.current &&
        !triggerRef.current.contains(target) &&
        !menuRef.current.contains(target)
      ) {
        closeMenu();
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeMenu();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handleClick, { passive: true });
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, closeMenu]);

  const sizeClasses =
    size === 'sm'
      ? {
          trigger: 'text-[11px] px-2 py-1',
          menuItem: 'px-2 py-1.5 text-xs',
        }
      : {
          trigger: 'text-xs px-2.5 py-1.5',
          menuItem: 'px-3 py-2 text-sm',
        };

  if (!wallet) return null;

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/80 font-mono text-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          sizeClasses.trigger,
        )}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ExternalLink className="h-3 w-3 shrink-0 text-primary" />
        <span>{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          className={cn(
            'absolute z-40 mt-1 min-w-[12rem] rounded-lg border border-border/50 bg-background/95 shadow-lg backdrop-blur-sm',
            menuAlignClass,
          )}
        >
          <button
            type="button"
            onClick={() => handleSelect('solscan')}
            className={cn(
              'flex w-full items-center gap-2 text-left text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none',
              sizeClasses.menuItem,
            )}
            role="menuitem"
          >
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
            <span>View on Solscan</span>
          </button>
          <button
            type="button"
            onClick={() => handleSelect('plan')}
            className={cn(
              'flex w-full items-center gap-2 text-left text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none border-t border-border/40',
              sizeClasses.menuItem,
            )}
            role="menuitem"
          >
            <ExternalLink className="h-3.5 w-3.5 text-primary" />
            <span>{planLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
