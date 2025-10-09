'use client';

import React from 'react';
import { useState, useCallback, useMemo } from 'react';
import { Share2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type PlanType = 'dca' | 'limit';

interface PlanShareButtonProps {
  planId: string;
  planType: PlanType;
  className?: string;
  size?: 'sm' | 'md';
  label?: string;
}

function buildShareUrl(planType: PlanType, planId: string): string {
  if (typeof window === 'undefined') return '';
  const url = new URL(window.location.href);
  url.searchParams.set('plan', `${planType}:${planId}`);
  url.searchParams.set('captured', new Date().toISOString());
  return url.toString();
}

export function PlanShareButton({
  planId,
  planType,
  className,
  size = 'sm',
  label = 'Share',
}: PlanShareButtonProps) {
  const [copied, setCopied] = useState(false);
  const shareLabel = copied ? 'Copied' : label;
  const iconSize = size === 'sm' ? 14 : 16;

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(planType, planId);
    if (!url) return;
    try {
      if (typeof navigator !== 'undefined' && 'share' in navigator) {
        await (navigator as any).share({ url });
        return;
      }
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  }, [planId, planType]);

  const buttonClasses = useMemo(
    () =>
      cn(
        'inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/70 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-border hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        size === 'md' && 'px-3 py-1.5 text-sm',
        copied && 'border-primary/60 text-primary',
        className,
      ),
    [className, copied, size],
  );

  return (
    <button type="button" onClick={handleShare} className={buttonClasses} title={shareLabel}>
      {copied ? (
        <Check className="shrink-0" size={iconSize} />
      ) : (
        <Share2 className="shrink-0" size={iconSize} />
      )}
      <span>{shareLabel}</span>
    </button>
  );
}
