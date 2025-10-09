'use client';

import Link from 'next/link';
import {
  Github,
  Twitter,
  ExternalLink,
  Activity,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  RefreshCcw,
  Wrench,
  Send,
} from 'lucide-react';
import { useTranslations, useLocale } from 'next-intl';
import { useEffect, useMemo, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { fetchStatus, type StatusResponse } from '@/lib/api/status';
import { getDateLocale } from '@/lib/utils';

type MiniStatusDescriptor = {
  label: string;
  description: string;
  tone: string;
  badge: string;
  icon: typeof Activity;
};

const STATUS_TONES: Record<string, MiniStatusDescriptor> = {
  ok: {
    label: 'labels.ok',
    description: 'descriptions.ok',
    tone: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
    badge: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  maintenance: {
    label: 'labels.maintenance',
    description: 'descriptions.maintenance',
    tone: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
    badge: 'bg-amber-500',
    icon: Wrench,
  },
  degraded: {
    label: 'labels.degraded',
    description: 'descriptions.degraded',
    tone: 'border-orange-500/40 bg-orange-500/10 text-orange-200',
    badge: 'bg-orange-500',
    icon: AlertTriangle,
  },
  incident: {
    label: 'labels.incident',
    description: 'descriptions.incident',
    tone: 'border-red-500/40 bg-red-500/10 text-red-200',
    badge: 'bg-red-500',
    icon: ShieldAlert,
  },
};

function useMiniStatus() {
  const [data, setData] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const latest = await fetchStatus(controller.signal);
        if (!active) return;
        setData(latest);
      } catch (err: any) {
        if (!active) return;
        if (err?.name === 'AbortError') return;
        setError(typeof err?.message === 'string' ? err.message : 'status_error');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    const refresh = setInterval(() => {
      load();
    }, 120_000);

    return () => {
      active = false;
      controller.abort();
      clearInterval(refresh);
    };
  }, []);

  return { data, loading, error };
}

function getStatusDescriptor(status: string | null | undefined): MiniStatusDescriptor {
  const key = (status ?? '').toLowerCase();
  return (
    STATUS_TONES[key] ?? {
      label: 'labels.unknown',
      description: 'descriptions.unknown',
      tone: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
      badge: 'bg-slate-400',
      icon: Activity,
    }
  );
}

function localiseHref(locale: string, href: string): string {
  if (!href) return `/${locale}`;
  if (/^https?:\/\//i.test(href)) return href;
  if (href.startsWith('/')) {
    return href === '/' ? `/${locale}` : `/${locale}${href}`;
  }
  return `/${locale}/${href}`;
}

export function Footer() {
  const t = useTranslations('footer');
  const statusT = useTranslations('status');
  const locale = useLocale();
  const { data: statusData, loading: statusLoading, error: statusError } = useMiniStatus();

  const statusDescriptor = useMemo(
    () => getStatusDescriptor(statusData?.status),
    [statusData?.status],
  );
  const StatusIcon = statusDescriptor.icon;
  const updatedLabel = useMemo(() => {
    if (!statusData?.timestamp) return null;
    try {
      const date = new Date(statusData.timestamp);
      if (Number.isNaN(date.getTime())) return null;
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: getDateLocale(locale),
      });
    } catch {
      return null;
    }
  }, [locale, statusData?.timestamp]);

  const footerLinks = {
    [t('nosanaOfficial')]: [
      { label: t('links.staking'), href: 'https://dashboard.nosana.com/stake', external: true },
      { label: t('links.dashboard'), href: 'https://dashboard.nosana.com', external: true },
      { label: t('links.blog'), href: 'https://nosana.com/blog/', external: true },
      { label: t('links.twitter'), href: 'https://x.com/nosana_ai', external: true },
      { label: t('links.telegram'), href: 'https://t.me/NosanaCompute', external: true },
      { label: t('links.github'), href: 'https://github.com/nosana-ci', external: true },
      { label: t('links.discord'), href: 'https://discord.com/invite/nosana-ai', external: true },
      { label: t('links.medium'), href: 'https://nosana.medium.com/', external: true },
      {
        label: t('links.linkedin'),
        href: 'https://www.linkedin.com/company/nosana',
        external: true,
      },
      { label: t('links.youtube'), href: 'https://www.youtube.com/@NosanaAI', external: true },
    ],
    [t('nosPlusCommunity')]: [
      { label: t('links.twitter'), href: 'https://x.com/nos_plus', external: true },
      { label: t('links.telegramBot'), href: 'http://t.me/nosplus_bot', external: true },
      {
        label: t('links.communityTelegram'),
        href: 'https://t.me/+u6AbJ2Pw-V1mYzFk',
        external: true,
      },
      { label: t('links.github'), href: 'https://github.com/luzzo33/nos-plus-web', external: true },
    ],
  };

  return (
    <footer className="mt-auto border-t border-border bg-background/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="col-span-1">
            <div className="flex items-center gap-2 mb-4 relative">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-white font-bold text-sm">N</span>
              </div>
              <span className="text-xl font-semibold">NOS.plus</span>
            </div>
            <p className="text-sm text-muted-foreground mb-6">{t('description')}</p>
            <div className="flex items-center gap-3 mb-6">
              <a
                href="https://x.com/nos_plus"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-border/60 hover:border-primary/40 hover:text-primary transition-colors"
                aria-label={t('social.twitter')}
              >
                <Twitter className="w-4 h-4" />
              </a>
              <a
                href="http://t.me/nosplus_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-border/60 hover:border-primary/40 hover:text-primary transition-colors"
                aria-label={t('social.telegramBot')}
              >
                <Send className="w-4 h-4" />
              </a>
              <a
                href="https://github.com/luzzo33/nos-plus-web"
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-lg border border-border/60 hover:border-primary/40 hover:text-primary transition-colors"
                aria-label={t('social.github')}
              >
                <Github className="w-4 h-4" />
              </a>
            </div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <span
                      className={`inline-flex h-2 w-2 rounded-full ${statusDescriptor.badge}`}
                    />
                    {t('statusHeading')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">{t('statusDescription')}</p>
                </div>
                <StatusIcon className="h-5 w-5 text-primary" />
              </div>
              <div
                className={`rounded-lg border px-3 py-2 text-xs font-medium flex items-center gap-2 ${statusDescriptor.tone}`}
              >
                <span>{statusT(statusDescriptor.label)}</span>
                {statusLoading ? <RefreshCcw className="h-3.5 w-3.5 animate-spin" /> : null}
              </div>
              {statusError ? (
                <p className="text-xs text-red-300">{t('statusUnavailable')}</p>
              ) : updatedLabel ? (
                <p className="text-xs text-muted-foreground">
                  {t('statusUpdated', { time: updatedLabel })}
                </p>
              ) : null}
              <Link
                href={localiseHref(locale, '/status')}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
              >
                {t('statusLink')}
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold mb-4">{category}</h3>
              <ul className="grid grid-cols-2 gap-x-6 gap-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    {link.external ? (
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1"
                      >
                        {link.label}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <Link
                        href={localiseHref(locale, link.href)}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {link.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{t('communityTagline')}</p>
          <div className="flex items-center gap-4">
            <Link
              href={localiseHref(locale, '/privacy')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('privacyPolicy')}
            </Link>
            <Link
              href={localiseHref(locale, '/terms')}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t('termsOfService')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
