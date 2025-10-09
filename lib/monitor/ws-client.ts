'use client';

import {
  buildMonitorAuthHeaders,
  getMonitorApiBase,
  getMonitorApiKey,
  getMonitorWsUrl,
} from '@/lib/api/monitorConfig';
import type {
  MonitorWsChannel,
  MonitorWsClientMessage,
  MonitorWsServerMessage,
} from '@/lib/monitor/ws-types';

export interface SubscriptionListener<TSnapshot = unknown, TUpdate = unknown> {
  onSnapshot?: (payload: TSnapshot) => void;
  onUpdate?: (payload: TUpdate) => void;
  onEvent?: (payload: unknown) => void;
  onError?: (error: { code: string; message: string }) => void;
}

interface PendingSubscription {
  channel: MonitorWsChannel;
  params: Record<string, unknown>;
  listener: SubscriptionListener;
  resolve: (subscriptionId: string) => void;
  reject: (error: Error) => void;
}

interface ActiveSubscription {
  channel: MonitorWsChannel;
  params: Record<string, unknown>;
  listener: SubscriptionListener;
}

interface PendingRequest {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
}

function createId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

class MonitorWebSocketClient {
  private socket: WebSocket | null = null;
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private heartbeatMs = 15000;
  private heartbeatTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pendingSubscribes = new Map<string, PendingSubscription>();
  private subscriptions = new Map<string, ActiveSubscription>();
  private pendingRequests = new Map<string, PendingRequest>();
  private reconnectAttempts = 0;
  private manualClose = false;
  private sessionPromise: Promise<{ token: string; expiresAt: number }> | null = null;
  private connectPromise: Promise<void> | null = null;
  private authFailed = false;

  subscribe(
    channel: MonitorWsChannel,
    params: Record<string, unknown>,
    listener: SubscriptionListener,
  ) {
    if (this.authFailed) {
      const error = new Error('monitor_ws_unauthorized');
      queueMicrotask(() => {
        listener.onError?.({ code: 'unauthorized', message: error.message });
      });
      const rejected = Promise.reject<string>(error);
      rejected.catch(() => {});
      return {
        ready: rejected,
        unsubscribe: async () => {},
        request: async () => {
          throw error;
        },
      };
    }

    const requestId = createId();
    const readyPromise = new Promise<string>((resolve, reject) => {
      this.pendingSubscribes.set(requestId, { channel, params, listener, resolve, reject });
    });
    this.ensureConnection();
    this.sendMessage({ type: 'subscribe', requestId, channel, params });

    const unsubscribe = async () => {
      try {
        const subscriptionId = await readyPromise.catch(() => null);
        if (!subscriptionId) return;
        this.sendMessage({ type: 'unsubscribe', subscriptionId });
        this.subscriptions.delete(subscriptionId);
      } catch {}
    };

    return {
      ready: readyPromise,
      unsubscribe,
      request: <T = unknown>(action: string, payload?: Record<string, unknown>): Promise<T> => {
        return readyPromise.then((subscriptionId) =>
          this.request<T>(channel, action, payload, subscriptionId),
        );
      },
    };
  }

  request<T = unknown>(
    channel: MonitorWsChannel,
    action: string,
    payload?: Record<string, unknown>,
    subscriptionId?: string,
  ): Promise<T> {
    if (this.authFailed) {
      return Promise.reject(new Error('monitor_ws_unauthorized'));
    }
    return new Promise<T>((resolve, reject) => {
      const requestId = createId();
      this.pendingRequests.set(requestId, {
        resolve: (data) => resolve(data as T),
        reject,
      });
      this.ensureConnection();
      this.sendMessage({
        type: 'request',
        requestId,
        channel,
        action,
        params: { ...payload, subscriptionId },
      });
    });
  }

  close() {
    this.manualClose = true;
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.heartbeatTimer = null;
    this.reconnectTimer = null;
    this.connectPromise = null;
    this.sessionPromise = null;
    this.authFailed = false;
    try {
      this.socket?.close();
    } catch {}
    this.socket = null;
    this.status = 'disconnected';
  }

  private ensureConnection() {
    if (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') {
      return;
    }
    if (this.manualClose) {
      this.manualClose = false;
    }
    if (this.status === 'connected' || this.connectPromise || this.authFailed) return;
    this.connectPromise = this.openSocket().finally(() => {
      this.connectPromise = null;
    });
  }

  private async openSocket(): Promise<void> {
    if (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') {
      return;
    }
    if (this.authFailed) return;

    let sessionToken: string | null = null;
    if (!this.authFailed) {
      try {
        const session = await this.ensureSessionToken();
        sessionToken = session?.token ?? null;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (this.authFailed || message === 'monitor_api_key_missing') {
          this.status = 'disconnected';
          this.socket = null;
          return;
        }
      }
    }

    try {
      const base = getMonitorWsUrl();
      const url = new URL(base);
      if (sessionToken) url.searchParams.set('session', sessionToken);
      const apiKey = getMonitorApiKey();
      if (apiKey) {
        url.searchParams.set('token', apiKey);
      }

      this.status = 'connecting';
      const WsImpl = window.WebSocket;
      this.socket = new WsImpl(url.toString());
      this.socket.addEventListener('open', () => {
        this.status = 'connected';
        this.reconnectAttempts = 0;
        this.flushPendingSubscribes();
        this.resubscribe();
      });
      this.socket.addEventListener('message', (event) => this.handleMessage(event.data));
      this.socket.addEventListener('close', () => this.handleClose());
      this.socket.addEventListener('error', () => this.handleClose());
    } catch {
      this.status = 'disconnected';
      this.socket = null;
      if (this.authFailed) return;
      this.scheduleReconnect();
    }
  }

  private handleMessage(raw: unknown) {
    let message: MonitorWsServerMessage | null = null;
    if (typeof raw === 'string') {
      try {
        message = JSON.parse(raw) as MonitorWsServerMessage;
      } catch {
        message = null;
      }
    } else if (raw instanceof ArrayBuffer) {
      try {
        message = JSON.parse(new TextDecoder().decode(raw)) as MonitorWsServerMessage;
      } catch {
        message = null;
      }
    } else if (typeof Blob !== 'undefined' && raw instanceof Blob) {
      raw
        .text()
        .then((text) => {
          try {
            const parsed = JSON.parse(text) as MonitorWsServerMessage;
            this.handleMessage(parsed);
          } catch {}
        })
        .catch(() => {});
      return;
    } else if (raw && typeof raw === 'object') {
      const candidate = raw as Partial<MonitorWsServerMessage>;
      if (typeof candidate.type === 'string') {
        message = candidate as MonitorWsServerMessage;
      }
    }
    if (!message) return;

    switch (message.type) {
      case 'hello':
        if (process.env.NODE_ENV !== 'production' && message.sessionId) {
        }
        this.heartbeatMs = message.heartbeatMs ?? 15000;
        this.scheduleHeartbeat();
        break;
      case 'error':
        if (message.requestId && this.pendingRequests.has(message.requestId)) {
          const pending = this.pendingRequests.get(message.requestId)!;
          this.pendingRequests.delete(message.requestId);
          pending.reject(new Error(message.message || 'request_error'));
        } else if (message.requestId && this.pendingSubscribes.has(message.requestId)) {
          const pending = this.pendingSubscribes.get(message.requestId)!;
          this.pendingSubscribes.delete(message.requestId);
          pending.reject(new Error(message.message || 'subscribe_error'));
        } else if (message.subscriptionId) {
          const sub = this.subscriptions.get(message.subscriptionId);
          sub?.listener.onError?.({ code: message.code, message: message.message });
        }
        break;
      case 'subscribed':
        if (message.requestId && this.pendingSubscribes.has(message.requestId)) {
          const pending = this.pendingSubscribes.get(message.requestId)!;
          this.pendingSubscribes.delete(message.requestId);
          this.subscriptions.set(message.subscriptionId, {
            channel: pending.channel,
            params: pending.params,
            listener: pending.listener,
          });
          pending.resolve(message.subscriptionId);
        }
        break;
      case 'unsubscribed':
        this.subscriptions.delete(message.subscriptionId);
        break;
      case 'snapshot':
        this.subscriptions.get(message.subscriptionId)?.listener.onSnapshot?.(message.data);
        break;
      case 'update':
        this.subscriptions.get(message.subscriptionId)?.listener.onUpdate?.(message.data);
        break;
      case 'event':
        this.subscriptions.get(message.subscriptionId)?.listener.onEvent?.(message.data);
        break;
      case 'response':
        if (this.pendingRequests.has(message.requestId)) {
          const pending = this.pendingRequests.get(message.requestId)!;
          this.pendingRequests.delete(message.requestId);
          pending.resolve(message.data);
        }
        break;
      case 'pong':
        this.scheduleHeartbeat();
        break;
    }
  }

  private flushPendingSubscribes() {
    for (const [requestId] of this.pendingSubscribes) {
      const entry = this.pendingSubscribes.get(requestId);
      if (!entry) continue;
      this.sendMessage({
        type: 'subscribe',
        requestId,
        channel: entry.channel,
        params: entry.params,
      });
    }
  }

  private resubscribe() {
    const existing = Array.from(this.subscriptions.entries());
    this.subscriptions.clear();
    for (const [, sub] of existing) {
      const requestId = createId();
      this.pendingSubscribes.set(requestId, {
        channel: sub.channel,
        params: sub.params,
        listener: sub.listener,
        resolve: (subscriptionId) => {
          this.subscriptions.set(subscriptionId, {
            channel: sub.channel,
            params: sub.params,
            listener: sub.listener,
          });
        },
        reject: () => {},
      });
      this.sendMessage({ type: 'subscribe', requestId, channel: sub.channel, params: sub.params });
    }
  }

  private async ensureSessionToken(): Promise<{ token: string; expiresAt: number }> {
    if (!this.sessionPromise) {
      this.sessionPromise = this.fetchSessionToken().finally(() => {
        this.sessionPromise = null;
      });
    }
    return this.sessionPromise;
  }

  private async fetchSessionToken(): Promise<{ token: string; expiresAt: number }> {
    const apiKey = getMonitorApiKey();
    if (!apiKey) {
      this.authFailed = true;
      throw new Error('monitor_api_key_missing');
    }

    const headers: Record<string, string> = {
      ...buildMonitorAuthHeaders(),
      'x-api-key': apiKey,
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${getMonitorApiBase()}/ws/session`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ ttlMs: 60_000 }),
      cache: 'no-store',
      credentials: 'omit',
    });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        this.authFailed = true;
        this.rejectPendingAuth(new Error('monitor_ws_unauthorized'));
      }
      throw new Error(`monitor_ws_session_${response.status}`);
    }

    this.authFailed = false;

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const root = payload && typeof payload === 'object' ? (payload as Record<string, unknown>) : {};
    const dataRaw = root.data;
    const container =
      dataRaw && typeof dataRaw === 'object' ? (dataRaw as Record<string, unknown>) : root;
    const tokenValue = container.token;
    const expiresAtValue = container.expiresAt;
    const token = typeof tokenValue === 'string' ? tokenValue : null;
    const expiresAt =
      typeof expiresAtValue === 'number' && Number.isFinite(expiresAtValue)
        ? expiresAtValue
        : Date.now() + 60_000;

    if (!token) {
      throw new Error('monitor_ws_session_invalid');
    }

    return { token, expiresAt };
  }

  private rejectPendingAuth(error: Error) {
    const pendingSubs = Array.from(this.pendingSubscribes.values());
    this.pendingSubscribes.clear();
    for (const pending of pendingSubs) {
      try {
        pending.reject(error);
      } catch {}
    }

    const pendingReqs = Array.from(this.pendingRequests.values());
    this.pendingRequests.clear();
    for (const pending of pendingReqs) {
      try {
        pending.reject(error);
      } catch {}
    }

    for (const sub of this.subscriptions.values()) {
      try {
        sub.listener.onError?.({ code: 'unauthorized', message: error.message });
      } catch {}
    }
    this.subscriptions.clear();
  }

  private handleClose() {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.status = 'disconnected';
    this.socket = null;
    if (this.manualClose) return;
    this.scheduleReconnect();
  }

  private scheduleHeartbeat() {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = setTimeout(() => {
      this.sendMessage({ type: 'ping', timestamp: Date.now() });
      this.scheduleHeartbeat();
    }, this.heartbeatMs);
  }

  private scheduleReconnect() {
    if (this.manualClose || this.authFailed) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const delay = Math.min(30000, 1000 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.ensureConnection();
    }, delay);
  }

  private sendMessage(message: MonitorWsClientMessage) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      try {
        this.socket.send(JSON.stringify(message));
      } catch {}
    } else if (message.type === 'subscribe') {
      this.ensureConnection();
    }
  }
}

export const monitorWsClient = new MonitorWebSocketClient();
