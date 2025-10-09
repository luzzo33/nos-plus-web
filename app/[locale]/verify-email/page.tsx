'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { getNosApiBase } from '@/lib/api/monitorConfig';

const NOS_API_BASE = getNosApiBase();

type VerifyStatus = 'pending' | 'success' | 'error';

const MailCheckIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const CheckCircleIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const XCircleIcon = ({ className = 'w-8 h-8' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
    />
  </svg>
);

const RefreshIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
);

const ArrowRightIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M13 7l5 5m0 0l-5 5m5-5H6"
    />
  </svg>
);

export default function VerifyEmailPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get('token'), [searchParams]);

  const [status, setStatus] = useState<VerifyStatus>('pending');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const runVerification = useCallback(async (currentToken: string | null, signal?: AbortSignal) => {
    if (!currentToken) {
      setStatus('error');
      setErrorCode('TOKEN_REQUIRED');
      return;
    }

    setStatus('pending');
    setErrorCode(null);

    try {
      const res = await fetch(`${NOS_API_BASE}/v1/auth/verify-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: currentToken }),
        signal,
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        const code = body?.error?.code || 'VERIFY_FAILED';
        throw new Error(code);
      }
      setStatus('success');
    } catch (err: any) {
      if (signal?.aborted || err?.name === 'AbortError') {
        return;
      }
      const message = typeof err?.message === 'string' ? err.message : 'VERIFY_FAILED';
      setErrorCode(/^[A-Z0-9_]+$/.test(message) ? message : 'VERIFY_FAILED');
      setStatus('error');
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    runVerification(token, controller.signal);
    return () => controller.abort();
  }, [runVerification, token]);

  const detailedError = useMemo(() => {
    if (!token || !errorCode) {
      return null;
    }
    return t(`errors.${errorCode}` as any, {
      defaultValue: t('errors.VERIFY_FAILED', { defaultValue: t('errors.generic') }),
    });
  }, [errorCode, t, token]);

  const handleRetry = () => runVerification(token);

  return (
    <div className="gradient-subtle min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-primary shadow-lg mb-3">
            <MailCheckIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-gradient mb-1">{t('verifyEmailTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('verifyEmailSubtitle')}</p>
        </div>

        {/* Status Card */}
        <div className="card-base p-6 shadow-soft">
          <div>
            {/* Pending State */}
            {status === 'pending' && (
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center">
                  <div className="w-16 h-16 border-4 border-border border-t-primary rounded-full animate-spin"></div>
                </div>
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">Verifying Email</h2>
                  <p className="text-muted-foreground">{t('verifyEmailProcessing')}</p>
                </div>
              </div>
            )}

            {/* Success State */}
            {status === 'success' && (
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center">
                  <div className="p-4 rounded-full bg-green-500/10">
                    <CheckCircleIcon className="w-12 h-12 text-green-600 dark:text-green-400" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-foreground">Email Verified!</h2>
                    <p className="text-muted-foreground">{t('verifyEmailSuccessMessage')}</p>
                  </div>
                  <Link
                    href={`/${locale}/auth/login`}
                    className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90"
                  >
                    {t('verifyEmailGoToLogin')}
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            )}

            {/* Error State */}
            {status === 'error' && (
              <div className="text-center space-y-6">
                <div className="flex items-center justify-center">
                  <div className="p-4 rounded-full bg-destructive/10">
                    <XCircleIcon className="w-12 h-12 text-destructive" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h2 className="text-lg font-semibold text-foreground">Verification Failed</h2>
                    <p className="text-muted-foreground">
                      {token ? t('verifyEmailErrorMessage') : t('verifyEmailErrorMissing')}
                    </p>
                    {detailedError && (
                      <p className="text-sm text-destructive bg-destructive/10 rounded-lg p-3 border border-destructive/20">
                        {detailedError}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3">
                    {token && (
                      <button
                        type="button"
                        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={handleRetry}
                        disabled={false}
                      >
                        <RefreshIcon className="w-4 h-4" />
                        {t('verifyEmailRetry')}
                      </button>
                    )}

                    <div className="flex flex-col gap-2">
                      <Link
                        href={`/${locale}/auth/login`}
                        className="px-4 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
                      >
                        {t('login')}
                      </Link>
                      <Link
                        href={`/${locale}/auth/register`}
                        className="px-4 py-2 rounded-lg border border-border text-foreground font-medium hover:bg-secondary transition-colors"
                      >
                        {t('register')}
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
