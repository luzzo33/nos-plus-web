'use client';

import { useState } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { signIn } from 'next-auth/react';

const UserIcon = ({ className = 'w-5 h-5' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
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

export default function LoginPage() {
  const t = useTranslations('auth');
  const locale = useLocale();
  const router = useRouter();
  const search = useSearchParams();
  const callbackUrl = search.get('callbackUrl') || `/${locale}/api-keys`;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
      callbackUrl,
    });
    setLoading(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    router.push(callbackUrl);
  };

  return (
    <div className="gradient-subtle min-h-screen flex items-start sm:items-center justify-center p-4 pt-10 sm:pt-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-primary shadow-lg mb-3">
            <UserIcon className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-primary-gradient mb-1">{t('loginTitle')}</h1>
          <p className="text-sm text-muted-foreground">{t('loginSubtitle')}</p>
        </div>

        {/* Login Form */}
        <div className="card-base p-6 shadow-soft">
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-foreground flex items-center gap-2">
                <UserIcon className="w-4 h-4 text-muted-foreground" />
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
                className="w-full px-4 py-3 rounded-xl border border-input bg-background text-sm text-foreground transition-colors focus:ring-2 focus:ring-ring focus:border-ring"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-sm animate-fade-in">
                {t(`errors.${error}`, { defaultValue: t('errors.generic') })}
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
                  {t('login')}
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Register Link */}
        <div className="text-center mt-8">
          <p className="text-sm text-muted-foreground">
            {t('noAccount')}{' '}
            <Link
              href={`/${locale}/auth/register`}
              className="font-semibold text-primary hover:text-primary/80 transition-colors underline"
            >
              {t('register')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
