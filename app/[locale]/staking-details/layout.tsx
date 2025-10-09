import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { createPageMetadata } from '@/lib/seo/metadata';
import { resolveLocale } from '@/lib/seo/config';

type Params = {
  locale: string;
};

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: resolveLocale(locale),
    page: 'stakingDetails',
    pathSegments: ['staking-details'],
  });
}

export default function StakingDetailsLayout({ children }: { children: ReactNode }) {
  return children;
}
