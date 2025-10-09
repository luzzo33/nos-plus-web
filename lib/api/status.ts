import { buildNosApiUrl } from './monitorConfig';

function clean(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}

export function getStatusEndpoint(): string {
  const env =
    clean(process.env.NEXT_PUBLIC_STATUS_ENDPOINT) ||
    clean(process.env.NEXT_PUBLIC_STATUS_URL) ||
    clean(process.env.NOS_STATUS_ENDPOINT);
  return env ?? buildNosApiUrl('/v3/status');
}

export type StatusEventType = 'deployment' | 'incident' | 'recovery' | string;

export interface StatusEvent {
  id: string;
  timestamp: string;
  type: StatusEventType;
  status: string;
  metadata?: Record<string, unknown> | null;
}

export interface StatusLimits {
  [key: string]: number;
}

export interface StatusLimitWindow {
  id: string;
  windowMs: number;
  max: number;
  label?: string;
  description?: string;
}

export interface StatusLimitProfile {
  id: string;
  scope?: string;
  label?: string;
  description?: string;
  metadata?: Record<string, unknown> | null;
  windows: StatusLimitWindow[];
}

export interface StatusResponse {
  service: string;
  environment: string;
  status: string;
  version: string;
  uptimeSeconds: number;
  startedAt: string;
  timestamp: string;
  limits: StatusLimits;
  limitProfiles: StatusLimitProfile[];
  events: StatusEvent[];
}

interface RawStatusResponse {
  service?: string;
  environment?: string;
  status?: string;
  version?: string;
  uptimeSeconds?: number;
  startedAt?: string;
  timestamp?: string;
  limits?: Record<string, unknown> | null;
  limitProfiles?: unknown;
  events?: unknown;
}

function generateEventId(provided?: unknown): string {
  if (typeof provided === 'string' && provided.length) {
    return provided;
  }
  const globalCrypto =
    typeof globalThis !== 'undefined' && 'crypto' in globalThis
      ? (globalThis as { crypto?: Crypto }).crypto
      : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === 'function') {
    return globalCrypto.randomUUID();
  }
  return `evt-${Math.random().toString(36).slice(2, 10)}`;
}

function normaliseLimits(raw: RawStatusResponse['limits']): StatusLimits {
  if (!raw || typeof raw !== 'object') return {};
  const entries = Object.entries(raw).flatMap(([key, value]) => {
    const num = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(num) ? [[key, num] as const] : [];
  });
  return Object.fromEntries(entries);
}

function normaliseEvents(rawEvents: RawStatusResponse['events']): StatusEvent[] {
  if (!Array.isArray(rawEvents)) return [];
  return rawEvents
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const evt = item as Record<string, unknown>;
      const id = generateEventId(evt.id);
      const timestamp =
        typeof evt.timestamp === 'string' ? evt.timestamp : new Date().toISOString();
      const type = typeof evt.type === 'string' ? evt.type : 'unknown';
      const status = typeof evt.status === 'string' ? evt.status : 'unknown';
      const metadata =
        typeof evt.metadata === 'object' && evt.metadata !== null
          ? (evt.metadata as Record<string, unknown>)
          : undefined;
      return { id, timestamp, type, status, metadata } satisfies StatusEvent;
    })
    .filter((event): event is StatusEvent => Boolean(event));
}

function normaliseLimitProfiles(
  rawProfiles: RawStatusResponse['limitProfiles'],
): StatusLimitProfile[] {
  if (!Array.isArray(rawProfiles)) return [];
  return rawProfiles
    .map((entry, profileIndex) => {
      if (!entry || typeof entry !== 'object') return null;
      const profile = entry as Record<string, unknown>;
      const rawWindows = Array.isArray(profile.windows) ? (profile.windows as unknown[]) : [];
      const windows = rawWindows
        .map((win, idx) => {
          if (!win || typeof win !== 'object') return null;
          const window = win as Record<string, unknown>;
          const rawWindowMs =
            typeof window.windowMs === 'number' ? window.windowMs : Number(window.windowMs);
          const rawMax = typeof window.max === 'number' ? window.max : Number(window.max);
          if (!Number.isFinite(rawWindowMs) || !Number.isFinite(rawMax)) return null;
          const id =
            typeof window.id === 'string' && window.id.length
              ? window.id
              : `window-${profileIndex}-${idx}`;
          const label = typeof window.label === 'string' ? window.label : undefined;
          const description =
            typeof window.description === 'string' ? window.description : undefined;
          return {
            id,
            windowMs: rawWindowMs,
            max: rawMax,
            label,
            description,
          } satisfies StatusLimitWindow;
        })
        .filter((win): win is StatusLimitWindow => Boolean(win));

      if (!windows.length) return null;

      const metadata =
        profile.metadata && typeof profile.metadata === 'object' && !Array.isArray(profile.metadata)
          ? (profile.metadata as Record<string, unknown>)
          : undefined;

      const id =
        typeof profile.id === 'string' && profile.id.length
          ? profile.id
          : generateEventId(`profile-${profileIndex}`);

      return {
        id,
        scope: typeof profile.scope === 'string' ? profile.scope : undefined,
        label: typeof profile.label === 'string' ? profile.label : undefined,
        description: typeof profile.description === 'string' ? profile.description : undefined,
        metadata: metadata ?? null,
        windows,
      } satisfies StatusLimitProfile;
    })
    .filter((profile): profile is StatusLimitProfile => Boolean(profile));
}

export function normaliseStatusResponse(raw: RawStatusResponse): StatusResponse {
  const nowIso = new Date().toISOString();
  return {
    service: raw.service ?? 'unknown',
    environment: raw.environment ?? 'unknown',
    status: raw.status ?? 'unknown',
    version: raw.version ?? 'unknown',
    uptimeSeconds:
      typeof raw.uptimeSeconds === 'number' && Number.isFinite(raw.uptimeSeconds)
        ? raw.uptimeSeconds
        : 0,
    startedAt: raw.startedAt ?? nowIso,
    timestamp: raw.timestamp ?? nowIso,
    limits: normaliseLimits(raw.limits),
    limitProfiles: normaliseLimitProfiles(raw.limitProfiles),
    events: normaliseEvents(raw.events),
  };
}

export async function fetchStatus(signal?: AbortSignal): Promise<StatusResponse> {
  const endpoint = getStatusEndpoint();
  const res = await fetch(endpoint, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
    },
    cache: 'no-store',
    signal,
  });

  if (!res.ok) {
    const message = `Status request failed with ${res.status}`;
    throw new Error(message);
  }

  const json = (await res.json()) as RawStatusResponse;
  return normaliseStatusResponse(json ?? {});
}
