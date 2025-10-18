import rawManifest from '@/lib/generated/exchange-logos.json';

type ExchangeLogoEntry = {
  identifier: string;
  slug: string;
  name: string;
  filename: string;
  path: string;
  source: string;
};

type ExchangeLogoManifest = {
  generatedAt: string;
  token: string;
  source: string;
  exchanges: ExchangeLogoEntry[];
};

const manifest = rawManifest as ExchangeLogoManifest;

function normalizeKey(value: string | null | undefined): string | null {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed.length) return null;
  return trimmed.toLowerCase();
}

function withHyphenVariant(value: string | null) {
  if (!value) return null;
  return value.replace(/_/g, '-');
}

function withUnderscoreVariant(value: string | null) {
  if (!value) return null;
  return value.replace(/-/g, '_');
}

const LOGO_LOOKUP = new Map<string, string>();

for (const entry of manifest.exchanges) {
  const candidates = [
    normalizeKey(entry.slug),
    withUnderscoreVariant(normalizeKey(entry.slug)),
    normalizeKey(entry.identifier),
    withHyphenVariant(normalizeKey(entry.identifier)),
    normalizeKey(entry.name),
  ];

  for (const key of candidates) {
    if (!key) continue;
    LOGO_LOOKUP.set(key, entry.path);
  }
}

export function resolveExchangeLogoPath(
  slug?: string | null,
  identifier?: string | null,
  name?: string | null,
): string | null {
  const keys = [
    normalizeKey(slug),
    withUnderscoreVariant(normalizeKey(slug)),
    withHyphenVariant(normalizeKey(slug)),
    normalizeKey(identifier),
    withHyphenVariant(normalizeKey(identifier)),
    withUnderscoreVariant(normalizeKey(identifier)),
    normalizeKey(name),
  ];

  for (const key of keys) {
    if (!key) continue;
    const candidate = LOGO_LOOKUP.get(key);
    if (candidate) return candidate;
  }

  return null;
}

export const exchangeLogoManifest = manifest;
