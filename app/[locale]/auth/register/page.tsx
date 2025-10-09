'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TurnstileWidget } from '@/components/ui/TurnstileWidget';
import { getNosApiBase } from '@/lib/api/monitorConfig';

const NOS_API_BASE = getNosApiBase();

const UserPlusIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
    />
  </svg>
);

const MailIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
    />
  </svg>
);

const LockIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
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

const CheckIcon = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

export default function RegisterPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [turnstileReset, setTurnstileReset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [resendError, setResendError] = useState<string | null>(null);

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!captchaToken) {
      setError('CAPTCHA_REQUIRED');
      return;
    }
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const res = await fetch(`${NOS_API_BASE}/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaToken }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        const errorCode = body?.error?.code || 'REGISTER_FAILED';
        const err: any = new Error(errorCode);
        err.payload = body;
        throw err;
      }
      setMessage(t('registerSuccess'));
      setEmail('');
      setPassword('');
      setTurnstileReset((prev) => prev + 1);
      setPendingEmail(null);
      setResendStatus('idle');
      setTimeout(() => router.push(`/${locale}/auth/login`), 3000);
    } catch (err: any) {
      const code = err.message || 'REGISTER_FAILED';
      setError(code);
      const payload = err?.payload;
      if (payload?.error?.code === 'EMAIL_NOT_VERIFIED') {
        setPendingEmail(email.trim());
        setResendStatus(payload?.error?.emailSent ? 'sent' : 'idle');
        setResendError(null);
      } else {
        setPendingEmail(null);
      }
      setCaptchaToken(null);
      setTurnstileReset((prev) => prev + 1);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pendingEmail || resendStatus === 'sending') return;
    setResendStatus('sending');
    setResendError(null);
    try {
      const res = await fetch(`${NOS_API_BASE}/v1/auth/resend-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: pendingEmail }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.success) {
        throw new Error(body?.error?.code || 'RESEND_FAILED');
      }
      setResendStatus('sent');
    } catch (err: any) {
      setResendStatus('error');
      setResendError(err?.message || 'RESEND_FAILED');
    }
  };

  return (
    <div className="gradient-subtle min-h-screen flex items-start justify-center p-4 pt-6 sm:pt-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-primary shadow-lg mb-3">
            <UserPlusIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-gradient mb-1">{t('registerTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('registerSubtitle')}</p>
        </div>

        {/* Success Message */}
        {message && (
          <div className="mb-6 p-5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 p-2 rounded-lg bg-green-100 dark:bg-green-800">
                <CheckIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-green-800 dark:text-green-200 font-medium">{message}</div>
            </div>
          </div>
        )}

        {/* Register Form */}
        <div className="card-base p-6 shadow-soft">
          <form className="space-y-6" onSubmit={handleRegister}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MailIcon className="w-4 h-4 text-muted-foreground" />
                {t('email')}
              </label>
              <input
                type="email"
                required
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground transition-colors focus:ring-2 focus:ring-ring focus:border-ring"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <LockIcon className="w-4 h-4 text-muted-foreground" />
                {t('password')}
              </label>
              <input
                type="password"
                required
                minLength={8}
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground transition-colors focus:ring-2 focus:ring-ring focus:border-ring"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Create a secure password"
              />
              <p className="text-xs text-muted-foreground">{t('passwordHint')}</p>
            </div>

            {/* Captcha */}
            <div className="p-4 rounded-xl bg-secondary border border-border">
              <TurnstileWidget
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
                resetSignal={turnstileReset}
              />
            </div>

            {/* Error Messages */}
            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                {error === 'EMAIL_NOT_VERIFIED'
                  ? t('verifyEmailNotice')
                  : t(`errors.${error}`, { defaultValue: t('errors.generic') })}
              </div>
            )}

            {/* Email Verification Pending */}
            {pendingEmail && (
              <div className="p-5 rounded-xl bg-primary/5 border border-primary/20 space-y-4 animate-fade-in">
                <p className="text-foreground text-sm font-medium">
                  {t('verifyEmailPending', { email: pendingEmail })}
                </p>
                <button
                  type="button"
                  className="w-full px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleResend}
                  disabled={resendStatus === 'sending'}
                >
                  {resendStatus === 'sending' ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      {t('loading')}
                    </div>
                  ) : (
                    t('resendVerification')
                  )}
                </button>
                {resendStatus === 'sent' && (
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    {t('resendSent')}
                  </p>
                )}
                {resendStatus === 'error' && (
                  <p className="text-xs text-destructive">
                    {resendError
                      ? t(`errors.${resendError}`, { defaultValue: t('resendFailed') })
                      : t('resendFailed')}
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              className="w-full px-6 py-4 rounded-xl bg-primary text-primary-foreground font-semibold transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
              ) : (
                <>
                  {t('register')}
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Login Link */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            {t('haveAccount')}{' '}
            <Link
              href={`/${locale}/auth/login`}
              className="font-semibold text-primary hover:text-primary/80 transition-colors underline"
            >
              {t('login')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
