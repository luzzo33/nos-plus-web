'use client';

import { useEffect, useRef } from 'react';

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

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    const payload = {
      level: 'error',
      message: '[app] Global error boundary triggered',
      context: buildContext(error),
    };

    try {
      fetch('/api/client-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      }).catch(() => {
        // ignore network issues when logging the failure
      });
    } catch {
      // ignore
    }
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
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
