export type MonitorWsChannel =
  | 'monitor.events'
  | 'monitor.stats'
  | 'monitor.metrics'
  | 'monitor.limitWall'
  | 'monitor.orderBookChart'
  | 'monitor.dcaPlans'
  | 'monitor.limitPlans'
  | 'monitor.dashboard';

export type MonitorWsClientMessage =
  | { type: 'ping'; timestamp?: number }
  | {
      type: 'subscribe';
      requestId?: string;
      channel: MonitorWsChannel;
      params?: Record<string, unknown>;
    }
  | { type: 'unsubscribe'; subscriptionId: string }
  | {
      type: 'request';
      requestId: string;
      channel: MonitorWsChannel;
      action: string;
      params?: Record<string, unknown>;
    };

export type MonitorWsServerMessage =
  | { type: 'hello'; sessionId: string; heartbeatMs: number; version: number }
  | { type: 'pong'; timestamp?: number }
  | { type: 'error'; code: string; message: string; requestId?: string; subscriptionId?: string }
  | { type: 'subscribed'; subscriptionId: string; channel: MonitorWsChannel; requestId?: string }
  | { type: 'unsubscribed'; subscriptionId: string; channel: MonitorWsChannel }
  | { type: 'snapshot'; subscriptionId: string; channel: MonitorWsChannel; data: unknown }
  | { type: 'update'; subscriptionId: string; channel: MonitorWsChannel; data: unknown }
  | { type: 'event'; subscriptionId: string; channel: MonitorWsChannel; data: unknown }
  | { type: 'response'; requestId: string; channel: MonitorWsChannel; data: unknown };
