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
import { useTranslations } from 'next-intl';

type StatusLabelKey = `labels.${StakeStatus}`;
type StatusBadgeKey = `badges.${string}`;

type StatusConfig = {
  labelKey: StatusLabelKey;
  icon: LucideIcon;
  iconColor: string;
  iconBg: string;
  badgeClasses: string;
  badgeKey?: StatusBadgeKey;
};

const STATUS_CONFIG: Record<StakeStatus, StatusConfig> = {
  active: {
    labelKey: 'labels.active',
    icon: ShieldCheck,
    iconColor: 'text-emerald-500',
    iconBg: 'from-emerald-500/20 to-emerald-500/10',
    badgeClasses: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-500',
  },
  cooldown: {
    labelKey: 'labels.cooldown',
    icon: Hourglass,
    iconColor: 'text-amber-500',
    iconBg: 'from-amber-500/20 to-amber-500/10',
    badgeClasses: 'border-amber-500/40 bg-amber-500/10 text-amber-500',
    badgeKey: 'badges.cooldown',
  },
  ready_to_withdraw: {
    labelKey: 'labels.ready_to_withdraw',
    icon: Unlock,
    iconColor: 'text-sky-500',
    iconBg: 'from-sky-500/20 to-sky-500/10',
    badgeClasses: 'border-sky-500/40 bg-sky-500/10 text-sky-500',
  },
  inactive: {
    labelKey: 'labels.inactive',
    icon: PauseCircle,
    iconColor: 'text-muted-foreground',
    iconBg: 'from-muted/30 to-muted/20',
    badgeClasses: 'border-muted-foreground/40 bg-muted/20 text-muted-foreground',
  },
  not_staked: {
    labelKey: 'labels.not_staked',
    icon: Power,
    iconColor: 'text-muted-foreground',
    iconBg: 'from-muted/30 to-muted/20',
    badgeClasses: 'border-muted-foreground/40 bg-muted/20 text-muted-foreground',
  },
  unknown: {
    labelKey: 'labels.unknown',
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
  const t = useTranslations('stakingAnalysis.stakeStatus');
  const tUnits = useTranslations('stakingAnalysis.units');

  const status = resolveStatus(stakeAccount);
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.unknown;
  const Icon = config.icon;

  const amount = stakeAccount?.amount ?? null;
  const amountDisplay =
    amount != null && !Number.isNaN(amount)
      ? `${formatNumber(amount)} ${tUnits('nos')}`
      : null;

  const formatDuration = (daysValue: number | null | undefined): string | null => {
    if (daysValue == null || Number.isNaN(daysValue) || !Number.isFinite(daysValue)) return null;
    if (daysValue <= 0) return t('duration.lessThanOne');
    const rounded = Math.round(daysValue);
    const approxMonths = Math.round(daysValue / 30);
    if (approxMonths >= 2) {
      return t('duration.daysWithMonths', { days: rounded, months: approxMonths });
    }
    return t('duration.days', { count: rounded });
  };

  const formatCountdown = (secondsValue: number | null | undefined): string | null => {
    if (secondsValue == null || Number.isNaN(secondsValue) || !Number.isFinite(secondsValue)) {
      return null;
    }
    const clamped = Math.max(0, Math.floor(secondsValue));
    const days = Math.floor(clamped / 86400);
    const hours = Math.floor((clamped % 86400) / 3600);
    const minutes = Math.floor((clamped % 3600) / 60);
    const parts: string[] = [];
    if (days > 0) parts.push(t('countdown.days', { count: days }));
    if (hours > 0) parts.push(t('countdown.hours', { count: hours }));
    if (minutes > 0) parts.push(t('countdown.minutes', { count: minutes }));
    if (parts.length === 0) {
      const seconds = clamped % 60;
      parts.push(t('countdown.seconds', { count: seconds }));
    }
    return parts.join(' ');
  };

  const durationDisplay =
    formatDuration(stakeAccount?.durationDays ?? null) ??
    formatDuration(
      stakeAccount?.durationSeconds != null ? stakeAccount.durationSeconds / 86400 : null,
    );
  const cooldownCountdown = formatCountdown(stakeAccount?.secondsToUnlock ?? null);
  const cooldownEndsAt = formatDateTime(stakeAccount?.cooldownEndsAt ?? null);
  const timeUnstakeAt = formatDateTime(stakeAccount?.timeUnstake ?? null);

  let description: string;
  switch (status) {
    case 'active':
      description = durationDisplay
        ? t('descriptions.activeWithDuration', { duration: durationDisplay })
        : t('descriptions.active');
      break;
    case 'cooldown':
      if (cooldownCountdown && cooldownEndsAt) {
        description = t('descriptions.cooldownCountdownAndDate', {
          countdown: cooldownCountdown,
          date: cooldownEndsAt,
        });
      } else if (cooldownCountdown) {
        description = t('descriptions.cooldownCountdown', { countdown: cooldownCountdown });
      } else if (cooldownEndsAt) {
        description = t('descriptions.cooldownDate', { date: cooldownEndsAt });
      } else {
        description = t('descriptions.cooldown');
      }
      break;
    case 'ready_to_withdraw':
      description = cooldownEndsAt
        ? t('descriptions.readyWithDate', { date: cooldownEndsAt })
        : t('descriptions.ready');
      break;
    case 'inactive':
      description = t('descriptions.inactive');
      break;
    case 'unknown':
      description = t('descriptions.unknown');
      break;
    case 'not_staked':
    default:
      description = t('descriptions.not_staked');
      break;
  }

  const heading = t('heading');
  const label = t(config.labelKey);
  const statusBadgeLabel = config.badgeKey ? t(config.badgeKey) : label;

  return (
    <div className={cn('card-base card-hover p-3 sm:p-4 md:p-5', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={cn('rounded-xl bg-gradient-to-br p-2 sm:p-2.5', config.iconBg)}
          >
            <Icon className={cn('h-4 w-4 sm:h-5 sm:w-5', config.iconColor)} />
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground sm:text-sm">
              {heading}
            </p>
            <p className="text-lg font-semibold text-foreground sm:text-xl">{label}</p>
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
              {t('fields.onChainStake')}
            </dt>
            <dd className="text-sm font-semibold text-foreground sm:text-base">{amountDisplay}</dd>
          </div>
        )}

        {durationDisplay && (
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
              {t('fields.lockDuration')}
            </dt>
            <dd className="text-sm font-semibold text-foreground sm:text-base">
              {durationDisplay}
            </dd>
          </div>
        )}

        {timeUnstakeAt && (
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
              {t('fields.unstakeInitiated')}
            </dt>
            <dd className="text-sm font-semibold text-foreground sm:text-base">
              {timeUnstakeAt}
            </dd>
          </div>
        )}

        {status === 'cooldown' && (cooldownCountdown || cooldownEndsAt) && (
          <div>
            <dt className="text-[0.65rem] font-semibold uppercase tracking-wider text-muted-foreground/80 sm:text-xs">
              {t('fields.unlocks')}
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
              {t('fields.unlocked')}
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
