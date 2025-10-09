#!/usr/bin/env node

const { spawn } = require('node:child_process');
const path = require('node:path');

const nextBin = require.resolve('next/dist/bin/next');

const LIVE_API_BASE = 'https://api.nos.plus';
const MONITOR_BASE = `${LIVE_API_BASE}/v3/monitor`;
const MONITOR_WS = 'wss://api.nos.plus/v3/monitor/ws';
const BALANCES_BASE = `${LIVE_API_BASE}/v3/balances`;
const STATUS_ENDPOINT = `${LIVE_API_BASE}/v3/status`;
const STATUS_URL = `${LIVE_API_BASE}/status`;

const args = process.argv.slice(2);
const nextArgs = ['build'];

let maintenanceOption;

for (let i = 0; i < args.length; i += 1) {
  const arg = args[i];

  if (arg === '--maintenance') {
    const value = args[i + 1];
    if (!value || value.startsWith('--')) {
      process.stderr.write('Expected a value after --maintenance (use on/off/inherit).\n');
      process.exit(1);
    }
    maintenanceOption = value;
    i += 1;
    continue;
  }

  if (arg.startsWith('--maintenance=')) {
    maintenanceOption = arg.slice('--maintenance='.length);
    continue;
  }

  nextArgs.push(arg);
}

function resolveMaintenanceOverride(rawValue) {
  if (rawValue == null) {
    return null;
  }

  const value = rawValue.trim().toLowerCase();

  if (!value.length || value === 'inherit' || value === 'auto' || value === 'default') {
    return null;
  }

  if (value === 'off' || value === '0' || value === 'false' || value === 'no') {
    return 'off';
  }

  if (value === 'on' || value === '1' || value === 'true' || value === 'yes') {
    return 'on';
  }

  process.stderr.write(
    `Invalid value "${rawValue}" for --maintenance. Use on/off or omit to inherit.\n`
  );
  process.exit(1);
}

const resolvedMaintenance = resolveMaintenanceOverride(maintenanceOption);

const overrides = {
  NEXT_PUBLIC_ENV: 'live',
  DIST_DIR: '.next-live',
  NEXT_DIST_DIR: '.next-live',
  NEXT_PUBLIC_NOS_API_BASE: LIVE_API_BASE,
  NOS_API_BASE: LIVE_API_BASE,
  NEXT_PUBLIC_MONITOR_API_BASE: MONITOR_BASE,
  MONITOR_API_BASE: MONITOR_BASE,
  NEXT_PUBLIC_MONITOR_HTTP_BASE: MONITOR_BASE,
  MONITOR_HTTP_BASE: MONITOR_BASE,
  MONITOR_UPSTREAM_BASE: MONITOR_BASE,
  NEXT_PUBLIC_MONITOR_UPSTREAM_BASE: MONITOR_BASE,
  MONITOR_DCA_UPSTREAM_BASE: MONITOR_BASE,
  NEXT_PUBLIC_MONITOR_DCA_UPSTREAM_BASE: MONITOR_BASE,
  NEXT_PUBLIC_MONITOR_WS_URL: MONITOR_WS,
  NOS_PLUS_V3_SERVER: LIVE_API_BASE,
  NOS_BALANCES_BASE: BALANCES_BASE,
  NEXT_PUBLIC_NOS_BALANCES_BASE: BALANCES_BASE,
  NEXT_PUBLIC_BALANCES_BASE_URL: BALANCES_BASE,
  BALANCES_HTTP_BASE: BALANCES_BASE,
  NEXT_PUBLIC_STATUS_ENDPOINT: STATUS_ENDPOINT,
  NOS_STATUS_ENDPOINT: STATUS_ENDPOINT,
  NEXT_PUBLIC_STATUS_URL: STATUS_URL,
  SEO_MODE: 'live',
  NEXT_PUBLIC_SEO_MODE: 'live',
  ...(resolvedMaintenance === 'off'
    ? { MAINTENANCE: '0', NEXT_PUBLIC_MAINTENANCE: '0' }
    : resolvedMaintenance === 'on'
      ? { MAINTENANCE: '1', NEXT_PUBLIC_MAINTENANCE: '1' }
      : {}),
};

const child = spawn(process.execPath, [nextBin, ...nextArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    ...overrides,
  },
  cwd: path.resolve(__dirname, '..'),
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});

child.on('error', (error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
