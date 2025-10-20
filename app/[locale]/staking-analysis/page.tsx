/**
 * Staking analysis page that combines the polished UI from the previous dummy implementation
 * with live data pulled from the staking API.
 */
'use client';

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useMutation, useQuery } from '@tanstack/react-query';

import { apiClient } from '@/lib/api/client';
import type {
  StakingEarningsEventsResponse,
  StakingEarningsResponse,
  StakingJob,
  StakingJobResponse,
  StakingWidgetResponse,
} from '@/lib/api/types';
import { useToast } from '@/components/ui/Toast';
import {
  buildNosApiUrl,
  buildMonitorAuthHeaders,
  getMonitorApiKey,
} from '@/lib/api/monitorConfig';

import {
  normalizeEvents,
  buildAggregates,
  buildTimelineData,
  buildPerformanceMetrics,
} from './analytics';
import { AnimatedStatCard } from './components/analytics/AnimatedStatCard';
import { TimelineChart } from './components/analytics/TimelineChart';
import { DistributionChart } from './components/analytics/DistributionChart';
import { FlowVisualization } from './components/analytics/FlowVisualization';
import { EventsTable } from './components/analytics/EventsTable';
import { WalletInput } from './components/analytics/WalletInput';
import { StakeStatusCard } from './components/analytics/StakeStatusCard';

import {
  Wallet,
  TrendingUp,
  Coins,
  DollarSign,
  Activity,
  BarChart3,
  PieChart as PieChartIcon,
  Calendar,
  Zap,
  Award,
  Target,
  Percent,
  ArrowLeft,
  RefreshCcw,
  Loader2,
  ExternalLink,
  Calculator,
  Layers,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslations } from 'next-intl';

const EVENT_FETCH_LIMIT = 500;

const STAGE_KEYS = [
  'queued',
  'running',
  'account_signatures_fetch',
  'account_signatures_collected',
  'signature_collection_complete',
  'signatures_progress',
  'fetch_transactions_start',
  'fetch_transactions_batch',
  'fetch_transactions_complete',
  'fetch_transactions_progress',
  'fetch_transactions_error',
  'fetch_transactions_fallback',
  'classification_progress',
  'events_stored',
  'events_classified',
  'events_persist',
  'events_synced',
  'summary_ready',
  'no_updates_required',
  'no_new_signatures',
] as const;

type StageProgressPayload = {
  progressStage?: string;
  stageLabel?: string;
  stageMessage?: string;
  stagePercent?: number;
  stageEtaSeconds?: number | null;
  stageIndex?: number | null;
  stageCount?: number;
  elapsedSeconds?: number;
  progressDetails?: string;
  message?: string;
  overallPercent?: number;
  overallEtaSeconds?: number | null;
  progressCurrent?: number;
  progressTotal?: number;
  accountsProcessed?: number;
  accountsTotal?: number;
  signaturesCollected?: number;
  totalSignatures?: number;
  processedTransactions?: number;
  totalTransactions?: number;
  processedEvents?: number;
  totalEvents?: number;
};

type StakingJobMutationVariables = {
  wallet: string;
  mode?: 'initial' | 'incremental' | 'force' | 'empty';
};

function formatNos(value?: number | null, fractionDigits = 2) {
  if (value == null || Number.isNaN(value)) return '0';
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: fractionDigits,
  });
}

function formatUsd(value?: number | null) {
  if (value == null || Number.isNaN(value)) return '$0.00';
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function safeNumber(value: number | null | undefined, fallback = 0) {
  return Number.isFinite(value as number) ? (value as number) : fallback;
}

function describeDate(value: string) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export default function StakingAnalysisPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { addToast } = useToast();
  const tButtons = useTranslations('stakingAnalysis.buttons');
  const tLabels = useTranslations('stakingAnalysis.labels');
  const tHero = useTranslations('stakingAnalysis.hero');
  const tQuickStats = useTranslations('stakingAnalysis.quickStats');
  const tStatCards = useTranslations('stakingAnalysis.statCards');
  const tPerformance = useTranslations('stakingAnalysis.performance');
  const tRewards = useTranslations('stakingAnalysis.rewardBreakdown');
  const tDisclaimers = useTranslations('stakingAnalysis.disclaimer');
  const tUnits = useTranslations('stakingAnalysis.units');
  const tStageLabels = useTranslations('stakingAnalysis.progress.stageLabels');
  const tProgressDefaults = useTranslations('stakingAnalysis.progress.defaults');
  const tProgressDetails = useTranslations('stakingAnalysis.progress.details');
  const tProgressMode = useTranslations('stakingAnalysis.progress.modeMessages');
  const tProgressOverlay = useTranslations('stakingAnalysis.progress.overlays');
  const tProgressEta = useTranslations('stakingAnalysis.progress.eta');
  const tJobLabels = useTranslations('stakingAnalysis.progress.jobLabels');
  const tToasts = useTranslations('stakingAnalysis.toasts');
  const tLimit = useTranslations('stakingAnalysis.limit');

  const [walletInput, setWalletInput] = useState('');
  const [activeWallet, setActiveWallet] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  const [activeSyncJobId, setActiveSyncJobId] = useState<string | null>(null);
  const [syncJob, setSyncJob] = useState<StakingJob | null>(null);
  const [limitExceeded, setLimitExceeded] = useState(false);

  const lastErrorRef = useRef<string | null>(null);
  const internalNavigationRef = useRef(false);
  const jobStreamControllerRef = useRef<AbortController | null>(null);
  const lastJobStatusRef = useRef<string | null>(null);
  const lastProgressStageRef = useRef<string | null>(null);

  useEffect(() => {
    const paramWallet = searchParams.get('wallet');

    if (internalNavigationRef.current) {
      internalNavigationRef.current = false;
      return;
    }

    if (paramWallet) {
      setWalletInput(paramWallet);
      setActiveWallet(paramWallet);
      setHasSubmitted(true);
    } else {
      setActiveWallet(null);
      setHasSubmitted(false);
      setWalletInput('');
    }
  }, [searchParams]);

  const subscribeToJob = useCallback(
    async (jobId: string, signal: AbortSignal, onUpdate: (job: StakingJob) => void) => {
      const base = buildNosApiUrl('/v3/staking');
      const url = `${base}/jobs/${encodeURIComponent(jobId)}/stream`;
      const headers = new Headers();
      const defaultAuth = buildMonitorAuthHeaders();
      Object.entries(defaultAuth).forEach(([key, value]) => {
        if (value && !headers.has(key)) {
          headers.set(key, value);
        }
      });
      const apiKey = getMonitorApiKey();
      if (apiKey && !headers.has('x-api-key')) {
        headers.set('x-api-key', apiKey);
      }

      let response: Response;
      try {
        response = await fetch(url, {
          headers,
          signal,
          cache: 'no-store',
        });
      } catch (error) {
        if (signal.aborted) return;
        throw error;
      }

      if (!response.ok || !response.body) {
        const error = new Error(`Streaming failed with status ${response.status}`);
        (error as Error & { status?: number }).status = response.status;
        throw error;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      try {
        while (!signal.aborted) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let boundary = buffer.indexOf('\n\n');
          while (boundary !== -1) {
            const chunk = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            boundary = buffer.indexOf('\n\n');
            if (!chunk.trim() || chunk.startsWith(':')) continue;
            const dataLine = chunk
              .split('\n')
              .map((line) => line.trim())
              .find((line) => line.startsWith('data:'));
            if (!dataLine) continue;
            const payload = dataLine.slice(5).trim();
            if (!payload) continue;
            try {
              const parsed: StakingJob = JSON.parse(payload);
              onUpdate(parsed);
            } catch (err) {
              console.error('[staking-analysis] Failed to parse job payload', err);
            }
          }
        }
      } finally {
        if (!signal.aborted && buffer.trim()) {
          const lines = buffer
            .split('\n')
            .map((line) => line.trim())
            .filter(Boolean);
          const dataLine = lines.find((line) => line.startsWith('data:'));
          if (dataLine) {
            try {
              const parsed: StakingJob = JSON.parse(dataLine.slice(5).trim());
              onUpdate(parsed);
            } catch (err) {
              console.error('[staking-analysis] Failed to parse trailing job payload', err);
            }
          }
        }
        try {
          decoder.decode();
        } catch {}
        try {
          reader.releaseLock();
        } catch {}
      }
    },
    [],
  );

  const pollJobStatus = useCallback(
    async (jobId: string, signal: AbortSignal, onUpdate: (job: StakingJob) => void) => {
      const base = buildNosApiUrl('/v3/staking');
      const url = `${base}/jobs/${encodeURIComponent(jobId)}`;

      const createHeaders = () => {
        const headers = new Headers();
        const defaultAuth = buildMonitorAuthHeaders();
        Object.entries(defaultAuth).forEach(([key, value]) => {
          if (value && !headers.has(key)) {
            headers.set(key, value);
          }
        });
        const apiKey = getMonitorApiKey();
        if (apiKey && !headers.has('x-api-key')) {
          headers.set('x-api-key', apiKey);
        }
        headers.set('Accept', 'application/json');
        return headers;
      };

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      while (!signal.aborted) {
        try {
          const response = await fetch(url, {
            headers: createHeaders(),
            signal,
            cache: 'no-store',
          });
          if (response.status === 404) {
            await delay(1000);
            continue;
          }
          if (!response.ok) {
            throw new Error(`Job status request failed with ${response.status}`);
          }
          const data = await response.json();
          const job = data?.job as StakingJob | undefined;
          if (job) {
            onUpdate(job);
            if (job.status === 'completed' || job.status === 'failed') {
              break;
            }
          }
        } catch (error) {
          if (signal.aborted) return;
          throw error;
        }
        await delay(2000);
      }
    },
    [],
  );

  const hasWallet = Boolean(activeWallet);

  const { data: widgetResponse } = useQuery<StakingWidgetResponse>({
    queryKey: ['staking-analysis', 'widget'],
    queryFn: () => apiClient.getStakingWidget(),
    refetchInterval: 60_000,
  });

  const {
    data: earningsData,
    isLoading: earningsLoading,
    isFetching: earningsFetching,
    error: earningsError,
    refetch: refetchEarnings,
  } = useQuery<StakingEarningsResponse>({
    queryKey: ['staking-analysis', 'earnings', activeWallet],
    queryFn: () => apiClient.getStakingEarnings({ wallet: activeWallet! }),
    enabled: hasWallet,
    staleTime: 60_000,
    refetchInterval: limitExceeded ? false : 5 * 60_000,
    retry: (failureCount, error) => {
      const apiError = error as Error & { code?: string };
      if (apiError?.code === 'NOS_ACTIVITY_LIMIT_EXCEEDED') {
        return false;
      }
      return failureCount < 2;
    },
    onSuccess: (data) => {
      const job = data?.job;
      if (!job) return;
      setSyncJob(job);
      if (job.status === 'queued' || job.status === 'running') {
        setActiveSyncJobId((current) => (current === job.id ? current : job.id));
      } else {
        setActiveSyncJobId((current) => (current === job.id ? null : current));
      }
      lastJobStatusRef.current = job.status;
    },
  });

  const {
    data: eventsData,
    isLoading: eventsLoading,
    isFetching: eventsFetching,
    error: eventsError,
    refetch: refetchEvents,
  } = useQuery<StakingEarningsEventsResponse>({
    queryKey: ['staking-analysis', 'events', activeWallet, EVENT_FETCH_LIMIT],
    queryFn: () =>
      apiClient.getStakingEarningsEvents({
        wallet: activeWallet!,
        limit: EVENT_FETCH_LIMIT,
        order: 'desc',
        sortBy: 'timestamp',
      }),
    enabled: hasWallet && !limitExceeded,
    staleTime: 60_000,
    keepPreviousData: true,
  });

  const stakeAccount =
    earningsData?.stakeAccount ?? earningsData?.summary?.stakeAccount ?? null;

  const {
    mutateAsync: syncWallet,
    isPending: syncPending,
  } = useMutation<StakingJobResponse, Error, StakingJobMutationVariables>({
    mutationFn: ({ wallet, mode }) => apiClient.createStakingJob({ wallet, mode }),
    onSuccess: (response) => {
      const nextJob = response.job;
      if (jobStreamControllerRef.current) {
        jobStreamControllerRef.current.abort();
        jobStreamControllerRef.current = null;
      }
      lastProgressStageRef.current = null;
      setSyncJob(nextJob);
      setActiveSyncJobId(nextJob.id);
      lastJobStatusRef.current = nextJob.status;

      const isFullSync = nextJob.mode === 'force';
      const jobLabel = isFullSync ? tJobLabels('full') : tJobLabels('incremental');
      const shortJobId = `${nextJob.id.slice(0, 8)}…`;
      const description = isFullSync
        ? tToasts('syncStartedFull', { id: shortJobId, wallet: nextJob.wallet })
        : tToasts('syncStartedIncremental', { id: shortJobId, wallet: nextJob.wallet });
      addToast({
        title: tToasts('syncStartedTitle', { label: jobLabel }),
        description,
        type: 'success',
      });
    },
    onError: (error) => {
      addToast({
        title: tToasts('syncFailedTitle'),
        description: error.message ?? tToasts('syncFailedDescription'),
        type: 'error',
      });
    },
  });

  const handleJobUpdate = useCallback(
    (update: StakingJob) => {
      setSyncJob(update);

      const currentStage = update.stage || null;
      if (currentStage && currentStage !== lastProgressStageRef.current) {
        if (currentStage === 'events_classified' || currentStage === 'events_stored') {
          void refetchEvents();
          void refetchEarnings();
        }
        lastProgressStageRef.current = currentStage;
      }

      if (update.status === 'completed' || update.status === 'failed') {
        setActiveSyncJobId((current) => (current === update.id ? null : current));
      }
    },
    [refetchEvents, refetchEarnings],
  );

  useEffect(() => {
    if (!activeSyncJobId) {
      if (jobStreamControllerRef.current) {
        jobStreamControllerRef.current.abort();
        jobStreamControllerRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    jobStreamControllerRef.current = controller;

    subscribeToJob(activeSyncJobId, controller.signal, (update) => {
      handleJobUpdate(update);
    })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const status = (error as Error & { status?: number }).status;
        if (status === 404) {
          return pollJobStatus(activeSyncJobId, controller.signal, handleJobUpdate);
        }
        console.error('[staking-analysis] job stream error', error);
        addToast({
          title: tToasts('progressUnavailableTitle'),
          description:
            error instanceof Error
              ? error.message
              : tToasts('progressUnavailableDescription'),
          type: 'info',
        });
        return pollJobStatus(activeSyncJobId, controller.signal, handleJobUpdate);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        console.error('[staking-analysis] job polling error', error);
        addToast({
          title: tToasts('statusUnavailableTitle'),
          description:
            error instanceof Error
              ? error.message
              : tToasts('statusUnavailableDescription'),
          type: 'error',
        });
      });

    return () => {
      controller.abort();
      if (jobStreamControllerRef.current === controller) {
        jobStreamControllerRef.current = null;
      }
    };
  }, [activeSyncJobId, subscribeToJob, pollJobStatus, handleJobUpdate, addToast]);

  useEffect(() => {
    if (!activeSyncJobId) {
      if (jobStreamControllerRef.current) {
        jobStreamControllerRef.current.abort();
        jobStreamControllerRef.current = null;
      }
      return;
    }

    const controller = new AbortController();
    jobStreamControllerRef.current = controller;

    subscribeToJob(activeSyncJobId, controller.signal, (update) => {
      setSyncJob(update);

      const currentStage = update.stage || null;
      if (currentStage && currentStage !== lastProgressStageRef.current) {
        if (currentStage === 'events_classified' || currentStage === 'events_stored') {
          void refetchEvents();
          void refetchEarnings();
        }
        lastProgressStageRef.current = currentStage;
      }

      if (update.status === 'completed' || update.status === 'failed') {
        setActiveSyncJobId((current) => (current === update.id ? null : current));
      }
    }).catch((error) => {
      if (controller.signal.aborted) return;
      console.error('[staking-analysis] job stream error', error);
      addToast({
        title: tToasts('progressUnavailableTitle'),
        description:
          error instanceof Error
            ? error.message
            : tToasts('progressUnavailableDescription'),
        type: 'info',
      });
    });

    return () => {
      controller.abort();
      if (jobStreamControllerRef.current === controller) {
        jobStreamControllerRef.current = null;
      }
    };
  }, [activeSyncJobId, subscribeToJob, addToast, refetchEvents, refetchEarnings]);

  const combinedError =
    (earningsError instanceof Error ? earningsError : null) ??
    (eventsError instanceof Error ? eventsError : null);

  const syncInFlight =
    Boolean(activeSyncJobId) &&
    (!syncJob || (syncJob.status !== 'completed' && syncJob.status !== 'failed'));

  useEffect(() => {
    if (combinedError) {
      const apiError = combinedError as Error & { code?: string };
      const message = apiError?.message || combinedError.message;
      const code = typeof apiError?.code === 'string' ? apiError.code : null;
      const translatedMessage =
        code === 'NOS_ACTIVITY_LIMIT_EXCEEDED' ? tLimit('message') : message;
      setLimitExceeded(code === 'NOS_ACTIVITY_LIMIT_EXCEEDED');
      if (translatedMessage && translatedMessage !== lastErrorRef.current) {
        addToast({
          title: tToasts('loadErrorTitle'),
          description: translatedMessage,
          type: 'error',
        });
        lastErrorRef.current = translatedMessage;
      }
      setInputError(translatedMessage);
    } else {
      setInputError(null);
      lastErrorRef.current = null;
      setLimitExceeded(false);
    }
  }, [combinedError, addToast]);

  useEffect(() => {
    if (!syncJob || !syncJob.status) return;
    if (syncJob.status === lastJobStatusRef.current) return;

    if (syncJob.status === 'completed') {
      const syncInfo = syncJob.result?.sync;
      const status = syncInfo?.status || 'complete';
      const processedEvents = syncInfo?.processedEvents ?? null;
      const totalSignatures = syncInfo?.totalSignatures ?? null;
      const jobMode = syncJob.mode || syncInfo?.mode || syncJob.result?.mode || null;

      let title = tToasts('syncCompleteTitle');
      let description = tToasts('syncCompleteDescription');
      let type: 'success' | 'info' = 'success';

      if (status === 'no_activity') {
        title = tToasts('noActivityTitle');
        description = tToasts('noActivityDescription');
        type = 'info';
      } else if (status === 'up_to_date') {
        if (jobMode === 'force') {
          title = tToasts('fullSyncNoChangesTitle');
          description = tToasts('fullSyncNoChangesDescription');
        } else {
          title = tToasts('alreadyUpToDateTitle');
          description = tToasts('alreadyUpToDateDescription');
        }
        type = 'info';
      } else if (processedEvents && processedEvents > 0) {
        const eventsLabel = tToasts('eventCount', { count: processedEvents });
        const signatureLabel =
          totalSignatures != null
            ? tToasts('signatureCount', { count: totalSignatures })
            : tToasts('newSignatures');
        description = tToasts('syncCompleteCounts', {
          events: eventsLabel,
          signatures: signatureLabel,
        });
      }

      addToast({ title, description, type });
      void refetchEarnings();
      void refetchEvents();
    } else if (syncJob.status === 'failed') {
      const errMsg = syncJob.error?.message || tToasts('syncFailedDescription');
      addToast({
        title: tToasts('syncFailedTitle'),
        description: errMsg,
        type: 'error',
      });
    }

    lastJobStatusRef.current = syncJob.status;
  }, [syncJob, addToast, refetchEarnings, refetchEvents]);

  useEffect(() => {
    if (!hasWallet) {
      setIsTransitioning(false);
      return;
    }
    const pending =
      earningsLoading ||
      eventsLoading ||
      earningsFetching ||
      eventsFetching ||
      syncPending ||
      syncInFlight;
    setIsTransitioning(pending);
  }, [
    hasWallet,
    earningsLoading,
    eventsLoading,
    earningsFetching,
    eventsFetching,
    syncPending,
    syncInFlight,
  ]);

  const normalizedEvents = useMemo(
    () => normalizeEvents(eventsData?.events),
    [eventsData?.events],
  );

  const aggregates = useMemo(
    () => buildAggregates(eventsData?.aggregates, normalizedEvents),
    [eventsData?.aggregates, normalizedEvents],
  );

  const timelineData = useMemo(
    () => buildTimelineData(normalizedEvents),
    [normalizedEvents],
  );

  const performanceMetrics = useMemo(
    () =>
      buildPerformanceMetrics({
        totals: earningsData?.summary?.totals,
        metadata: earningsData?.summary?.metadata,
        aggregates,
        widget: widgetResponse?.widget,
        events: normalizedEvents,
        stakeAccount,
      }),
    [
      earningsData?.summary?.totals,
      earningsData?.summary?.metadata,
      aggregates,
      widgetResponse?.widget,
      normalizedEvents,
      stakeAccount,
    ],
  );

  const rewardBreakdown = useMemo(() => {
    const segments: string[] = [];
    if (performanceMetrics.totalRewardsUsd > 0.01) {
      segments.push(formatUsd(performanceMetrics.totalRewardsUsd));
    }
    const parts: string[] = [];
    if (performanceMetrics.restakedRewards > 0.0001) {
      parts.push(
        tRewards('restaked', { amount: formatNos(performanceMetrics.restakedRewards, 2) }),
      );
    }
    if (performanceMetrics.claimedRewards > 0.0001) {
      parts.push(
        tRewards('claimed', { amount: formatNos(performanceMetrics.claimedRewards, 2) }),
      );
    }
    if (performanceMetrics.realizedRewards > 0.0001) {
      parts.push(
        tRewards('realized', { amount: formatNos(performanceMetrics.realizedRewards, 2) }),
      );
    }
    if (parts.length) {
      segments.push(parts.join(tRewards('separator')));
    }
    return segments.join(' • ');
  }, [
    performanceMetrics.restakedRewards,
    performanceMetrics.claimedRewards,
    performanceMetrics.realizedRewards,
    performanceMetrics.totalRewardsUsd,
    tRewards,
  ]);

  const stakeAddress = earningsData?.stakeAddress ?? null;
  const lastUpdated =
    aggregates.range.end ||
    aggregates.range.start ||
    earningsData?.summary?.metadata?.lastEventAt ||
    widgetResponse?.meta?.timestamp ||
    null;
  const lastSyncedAt =
    earningsData?.sync?.lastSummaryAt ??
    earningsData?.cacheInfo?.lastSummaryAt ??
    earningsData?.summary?.metadata?.computedAt ??
    earningsData?.job?.updatedAt ??
    null;
  const lastUpdatedLabel = describeDate(lastUpdated || '');
  const lastSyncedLabel = describeDate(lastSyncedAt || '');
  const solscanWalletUrl = activeWallet
    ? `https://solscan.io/account/${encodeURIComponent(activeWallet)}`
    : null;
  const solscanStakeUrl = stakeAddress
    ? `https://solscan.io/account/${encodeURIComponent(stakeAddress)}`
    : null;

  const handleWalletSubmit = useCallback(
    (wallet: string) => {
      if (!wallet.trim()) return;
      const normalized = wallet.trim();
      internalNavigationRef.current = true;
      setWalletInput(normalized);
      setActiveWallet(normalized);
      setHasSubmitted(true);
      setIsTransitioning(true);
      setSyncJob(null);
      setActiveSyncJobId(null);
      setLimitExceeded(false);
      const params = new URLSearchParams(window.location.search);
      params.set('wallet', normalized);
      const newUrl = `${window.location.pathname}?${params.toString()}`;
      router.replace(newUrl, { scroll: false });
    },
    [router],
  );

  const handleReset = useCallback(() => {
    internalNavigationRef.current = true;
    setActiveWallet(null);
    setWalletInput('');
    setHasSubmitted(false);
    setIsTransitioning(false);
    setInputError(null);
    setLimitExceeded(false);
    const params = new URLSearchParams(window.location.search);
    params.delete('wallet');
    const search = params.toString();
    const newUrl = search ? `${window.location.pathname}?${search}` : window.location.pathname;
    router.replace(newUrl, {
      scroll: false,
    });
  }, [router]);

  const handleSyncLatest = useCallback(() => {
    if (!activeWallet) return Promise.resolve();
    return syncWallet({ wallet: activeWallet });
  }, [activeWallet, syncWallet]);

  const quickStats = [
    {
      label: tQuickStats('activeStake'),
      value: formatNos(performanceMetrics.activeStake, 0),
      suffix: ` ${tUnits('nos')}`,
      color: 'text-purple-500',
    },
    {
      label: tQuickStats('totalRewards'),
      value: formatNos(performanceMetrics.totalRewards, 2),
      suffix: ` ${tUnits('nos')}`,
      color: 'text-green-500',
      footnote: rewardBreakdown || undefined,
    },
    {
      label: tQuickStats('roi'),
      value: performanceMetrics.roi >= 0 ? '+' : '',
      extraValue: safeNumber(performanceMetrics.roi, 0).toFixed(2),
      suffix: '%',
      color: performanceMetrics.roi >= 0 ? 'text-green-500' : 'text-rose-500',
    },
    {
      label: tQuickStats('avgApr'),
      value: safeNumber(performanceMetrics.averageAPR, 0).toFixed(2),
      suffix: '%',
      color: 'text-blue-500',
    },
  ];

  const totalEvents = aggregates.totals.count;
  const averageEventSize =
    totalEvents > 0 ? aggregates.totals.amount / totalEvents : 0;

  const isIdle = !hasWallet && !hasSubmitted;

  const stageLabelMap = useMemo(() => {
    const entries: Record<string, string> = {};
    STAGE_KEYS.forEach((key) => {
      entries[key] = tStageLabels(key);
    });
    return entries;
  }, [tStageLabels]);

  const formatStageLabel = (stage: string | null | undefined) => {
    if (!stage) return tProgressDefaults('stagePreparing');
    return stageLabelMap[stage] ?? stage.replace(/_/g, ' ');
  };

  const formatEtaValue = (ms: number | null | undefined): string | null => {
    if (!ms || !Number.isFinite(ms) || ms <= 0) return null;
    const totalSeconds = Math.round(ms / 1000);
    if (totalSeconds < 60) {
      return tProgressEta('seconds', { count: totalSeconds });
    }
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remMinutes = minutes % 60;
      return tProgressEta('hoursMinutes', { hours, minutes: remMinutes });
    }
    return seconds > 0
      ? tProgressEta('minutesSeconds', { minutes, seconds })
      : tProgressEta('minutes', { minutes });
  };

  const wrappingText = tProgressEta('wrapping');
  const almostText = tProgressEta('almost');

  const progressInfo = useMemo(() => {
    if (!syncJob) {
      return {
        stagePercent: null as number | null,
        stageEtaText: syncPending ? tProgressDefaults('etaSoon') : null,
        overallPercent: null as number | null,
        overallEtaText: null as string | null,
        stageLabel: syncPending
          ? tProgressDefaults('stagePreparing')
          : tProgressDefaults('stageCached'),
        modeMessage: syncPending
          ? tProgressDefaults('modeRequesting')
          : tProgressDefaults('modeCached'),
        progressDetails: syncPending
          ? tProgressDefaults('detailsProvisioning')
          : tProgressDefaults('detailsPromptSync'),
        jobMode: null as StakingJob['mode'] | null,
        stageStep: null as number | null,
        stageCount: null as number | null,
      };
    }

    const progressPayload = (syncJob.progress?.payload ?? null) as StageProgressPayload | null;
    const metrics = syncJob.metrics || null;
    const syncSummary = syncJob.result?.sync;
    const totalSignatures = metrics?.totalSignatures ?? syncSummary?.totalSignatures ?? 0;
    const processedSignatures = metrics?.processedSignatures ?? syncSummary?.processedSignatures ?? 0;
    const finalStatus = syncSummary?.status || syncJob.status || null;

    const stagePercentFromPayload =
      progressPayload?.stagePercent != null ? Number(progressPayload.stagePercent) : null;
    const overallPercentFromPayload =
      progressPayload?.overallPercent != null ? Number(progressPayload.overallPercent) : null;

    let stagePercent =
      Number.isFinite(stagePercentFromPayload) && stagePercentFromPayload != null
        ? stagePercentFromPayload
        : null;
    if ((stagePercent == null || Number.isNaN(stagePercent)) && totalSignatures > 0) {
      const ratio = processedSignatures / Math.max(totalSignatures, 1);
      stagePercent = Math.min(100, Math.max(0, Math.round(ratio * 100)));
    }
    if (stagePercent != null && Number.isNaN(stagePercent)) {
      stagePercent = null;
    }
    if (stagePercent != null) {
      stagePercent = Math.max(0, Math.min(100, stagePercent));
    }

    const overallPercent =
      Number.isFinite(overallPercentFromPayload) && overallPercentFromPayload != null
        ? Math.max(0, Math.min(100, overallPercentFromPayload))
        : null;

    const stageEtaSeconds = progressPayload?.stageEtaSeconds;
    let stageEtaText: string | null = null;
    if (stageEtaSeconds != null && stageEtaSeconds >= 0) {
      stageEtaText =
        stageEtaSeconds === 0 ? wrappingText : formatEtaValue(stageEtaSeconds * 1000) ?? wrappingText;
    }
    if (!stageEtaText && stagePercent != null && stagePercent > 0 && stagePercent < 100) {
      const startedAt = metrics?.startedAt ? new Date(metrics.startedAt).getTime() : null;
      if (startedAt && processedSignatures > 0) {
        const elapsedMs = Date.now() - startedAt;
        if (elapsedMs > 1000) {
          const avgMsPerSig = elapsedMs / processedSignatures;
          const remaining = totalSignatures - processedSignatures;
          stageEtaText = formatEtaValue(avgMsPerSig * remaining);
        }
      }
    }

    const overallEtaSeconds =
      progressPayload?.overallEtaSeconds ??
      progressPayload?.etaSeconds ??
      metrics?.etaSeconds ??
      null;
    let overallEtaText: string | null = null;
    if (overallEtaSeconds != null && overallEtaSeconds >= 0) {
      overallEtaText =
        overallEtaSeconds === 0
          ? almostText
          : formatEtaValue(overallEtaSeconds * 1000) ?? almostText;
    }
    if (!overallEtaText && stageEtaText) {
      overallEtaText = stageEtaText;
    }
    if (!stageEtaText && overallEtaText) {
      stageEtaText = overallEtaText;
    }
    if (!stageEtaText && metrics?.etaSeconds != null) {
      stageEtaText = formatEtaValue(metrics.etaSeconds * 1000);
    }
    if (!overallEtaText && metrics?.etaSeconds != null) {
      overallEtaText = formatEtaValue(metrics.etaSeconds * 1000);
    }
    if (!stageEtaText && stagePercent != null && stagePercent >= 100) {
      stageEtaText = wrappingText;
    }
    if (!overallEtaText && overallPercent != null && overallPercent >= 100) {
      overallEtaText = almostText;
    }

    const baseStage = syncJob.stage || syncJob.status || null;
    const derivedStageLabel = formatStageLabel(baseStage);
    const stageLabel = progressPayload?.stageLabel || derivedStageLabel;
    const stageMessage = progressPayload?.stageMessage || stageLabel;

    let progressDetails: string | null = null;
    if (progressPayload) {
      if (progressPayload.progressDetails && typeof progressPayload.progressDetails === 'string') {
        progressDetails = progressPayload.progressDetails;
      } else if (progressPayload.message && typeof progressPayload.message === 'string') {
        progressDetails = progressPayload.message;
      } else if (
        progressPayload.accountsProcessed != null &&
        progressPayload.accountsTotal != null
      ) {
        progressDetails = tProgressDetails('accounts', {
          processed: progressPayload.accountsProcessed.toLocaleString(),
          total: progressPayload.accountsTotal.toLocaleString(),
        });
      } else if (
        progressPayload.processedTransactions != null &&
        progressPayload.totalTransactions != null
      ) {
        progressDetails = tProgressDetails('transactions', {
          processed: progressPayload.processedTransactions.toLocaleString(),
          total: progressPayload.totalTransactions.toLocaleString(),
        });
      } else if (
        progressPayload.processedEvents != null &&
        progressPayload.totalEvents != null
      ) {
        progressDetails = tProgressDetails('events', {
          processed: progressPayload.processedEvents.toLocaleString(),
          total: progressPayload.totalEvents.toLocaleString(),
        });
      }
    }
    if (progressDetails && stageMessage && progressDetails.trim() === stageMessage.trim()) {
      progressDetails = null;
    }

    const jobMode = syncJob.mode || syncJob.result?.mode || null;

    let modeMessage: string | null = null;
    if (progressPayload?.progressStage === 'no_updates_required' && jobMode === 'force') {
      modeMessage = tProgressMode('forceNoChanges');
    } else if (progressPayload?.stageMessage) {
      modeMessage = progressPayload.stageMessage;
    }
    if (!modeMessage) {
      if (finalStatus === 'up_to_date' && jobMode === 'force') {
        modeMessage = tProgressMode('forceUpToDate');
      } else if (jobMode === 'initial') {
        modeMessage = tProgressMode('initial');
      } else if (jobMode === 'incremental') {
        modeMessage = tProgressMode('incremental');
      } else if (jobMode === 'force') {
        modeMessage = tProgressMode('force');
      }
    }

    const stageStep =
      progressPayload?.stageIndex != null ? Number(progressPayload.stageIndex) + 1 : null;
    const stageCount = progressPayload?.stageCount ?? null;

    return {
      stagePercent,
      stageEtaText,
      overallPercent,
      overallEtaText,
      stageLabel,
      modeMessage,
      progressDetails: progressDetails ?? (stageMessage !== stageLabel ? stageMessage : null),
      jobMode,
      stageStep,
      stageCount,
    };
  }, [
    syncJob,
    syncPending,
    stageLabelMap,
    tProgressDefaults,
    tProgressDetails,
    wrappingText,
    almostText,
    tProgressEta,
    tProgressMode,
  ]);

  const shouldShowSyncOverlay = syncPending || syncInFlight;
  const showSpinnerOverlay = !shouldShowSyncOverlay && isTransitioning;
  const syncButtonBusy = syncPending || syncInFlight;
  const activeJobMode = progressInfo.jobMode || syncJob?.mode || syncJob?.result?.mode || null;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <AnimatePresence mode="wait">
        {isIdle ? (
          <motion.div
            key="wallet-input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <WalletInput
              onSubmit={handleWalletSubmit}
              defaultValue={walletInput}
              loading={isTransitioning}
              errorMessage={inputError}
            />
          </motion.div>
        ) : (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0, scale: 1.02 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            className="relative min-h-screen overflow-hidden bg-background"
          >
            <div className="relative mx-auto w-full max-w-[1920px] pt-2 pb-6 sm:pt-4 sm:pb-8 md:pt-6 md:pb-10">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="mb-4 flex flex-wrap items-center gap-2 sm:gap-3 sm:mb-6"
              >
                <motion.button
                  onClick={handleReset}
                  className="inline-flex items-center gap-2 rounded-lg border border-border/50 bg-background/50 px-4 py-2 text-sm font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/30 hover:text-foreground"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {tButtons('changeWallet')}
                </motion.button>

                {hasWallet ? (
                  <motion.button
                    onClick={() => void handleSyncLatest()}
                    disabled={syncButtonBusy}
                    className="inline-flex items-center gap-2 rounded-lg border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-medium text-primary backdrop-blur-sm transition-all hover:border-primary/60 hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-60"
                    whileHover={!syncButtonBusy ? { scale: 1.02 } : undefined}
                    whileTap={!syncButtonBusy ? { scale: 0.97 } : undefined}
                  >
                    {syncButtonBusy ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="h-4 w-4" />
                    )}
                    {syncButtonBusy ? tButtons('syncing') : tButtons('syncLatest')}
                  </motion.button>
                ) : null}

              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-4 flex flex-col gap-3 rounded-xl border border-border/50 bg-secondary/30 p-4 backdrop-blur-sm sm:mb-6 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <Wallet className="h-5 w-5 text-primary" />
                  <div className="space-y-1">
                    <div className="flex flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
                      <span className="type-meta text-xs uppercase tracking-wider text-muted-foreground">
                        {tLabels('analyzingWallet')}
                      </span>
                      {solscanWalletUrl ? (
                        <a
                          href={solscanWalletUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex max-w-full items-center gap-1 font-mono text-sm text-primary transition-colors hover:text-primary/80"
                        >
                          <span className="truncate">{activeWallet}</span>
                          <ExternalLink className="h-3.5 w-3.5 transition-opacity group-hover:opacity-80" />
                        </a>
                      ) : (
                        <span className="font-mono text-sm break-all text-foreground">{activeWallet}</span>
                      )}
                    </div>
                    {stakeAddress ? (
                      <p className="type-meta mt-1 text-xs text-muted-foreground">
                        {tLabels('stakeAccount')}{' '}
                        {solscanStakeUrl ? (
                          <a
                            href={solscanStakeUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group inline-flex items-center gap-1 font-mono text-xs text-primary transition-colors hover:text-primary/80"
                          >
                            <span className="truncate">{stakeAddress}</span>
                            <ExternalLink className="h-3 w-3 transition-opacity group-hover:opacity-80" />
                          </a>
                        ) : (
                          <span className="font-mono">{stakeAddress}</span>
                        )}
                      </p>
                    ) : null}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  <div>
                    <span className="font-medium text-foreground">{tLabels('lastUpdated')}</span>{' '}
                    {lastUpdatedLabel}
                  </div>
                  <div className="mt-1">
                    <span className="font-medium text-foreground">{tLabels('lastSynced')}</span>{' '}
                    {lastSyncedLabel}
                  </div>
                </div>
                {limitExceeded && inputError ? (
                  <p className="mt-3 text-xs font-medium text-rose-500 sm:basis-full sm:mt-3">
                    {inputError}
                  </p>
                ) : null}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="relative mb-5 overflow-hidden rounded-2xl border border-border/60 bg-card p-4 shadow-soft sm:mb-6 sm:p-6 md:rounded-3xl md:p-8"
              >
                <div className="relative space-y-3 sm:space-y-4 md:space-y-5">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 backdrop-blur-sm sm:gap-2 sm:px-3 sm:py-1.5"
                  >
                    <Zap className="h-3 w-3 text-primary sm:h-3.5 sm:w-3.5" />
                    <span className="text-[0.65rem] font-semibold uppercase tracking-wider text-primary sm:text-xs">
                      {tHero('badge')}
                    </span>
                  </motion.div>

                  <div>
                    <motion.h1
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-2xl font-bold tracking-tight text-transparent sm:text-3xl md:text-4xl lg:text-5xl"
                    >
                      {tHero('title')}
                    </motion.h1>
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="mt-2 max-w-3xl text-xs text-muted-foreground sm:mt-3 sm:text-sm md:text-base"
                    >
                      {tHero('description')}
                    </motion.p>
                  </div>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="grid grid-cols-2 gap-2 sm:gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4"
                  >
                    {quickStats.map((stat, index) => (
                      <motion.div
                        key={stat.label}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.6 + index * 0.1 }}
                        className="rounded-xl border border-border/50 bg-background/50 p-2.5 backdrop-blur-sm transition-all hover:border-primary/30 hover:shadow-lg sm:rounded-2xl sm:p-3 md:p-4"
                      >
                        <p className="mb-1 text-[0.65rem] font-medium uppercase tracking-wider text-muted-foreground sm:mb-2 sm:text-xs">
                          {stat.label}
                        </p>
                        <p className={`text-lg font-bold sm:text-xl md:text-2xl ${stat.color}`}>
                          {stat.value}
                          {stat.extraValue ?? ''}
                          {stat.suffix}
                        </p>
                        {stat.footnote ? (
                          <p className="mt-0.5 text-[0.65rem] leading-snug text-muted-foreground sm:text-xs">
                            {stat.footnote}
                          </p>
                        ) : null}
                      </motion.div>
                    ))}
                  </motion.div>
                </div>
              </motion.div>

              {hasWallet && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="mb-6"
                >
                  <StakeStatusCard stakeAccount={stakeAccount} />
                </motion.div>
              )}

              <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-4">
                <AnimatedStatCard
                  title={tStatCards('totalStaked')}
                  value={safeNumber(performanceMetrics.totalStaked, 0)}
                  suffix={` ${tUnits('nos')}`}
                  decimals={0}
                  icon={Coins}
                  iconColor="text-purple-500"
                  delay={0}
                />
                <AnimatedStatCard
                  title={tStatCards('currentValue')}
                  value={safeNumber(performanceMetrics.currentValue, 0)}
                  prefix="$"
                  decimals={2}
                  icon={DollarSign}
                  iconColor="text-green-500"
                  delay={100}
                />
                <AnimatedStatCard
                  title={tStatCards('realizedPnL')}
                  value={safeNumber(performanceMetrics.realizedPnL, 0)}
                  prefix="$"
                  decimals={2}
                  icon={TrendingUp}
                  iconColor="text-blue-500"
                  trend={performanceMetrics.realizedPnL >= 0 ? 'up' : 'down'}
                  delay={200}
                />
                <AnimatedStatCard
                  title={tStatCards('stakingDuration')}
                  value={safeNumber(performanceMetrics.stakingDuration, 0)}
                  suffix={` ${tLabels('daysSuffix')}`}
                  decimals={0}
                  icon={Calendar}
                  iconColor="text-amber-500"
                  delay={300}
                />
              </div>

              <div className="mb-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-4">
                <AnimatedStatCard
                  title={tStatCards('totalDeposits')}
                  value={safeNumber(performanceMetrics.totalDeposits, 0)}
                  suffix={` ${tUnits('nos')}`}
                  decimals={0}
                  icon={Activity}
                  iconColor="text-cyan-500"
                  delay={100}
                />
                <AnimatedStatCard
                  title={tStatCards('totalWithdrawals')}
                  value={safeNumber(performanceMetrics.totalWithdrawals, 0)}
                  suffix={` ${tUnits('nos')}`}
                  decimals={0}
                  icon={BarChart3}
                  iconColor="text-rose-500"
                  delay={200}
                />
                <AnimatedStatCard
                  title={tStatCards('costBasis')}
                  value={safeNumber(performanceMetrics.costBasis, 0)}
                  prefix="$"
                  decimals={2}
                  icon={Wallet}
                  iconColor="text-indigo-500"
                  delay={300}
                />
                <AnimatedStatCard
                  title={tStatCards('unrealizedPnL')}
                  value={safeNumber(performanceMetrics.unrealizedPnL, 0)}
                  prefix="$"
                  decimals={2}
                  icon={Target}
                  iconColor="text-emerald-500"
                  trend={performanceMetrics.unrealizedPnL >= 0 ? 'up' : 'down'}
                  delay={400}
                />
              </div>

              <div className="mb-6 grid gap-4 xl:grid-cols-2">
                <motion.div
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3, duration: 0.6 }}
                >
                  <TimelineChart data={timelineData} />
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.4, duration: 0.6 }}
                >
                  <DistributionChart aggregates={aggregates} />
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mb-6"
              >
                <FlowVisualization aggregates={aggregates} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.6 }}
                className="mb-6"
              >
                <div className="card-base p-3 sm:p-4 md:p-6">
                  <div className="mb-4 sm:mb-6">
                    <h3 className="text-base font-semibold sm:text-lg md:text-xl">
                      {tPerformance('title')}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground sm:mt-1 sm:text-sm">
                      {tPerformance('subtitle')}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-2 md:gap-6 lg:grid-cols-4">
                    {[
                      {
                        label: tPerformance('netFlow'),
                        value: formatNos(aggregates.flow.net, 2),
                        suffix: ` ${tUnits('nos')}`,
                        icon: Activity,
                        color:
                          aggregates.flow.net >= 0
                            ? 'text-green-500'
                            : 'text-rose-500',
                      },
                      {
                        label: tPerformance('totalUsdVolume'),
                        value: formatUsd(aggregates.totals.usdValue),
                        icon: DollarSign,
                        color: 'text-blue-500',
                      },
                      {
                        label: tPerformance('totalEvents'),
                        value: totalEvents.toLocaleString(),
                        icon: BarChart3,
                        color: 'text-purple-500',
                      },
                      {
                        label: tPerformance('avgEventSize'),
                        value: formatNos(averageEventSize, 2),
                        suffix: ` ${tUnits('nos')}`,
                        icon: PieChartIcon,
                        color: 'text-cyan-500',
                      },
                      {
                        label: tPerformance('averageApr'),
                        value: safeNumber(performanceMetrics.averageAPR, 0).toFixed(2),
                        suffix: '%',
                        icon: Percent,
                        color: 'text-amber-500',
                      },
                      {
                        label: tPerformance('totalRewards'),
                        value: formatNos(performanceMetrics.totalRewards, 2),
                        suffix: ` ${tUnits('nos')}`,
                        icon: Award,
                        color: 'text-emerald-500',
                        subtext: rewardBreakdown || undefined,
                      },
                      {
                        label: tPerformance('dcaValue'),
                        value: formatUsd(performanceMetrics.dcaValue),
                        icon: Calculator,
                        color: 'text-sky-500',
                      },
                      {
                        label: tPerformance('dcaValueWithRewards'),
                        value: formatUsd(performanceMetrics.dcaValueWithRewards),
                        icon: Layers,
                        color: 'text-teal-500',
                      },
                    ].map((stat, index) => {
                      const Icon = stat.icon;
                      return (
                        <motion.div
                          key={stat.label}
                          initial={{ opacity: 0, scale: 0.9 }}
                          whileInView={{ opacity: 1, scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-2.5 rounded-lg border border-border/50 bg-secondary/20 p-2.5 transition-all hover:border-primary/30 hover:bg-secondary/30 sm:gap-3 sm:rounded-xl sm:p-3 md:gap-4 md:p-4"
                        >
                          <div
                            className={`flex-shrink-0 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 p-2 sm:p-2.5 md:p-3 ${stat.color}`}
                          >
                            <Icon className="h-4 w-4 sm:h-4.5 sm:w-4.5 md:h-5 md:w-5" />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-muted-foreground sm:text-sm">
                              {stat.label}
                            </p>
                            <p className="mt-0.5 text-base font-bold sm:mt-1 sm:text-lg md:text-xl">
                              {stat.value}
                              {stat.suffix}
                            </p>
                            {stat.subtext ? (
                              <p className="text-[0.65rem] text-muted-foreground sm:text-xs">
                                {stat.subtext}
                              </p>
                            ) : null}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7, duration: 0.6 }}
              >
                <EventsTable events={normalizedEvents} />
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="mt-8 text-center"
              >
                <p className="type-meta text-muted-foreground">
                  {tDisclaimers('alpha')}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {tDisclaimers('feedback')}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {(shouldShowSyncOverlay || showSpinnerOverlay) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
          >
            {shouldShowSyncOverlay ? (
              <div className="w-[92%] max-w-md rounded-2xl border border-border/60 bg-background/95 p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <RefreshCcw
                      className={cn('h-5 w-5', syncInFlight ? 'animate-spin' : '')}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tProgressOverlay('syncTitle')}</p>
                    <p className="text-xs text-muted-foreground">
                      {progressInfo.stageLabel}
                      {progressInfo.stageStep && progressInfo.stageCount
                        ? ` • ${tProgressOverlay('stepProgress', {
                            current: progressInfo.stageStep,
                            total: progressInfo.stageCount,
                          })}`
                        : null}
                    </p>
                  </div>
                </div>

                {progressInfo.modeMessage ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {progressInfo.modeMessage}
                  </p>
                ) : null}

                {progressInfo.stagePercent != null ? (
                  <div className="mt-4 space-y-2">
                    <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/50">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${progressInfo.stagePercent}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        {tProgressOverlay('stagePercent', { percent: progressInfo.stagePercent })}
                      </span>
                      {progressInfo.stageEtaText ? <span>{progressInfo.stageEtaText}</span> : null}
                    </div>
                    {progressInfo.overallPercent != null || progressInfo.overallEtaText ? (
                      <div className="flex items-center justify-between text-[0.65rem] text-muted-foreground/80">
                        <span>
                          {progressInfo.overallPercent != null
                            ? tProgressOverlay('overallPercent', {
                                percent: progressInfo.overallPercent,
                              })
                            : '\u00a0'}
                        </span>
                        {progressInfo.overallEtaText ? <span>{progressInfo.overallEtaText}</span> : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {tProgressOverlay('preparingJob')}
                  </div>
                )}

                {progressInfo.progressDetails ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {progressInfo.progressDetails}
                  </p>
                ) : null}

                {activeJobMode === 'initial' && syncInFlight ? (
                  <p className="mt-3 text-[0.65rem] text-muted-foreground/80">
                    {tProgressOverlay('initialHint')}
                  </p>
                ) : null}
              </div>
            ) : (
              <div className="w-[92%] max-w-md rounded-2xl border border-border/60 bg-background/95 p-6 shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="rounded-full bg-primary/10 p-2 text-primary">
                    <Loader2 className="h-5 w-5 animate-spin" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{tProgressOverlay('loadingTitle')}</p>
                    <p className="text-xs text-muted-foreground">
                      {progressInfo.stageLabel}
                    </p>
                  </div>
                </div>

                <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>{tProgressOverlay('loadingList.retrieving')}</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                    <span>
                      {tProgressOverlay.rich('loadingList.firstTime', {
                        strong: (chunks) => <strong>{chunks}</strong>,
                      })}
                    </span>
                  </li>
                </ul>

                {progressInfo.modeMessage ? (
                  <p className="mt-3 text-xs text-muted-foreground">
                    {progressInfo.modeMessage}
                  </p>
                ) : null}

                <p className="mt-4 text-[0.65rem] text-muted-foreground/80">
                  {tProgressOverlay('loadingFooter')}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
