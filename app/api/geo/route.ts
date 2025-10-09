import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const EU_COUNTRY_CODES = new Set([
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
]);

const GEO_COUNTRY_HEADERS = [
  'cf-ipcountry',
  'x-vercel-ip-country',
  'x-geo-country',
  'x-country-code',
  'cloudfront-viewer-country',
  'fastly-country-code',
  'true-client-country',
];

const PRIVATE_IP_PATTERNS = [
  /^127\.([0-9]{1,3}\.){2}[0-9]{1,3}$/,
  /^10\.([0-9]{1,3}\.){2}[0-9]{1,3}$/,
  /^192\.168\.([0-9]{1,3}\.)[0-9]{1,3}$/,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\.([0-9]{1,3}\.)[0-9]{1,3}$/,
  /^::1$/,
  /^fc[0-9a-f]{2}:/i,
  /^fd[0-9a-f]{2}:/i,
];

function normalizeCountryCode(code: string | null | undefined): string | null {
  if (!code) return null;
  const upper = code.trim().toUpperCase();
  if (!upper || upper === 'UNKNOWN') return null;
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  return null;
}

function getCountryCodeFromHeaders(request: NextRequest): string | null {
  for (const header of GEO_COUNTRY_HEADERS) {
    const value = normalizeCountryCode(request.headers.get(header));
    if (value) return value;
  }
  const geo = (request as any).geo as { country?: string } | undefined;
  const geoCountry = normalizeCountryCode(geo?.country);
  if (geoCountry) return geoCountry;
  return null;
}

function getClientIp(request: NextRequest): string | null {
  const cfConnectingIp = request.headers.get('cf-connecting-ip');
  if (cfConnectingIp) return cfConnectingIp.trim();

  const fromHeader = request.headers.get('x-forwarded-for');
  if (fromHeader) {
    const candidate = fromHeader.split(',')[0]?.trim();
    if (candidate) return candidate;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  const trueClientIp = request.headers.get('true-client-ip');
  if (trueClientIp) return trueClientIp.trim();

  if (request.ip) return request.ip;
  return null;
}

function isPrivateIp(ip: string | null | undefined): boolean {
  if (!ip) return true;
  for (const pattern of PRIVATE_IP_PATTERNS) {
    if (pattern.test(ip)) {
      return true;
    }
  }
  return false;
}

async function lookupCountryByIp(ip: string): Promise<string | null> {
  const template = process.env.GEOIP_LOOKUP_URL;
  const key = process.env.GEOIP_LOOKUP_API_KEY;
  const endpoint = template
    ? template.replace('{ip}', encodeURIComponent(ip))
    : `https://ipapi.co/${encodeURIComponent(ip)}/json/`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);

  try {
    const res = await fetch(endpoint, {
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(key ? { Authorization: `Bearer ${key}` } : {}),
        'User-Agent': 'nos-plus-geo/1.0',
      },
      signal: controller.signal,
    });

    if (!res.ok) return null;

    const data = (await res.json()) as { country_code?: string; country?: string } | null;
    const code = normalizeCountryCode(data?.country_code || data?.country);
    return code;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function GET(request: NextRequest) {
  try {
    let countryCode = getCountryCodeFromHeaders(request);

    const clientIp = getClientIp(request);
    if (!countryCode && clientIp && !isPrivateIp(clientIp)) {
      countryCode = await lookupCountryByIp(clientIp);
    }

    const isEU = countryCode ? EU_COUNTRY_CODES.has(countryCode) : false;

    return NextResponse.json(
      {
        isEU,
        countryCode: countryCode ?? null,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch {
    return NextResponse.json(
      {
        isEU: false,
        countryCode: null,
        error: 'LOOKUP_FAILED',
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  }
}
