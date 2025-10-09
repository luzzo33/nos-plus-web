'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from 'next-themes';
import { useTranslations, useLocale } from 'next-intl';
import {
  Home,
  TrendingUp,
  BarChart3,
  Menu,
  X,
  Sun,
  Moon,
  Loader2,
  Users,
  ChevronDown,
  DollarSign,
  Activity,
  Coins,
  Layers,
  Search,
  Key,
  BookText,
  Newspaper,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from '@/components/ui/LanguageSwitcher';
import { SentimentIndicator } from '@/components/ui/SentimentIndicator';
import { useAlphaModal } from '@/components/providers/AlphaModalProvider';

interface DropdownState {
  [key: string]: boolean;
}

export function Navbar() {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [dropdownState, setDropdownState] = useState<DropdownState>({});
  const [mounted, setMounted] = useState(false);
  const { showModal } = useAlphaModal();
  const t = useTranslations('nav');
  const locale = useLocale();

  const pathWithoutLocale = pathname.replace(`/${locale}`, '') || '/';

  const navigationCategories = [
    {
      id: 'dashboard',
      label: t('dashboard'),
      icon: Home,
      href: '/',
      type: 'single' as const,
    },
    {
      id: 'market',
      label: t('marketData'),
      icon: DollarSign,
      type: 'dropdown' as const,
      items: [
        {
          href: '/price',
          label: t('price'),
          icon: TrendingUp,
          description: t('descriptions.price'),
        },
        {
          href: '/volume',
          label: t('volume'),
          icon: BarChart3,
          description: t('descriptions.volume'),
        },
        {
          href: '/holders',
          label: t('holders'),
          icon: Users,
          description: t('descriptions.holders'),
        },
      ],
    },
    {
      id: 'staking',
      label: t('staking'),
      icon: Coins,
      type: 'dropdown' as const,
      items: [
        {
          href: '/stakers-unstakers',
          label: t('stakersUnstakers'),
          icon: Users,
          description: t('descriptions.stakersUnstakers'),
        },
        {
          href: '/staking-details',
          label: t('stakingDetails'),
          icon: Layers,
          description: t('descriptions.stakingDetails'),
        },
        {
          href: '/staking-dapp',
          label: t('stakingDapp'),
          icon: Layers,
          description: t('descriptions.stakingDapp'),
        },
      ],
    },
    {
      id: 'trading',
      label: t('trading'),
      icon: Activity,
      type: 'dropdown' as const,
      items: [
        {
          href: '/monitor',
          label: t('monitor'),
          icon: BarChart3,
          description: t('descriptions.monitor'),
        },
        {
          href: '/analysis',
          label: t('analysis'),
          icon: Search,
          description: t('descriptions.analysis'),
        },
        {
          href: '/raydium',
          label: t('raydium'),
          icon: Activity,
          description: t('descriptions.raydium'),
        },
      ],
    },
    {
      id: 'resources',
      label: t('resources'),
      icon: BookText,
      type: 'dropdown' as const,
      items: [
        {
          href: '/api-keys',
          label: t('apiKeys'),
          icon: Key,
          description: t('descriptions.apiKeys'),
        },
        { href: '/docs', label: t('docs'), icon: BookText, description: t('descriptions.docs') },
        { href: '/blog', label: t('blog'), icon: Newspaper, description: t('descriptions.blog') },
      ],
    },
  ];

  const toggleDropdown = (categoryId: string) => {
    setDropdownState((prev) => {
      const isCurrentlyOpen = prev[categoryId];
      return isCurrentlyOpen ? {} : { [categoryId]: true };
    });
  };

  const closeAllDropdowns = () => {
    setDropdownState({});
  };

  const isCategoryActive = (category: (typeof navigationCategories)[0]) => {
    if (category.type === 'single') {
      return pathWithoutLocale === category.href;
    }
    return category.items?.some((item) => pathWithoutLocale === item.href);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.dropdown-container') && !target.closest('button')) {
        closeAllDropdowns();
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border"
    >
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 relative">
            <motion.div
              className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-white font-bold text-sm">N</span>
            </motion.div>
            <span className="text-xl font-semibold inline-flex items-start gap-1">
              NOS.plus
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  showModal();
                }}
                className="text-[8px] font-medium bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded px-1 py-0.5 leading-none hover:bg-orange-500/30 hover:text-orange-300 transition-colors cursor-pointer"
              >
                ALPHA
              </button>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-3">
            {navigationCategories.map((category) => {
              const Icon = category.icon;
              const isActive = isCategoryActive(category);
              const isDropdownOpen = Boolean(dropdownState[category.id]);

              if (category.type === 'single') {
                return (
                  <Link key={category.id} href={category.href!} className="relative">
                    <motion.div
                      className={cn(
                        'flex items-center gap-2 px-4 py-2 mx-1 rounded-lg text-sm font-medium transition-all',
                        isActive
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                      )}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <Icon className="w-4 h-4" />
                      {category.label}
                    </motion.div>
                  </Link>
                );
              }

              return (
                <div key={category.id} className="relative dropdown-container">
                  <motion.button
                    onClick={() => toggleDropdown(category.id)}
                    type="button"
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 mx-1 rounded-lg text-sm font-medium transition-all',
                      isActive || isDropdownOpen
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                    )}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Icon className="w-4 h-4" />
                    {category.label}
                    <motion.div
                      animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </motion.div>
                  </motion.button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className="absolute top-full left-0 mt-2 min-w-[280px] bg-card border border-border rounded-xl shadow-xl z-50"
                      >
                        <div className="p-2">
                          {category.items?.map((item, index) => {
                            const ItemIcon = item.icon;
                            const isItemActive = pathWithoutLocale === item.href;

                            return (
                              <motion.div
                                key={item.href}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.05 }}
                              >
                                <Link
                                  href={item.href}
                                  onClick={closeAllDropdowns}
                                  className={cn(
                                    'flex items-center gap-3 p-3 rounded-lg transition-all hover:bg-secondary group',
                                    isItemActive && 'bg-secondary',
                                  )}
                                >
                                  <div
                                    className={cn(
                                      'p-2 rounded-lg transition-colors',
                                      isItemActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'bg-secondary group-hover:bg-primary group-hover:text-primary-foreground',
                                    )}
                                  >
                                    <ItemIcon className="w-4 h-4" />
                                  </div>
                                  <div className="flex-1">
                                    <div
                                      className={cn(
                                        'font-medium text-sm',
                                        isItemActive
                                          ? 'text-foreground'
                                          : 'text-foreground group-hover:text-foreground',
                                      )}
                                    >
                                      {item.label}
                                    </div>
                                    <div className="text-xs text-muted-foreground group-hover:text-muted-foreground/80">
                                      {item.description}
                                    </div>
                                  </div>
                                </Link>
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            {/* Sentiment Indicator - Desktop only */}
            <div className="hidden md:block">
              <SentimentIndicator />
            </div>

            {/* Language Switcher */}
            <LanguageSwitcher />

            {/* Theme Toggle */}
            <motion.button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label={t('toggleTheme')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {!mounted ? (
                  <motion.div
                    key="loader"
                    initial={{ opacity: 0, rotate: 0 }}
                    animate={{ opacity: 1, rotate: 360 }}
                    exit={{ opacity: 0 }}
                    transition={{ rotate: { duration: 1, repeat: Infinity, ease: 'linear' } }}
                  >
                    <Loader2 className="w-5 h-5" />
                  </motion.div>
                ) : theme === 'dark' ? (
                  <motion.div
                    key="sun"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Sun className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="moon"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Moon className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>

            {/* Mobile Menu Toggle */}
            <motion.button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-secondary transition-colors"
              aria-label={t('toggleMenu')}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ opacity: 0, rotate: -90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: 90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <X className="w-5 h-5" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, rotate: 90 }}
                    animate={{ opacity: 1, rotate: 0 }}
                    exit={{ opacity: 0, rotate: -90 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Menu className="w-5 h-5" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="md:hidden overflow-hidden"
            >
              <div className="py-4 border-t border-border">
                <div className="flex flex-col gap-3">
                  {navigationCategories.map((category, categoryIndex) => {
                    const Icon = category.icon;
                    const isActive = isCategoryActive(category);
                    const isDropdownOpen = Boolean(dropdownState[`mobile-${category.id}`]);

                    if (category.type === 'single') {
                      return (
                        <motion.div
                          key={category.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: categoryIndex * 0.1 }}
                        >
                          <Link
                            href={category.href!}
                            onClick={() => setMobileMenuOpen(false)}
                            className={cn(
                              'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                              isActive
                                ? 'bg-primary text-primary-foreground'
                                : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            {category.label}
                          </Link>
                        </motion.div>
                      );
                    }

                    return (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: categoryIndex * 0.1 }}
                        className="space-y-2"
                      >
                        {/* Category Header */}
                        <button
                          onClick={() => toggleDropdown(`mobile-${category.id}`)}
                          className={cn(
                            'w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all',
                            isActive || isDropdownOpen
                              ? 'bg-primary text-primary-foreground'
                              : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className="w-5 h-5" />
                            {category.label}
                          </div>
                          <motion.div
                            animate={{ rotate: isDropdownOpen ? 180 : 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </motion.div>
                        </button>

                        {/* Category Items */}
                        <AnimatePresence>
                          {isDropdownOpen && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden pl-4"
                            >
                              <div className="space-y-2 py-2 border-l-2 border-border pl-4">
                                {category.items?.map((item, index) => {
                                  const ItemIcon = item.icon;
                                  const isItemActive = pathWithoutLocale === item.href;

                                  return (
                                    <motion.div
                                      key={item.href}
                                      initial={{ opacity: 0, x: -10 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      transition={{ delay: index * 0.05 }}
                                    >
                                      <Link
                                        href={item.href}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className={cn(
                                          'flex items-center gap-3 p-3 rounded-lg transition-all',
                                          isItemActive
                                            ? 'bg-secondary text-foreground'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-secondary',
                                        )}
                                      >
                                        <div
                                          className={cn(
                                            'p-1.5 rounded-md transition-colors',
                                            isItemActive
                                              ? 'bg-primary text-primary-foreground'
                                              : 'bg-secondary',
                                          )}
                                        >
                                          <ItemIcon className="w-4 h-4" />
                                        </div>
                                        <div>
                                          <div className="font-medium text-sm">{item.label}</div>
                                          <div className="text-xs text-muted-foreground">
                                            {item.description}
                                          </div>
                                        </div>
                                      </Link>
                                    </motion.div>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>

                {/* Mobile Sentiment Indicator at bottom */}
                <div className="mt-4 pt-4 border-t border-border px-4">
                  <SentimentIndicator isMobile={true} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
}
