type PrimitiveLogValue = string | number | boolean | null;

type LoggableValue = PrimitiveLogValue | LoggableObject | LoggableValue[] | undefined;

type LoggableObject = {
  [key: string]: LoggableValue;
};

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

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

function selectConsoleMethod(level: LogLevel) {
  switch (level) {
    case 'error':
      return console.error;
    case 'warn':
      return console.warn;
    case 'debug':
      return console.debug ?? console.log;
    default:
      return console.info;
  }
}

function log(level: LogLevel, message: string, context?: LogContext | Error | unknown) {
  const timestamp = new Date().toISOString();
  const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
  const writer = selectConsoleMethod(level).bind(console);

  if (typeof context === 'undefined') {
    writer(`${prefix} ${message}`);
    return;
  }

  const payload = toLoggable(context);
  writer(`${prefix} ${message}`, payload);
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
