'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

function buildContext(error: GlobalErrorProps['error']) {
  const base = {
    message: error?.message ?? 'Unknown error',
    digest: error?.digest,
    name: error?.name,
    stack: error?.stack,
  };

  if (typeof window !== 'undefined') {
    return {
      ...base,
      href: window.location.href,
      pathname: window.location.pathname,
    };
  }

  return base;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  const sentRef = useRef(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    const isDark =
      root.classList.contains('dark') ||
      root.dataset.theme === 'dark' ||
      root.getAttribute('data-theme') === 'dark' ||
      prefersDark;
    setTheme(isDark ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    const payload = JSON.stringify({
      level: 'error',
      message: '[app] Global error boundary triggered',
      context: buildContext(error),
    });

    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      try {
        const blob = new Blob([payload], { type: 'application/json' });
        navigator.sendBeacon('/api/client-logs', blob);
        return;
      } catch {
        // fall through to fetch
      }
    }

    try {
      fetch('/api/client-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // ignore network issues when logging the failure
      });
    } catch {
      // ignore
    }
  }, [error]);

  const isDark = theme === 'dark';
  const themeClass = useMemo(() => (isDark ? 'dark' : ''), [isDark]);
  const bodyClasses = useMemo(
    () =>
      [
        'min-h-screen',
        'flex',
        'items-center',
        'justify-center',
        'p-6',
        'transition-colors',
        isDark ? 'bg-[#0b0f1a] text-slate-100' : 'bg-slate-50 text-slate-900',
      ].join(' '),
    [isDark],
  );

  return (
    <html lang="en" className={themeClass} data-theme={theme}>
      <body className={bodyClasses}>
        <div className="max-w-md space-y-4 text-center rounded-2xl border border-border/60 bg-card/90 p-6 shadow-lg">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              We logged the incident and are looking into it. You can try to reload the last screen.
            </p>
            {error?.digest && (
              <p className="text-xs text-muted-foreground">
                Reference code: <span className="font-mono">{error.digest}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={reset}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow hover:bg-primary/90 transition"
            >
              Try again
            </button>
            <button
              type="button"
              onClick={() => window.location.assign('/')}
              className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground/80 hover:text-foreground transition"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
