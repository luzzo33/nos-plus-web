import { BaseApiClient } from './base-client';
import { buildNosApiUrl } from './monitorConfig';

export interface FlowEdge {
  source: string;
  destination: string;
  amount: number;
  signature?: string;
  blockTime?: number | null;
}

export interface FlowNode {
  id: string;
  label: string;
  type: 'owner' | 'token' | string;
}

export interface FlowLink {
  source: string;
  target: string;
  amount: number;
  ts?: number | null;
  signature?: string;
}

export interface FlowTraceResponse {
  success: boolean;
  cached: boolean;
  keyHash: string;
  accepted?: boolean;
  message?: string;
  nodes: FlowNode[];
  links: FlowLink[];
  edges: FlowEdge[];
  nodesDetailed?: Array<{
    id: string;
    label: string;
    type: string;
    depth: number | null;
    inDegree: number;
    outDegree: number;
    inAmount: number;
    outAmount: number;
    firstInTs: number | null;
    firstOutTs: number | null;
  }>;
  linksDetailed?: Array<{
    index: number;
    source: string;
    target: string;
    amount: number;
    ts: number | null;
    signature: string | null;
    depth: number | null;
  }>;
  depthLayers?: Array<{ depth: number; nodes: string[]; edges: number[]; amountSum: number }>;
  graphStats?: {
    nodeCount: number;
    linkCount: number;
    totalAmount: number;
    timeRange: { minTs: number | null; maxTs: number | null };
    maxDepthObserved: number | null;
    startPresent: boolean;
  };
  nodeIndex?: Record<string, unknown>;
  signatureIndex?: Record<string, number[]>;
  aggregatedLinks?: Array<{
    source: string;
    target: string;
    amountSum: number;
    txCount: number;
    minTs: number | null;
    maxTs: number | null;
    signatures: string[];
  }>;
  meta: {
    rpcUsed?: number;
    depthReached?: number | string;
    truncated?: boolean;
    completeness?: { truncated: boolean; reason: string; limits?: Record<string, unknown> };
    units?: { amount: string };
  };
  createdAt?: string;
}

export class FlowApiClient extends BaseApiClient {
  constructor() {
    super(buildNosApiUrl('/v3/flow'), 'Flow', { timeout: 10 * 60 * 1000 });
  }

  async trace(params: {
    start: string;
    startType?: 'wallet' | 'signature' | 'auto';
    addressType?: 'owner' | 'token' | 'auto';
    rpcUrl: string;
    apiKey?: string;
    nosMint?: string;
    maxDepth?: number;
    maxFanout?: number;
    minAmount?: number;
    sinceDays?: number;
    rpcBudget?: number;
    maxSigsPerWallet?: number;
    ttlHours?: number;
    forceFresh?: boolean;
    async?: boolean;
    resumeFromKey?: string;
    debug?: boolean;
  }): Promise<FlowTraceResponse> {
    const res = await this.axiosInstance.post('/trace', params);
    return res.data as FlowTraceResponse;
  }

  async getCache(key: string, opts?: { stale?: boolean }): Promise<FlowTraceResponse> {
    const res = await this.axiosInstance.get('/cache', {
      params: { key, ...(opts?.stale ? { stale: 1 } : {}) },
    });
    return res.data as FlowTraceResponse;
  }

  async getJob(key: string): Promise<{
    success: boolean;
    found: boolean;
    status: 'not_found' | 'queued' | 'running' | 'done' | 'error';
    keyHash?: string;
    cacheReady?: boolean;
    meta?: Record<string, unknown>;
  }> {
    try {
      const res = await this.axiosInstance.get('/job', { params: { key } });
      return res.data as {
        success: boolean;
        found: boolean;
        status: 'not_found' | 'queued' | 'running' | 'done' | 'error';
        keyHash?: string;
        cacheReady?: boolean;
        meta?: Record<string, unknown>;
      };
    } catch {
      const statusRes = await this.axiosInstance.get('/status', { params: { key } });
      return statusRes.data as {
        success: boolean;
        found: boolean;
        status: 'not_found' | 'queued' | 'running' | 'done' | 'error';
        keyHash?: string;
        cacheReady?: boolean;
        meta?: Record<string, unknown>;
      };
    }
  }
}
