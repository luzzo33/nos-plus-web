import { getNosApiBase, buildMonitorAuthHeaders, getMonitorApiKey } from '@/lib/api/monitorConfig';
import { logError } from '@/lib/logging/logger';

export async function nosApiFetch(path: string, options: RequestInit = {}, accessToken?: string) {
  const base = getNosApiBase();
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const url = `${base}${normalizedPath}`;
  const headers = new Headers(options.headers ?? {});
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  } else {
    const defaultAuth = buildMonitorAuthHeaders();
    Object.entries(defaultAuth).forEach(([key, value]) => {
      if (value && !headers.has(key)) {
        headers.set(key, value);
      }
    });

    const apiKey = getMonitorApiKey();
    if (apiKey && !headers.has('x-api-key')) {
      headers.set('x-api-key', apiKey);
    }
  }
  let response: Response;

  try {
    response = await fetch(url, { ...options, headers, cache: 'no-store' });
  } catch (error) {
    logError('[nosApiFetch] Request failed to execute', {
      url,
      method: options.method ?? 'GET',
      cache: options.cache ?? 'no-store',
      error,
    });
    throw error;
  }

  if (!response.ok) {
    const errorBody = await response.json().catch(() => null);
    logError('[nosApiFetch] Non-OK response received', {
      url,
      method: options.method ?? 'GET',
      status: response.status,
      statusText: response.statusText,
      body: errorBody,
    });
    throw new Error(errorBody?.error?.code || `Request failed with status ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    logError('[nosApiFetch] Failed to parse JSON response', {
      url,
      method: options.method ?? 'GET',
      status: response.status,
      error,
    });
    throw error;
  }
}
