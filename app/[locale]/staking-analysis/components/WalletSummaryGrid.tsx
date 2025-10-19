'use client';

import { cn } from '@/lib/utils';
import { ArrowDownRight, ArrowUpRight, Activity } from 'lucide-react';
import { SkeletonBlock } from '@/components/ui/SkeletonBlock';

export type SummaryCard = {
  key: string;
  label: string;
  value: string;
  helper?: string;
  accent?: 'positive' | 'negative' | 'neutral';
};

export type SummarySection = {
  key: string;
  title: string;
  description?: string;
  cards: SummaryCard[];
};

const accentClasses: Record<NonNullable<SummaryCard['accent']>, string> = {
  positive: 'text-emerald-500',
  negative: 'text-red-500',
  neutral: 'text-primary',
};

export function WalletSummaryGrid({
  sections,
  className,
  loading = false,
}: {
  sections: SummarySection[];
  className?: string;
  loading?: boolean;
}) {
  return (
    <div className={cn('card-base p-6 md:p-8 border border-border/70 bg-background/95', className)}>
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-2 text-primary">
          <Activity className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-[0.28em]">Wallet overview</span>
        </div>
        <div className="flex flex-col gap-8">
          {sections.map((section) => (
            <div key={section.key} className="space-y-4">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <h2 className="text-lg md:text-xl font-semibold tracking-tight">{section.title}</h2>
                {section.description ? (
                  <p className="text-sm text-muted-foreground max-w-2xl">{section.description}</p>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {loading
                  ? Array.from({ length: section.cards.length || 4 }).map((_, index) => (
                      <div
                        key={`${section.key}-skeleton-${index}`}
                        className="rounded-2xl border border-border/70 bg-secondary/50 backdrop-blur-sm p-4"
                      >
                        <SkeletonBlock className="h-3 w-24 mb-3 rounded" />
                        <SkeletonBlock className="h-6 w-32 mb-2 rounded" />
                        <SkeletonBlock className="h-3 w-20 rounded" />
                      </div>
                    ))
                  : section.cards.map((card) => {
                      const accentClass = card.accent ? accentClasses[card.accent] : accentClasses.neutral;
                      return (
                        <div
                          key={card.key}
                          className="rounded-2xl border border-border/70 bg-secondary/50 backdrop-blur-sm p-4 hover:border-primary/40 transition"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              {card.label}
                            </span>
                            {card.accent === 'positive' ? (
                              <ArrowUpRight className={cn('h-4 w-4', accentClass)} />
                            ) : card.accent === 'negative' ? (
                              <ArrowDownRight className={cn('h-4 w-4', accentClass)} />
                            ) : null}
                          </div>
                          <div className={cn('mt-2 text-2xl font-semibold tracking-tight', accentClass)}>
                            {card.value}
                          </div>
                          {card.helper ? (
                            <p className="mt-1 text-xs text-muted-foreground leading-snug">{card.helper}</p>
                          ) : null}
                        </div>
                      );
                    })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
