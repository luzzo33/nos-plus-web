import { logError } from '@/lib/logging/logger';

const REGISTRATION_FLAG = Symbol.for('nos-plus.instrumentation');

export async function register() {
  const globalScope = globalThis as Record<symbol, unknown>;

  if (globalScope[REGISTRATION_FLAG]) {
    return;
  }

  globalScope[REGISTRATION_FLAG] = true;

  if (typeof process === 'undefined' || typeof process.on !== 'function') {
    return;
  }

  process.on('uncaughtException', (error) => {
    logError('[instrumentation] Uncaught exception', { error });
  });

  process.on('unhandledRejection', (reason) => {
    logError('[instrumentation] Unhandled promise rejection', { reason });
  });
}
