'use client';

import { cn } from '@/lib/utils';
import type { StakeStatus, StakingStakeAccountDetails } from '@/lib/api/types';
import {
  ShieldCheck,
  Hourglass,
  Unlock,
  PauseCircle,
  Power,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';

type StatusConfig = {
  label: string;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  badgeClasses: string;
  badgeLabel?: string;
};

const STATUS_CONFIG: Record<StakeStatus, StatusConfig> = {
  active: {
    label: 'Active Stake',
    icon: ShieldCheck,
    iconColor: 'text-emerald-500',
    iconBg: 'from-emerald-500/20 to-emerald-500/10',
    badgeClasses: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  },
  cooldown: {
    label: 'Unstaking In Progress',
    icon: Hourglass,
    iconColor: 'text-amber-500',
    iconBg: 'from-amber-500/20 to-amber-500/10',
    badgeClasses: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
    badgeLabel: 'unstaking',
  },
  ready_to_withdraw: {
    label: 'Ready To Withdraw',
    icon: Unlock,
    iconColor: 'text-sky-500',
    iconBg: 'from-sky-500/20 to-sky-500/10',
    badgeClasses: 'border-sky-500/40 bg-sky-500/10 text-sky-500',
  },
  inactive: {
    label: 'Stake Inactive',
    icon: PauseCircle,
    iconColor: 'text-muted-foreground',
    iconBg: 'from-muted/30 to-muted/20',
    badgeClasses: 'border-muted-foreground/40 bg-muted/20 text-muted-foreground',
  },
  not_staked: {
    label: 'No Stake Detected',
    icon: Power,
    iconColor: 'text-muted-foreground',
    iconBg: 'from-muted/30 to-muted/20',
    badgeClasses: 'border-muted-foreground/40 bg-muted/20 text-muted-foreground',
  },
  unknown: {
    label: 'Status Unknown',
    icon: HelpCircle,
    iconColor: 'text-purple-500',
    iconBg: 'from-purple-500/20 to-purple-500/10',
    badgeClasses: 'border-purple-500/40 bg-purple-500/10 text-purple-500',
  },
};

function formatNumber(value: number | null | undefined): string | null {
  if (value == null || Number.isNaN(value)) return null;
  return value.toLocaleString(undefined, {
    maximumFractionDigits: value < 1 ? 4 : 2,
  });
}

function formatNosAmount(value: number | null | undefined): string | null {
  const formatted = formatNumber(value);
  return formatted ? `${formatted} NOS` : null;
}

function formatDurationDays(days: number | null | undefined): string | null {
  if (days == null || Number.isNaN(days) || !Number.isFinite(days)) return null;
  if (days <= 0) return '< 1 day';
  const rounded = Math.round(days);
  const approxMonths = Math.round(days / 30);
  if (approxMonths >= 2) {
    return `${rounded} days (~${approxMonths} mo)`;
  }
  return `${rounded} days`;
}

function formatCountdown(seconds: number | null | undefined): string | null {
  if (seconds == null || Number.isNaN(seconds) || !Number.isFinite(seconds)) return null;
  const clamped = Math.max(0, Math.floor(seconds));
  const days = Math.floor(clamped / 86400);
  const hours = Math.floor((clamped % 86400) / 3600);
  const minutes = Math.floor((clamped % 3600) / 60);
  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (parts.length === 0) {
    parts.push(`${clamped}s`);
  }
  return parts.join(' ');
}

function formatDateTime(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function resolveStatus(stakeAccount: StakingStakeAccountDetails | null | undefined): StakeStatus {
  return stakeAccount?.status ?? 'not_staked';
}

export function StakeStatusCard({
  stakeAccount,
  className,
}: {
  stakeAccount: StakingStakeAccountDetails | null | undefined;
  className?: string;
}) {
  const status = resolveStatus(stakeAccount);
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  const Icon = config.icon;

  const amountDisplay = formatNosAmount(stakeAccount?.amount ?? null);
  const durationDisplay =
    formatDurationDays(stakeAccount?.durationDays ?? null) ??
    formatDurationDays(stakeAccount?.durationSeconds != null ? stakeAccount.durationSeconds / 86400 : null);
  const cooldownCountdown = formatCountdown(stakeAccount?.secondsToUnlock ?? null);
  const cooldownEndsAt = formatDateTime(stakeAccount?.cooldownEndsAt ?? null);
  const timeUnstakeAt = formatDateTime(stakeAccount?.timeUnstake ?? null);

  let description = '';
  switch (status) {
    case 'active':
      description = durationDisplay
        ? `Stake is currently active with a ${durationDisplay} lock period.`
        : 'Stake is currently active and earning rewards.';
      break;
    case 'cooldown':
      if (cooldownCountdown && cooldownEndsAt) {
        description = `Unstaking in progress. Unlocks in ${cooldownCountdown} (${cooldownEndsAt}).`;
      } else if (cooldownCountdown) {
        description = `Unstaking in progress. Unlocks in ${cooldownCountdown}.`;
      } else if (cooldownEndsAt) {
        description = `Unstaking in progress. Unlocks on ${cooldownEndsAt}.`;
      } else {
        description = 'Unstaking in progress.';
      }
      break;
    case 'ready_to_withdraw':
      description = cooldownEndsAt
        ? `Unstaking completed on ${cooldownEndsAt}. Funds are ready to withdraw or restake.`
        : 'Unstaking completed. Funds are ready to withdraw or restake.';
      break;
    case 'inactive':
      description = 'Stake account exists but currently holds no NOS.';
      break;
    case 'unknown':
      description = 'Stake address discovered, but account details could not be loaded.';
      break;
    case 'not_staked':
    default:
      description = 'No stake account detected for this wallet.';
      break;
  }

  const statusBadgeLabel = (config.badgeLabel ?? status).replace(/_/g, ' ');

  return (
    <div className={cn('card-base card-hover p-3 sm:p-4 md:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'rounded-xl bg-gradient-to-br p-2 sm:p-2.5',
              config.iconBg,
            )}
          >
            <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', config.iconColor)} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm">
              Staking Lifecycle
            </p>
            <p className="text-lg font-semibold text-foreground sm:text-xl">
              {config.label}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'rounded-full border px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wider sm:text-xs',
            config.badgeClasses,
          )}
        >
          {statusBadgeLabel}
        </span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground sm:text-sm">{description}</p>

      <dl className="mt-4 grid gap-3 text-xs text-muted-foreground sm:grid-cols-2 sm:text-sm">
        {amountDisplay && (
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
              On-chain Stake
            </dt>
            <dd className="text-sm font-semibold text-foreground sm:text-base">{amountDisplay}</dd>
          </div>
        )}

        {durationDisplay && (
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
              Lock Duration
            </dt>
            <dd className="text-sm font-semibold text-foreground sm:text-base">
              {durationDisplay}
            </dd>
          </div>
        )}

        {timeUnstakeAt && (
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
              Unstake Initiated
            </dt>
            <dd className="text-sm font-semibold text-foreground sm:text-base">
              {timeUnstakeAt}
            </dd>
          </div>
        )}

        {status === 'cooldown' && (cooldownCountdown || cooldownEndsAt) && (
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
              Unlocks
            </dt>
            <dd className="text-sm font-semibold text-foreground sm:text-base">
              {cooldownCountdown && <span>{cooldownCountdown}</span>}
              {cooldownCountdown && cooldownEndsAt && <span className="px-1">•</span>}
              {cooldownEndsAt && <span>{cooldownEndsAt}</span>}
            </dd>
          </div>
        )}

        {status === 'ready_to_withdraw' && cooldownEndsAt && (
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
              Unlocked
            </dt>
            <dd className="text-sm font-semibold text-foreground sm:text-base">
              {cooldownEndsAt}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );
}
