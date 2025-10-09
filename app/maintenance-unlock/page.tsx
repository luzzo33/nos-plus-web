import { getTranslations } from 'next-intl/server';
import { defaultLocale } from '@/i18n.config';

export const dynamic = 'force-static';

export default async function MaintenanceUnlockStub() {
  const t = await getTranslations({ locale: defaultLocale, namespace: 'maintenance' });

  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-neutral-500 p-6">
      <div>
        <p className="font-medium mb-2">{t('unlockPage.title')}</p>
        <p>{t('unlockPage.description')}</p>
      </div>
    </div>
  );
}
