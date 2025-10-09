import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { logDebug, logError, logInfo, logWarn, formatLogPayload } from '@/lib/logging/logger';

type ServerLogLevel = 'debug' | 'info' | 'warn' | 'error';

const ALLOWED_LEVELS: ServerLogLevel[] = ['debug', 'info', 'warn', 'error'];

function normalizeLevel(level: unknown): ServerLogLevel {
  if (typeof level === 'string') {
    const normalized = level.toLowerCase() as ServerLogLevel;
    if (ALLOWED_LEVELS.includes(normalized)) {
      return normalized;
    }
  }
  return 'info';
}

function buildContext(payload: unknown, request: NextRequest): Record<string, unknown> {
  const sanitized = formatLogPayload(payload);
  const context: Record<string, unknown> = {};

  if (typeof sanitized !== 'undefined') {
    if (typeof sanitized === 'object' && sanitized !== null && !Array.isArray(sanitized)) {
      Object.assign(context, sanitized);
    } else {
      context.payload = sanitized;
    }
  }

  context.userAgent = request.headers.get('user-agent') ?? 'unknown';
  const clientIp = request.headers.get('x-forwarded-for') ?? request.ip ?? 'unknown';
  context.clientIp = Array.isArray(clientIp) ? clientIp.join(',') : clientIp;
  context.referer = request.headers.get('referer') ?? undefined;
  context.reportedAt = new Date().toISOString();

  return context;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const level = normalizeLevel(body?.level);
    const message =
      typeof body?.message === 'string' && body.message.trim().length > 0
        ? body.message.trim()
        : 'Client-side error reported';

    const context = buildContext(body?.context, request);

    switch (level) {
      case 'error':
        logError(`[client] ${message}`, context);
        break;
      case 'warn':
        logWarn(`[client] ${message}`, context);
        break;
      case 'debug':
        logDebug(`[client] ${message}`, context);
        break;
      default:
        logInfo(`[client] ${message}`, context);
        break;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    logError('[client-logs] Failed to process client log payload', { error });
    return NextResponse.json({ success: false }, { status: 400 });
  }
}

export function GET() {
  return NextResponse.json({ success: true, message: 'Use POST to submit client logs.' });
}
