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

function logIncoming(level: ServerLogLevel, message: string, context: Record<string, unknown>) {
  const entry = {
    ...context,
    message,
  };

  switch (level) {
    case 'error':
      logError('[client] event', entry);
      break;
    case 'warn':
      logWarn('[client] event', entry);
      break;
    case 'debug':
      logDebug('[client] event', entry);
      break;
    default:
      logInfo('[client] event', entry);
      break;
  }
}

export async function POST(request: NextRequest) {
  let rawBody: string | null = null;

  try {
    rawBody = await request.text();
  } catch (error) {
    logError('[client-logs] Failed to read request body', {
      error: formatLogPayload(error),
    });
  }

  if (!rawBody || !rawBody.trim().length) {
    logWarn('[client-logs] Received empty payload', buildContext(null, request));
    return NextResponse.json({ success: true }, { status: 202 });
  }

  try {
    const body = JSON.parse(rawBody);
    const level = normalizeLevel(body?.level);
    const message =
      typeof body?.message === 'string' && body.message.trim().length > 0
        ? body.message.trim()
        : 'Client-side error reported';

    const context = buildContext(body?.context, request);
    logIncoming(level, message, context);

    return NextResponse.json({ success: true }, { status: 202 });
  } catch (error) {
    logError('[client-logs] Failed to process client log payload', {
      error: formatLogPayload(error),
      body: rawBody,
    });
    return NextResponse.json({ success: false }, { status: 200 });
  }
}

export function GET() {
  return NextResponse.json({ success: true, message: 'Use POST to submit client logs.' });
}
