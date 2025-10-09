'use client';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Loader2, Moon, Sun } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface MaintenanceEndpoint {
  url: string;
  credentials: RequestCredentials;
}

function buildEndpoint(url: string): MaintenanceEndpoint {
  const trimmed = url.trim();
  if (trimmed.startsWith('http')) {
    return { url: trimmed, credentials: 'include' };
  }
  return { url: trimmed.startsWith('/') ? trimmed : `/${trimmed}`, credentials: 'same-origin' };
}

function getMaintenanceEndpoints(): MaintenanceEndpoint[] {
  const raw = process.env.NEXT_PUBLIC_MAINTENANCE_ENDPOINT?.trim();
  const endpoints: MaintenanceEndpoint[] = [];
  if (raw && raw.length) {
    endpoints.push(buildEndpoint(raw));
  }
  const fallback = '/api/maintenance-unlock';
  if (!endpoints.some((ep) => ep.url === fallback)) {
    endpoints.push(buildEndpoint(fallback));
  }
  return endpoints;
}

function Inner() {
  const t = useTranslations('maintenance');
  const [pwd, setPwd] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();
  const sp = useSearchParams();
  const next = sp.get('next') || '/';
  const { theme, setTheme } = useTheme();
  const endpoints = useMemo(() => getMaintenanceEndpoints(), []);

  useEffect(() => {
    setMounted(true);
  }, []);

  const translateErrorMessage = (message: string | undefined | null) => {
    if (!message) return t('errors.unable');
    const normalized = message.toLowerCase();
    if (normalized.includes('incorrect')) return t('errors.incorrect');
    if (normalized.includes('request')) return t('errors.requestFailed');
    if (normalized.includes('server')) return t('errors.server');
    return message;
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      let unlocked = false;
      let lastMessage: string | null = null;

      for (const endpoint of endpoints) {
        try {
          const res = await fetch(endpoint.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: pwd }),
            credentials: endpoint.credentials,
          });

          type MaintenanceResponse = {
            success?: boolean;
            token?: string;
            error?: string | { message?: string };
          } | null;

          const maybeJson: MaintenanceResponse = await res
            .clone()
            .json()
            .catch(async () => {
              const text = await res.text().catch(() => '');
              return text ? ({ success: false, error: text } as MaintenanceResponse) : null;
            });

          if (!res.ok) {
            const errorField = maybeJson?.error;
            const errorMessage =
              typeof errorField === 'string' ? errorField : errorField?.message || res.statusText;
            lastMessage = translateErrorMessage(errorMessage);
            continue;
          }

          const data = maybeJson;
          if (data?.success) {
            if (data.token) {
              const maxAge = 60 * 60 * 12;
              const secureFlag = window.location.protocol === 'https:' ? '; Secure' : '';
              document.cookie = `m_access=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax${secureFlag}`;
            }
            unlocked = true;
            break;
          }

          const errorField = data?.error;
          const fallback = typeof errorField === 'string' ? errorField : errorField?.message;
          lastMessage = translateErrorMessage(fallback ?? 'incorrect');
        } catch (err: any) {
          const message = typeof err?.message === 'string' ? err.message : undefined;
          const translated = translateErrorMessage(
            message?.includes('<') ? 'server' : (message ?? undefined),
          );
          lastMessage = translated;
        }
      }

      if (unlocked) {
        router.replace(next);
      } else {
        setError(lastMessage || t('errors.unable'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground">
      <div className="absolute top-4 right-4">
        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:bg-secondary transition-colors"
        >
          {mounted ? (
            theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )
          ) : (
            <Loader2 className="h-4 w-4 animate-spin" />
          )}
          <span>{theme === 'dark' ? t('toggle.light') : t('toggle.dark')}</span>
        </button>
      </div>

      <div className="flex min-h-screen items-center justify-center p-4">
        <form
          onSubmit={submit}
          className="w-full max-w-sm space-y-5 rounded-xl border border-border bg-card p-8 shadow-soft"
        >
          <h1 className="text-xl font-semibold">{t('title')}</h1>
          <p className="text-sm text-muted-foreground">{t('description')}</p>
          <input
            type="password"
            value={pwd}
            onChange={(e) => setPwd(e.target.value)}
            className="w-full rounded-md border border-border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/60"
            placeholder={t('passwordPlaceholder')}
            autoFocus
          />
          {error && <div className="text-sm text-red-500">{error}</div>}
          <button
            disabled={loading}
            className="w-full rounded-md bg-primary py-2 text-primary-foreground transition-opacity disabled:opacity-50"
          >
            {loading ? t('checking') : t('unlock')}
          </button>
        </form>
      </div>
    </div>
  );
}

function MaintenanceFallback() {
  const t = useTranslations('maintenance');
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500">
      {t('loading')}
    </div>
  );
}

export default function MaintenancePage() {
  return (
    <Suspense fallback={<MaintenanceFallback />}>
      <Inner />
    </Suspense>
  );
}
