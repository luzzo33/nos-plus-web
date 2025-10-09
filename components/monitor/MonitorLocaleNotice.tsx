'use client';

import { useCallback, useEffect, useMemo, useState, useId } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { Locale } from '@/i18n.config';
import { localeFlags, localeNames } from '@/i18n.config';

const STORAGE_PREFIX = 'monitor-locale-notice-v1';

export function MonitorLocaleNotice() {
  const locale = useLocale() as Locale;

  if (locale === 'en') {
    return null;
  }

  return <MonitorLocaleNoticeContent locale={locale} />;
}

function MonitorLocaleNoticeContent({ locale }: { locale: Locale }) {
  const t = useTranslations('monitor.localeNotice');
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [persist, setPersist] = useState(false);
  const checkboxId = useId();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `${STORAGE_PREFIX}-${locale}`;
    const dismissed = window.localStorage.getItem(key);
    if (!dismissed) {
      setIsOpen(true);
    }
  }, [locale]);

  const rememberDismissal = useCallback(() => {
    if (!persist || typeof window === 'undefined') return;
    const key = `${STORAGE_PREFIX}-${locale}`;
    window.localStorage.setItem(key, 'dismissed');
  }, [locale, persist]);

  const handleContinue = useCallback(() => {
    rememberDismissal();
    setIsOpen(false);
  }, [rememberDismissal]);

  const handleLeave = useCallback(() => {
    rememberDismissal();
    router.push(`/${locale}`);
  }, [rememberDismissal, router, locale]);

  const handleClose = useCallback(() => {
    rememberDismissal();
    setIsOpen(false);
  }, [rememberDismissal]);

  const flag = useMemo(() => localeFlags[locale] ?? '🌐', [locale]);
  const languageName = useMemo(() => localeNames[locale] ?? locale.toUpperCase(), [locale]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />
      <div className="relative z-10 w-full max-w-sm rounded-xl border border-border bg-background p-6 shadow-2xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="text-5xl" aria-hidden="true">
            {flag}
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">{t('title', { language: languageName })}</h2>
            <p className="text-sm text-muted-foreground">
              {t('description', { language: languageName })}
            </p>
          </div>
          <label
            htmlFor={checkboxId}
            className="flex w-full items-center gap-3 rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-sm font-medium"
          >
            <input
              id={checkboxId}
              type="checkbox"
              checked={persist}
              onChange={(event) => setPersist(event.target.checked)}
              className="h-4 w-4 accent-primary"
            />
            <span>{t('dontShowAgain')}</span>
          </label>
          <div className="flex w-full flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={handleContinue}
              className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t('continue')}
            </button>
            <button
              type="button"
              onClick={handleLeave}
              className="w-full rounded-lg border border-input px-4 py-2 text-sm font-medium transition-colors hover:bg-muted"
            >
              {t('leave')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
