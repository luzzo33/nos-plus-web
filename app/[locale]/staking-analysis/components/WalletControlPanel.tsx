'use client';

import { useMemo } from 'react';
import { Search, RefreshCcw, Copy, ExternalLink, Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type WalletControlPanelProps = {
  className?: string;
  wallet: string;
  onWalletChange: (value: string) => void;
  onSubmit: () => void;
  submitting?: boolean;
  disabled?: boolean;
  onForceRefresh?: () => void;
  forceRefreshing?: boolean;
  lastUpdated?: string | null;
  stakeAddress?: string | null;
  error?: string | null;
};

function formatTimestamp(value?: string | null) {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return value;
  }
}

export function WalletControlPanel({
  className,
  wallet,
  onWalletChange,
  onSubmit,
  submitting = false,
  disabled = false,
  onForceRefresh,
  forceRefreshing = false,
  lastUpdated,
  stakeAddress,
  error,
}: WalletControlPanelProps) {
  const formattedUpdated = useMemo(() => formatTimestamp(lastUpdated), [lastUpdated]);

  const handleCopy = () => {
    if (!wallet) return;
    navigator.clipboard?.writeText(wallet).catch(() => {});
  };

  const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      onSubmit();
    }
  };

  return (
    <div
      className={cn(
        'card-base px-6 py-6 md:px-8 md:py-7 shadow-sm bg-gradient-to-br from-primary/[0.04] via-background to-background border border-border/70',
        className,
      )}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-semibold uppercase tracking-[0.28em]">Wallet Intelligence</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Explore advanced NOS staking insights for any Solana wallet
          </h1>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl">
            Paste a Solana wallet or staking account to unlock lifecycle analytics, transaction traces,
            and bespoke earnings intelligence.
          </p>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                value={wallet}
                onChange={(event) => onWalletChange(event.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Enter a Solana wallet, staking, or token account address"
                className="w-full rounded-xl border border-border/70 bg-background/90 pl-11 pr-12 py-3 text-sm md:text-base font-medium shadow-inner focus:outline-none focus:ring-2 focus:ring-primary/40"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                disabled={submitting || disabled || forceRefreshing}
              />
              <button
                type="button"
                aria-label="Copy wallet"
                onClick={handleCopy}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg border border-border/60 p-1.5 text-muted-foreground hover:text-foreground hover:border-border transition"
              >
                <Copy className="h-4 w-4" />
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onSubmit}
                disabled={!wallet || submitting || disabled}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition',
                  'bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {submitting ? 'Analyzing…' : 'Analyze Wallet'}
              </button>
              {onForceRefresh ? (
                <button
                  type="button"
                  onClick={onForceRefresh}
                  disabled={!wallet || submitting || forceRefreshing || disabled}
                className={cn(
                  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition border border-border/70',
                  'text-foreground hover:bg-secondary disabled:opacity-60 disabled:cursor-not-allowed',
                )}
              >
                {forceRefreshing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCcw className="h-4 w-4" />
                )}
                {forceRefreshing ? 'Syncing…' : 'Sync Latest'}
              </button>
              ) : null}
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center gap-2 text-xs md:text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">Last processed</span>
              <span>{formattedUpdated}</span>
            </div>
            {stakeAddress ? (
              <div className="flex items-center gap-1">
                <span className="hidden md:inline-block">•</span>
                <span className="font-medium text-foreground">Stake account</span>
                <a
                  href={`https://solscan.io/account/${stakeAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  {stakeAddress.slice(0, 4)}…{stakeAddress.slice(-4)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ) : null}
          </div>
          {error ? (
            <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-4 py-3 text-sm text-red-500">
              {error}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
