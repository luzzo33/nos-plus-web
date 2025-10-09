'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils';
import { truncateAddress } from '@/components/monitor/WalletActionMenu';

interface PlanIdentifierMenuProps {
  planId: string;
  className?: string;
  triggerClassName?: string;
}

export function PlanIdentifierMenu({
  planId,
  className,
  triggerClassName,
}: PlanIdentifierMenuProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [placement, setPlacement] = useState<'left' | 'right'>('right');

  const label = useMemo(() => truncateAddress(planId, 4, 4), [planId]);

  const closeMenu = useCallback(() => setOpen(false), []);

  const openInNewTab = useCallback((url: string) => {
    try {
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch {
      window.location.href = url;
    }
  }, []);

  const handleOpenSolscan = useCallback(() => {
    if (!planId) return;
    openInNewTab(`https://solscan.io/address/${encodeURIComponent(planId)}`);
    closeMenu();
  }, [planId, openInNewTab, closeMenu]);

  useEffect(() => {
    if (!open) return;

    const handlePointer = (event: MouseEvent) => {
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

    document.addEventListener('mousedown', handlePointer, { passive: true });
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointer);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open, closeMenu]);

  useEffect(() => {
    if (!open) {
      setPlacement('right');
      return;
    }

    const adjustPlacement = () => {
      const menu = menuRef.current;
      if (!menu) return;
      const rect = menu.getBoundingClientRect();
      setPlacement((current) => {
        if (rect.left < 8) return 'left';
        if (rect.right > window.innerWidth - 8) return 'right';
        return current;
      });
    };

    const raf = requestAnimationFrame(adjustPlacement);
    window.addEventListener('resize', adjustPlacement);
    window.addEventListener('scroll', adjustPlacement, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', adjustPlacement);
      window.removeEventListener('scroll', adjustPlacement, true);
    };
  }, [open]);

  if (!planId) return null;

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        ref={triggerRef}
        type='button'
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
          triggerClassName,
        )}
        aria-haspopup='menu'
        aria-expanded={open}
      >
        <span className='font-mono'>{label}</span>
        <ExternalLink className='h-3 w-3 shrink-0' />
      </button>
      {open && (
        <div
          ref={menuRef}
          role='menu'
          className={cn(
            'absolute top-full z-40 mt-1 min-w-[11rem] rounded-lg border border-border/50 bg-background/95 p-1 shadow-lg backdrop-blur-sm',
            placement === 'left' ? 'left-0 right-auto' : 'right-0 left-auto',
          )}
        >
          <button
            type='button'
            role='menuitem'
            onClick={handleOpenSolscan}
            className='flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/60 focus:bg-muted/60 focus:outline-none'
          >
            <ExternalLink className='h-3.5 w-3.5 text-primary' />
            <span>View on Solscan</span>
          </button>
        </div>
      )}
    </div>
  );
}
