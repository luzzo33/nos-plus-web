'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowUpRightSquare,
  CheckCircle2,
  History,
  Loader2,
  RefreshCcw,
  Server,
  ShieldAlert,
  ShieldCheck,
  Wrench,
} from 'lucide-react';
import { format, formatDistanceToNow, formatDistanceToNowStrict } from 'date-fns';
import { cn, getDateLocale } from '@/lib/utils';
import { fetchStatus, StatusEvent, StatusLimitProfile, StatusResponse } from '@/lib/api/status';

function getStatusDescriptor(status: string, t: ReturnType<typeof useTranslations>) {
  const normalized = status.toLowerCase();
  const map = {
    ok: {
      label: t('labels.ok', { defaultMessage: 'Operational' }),
      description: t('descriptions.ok', { defaultMessage: 'All systems are running normally.' }),
      className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
      icon: CheckCircle2,
    },
    maintenance: {
      label: t('labels.maintenance', { defaultMessage: 'Maintenance' }),
      description: t('descriptions.maintenance', {
        defaultMessage: 'We are currently performing scheduled maintenance.',
      }),
      className: 'border-amber-500/30 bg-amber-500/10 text-amber-300',
      icon: Wrench,
    },
    degraded: {
      label: t('labels.degraded', { defaultMessage: 'Degraded Performance' }),
      description: t('descriptions.degraded', {
        defaultMessage: 'Some functionality may be limited.',
      }),
      className: 'border-orange-500/30 bg-orange-500/10 text-orange-300',
      icon: AlertTriangle,
    },
    incident: {
      label: t('labels.incident', { defaultMessage: 'Incident' }),
      description: t('descriptions.incident', {
        defaultMessage: 'We have detected an active incident.',
      }),
      className: 'border-red-500/40 bg-red-500/10 text-red-300',
      icon: ShieldAlert,
    },
  } as const;

  if (normalized in map) {
    return map[normalized as keyof typeof map];
  }

  return {
    label: status.length ? status : t('labels.unknown', { defaultMessage: 'Unknown' }),
    description: t('descriptions.unknown', {
      defaultMessage: 'Status information is currently unavailable.',
    }),
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-300',
    icon: Activity,
  } as const;
}

function formatLimitWindow(ms: number | undefined, locale: string) {
  if (!ms || !Number.isFinite(ms) || ms <= 0) return '—';
  const dateLocale = getDateLocale(locale);
  return formatDistanceToNowStrict(new Date(Date.now() - ms), {
    addSuffix: false,
    locale: dateLocale,
  });
}

function formatDateTime(value: string | null | undefined, locale: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const dateLocale = getDateLocale(locale);
  return format(date, 'PPpp', { locale: dateLocale });
}

function safeDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatRelative(value: Date | null, locale: string) {
  if (!value) return '—';
  const dateLocale = getDateLocale(locale);
  return formatDistanceToNow(value, { addSuffix: true, locale: dateLocale });
}

function toTitleCase(value: string) {
  return value
    .split(/[_\s-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function buildLimitGroups(limits: StatusResponse['limits']) {
  const groups: Record<string, { max?: number; windowMs?: number }> = {};
  Object.entries(limits || {}).forEach(([key, value]) => {
    if (!Number.isFinite(value)) return;
    if (key.endsWith('WindowMs')) {
      const prefix = key.slice(0, -'WindowMs'.length);
      groups[prefix] = groups[prefix]
        ? { ...groups[prefix], windowMs: value }
        : { windowMs: value };
      return;
    }
    if (key.endsWith('Max')) {
      const prefix = key.slice(0, -'Max'.length);
      groups[prefix] = groups[prefix] ? { ...groups[prefix], max: value } : { max: value };
      return;
    }
    groups[key] = groups[key] ? { ...groups[key], max: value } : { max: value };
  });

  return Object.entries(groups).map(([id, info]) => ({
    id,
    max: info.max,
    windowMs: info.windowMs,
  }));
}

function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

const EVENT_TYPE_META: Record<string, { icon: typeof Activity; tint: string; accent: string }> = {
  deployment: {
    icon: ArrowUpRightSquare,
    tint: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300',
    accent: 'text-emerald-200',
  },
  incident: {
    icon: ShieldAlert,
    tint: 'bg-red-500/15 border-red-500/40 text-red-300',
    accent: 'text-red-200',
  },
  recovery: {
    icon: ShieldCheck,
    tint: 'bg-sky-500/15 border-sky-500/40 text-sky-300',
    accent: 'text-sky-200',
  },
  maintenance: {
    icon: Wrench,
    tint: 'bg-amber-500/15 border-amber-500/40 text-amber-300',
    accent: 'text-amber-200',
  },
};

function useStatusQuery() {
  return useQuery<StatusResponse, Error>({
    queryKey: ['nos-status'],
    queryFn: ({ signal }) => fetchStatus(signal),
    refetchInterval: 60_000,
    staleTime: 45_000,
  });
}

export default function StatusPage() {
  const t = useTranslations('status');
  const locale = useLocale();
  const numberFormatter = useMemo(() => new Intl.NumberFormat(locale), [locale]);

  const { data: status, isLoading, error, refetch, isFetching } = useStatusQuery();

  const descriptor = status ? getStatusDescriptor(status.status, t) : null;
  const startedAt = status ? safeDate(status.startedAt) : null;
  const lastUpdated = status ? safeDate(status.timestamp) : null;

  const limitProfiles = status?.limitProfiles ?? [];
  const limitGroups = useMemo(() => {
    if (!status) return [];
    const groups = buildLimitGroups(status.limits);
    if (!limitProfiles.length) return groups;
    return groups.filter((group) => group.id !== 'v3');
  }, [status, limitProfiles]);
  const hasLimitProfiles = limitProfiles.length > 0;
  const hasLimitGroups = limitGroups.length > 0;
  const events = useMemo(() => (status ? status.events.slice(0, 30) : []), [status]);

  const eventSummary = useMemo(() => {
    const summary: Record<string, number> = { deployment: 0, incident: 0, recovery: 0 };
    if (status) {
      status.events.forEach((evt) => {
        const key = evt.type.toLowerCase();
        if (summary[key] === undefined) {
          summary[key] = 0;
        }
        summary[key] += 1;
      });
    }
    return summary;
  }, [status]);

  const renderLoader = () => (
    <div className="flex items-center justify-center py-24">
      <div className="flex items-center gap-3 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span>{t('loading', { defaultMessage: 'Loading live status...' })}</span>
      </div>
    </div>
  );

  const renderError = (message: string) => (
    <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-sm text-red-200">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5" />
        <div>
          <p className="font-medium">
            {t('error.title', { defaultMessage: 'Unable to load status' })}
          </p>
          <p className="mt-1 text-red-300/80">{message}</p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => refetch()}
        className="mt-4 inline-flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/20"
      >
        <RefreshCcw className="h-4 w-4" />
        {t('error.retry', { defaultMessage: 'Retry' })}
      </button>
    </div>
  );

  if (isLoading && !status) {
    return (
      <div className="space-y-6">
        <HeaderSkeleton />
        {renderLoader()}
      </div>
    );
  }

  if (error && !status) {
    return renderError(error.message);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-3xl border border-border bg-card/80 p-6 shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/30 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
              <Server className="h-3.5 w-3.5" />
              <span>{status?.service ?? 'NOS API'}</span>
            </div>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">
                {t('title', { defaultMessage: 'Service Status' })}
              </h1>
              <p className="mt-2 text-sm text-muted-foreground max-w-xl">
                {t('subtitle', {
                  defaultMessage:
                    'Live health overview, uptime details, and historical events for the NOS API platform.',
                })}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground/90">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1">
                <Activity className="h-3.5 w-3.5" />
                {t('environment', { defaultMessage: 'Environment' })}:{' '}
                <strong className="font-medium text-foreground">
                  {status?.environment ?? '—'}
                </strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1">
                <History className="h-3.5 w-3.5" />
                {t('started', { defaultMessage: 'Started' })}:{' '}
                <strong className="font-medium text-foreground">
                  {formatDateTime(status?.startedAt, locale)}
                </strong>
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/40 px-3 py-1">
                <Activity className="h-3.5 w-3.5" />
                {t('uptime', { defaultMessage: 'Uptime' })}:{' '}
                <strong className="font-medium text-foreground">
                  {startedAt
                    ? formatDistanceToNowStrict(startedAt, { locale: getDateLocale(locale) })
                    : '—'}
                </strong>
              </span>
            </div>
          </div>

          <div className="flex flex-col items-stretch gap-3 md:items-end">
            {descriptor ? (
              <div
                className={cn(
                  'inline-flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-inner backdrop-blur',
                  descriptor.className,
                )}
              >
                <descriptor.icon className="h-5 w-5" />
                <div>
                  <div className="text-base font-semibold leading-tight">{descriptor.label}</div>
                  <p className="text-xs font-normal text-white/70 md:text-right">
                    {descriptor.description}
                  </p>
                </div>
              </div>
            ) : null}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-2 rounded-xl border border-border/70 bg-background/40 px-4 py-2 text-sm font-medium text-foreground transition hover:bg-background/60"
              >
                <RefreshCcw className={cn('h-4 w-4', isFetching ? 'animate-spin' : '')} />
                {t('actions.refresh', { defaultMessage: 'Refresh' })}
              </button>
              <div className="text-xs text-muted-foreground/80">
                {t('actions.autoRefresh', { defaultMessage: 'Updates every 60s' })}
              </div>
            </div>
            <div className="text-xs text-muted-foreground/70">
              {t('lastUpdated', {
                defaultMessage: 'Last updated {value}',
                value: formatRelative(lastUpdated, locale),
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          title={t('cards.environment', { defaultMessage: 'Environment' })}
          icon={Server}
          value={status?.environment ?? '—'}
          hint={t('cards.environmentHint', { defaultMessage: 'Running environment' })}
        />
        <InfoCard
          title={t('cards.version', { defaultMessage: 'Version' })}
          icon={ArrowUpRightSquare}
          value={status?.version ?? '—'}
          hint={t('cards.versionHint', { defaultMessage: 'Currently deployed build' })}
        />
        <InfoCard
          title={t('cards.uptime', { defaultMessage: 'Uptime' })}
          icon={Activity}
          value={
            startedAt
              ? formatDistanceToNowStrict(startedAt, { locale: getDateLocale(locale) })
              : '—'
          }
          hint={
            startedAt
              ? t('cards.uptimeHint', {
                  defaultMessage: 'Started {time}',
                  time: formatDateTime(status?.startedAt ?? null, locale),
                })
              : '—'
          }
        />
        <InfoCard
          title={t('cards.lastUpdated', { defaultMessage: 'Last Update' })}
          icon={History}
          value={formatRelative(lastUpdated, locale)}
          hint={formatDateTime(status?.timestamp ?? null, locale)}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {['deployment', 'incident', 'recovery'].map((key) => {
          const meta = EVENT_TYPE_META[key] ?? EVENT_TYPE_META.deployment;
          const count = eventSummary[key] ?? 0;
          const Icon = meta.icon;
          return (
            <div key={key} className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {t(`eventTypes.${key}`, { defaultMessage: toTitleCase(key) })}
                  </p>
                  <p className="mt-1 text-2xl font-semibold">{numberFormatter.format(count)}</p>
                </div>
                <span
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-2xl border',
                    meta.tint,
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
              </div>
              <p className={cn('mt-3 text-sm text-muted-foreground', meta.accent)}>
                {t(`eventDescriptions.${key}`, {
                  defaultMessage:
                    key === 'deployment'
                      ? 'Successful deployments recorded'
                      : key === 'incident'
                        ? 'Incidents tracked by the platform'
                        : 'Recoveries resolving previous incidents',
                })}
              </p>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {t('limits.title', { defaultMessage: 'Rate limits' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('limits.subtitle', {
                defaultMessage: 'Current request quotas available for public access endpoints.',
              })}
            </p>
          </div>
          <div className="text-xs text-muted-foreground/80">
            {t('limits.lastEvaluated', {
              defaultMessage: 'Evaluated {value}',
              value: formatRelative(lastUpdated, locale),
            })}
          </div>
        </div>
        {hasLimitProfiles ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {limitProfiles.map((profile) => (
              <LimitProfileCard
                key={profile.id}
                profile={profile}
                t={t}
                locale={locale}
                numberFormatter={numberFormatter}
              />
            ))}
          </div>
        ) : null}
        {hasLimitGroups ? (
          <div
            className={cn(
              'grid gap-4 md:grid-cols-2 xl:grid-cols-3',
              hasLimitProfiles ? 'mt-6' : 'mt-6',
            )}
          >
            {limitGroups.map((group) => {
              const windowLabel = group.windowMs ? formatLimitWindow(group.windowMs, locale) : null;
              const perMinute =
                group.max && group.windowMs ? group.max / (group.windowMs / 60000) : null;
              return (
                <div
                  key={group.id}
                  className="rounded-2xl border border-border/60 bg-background/30 p-5"
                >
                  <p className="text-sm font-semibold text-foreground">
                    {t(`limits.keys.${group.id}`, { defaultMessage: toTitleCase(group.id) })}
                  </p>
                  <div className="mt-3 flex flex-wrap items-baseline gap-2">
                    <span className="text-3xl font-bold text-primary">
                      {group.max ? numberFormatter.format(group.max) : '—'}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {windowLabel
                        ? t('limits.perWindow', {
                            defaultMessage: 'requests every {window}',
                            window: windowLabel,
                          })
                        : t('limits.noWindow', { defaultMessage: 'requests' })}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-col gap-1 text-xs text-muted-foreground">
                    {perMinute && Number.isFinite(perMinute) ? (
                      <span>
                        {t('limits.estimated', {
                          defaultMessage: '~{value}/minute',
                          value: numberFormatter.format(Math.floor(perMinute)),
                        })}
                      </span>
                    ) : null}
                    {group.windowMs ? (
                      <span>
                        {t('limits.window', {
                          defaultMessage: 'Window: {value}',
                          value: windowLabel ?? '—',
                        })}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : null}
        {!hasLimitProfiles && !hasLimitGroups ? (
          <p className="mt-6 text-sm text-muted-foreground">
            {t('limits.empty', { defaultMessage: 'No limit data published by the service.' })}
          </p>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border bg-card/70 p-6 shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold">
              {t('events.title', { defaultMessage: 'Recent events' })}
            </h2>
            <p className="text-sm text-muted-foreground">
              {t('events.subtitle', {
                defaultMessage: 'Deployments, incidents, and recoveries reported by the platform.',
              })}
            </p>
          </div>
          <div className="text-xs text-muted-foreground/80">
            {status
              ? t('events.showing', {
                  defaultMessage: 'Showing {shown} of {total} events',
                  shown: numberFormatter.format(events.length),
                  total: numberFormatter.format(status.events.length),
                })
              : null}
          </div>
        </div>
        {events.length ? (
          <div className="mt-6 relative">
            <div className="absolute left-5 top-0 h-full w-px bg-border/60" />
            <ul className="space-y-5">
              {events.map((event) => (
                <TimelineEvent key={event.id} event={event} locale={locale} t={t} />
              ))}
            </ul>
          </div>
        ) : (
          <p className="mt-6 text-sm text-muted-foreground">
            {t('events.empty', { defaultMessage: 'No recent events have been recorded.' })}
          </p>
        )}
      </section>

      {error ? renderError(error.message) : null}
    </div>
  );
}

function LimitProfileCard({
  profile,
  locale,
  t,
  numberFormatter,
}: {
  profile: StatusLimitProfile;
  locale: string;
  t: ReturnType<typeof useTranslations>;
  numberFormatter: Intl.NumberFormat;
}) {
  const title = t(`limitProfiles.profiles.${profile.id}.title`, {
    defaultMessage: profile.label ?? toTitleCase(profile.id),
  });
  const descriptionText = t(`limitProfiles.profiles.${profile.id}.description`, {
    defaultMessage: profile.description ?? '',
  });
  const description = descriptionText.trim().length
    ? descriptionText
    : (profile.description ?? null);

  const metadata = (profile.metadata ?? {}) as Record<string, unknown>;
  const tierName = typeof metadata.tierName === 'string' ? metadata.tierName : null;
  const tierSlug = typeof metadata.tierSlug === 'string' ? metadata.tierSlug : null;
  const burstRpmCandidate = Number(metadata.burstRpm as number | string | undefined);
  const burstRpm = Number.isFinite(burstRpmCandidate) ? burstRpmCandidate : null;
  const monthlyQuotaCandidate = Number(metadata.monthlyQuota as number | string | undefined);
  const monthlyQuota = Number.isFinite(monthlyQuotaCandidate) ? monthlyQuotaCandidate : null;

  const details: string[] = [];
  if (tierName || tierSlug) {
    details.push(
      t('limitProfiles.metadata.tier', {
        defaultMessage: 'Tier: {value}',
        value: tierName ?? tierSlug,
      }),
    );
  }
  if (burstRpm) {
    details.push(
      t('limitProfiles.metadata.burstRpm', {
        defaultMessage: 'Burst: {value} req/minute',
        value: numberFormatter.format(burstRpm),
      }),
    );
  }
  if (monthlyQuota) {
    details.push(
      t('limitProfiles.metadata.monthlyQuota', {
        defaultMessage: 'Monthly quota: {value}',
        value: numberFormatter.format(monthlyQuota),
      }),
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-background/30 p-5">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-2 text-xs text-muted-foreground/90">{description}</p> : null}
      <div className="mt-4 flex flex-col gap-3">
        {profile.windows.map((window) => {
          const windowLabel = formatLimitWindow(window.windowMs, locale);
          const perMinute =
            window.max && window.windowMs ? window.max / (window.windowMs / 60000) : null;
          const windowName = t(`limitProfiles.windows.${window.id}`, {
            defaultMessage: window.label ?? toTitleCase(window.id),
          });
          return (
            <div
              key={`${profile.id}-${window.id}`}
              className="rounded-xl border border-border/50 bg-background/40 px-4 py-3"
            >
              <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                {windowName}
              </p>
              <div className="mt-1 flex flex-wrap items-baseline gap-2">
                <span className="text-3xl font-bold text-primary">
                  {numberFormatter.format(window.max)}
                </span>
                <span className="text-xs text-muted-foreground">
                  {windowLabel
                    ? t('limits.perWindow', {
                        defaultMessage: 'requests every {window}',
                        window: windowLabel,
                      })
                    : t('limits.noWindow', { defaultMessage: 'requests' })}
                </span>
              </div>
              {perMinute && Number.isFinite(perMinute) ? (
                <p className="mt-1 text-xs text-muted-foreground/80">
                  {t('limits.estimated', {
                    defaultMessage: '~{value}/minute',
                    value: numberFormatter.format(Math.floor(perMinute)),
                  })}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
      {details.length ? (
        <div className="mt-3 space-y-1 text-xs text-muted-foreground/80">
          {details.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function InfoCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string;
  value: string;
  hint: string;
  icon: typeof Activity;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{title}</p>
          <p className="mt-2 text-xl font-semibold text-foreground">{value}</p>
        </div>
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-background/30">
          <Icon className="h-5 w-5 text-muted-foreground" />
        </span>
      </div>
      <p className="mt-3 text-xs text-muted-foreground/80">{hint}</p>
    </div>
  );
}

function TimelineEvent({
  event,
  locale,
  t,
}: {
  event: StatusEvent;
  locale: string;
  t: ReturnType<typeof useTranslations>;
}) {
  const type = event.type.toLowerCase();
  const meta = EVENT_TYPE_META[type] ?? {
    icon: Activity,
    tint: 'bg-secondary/20 border-border/60 text-muted-foreground',
  };
  const Icon = meta.icon;
  const when = safeDate(event.timestamp);
  const dateLocale = getDateLocale(locale);
  const formatted = when ? format(when, 'PPpp', { locale: dateLocale }) : '—';
  const relative = when ? formatDistanceToNow(when, { addSuffix: true, locale: dateLocale }) : '—';
  const metadataEntries = Object.entries(event.metadata ?? {});
  const statusLabel = event.status
    ? t(`eventStatuses.${event.status.toLowerCase()}`, {
        defaultMessage: toTitleCase(event.status),
      })
    : t('eventStatuses.unknown', { defaultMessage: 'Status unknown' });
  const typeLabel = t(`eventTypes.${type}`, { defaultMessage: toTitleCase(type) });

  return (
    <li className="relative pl-12">
      <span
        className={cn(
          'absolute left-0 top-1.5 flex h-10 w-10 items-center justify-center rounded-2xl border',
          meta.tint,
        )}
      >
        <Icon className="h-5 w-5" />
      </span>
      <div className="rounded-2xl border border-border/60 bg-background/40 p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{typeLabel}</p>
            <p className="mt-1 text-lg font-semibold text-foreground">{statusLabel}</p>
            {metadataEntries.length ? (
              <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {metadataEntries.map(([key, value]) => (
                  <div
                    key={key}
                    className="rounded-lg border border-border/50 bg-background/30 px-3 py-2"
                  >
                    <p className="text-xs uppercase tracking-wide text-muted-foreground/80">
                      {toTitleCase(key)}
                    </p>
                    <p className="mt-0.5 font-medium text-foreground/90">
                      {formatMetadataValue(value)}
                    </p>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div className="text-sm text-muted-foreground/90 md:text-right">
            <p className="font-medium text-foreground/80">{formatted}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground/80">
              {relative}
            </p>
          </div>
        </div>
      </div>
    </li>
  );
}

function HeaderSkeleton() {
  return (
    <div className="rounded-3xl border border-border bg-card/70 p-6 shadow-lg">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-3">
          <div className="h-6 w-32 rounded-full bg-border/40" />
          <div className="h-8 w-52 rounded-full bg-border/40" />
          <div className="h-4 w-72 rounded-full bg-border/30" />
          <div className="h-4 w-40 rounded-full bg-border/20" />
        </div>
        <div className="h-20 w-56 rounded-2xl bg-border/30" />
      </div>
    </div>
  );
}
