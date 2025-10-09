import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { createPageMetadata } from '@/lib/seo/metadata';
import { resolveLocale } from '@/lib/seo/config';

const LAST_UPDATED = 'September 28, 2025';
const SECTION_ORDER = [
  'intro',
  'dataWeCollect',
  'usage',
  'platformData',
  'sharing',
  'retention',
  'security',
  'international',
  'choices',
  'children',
  'updates',
  'contact',
] as const;

type SectionKey = (typeof SECTION_ORDER)[number];
type SectionContent = {
  title: string;
  body: string[];
  items?: string[];
};

function toArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.length > 0);
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return createPageMetadata({
    locale: resolveLocale(locale),
    page: 'privacy',
    pathSegments: ['privacy'],
  });
}

export default async function PrivacyPolicyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'legal' });

  const heading = {
    title: t('privacy.hero.title'),
    subtitle: t('privacy.hero.subtitle'),
    updated: t('meta.lastUpdated', { date: LAST_UPDATED }),
  };

  const sectionMap = t.raw('privacy.sections') as Partial<Record<SectionKey, SectionContent>>;
  const sections = SECTION_ORDER.map((key) => {
    const section = sectionMap[key];
    const body = toArray(section?.body ?? []);
    const items = toArray(section?.items ?? []);
    return {
      key,
      title: section?.title ?? '',
      body,
      items,
    };
  });

  return (
    <div className="max-w-5xl mx-auto space-y-12">
      <header className="text-center space-y-4">
        <div className="inline-flex items-center justify-center px-4 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider">
          {heading.updated}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground">{heading.title}</h1>
        <p className="text-base md:text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
          {heading.subtitle}
        </p>
      </header>

      <section className="space-y-8">
        {sections.map((section) => (
          <article
            key={section.key}
            className="rounded-2xl border border-border/60 bg-background/60 shadow-sm p-6 md:p-8 space-y-4"
          >
            <h2 className="text-xl md:text-2xl font-semibold text-foreground">{section.title}</h2>
            {section.body.map((paragraph, index) => (
              <p key={index} className="text-muted-foreground leading-relaxed text-sm md:text-base">
                {paragraph}
              </p>
            ))}
            {section.items.length > 0 ? (
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground text-sm md:text-base">
                {section.items.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
