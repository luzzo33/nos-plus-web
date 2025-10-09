import { SimpleDashboard } from '@/components/simple-dashboard/SimpleDashboard';
import type { Metadata } from 'next';
import { createPageMetadata } from '@/lib/seo/metadata';
import { resolveLocale } from '@/lib/seo/config';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: resolveLocale(locale),
    page: 'simple',
    pathSegments: ['simple'],
  });
}

export default function SimpleDashboardPage() {
  return <SimpleDashboard />;
}
