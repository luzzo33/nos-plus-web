'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type LimitPlanRow, type LimitPlansResponse } from '@/lib/api/monitor-client';
import { monitorWsClient } from '@/lib/monitor/ws-client';
import { getMonitorApiKey } from '@/lib/api/monitorConfig';
import Image from 'next/image';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { PlanShareButton } from '@/components/monitor/PlanShareButton';
import { usePlanModal } from '@/components/monitor/PlanModalProvider';
import { cn } from '@/lib/utils';
import { MonitorWidgetFrame } from '@/components/monitor/MonitorWidgetFrame';
import { WalletActionMenu, truncateAddress } from '@/components/monitor/WalletActionMenu';
import {
  Activity,
  ArrowUpRight,
  ArrowUpDown,
  DollarSign,
  Filter,
  LayoutGrid,
  Loader2,
  RefreshCw,
  Table as TableIcon,
  Target,
  CheckCircle,
  Clock,
  Play,
  AlertTriangle,
  ExternalLink,
  Calendar,
  Zap,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Variant = 'full' | 'spotlight';
const STATUS_FILTER_VALUES = ['all', 'active', 'completed', 'closed', 'scheduled'] as const;
type StatusFilter = (typeof STATUS_FILTER_VALUES)[number];
const LIMIT_SORT_VALUES = ['target', 'recent', 'progress'] as const;
type LimitSortOption = (typeof LIMIT_SORT_VALUES)[number];

interface PlanTypeControl {
  value: 'dca' | 'limit';
  onChange: (value: 'dca' | 'limit') => void;
}

interface LOSectionProps {
  variant?: Variant;
  planTypeControl?: PlanTypeControl;
  height?: number;
}

const PLAN_TYPE_OPTIONS = [
  { value: 'dca', label: 'DCA Plans' },
  { value: 'limit', label: 'Limit Plans' },
];

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'active', label: 'Active' },
  { value: 'all', label: 'All' },
  { value: 'completed', label: 'Completed' },
  { value: 'closed', label: 'Closed' },
  { value: 'scheduled', label: 'Scheduled' },
];

const SORT_OPTIONS: Array<{ value: LimitSortOption; label: string }> = [
  { value: 'target', label: 'Closest to Target' },
  { value: 'recent', label: 'Most Recent' },
  { value: 'progress', label: 'By Progress' },
];

const DEFAULT_LIMIT = 10;

function isStatusFilter(value: string): value is StatusFilter {
  return (STATUS_FILTER_VALUES as readonly string[]).includes(value);
}

function isLimitSortOption(value: string): value is LimitSortOption {
  return (LIMIT_SORT_VALUES as readonly string[]).includes(value);
}

function fmt(n: unknown) {
  if (n == null) return '';
  const v = Number(n);
  if (!Number.isFinite(v)) return '';
  const abs = Math.abs(v);
  if (abs === 0) return '0';
  if (abs < 0.0001) return '<0.0001';
  let maximumFractionDigits: number;
  if (abs >= 1000) {
    maximumFractionDigits = 0;
  } else if (abs >= 100) {
    maximumFractionDigits = 0;
  } else if (abs >= 10) {
    maximumFractionDigits = 1;
  } else if (abs >= 1) {
    maximumFractionDigits = 2;
  } else {
    maximumFractionDigits = 4;
  }
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(v);
}

function formatNumber(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return '—';
  return fmt(value);
}

function getSideColorClasses(side?: string, status?: string) {
  const sideStr = (side || '').toLowerCase();
  const statusStr = (status || '').toLowerCase();

  if (statusStr === 'active') {
    if (sideStr === 'sell') {
      return {
        text: 'text-foreground',
        bg: 'bg-red-500/15 dark:bg-red-900/25',
        border: 'border-red-500/30 dark:border-red-800/40',
        cardBg: 'bg-background/80',
      };
    }
    if (sideStr === 'buy') {
      return {
        text: 'text-foreground',
        bg: 'bg-emerald-500/15 dark:bg-emerald-900/25',
        border: 'border-emerald-500/30 dark:border-emerald-800/40',
        cardBg: 'bg-background/80',
      };
    }
  }

  if (statusStr === 'scheduled') {
    return {
      text: 'text-foreground',
      bg: 'bg-amber-500/15 dark:bg-amber-900/25',
      border: 'border-amber-500/30 dark:border-amber-800/40',
      cardBg: 'bg-background/80',
    };
  }

  if (statusStr === 'paused') {
    return {
      text: 'text-foreground',
      bg: 'bg-blue-500/15 dark:bg-blue-900/25',
      border: 'border-blue-500/30 dark:border-blue-800/40',
      cardBg: 'bg-background/80',
    };
  }

  if (statusStr === 'closed' || statusStr === 'completed') {
    return {
      text: 'text-foreground',
      bg: 'bg-muted/10 dark:bg-muted/5',
      border: 'border-border/20 dark:border-border/15',
      cardBg: 'bg-background/80',
    };
  }

  return {
    text: 'text-foreground',
    bg: 'bg-muted/20',
    border: 'border-border/30',
    cardBg: 'bg-background/80',
  };
}

function formatProgress(plan: LimitPlanRow) {
  if (plan.progress_pct == null) return '—';
  return `${plan.progress_pct.toFixed(1)}%`;
}

function normalizeStatus(plan: LimitPlanRow) {
  return (plan.status ?? 'unknown').toLowerCase();
}

function statusBadgeClass(plan: LimitPlanRow) {
  const status = normalizeStatus(plan);
  if (status === 'completed') {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300 border border-emerald-500/40';
  }
  if (status === 'active') {
    return 'bg-sky-100 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300 border border-sky-500/40';
  }
  if (status === 'closed') {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-200 border border-amber-500/30';
  }
  return 'bg-muted/40 text-muted-foreground border border-border/40';
}

function getStatusConfig(plan: LimitPlanRow) {
  const status = normalizeStatus(plan);
  switch (status) {
    case 'active':
      return {
        icon: Play,
        color: 'text-emerald-600 dark:text-emerald-400',
        bg: 'bg-emerald-500/10 dark:bg-emerald-900/20',
        border: 'border-emerald-500/20 dark:border-emerald-800/30',
        label: 'Active',
      };
    case 'scheduled':
      return {
        icon: Clock,
        color: 'text-amber-600 dark:text-amber-400',
        bg: 'bg-amber-500/10 dark:bg-amber-900/20',
        border: 'border-amber-500/20 dark:border-amber-800/30',
        label: 'Scheduled',
      };
    case 'completed':
      return {
        icon: CheckCircle,
        color: 'text-gray-600 dark:text-gray-400',
        bg: 'bg-gray-500/10 dark:bg-gray-900/20',
        border: 'border-gray-500/20 dark:border-gray-800/30',
        label: 'Completed',
      };
    case 'closed':
      return {
        icon: AlertTriangle,
        color: 'text-rose-600 dark:text-rose-400',
        bg: 'bg-rose-500/10 dark:bg-rose-900/20',
        border: 'border-rose-500/20 dark:border-rose-800/30',
        label: 'Closed',
      };
    default:
      return {
        icon: AlertTriangle,
        color: 'text-muted-foreground',
        bg: 'bg-muted/10 dark:bg-muted/5',
        border: 'border-border dark:border-border/30',
        label: plan.status || 'Unknown',
      };
  }
}

const MOBILE_PLAN_HEIGHT_MIN = 960;
const MOBILE_PLAN_HEIGHT_MAX = 1600;
const MOBILE_PLAN_HEIGHT_DEFAULT = 1280;
const MOBILE_PLAN_HEIGHT_MULTIPLIER = 2;
const MOBILE_VIEWPORT_OFFSET = 120;

function resolveMobilePlanHeight(candidate?: number): number {
  const base =
    typeof candidate === 'number' && Number.isFinite(candidate)
      ? candidate
      : MOBILE_PLAN_HEIGHT_DEFAULT;
  return Math.min(MOBILE_PLAN_HEIGHT_MAX, Math.max(MOBILE_PLAN_HEIGHT_MIN, base));
}

function computeMobileFrameHeight(preferred?: number): number {
  if (typeof window === 'undefined') {
    const fallback =
      typeof preferred === 'number' && Number.isFinite(preferred)
        ? preferred * MOBILE_PLAN_HEIGHT_MULTIPLIER
        : undefined;
    return resolveMobilePlanHeight(fallback);
  }
  const rawAvailable = window.innerHeight - MOBILE_VIEWPORT_OFFSET;
  const safeAvailable = Number.isFinite(rawAvailable)
    ? rawAvailable
    : (preferred ?? MOBILE_PLAN_HEIGHT_DEFAULT / MOBILE_PLAN_HEIGHT_MULTIPLIER);
  const target = safeAvailable * MOBILE_PLAN_HEIGHT_MULTIPLIER;
  return resolveMobilePlanHeight(target);
}

export function LOSection({ variant = 'full', planTypeControl, height }: LOSectionProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [sortBy, setSortBy] = useState<LimitSortOption>('target');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (variant === 'spotlight') return 'table';
    if (typeof window === 'undefined') {
      return 'cards';
    }
    try {
      const stored = window.localStorage.getItem('monitor:limit:view');
      if (stored === 'cards' || stored === 'table') {
        return stored as 'cards' | 'table';
      }
      if (stored === 'chart') {
        return 'cards';
      }
      return window.matchMedia && window.matchMedia('(max-width: 767px)').matches
        ? 'cards'
        : 'table';
    } catch {
      return 'table';
    }
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [mobileFrameHeight, setMobileFrameHeight] = useState<number>(() =>
    computeMobileFrameHeight(height),
  );
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(max-width: 767px)');
    const handleChange = (event: MediaQueryListEvent) => {
      setIsMobile(event.matches);
    };
    setIsMobile(mediaQuery.matches);
    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);
  useEffect(() => {
    if (!isMobile) return;
    const update = () => setMobileFrameHeight(computeMobileFrameHeight(height));
    update();
    window.addEventListener('resize', update, { passive: true });
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, [isMobile, height]);
  useEffect(() => {
    if (isMobile) {
      setMobileFrameHeight(computeMobileFrameHeight(height));
    }
  }, [isMobile, height]);
  const initialAnimationRef = useRef(true);
  useEffect(() => {
    initialAnimationRef.current = false;
  }, []);

  const [plans, setPlans] = useState<LimitPlanRow[]>([]);
  const [summary, setSummary] = useState<LimitPlansResponse['summary'] | null>(null);
  const [pagination, setPagination] = useState<LimitPlansResponse['pagination'] | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasApiAccess = useMemo(() => Boolean(getMonitorApiKey()), []);
  const { openPlan, registerPlans } = usePlanModal();

  const nextOffsetRef = useRef<number | null>(0);
  const plansRef = useRef<LimitPlanRow[]>([]);

  const limit = DEFAULT_LIMIT;
  const shouldLockHeight = variant === 'full' && !isMobile;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const frameStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (variant !== 'full') return undefined;
    if (isMobile) {
      const resolved = mobileFrameHeight ?? MOBILE_PLAN_HEIGHT_DEFAULT;
      return {
        height: resolved,
        maxHeight: resolved,
        minHeight: MOBILE_PLAN_HEIGHT_MIN,
      };
    }
    if (!shouldLockHeight) return undefined;
    if (typeof height === 'number' && Number.isFinite(height)) {
      return { height, maxHeight: height };
    }
    if (lockedHeight != null) {
      return { height: lockedHeight, maxHeight: lockedHeight };
    }
    return undefined;
  }, [variant, isMobile, mobileFrameHeight, shouldLockHeight, height, lockedHeight]);

  useEffect(() => {
    plansRef.current = plans;
    registerPlans('limit', plans);
  }, [plans, registerPlans]);

  useEffect(() => {
    try {
      if (variant === 'spotlight') return;
      if (typeof window === 'undefined') return;
      window.localStorage.setItem('monitor:limit:view', viewMode);
    } catch {}
  }, [viewMode, variant]);

  const subscriptionRef = useRef<ReturnType<typeof monitorWsClient.subscribe> | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const handleStatusSelect = useCallback((value: string) => {
    if (isStatusFilter(value)) {
      setStatusFilter(value);
    }
  }, []);
  const handleSortSelect = useCallback((value: string) => {
    if (isLimitSortOption(value)) {
      setSortBy(value);
    }
  }, []);

  const applyPlansPayload = useCallback(
    (payload: unknown, append: boolean = false) => {
      const container = (payload as { data?: unknown }) ?? {};
      const body =
        (container.data as Record<string, unknown> | undefined) ??
        (payload as Record<string, unknown> | undefined) ??
        {};
      const rows = Array.isArray(body.rows) ? (body.rows as LimitPlanRow[]) : [];
      const paginationInfo = (body.pagination as LimitPlansResponse['pagination']) ?? null;
      const chunkCount = rows.length;
      const prevCount = plansRef.current.length;
      const summaryPayload = body.summary as LimitPlansResponse['summary'] | undefined;
      const totalFromPayload = Number.isFinite(Number(body.total))
        ? Number(body.total)
        : Number.isFinite(Number(summaryPayload?.totalPlans))
          ? Number(summaryPayload?.totalPlans)
          : undefined;

      if (!append) {
        setPlans(rows);
      } else if (rows.length) {
        setPlans((prev) => {
          const merged = new Map<string, LimitPlanRow>();
          prev.forEach((plan) => merged.set(plan.plan_id, plan));
          rows.forEach((plan) => merged.set(plan.plan_id, plan));
          return Array.from(merged.values());
        });
      }

      if (Object.prototype.hasOwnProperty.call(body, 'summary')) {
        setSummary(summaryPayload ?? null);
      }

      if (paginationInfo) {
        setPagination(paginationInfo);
        const offsetBase = Number.isFinite(Number(paginationInfo.offset))
          ? Number(paginationInfo.offset)
          : append
            ? prevCount
            : 0;
        const nextOffset = Number.isFinite(Number(paginationInfo.nextOffset))
          ? Number(paginationInfo.nextOffset)
          : chunkCount
            ? offsetBase + chunkCount
            : null;
        nextOffsetRef.current = nextOffset ?? null;
        const total = Number.isFinite(Number(paginationInfo.total))
          ? Number(paginationInfo.total)
          : (totalFromPayload ?? null);
        const hasMore =
          typeof paginationInfo.hasMore === 'boolean'
            ? paginationInfo.hasMore
            : total != null
              ? (nextOffset ?? offsetBase + chunkCount) < total
              : Boolean(nextOffset);
        setHasMore(hasMore);
      } else {
        const offset = append ? prevCount : 0;
        const total = totalFromPayload ?? (append ? prevCount + chunkCount : chunkCount);
        const nextOffsetCandidate = chunkCount < limit ? null : offset + chunkCount;
        const hasMore =
          nextOffsetCandidate != null && (total == null ? true : nextOffsetCandidate < total);
        setPagination({
          limit,
          offset,
          count: append ? prevCount + chunkCount : chunkCount,
          nextOffset: nextOffsetCandidate,
          hasMore,
          total: total ?? null,
        });
        nextOffsetRef.current = nextOffsetCandidate;
        setHasMore(hasMore);
      }

      if (append && chunkCount === 0) {
        setHasMore(false);
        nextOffsetRef.current = null;
      }

      setLoading(false);
      setLoadingMore(false);
      setError(null);
    },
    [limit],
  );

  useEffect(() => {
    if (!hasApiAccess) {
      setPlans([]);
      setSummary(null);
      setPagination(null);
      setHasMore(false);
      setLoading(false);
      setLoadingMore(false);
      setError('Monitor API key required to view limit plans.');
      nextOffsetRef.current = 0;
      return;
    }

    setError(null);
    setHasMore(false);
    setLoading(true);
    setLoadingMore(false);
    nextOffsetRef.current = 0;
    const params: Record<string, unknown> = {
      limit,
      offset: 0,
    };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (sortBy === 'progress') params.sort = 'progress';
    else if (sortBy === 'recent') params.sort = 'recent';
    else if (sortBy === 'target') params.sort = 'target';

    const subscription = monitorWsClient.subscribe('monitor.limitPlans', params, {
      onSnapshot: (payload) => applyPlansPayload(payload, false),
      onUpdate: (payload) => applyPlansPayload(payload, false),
      onError: (err) => {
        setError(err.message || err.code || 'limit_plans_error');
        setLoading(false);
        setLoadingMore(false);
      },
    });
    subscriptionRef.current = subscription;
    subscription.ready.catch((err) => {
      setError(err?.message || 'limit_plans_error');
      setLoading(false);
      setLoadingMore(false);
    });

    return () => {
      subscription.unsubscribe();
      if (subscriptionRef.current === subscription) {
        subscriptionRef.current = null;
      }
    };
  }, [hasApiAccess, limit, statusFilter, sortBy, refreshToken, applyPlansPayload]);

  const loadMorePlans = useCallback(() => {
    if (!hasMore || loadingMore) return;
    const subscription = subscriptionRef.current;
    if (!subscription) return;
    const offsetBase = nextOffsetRef.current;
    const offset = offsetBase != null ? offsetBase : plansRef.current.length;
    const params: Record<string, unknown> = {
      limit,
      offset,
    };
    if (statusFilter !== 'all') params.status = statusFilter;
    if (sortBy === 'progress') params.sort = 'progress';
    else if (sortBy === 'recent') params.sort = 'recent';
    else if (sortBy === 'target') params.sort = 'target';
    setLoadingMore(true);
    subscription
      .request<{
        rows?: LimitPlanRow[];
        pagination?: LimitPlansResponse['pagination'];
        summary?: LimitPlansResponse['summary'];
        total?: number;
      }>('fetchMore', params)
      .then((payload) => applyPlansPayload(payload, true))
      .catch((err) => {
        setError(err?.message || 'limit_plans_error');
        setLoadingMore(false);
      });
  }, [hasMore, loadingMore, limit, statusFilter, sortBy, applyPlansPayload]);

  const refresh = useCallback(() => {
    setRefreshToken((value) => value + 1);
  }, []);

  const stats = useMemo(() => {
    const totalPlans = pagination?.total ?? summary?.totalPlans ?? plans.length;
    const totalValue =
      summary?.totalValue ?? plans.reduce((acc, plan) => acc + (plan.filled_quote_amount ?? 0), 0);
    const avgProgress =
      summary?.avgProgress ??
      (plans.length
        ? plans.reduce((acc, plan) => acc + (plan.progress_pct ?? 0), 0) / plans.length
        : 0);
    const activeCount =
      summary?.activeCount ?? plans.filter((plan) => normalizeStatus(plan) === 'active').length;
    const scheduledCount =
      summary?.scheduledCount ??
      plans.filter((plan) => normalizeStatus(plan) === 'scheduled').length;

    return {
      totalPlans,
      totalValue,
      avgProgress,
      activeCount,
      scheduledCount,
    };
  }, [pagination?.total, summary, plans]);

  const sortedPlans = useMemo(() => {
    const arr = [...plans];
    if (sortBy === 'progress') {
      return arr.sort((a, b) => {
        const aProg = typeof a.progress_pct === 'number' ? a.progress_pct : -1;
        const bProg = typeof b.progress_pct === 'number' ? b.progress_pct : -1;
        if (bProg !== aProg) return bProg - aProg;
        return (
          (b.last_event_at ? Date.parse(b.last_event_at) : 0) -
          (a.last_event_at ? Date.parse(a.last_event_at) : 0)
        );
      });
    }
    if (sortBy === 'target') {
      const distance = (plan: LimitPlanRow) => {
        if (plan.price_target == null || plan.current_price == null)
          return Number.POSITIVE_INFINITY;
        return Math.abs(plan.current_price - plan.price_target);
      };
      return arr.sort((a, b) => {
        const activeA = normalizeStatus(a) === 'active' && (a.progress_pct ?? 0) > 0;
        const activeB = normalizeStatus(b) === 'active' && (b.progress_pct ?? 0) > 0;
        if (activeA !== activeB) return activeA ? -1 : 1;
        const distA = distance(a);
        const distB = distance(b);
        if (distA !== distB) return distA - distB;
        return (
          (b.last_event_at ? Date.parse(b.last_event_at) : 0) -
          (a.last_event_at ? Date.parse(a.last_event_at) : 0)
        );
      });
    }
    return arr.sort((a, b) => {
      const aTs = a.last_event_at
        ? Date.parse(a.last_event_at)
        : a.started_at
          ? Date.parse(a.started_at)
          : 0;
      const bTs = b.last_event_at
        ? Date.parse(b.last_event_at)
        : b.started_at
          ? Date.parse(b.started_at)
          : 0;
      return bTs - aTs;
    });
  }, [plans, sortBy]);

  const visiblePlans = useMemo(() => {
    if (variant === 'spotlight') {
      return sortedPlans.slice(0, 6);
    }
    return sortedPlans;
  }, [sortedPlans, variant]);

  const hasRenderedPlans = visiblePlans.length > 0;

  useEffect(() => {
    if (!shouldLockHeight) return;
    if (typeof height === 'number' && Number.isFinite(height)) return;
    if (lockedHeight != null) return;
    if (!hasRenderedPlans || loading) return;
    const id = requestAnimationFrame(() => {
      const host = wrapperRef.current;
      if (!host) return;
      const frame = host.firstElementChild as HTMLElement | null;
      const measured = frame?.offsetHeight ?? 0;
      if (measured > 0) {
        setLockedHeight(measured);
      }
    });
    return () => cancelAnimationFrame(id);
  }, [shouldLockHeight, height, lockedHeight, hasRenderedPlans, loading, viewMode, variant]);

  useEffect(() => {
    if (!shouldLockHeight) {
      setLockedHeight(null);
      return;
    }
    if (typeof height === 'number' && Number.isFinite(height)) {
      setLockedHeight(height);
    } else {
      setLockedHeight(null);
    }
  }, [shouldLockHeight, height, variant, viewMode]);

  const totalValueLabel = fmt(stats.totalValue);
  const avgProgressLabel = Number.isFinite(stats.avgProgress)
    ? `${stats.avgProgress.toFixed(1)}%`
    : '—';
  const planCountLabel = stats.totalPlans ?? visiblePlans.length;

  const summaryHighlights = (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <div className="rounded-xl border border-border/50 bg-background/70 p-2.5 shadow-sm">
        <div className="text-xs text-muted-foreground">Plans Live</div>
        <div className="font-semibold text-foreground">{planCountLabel}</div>
      </div>
      <div className="rounded-xl border border-border/50 bg-background/70 p-2.5 shadow-sm">
        <div className="text-xs text-muted-foreground">Total Value (USD)</div>
        <div className="font-semibold text-foreground">{totalValueLabel}</div>
      </div>
      <div className="rounded-xl border border-border/50 bg-background/70 p-2.5 shadow-sm">
        <div className="text-xs text-muted-foreground">Avg Progress</div>
        <div className="font-semibold text-foreground">{avgProgressLabel}</div>
      </div>
      <div className="rounded-xl border border-border/50 bg-background/70 p-2.5 shadow-sm">
        <div className="text-xs text-muted-foreground">Active</div>
        <div className="font-semibold text-emerald-500">{stats.activeCount}</div>
      </div>
      <div className="rounded-xl border border-border/50 bg-background/70 p-2.5 shadow-sm">
        <div className="text-xs text-muted-foreground">Scheduled</div>
        <div className="font-semibold text-amber-500">{stats.scheduledCount}</div>
      </div>
    </div>
  );

  const controlPillBase =
    'inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

  const renderHeaderFilters = (alignment: 'start' | 'center' = 'start') => (
    <div
      className={cn(
        'flex flex-wrap items-center gap-3',
        alignment === 'center' ? 'justify-center' : 'justify-start',
      )}
    >
      <div className="flex items-center gap-1.5">
        <Filter className="w-3 h-3 text-muted-foreground" />
        <CustomDropdown
          options={STATUS_OPTIONS}
          value={statusFilter}
          onSelect={handleStatusSelect}
          placeholder="Status"
          variant="outline"
          size="sm"
          triggerClassName={cn(controlPillBase, 'min-w-[120px] justify-between')}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
        <CustomDropdown
          options={SORT_OPTIONS}
          value={sortBy}
          onSelect={handleSortSelect}
          size="sm"
          variant="ghost"
          triggerClassName={cn(controlPillBase, 'min-w-[160px] justify-between')}
        />
      </div>
    </div>
  );

  const headerIcon = (
    <div className="relative flex h-7 w-7 items-center justify-center">
      <span
        className="absolute h-8 w-8 rounded-full bg-primary/30 blur-md opacity-60"
        aria-hidden
      />
      <Image src="/jupiter.svg" alt="Jupiter" width={24} height={24} className="relative h-5 w-5" />
    </div>
  );

  const jupiterBadge = (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[11px] font-semibold text-muted-foreground">
      <Image src="/jupiter.svg" alt="Jupiter" width={16} height={16} className="h-4 w-4" />
      Jupiter Limit Feed
    </span>
  );

  const planTypeToggle = planTypeControl ? (
    <div className="inline-flex items-center rounded-xl border border-border/60 bg-background/70 p-0.5 shadow-inner">
      {PLAN_TYPE_OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => planTypeControl.onChange(option.value as 'dca' | 'limit')}
          className={cn(
            'rounded-lg px-3 py-1 text-xs font-semibold transition-all',
            planTypeControl.value === option.value
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/40'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  ) : (
    <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">
      Limit Plans
    </span>
  );

  const viewToggle = (
    <div className="inline-flex items-center rounded-xl border border-border/60 bg-background/70 p-0.5 shadow-inner">
      <button
        type="button"
        onClick={() => setViewMode('cards')}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
          viewMode === 'cards'
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/40'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <LayoutGrid className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Cards</span>
      </button>
      <button
        type="button"
        onClick={() => setViewMode('table')}
        className={cn(
          'inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all',
          viewMode === 'table'
            ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/40'
            : 'text-muted-foreground hover:text-foreground',
        )}
      >
        <TableIcon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Table</span>
      </button>
    </div>
  );

  const headerStatus = error
    ? { label: 'Error', tone: 'danger' as const, pulse: false }
    : loading && !plans.length
      ? { label: 'Syncing', tone: 'warning' as const, pulse: true }
      : loadingMore
        ? { label: 'Loading more', tone: 'warning' as const, pulse: true }
        : { label: 'Jupiter Live', tone: 'success' as const, pulse: true };

  const headerActions =
    variant === 'full' ? (
      <div className="flex w-full flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            {planTypeToggle}
            {jupiterBadge}
          </div>
          <div className="flex flex-1 basis-full justify-center sm:basis-auto">
            {renderHeaderFilters('center')}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {viewToggle}
            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading && !plans.length}
              className={cn(
                controlPillBase,
                'h-9 w-9 justify-center px-0 py-0 text-muted-foreground disabled:opacity-60',
              )}
              aria-label="Refresh Jupiter limit plans"
            >
              <RefreshCw
                className={cn('h-3.5 w-3.5', loading && !plans.length && 'animate-spin')}
              />
            </button>
          </div>
        </div>
        {summaryHighlights}
      </div>
    ) : (
      <div className="flex w-full flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {jupiterBadge}
            {planTypeControl ? planTypeToggle : null}
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {planCountLabel} plans
          </span>
        </div>
        {renderHeaderFilters('start')}
      </div>
    );

  const planShellClass =
    'flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/60 bg-background/80 shadow-inner';
  const scrollAreaClass = cn(
    'flex-1 min-h-0 overflow-y-auto',
    isMobile && 'overscroll-contain touch-pan-y',
  );
  const innerScrollAreaClass = cn(
    'flex-1 min-h-0 overflow-y-auto',
    isMobile && 'overscroll-contain touch-pan-y',
  );

  return (
    <div ref={wrapperRef} className="h-full">
      <MonitorWidgetFrame
        title={variant === 'full' ? 'Jupiter Limit Plans' : 'Jupiter Limit Snapshot'}
        subtitle={
          variant === 'full'
            ? 'Live Jupiter limit order plans with NOS attribution'
            : 'Realtime Jupiter limit order activity'
        }
        icon={headerIcon}
        status={headerStatus}
        actions={headerActions}
        className={cn(
          'flex h-full min-h-0 flex-col overflow-hidden',
          variant === 'spotlight' && 'min-h-[320px]',
        )}
        contentClassName={cn(
          'flex min-h-0 flex-1 flex-col gap-4 sm:gap-5',
          variant === 'full' && 'sm:gap-6',
        )}
        style={frameStyle}
      >
        <div className="flex-1 min-h-0">
          <div className={planShellClass}>
            {error ? (
              <div className="flex flex-1 items-center justify-center gap-2 px-4 py-6 text-sm text-red-500">
                <AlertTriangle className="h-4 w-4" />
                <span>Error: {error}</span>
              </div>
            ) : loading && !plans.length ? (
              <div className={cn(scrollAreaClass, 'p-3')}>
                {viewMode === 'cards' ? (
                  <div className="grid grid-cols-1 gap-3 text-[13px] lg:grid-cols-2">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="relative">
                        <div className="relative rounded-xl border border-border/30 overflow-hidden bg-background/70">
                          <div className="p-3">
                            <div className="mb-3 flex items-start justify-between">
                              <div className="flex flex-1 items-start gap-3">
                                <div className="skeleton h-10 w-10 rounded-lg" />
                                <div className="flex-1">
                                  <div className="skeleton mb-2 h-4 w-32 rounded" />
                                  <div className="skeleton h-3 w-24 rounded" />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <div className="skeleton h-7 w-16 rounded" />
                                <div className="skeleton h-7 w-7 rounded" />
                              </div>
                            </div>
                            <div className="mb-3">
                              <div className="mb-2 flex items-center justify-between">
                                <div className="skeleton h-3 w-16 rounded" />
                                <div className="skeleton h-3 w-20 rounded" />
                              </div>
                              <div className="skeleton h-2 w-full rounded-full" />
                            </div>
                            <div className="mb-3 grid grid-cols-2 gap-3 rounded-lg border border-border/30 bg-background/60 p-2.5">
                              {Array.from({ length: 4 }).map((_, j) => (
                                <div key={j}>
                                  <div className="skeleton mb-1 h-3 w-16 rounded" />
                                  <div className="skeleton h-4 w-20 rounded" />
                                </div>
                              ))}
                            </div>
                            <div className="grid grid-cols-1 gap-2 border-t border-border/30 pt-3 text-xs sm:grid-cols-2">
                              {Array.from({ length: 2 }).map((_, k) => (
                                <div key={k} className="flex items-center justify-between sm:block">
                                  <div className="skeleton mb-1 h-3 w-12 rounded" />
                                  <div className="skeleton h-3 w-16 rounded" />
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={scrollAreaClass}>
                    <table className="w-full text-sm">
                      <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                        <tr>
                          {[
                            'Plan',
                            'Status',
                            'Progress',
                            'Initial',
                            'Filled',
                            'Remaining',
                            'Target Price',
                            'Wallet',
                            'Actions',
                          ].map((header) => (
                            <th key={header} className="px-4 py-2 text-left">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>
                            <td className="px-4 py-3">
                              <div className="skeleton h-10 w-32 rounded" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="skeleton h-6 w-16 rounded-full" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="skeleton h-4 w-20 rounded" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="skeleton h-4 w-24 rounded" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="skeleton h-4 w-24 rounded" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="skeleton h-4 w-24 rounded" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="skeleton h-4 w-28 rounded" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="skeleton h-4 w-20 rounded" />
                            </td>
                            <td className="px-4 py-3">
                              <div className="skeleton h-7 w-16 rounded" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : !visiblePlans.length ? (
              <div className="flex flex-1 items-center justify-center px-4 py-8 text-muted-foreground">
                <div className="text-center">
                  <Target className="mx-auto mb-3 h-10 w-10 opacity-40" />
                  <p className="text-sm">No limit plans found for this filter</p>
                </div>
              </div>
            ) : viewMode === 'cards' ? (
              <div className={cn(scrollAreaClass, 'p-3')}>
                <div className="grid grid-cols-1 gap-3 text-[13px] lg:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {visiblePlans.map((plan, index) => (
                      <LimitPlanCard
                        key={plan.plan_id}
                        plan={plan}
                        index={index}
                        shouldAnimate={initialAnimationRef.current}
                        onOpen={() => openPlan({ planType: 'limit', planId: plan.plan_id, plan })}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 overflow-hidden flex-col">
                <div className={innerScrollAreaClass}>
                  <table className="w-full text-sm">
                    <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground">
                      <tr>
                        <th className="px-4 py-2 text-left">Plan</th>
                        <th className="px-4 py-2 text-left">Status</th>
                        <th className="px-4 py-2 text-left">Progress</th>
                        <th className="px-4 py-2 text-left">Initial</th>
                        <th className="px-4 py-2 text-left">Filled</th>
                        <th className="px-4 py-2 text-left">Remaining</th>
                        <th className="px-4 py-2 text-left">Target Price</th>
                        <th className="px-4 py-2 text-left">Wallet</th>
                        <th className="px-4 py-2 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {visiblePlans.map((plan) => (
                        <tr key={plan.plan_id} className="hover:bg-muted/10">
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-1">
                              <span className="font-semibold text-foreground">
                                {plan.side?.toUpperCase()} {plan.base_symbol}/
                                {plan.quote_symbol ?? '—'}
                              </span>
                              <a
                                href={`https://solscan.io/address/${plan.plan_id}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs font-mono text-primary underline decoration-dotted"
                              >
                                {truncateAddress(plan.plan_id, 4, 4)}
                              </a>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                statusBadgeClass(plan),
                              )}
                            >
                              {plan.status?.toUpperCase() ?? 'UNKNOWN'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm text-foreground">
                                {formatProgress(plan)}
                              </span>
                              <div className="h-1 w-16 rounded-full bg-muted/40">
                                <div
                                  className="h-full rounded-full bg-primary transition-all"
                                  style={{
                                    width:
                                      plan.progress_pct != null
                                        ? `${Math.min(100, plan.progress_pct)}%`
                                        : '0%',
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-foreground">
                            {`${formatNumber(plan.initial_base_amount)} ${plan.base_symbol}`}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-foreground">
                            {`${formatNumber(plan.filled_base_amount)} ${plan.base_symbol}`}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-foreground">
                            {`${formatNumber(plan.remaining_base_amount)} ${plan.base_symbol}`}
                          </td>
                          <td className="px-4 py-3 font-mono text-sm text-foreground">
                            {(() => {
                              if (plan.price_target == null) return '—';
                              const price = fmt(plan.price_target);
                              return price ? `${price} ${plan.quote_symbol ?? ''}` : '—';
                            })()}
                          </td>
                          <td className="px-4 py-3 text-xs">
                            {plan.wallet ? (
                              <WalletActionMenu
                                wallet={plan.wallet}
                                planId={plan.plan_id}
                                planType="limit"
                                size="sm"
                                align="left"
                              />
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  openPlan({ planType: 'limit', planId: plan.plan_id, plan })
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
                              >
                                <Activity className="h-3 w-3" /> Details
                              </button>
                              <PlanShareButton planId={plan.plan_id} planType="limit" />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasMore && !error && (
          <div className="rounded-xl border border-border/50 bg-background/70 px-3 py-3 text-center shadow-sm">
            <button
              type="button"
              onClick={loadMorePlans}
              disabled={loadingMore}
              className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-60"
            >
              {loadingMore ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <ArrowUpRight className="h-3 w-3" />
              )}
              Load more
            </button>
          </div>
        )}
      </MonitorWidgetFrame>
    </div>
  );
}

interface LimitPlanCardProps {
  plan: LimitPlanRow;
  index: number;
  shouldAnimate: boolean;
  onOpen: () => void;
}

function LimitPlanCard({ plan, index, shouldAnimate, onOpen }: LimitPlanCardProps) {
  const statusConfig = getStatusConfig(plan);
  const StatusIcon = statusConfig.icon;
  const progress = plan.progress_pct ?? 0;
  const totalValue = plan.filled_quote_amount ?? 0;
  const sideNormalized = (plan.side ?? '').toLowerCase();
  const operationLabel = sideNormalized ? sideNormalized.toUpperCase() : '—';
  const operationClasses =
    sideNormalized === 'sell'
      ? 'border-red-500/40 bg-red-500/15 text-red-500'
      : sideNormalized === 'buy'
        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-500'
        : 'border-border/40 bg-muted/20 text-muted-foreground';

  const baseUnit = plan.base_symbol ?? '';
  const initialAmount = plan.initial_base_amount ?? 0;
  const filledAmount = plan.filled_base_amount ?? 0;
  const remainingAmount = plan.remaining_base_amount ?? Math.max(0, initialAmount - filledAmount);
  const initialDisplay = fmt(initialAmount);
  const filledDisplay = fmt(filledAmount);
  const remainingDisplay = fmt(remainingAmount);

  const totalActionLabel = 'Total Filled';
  const remainingLabel = 'Remaining';
  const filledValueLabel = filledDisplay + (baseUnit ? ` ${baseUnit}` : '');
  const remainingValueLabel = remainingDisplay + (baseUnit ? ` ${baseUnit}` : '');
  const progressSummaryLabel = `${filledDisplay}/${initialDisplay}${baseUnit ? ` ${baseUnit}` : ''}`;

  const targetPriceDisplay = plan.price_target != null ? fmt(plan.price_target) : null;
  const avgFillDisplay = plan.avg_fill_price != null ? fmt(plan.avg_fill_price) : null;

  return (
    <motion.div
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={shouldAnimate ? { delay: index * 0.05 } : undefined}
      className={cn(
        'relative rounded-xl border overflow-hidden transition-all duration-200',
        'hover:shadow-lg hover:shadow-primary/5',
        getSideColorClasses(plan.side, plan.status).cardBg,
        getSideColorClasses(plan.side, plan.status).border,
        totalValue >= 10000 && 'ring-1 ring-primary/20 dark:ring-primary/30',
      )}
    >
      {/* High Value Indicator */}
      {totalValue >= 50000 && (
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold py-1 px-4 flex items-center gap-1">
          <DollarSign className="w-3 h-3" />
          High Value Limit Plan
        </div>
      )}

      <div className={cn('p-3', totalValue >= 50000 && 'pt-6')}>
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-1 items-start gap-3">
            <div className="flex flex-col items-center gap-2">
              <span
                className={cn(
                  'px-2 py-0.5 rounded-md border text-xs font-semibold uppercase tracking-wide',
                  operationClasses,
                )}
              >
                {operationLabel}
              </span>
              <div className={cn('rounded-lg p-1.5', statusConfig.bg)}>
                <StatusIcon className={cn('w-4 h-4', statusConfig.color)} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-bold text-foreground">
                  {plan.base_symbol}/{plan.quote_symbol}
                </span>
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide',
                    statusConfig.bg,
                    statusConfig.color,
                    statusConfig.border,
                  )}
                >
                  {statusConfig.label}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground font-mono">
                <ExternalLink className="h-3 w-3 text-primary" />
                <a
                  href={`https://solscan.io/address/${plan.plan_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="underline decoration-dotted hover:text-primary"
                >
                  {truncateAddress(plan.plan_id, 4, 4)}
                </a>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={onOpen}
              className="inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Activity className="h-3 w-3" /> Details
            </button>
            <PlanShareButton planId={plan.plan_id} planType="limit" />
            {plan.wallet && (
              <WalletActionMenu wallet={plan.wallet} planId={plan.plan_id} planType="limit" />
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-3 p-2.5 rounded-lg bg-background/50 dark:bg-background/20 border border-border/30">
          <div>
            <div className="text-xs text-muted-foreground">Initial Amount</div>
            <div className="font-semibold text-foreground">
              <span className="font-mono">{initialDisplay}</span>
              {baseUnit && <span> {baseUnit}</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Filled Amount</div>
            <div className="font-semibold text-foreground">
              <span className="font-mono">{filledDisplay}</span>
              {baseUnit && <span> {baseUnit}</span>}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Target Price</div>
            <div className="font-semibold text-foreground">
              {targetPriceDisplay ? (
                <>
                  <span className="font-mono">{targetPriceDisplay}</span>
                  {plan.quote_symbol && <span> {plan.quote_symbol}</span>}
                </>
              ) : (
                '—'
              )}
            </div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Remaining</div>
            <div className="font-semibold text-foreground">
              <span className="font-mono">{remainingDisplay}</span>
              {baseUnit && <span> {baseUnit}</span>}
            </div>
          </div>
          {avgFillDisplay && (
            <div className="col-span-2">
              <div className="text-xs text-muted-foreground">Average Fill Price</div>
              <div className="font-semibold text-foreground">
                <span className="font-mono">{avgFillDisplay}</span>
                {plan.quote_symbol && <span> {plan.quote_symbol}</span>}
              </div>
            </div>
          )}
        </div>

        {/* Progress Summary */}
        {progress !== null && progress !== undefined && (
          <div className="mt-4 space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/30 dark:bg-muted/20">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, progress)}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={cn(
                    'absolute inset-y-0 left-0 rounded-full',
                    progress >= 100
                      ? 'bg-emerald-500'
                      : progress >= 75
                        ? 'bg-amber-500'
                        : 'bg-primary',
                  )}
                />
              </div>
              <span className="text-sm font-semibold text-foreground">{progress.toFixed(1)}%</span>
              <span className="text-xs text-muted-foreground">{progressSummaryLabel}</span>
            </div>
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>{filledValueLabel}</span>
              <span className="text-muted-foreground">→</span>
              <span>{remainingValueLabel}</span>
            </div>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
              <span>{totalActionLabel}</span>
              <span>{remainingLabel}</span>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs border-t border-border/30 pt-3">
          <div className="flex items-center justify-between sm:block">
            <div className="text-muted-foreground mb-1">Created</div>
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3 text-muted-foreground" />
              <span className="font-mono text-foreground">
                {plan.started_at ? new Date(plan.started_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between sm:block">
            <div className="text-muted-foreground mb-1">Last Update</div>
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-muted-foreground" />
              <span className="font-mono text-foreground">
                {plan.last_event_at ? new Date(plan.last_event_at).toLocaleDateString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
