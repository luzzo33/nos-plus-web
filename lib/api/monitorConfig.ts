const DEFAULT_MONITOR_PATH = '/v3/monitor';
const LOCALHOST_FALLBACK = 'http://localhost:3000';
const DEFAULT_TIMEOUT_MS = 20_000;
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);
const SHOULD_ADAPT_LOOPBACK = (() => {
  const raw = process.env.NEXT_PUBLIC_MONITOR_ADAPT_LOOPBACK;
  if (raw === undefined) return true;
  const normalized = raw.trim().toLowerCase();
  if (!normalized.length) return false;
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
})();

function cleanEnv(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

function stripTrailingSlashes(url: string): string {
  let result = url.trim();
  while (result.endsWith('/')) {
    result = result.slice(0, -1);
  }
  return result;
}

function resolveNosApiRoot(): string {
  const explicit = cleanEnv(
    process.env.NEXT_PUBLIC_NOS_API_BASE ||
      process.env.NOS_API_BASE ||
      process.env.NEXT_PUBLIC_MONITOR_API_BASE ||
      process.env.MONITOR_API_BASE,
  );
  if (explicit) {
    return stripTrailingSlashes(explicit);
  }
  try {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return stripTrailingSlashes(window.location.origin);
    }
  } catch {}
  return stripTrailingSlashes(LOCALHOST_FALLBACK);
}

function adaptLoopbackHost(url: string): string {
  if (!SHOULD_ADAPT_LOOPBACK) {
    return url;
  }
  if (typeof window === 'undefined') {
    return url;
  }
  try {
    const parsed = new URL(url);
    const envIsLoopback = LOOPBACK_HOSTNAMES.has(parsed.hostname.toLowerCase());
    if (!envIsLoopback) {
      return url;
    }

    const runtimeHost = window.location.hostname;
    if (!runtimeHost || LOOPBACK_HOSTNAMES.has(runtimeHost.toLowerCase())) {
      return url;
    }

    const fallback = new URL(resolveDefaultBase());
    fallback.pathname = parsed.pathname;
    fallback.search = parsed.search;
    fallback.hash = parsed.hash;
    return fallback.toString();
  } catch {
    return url;
  }
}

function resolveDefaultBase(): string {
  const serverOverride = cleanEnv(
    process.env.MONITOR_HTTP_BASE || process.env.MONITOR_UPSTREAM_BASE,
  );
  if (serverOverride) return stripTrailingSlashes(serverOverride);
  const root = resolveNosApiRoot();
  return stripTrailingSlashes(`${root}${DEFAULT_MONITOR_PATH}`);
}

export function getMonitorApiBase(): string {
  const envBase = cleanEnv(
    process.env.NEXT_PUBLIC_MONITOR_HTTP_BASE || process.env.NEXT_PUBLIC_MONITOR_BASE_URL,
  );
  const base = envBase || resolveDefaultBase();
  let cleaned = stripTrailingSlashes(base);
  cleaned = adaptLoopbackHost(cleaned);
  return stripTrailingSlashes(cleaned);
}

export function getMonitorApiRoot(): string {
  const base = getMonitorApiBase();
  if (base.endsWith('/v3/monitor')) {
    return stripTrailingSlashes(base.slice(0, -'/v3/monitor'.length));
  }
  return stripTrailingSlashes(base);
}

export function getMonitorWsUrl(): string {
  const envWs = process.env.NEXT_PUBLIC_MONITOR_WS_URL;
  if (envWs && envWs.length) {
    const adapted = adaptLoopbackHost(envWs);
    return stripTrailingSlashes(adapted);
  }
  const base = getMonitorApiBase();
  try {
    const url = new URL(base);
    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
    url.pathname = `${url.pathname.replace(/\/$/, '')}/ws`;
    return url.toString();
  } catch {
    return `${base.replace(/^http/, 'ws')}/ws`;
  }
}

export function getMonitorApiKey(): string | null {
  const envKey = cleanEnv(
    process.env.NEXT_PUBLIC_MONITOR_API_KEY ||
      process.env.NEXT_PUBLIC_MONITOR_TOKEN ||
      process.env.NEXT_PUBLIC_NOS_API_KEY ||
      process.env.NOS_API_KEY,
  );
  return envKey || null;
}

export function getMonitorTimeout(): number {
  const raw = Number(process.env.NEXT_PUBLIC_MONITOR_TIMEOUT_MS);
  if (Number.isFinite(raw) && raw > 0) return raw;
  return DEFAULT_TIMEOUT_MS;
}

export function buildMonitorAuthHeaders(): Record<string, string> {
  const key = getMonitorApiKey();
  if (!key) return {};
  return {
    Authorization: `Bearer ${key}`,
  };
}

export function getNosApiBase(): string {
  return getMonitorApiRoot();
}

export function buildNosApiUrl(path: string): string {
  const base = getNosApiBase();
  const trimmed = path.trim();
  if (!trimmed.length) return base;
  const normalized = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${base}${normalized}`;
}
