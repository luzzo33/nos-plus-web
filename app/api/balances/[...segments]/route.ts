import { NextResponse, type NextRequest } from 'next/server';

import { buildNosApiUrl } from '@/lib/api/monitorConfig';
import { resolveBalancesBaseOverride } from '@/lib/api/balances-client';

const rawUpstreamBase =
  process.env.NOS_BALANCES_BASE ||
  process.env.NEXT_PUBLIC_NOS_BALANCES_BASE ||
  process.env.NEXT_PUBLIC_BALANCES_BASE_URL ||
  process.env.BALANCES_HTTP_BASE;

const resolvedOverride = resolveBalancesBaseOverride(rawUpstreamBase);

const UPSTREAM_BASE = (resolvedOverride ?? buildNosApiUrl('/v3/balances')).replace(/\/$/, '');
const UPSTREAM_API_KEY =
  process.env.NOS_API_KEY ??
  process.env.MONITOR_API_KEY ??
  process.env.NEXT_PUBLIC_MONITOR_API_KEY ??
  '';

async function proxyRequest(req: NextRequest, params: { segments?: string[] }, method: 'GET') {
  const { segments = [] } = params;
  const pathname = segments.join('/');
  const search = req.nextUrl.searchParams.toString();
  const upstreamUrl = `${UPSTREAM_BASE}/${pathname}${search ? `?${search}` : ''}`;

  const headers = new Headers({
    Accept: 'application/json',
  });
  if (UPSTREAM_API_KEY) {
    headers.set('X-API-Key', UPSTREAM_API_KEY);
  }

  const upstreamResponse = await fetch(upstreamUrl, {
    method,
    headers,
    cache: 'no-store',
  });

  const body = await upstreamResponse.text();

  return new NextResponse(body, {
    status: upstreamResponse.status,
    headers: {
      'Content-Type': upstreamResponse.headers.get('content-type') ?? 'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(req: NextRequest, context: { params: { segments?: string[] } }) {
  try {
    return await proxyRequest(req, context.params, 'GET');
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          message: 'Failed to load balances data',
        },
      },
      { status: 500 },
    );
  }
}
