'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { buildNosApiUrl } from '@/lib/api/monitorConfig';

const CONSENT_COOKIE = 'eu_cookie_consent';
async function detectGeo(): Promise<boolean> {
  try {
    const endpoint = buildNosApiUrl('/v3/geo');
    const response = await fetch(endpoint, {
      headers: {
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      return false;
    }

    const payload = (await response.json()) as { success?: boolean; isEU?: boolean };
    if (payload?.success === false) return false;
    return Boolean(payload?.isEU);
  } catch {
    return false;
  }
}

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const cookies = document.cookie ? document.cookie.split('; ') : [];
  for (const raw of cookies) {
    const [key, ...rest] = raw.split('=');
    if (key === name) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return null;
}

function writeCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const maxAge = Math.max(1, Math.floor(days * 24 * 60 * 60));
  const secure =
    typeof window !== 'undefined' && window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function setSessionFlag(value: string) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem('eu-cookie-region', value);
  } catch (error) {}
}

function getSessionFlag(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage.getItem('eu-cookie-region');
  } catch (error) {
    return null;
  }
}

export function CookieBanner() {
  const [shouldShow, setShouldShow] = useState(false);
  const [checked, setChecked] = useState(false);
  const t = useTranslations('common.cookieBanner');
  const locale = useLocale();

  useEffect(() => {
    const consent = readCookie(CONSENT_COOKIE);
    if (consent === 'accepted') {
      setChecked(true);
      setSessionFlag('accepted');
      return;
    }

    const sessionStatus = getSessionFlag();
    if (sessionStatus === 'non-eu') {
      setChecked(true);
      return;
    }

    let cancelled = false;

    (async () => {
      const result = await detectGeo();
      if (cancelled) return;

      if (result) {
        setShouldShow(true);
        setSessionFlag('eu');
      } else {
        setSessionFlag('non-eu');
      }

      setChecked(true);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleAccept = () => {
    writeCookie(CONSENT_COOKIE, 'accepted', 365);
    setSessionFlag('accepted');
    setShouldShow(false);
  };

  if (!checked || !shouldShow) {
    return null;
  }

  const legalHref = `/${locale}/privacy`;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 px-4">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-border bg-card/95 p-4 text-sm text-card-foreground shadow-soft backdrop-blur">
        <div className="flex flex-col gap-2">
          <p className="text-base font-semibold">{t('title')}</p>
          <p className="text-sm text-muted-foreground">{t('body')}</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={legalHref}
            className="text-sm font-medium text-primary underline decoration-dotted underline-offset-2 hover:text-primary/80"
          >
            {t('review')}
          </Link>
          <button
            type="button"
            onClick={handleAccept}
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background hover:bg-primary/90"
          >
            {t('accept')}
          </button>
        </div>
      </div>
    </div>
  );
}
