'use client';

import { useEffect } from 'react';
import { logError, logWarn } from '@/lib/logging/logger';

type ClientLogLevel = 'info' | 'warn' | 'error';

interface ClientLogPayload {
  level: ClientLogLevel;
  message: string;
  context?: Record<string, unknown>;
}

const LOG_ENDPOINT = '/api/client-logs';
const MAX_MESSAGE_LENGTH = 2000;
const MAX_STACK_LENGTH = 5000;
const seenFingerprints = new Set<string>();

function buildFingerprint(message: string, stack?: string | null) {
  const trimmedMessage = message.slice(0, MAX_MESSAGE_LENGTH);
  const trimmedStack = (stack ?? '').slice(0, MAX_STACK_LENGTH);
  return `${trimmedMessage}::${trimmedStack}`;
}

function sanitizeContext(context: Record<string, unknown>) {
  const result: Record<string, unknown> = {};
  Object.entries(context).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result[key] = value.slice(0, MAX_STACK_LENGTH);
      return;
    }
    if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
      result[key] = value;
      return;
    }
    if (value instanceof Error) {
      result[key] = {
        name: value.name,
        message: value.message,
        stack: value.stack?.slice(0, MAX_STACK_LENGTH),
      };
      return;
    }
    if (typeof value === 'object' && value !== null) {
      try {
        result[key] = JSON.parse(
          JSON.stringify(value, (_, v) => {
            if (typeof v === 'string') {
              return v.slice(0, MAX_STACK_LENGTH);
            }
            return v;
          }),
        );
      } catch {
        result[key] = '[unserializable-object]';
      }
      return;
    }
    result[key] = String(value);
  });
  return result;
}

function reportToServer(payload: ClientLogPayload) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    try {
      const blob = new Blob([body], { type: 'application/json' });
      if (navigator.sendBeacon(LOG_ENDPOINT, blob)) {
        return;
      }
    } catch (error) {
      logWarn('[ClientErrorReporter] Failed to send beacon for client error', { error });
    }
  }

  if (typeof fetch === 'function') {
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch((error) => {
      logWarn('[ClientErrorReporter] Failed to send client error via fetch', { error });
    });
  }
}

function report(level: ClientLogLevel, message: string, context: Record<string, unknown>) {
  const sanitizedMessage = message.slice(0, MAX_MESSAGE_LENGTH);
  const sanitizedContext = sanitizeContext(context);
  const fingerprint = buildFingerprint(
    sanitizedMessage,
    typeof sanitizedContext.stack === 'string' ? sanitizedContext.stack : undefined,
  );

  if (seenFingerprints.has(fingerprint)) {
    return;
  }

  if (seenFingerprints.size >= 1000) {
    seenFingerprints.clear();
  }
  seenFingerprints.add(fingerprint);

  reportToServer({
    level,
    message: sanitizedMessage,
    context: sanitizedContext,
  });
}

export default function ClientErrorReporter() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      return undefined;
    }

    const handleError = (event: ErrorEvent) => {
      const stack = event.error?.stack ?? null;
      const context = {
        stack,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        message: event.error?.message ?? event.message,
        type: event.type,
      };

      logError('[ClientErrorReporter] Uncaught error captured', context);
      report('error', event.message ?? 'Client error', context);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const message =
        reason instanceof Error
          ? reason.message
          : typeof reason === 'string'
            ? reason
            : 'Unhandled promise rejection';
      const stack = reason instanceof Error ? (reason.stack ?? null) : null;

      const context = {
        message,
        stack,
        type: event.type,
        handled: event.defaultPrevented,
      };

      logError('[ClientErrorReporter] Unhandled promise rejection captured', {
        ...context,
        reason,
      });
      report('error', message, {
        ...context,
        reason: reason instanceof Error ? undefined : reason,
      });
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
