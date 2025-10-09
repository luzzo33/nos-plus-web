'use client';

import React, { useEffect, useState } from 'react';
import { DCASection } from '@/components/monitor/DCASection';
import { LOSection } from '@/components/monitor/LOSection';

interface PlansSectionProps {
  variant?: 'full' | 'spotlight';
  maxRows?: number;
}

type ActivePlan = 'dca' | 'limit';

const DEFAULT_PLAN_WIDGET_HEIGHT = 600;

function resolveInitial(): ActivePlan {
  if (typeof window === 'undefined') return 'dca';
  const stored = window.localStorage.getItem('monitor:planType');
  return stored === 'limit' ? 'limit' : 'dca';
}

export function PlansSection({ variant = 'full', maxRows }: PlansSectionProps) {
  const [active, setActive] = useState<ActivePlan>(() => resolveInitial());

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('monitor:planType', active);
    }
  }, [active]);

  const planTypeControl = {
    value: active,
    onChange: (next: ActivePlan) => setActive(next),
  } as const;

  const [syncedHeight, setSyncedHeight] = useState<number | undefined>(() =>
    variant === 'full' ? DEFAULT_PLAN_WIDGET_HEIGHT : undefined,
  );

  useEffect(() => {
    const shouldSyncHeight = variant === 'full';
    if (typeof window === 'undefined') {
      return;
    }

    if (!shouldSyncHeight) {
      setSyncedHeight(undefined);
      return;
    }

    if (!('ResizeObserver' in window)) {
      setSyncedHeight(DEFAULT_PLAN_WIDGET_HEIGHT);
      return;
    }

    let rafId: number | null = null;
    let observer: ResizeObserver | null = null;
    let targetEl: HTMLElement | null = null;

    const updateHeight = (value: number | null | undefined) => {
      if (value == null || !Number.isFinite(value) || value <= 0) return;
      const rounded = Math.round(value);
      setSyncedHeight((prev) => (prev == null || Math.abs(prev - rounded) >= 1 ? rounded : prev));
    };

    const ResizeObserverCtor = window.ResizeObserver;

    const attach = (el: HTMLElement) => {
      targetEl = el;
      updateHeight(el.getBoundingClientRect().height);

      observer = new ResizeObserverCtor((entries) => {
        entries.forEach((entry) => {
          if (entry.target !== el) return;
          const boxSize = Array.isArray(entry.borderBoxSize)
            ? entry.borderBoxSize[0]
            : entry.borderBoxSize;
          const next = boxSize?.blockSize ?? entry.contentRect.height;
          updateHeight(next);
        });
      });

      observer.observe(el);
    };

    const findElement = () => {
      const el = document.querySelector<HTMLElement>('[data-monitor-widget="order-book"]');
      if (el) {
        attach(el);
      } else {
        rafId = window.requestAnimationFrame(findElement);
      }
    };

    rafId = window.requestAnimationFrame(findElement);

    return () => {
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
      }
      if (observer && targetEl) {
        observer.unobserve(targetEl);
      }
      observer?.disconnect();
    };
  }, [variant]);

  const sectionHeight =
    variant === 'full' ? (syncedHeight ?? DEFAULT_PLAN_WIDGET_HEIGHT) : undefined;

  return active === 'dca' ? (
    <DCASection
      variant={variant}
      maxRows={maxRows}
      planTypeControl={planTypeControl}
      height={sectionHeight}
    />
  ) : (
    <LOSection variant={variant} planTypeControl={planTypeControl} height={sectionHeight} />
  );
}
