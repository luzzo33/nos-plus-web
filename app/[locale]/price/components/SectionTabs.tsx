'use client';

import { Eye, LineChart, Clock, BarChart3, Activity, Gauge, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFontScale } from '../hooks/useFontScale';
import { useTranslations } from 'next-intl';

interface SectionTabsProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isMobile: boolean;
}

const baseSections = [
  { id: 'overview', icon: Eye },
  { id: 'chart', icon: LineChart },
  { id: 'table', icon: Clock },
  { id: 'stats', icon: BarChart3 },
  { id: 'analysis', icon: Activity },
  { id: 'sentiment', icon: Gauge },
  { id: 'forecast', icon: Target },
];

export function SectionTabs({ activeSection, onSectionChange, isMobile }: SectionTabsProps) {
  const { text } = useFontScale();
  const t = useTranslations('price.sections');
  const sections = baseSections.map((s) => ({ ...s, label: t(s.id as any) }));

  if (isMobile) {
    return (
      <div className="bg-secondary/50 rounded-xl p-2 backdrop-blur-sm">
        <div className="grid grid-cols-3 gap-2">
          {sections.slice(0, 3).map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 rounded-lg font-medium transition-all',
                  text('xs', 'xs'),
                  activeSection === section.id
                    ? 'bg-background text-foreground shadow-md'
                    : 'text-muted-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {sections.slice(3, 5).map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
                  text('xs', 'xs'),
                  activeSection === section.id
                    ? 'bg-background text-foreground shadow-md'
                    : 'text-muted-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {sections.slice(5).map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={cn(
                  'flex items-center justify-center gap-2 py-3 rounded-lg font-medium transition-all',
                  text('xs', 'xs'),
                  activeSection === section.id
                    ? 'bg-background text-foreground shadow-md'
                    : 'text-muted-foreground',
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{section.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 p-1.5 bg-secondary/50 rounded-xl w-full overflow-x-auto backdrop-blur-sm">
      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <button
            key={section.id}
            onClick={() => onSectionChange(section.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap',
              text('sm', 'sm'),
              activeSection === section.id
                ? 'bg-background text-foreground shadow-md'
                : 'text-muted-foreground hover:text-foreground hover:bg-background/50',
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{section.label}</span>
          </button>
        );
      })}
    </div>
  );
}
