'use client';

import Link from 'next/link';
import { useTranslations, useLocale } from 'next-intl';

export default function LocaleNotFound() {
  const t = useTranslations('common');
  const locale = useLocale();

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
        <h2 className="text-2xl font-semibold mb-4">{t('notFound.title')}</h2>
        <p className="text-muted-foreground mb-8">{t('notFound.description')}</p>
        <div className="flex gap-4 justify-center">
          <Link
            href={`/${locale}`}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            {t('notFound.goHome')}
          </Link>
        </div>
      </div>
    </div>
  );
}
