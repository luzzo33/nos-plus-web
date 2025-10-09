'use server';

import { logError, logInfo } from '@/lib/logging/logger';

const REGISTRY_FLAG = Symbol.for('nos.plus.logging.registered');
type GlobalWithRegistryFlag = typeof globalThis & {
  [REGISTRY_FLAG]?: boolean;
};

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  const globalWithRegistry = globalThis as GlobalWithRegistryFlag;

  if (globalWithRegistry[REGISTRY_FLAG]) {
    return;
  }

  globalWithRegistry[REGISTRY_FLAG] = true;
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
