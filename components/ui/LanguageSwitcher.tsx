'use client';

import { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { locales, localeNames, localeFlags, type Locale } from '@/i18n.config';
import { cn } from '@/lib/utils';

export function LanguageSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();
  const pathname = usePathname();
  const locale = useLocale() as Locale;

  const handleLanguageChange = (newLocale: Locale) => {
    const path = pathname.replace(/^\/[a-z]{2}/, '');

    startTransition(() => {
      router.push(`/${newLocale}${path}`);
      router.refresh();
    });

    setIsOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-secondary transition-colors',
          isPending && 'opacity-70 cursor-wait',
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        disabled={isPending}
      >
        <Globe className="w-4 h-4" />
        <span className="hidden sm:inline text-sm font-medium">
          {localeFlags[locale]} {localeNames[locale]}
        </span>
        <span className="sm:hidden text-sm font-medium">{localeFlags[locale]}</span>
        <ChevronDown className={cn('w-3 h-3 transition-transform', isOpen && 'rotate-180')} />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute right-0 mt-2 bg-card border border-border rounded-lg shadow-lg z-50 min-w-[180px] overflow-hidden"
            >
              {locales.map((loc) => (
                <button
                  key={loc}
                  onClick={() => handleLanguageChange(loc)}
                  disabled={isPending}
                  className={cn(
                    'flex items-center justify-between w-full px-4 py-2.5 text-sm transition-colors',
                    locale === loc ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
                    isPending && 'opacity-70 cursor-wait',
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span>{localeFlags[loc]}</span>
                    <span>{localeNames[loc]}</span>
                  </span>
                  {locale === loc && <Check className="w-4 h-4" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
