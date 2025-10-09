'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { nosApiFetch } from '@/lib/api/nosApi';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import { cn } from '@/lib/utils';

interface ApiKeyRecord {
  id: number;
  label?: string | null;
  displayName?: string | null;
  lastFour?: string | null;
  status: 'active' | 'paused' | 'revoked';
  createdAt: string;
  metadata?: Record<string, unknown> | null;
  tierId?: number | null;
  tier?: {
    slug: string;
    name: string;
  } | null;
}

interface TierRecord {
  id: number;
  slug: string;
  name: string;
  description?: string | null;
  monthlyQuota?: number | null;
  burstRpm?: number | null;
}

const MAX_KEYS_PER_USER = 3;
const GUEST_KEY_LIMIT = 1;

type RequestKeyVariables = {
  captchaToken: string;
  labelSnapshot: string | null;
  tierSlug: string;
};

type GuestLookupSummary = {
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgLatencyMs: number | null;
  windowMinutes: number;
};

type GuestLookupResponse = {
  key: {
    label?: string | null;
    status: 'active' | 'paused' | 'revoked';
    tier?: { slug: string; name: string } | null;
    createdAt: string;
    lastUsedAt?: string | null;
    rateLimitHour?: number | null;
    rateLimitDay?: number | null;
    metadata?: { issuedBy?: string | null } | null;
  };
  summary: GuestLookupSummary;
};

function cheapHash(str: string): string {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h += (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24);
  }
  return ('00000000' + (h >>> 0).toString(16)).slice(-8);
}

function getBrowserFingerprint() {
  try {
    const ua = navigator.userAgent || '';
    const lang = navigator.language || '';
    const platform = (navigator as any).platform || '';
    const vendor = (navigator as any).vendor || '';
    const hw = `${(navigator as any).hardwareConcurrency || ''}x${(navigator as any).deviceMemory || ''}`;
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    return cheapHash([ua, lang, platform, vendor, hw, tz].join('|'));
  } catch {
    return 'na';
  }
}

function getDeviceFingerprint() {
  try {
    const screenInfo =
      typeof screen !== 'undefined' ? `${screen.width}x${screen.height}x${screen.colorDepth}` : '';
    const touch = 'ontouchstart' in window ? 't' : 'n';
    return cheapHash([screenInfo, touch].join('|'));
  } catch {
    return 'na';
  }
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

const KeyIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 7a2 2 0 012 2m0 0a2 2 0 012 2 12 12 0 01-7 10c-.85.29-1.8.29-2.65 0A12 12 0 015 11a2 2 0 012-2m0 0a2 2 0 012-2m6 2v1a2 2 0 11-4 0V9a2 2 0 112 0z"
    />
  </svg>
);

const ShieldIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
    />
  </svg>
);

const ChartIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
    />
  </svg>
);

const PlusIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
    />
  </svg>
);

const TrashIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
    />
  </svg>
);

const EyeIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
    />
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
    />
  </svg>
);

const EyeOffIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21"
    />
  </svg>
);

export default function ApiKeysPage() {
  const t = useTranslations('apiKeys');
  const authT = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const { data: session, status } = useSession();
  const queryClient = useQueryClient();
  const accessToken = session?.accessToken as string | undefined;
  const isAuthenticated = status === 'authenticated' && Boolean(accessToken);

  const [browserFp] = useState(() => getBrowserFingerprint());
  const [deviceFp] = useState(() => getDeviceFingerprint());
  const [captchaInstance, setCaptchaInstance] = useState(0);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [selectedTier, setSelectedTier] = useState<string>('free');
  const [label, setLabel] = useState('');
  const [activeKeyId, setActiveKeyId] = useState<number | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [limitLocked, setLimitLocked] = useState(false);
  const [showNewKeyAnimation, setShowNewKeyAnimation] = useState(false);
  const [lookupKey, setLookupKey] = useState('');
  const [lookupWindow, setLookupWindow] = useState('60');
  const [lookupResult, setLookupResult] = useState<GuestLookupResponse | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      setLimitLocked(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (newKey) {
      setShowNewKeyAnimation(true);
      const timer = setTimeout(() => setShowNewKeyAnimation(false), 500);
      return () => clearTimeout(timer);
    }
  }, [newKey]);

  const keysQuery = useQuery<{ success: boolean; keys: ApiKeyRecord[] }, Error>({
    queryKey: ['apiKeys'],
    queryFn: async () => {
      const data = await nosApiFetch('/v3/apikeys', { method: 'GET' }, accessToken);
      return data;
    },
    enabled: isAuthenticated,
  });

  const tiersQuery = useQuery<{ success: boolean; tiers: TierRecord[] }, Error>({
    queryKey: ['apiKeyTiers'],
    queryFn: async () => nosApiFetch('/v3/apikeys/tiers/list', { method: 'GET' }, accessToken),
    enabled: isAuthenticated,
  });

  const summaryQuery = useQuery({
    queryKey: ['apiKeySummary', activeKeyId],
    queryFn: async () => {
      if (!activeKeyId) return null;
      return nosApiFetch(
        `/v3/apikeys/${activeKeyId}/usage/summary`,
        { method: 'GET' },
        accessToken,
      );
    },
    enabled: isAuthenticated && Boolean(activeKeyId),
  });

  const eventsQuery = useQuery({
    queryKey: ['apiKeyEvents', activeKeyId],
    queryFn: async () => {
      if (!activeKeyId) return null;
      return nosApiFetch(
        `/v3/apikeys/${activeKeyId}/usage/events?limit=50`,
        { method: 'GET' },
        accessToken,
      );
    },
    enabled: isAuthenticated && Boolean(activeKeyId),
  });

  const dailyQuery = useQuery({
    queryKey: ['apiKeyDaily', activeKeyId],
    queryFn: async () => {
      if (!activeKeyId) return null;
      return nosApiFetch(
        `/v3/apikeys/${activeKeyId}/usage/daily?days=14`,
        { method: 'GET' },
        accessToken,
      );
    },
    enabled: isAuthenticated && Boolean(activeKeyId),
  });

  const requestKeyMutation = useMutation({
    mutationFn: async ({ captchaToken, labelSnapshot, tierSlug }: RequestKeyVariables) => {
      const payload = {
        captchaToken,
        browserFp,
        deviceFp,
        tierSlug,
        label: labelSnapshot,
      };
      const endpoint = isAuthenticated ? '/v3/apikeys/request' : '/v3/apikeys/anonymous/request';
      return nosApiFetch(
        endpoint,
        {
          method: 'POST',
          body: JSON.stringify(payload),
        },
        isAuthenticated ? accessToken : undefined,
      );
    },
    onSuccess: (data: any) => {
      if (data?.key) {
        setNewKey(data.key);
      }
      if (isAuthenticated) {
        queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      } else {
        setLimitLocked(true);
      }
      setFormError(null);
      setShowCaptcha(false);
      setCaptchaInstance((prev) => prev + 1);
      setLabel('');
    },
    onError: (err: any) => {
      const rawCode = err?.message || 'generic';
      const normalizedCode =
        !isAuthenticated && rawCode === 'AUTH_REQUIRED' ? 'SERVER_ERROR' : rawCode;
      setFormError(normalizedCode);
      if (
        !isAuthenticated &&
        (normalizedCode === 'MAX_KEYS_REACHED' || normalizedCode === 'LIMIT_REACHED')
      ) {
        setLimitLocked(true);
      }
      setShowCaptcha(false);
      setCaptchaInstance((prev) => prev + 1);
    },
  });

  const handleLookupSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedKey = lookupKey.trim();
      if (!trimmedKey.length) {
        setLookupError('API_KEY_REQUIRED');
        setLookupResult(null);
        return;
      }
      setLookupLoading(true);
      setLookupError(null);
      setLookupResult(null);
      try {
        const minutes = Number.parseInt(lookupWindow, 10);
        const payload = {
          apiKey: trimmedKey,
          windowMinutes: Number.isFinite(minutes) ? minutes : undefined,
        };
        const response = (await nosApiFetch('/v3/apikeys/anonymous/lookup', {
          method: 'POST',
          body: JSON.stringify(payload),
        })) as GuestLookupResponse;
        setLookupResult(response);
      } catch (err: any) {
        const code = err?.message || 'generic';
        setLookupError(code);
      } finally {
        setLookupLoading(false);
      }
    },
    [lookupKey, lookupWindow],
  );

  const revokeMutation = useMutation({
    mutationFn: async (id: number) =>
      nosApiFetch(`/v3/apikeys/${id}/revoke`, { method: 'POST' }, accessToken),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['apiKeys'] });
      if (activeKeyId) {
        queryClient.invalidateQueries({ queryKey: ['apiKeySummary', activeKeyId] });
        queryClient.invalidateQueries({ queryKey: ['apiKeyEvents', activeKeyId] });
        queryClient.invalidateQueries({ queryKey: ['apiKeyDaily', activeKeyId] });
      }
    },
  });

  const tiers = tiersQuery.data?.tiers ?? [];
  const selectedTierDetails = useMemo(
    () => tiers.find((tier) => tier.slug === selectedTier),
    [tiers, selectedTier],
  );

  const keys = isAuthenticated ? (keysQuery.data?.keys ?? []) : [];
  const currentLimit = isAuthenticated ? MAX_KEYS_PER_USER : GUEST_KEY_LIMIT;
  const limitReached = isAuthenticated ? keys.length >= currentLimit : limitLocked;

  const canStartCaptcha =
    !showCaptcha &&
    requestKeyMutation.status !== 'pending' &&
    (!isAuthenticated || !keysQuery.isLoading) &&
    !limitReached;

  const handleStartRequest = () => {
    if (!canStartCaptcha) {
      if (limitReached) {
        setFormError('LIMIT_REACHED');
      }
      return;
    }
    setFormError(null);
    setShowCaptcha(true);
    setCaptchaInstance((prev) => prev + 1);
  };

  const handleCancelCaptcha = () => {
    setShowCaptcha(false);
    setCaptchaInstance((prev) => prev + 1);
  };

  const handleCaptchaVerified = useCallback(
    (token: string) => {
      const labelSnapshot = label.trim() || null;
      const tierSlug = isAuthenticated ? selectedTier : 'free';
      requestKeyMutation.mutate({ captchaToken: token, labelSnapshot, tierSlug });
    },
    [isAuthenticated, label, requestKeyMutation, selectedTier],
  );

  const testNotice = (
    <div className="card-base p-5 mb-6 border-primary/20 bg-primary/5 border-l-4 border-l-primary/40 dark:border-l-primary/30">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2 rounded-lg bg-primary/10">
          <ShieldIcon className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 text-sm text-foreground">
          {t.rich('testNotice.message', {
            email: (chunks) => (
              <a
                href="mailto:luzzo@nos.plus"
                className="font-semibold underline hover:text-amber-700 transition-colors"
              >
                {chunks}
              </a>
            ),
            discord: (chunks) => (
              <a
                href="https://discord.gg/nosana"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline hover:text-amber-700 transition-colors"
              >
                {chunks}
              </a>
            ),
            twitter: (chunks) => (
              <a
                href="https://twitter.com/nos_plus"
                target="_blank"
                rel="noreferrer"
                className="font-semibold underline hover:text-primary/80 transition-colors"
              >
                {chunks}
              </a>
            ),
          })}
        </div>
      </div>
    </div>
  );

  const errorMessage = formError
    ? t(`errors.${formError}` as any, {
        limit: currentLimit,
        defaultValue: t('errors.generic'),
      })
    : null;

  const lookupErrorMessage = lookupError
    ? t(`lookup.errors.${lookupError}` as any, {
        defaultValue: t('lookup.errors.generic'),
      })
    : null;

  const formatNumber = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const formatRateValue = useCallback(
    (value?: number | null, unit?: string) => {
      if (!value) return t('lookup.none');
      return unit ? `${formatNumber.format(value)} ${unit}` : formatNumber.format(value);
    },
    [formatNumber, t],
  );

  return (
    <div className="gradient-subtle min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="card-base p-6 mb-6 shadow-soft">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary shadow-lg">
                  <KeyIcon className="w-6 h-6 text-primary-foreground" />
                </div>
                <h1 className="text-2xl font-bold text-primary-gradient">{t('title')}</h1>
              </div>
              <p className="text-muted-foreground max-w-2xl">
                {isAuthenticated ? t('subtitle') : t('guest.subtitle')}
              </p>
            </div>

            {isAuthenticated ? (
              <button
                className="self-start px-6 py-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground font-medium transition-colors"
                onClick={() => signOut()}
              >
                {authT('logout')}
              </button>
            ) : (
              <div className="flex flex-wrap gap-3">
                <button
                  className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90"
                  onClick={() =>
                    router.push(
                      `/${locale}/auth/login?callbackUrl=${encodeURIComponent(`/${locale}/api-keys`)}`,
                    )
                  }
                >
                  {authT('login')}
                </button>
                <Link
                  className="px-6 py-3 rounded-xl border border-border text-foreground font-medium hover:bg-accent transition-colors"
                  href={`/${locale}/auth/register`}
                >
                  {authT('register')}
                </Link>
              </div>
            )}
          </div>
        </div>

        {testNotice}

        {/* Anonymous key lookup */}
        <div className="card-base p-6 mb-6 shadow-soft">
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-foreground">{t('lookup.title')}</h2>
              <p className="text-sm text-muted-foreground max-w-2xl">{t('lookup.subtitle')}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <EyeIcon className="w-4 h-4" />
              <span>{t('lookup.readOnly')}</span>
            </div>
          </div>

          <form
            className="grid gap-4 md:grid-cols-[2fr_1fr_auto] md:items-end"
            onSubmit={handleLookupSubmit}
          >
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="lookup-key">
                {t('lookup.apiKeyLabel')}
              </label>
              <input
                id="lookup-key"
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground transition-colors focus:ring-2 focus:ring-ring focus:border-ring"
                value={lookupKey}
                onChange={(e) => setLookupKey(e.target.value)}
                placeholder={t('lookup.apiKeyPlaceholder')}
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground" htmlFor="lookup-window">
                {t('lookup.windowLabel')}
              </label>
              <input
                id="lookup-window"
                type="number"
                min={5}
                max={1440}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground transition-colors focus:ring-2 focus:ring-ring focus:border-ring"
                value={lookupWindow}
                onChange={(e) => setLookupWindow(e.target.value)}
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
              disabled={lookupLoading}
            >
              {lookupLoading ? t('lookup.loading') : t('lookup.submit')}
            </button>
          </form>

          <p className="mt-2 text-xs text-muted-foreground">{t('lookup.windowHint')}</p>

          {lookupErrorMessage && (
            <div className="mt-4 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
              {lookupErrorMessage}
            </div>
          )}

          {lookupResult && (
            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              <div className="p-6 rounded-xl border border-border bg-background space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('lookup.detailsTitle')}
                </h3>
                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.label')}</dt>
                    <dd>{lookupResult.key.label || t('lookup.unknown')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.tier')}</dt>
                    <dd>{lookupResult.key.tier?.name || t('lookup.unknown')}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.status')}</dt>
                    <dd>{t(`keys.status.${lookupResult.key.status}`)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.createdAt')}</dt>
                    <dd>{formatDate(lookupResult.key.createdAt)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.lastUsedAt')}</dt>
                    <dd>
                      {lookupResult.key.lastUsedAt
                        ? formatDate(lookupResult.key.lastUsedAt)
                        : t('lookup.never')}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.rateLimitHour')}</dt>
                    <dd>{formatRateValue(lookupResult.key.rateLimitHour, t('lookup.perHour'))}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.rateLimitDay')}</dt>
                    <dd>{formatRateValue(lookupResult.key.rateLimitDay, t('lookup.perDay'))}</dd>
                  </div>
                  {lookupResult.key.metadata?.issuedBy && (
                    <div>
                      <dt className="text-muted-foreground">{t('lookup.issuedBy')}</dt>
                      <dd>{lookupResult.key.metadata.issuedBy}</dd>
                    </div>
                  )}
                </dl>
              </div>
              <div className="p-6 rounded-xl border border-border bg-background space-y-3">
                <h3 className="text-sm font-semibold text-foreground">
                  {t('lookup.summaryTitle', { window: lookupResult.summary.windowMinutes })}
                </h3>
                <dl className="grid gap-2 text-sm">
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.totalCalls')}</dt>
                    <dd>{formatNumber.format(lookupResult.summary.totalCalls)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.successCalls')}</dt>
                    <dd>{formatNumber.format(lookupResult.summary.successCalls)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.errorCalls')}</dt>
                    <dd>{formatNumber.format(lookupResult.summary.errorCalls)}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{t('lookup.avgLatency')}</dt>
                    <dd>
                      {lookupResult.summary.avgLatencyMs
                        ? `${formatNumber.format(Math.round(lookupResult.summary.avgLatencyMs))} ms`
                        : t('lookup.unknown')}
                    </dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* New Key Success Animation */}
        {newKey && (
          <div
            className={cn(
              'mb-6 card-base p-5 border-emerald-200 bg-emerald-50 dark:bg-emerald-900/20 dark:border-emerald-800 border-l-4 border-l-emerald-500 transition-all duration-500',
              showNewKeyAnimation && 'animate-pulse-once',
            )}
          >
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                <ShieldIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-2">{t('newKey.title')}</h3>
                <div className="p-4 bg-card rounded-lg border border-border mb-3">
                  <code className="text-sm font-mono text-foreground break-all">{newKey}</code>
                </div>
                <p className="text-sm text-muted-foreground mb-4">{t('newKey.reminder')}</p>
                <button
                  type="button"
                  className="px-4 py-2 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors"
                  onClick={() => setNewKey(null)}
                >
                  {t('newKey.close')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Key Request Section */}
        <div className="card-base p-6 mb-6 shadow-soft">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-green-500">
              <PlusIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground">{t('request.title')}</h2>
          </div>
          <p className="text-muted-foreground mb-8">
            {isAuthenticated ? t('request.subtitle') : t('guest.limit', { limit: currentLimit })}
          </p>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground">{t('request.label')}</label>
              <input
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground transition-colors focus:ring-2 focus:ring-ring focus:border-ring"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder={t('request.labelPlaceholder')}
              />
            </div>

            {isAuthenticated ? (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('request.tier')}</label>
                <select
                  className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground transition-colors focus:ring-2 focus:ring-ring focus:border-ring"
                  value={selectedTier}
                  onChange={(e) => setSelectedTier(e.target.value)}
                >
                  {tiers.map((tier) => (
                    <option key={tier.id} value={tier.slug}>
                      {tier.name}
                    </option>
                  ))}
                </select>
                {selectedTierDetails?.description && (
                  <p className="text-xs text-muted-foreground mt-2">
                    {selectedTierDetails.description}
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">{t('request.tier')}</label>
                <div className="px-4 py-3 rounded-xl bg-primary/10 border border-primary/20">
                  <div className="text-sm font-semibold text-primary">
                    {t('guest.freeTierLabel')}
                  </div>
                  <p className="text-xs text-primary/70 mt-1">{t('guest.freeTierHint')}</p>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-4">
            <button
              className={cn(
                'px-8 py-4 rounded-xl font-semibold transition-colors',
                canStartCaptcha
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
              disabled={!canStartCaptcha}
              onClick={handleStartRequest}
            >
              {isAuthenticated ? t('request.submit') : t('guest.generate')}
            </button>

            {limitReached && (
              <div className="p-4 rounded-xl bg-secondary border border-border text-foreground text-sm">
                {t('request.limitReached', { limit: currentLimit })}
              </div>
            )}
          </div>

          {/* Captcha Section */}
          {showCaptcha && (
            <div className="mt-6 p-5 rounded-xl bg-muted/50 border border-border space-y-4 animate-fade-in">
              <p className="text-sm text-muted-foreground">{t('request.captchaHelp')}</p>
              <TurnstileWidget
                key={captchaInstance}
                onVerify={handleCaptchaVerified}
                onExpire={() => {
                  setFormError('CAPTCHA_REQUIRED');
                  setShowCaptcha(false);
                  setCaptchaInstance((prev) => prev + 1);
                }}
                onError={() => {
                  setFormError('CAPTCHA_REQUIRED');
                  setShowCaptcha(false);
                  setCaptchaInstance((prev) => prev + 1);
                }}
                resetSignal={captchaInstance}
              />
              <button
                className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
                onClick={handleCancelCaptcha}
              >
                {t('request.cancel')}
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mt-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
              {errorMessage}
            </div>
          )}
        </div>

        {/* Guest Login Prompt */}
        {!isAuthenticated && (
          <div className="card-base p-5 mb-6 text-center border-primary/20 bg-primary/5">
            <p className="text-foreground mb-4">{t('guest.managePrompt')}</p>
            <Link
              href={`/${locale}/auth/login`}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90"
            >
              {t('guest.loginCta')}
            </Link>
          </div>
        )}

        {/* Existing Keys Section */}
        {isAuthenticated && (
          <div className="card-base p-6 mb-6 shadow-soft">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500">
                  <ChartIcon className="w-5 h-5 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground">{t('keys.title')}</h2>
              </div>
              <div className="px-3 py-1 rounded-full bg-secondary text-sm font-medium text-secondary-foreground">
                {t('keys.count', { count: keys.length })}
              </div>
            </div>

            {keysQuery.isError && (
              <div className="mb-6 p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                {t('errors.generic')}
              </div>
            )}

            {keys.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-muted flex items-center justify-center">
                  <KeyIcon className="w-10 h-10 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium text-foreground mb-2">No API keys yet</h3>
                <p className="text-muted-foreground">{t('keys.empty')}</p>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-2">
                {keys.map((key) => (
                  <div
                    key={key.id}
                    className={cn(
                      'card-base card-hover p-6 transition-all duration-300',
                      activeKeyId === key.id &&
                        'ring-2 ring-primary ring-offset-2 ring-offset-background',
                    )}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-foreground mb-1">
                          {key.displayName || key.label || t('keys.defaultLabel')}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <p>{t('keys.lastFour', { lastFour: key.lastFour || '----' })}</p>
                          <p>{t('keys.createdAt', { date: formatDate(key.createdAt) })}</p>
                          {key.tier?.name && <p>{t('keys.tier', { tier: key.tier.name })}</p>}
                        </div>
                        <div
                          className={cn(
                            'mt-3 inline-flex px-3 py-1 rounded-full text-xs font-medium',
                            key.status === 'active' && 'bg-green-100 text-green-700',
                            key.status === 'paused' && 'bg-yellow-100 text-yellow-700',
                            key.status === 'revoked' && 'bg-red-100 text-red-700',
                          )}
                        >
                          {t(`keys.status.${key.status}`)}
                        </div>
                      </div>

                      <button
                        className="ml-4 p-2 rounded-lg bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors"
                        onClick={() => revokeMutation.mutate(key.id)}
                        disabled={revokeMutation.status === 'pending'}
                        title={t('keys.revoke')}
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>

                    <button
                      className="w-full mt-4 p-3 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground text-sm font-medium transition-colors flex items-center justify-center gap-2"
                      onClick={() => setActiveKeyId((prev) => (prev === key.id ? null : key.id))}
                    >
                      {activeKeyId === key.id ? (
                        <>
                          <EyeOffIcon className="w-4 h-4" />
                          {t('keys.hideUsage')}
                        </>
                      ) : (
                        <>
                          <EyeIcon className="w-4 h-4" />
                          {t('keys.viewUsage')}
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Usage Analytics Section */}
        {isAuthenticated && activeKeyId && (
          <div className="card-base p-6 shadow-soft animate-fade-in">
            <h3 className="text-xl font-bold text-foreground mb-6 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-500">
                <ChartIcon className="w-5 h-5 text-white" />
              </div>
              {t('usage.title')}
            </h3>

            <div className="grid gap-6 lg:grid-cols-3">
              <div className="lg:col-span-1 space-y-4">
                <div className="p-5 rounded-xl bg-card border border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {t('usage.totalCalls')}
                  </div>
                  <div className="text-2xl font-bold">
                    {summaryQuery.data?.summary?.total_calls ?? 0}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-card border border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {t('usage.errors')}
                  </div>
                  <div className="text-2xl font-bold">
                    {summaryQuery.data?.summary?.error_calls ?? 0}
                  </div>
                </div>
                <div className="p-5 rounded-xl bg-card border border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-2">
                    {t('usage.avgLatency')}
                  </div>
                  <div className="text-2xl font-bold">
                    {summaryQuery.data?.summary?.avg_latency_ms
                      ? `${Math.round(summaryQuery.data.summary.avg_latency_ms)} ms`
                      : '—'}
                  </div>
                </div>
              </div>
              <div className="lg:col-span-2 space-y-6">
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4">
                    {t('usage.recentActivity')}
                  </h4>
                  {eventsQuery.data?.events && eventsQuery.data.events.length > 0 ? (
                    <div className="space-y-3">
                      {eventsQuery.data.events.slice(0, 10).map((event: any) => (
                        <div
                          key={event.id}
                          className="p-4 rounded-lg bg-muted/50 border border-border transition-colors hover:bg-muted"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">{event.route}</span>
                            <span className="text-sm text-muted-foreground">
                              {new Date(event.occurred_at).toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span className="px-2 py-1 rounded bg-secondary font-mono">
                              {event.method}
                            </span>
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  'px-2 py-1 rounded text-xs font-medium',
                                  event.status_code < 300 &&
                                    'bg-green-500/10 text-green-600 dark:text-green-400',
                                  event.status_code >= 300 &&
                                    event.status_code < 400 &&
                                    'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
                                  event.status_code >= 400 &&
                                    'bg-red-500/10 text-red-600 dark:text-red-400',
                                )}
                              >
                                {event.status_code}
                              </span>
                              <span>{event.latency_ms ? `${event.latency_ms} ms` : '—'}</span>
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <ChartIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p>{t('usage.noActivity')}</p>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-foreground mb-4">
                    {t('usage.dailyHeadline')}
                  </h4>
                  {dailyQuery.data?.days && dailyQuery.data.days.length > 0 ? (
                    <div className="space-y-3">
                      {dailyQuery.data.days.map((day: any) => (
                        <div
                          key={day.day}
                          className="p-4 rounded-lg bg-muted/50 border border-border transition-colors hover:bg-muted"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-medium text-foreground">{day.day}</span>
                            <span className="text-sm text-muted-foreground">
                              {t('usage.calls', { count: day.total_calls })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <span>{t('usage.errorsShort', { count: day.error_calls })}</span>
                            <span>
                              {day.avg_latency_ms ? `${Math.round(day.avg_latency_ms)} ms` : '—'}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <ChartIcon className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                      <p>{t('usage.noDaily')}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
