'use client';
import {
  useEffect,
  useState,
  useMemo,
  useRef,
  useCallback,
  memo,
  type CSSProperties,
} from 'react';
import { toDate } from '@/lib/time';
import { motion, AnimatePresence } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Play,
  Pause,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Filter,
  DollarSign,
  Calendar,
  Zap,
  Activity,
  ArrowUpDown,
  XCircle,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { type DcaPlanRow } from '@/lib/api/monitor-client';
import { monitorWsClient } from '@/lib/monitor/ws-client';
import { getMonitorApiKey } from '@/lib/api/monitorConfig';
import { markMonitorDataHydrated } from '@/lib/monitor/runtime';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { PlanShareButton } from '@/components/monitor/PlanShareButton';
import { usePlanModal } from '@/components/monitor/PlanModalProvider';
import { MonitorWidgetFrame } from '@/components/monitor/MonitorWidgetFrame';
import { PlanIdentifierMenu } from '@/components/monitor/PlanIdentifierMenu';
import { WalletActionMenu } from '@/components/monitor/WalletActionMenu';

type DCAPlan = DcaPlanRow;
type NormalizedPlanStatus = 'active' | 'scheduled' | 'paused' | 'closed' | 'completed';

type EnhancedPlan = DCAPlan & {
  _statusNorm: NormalizedPlanStatus;
  _progress: number | null;
  _expectedSlices: number | null;
  _remainingSlices: number | null;
  _remainingInput: number | null;
  _effectiveStartedAt: string;
  _estimatedCompletion: string | null;
  _isClosedEarly: boolean;
};

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

const DCA_SORT_VALUES = ['progress', 'value', 'time', 'frequency'] as const;
type DcaSortOption = (typeof DCA_SORT_VALUES)[number];

function isDcaSortOption(value: string): value is DcaSortOption {
  return (DCA_SORT_VALUES as readonly string[]).includes(value);
}

const DCA_SIDE_FILTERS = [
  { value: 'all', label: 'All Sides' },
  { value: 'buy', label: 'Buys' },
  { value: 'sell', label: 'Sells' },
] as const;
type DcaSideFilter = (typeof DCA_SIDE_FILTERS)[number]['value'];

function isDcaSideFilter(value: string): value is DcaSideFilter {
  return value === 'all' || value === 'buy' || value === 'sell';
}

interface DcaSummarySnapshot {
  totalValue?: number;
  activeCount?: number;
  scheduledCount?: number;
  completedCount?: number;
  closedCount?: number;
  avgProgress?: number;
  totalPlans?: number;
  [key: string]: unknown;
}

function plansEqual(a: DCAPlan, b: DCAPlan) {
  return (
    a.plan_id === b.plan_id &&
    a.status === b.status &&
    a.side === b.side &&
    a.base_symbol === b.base_symbol &&
    a.quote_symbol === b.quote_symbol &&
    (a.progress_pct ?? null) === (b.progress_pct ?? null) &&
    (a.total_quote_spent ?? null) === (b.total_quote_spent ?? null) &&
    (a.total_base_executed ?? null) === (b.total_base_executed ?? null) &&
    (a.avg_quote_slice ?? null) === (b.avg_quote_slice ?? null) &&
    (a.frequency_seconds ?? null) === (b.frequency_seconds ?? null) &&
    (a.next_execution_at ?? null) === (b.next_execution_at ?? null) &&
    a.slices === b.slices &&
    (a.slices_expected ?? null) === (b.slices_expected ?? null) &&
    (a.slices_remaining ?? null) === (b.slices_remaining ?? null) &&
    (a.remaining_quote ?? null) === (b.remaining_quote ?? null) &&
    (a.plan_total_input ?? null) === (b.plan_total_input ?? null) &&
    (a.initial_input_amount ?? null) === (b.initial_input_amount ?? null) &&
    (a.initial_input_symbol ?? null) === (b.initial_input_symbol ?? null) &&
    (a.started_at ?? null) === (b.started_at ?? null) &&
    (a.last_event_at ?? null) === (b.last_event_at ?? null) &&
    (a.last_execution_at ?? null) === (b.last_execution_at ?? null) &&
    (a.wallet ?? null) === (b.wallet ?? null)
  );
}

function mergeStablePlans(
  prev: DCAPlan[],
  next: DCAPlan[],
): { changed: boolean; merged: DCAPlan[] } {
  const prevMap = new Map(prev.map((p) => [p.plan_id, p]));
  let changed = false;
  const merged = next.map((n) => {
    const p = prevMap.get(n.plan_id);
    if (p && plansEqual(p, n)) return p;
    changed = true;
    return n;
  });
  if (!changed) {
    if (prev.length !== next.length) changed = true;
    else {
      const prevIds = prev.map((p) => p.plan_id).join('|');
      const nextIds = next.map((p) => p.plan_id).join('|');
      if (prevIds !== nextIds) changed = true;
    }
  }
  return { changed, merged };
}

function clampPercent(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}

function enhancePlan(plan: DCAPlan, createdMap: Record<string, string | null>): EnhancedPlan {
  const planTotalInput = toNumber(plan.initial_input_amount ?? plan.plan_total_input);
  const totalInputSpent =
    toNumber(plan.total_input_spent) ??
    (plan.side === 'sell' ? toNumber(plan.total_base_executed) : toNumber(plan.total_quote_spent));
  const reportedRemaining = toNumber(plan.remaining_input) ?? toNumber(plan.remaining_quote);
  const epsilon = planTotalInput != null ? Math.max(planTotalInput * 1e-6, 1e-6) : 1e-6;
  const perSliceValue = toNumber(
    plan.per_slice_input ?? (plan.side === 'sell' ? plan.avg_base_slice : plan.avg_quote_slice),
  );
  const hasExecutions =
    plan.has_executions === true ||
    (Number(plan.slices ?? 0) > 0 && (plan.status ?? '').toLowerCase() !== 'scheduled');
  const executedSlices = hasExecutions ? Number(plan.slices ?? 0) : 0;

  let derivedRemaining = reportedRemaining;
  if (
    (derivedRemaining == null || !Number.isFinite(derivedRemaining)) &&
    planTotalInput != null &&
    totalInputSpent != null
  ) {
    derivedRemaining = Math.max(0, planTotalInput - totalInputSpent);
  }
  if (derivedRemaining != null && derivedRemaining < 0) {
    derivedRemaining = Math.abs(derivedRemaining) <= epsilon ? 0 : derivedRemaining;
  }

  const progressCandidates: number[] = [];
  if (typeof plan.progress_pct === 'number') {
    progressCandidates.push(Number(plan.progress_pct));
  }
  if (planTotalInput != null && planTotalInput > 0 && totalInputSpent != null) {
    progressCandidates.push((totalInputSpent / planTotalInput) * 100);
  }
  if (planTotalInput != null && planTotalInput > 0 && derivedRemaining != null) {
    progressCandidates.push(
      ((planTotalInput - Math.max(0, derivedRemaining)) / planTotalInput) * 100,
    );
  }
  if (plan.slices_expected != null && Number(plan.slices_expected) > 0) {
    progressCandidates.push((executedSlices / Number(plan.slices_expected)) * 100);
  }

  let derivedProgress: number | null = progressCandidates.length
    ? clampPercent(
        progressCandidates.reduce(
          (acc, val) => (Number.isFinite(val) ? Math.max(acc, val) : acc),
          0,
        ),
      )
    : null;
  if (
    derivedRemaining != null &&
    Math.abs(derivedRemaining) <= epsilon &&
    planTotalInput != null &&
    totalInputSpent != null &&
    (perSliceValue == null ||
      Math.abs(planTotalInput - totalInputSpent) <= Math.max(perSliceValue * 1.05, epsilon))
  ) {
    derivedProgress = 100;
  }

  const statusRaw = String(plan.status || '').toLowerCase();
  let normalizedStatus: NormalizedPlanStatus;
  switch (statusRaw) {
    case 'active':
    case 'scheduled':
    case 'paused':
    case 'closed':
      normalizedStatus = statusRaw as NormalizedPlanStatus;
      break;
    case 'completed':
      normalizedStatus =
        derivedProgress != null && derivedProgress >= 99.5 ? 'completed' : 'closed';
      break;
    default:
      if (derivedProgress != null && derivedProgress >= 99.5) {
        normalizedStatus = 'completed';
      } else if (plan.has_executions || (derivedProgress != null && derivedProgress > 0)) {
        normalizedStatus = 'active';
      } else {
        normalizedStatus = 'scheduled';
      }
      break;
  }

  if (derivedProgress != null && derivedProgress >= 99.5 && normalizedStatus !== 'completed') {
    normalizedStatus = 'completed';
  }

  const isClosedEarly = normalizedStatus === 'closed';

  const expectedSlices =
    plan.slices_expected != null
      ? Number(plan.slices_expected)
      : (() => {
          if (!perSliceValue || perSliceValue <= 0 || !planTotalInput || planTotalInput <= 0)
            return null;
          const estimate = planTotalInput / perSliceValue;
          if (!Number.isFinite(estimate)) return null;
          const rounded = Math.round(estimate);
          return rounded > 0 ? rounded : null;
        })();
  const remainingSlices =
    expectedSlices != null ? Math.max(0, expectedSlices - executedSlices) : null;

  let effectiveStartedAt = plan.started_at;
  const createdAtOverride = createdMap?.[plan.plan_id];
  if (createdAtOverride) {
    const overrideMs = Date.parse(createdAtOverride);
    const currentMs = Date.parse(plan.started_at ?? '');
    if (Number.isFinite(overrideMs) && (!Number.isFinite(currentMs) || overrideMs < currentMs)) {
      effectiveStartedAt = new Date(overrideMs).toISOString();
    }
  }

  let estimatedCompletion = plan.estimated_completion_at ?? null;
  if (normalizedStatus === 'closed' || normalizedStatus === 'completed') {
    estimatedCompletion = null;
  }

  let displaySlices = executedSlices;
  if (normalizedStatus === 'completed' && expectedSlices != null) {
    displaySlices = Math.max(displaySlices, expectedSlices);
  } else if (!hasExecutions && normalizedStatus === 'scheduled') {
    displaySlices = 0;
  }
  const displayRemainingSlices = normalizedStatus === 'completed' ? 0 : remainingSlices;

  return {
    ...plan,
    _statusNorm: normalizedStatus,
    _progress: derivedProgress,
    _expectedSlices: expectedSlices,
    _remainingSlices: displayRemainingSlices,
    _remainingInput: derivedRemaining != null ? Math.max(0, derivedRemaining) : null,
    _effectiveStartedAt: effectiveStartedAt,
    _estimatedCompletion: estimatedCompletion,
    _isClosedEarly: isClosedEarly,
    slices: displaySlices,
  };
}

const PLAN_TYPE_OPTIONS = [
  { value: 'dca', label: 'DCA Plans' },
  { value: 'limit', label: 'Limit Plans' },
];

interface PlanTypeControl {
  value: 'dca' | 'limit';
  onChange: (value: 'dca' | 'limit') => void;
}

interface DCASectionProps {
  variant?: 'full' | 'spotlight';
  maxRows?: number;
  planTypeControl?: PlanTypeControl;
  height?: number;
}

function DCASectionInner({ variant = 'full', maxRows, planTypeControl, height }: DCASectionProps) {
  const [status, setStatus] = useState('all');
  const [sideFilter, setSideFilter] = useState<DcaSideFilter>('all');
  const [plans, setPlans] = useState<DCAPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState<DcaSortOption>('progress');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>(() => {
    if (variant === 'spotlight') return 'table';
    if (typeof window === 'undefined') {
      return 'cards';
    }
    try {
      const saved = window.localStorage.getItem('monitor:dca:view') ?? '';
      if (saved === 'cards' || saved === 'table') {
        return saved as 'cards' | 'table';
      }
      if (saved === 'chart') {
        return 'cards';
      }
    } catch {}
    return window.matchMedia && window.matchMedia('(max-width: 767px)').matches ? 'cards' : 'table';
  });
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(max-width: 767px)').matches;
  });
  const [mobileFrameHeight, setMobileFrameHeight] = useState<number>(() =>
    computeMobileFrameHeight(height),
  );
  const searchParams = useSearchParams();
  const capturedParam = variant === 'spotlight' ? searchParams?.get('captured') : null;
  const capturedLabel = useMemo(() => {
    if (!capturedParam) return null;
    const capturedDate = new Date(capturedParam);
    if (Number.isNaN(capturedDate.getTime())) return null;
    const iso = capturedDate.toISOString();
    return `${iso.slice(0, 16).replace('T', ' ')} UTC`;
  }, [capturedParam]);
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
  const shouldLockHeight = variant === 'full' && !isMobile;
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [lockedHeight, setLockedHeight] = useState<number | null>(null);
  const frameStyle = useMemo<CSSProperties | undefined>(() => {
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
  const prevPlansRef = useRef<DCAPlan[]>([]);
  const hydrationMarkedRef = useRef(false);
  const { openPlan, registerPlans } = usePlanModal();
  const hasApiAccess = useMemo(() => Boolean(getMonitorApiKey()), []);
  const summaryRef = useRef<DcaSummarySnapshot | null>(null);
  const subscriptionRef = useRef<ReturnType<typeof monitorWsClient.subscribe> | null>(null);
  const [refreshToken, setRefreshToken] = useState(0);
  const handleSideSelect = useCallback((value: string) => {
    if (isDcaSideFilter(value)) {
      setSideFilter(value);
    }
  }, []);
  const handleSortSelect = useCallback((value: string) => {
    if (isDcaSortOption(value)) {
      setSortBy(value);
    }
  }, []);

  useEffect(() => {
    if (plans.length) {
      registerPlans('dca', plans);
    }
  }, [plans, registerPlans]);

  const applyPlansPayload = useCallback((payload: unknown) => {
    const container = (payload as Record<string, unknown>) ?? {};
    const body = (container.data as Record<string, unknown> | undefined) ?? container;
    const rowsRaw = body.rows;
    const rows = Array.isArray(rowsRaw) ? (rowsRaw as DCAPlan[]) : [];
    if (Object.prototype.hasOwnProperty.call(body, 'summary')) {
      const summaryPayload = body.summary;
      summaryRef.current =
        summaryPayload && typeof summaryPayload === 'object'
          ? (summaryPayload as DcaSummarySnapshot)
          : null;
    }
    const { changed, merged } = mergeStablePlans(prevPlansRef.current, rows);
    if (changed) {
      prevPlansRef.current = merged;
      setPlans(merged);
    }
    if (!hydrationMarkedRef.current) {
      hydrationMarkedRef.current = true;
      markMonitorDataHydrated();
    }
    setLoading(false);
    setRefreshing(false);
    setError(null);
  }, []);

  useEffect(() => {
    if (!hasApiAccess) {
      setPlans([]);
      prevPlansRef.current = [];
      summaryRef.current = null;
      setError('monitor_api_key_missing');
      setLoading(false);
      setRefreshing(false);
      return;
    }

    setError(null);
    if (prevPlansRef.current.length === 0) {
      setLoading(true);
    }
    summaryRef.current = null;

    const params: Record<string, unknown> = {};
    const statusParam = status === 'all' || status === 'closed' ? undefined : status;
    if (statusParam) params.status = statusParam;
    if (sideFilter !== 'all') params.side = sideFilter;

    const subscription = monitorWsClient.subscribe('monitor.dcaPlans', params, {
      onSnapshot: (payload) => applyPlansPayload(payload),
      onUpdate: (payload) => applyPlansPayload(payload),
      onError: (err) => {
        setError(err.message || err.code || 'dca_stream_error');
        setLoading(false);
        setRefreshing(false);
      },
    });
    subscriptionRef.current = subscription;
    subscription.ready.catch((err) => {
      setError(err?.message || 'dca_stream_error');
      setLoading(false);
      setRefreshing(false);
    });

    return () => {
      subscription.unsubscribe();
      if (subscriptionRef.current === subscription) {
        subscriptionRef.current = null;
      }
    };
  }, [status, sideFilter, hasApiAccess, applyPlansPayload, refreshToken]);

  useEffect(() => {
    if (variant !== 'full') return;
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem('monitor:dca:view', viewMode);
    } catch {}
  }, [viewMode, variant]);

  function trimTrailingZeros(value: string) {
    return value
      .replace(/(\.\d*?[1-9])0+$/u, '$1')
      .replace(/\.0+$/u, '')
      .replace(/^-0$/, '0');
  }

  function formatNumber(value: unknown): string {
    if (value == null) return '—';
    const numeric = typeof value === 'bigint' ? Number(value) : Number(value);
    if (!Number.isFinite(numeric)) return '—';
    const abs = Math.abs(numeric);
    if (abs >= 1_000_000) {
      return `${trimTrailingZeros((numeric / 1_000_000).toFixed(1))}M`;
    }
    if (abs >= 10_000) {
      return `${Math.round(numeric / 1000)}K`;
    }
    if (abs >= 1) {
      return Math.round(numeric).toLocaleString();
    }
    if (abs === 0) {
      return '0';
    }
    if (abs >= 0.01) {
      return trimTrailingZeros(numeric.toFixed(2));
    }
    return trimTrailingZeros(numeric.toPrecision(2));
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

  function rel(input?: string | Date | null, withSuffix = false): string {
    if (!input) return '—';
    const parsed = typeof input === 'string' ? toDate(input) : input instanceof Date ? input : null;
    const targetMs = parsed ? parsed.getTime() : NaN;
    if (!Number.isFinite(targetMs)) return '—';
    const diffMs = targetMs - Date.now();
    const future = diffMs > 0;
    const d = Math.abs(diffMs);
    const totalSeconds = Math.floor(d / 1000);

    let chunk: string;
    if (totalSeconds < 60) {
      chunk = `${totalSeconds}s`;
    } else if (totalSeconds < 3600) {
      chunk = `${Math.floor(totalSeconds / 60)}m`;
    } else if (totalSeconds < 86400) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      if (minutes > 0) {
        chunk = `${hours}h ${minutes}m`;
      } else {
        chunk = `${hours}h`;
      }
    } else {
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      if (hours > 0) {
        chunk = `${days}d ${hours}h`;
      } else {
        chunk = `${days}d`;
      }
    }

    if (!withSuffix) return chunk;
    return future ? `in ${chunk}` : `${chunk} ago`;
  }

  function formatFrequency(seconds?: number) {
    if (!seconds) return '—';
    const minutes = seconds / 60;
    const hours = minutes / 60;
    const days = hours / 24;

    if (days >= 1) {
      const wholeDays = Math.floor(days);
      const remainingHours = Math.floor((days - wholeDays) * 24);
      if (remainingHours > 0) {
        return `${wholeDays}d ${remainingHours}h`;
      }
      return `${wholeDays} ${wholeDays === 1 ? 'day' : 'days'}`;
    }

    if (hours >= 1) {
      const wholeHours = Math.floor(hours);
      const remainingMinutes = Math.floor((hours - wholeHours) * 60);
      if (remainingMinutes > 0) {
        return `${wholeHours}h ${remainingMinutes}m`;
      }
      return `${wholeHours} ${wholeHours === 1 ? 'hour' : 'hours'}`;
    }

    return `${Math.round(minutes)} ${Math.round(minutes) === 1 ? 'minute' : 'minutes'}`;
  }

  function formatSecondsShort(seconds?: number | null) {
    if (!seconds) return null;
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.round(seconds / 3600)}h`;
    return `${Math.round(seconds / 86400)}d`;
  }

  function deriveNextExecutionDate(plan: EnhancedPlan): Date | null {
    if (!plan) return null;
    if (
      plan._statusNorm === 'closed' ||
      plan._statusNorm === 'completed' ||
      plan._statusNorm === 'scheduled'
    ) {
      return null;
    }

    const rawNext = plan.next_execution_at ? toDate(plan.next_execution_at) : null;
    const referenceSource = plan.last_execution_at ?? plan.last_event_at ?? plan.started_at ?? null;
    const referenceDate = referenceSource ? toDate(referenceSource) : null;
    const frequencySeconds =
      Number.isFinite(plan.frequency_seconds) && plan.frequency_seconds
        ? Number(plan.frequency_seconds)
        : null;

    let candidate = rawNext;
    if (frequencySeconds && referenceDate) {
      const minNextTime = referenceDate.getTime() + frequencySeconds * 1000;
      if (!candidate || candidate.getTime() < minNextTime) {
        candidate = new Date(minNextTime);
      }
    }

    return candidate ?? null;
  }

  function buildConditions(plan: EnhancedPlan): string | null {
    if (!plan || plan._statusNorm !== 'scheduled') return null;
    const parts: string[] = [];
    if (plan.trigger_price != null) parts.push(`Trigger ${plan.trigger_price}`);
    if (plan.min_price != null) parts.push(`Min ${plan.min_price}`);
    if (plan.max_price != null) parts.push(`Max ${plan.max_price}`);
    if (plan.start_price != null) parts.push(`Start ${plan.start_price}`);
    const after = formatSecondsShort(plan.start_after_seconds ?? null);
    if (after) parts.push(`Start after ${after}`);
    if (plan.activation) parts.push(`Activation ${String(plan.activation)}`);
    if (!parts.length) return null;
    return parts.join(' • ');
  }

  const getStatusConfig = (plan: EnhancedPlan) => {
    switch (plan._statusNorm) {
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
      case 'paused':
        return {
          icon: Pause,
          color: 'text-blue-600 dark:text-blue-400',
          bg: 'bg-blue-500/10 dark:bg-blue-900/20',
          border: 'border-blue-500/20 dark:border-blue-800/30',
          label: 'Paused',
        };
      case 'closed':
        return {
          icon: XCircle,
          color: 'text-rose-600 dark:text-rose-400',
          bg: 'bg-rose-500/10 dark:bg-rose-900/20',
          border: 'border-rose-500/20 dark:border-rose-800/30',
          label: plan._progress != null && plan._progress >= 99.5 ? 'Closed' : 'Closed Early',
        };
      case 'completed':
        return {
          icon: CheckCircle,
          color: 'text-gray-600 dark:text-gray-400',
          bg: 'bg-gray-500/10 dark:bg-gray-900/20',
          border: 'border-gray-500/20 dark:border-gray-800/30',
          label: 'Completed',
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-muted-foreground',
          bg: 'bg-muted/10 dark:bg-muted/5',
          border: 'border-border dark:border-border/30',
          label: plan.status || 'Unknown',
        };
    }
  };

  const enhancedPlans = useMemo(() => plans.map((plan) => enhancePlan(plan, {})), [plans]);

  const filteredPlans = useMemo(() => {
    let base = enhancedPlans;
    if (sideFilter !== 'all') {
      base = base.filter((plan) => (plan.side ?? '').toLowerCase() === sideFilter);
    }
    if (status === 'all') return base;
    if (status === 'closed') {
      return base.filter(
        (plan) => plan._statusNorm === 'closed' || plan._statusNorm === 'completed',
      );
    }
    return base.filter((plan) => plan._statusNorm === status);
  }, [enhancedPlans, status, sideFilter]);

  const sortedPlans = useMemo(() => {
    const priority: Record<NormalizedPlanStatus, number> = {
      active: 0,
      scheduled: 1,
      paused: 2,
      closed: 3,
      completed: 4,
    };
    const arr = [...filteredPlans];
    if (status === 'all') {
      return arr.sort((a, b) => {
        const pa = priority[a._statusNorm] ?? 5;
        const pb = priority[b._statusNorm] ?? 5;
        if (pa !== pb) return pa - pb;
        return (
          new Date(b._effectiveStartedAt).getTime() - new Date(a._effectiveStartedAt).getTime()
        );
      });
    }
    switch (sortBy) {
      case 'progress':
        return arr.sort((a, b) => (b._progress ?? 0) - (a._progress ?? 0));
      case 'value':
        return arr.sort((a, b) => (b.usd_total_spent ?? 0) - (a.usd_total_spent ?? 0));
      case 'time':
        return arr.sort(
          (a, b) =>
            new Date(b._effectiveStartedAt).getTime() - new Date(a._effectiveStartedAt).getTime(),
        );
      case 'frequency':
        return arr.sort((a, b) => (a.frequency_seconds ?? 0) - (b.frequency_seconds ?? 0));
      default:
        return arr;
    }
  }, [filteredPlans, sortBy, status]);

  const stats = useMemo(() => {
    const summary = summaryRef.current;
    if (summary) {
      return {
        totalValue: summary.totalValue ?? 0,
        activeCount: summary.activeCount ?? 0,
        scheduledCount: summary.scheduledCount ?? 0,
        completedCount: (summary.closedCount ?? 0) + (summary.completedCount ?? 0),
        avgProgress: summary.avgProgress ?? 0,
        totalPlans: summary.totalPlans ?? 0,
      };
    }
    const totalValue = enhancedPlans.reduce((sum, plan) => sum + (plan.usd_total_spent ?? 0), 0);
    const activeCount = enhancedPlans.filter((plan) => plan._statusNorm === 'active').length;
    const scheduledCount = enhancedPlans.filter((plan) => plan._statusNorm === 'scheduled').length;
    const completedCount = enhancedPlans.filter((plan) => plan._statusNorm === 'completed').length;
    const closedCount = enhancedPlans.filter((plan) => plan._statusNorm === 'closed').length;
    const avgProgress = enhancedPlans.length
      ? enhancedPlans.reduce((sum, plan) => sum + (plan._progress ?? 0), 0) / enhancedPlans.length
      : 0;
    return {
      totalValue,
      activeCount,
      scheduledCount,
      completedCount: completedCount + closedCount,
      avgProgress,
      totalPlans: enhancedPlans.length,
    };
  }, [enhancedPlans]);

  const visiblePlans = useMemo(() => {
    if (variant === 'spotlight') {
      const limit = typeof maxRows === 'number' ? maxRows : 6;
      return sortedPlans.slice(0, Math.max(0, limit));
    }
    return sortedPlans;
  }, [sortedPlans, variant, maxRows]);

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

  function isStable(sym?: string) {
    const s = (sym || '').toUpperCase();
    return (
      s === 'USD' ||
      s === 'USDC' ||
      s === 'USDT' ||
      s === 'DAI' ||
      s === 'USDH' ||
      s === 'UXD' ||
      s === 'USDR' ||
      s === 'USDC.E'
    );
  }

  function usd(n?: number | null, fallback?: string) {
    if (n == null) return fallback ?? '—';
    const formatted = formatNumber(n);
    if (formatted === '—') return fallback ?? '—';
    return `$${formatted}`;
  }

  const totalValueLabel = formatNumber(stats.totalValue);
  const avgProgressLabel = Number.isFinite(stats.avgProgress)
    ? `${stats.avgProgress.toFixed(1)}%`
    : '—';
  const planCountLabel = plans.length;

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
      Jupiter Feed
    </span>
  );

  const controlPillBase =
    'inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/80 px-2.5 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';

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
    <span className="text-xs font-semibold uppercase tracking-wide text-primary/80">DCA Plans</span>
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
    : refreshing
      ? { label: 'Refreshing', tone: 'warning' as const, pulse: true }
      : loading && !plans.length
        ? { label: 'Syncing', tone: 'warning' as const, pulse: true }
        : { label: 'Jupiter Live', tone: 'success' as const, pulse: true };

  const summaryHighlights = (
    <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
      <div className="rounded-xl border border-border/50 bg-background/70 p-2.5 shadow-sm">
        <div className="text-xs text-muted-foreground">Plans Live</div>
        <div className="font-semibold text-foreground">{planCountLabel}</div>
      </div>
      <div className="rounded-xl border border-border/50 bg-background/70 p-2.5 shadow-sm">
        <div className="text-xs text-muted-foreground">Total Value (USD)</div>
        <div className="font-semibold text-foreground">${totalValueLabel}</div>
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
          options={[
            { value: 'all', label: 'All' },
            { value: 'active', label: 'Active' },
            { value: 'scheduled', label: 'Scheduled' },
            { value: 'closed', label: 'Closed / Completed' },
            { value: 'paused', label: 'Paused' },
          ]}
          value={status}
          onSelect={(value) => setStatus(value)}
          size="sm"
          variant="ghost"
          triggerClassName={cn(controlPillBase, 'min-w-[120px] justify-between')}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <TrendingUp className="w-3 h-3 text-muted-foreground" />
        <CustomDropdown
          options={DCA_SIDE_FILTERS}
          value={sideFilter}
          onSelect={handleSideSelect}
          size="sm"
          variant="ghost"
          triggerClassName={cn(controlPillBase, 'min-w-[130px] justify-between')}
        />
      </div>
      <div className="flex items-center gap-1.5">
        <ArrowUpDown className="w-3 h-3 text-muted-foreground" />
        <CustomDropdown
          options={[
            { value: 'progress', label: 'By Progress' },
            { value: 'value', label: 'By Value' },
            { value: 'time', label: 'By Start Time' },
            { value: 'frequency', label: 'By Frequency' },
          ]}
          value={sortBy}
          onSelect={handleSortSelect}
          size="sm"
          variant="ghost"
          triggerClassName={cn(controlPillBase, 'min-w-[160px] justify-between')}
        />
      </div>
    </div>
  );

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
              onClick={() => {
                setRefreshToken((value) => value + 1);
                setRefreshing(true);
              }}
              disabled={refreshing}
              className={cn(
                controlPillBase,
                'h-9 w-9 justify-center px-0 py-0 text-muted-foreground disabled:opacity-60',
              )}
              aria-label="Refresh Jupiter DCA plans"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
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
        title={variant === 'full' ? 'Jupiter DCA Plans' : 'Jupiter DCA Snapshot'}
        subtitle={
          variant === 'full'
            ? 'Live DCA strategies routed from Jupiter'
            : 'Realtime Jupiter plan activity'
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
                <AlertCircle className="h-4 w-4" />
                <span>Error: {error}</span>
              </div>
            ) : loading && !visiblePlans.length ? (
              <div className={scrollAreaClass}>
                {viewMode === 'cards' ? (
                  <div className="p-3 space-y-3 text-[13px] grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="relative">
                        {/* Card skeleton with proper mobile structure */}
                        <div className="relative rounded-xl border border-border/30 overflow-hidden bg-background/70">
                          <div className="p-3">
                            {/* Header skeleton */}
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-start gap-3 flex-1">
                                <div className="skeleton w-10 h-10 rounded-lg relative overflow-hidden">
                                  <div className="absolute inset-0 skeleton-shimmer" />
                                </div>
                                <div className="flex-1">
                                  <div className="skeleton h-4 w-32 rounded mb-2 relative overflow-hidden">
                                    <div className="absolute inset-0 skeleton-shimmer" />
                                  </div>
                                  <div className="skeleton h-3 w-24 rounded relative overflow-hidden">
                                    <div className="absolute inset-0 skeleton-shimmer" />
                                  </div>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <div className="skeleton h-7 w-16 rounded relative overflow-hidden">
                                  <div className="absolute inset-0 skeleton-shimmer" />
                                </div>
                                <div className="skeleton h-7 w-7 rounded relative overflow-hidden">
                                  <div className="absolute inset-0 skeleton-shimmer" />
                                </div>
                              </div>
                            </div>

                            {/* Progress skeleton */}
                            <div className="mb-3">
                              <div className="flex items-center justify-between mb-2">
                                <div className="skeleton h-3 w-16 rounded relative overflow-hidden">
                                  <div className="absolute inset-0 skeleton-shimmer" />
                                </div>
                                <div className="skeleton h-3 w-20 rounded relative overflow-hidden">
                                  <div className="absolute inset-0 skeleton-shimmer" />
                                </div>
                              </div>
                              <div className="skeleton h-2 w-full rounded-full relative overflow-hidden">
                                <div className="absolute inset-0 skeleton-shimmer" />
                              </div>
                            </div>

                            {/* Stats grid skeleton */}
                            <div className="grid grid-cols-2 gap-3 mb-3 p-2.5 rounded-lg bg-background/50 border border-border/30">
                              {Array.from({ length: 4 }).map((_, j) => (
                                <div key={j}>
                                  <div className="skeleton h-3 w-16 rounded mb-1 relative overflow-hidden">
                                    <div className="absolute inset-0 skeleton-shimmer" />
                                  </div>
                                  <div className="skeleton h-4 w-20 rounded relative overflow-hidden">
                                    <div className="absolute inset-0 skeleton-shimmer" />
                                  </div>
                                </div>
                              ))}
                            </div>

                            {/* Timeline skeleton */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs border-t border-border/30 pt-3">
                              {Array.from({ length: 3 }).map((_, k) => (
                                <div key={k} className="flex items-center justify-between sm:block">
                                  <div className="skeleton h-3 w-12 rounded mb-1 relative overflow-hidden">
                                    <div className="absolute inset-0 skeleton-shimmer" />
                                  </div>
                                  <div className="skeleton h-3 w-16 rounded relative overflow-hidden">
                                    <div className="absolute inset-0 skeleton-shimmer" />
                                  </div>
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
                    <table className="w-full">
                      <thead className="bg-muted/30 dark:bg-muted/10 border-b border-border/30">
                        <tr>
                          {['Plan', 'Schedule', 'Progress', 'Initial', 'Remaining', 'Next', 'Wallet', 'Actions'].map(
                            (header) => (
                              <th
                                key={header}
                                className={cn(
                                  'text-left text-[11px] font-medium text-muted-foreground uppercase',
                                  header === 'Plan' && 'w-[180px] px-4 py-2',
                                  header === 'Initial' && 'w-[150px] px-4 py-2',
                                  header === 'Remaining' && 'w-[150px] px-4 py-2',
                                  header === 'Schedule' && 'w-[120px] px-3 py-2',
                                  header === 'Progress' && 'w-[120px] px-3 py-2',
                                  header === 'Next' && 'w-[130px] px-3 py-2',
                                  header === 'Wallet' && 'w-[130px] px-3 py-2',
                                  header === 'Actions' && 'w-[120px] px-3 py-2',
                                )}
                              >
                                {header}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <tr key={i}>
                            <td className="w-[180px] px-4 py-3">
                              <div className="skeleton h-10 w-32 rounded" />
                            </td>
                            <td className="w-[120px] px-3 py-3">
                              <div className="space-y-2">
                                <div className="skeleton h-3 w-20 rounded" />
                                <div className="skeleton h-5 w-24 rounded-full" />
                              </div>
                            </td>
                            <td className="w-[120px] px-3 py-3">
                              <div className="space-y-2">
                                <div className="skeleton h-3 w-16 rounded" />
                                <div className="skeleton h-1.5 w-20 rounded-full" />
                              </div>
                            </td>
                            <td className="w-[150px] px-4 py-3">
                              <div className="space-y-2">
                                <div className="skeleton h-3 w-24 rounded" />
                                <div className="skeleton h-3 w-20 rounded" />
                              </div>
                            </td>
                            <td className="w-[150px] px-4 py-3">
                              <div className="space-y-2">
                                <div className="skeleton h-3 w-24 rounded" />
                                <div className="skeleton h-3 w-20 rounded" />
                              </div>
                            </td>
                            <td className="w-[130px] px-3 py-3">
                              <div className="skeleton h-3 w-20 rounded" />
                            </td>
                            <td className="w-[130px] px-3 py-3">
                              <div className="skeleton h-7 w-20 rounded" />
                            </td>
                            <td className="w-[120px] px-3 py-3">
                              <div className="skeleton h-7 w-16 rounded" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : visiblePlans.length === 0 ? (
              <div className="flex flex-1 items-center justify-center px-4 py-8">
                <div className="text-center">
                  <TrendingUp className="mx-auto mb-3 h-10 w-10 text-muted-foreground opacity-50" />
                  <h4 className="mb-1 font-medium text-foreground">No DCA plans found</h4>
                  <p className="text-sm text-muted-foreground">
                    {status === 'active'
                      ? 'No active plans running'
                      : `No ${status} plans available`}
                  </p>
                </div>
              </div>
            ) : viewMode === 'cards' && variant === 'full' ? (
              <div className={cn(scrollAreaClass, 'p-3')}>
                <div className="grid grid-cols-1 gap-3 text-[13px] lg:grid-cols-2">
                  <AnimatePresence mode="popLayout">
                    {visiblePlans.map((plan, index) => {
                      const statusConfig = getStatusConfig(plan);
                      const StatusIcon = statusConfig.icon;
                      const progress = plan._progress ?? null;
                      const totalValue = plan.total_quote_spent ?? 0;
                      const expectedSlices =
                        plan._expectedSlices ??
                        (plan.slices_expected != null ? Number(plan.slices_expected) : null);
                      const estimatedCompletion = plan._estimatedCompletion;
                      const remainingInput = plan._remainingInput;
                      const shouldAnimate = initialAnimationRef.current;
                      const sideNormalized = (plan.side ?? '').toLowerCase();
                      const isSell = sideNormalized === 'sell';
                      const operationLabel = sideNormalized ? sideNormalized.toUpperCase() : '—';
                      const OperationIcon = isSell ? TrendingDown : TrendingUp;
                      const accent = isSell
                        ? {
                            text: 'text-red-500',
                            bar: 'bg-red-500',
                          }
                        : {
                            text: 'text-green-500',
                            bar: 'bg-green-500',
                          };
                      const accentBorderClass = isSell
                        ? 'border-t-4 border-t-red-500'
                        : 'border-t-4 border-t-green-500';
                      const sideClasses = getSideColorClasses(plan.side, plan.status);
                      const withUnit = (value: string, unit?: string | null) => {
                        if (!value || value === '—') return value || '—';
                        return unit ? `${value} ${unit}` : value;
                      };

                      const pairLabel = `${plan.base_symbol}/${plan.quote_symbol}`;
                      const totalBaseExecuted = plan.total_base_executed ?? 0;
                      const totalActionLabel = isSell ? 'Total Sold' : 'Total Bought';
                      const totalActionValue = withUnit(
                        formatNumber(totalBaseExecuted),
                        plan.base_symbol,
                      );

                      const quoteSymbol = plan.quote_symbol ?? plan.input_symbol ?? '';
                      const quoteIsStable = quoteSymbol ? isStable(quoteSymbol) : false;
                      const quoteRawValue = plan.total_quote_spent ?? 0;
                      const quoteDisplay = withUnit(
                        quoteIsStable ? usd(quoteRawValue) : formatNumber(quoteRawValue),
                        quoteSymbol,
                      );
                      const secondaryLabel = isSell ? 'Quote Received' : 'Total Spent';

                      const perSliceSellValue =
                        plan.per_slice_input ?? plan.avg_base_slice ?? plan.avg_quote_slice ?? 0;
                      const perSliceBuyValue =
                        plan.per_slice_input ?? plan.avg_quote_slice ?? plan.avg_base_slice ?? 0;
                      const perSliceUnit = isSell ? (plan.base_symbol ?? '') : quoteSymbol;
                      const perSliceDisplay = isSell
                        ? withUnit(formatNumber(perSliceSellValue), perSliceUnit)
                        : withUnit(
                            quoteIsStable ? usd(perSliceBuyValue) : formatNumber(perSliceBuyValue),
                            perSliceUnit,
                          );

                      const planInputAmount = plan.initial_input_amount ?? plan.plan_total_input ?? null;
                      const planInputSymbol = plan.initial_input_symbol
                        ? plan.initial_input_symbol
                        : isSell
                          ? plan.base_symbol ?? ''
                          : quoteSymbol || plan.base_symbol || '';
                      const planInputSymbolStable = planInputSymbol
                        ? isStable(planInputSymbol)
                        : false;
                      const planInputDisplay =
                        planInputAmount != null
                          ? withUnit(
                              isSell || !planInputSymbolStable
                                ? formatNumber(planInputAmount)
                                : usd(planInputAmount),
                              planInputSymbol,
                            )
                          : '—';

                      const totalPlanInput = plan.initial_input_amount ?? plan.plan_total_input ?? 0;
                      const fallbackRemaining = isSell
                        ? Math.max(0, totalPlanInput - totalBaseExecuted)
                        : Math.max(0, totalPlanInput - (plan.total_quote_spent ?? 0));
                      const resolvedRemainingRaw =
                        remainingInput != null && Number.isFinite(Number(remainingInput))
                          ? Number(remainingInput)
                          : fallbackRemaining;
                      const resolvedRemaining = Math.max(0, resolvedRemainingRaw);
                      const remainingUnit = isSell ? (plan.base_symbol ?? '') : planInputSymbol;
                      const remainingDisplay = withUnit(
                        isSell
                          ? formatNumber(resolvedRemaining)
                          : planInputSymbol && isStable(planInputSymbol)
                            ? usd(resolvedRemaining)
                            : formatNumber(resolvedRemaining),
                        remainingUnit,
                      );

                      const tokensHeldAmount = isSell ? resolvedRemaining : totalBaseExecuted;
                      const tokensHeldDisplay = withUnit(
                        formatNumber(tokensHeldAmount),
                        plan.base_symbol,
                      );

                      const executedSlicesCount = plan.slices ?? 0;
                      const slicesSummary =
                        expectedSlices != null
                          ? `${executedSlicesCount}/${expectedSlices}`
                          : executedSlicesCount > 0
                            ? `${executedSlicesCount}`
                            : null;
                      const progressLabel = progress != null ? `${progress.toFixed(1)}%` : '—';
                      const progressSummary = slicesSummary
                        ? `${progressLabel} (${slicesSummary})`
                        : progressLabel;

                      const lastEventAt = plan.last_execution_at ?? plan.last_event_at ?? null;
                      const nextExecutionDate = deriveNextExecutionDate(plan);
                      const nextExecutionLabel = nextExecutionDate
                        ? rel(nextExecutionDate, true)
                        : '—';

                      return (
                        <motion.div
                          key={plan.plan_id}
                          initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={shouldAnimate ? { delay: index * 0.05 } : undefined}
                          className={cn(
                            'relative overflow-visible rounded-xl border border-border/40 bg-background/80 transition-all duration-200',
                            'hover:shadow-lg hover:shadow-primary/10',
                            sideClasses.cardBg,
                            sideClasses.border,
                            accentBorderClass,
                            totalValue >= 10000 && 'ring-1 ring-primary/20 dark:ring-primary/30',
                          )}
                        >
                          {totalValue >= 50000 && (
                            <div className="absolute inset-x-0 top-0 flex items-center gap-1 bg-gradient-to-r from-amber-500 to-orange-500 px-4 py-1 text-xs font-bold text-white">
                              <DollarSign className="h-3 w-3" />
                              High Value DCA Plan
                            </div>
                          )}

                          <div className={cn('px-4 pb-4 pt-4', totalValue >= 50000 && 'pt-7')}>
                            <div className="mb-4 flex items-start justify-between gap-3">
                              <div className="min-w-0 flex flex-1 flex-col gap-1.5">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 text-sm font-semibold uppercase tracking-wide',
                                      accent.text,
                                    )}
                                  >
                                    <OperationIcon className="h-4 w-4" />
                                    {operationLabel}
                                  </span>
                                  <span className="text-sm font-semibold text-foreground">
                                    {pairLabel}
                                  </span>
                                  <span
                                    className={cn(
                                      'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
                                      statusConfig.bg,
                                      statusConfig.border,
                                      statusConfig.color,
                                    )}
                                  >
                                    <StatusIcon className="h-3 w-3" />
                                    {statusConfig.label}
                                  </span>
                                </div>
                                <PlanIdentifierMenu planId={plan.plan_id} />
                              </div>
                              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => openPlan({ planType: 'dca', plan })}
                                  className="inline-flex items-center gap-1 rounded-md border border-border/50 bg-background/80 px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                                >
                                  <Activity className="h-3 w-3" />
                                  Details
                                </button>
                                <PlanShareButton planId={plan.plan_id} planType="dca" />
                                {plan.wallet && (
                                  <WalletActionMenu
                                    wallet={plan.wallet}
                                    planId={plan.plan_id}
                                    planType="dca"
                                    size="sm"
                                  />
                                )}
                              </div>
                            </div>

                            <div className="mt-1 grid grid-cols-2 gap-3 rounded-xl border border-border/40 bg-background/60 p-3 text-sm md:grid-cols-3">
                              <div className="space-y-1.5">
                                <p className="text-xs leading-5 text-muted-foreground">
                                  {totalActionLabel}
                                </p>
                                <p className={cn('font-medium leading-5', accent.text)}>
                                  {totalActionValue}
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs leading-5 text-muted-foreground">
                                  {secondaryLabel}
                                </p>
                                <p className="font-medium leading-5 text-foreground">
                                  {quoteDisplay}
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs leading-5 text-muted-foreground">
                                  Tokens Held
                                </p>
                                <p className="font-medium leading-5 text-foreground">
                                  {tokensHeldDisplay}
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs leading-5 text-muted-foreground">Per Slice</p>
                                <p className="font-medium leading-5 text-foreground">
                                  {perSliceDisplay}
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs leading-5 text-muted-foreground">
                                  Plan Total Input
                                </p>
                                <p className="font-medium leading-5 text-foreground">
                                  {planInputDisplay}
                                </p>
                              </div>
                              <div className="space-y-1.5">
                                <p className="text-xs leading-5 text-muted-foreground">Frequency</p>
                                <p className="font-medium leading-5 text-foreground">
                                  {formatFrequency(plan.frequency_seconds || undefined)}
                                </p>
                              </div>
                              <div className="col-span-2 space-y-1.5 md:col-span-3">
                                <p className="text-xs leading-5 text-muted-foreground">
                                  Est. Completion
                                </p>
                                <p className="font-medium leading-5 text-foreground">
                                  {estimatedCompletion ? rel(estimatedCompletion, true) : '—'}
                                </p>
                              </div>
                            </div>

                            <div className="mt-4 grid grid-cols-1 gap-2 border-t border-border/30 pt-3 text-xs sm:grid-cols-3">
                              <div className="flex items-center justify-between sm:block">
                                <p className="mb-1 text-muted-foreground">Started</p>
                                <div className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-mono text-foreground">
                                    {rel(plan._effectiveStartedAt, true)}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center justify-between sm:block">
                                <p className="mb-1 text-muted-foreground">Last Event</p>
                                <div className="flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-muted-foreground" />
                                  <span className="font-mono text-foreground">
                                    {lastEventAt ? rel(lastEventAt, true) : '—'}
                                  </span>
                                </div>
                              </div>
                              {plan._statusNorm !== 'closed' &&
                                plan._statusNorm !== 'completed' && (
                                  <div className="flex items-center justify-between sm:block">
                                    <p className="mb-1 text-muted-foreground">Next Execution</p>
                                    <div className="flex items-center gap-1">
                                      <Play className="h-3 w-3 text-muted-foreground" />
                                      <span className="font-mono text-foreground">
                                        {nextExecutionLabel}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              {plan._statusNorm === 'scheduled' && buildConditions(plan) && (
                                <div className="col-span-1 flex items-center gap-2 text-xs text-muted-foreground sm:col-span-3">
                                  <Target className="h-3 w-3" />
                                  <span>{buildConditions(plan)}</span>
                                </div>
                              )}
                            </div>

                            {progress !== null && progress !== undefined && (
                              <div className="mt-4">
                                <div className="relative h-2 w-full overflow-hidden rounded-full bg-muted/30">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
                                    transition={{ duration: 0.8, ease: 'easeOut' }}
                                    className={cn(
                                      'absolute inset-y-0 left-0 rounded-full',
                                      accent.bar,
                                    )}
                                  />
                                </div>
                                <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2 text-xs text-muted-foreground">
                                  <span className={cn('font-medium leading-5', accent.text)}>
                                    {progressSummary}
                                  </span>
                                  <span className="font-medium leading-5 text-foreground text-right">
                                    <span className={accent.text}>{totalActionValue}</span>
                                    <span className="mx-1 opacity-70">→</span>
                                    <span>{remainingDisplay}</span>
                                  </span>
                                </div>
                                <div className="mt-1 flex items-baseline justify-between text-xs uppercase tracking-wide text-muted-foreground opacity-70">
                                  <span>{totalActionLabel}</span>
                                  <span>Remaining Amount</span>
                                </div>
                              </div>
                            )}

                            {capturedLabel && (
                              <p className="mt-3 text-[11px] text-right text-muted-foreground">
                                Captured: {capturedLabel}
                              </p>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              </div>
            ) : (
              <div className="flex flex-1 min-h-0 overflow-hidden flex-col">
                <div className={innerScrollAreaClass}>
                  <table className="w-full">
                    <thead className="bg-muted/30 dark:bg-muted/10 border-b border-border/30">
                      <tr>
                        <th className="w-[180px] px-4 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                          Plan
                        </th>
                        <th className="w-[120px] px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                          Schedule
                        </th>
                        <th className="w-[120px] px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                          Progress
                        </th>
                        <th className="w-[150px] px-4 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                          Initial
                        </th>
                        <th className="w-[150px] px-4 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                          Remaining
                        </th>
                        <th className="w-[130px] px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                          Next
                        </th>
                        <th className="w-[130px] px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                          Wallet
                        </th>
                        <th className="w-[120px] px-3 py-2 text-left text-[11px] font-medium text-muted-foreground uppercase">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30 dark:divide-border/20">
                      {visiblePlans.map((plan, index) => {
                        const statusConfig = getStatusConfig(plan);
                        const StatusIcon = statusConfig.icon;
                        const shouldAnimateRow =
                          initialAnimationRef.current && variant !== 'spotlight';
                        const nextExecutionDate = deriveNextExecutionDate(plan);
                        const nextExecutionLabel = nextExecutionDate
                          ? rel(nextExecutionDate, true)
                          : '—';
                        const sideNormalized = (plan.side ?? '').toLowerCase();
                        const isSell = sideNormalized === 'sell';
                        const isBuy = sideNormalized === 'buy';
                        const planAccentClass = isSell
                          ? 'text-red-500'
                          : isBuy
                            ? 'text-emerald-500'
                            : 'text-foreground';
                        const baseSymbol = plan.base_symbol ?? '—';
                        const quoteSymbol = plan.quote_symbol ?? plan.input_symbol ?? '—';
                        const pairLabel = `${baseSymbol}/${quoteSymbol}`;
                        const totalInputSpent =
                          plan.total_input_spent ??
                          (isSell ? plan.total_base_executed ?? null : plan.total_quote_spent ?? null);
                        const initialAmount =
                          plan.initial_input_amount ??
                          plan.plan_total_input ??
                          (totalInputSpent != null && plan._remainingInput != null
                            ? totalInputSpent + plan._remainingInput
                            : totalInputSpent ?? plan._remainingInput ?? null);
                        const initialUnitSymbol =
                          plan.initial_input_symbol ??
                          (isSell
                            ? baseSymbol === '—'
                              ? ''
                              : baseSymbol
                            : quoteSymbol !== '—'
                              ? quoteSymbol
                              : baseSymbol === '—'
                                ? ''
                                : baseSymbol);
                        const initialFormatted =
                          initialAmount != null ? formatNumber(initialAmount) : '—';
                        const initialAmountLabel =
                          initialFormatted === '—'
                            ? '—'
                            : `${initialFormatted}${initialUnitSymbol ? ` ${initialUnitSymbol}` : ''}`;
                        const isQuoteStable = isStable(plan.quote_symbol);
                        const rawProgress = plan._progress;
                        const progressValue =
                          typeof rawProgress === 'number' && Number.isFinite(rawProgress)
                            ? rawProgress
                            : null;
                        const progressPercent =
                          progressValue != null ? Math.min(100, Math.max(0, progressValue)) : 0;
                        const valueTextClass = variant === 'spotlight' ? 'text-[11px]' : 'text-sm';
                        const metaLabelClass = 'text-[11px] uppercase text-muted-foreground';
                        const frequencyLabel = formatFrequency(plan.frequency_seconds || undefined);
                        const spentDisplay =
                          plan.side === 'sell'
                            ? `${formatNumber(plan.total_base_executed)} ${baseSymbol}`
                            : isQuoteStable
                              ? `${usd(plan.total_quote_spent)} ${quoteSymbol}`
                              : `${formatNumber(plan.total_quote_spent)} ${quoteSymbol}`;
                        const spentLabelText = isSell ? 'Sold' : 'Spent';
                        const totalPlanInput = plan.initial_input_amount ?? plan.plan_total_input ?? 0;
                        const fallbackRemaining = isSell
                          ? Math.max(0, totalPlanInput - (plan.total_base_executed ?? 0))
                          : Math.max(0, totalPlanInput - (plan.total_quote_spent ?? 0));
                        const resolvedRemainingRaw =
                          plan._remainingInput != null && Number.isFinite(Number(plan._remainingInput))
                            ? Number(plan._remainingInput)
                            : fallbackRemaining;
                        const resolvedRemaining = Math.max(0, resolvedRemainingRaw);
                        const remainingUnitSymbol = isSell
                          ? baseSymbol === '—'
                            ? ''
                            : baseSymbol
                          : plan.initial_input_symbol ?? (quoteSymbol !== '—' ? quoteSymbol : baseSymbol);
                        const remainingIsStable = remainingUnitSymbol ? isStable(remainingUnitSymbol) : false;
                        const remainingDisplay = remainingUnitSymbol
                          ? isSell
                            ? `${formatNumber(resolvedRemaining)} ${remainingUnitSymbol}`
                            : remainingIsStable
                              ? `${usd(resolvedRemaining)} ${remainingUnitSymbol}`
                              : `${formatNumber(resolvedRemaining)} ${remainingUnitSymbol}`
                          : isSell || !remainingIsStable
                            ? formatNumber(resolvedRemaining)
                            : usd(resolvedRemaining);

                        return (
                          <motion.tr
                            key={plan.plan_id}
                            initial={shouldAnimateRow ? { opacity: 0, x: -20 } : false}
                            animate={variant === 'spotlight' ? undefined : { opacity: 1, x: 0 }}
                            transition={shouldAnimateRow ? { delay: index * 0.02 } : undefined}
                            className={cn(
                              'transition-colors',
                              variant === 'spotlight'
                                ? 'hover:bg-transparent'
                                : 'hover:bg-muted/20 dark:hover:bg-muted/10',
                            )}
                          >
                            <td className="w-[180px] px-4 py-2">
                              <div className="space-y-0.5">
                                <div
                                  className={cn(
                                    'font-semibold',
                                    planAccentClass,
                                    variant === 'spotlight' && 'text-sm',
                                  )}
                                >
                                  {(plan.side ?? '—').toUpperCase()} {pairLabel}
                                </div>
                                <PlanIdentifierMenu
                                  planId={plan.plan_id}
                                  className="pt-0.5"
                                  triggerClassName="text-[11px]"
                                />
                              </div>
                            </td>
                            <td className="w-[120px] px-3 py-2">
                              <div className="flex flex-col items-start gap-2">
                                <div className={cn('font-mono text-foreground', valueTextClass)}>
                                  {frequencyLabel || '—'}
                                </div>
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
                                    statusConfig.bg,
                                    statusConfig.color,
                                  )}
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConfig.label}
                                </span>
                              </div>
                            </td>
                            <td className="w-[120px] px-3 py-2">
                              {progressValue != null ? (
                                <div className="space-y-1">
                                  <div className={cn('font-mono text-foreground', valueTextClass)}>
                                    {progressValue.toFixed(1)}%
                                  </div>
                                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted/30 dark:bg-muted/20">
                                    <div
                                      className="h-full rounded-full bg-primary transition-all duration-300"
                                      style={{ width: `${progressPercent}%` }}
                                    />
                                  </div>
                                </div>
                              ) : (
                                <span className="text-[11px] text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="w-[150px] px-4 py-2">
                              <div className="space-y-1">
                                <p className={metaLabelClass}>Initial</p>
                                <p className={cn('font-mono text-foreground', valueTextClass)}>
                                  {initialAmountLabel}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {spentLabelText} {spentDisplay}
                                </p>
                              </div>
                            </td>
                            <td className="w-[150px] px-4 py-2">
                              <div className="space-y-1">
                                <p className={metaLabelClass}>Remaining</p>
                                <p className={cn('font-mono text-foreground', valueTextClass)}>{remainingDisplay}</p>
                              </div>
                            </td>
                            <td className="w-[130px] px-3 py-2">
                              <div className={cn('font-mono text-muted-foreground', valueTextClass)}>
                                {plan._statusNorm === 'closed' ||
                                plan._statusNorm === 'completed' ||
                                plan._statusNorm === 'scheduled'
                                  ? '—'
                                  : nextExecutionLabel}
                              </div>
                            </td>
                            <td className="w-[130px] px-3 py-2">
                              {plan.wallet ? (
                                <WalletActionMenu
                                  wallet={plan.wallet}
                                  planId={plan.plan_id}
                                  planType="dca"
                                  size="sm"
                                  align="left"
                                />
                              ) : (
                                '—'
                              )}
                            </td>
                            <td className="w-[120px] px-3 py-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openPlan({ planType: 'dca', plan })}
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-md border border-border/50 px-2 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground',
                                    variant === 'spotlight' && 'text-[11px]',
                                  )}
                                >
                                  <Activity className="w-3 h-3" /> Details
                                </button>
                                <PlanShareButton planId={plan.plan_id} planType="dca" />
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </MonitorWidgetFrame>
    </div>
  );
}

export const DCASection = memo(DCASectionInner);
