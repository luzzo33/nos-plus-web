'use client';
import { useEffect, useRef } from 'react';
import { getMonitorApiRoot } from '@/lib/api/monitorConfig';

const SEO_MODE = process.env.NEXT_PUBLIC_SEO_MODE ?? 'beta';
const ENABLE_TRACKING = SEO_MODE === 'live';

function oncePerSession(key: string): boolean {
  try {
    const k = `vt:${key}`;
    if (sessionStorage.getItem(k)) return false;
    sessionStorage.setItem(k, '1');
    return true;
  } catch {
    return true;
  }
}

export function VisitorTracker({ locale }: { locale?: string }) {
  if (!ENABLE_TRACKING) {
    return null;
  }

  const sentRef = useRef(false);
  useEffect(() => {
    if (sentRef.current) return;
    if (!oncePerSession('visit')) return;
    sentRef.current = true;
    const apiRoot = getMonitorApiRoot();
    const url = `${apiRoot}/v3/track/visit`;
    const payload = {
      path: typeof window !== 'undefined' ? window.location.pathname : undefined,
      referrer: typeof document !== 'undefined' ? document.referrer : undefined,
      locale: locale || (typeof navigator !== 'undefined' ? navigator.language : undefined),
    } as Record<string, any>;
    try {
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: 'cors',
      }).catch(() => {});
    } catch {}
  }, [locale]);
  return null;
}
