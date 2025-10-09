'use server';

import { logError, logInfo } from '@/lib/logging/logger';

const REGISTRY_FLAG = Symbol.for('nos.plus.logging.registered');

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  if ((globalThis as any)[REGISTRY_FLAG]) {
    return;
  }

  (globalThis as any)[REGISTRY_FLAG] = true;
  logInfo('[runtime] instrumentation registered');

  process.on('uncaughtException', (error) => {
    logError('[runtime] Uncaught exception', error);
  });

  process.on('unhandledRejection', (reason) => {
    logError('[runtime] Unhandled rejection', reason);
  });

  process.on('warning', (warning) => {
    logError('[runtime] Process warning', warning);
  });
}
