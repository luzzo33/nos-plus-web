'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { Wallet, ArrowRight, Sparkles, Shield, Zap, TrendingUp, Loader2 } from 'lucide-react';

interface WalletInputProps {
  onSubmit: (wallet: string) => void;
  defaultValue?: string;
  loading?: boolean;
  errorMessage?: string | null;
}

export function WalletInput({
  onSubmit,
  defaultValue = '',
  loading = false,
  errorMessage = null,
}: WalletInputProps) {
  const [wallet, setWallet] = useState(defaultValue);
  const [isFocused, setIsFocused] = useState(false);
  const t = useTranslations('stakingAnalysis.walletInput');

  useEffect(() => {
    setWallet(defaultValue);
  }, [defaultValue]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (loading) return;
    if (wallet.trim()) {
      onSubmit(wallet.trim());
    }
  };

  const isDisabled = loading || !wallet.trim();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 md:py-20">
      <div className="w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-8"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring', stiffness: 200, damping: 15 }}
              className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500 shadow-2xl shadow-primary/50"
            >
              <Wallet className="h-10 w-10 text-white" />
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-4 bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-5xl lg:text-6xl"
            >
              {t('title')}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mx-auto max-w-xl text-lg text-muted-foreground"
            >
              {t('description')}
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <div className="card-base overflow-hidden p-8 shadow-2xl">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label htmlFor="wallet" className="mb-3 block text-sm font-semibold text-foreground">
                    {t('label')}
                  </label>
                  <div className="relative">
                    <input
                      id="wallet"
                      type="text"
                      value={wallet}
                      onChange={(event) => setWallet(event.target.value)}
                      onFocus={() => setIsFocused(true)}
                      onBlur={() => setIsFocused(false)}
                      placeholder={t('placeholder')}
                      className="w-full rounded-xl border-2 border-border bg-background px-4 py-4 pr-12 font-mono text-sm transition-all duration-300 placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
                    />
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: isFocused ? 1 : 0 }}
                      className="absolute right-4 top-1/2 -translate-y-1/2"
                    >
                      <Sparkles className="h-5 w-5 text-primary" />
                    </motion.div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('helper')}
                  </p>
                  {errorMessage && (
                    <p className="mt-2 text-xs font-medium text-rose-500">
                      {errorMessage}
                    </p>
                  )}
                </div>

                <motion.button
                  type="submit"
                  disabled={isDisabled}
                  whileHover={{ scale: isDisabled ? 1 : 1.02 }}
                  whileTap={{ scale: isDisabled ? 1 : 0.98 }}
                  className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-primary to-purple-500 px-6 py-4 font-semibold text-white shadow-lg shadow-primary/50 transition-all disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
                >
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        {t('loading')}
                      </>
                    ) : (
                      <>
                        {t('submit')}
                        <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                      </>
                    )}
                  </span>
                  {!loading && (
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-purple-500 to-primary"
                      initial={{ x: '100%' }}
                      whileHover={{ x: 0 }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </motion.button>
              </form>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="grid gap-4 sm:grid-cols-3"
          >
            {[
              {
                icon: Shield,
                title: t('features.secure.title'),
                description: t('features.secure.description'),
                color: 'text-green-500',
              },
              {
                icon: Zap,
                title: t('features.fast.title'),
                description: t('features.fast.description'),
                color: 'text-yellow-500',
              },
              {
                icon: TrendingUp,
                title: t('features.detailed.title'),
                description: t('features.detailed.description'),
                color: 'text-blue-500',
              },
            ].map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 + index * 0.1 }}
                  className="flex flex-col items-center rounded-xl border border-border/30 bg-background/50 p-4 text-center backdrop-blur-sm"
                >
                  <div className={`mb-2 rounded-lg bg-secondary/50 p-2 ${feature.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground">{feature.description}</p>
                </motion.div>
              );
            })}
          </motion.div>

        </motion.div>
      </div>
    </div>
  );
}
