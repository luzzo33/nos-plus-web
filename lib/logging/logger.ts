type PrimitiveLogValue = string | number | boolean | null;

type LoggableValue = PrimitiveLogValue | LoggableObject | LoggableValue[] | undefined;

type LoggableObject = {
  [key: string]: LoggableValue;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  payload?: LoggableValue;
};

const MAX_DEPTH = 5;
const MAX_ARRAY_LENGTH = 20;

function isPrimitive(value: unknown): value is PrimitiveLogValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  );
}

function toLoggable(value: unknown, depth = 0): LoggableValue {
  if (depth > MAX_DEPTH) {
    return '[truncated]';
  }

  if (isPrimitive(value) || typeof value === 'undefined') {
    return value;
  }

  if (Array.isArray(value)) {
    return value.slice(0, MAX_ARRAY_LENGTH).map((entry) => toLoggable(entry, depth + 1));
  }

  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  if (typeof value === 'object' && value !== null) {
    const result: LoggableObject = {};
    Object.entries(value).forEach(([key, entry]) => {
      if (typeof entry === 'function' || typeof entry === 'symbol') {
        return;
      }
      result[key] = toLoggable(entry, depth + 1);
    });
    return result;
  }

  return String(value);
}

const LOG_HISTORY_LIMIT = 500;
const logHistory: LogEntry[] = [];

function notifyExternalSink(entry: LogEntry) {
  const globalObject = globalThis as typeof globalThis & {
    __NOS_APP_LOGGER__?: (record: LogEntry) => void;
  };

  const sink = globalObject.__NOS_APP_LOGGER__;
  if (typeof sink === 'function') {
    try {
      sink(entry);
    } catch {
      // Ignore logging sink errors to avoid cascading failures
    }
  }
}

function storeLog(entry: LogEntry) {
  logHistory.push(entry);
  if (logHistory.length > LOG_HISTORY_LIMIT) {
    logHistory.shift();
  }
  notifyExternalSink(entry);
}

function log(level: LogLevel, message: string, context?: LogContext | Error | unknown) {
  const timestamp = new Date().toISOString();
  const payload = typeof context === 'undefined' ? undefined : toLoggable(context);

  storeLog({
    timestamp,
    level,
    message,
    payload,
  });
}

export function logDebug(message: string, context?: LogContext | Error | unknown) {
  log('debug', message, context);
}

export function logInfo(message: string, context?: LogContext | Error | unknown) {
  log('info', message, context);
}

export function logWarn(message: string, context?: LogContext | Error | unknown) {
  log('warn', message, context);
}

export function logError(message: string, context?: LogContext | Error | unknown) {
  log('error', message, context);
}

export function formatLogPayload(context?: LogContext | Error | unknown): LoggableValue {
  return toLoggable(context);
}

export function getLogHistory(): LogEntry[] {
  return [...logHistory];
}

export type { LogEntry };
