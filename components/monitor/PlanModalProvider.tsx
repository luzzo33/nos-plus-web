'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  X,
  Loader2,
  ExternalLink,
  BarChart3,
  Activity,
  Calendar,
  TrendingUp,
  Target,
  Clock,
  Zap,
  DollarSign,
  Wallet,
  CheckCircle,
  AlertCircle,
  Play,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { PlanShareButton } from '@/components/monitor/PlanShareButton';
import type { DcaPlanRow, LimitPlanRow } from '@/lib/api/monitor-client';
import { cn } from '@/lib/utils';
import { formatLocal } from '@/lib/time';

export type PlanType = 'dca' | 'limit';

type AnyPlanRow = DcaPlanRow | LimitPlanRow;

interface OpenPlanDescriptor {
  planType: PlanType;
  planId?: string;
  plan?: AnyPlanRow;
  capturedAt?: string | null;
}

interface OpenOptions {
  skipUrlUpdate?: boolean;
}

interface PlanModalContextValue {
  openPlan(descriptor: OpenPlanDescriptor, options?: OpenOptions): Promise<void>;
  closePlan(): void;
  registerPlans(planType: PlanType, plans: AnyPlanRow[]): void;
}

interface PlanModalState {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
  planType: PlanType | null;
  planId: string | null;
  plan: AnyPlanRow | null;
  capturedAt: string | null;
}

const PlanModalContext = createContext<PlanModalContextValue | null>(null);

function keyFor(planType: PlanType, planId: string) {
  return `${planType}:${planId}`;
}

function toPlanType(input: string | null | undefined): PlanType | null {
  if (!input) return null;
  const normalized = input.toLowerCase();
  if (normalized.startsWith('lim')) return 'limit';
  if (normalized.startsWith('dca')) return 'dca';
  return null;
}

function formatFrequencyHuman(seconds: number): string {
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

function displayRelative(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return '—';
    const diff = Date.now() - date.getTime();
    const absDiff = Math.abs(diff);
    const totalSeconds = Math.floor(absDiff / 1000);
    const future = diff < 0;

    let timeStr: string;
    if (totalSeconds < 60) {
      timeStr = 'just now';
    } else if (totalSeconds < 3600) {
      const minutes = Math.floor(totalSeconds / 60);
      timeStr = `${minutes}m`;
    } else if (totalSeconds < 86400) {
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      if (minutes > 0) {
        timeStr = `${hours}h ${minutes}m`;
      } else {
        timeStr = `${hours}h`;
      }
    } else if (totalSeconds < 2592000) {
      const days = Math.floor(totalSeconds / 86400);
      const hours = Math.floor((totalSeconds % 86400) / 3600);
      if (hours > 0) {
        timeStr = `${days}d ${hours}h`;
      } else {
        timeStr = `${days}d`;
      }
    } else {
      return formatLocal(date, 'PPpp');
    }

    if (timeStr === 'just now') return timeStr;
    return future ? `in ${timeStr}` : `${timeStr} ago`;
  } catch {
    return '—';
  }
}

function formatNumber(
  value: number | null | undefined,
  options: Intl.NumberFormatOptions = {},
): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4, ...options }).format(value);
}

function formatUsd(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value);
}

function isDcaPlan(plan: AnyPlanRow, type: PlanType | null): plan is DcaPlanRow {
  return (type ?? (plan as any)?.plan_type) === 'dca';
}

function isLimitPlan(plan: AnyPlanRow, type: PlanType | null): plan is LimitPlanRow {
  return (type ?? (plan as any)?.plan_type) === 'limit';
}

export function PlanModalProvider({ children }: { children: React.ReactNode }) {
  const registryRef = useRef<Map<string, AnyPlanRow>>(new Map());
  const pendingResolversRef = useRef<
    Map<
      string,
      Array<{
        resolve: (plan: AnyPlanRow) => void;
        reject: (error: Error) => void;
        timer: ReturnType<typeof setTimeout>;
      }>
    >
  >(new Map());
  const [state, setState] = useState<PlanModalState>({
    isOpen: false,
    loading: false,
    error: null,
    planType: null,
    planId: null,
    plan: null,
    capturedAt: null,
  });
  const pendingOpenByUrlRef = useRef(false);

  const updateUrlParam = useCallback((planType: PlanType, planId: string) => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.set('plan', `${planType}:${planId}`);
    url.searchParams.delete('captured');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const clearUrlParam = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    if (!url.searchParams.has('plan')) return;
    url.searchParams.delete('plan');
    url.searchParams.delete('captured');
    window.history.replaceState({}, '', url.toString());
  }, []);

  const resolvePlan = useCallback(
    async (planType: PlanType, planId: string): Promise<AnyPlanRow> => {
      const map = registryRef.current;
      const key = keyFor(planType, planId);
      if (map.has(key)) {
        return map.get(key)!;
      }
      return new Promise<AnyPlanRow>((resolve, reject) => {
        const pendingMap = pendingResolversRef.current;
        const entry = {
          resolve: (plan: AnyPlanRow) => resolve(plan),
          reject,
          timer: setTimeout(() => {
            const current = pendingMap.get(key);
            if (current) {
              pendingMap.set(
                key,
                current.filter((item) => item !== entry),
              );
            }
            reject(new Error('Plan data unavailable'));
          }, 10000),
        };
        const existing = pendingMap.get(key);
        if (existing) {
          existing.push(entry);
        } else {
          pendingMap.set(key, [entry]);
        }
      });
    },
    [],
  );

  const flushPendingResolvers = useCallback((key: string, plan: AnyPlanRow) => {
    const pending = pendingResolversRef.current.get(key);
    if (!pending?.length) return;
    pendingResolversRef.current.delete(key);
    pending.forEach(({ resolve, timer }) => {
      clearTimeout(timer);
      resolve(plan);
    });
  }, []);

  const registerPlans = useCallback<PlanModalContextValue['registerPlans']>(
    (planType, plans) => {
      if (!plans?.length) return;
      const map = registryRef.current;
      for (const plan of plans) {
        const candidateId = (plan as any).plan_id ?? (plan as any).planId;
        if (!candidateId) continue;
        const key = keyFor(planType, String(candidateId));
        map.set(key, plan);
        flushPendingResolvers(key, plan);
      }
    },
    [flushPendingResolvers],
  );

  const closePlan = useCallback(() => {
    setState((prev) => ({ ...prev, isOpen: false, loading: false, error: null, capturedAt: null }));
    clearUrlParam();
  }, [clearUrlParam]);

  const openPlan = useCallback<PlanModalContextValue['openPlan']>(
    async ({ planType, planId, plan, capturedAt }, options) => {
      const resolvedId = planId ?? (plan as any)?.plan_id ?? null;
      if (!resolvedId) return;

      const capturedAtValue = capturedAt ?? null;

      setState({
        isOpen: true,
        loading: !plan,
        error: null,
        planType,
        planId: resolvedId,
        plan: plan ?? null,
        capturedAt: capturedAtValue,
      });

      try {
        const planData = plan ?? (await resolvePlan(planType, resolvedId));
        const key = keyFor(planType, resolvedId);
        registryRef.current.set(key, planData);
        flushPendingResolvers(key, planData);
        setState({
          isOpen: true,
          loading: false,
          error: null,
          planType,
          planId: resolvedId,
          plan: planData,
          capturedAt: capturedAtValue,
        });
        if (!options?.skipUrlUpdate) {
          updateUrlParam(planType, resolvedId);
        }
      } catch (error) {
        setState({
          isOpen: true,
          loading: false,
          error: (error as Error)?.message ?? 'Failed to load plan',
          planType,
          planId: resolvedId,
          plan: null,
          capturedAt: capturedAtValue,
        });
      }
    },
    [resolvePlan, updateUrlParam],
  );

  const contextValue = useMemo<PlanModalContextValue>(
    () => ({ openPlan, closePlan, registerPlans }),
    [openPlan, closePlan, registerPlans],
  );

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const param = url.searchParams.get('plan');
    if (!param) return;
    const [rawType, rawId] = param.split(':');
    const planType = toPlanType(rawType);
    if (!planType || !rawId) return;
    const capturedAtParam = url.searchParams.get('captured');
    pendingOpenByUrlRef.current = true;
    openPlan(
      { planType, planId: rawId, capturedAt: capturedAtParam },
      { skipUrlUpdate: true },
    ).finally(() => {
      pendingOpenByUrlRef.current = false;
    });
  }, [openPlan]);

  useEffect(() => {
    if (!state.isOpen && !pendingOpenByUrlRef.current) {
      clearUrlParam();
    }
  }, [state.isOpen, clearUrlParam]);

  const renderPlanSpecifics = () => {
    if (!state.plan || !state.planType) return null;

    if (isDcaPlan(state.plan, state.planType)) {
      const plan = state.plan;
      const progress = plan.progress_pct ?? 0;
      return (
        <div className="space-y-6">
          {/* Visual Progress Section */}
          <div className="rounded-xl border border-border/40 bg-gradient-to-br from-background/80 to-muted/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                DCA Progress
              </h4>
              <span className="text-2xl font-bold text-primary">{progress.toFixed(1)}%</span>
            </div>

            {/* Animated Progress Bar */}
            <div className="relative h-4 bg-muted/30 rounded-full overflow-hidden mb-6">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progress)}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full',
                  progress >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : progress >= 75
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : 'bg-gradient-to-r from-primary to-primary/80',
                )}
              />
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse" />
            </div>

            {/* Progress Details */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 rounded-lg bg-background/60">
                <div className="text-2xl font-bold text-foreground">{plan.slices ?? 0}</div>
                <div className="text-xs text-muted-foreground">Slices Executed</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-background/60">
                <div className="text-2xl font-bold text-foreground">
                  {plan.frequency_seconds ? formatFrequencyHuman(plan.frequency_seconds) : '—'}
                </div>
                <div className="text-xs text-muted-foreground">Frequency</div>
              </div>
            </div>
          </div>

          <Section title="Execution Details">
            <Metric
              label="Total Executed"
              value={`${formatNumber(plan.total_base_executed)} ${plan.base_symbol}`}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <Metric
              label="Total Spent"
              value={
                plan.side === 'sell'
                  ? `${formatNumber(plan.total_base_executed)} ${plan.base_symbol}`
                  : formatUsd(plan.total_quote_spent)
              }
              icon={<DollarSign className="h-4 w-4" />}
            />
            <Metric
              label="Remaining"
              value={
                plan.remaining_input != null
                  ? `${formatNumber(plan.remaining_input)} ${plan.side === 'sell' ? plan.base_symbol : (plan.quote_symbol ?? '')}`
                  : '—'
              }
              icon={<Target className="h-4 w-4" />}
            />
            {plan.avg_quote_slice != null && plan.avg_quote_slice > 0 && (
              <Metric
                label="Average Per Slice"
                value={formatUsd(plan.avg_quote_slice)}
                icon={<BarChart3 className="h-4 w-4" />}
              />
            )}
          </Section>

          <Section title="Schedule & Timing">
            <Metric
              label="Started"
              value={displayRelative(plan.started_at)}
              icon={<Calendar className="h-4 w-4" />}
            />
            <Metric
              label="Last Event"
              value={displayRelative(plan.last_event_at)}
              icon={<Zap className="h-4 w-4" />}
            />
            <Metric
              label="Next Execution"
              value={displayRelative(plan.next_execution_at)}
              icon={<Clock className="h-4 w-4" />}
            />
            <Metric
              label="Estimated Completion"
              value={displayRelative(plan.estimated_completion_at)}
              icon={<CheckCircle className="h-4 w-4" />}
            />
          </Section>
        </div>
      );
    }

    if (isLimitPlan(state.plan, state.planType)) {
      const plan = state.plan;
      const progress = plan.progress_pct ?? 0;
      return (
        <div className="space-y-6">
          {/* Visual Progress & Target Section */}
          <div className="rounded-xl border border-border/40 bg-gradient-to-br from-background/80 to-muted/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Limit Order Progress
              </h4>
              <span className="text-2xl font-bold text-primary">{progress.toFixed(1)}%</span>
            </div>

            {/* Animated Progress Bar */}
            <div className="relative h-4 bg-muted/30 rounded-full overflow-hidden mb-6">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progress)}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className={cn(
                  'absolute inset-y-0 left-0 rounded-full',
                  progress >= 100
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                    : progress >= 50
                      ? 'bg-gradient-to-r from-amber-500 to-amber-400'
                      : 'bg-gradient-to-r from-primary to-primary/80',
                )}
              />
            </div>

            {/* Fill Visualization */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
                  {formatNumber(plan.filled_base_amount)}
                </div>
                <div className="text-xs text-muted-foreground">Filled {plan.base_symbol}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                  {formatNumber(plan.remaining_base_amount)}
                </div>
                <div className="text-xs text-muted-foreground">Remaining {plan.base_symbol}</div>
              </div>
              <div className="text-center p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {plan.price_target ? formatNumber(plan.price_target) : '—'}
                </div>
                <div className="text-xs text-muted-foreground">Target Price</div>
              </div>
            </div>
          </div>

          <Section title="Fill Progress">
            <Metric
              label="Initial Amount"
              value={`${formatNumber(plan.initial_base_amount)} ${plan.base_symbol}`}
              icon={<DollarSign className="h-4 w-4" />}
            />
            <Metric
              label="Filled Amount"
              value={`${formatNumber(plan.filled_base_amount)} ${plan.base_symbol}`}
              icon={<CheckCircle className="h-4 w-4" />}
            />
            <Metric
              label="Remaining Amount"
              value={`${formatNumber(plan.remaining_base_amount)} ${plan.base_symbol}`}
              icon={<Target className="h-4 w-4" />}
            />
            <Metric
              label="Fill Progress"
              value={`${progress.toFixed(2)}%`}
              icon={<BarChart3 className="h-4 w-4" />}
            />
          </Section>

          <Section title="Pricing & Execution">
            <Metric
              label="Target Price"
              value={
                plan.price_target != null
                  ? `${formatNumber(plan.price_target)} ${plan.quote_symbol ?? ''}`
                  : '—'
              }
              icon={<Target className="h-4 w-4" />}
            />
            <Metric
              label="Average Fill Price"
              value={
                plan.avg_fill_price != null
                  ? `${formatNumber(plan.avg_fill_price)} ${plan.quote_symbol ?? ''}`
                  : '—'
              }
              icon={<TrendingUp className="h-4 w-4" />}
            />
            {plan.fee_bps != null && plan.fee_bps > 0 && (
              <Metric
                label="Fee (bps)"
                value={`${plan.fee_bps} bps`}
                icon={<DollarSign className="h-4 w-4" />}
              />
            )}
            {plan.slippage_bps != null && plan.slippage_bps > 0 && (
              <Metric
                label="Slippage (bps)"
                value={`${plan.slippage_bps} bps`}
                icon={<AlertCircle className="h-4 w-4" />}
              />
            )}
          </Section>
        </div>
      );
    }

    return null;
  };

  return (
    <PlanModalContext.Provider value={contextValue}>
      {children}
      <Dialog.Root open={state.isOpen} onOpenChange={(open) => (!open ? closePlan() : null)}>
        <Dialog.Portal>
          <Dialog.Overlay
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              closePlan();
            }}
          />
          <Dialog.Content
            className="fixed inset-0 z-[61] flex items-center justify-center p-4 sm:p-6"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                closePlan();
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className="w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border/60 bg-gradient-to-br from-background via-background to-card/50 shadow-2xl backdrop-blur-xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header with enhanced styling */}
              <div className="relative bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b border-border/60 px-6 py-4">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent" />
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg" />
                      <div className="relative rounded-xl bg-gradient-to-br from-primary/20 to-primary/30 p-3 text-primary border border-primary/30">
                        {state.planType === 'limit' ? (
                          <Target className="h-6 w-6" />
                        ) : (
                          <TrendingUp className="h-6 w-6" />
                        )}
                      </div>
                    </div>
                    <div>
                      <Dialog.Title className="text-xl font-bold text-foreground flex items-center gap-2">
                        {state.planType === 'limit' ? 'Limit Order Plan' : 'DCA Strategy'}
                        {state.plan && (
                          <span
                            className={cn(
                              'px-3 py-1 rounded-full text-sm font-medium border',
                              (state.plan as any).status === 'active'
                                ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400'
                                : (state.plan as any).status === 'completed'
                                  ? 'bg-gray-500/10 text-gray-600 border-gray-500/30 dark:text-gray-400'
                                  : 'bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400',
                            )}
                          >
                            {(state.plan as any).status?.toUpperCase() || 'UNKNOWN'}
                          </span>
                        )}
                      </Dialog.Title>
                      {state.planId && (
                        <Dialog.Description className="text-sm font-mono text-muted-foreground mt-1 flex items-center gap-2">
                          <span className="px-2 py-1 bg-muted/50 rounded-md text-xs">
                            {state.planId.slice(0, 8)}...{state.planId.slice(-4)}
                          </span>
                          <a
                            href={`https://solscan.io/address/${state.planId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-primary hover:text-primary/80 transition-colors"
                          >
                            <ExternalLink className="h-3 w-3" />
                            View on Solscan
                          </a>
                        </Dialog.Description>
                      )}
                      {state.capturedAt &&
                        (() => {
                          const captured = new Date(state.capturedAt);
                          if (Number.isNaN(captured.getTime())) return null;
                          return (
                            <div className="mt-2 text-xs text-muted-foreground">
                              Snapshot captured {formatLocal(captured, 'PPpp')}
                            </div>
                          );
                        })()}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {state.planId && state.planType && (
                      <PlanShareButton planId={state.planId} planType={state.planType} size="md" />
                    )}
                    <Dialog.Close className="rounded-xl border border-border/60 p-2 text-muted-foreground transition-all hover:text-foreground hover:bg-background/80 hover:scale-105">
                      <X className="h-5 w-5" />
                    </Dialog.Close>
                  </div>
                </div>
              </div>

              {/* Content area with scroll */}
              <div className="overflow-y-auto max-h-[calc(90vh-120px)] scrollbar-thin">
                <div className="space-y-6 px-6 py-6">
                  {state.loading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-12 text-muted-foreground"
                    >
                      <Loader2 className="h-8 w-8 animate-spin mb-4" />
                      <p className="text-sm">Loading plan details...</p>
                    </motion.div>
                  )}

                  {!state.loading && state.error && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-xl border border-red-400/60 bg-gradient-to-r from-red-500/10 to-red-500/5 px-6 py-4 text-red-900 dark:text-red-200"
                    >
                      <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5" />
                        <div>
                          <h4 className="font-semibold">Error Loading Plan</h4>
                          <p className="text-sm opacity-90">{state.error}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {!state.loading && !state.error && state.plan && state.planType && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 }}
                      className="space-y-6"
                    >
                      {/* Quick Stats Overview */}
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        <QuickStat
                          icon={<Activity className="h-5 w-5" />}
                          label="Side"
                          value={String((state.plan as any).side ?? '').toUpperCase()}
                          color="blue"
                          side={String((state.plan as any).side ?? '')}
                        />
                        <QuickStat
                          icon={getStatusIcon((state.plan as any).status)}
                          label="Status"
                          value={(state.plan as any).status ?? '—'}
                          color={getStatusColor((state.plan as any).status)}
                        />
                        <QuickStat
                          icon={<Calendar className="h-5 w-5" />}
                          label="Started"
                          value={displayRelative((state.plan as any).started_at)}
                          color="gray"
                        />
                        <QuickStat
                          icon={<Zap className="h-5 w-5" />}
                          label="Last Event"
                          value={displayRelative((state.plan as any).last_event_at)}
                          color="gray"
                        />
                      </div>

                      {renderPlanSpecifics()}

                      {/* Wallet and External Links */}
                      {((state.plan as any).wallet || state.planId) && (
                        <div className="rounded-xl border border-border/40 bg-gradient-to-r from-muted/20 to-muted/10 p-6">
                          <h4 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
                            <ExternalLink className="h-4 w-4" />
                            External Links
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {(state.plan as any).wallet && (
                              <a
                                href={`https://solscan.io/address/${(state.plan as any).wallet}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-2 rounded-xl border border-border/60 bg-background/80 px-4 py-3 text-sm font-medium text-foreground transition-all hover:bg-background hover:shadow-md hover:scale-105"
                              >
                                <Wallet className="h-4 w-4" />
                                <div>
                                  <div className="font-semibold">View Wallet</div>
                                  <div className="text-xs text-muted-foreground font-mono">
                                    {(state.plan as any).wallet.slice(0, 6)}...
                                    {(state.plan as any).wallet.slice(-4)}
                                  </div>
                                </div>
                              </a>
                            )}
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </PlanModalContext.Provider>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-border/40 bg-gradient-to-br from-background/80 to-muted/10 p-6 shadow-sm backdrop-blur-sm"
    >
      <div className="mb-4 text-sm font-bold uppercase tracking-wide text-foreground flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary" />
        {title}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </motion.div>
  );
}

function Metric({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/30 bg-gradient-to-br from-background/60 to-background/40 p-4 text-sm transition-all hover:shadow-md hover:scale-105">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className="text-primary">{icon}</span>}
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
      </div>
      <div className="text-foreground font-medium">{value}</div>
    </div>
  );
}

function QuickStat({
  icon,
  label,
  value,
  color,
  side,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
  side?: string;
}) {
  const getSideColors = () => {
    if (label === 'Side' && side) {
      const sideStr = side.toLowerCase();
      if (sideStr === 'sell') {
        return {
          gradient: 'from-red-500/15 to-red-500/8',
          iconBg: 'bg-red-500/20 border-red-500/30',
          textColor: 'text-red-700 dark:text-red-300',
        };
      }
      if (sideStr === 'buy') {
        return {
          gradient: 'from-emerald-500/15 to-emerald-500/8',
          iconBg: 'bg-emerald-500/20 border-emerald-500/30',
          textColor: 'text-emerald-700 dark:text-emerald-300',
        };
      }
    }

    const colorClasses = {
      blue: {
        gradient: 'from-blue-500/10 to-blue-500/5',
        iconBg: 'bg-background/60',
        textColor: 'text-blue-600 dark:text-blue-400',
      },
      green: {
        gradient: 'from-emerald-500/10 to-emerald-500/5',
        iconBg: 'bg-background/60',
        textColor: 'text-emerald-600 dark:text-emerald-400',
      },
      amber: {
        gradient: 'from-amber-500/10 to-amber-500/5',
        iconBg: 'bg-background/60',
        textColor: 'text-amber-600 dark:text-amber-400',
      },
      red: {
        gradient: 'from-red-500/10 to-red-500/5',
        iconBg: 'bg-background/60',
        textColor: 'text-red-600 dark:text-red-400',
      },
      gray: {
        gradient: 'from-gray-500/10 to-gray-500/5',
        iconBg: 'bg-background/60',
        textColor: 'text-gray-600 dark:text-gray-400',
      },
    };

    return colorClasses[color as keyof typeof colorClasses] || colorClasses.gray;
  };

  const colors = getSideColors();

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className={cn(
        'rounded-xl border border-border/40 bg-gradient-to-br p-4 transition-all',
        colors.gradient,
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('rounded-lg p-2 border', colors.iconBg)}>
          <div className={colors.textColor}>{icon}</div>
        </div>
        <div>
          <div className="text-xs font-medium text-muted-foreground">{label}</div>
          <div className={cn('font-bold', label === 'Side' ? colors.textColor : 'text-foreground')}>
            {value}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function getStatusIcon(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return <Play className="h-5 w-5" />;
    case 'completed':
      return <CheckCircle className="h-5 w-5" />;
    case 'scheduled':
      return <Clock className="h-5 w-5" />;
    default:
      return <AlertCircle className="h-5 w-5" />;
  }
}

function getStatusColor(status: string) {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'green';
    case 'completed':
      return 'gray';
    case 'scheduled':
      return 'amber';
    case 'closed':
      return 'red';
    default:
      return 'gray';
  }
}

export function usePlanModal(): PlanModalContextValue {
  const ctx = useContext(PlanModalContext);
  if (!ctx) {
    throw new Error('usePlanModal must be used within PlanModalProvider');
  }
  return ctx;
}
