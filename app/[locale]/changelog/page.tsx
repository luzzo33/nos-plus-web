import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo/metadata';
import { resolveLocale } from '@/lib/seo/config';
import { ChangelogContent } from '@/components/changelog/ChangelogContent';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;

  return createPageMetadata({
    locale: resolveLocale(locale),
    page: 'changelog',
    pathSegments: ['changelog'],
  });
}

export default function ChangelogPage() {
  return <ChangelogContent />;
}
