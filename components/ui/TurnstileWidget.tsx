'use client';

import { useEffect, useRef } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        element: HTMLElement,
        options: {
          sitekey: string;
          callback?: (token: string) => void;
          'error-callback'?: () => void;
          'expired-callback'?: () => void;
        },
      ) => string;
      reset?: (widgetId?: string) => void;
    };
  }
}

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
  onExpire?: () => void;
  resetSignal?: number;
  className?: string;
}

function loadScript() {
  if (document.getElementById('turnstile-script')) return;
  const script = document.createElement('script');
  script.id = 'turnstile-script';
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

export function TurnstileWidget({
  onVerify,
  onError,
  onExpire,
  resetSignal,
  className,
}: TurnstileWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);
  const verifyRef = useRef(onVerify);
  const errorRef = useRef(onError);
  const expireRef = useRef(onExpire);
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

  useEffect(() => {
    verifyRef.current = onVerify;
  }, [onVerify]);

  useEffect(() => {
    errorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    expireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    loadScript();
  }, []);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;

    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !containerRef.current || !window.turnstile || widgetIdRef.current) {
        return;
      }
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: (token) => {
          verifyRef.current?.(token);
        },
        'error-callback': () => {
          errorRef.current?.();
        },
        'expired-callback': () => {
          expireRef.current?.();
        },
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if (window.turnstile && !cancelled) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [siteKey]);

  useEffect(() => {
    if (resetSignal === undefined) return;
    if (!widgetIdRef.current) return;
    window.turnstile?.reset?.(widgetIdRef.current);
  }, [resetSignal]);

  useEffect(
    () => () => {
      widgetIdRef.current = null;
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    },
    [],
  );

  if (!siteKey) {
    return (
      <div className={className}>Missing NEXT_PUBLIC_TURNSTILE_SITE_KEY environment variable.</div>
    );
  }

  return <div ref={containerRef} className={className} />;
}
