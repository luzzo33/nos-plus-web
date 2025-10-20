import type {
  StakingEarningsEvent,
  StakingEarningsEventsAggregates,
  StakingEarningsMetadata,
  StakingEarningsTotals,
  StakingStakeAccountDetails,
  StakingWidgetData,
} from '@/lib/api/types';

export const KNOWN_EVENT_TYPES = [
  'purchase',
  'sale',
  'transfer_in',
  'transfer_out',
  'stake_deposit',
  'stake_withdrawal',
  'stake_slash',
] as const;

export type KnownEventType = (typeof KNOWN_EVENT_TYPES)[number];
export type StakingEventType = KnownEventType | (string & {});

export interface StakingAnalyticsEvent {
  id: number;
  signature: string;
  timestamp: string;
  type: StakingEventType;
  amount: number;
  priceUsd: number | null;
  usdValue: number | null;
  metadata?: {
    walletDelta?: number;
    vaultDelta?: number;
    accounts?: string[];
  };
}

export interface StakingAnalyticsAggregates {
  totals: {
    amount: number;
    usdValue: number;
    netAmount: number;
    netUsdValue: number;
    count: number;
  };
  byType: Record<
    StakingEventType,
    {
      amount: number;
      usdValue: number;
      count: number;
      averageAmount: number;
      averageUsdValue: number;
      firstSeen: string;
      lastSeen: string;
    }
  >;
  range: {
    start: string;
    end: string;
  };
  flow: StakingFlowSummary;
}

export interface TimelineDataPoint {
  date: string;
  deposits: number;
  withdrawals: number;
  purchases: number;
  sales: number;
  transfers: number;
  totalVolume: number;
  netFlow: number;
  cumulativeDeposits: number;
  cumulativeWithdrawals: number;
  cumulativePurchases: number;
  cumulativeSales: number;
  cumulativeTransfers: number;
  cumulativeTotalVolume: number;
  cumulativeNetFlow: number;
}

export interface StakingFlowCategory {
  amount: number;
  usdValue: number;
}

export interface StakingFlowSummary {
  walletInflow: number;
  walletOutflow: number;
  net: number;
  walletInflowUsd: number;
  walletOutflowUsd: number;
  categories: {
    purchases: StakingFlowCategory;
    transfersIn: StakingFlowCategory;
    stakeWithdrawals: StakingFlowCategory;
    sales: StakingFlowCategory;
    transfersOut: StakingFlowCategory;
    stakePrincipalDeposits: StakingFlowCategory;
    stakeRewardRestaked: StakingFlowCategory;
    stakeSlashes: StakingFlowCategory;
  };
}

export interface PerformanceMetrics {
  totalStaked: number;
  totalRewards: number;
  totalRewardsUsd: number;
  realizedRewardsUsd: number;
  realizedRewards: number;
  restakedRewards: number;
  restakedRewardsUsd: number;
  claimedRewards: number;
  claimedRewardsUsd: number;
  realizedPnL: number;
  unrealizedPnL: number;
  averageAPR: number;
  stakingDuration: number;
  totalDeposits: number;
  totalWithdrawals: number;
  activeStake: number;
  costBasis: number;
  currentValue: number;
  roi: number;
  dcaValue: number;
  dcaValueWithRewards: number;
}

function sanitizeTimestamp(value: string | number | null | undefined): string {
  if (value == null) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString();
}

function timestampToMs(value: string): number {
  if (!value) return Number.NEGATIVE_INFINITY;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : Number.NEGATIVE_INFINITY;
}

function normalizeMetadata(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object') return undefined;
  const source = metadata as Record<string, unknown>;
  const walletDelta =
    typeof source.walletDelta === 'number' ? source.walletDelta : undefined;
  const vaultDelta =
    typeof source.vaultDelta === 'number' ? source.vaultDelta : undefined;
  const accounts = Array.isArray(source.accounts)
    ? source.accounts.map((entry) => String(entry))
    : undefined;
  if (
    walletDelta === undefined &&
    vaultDelta === undefined &&
    (!accounts || accounts.length === 0)
  ) {
    return undefined;
  }
  return { walletDelta, vaultDelta, accounts };
}

export function normalizeEvents(
  events: StakingEarningsEvent[] | undefined,
): StakingAnalyticsEvent[] {
  if (!events?.length) return [];

  const normalized = events.map((event) => {
    const timestamp = sanitizeTimestamp(event.timestamp);
    return {
      id: Number(event.id ?? 0),
      signature: event.signature ?? '',
      timestamp,
      type: (event.type ?? 'unknown') as StakingEventType,
      amount: Number(event.amount ?? 0) || 0,
      priceUsd:
        event.priceUsd === null || event.priceUsd === undefined
          ? null
          : Number(event.priceUsd),
      usdValue:
        event.usdValue === null || event.usdValue === undefined
          ? null
          : Number(event.usdValue),
      metadata: normalizeMetadata(event.metadata),
    };
  });

  normalized.sort(
    (a, b) => timestampToMs(b.timestamp) - timestampToMs(a.timestamp),
  );

  return normalized;
}

const DEFAULT_AGGREGATE_ENTRY = {
  amount: 0,
  usdValue: 0,
  count: 0,
  averageAmount: 0,
  averageUsdValue: 0,
  firstSeen: '',
  lastSeen: '',
};

const FLOW_WALLET_THRESHOLD = 0.01;

function ensureAggregateEntry(
  map: StakingAnalyticsAggregates['byType'],
  type: StakingEventType,
) {
  if (!map[type]) {
    map[type] = { ...DEFAULT_AGGREGATE_ENTRY };
  }
  return map[type];
}

export function buildAggregates(
  aggregates: StakingEarningsEventsAggregates | undefined,
  events: StakingAnalyticsEvent[],
): StakingAnalyticsAggregates {
  const byType: StakingAnalyticsAggregates['byType'] = {};

  if (aggregates?.byType) {
    Object.entries(aggregates.byType).forEach(([type, data]) => {
      byType[type] = {
        amount: Number(data.amount ?? 0) || 0,
        usdValue: Number(data.usdValue ?? 0) || 0,
        count: Number(data.count ?? 0) || 0,
        averageAmount: Number(data.averageAmount ?? 0) || 0,
        averageUsdValue: Number(data.averageUsdValue ?? 0) || 0,
        firstSeen: sanitizeTimestamp(data.firstSeen),
        lastSeen: sanitizeTimestamp(data.lastSeen),
      };
    });
  }

  if (!aggregates || !aggregates.byType) {
    events.forEach((event) => {
      const entry = ensureAggregateEntry(byType, event.type);
      entry.amount += event.amount;
      entry.usdValue += event.usdValue ?? 0;
      entry.count += 1;
      entry.averageAmount =
        entry.count > 0 ? entry.amount / entry.count : entry.averageAmount;
      entry.averageUsdValue =
        entry.count > 0 ? entry.usdValue / entry.count : entry.averageUsdValue;

      const timestamp = event.timestamp;
      if (timestamp) {
        if (!entry.firstSeen || timestampToMs(timestamp) < timestampToMs(entry.firstSeen)) {
          entry.firstSeen = timestamp;
        }
        if (!entry.lastSeen || timestampToMs(timestamp) > timestampToMs(entry.lastSeen)) {
          entry.lastSeen = timestamp;
        }
      }
    });
  }

  const knownTypes = new Set<StakingEventType>([
    ...Object.keys(byType),
    ...KNOWN_EVENT_TYPES,
    ...events.map((event) => event.type),
  ]);

  knownTypes.forEach((type) => {
    ensureAggregateEntry(byType, type);
  });

  const totals = aggregates?.totals ?? {
    amount: events.reduce((sum, event) => sum + event.amount, 0),
    usdValue: events.reduce((sum, event) => sum + (event.usdValue ?? 0), 0),
    netAmount: 0,
    netUsdValue: 0,
    count: events.length,
  };

  const totalsSanitized = {
    amount: Number(totals.amount ?? 0) || 0,
    usdValue: Number(totals.usdValue ?? 0) || 0,
    netAmount: Number(totals.netAmount ?? 0) || 0,
    netUsdValue: Number(totals.netUsdValue ?? 0) || 0,
    count: Number(totals.count ?? events.length ?? 0) || 0,
  };

  if (!aggregates?.totals) {
    const direction: Record<KnownEventType, number> = {
      purchase: 1,
      transfer_in: 1,
      stake_withdrawal: 1,
      sale: -1,
      transfer_out: -1,
      stake_deposit: -1,
      stake_slash: -1,
    };
    totalsSanitized.netAmount = events.reduce((sum, event) => {
      const weight =
        typeof direction[event.type as KnownEventType] === 'number'
          ? direction[event.type as KnownEventType]
          : 0;
      return sum + event.amount * weight;
    }, 0);
    totalsSanitized.netUsdValue = events.reduce((sum, event) => {
      const weight =
        typeof direction[event.type as KnownEventType] === 'number'
          ? direction[event.type as KnownEventType]
          : 0;
      return sum + (event.usdValue ?? 0) * weight;
    }, 0);
  }

  const rangeStart =
    sanitizeTimestamp(aggregates?.range?.start) ||
    (events.length ? events[events.length - 1].timestamp : '');
  const rangeEnd =
    sanitizeTimestamp(aggregates?.range?.end) ||
    (events.length ? events[0].timestamp : '');

  const createCategory = (): StakingFlowCategory => ({
    amount: 0,
    usdValue: 0,
  });

  const flowSummary: StakingFlowSummary = {
    walletInflow: 0,
    walletOutflow: 0,
    net: 0,
    walletInflowUsd: 0,
    walletOutflowUsd: 0,
    categories: {
      purchases: createCategory(),
      transfersIn: createCategory(),
      stakeWithdrawals: createCategory(),
      sales: createCategory(),
      transfersOut: createCategory(),
      stakePrincipalDeposits: createCategory(),
      stakeRewardRestaked: createCategory(),
      stakeSlashes: createCategory(),
    },
  };

  const addToCategory = (
    key: keyof StakingFlowSummary['categories'],
    amount: number,
    usd: number,
  ) => {
    if (!Number.isFinite(amount) || amount === 0) return;
    const target = flowSummary.categories[key];
    target.amount += amount;
    target.usdValue += Number.isFinite(usd) ? usd : 0;
  };

  events.forEach((event) => {
    const amount = Number(event.amount ?? 0) || 0;
    const usdValue = Number(event.usdValue ?? 0) || 0;
    const walletDelta =
      typeof event.metadata?.walletDelta === 'number'
        ? event.metadata.walletDelta
        : null;

    if (walletDelta != null) {
      if (walletDelta > FLOW_WALLET_THRESHOLD) {
        const ratio = amount > 0 ? walletDelta / amount : 0;
        flowSummary.walletInflow += walletDelta;
        flowSummary.walletInflowUsd += ratio > 0 ? usdValue * ratio : 0;
      } else if (walletDelta < -FLOW_WALLET_THRESHOLD) {
        const outAbs = Math.abs(walletDelta);
        const ratio = amount > 0 ? outAbs / amount : 0;
        flowSummary.walletOutflow += outAbs;
        flowSummary.walletOutflowUsd += ratio > 0 ? usdValue * ratio : 0;
      }
    }

    switch (event.type) {
      case 'purchase':
        addToCategory('purchases', amount, usdValue);
        break;
      case 'transfer_in':
        addToCategory('transfersIn', amount, usdValue);
        break;
      case 'stake_withdrawal':
        addToCategory('stakeWithdrawals', amount, usdValue);
        break;
      case 'sale':
        addToCategory('sales', amount, usdValue);
        break;
      case 'transfer_out':
        addToCategory('transfersOut', amount, usdValue);
        break;
      case 'stake_deposit': {
        const walletOut =
          walletDelta != null && walletDelta < -FLOW_WALLET_THRESHOLD
            ? Math.abs(walletDelta)
            : 0;
        const principalPortion = Math.min(amount, walletOut);
        const rewardPortion = Math.max(amount - principalPortion, 0);
        const principalUsd =
          amount > 0 && principalPortion > 0
            ? usdValue * (principalPortion / amount)
            : 0;
        const rewardUsd =
          amount > 0 && rewardPortion > 0
            ? usdValue * (rewardPortion / amount)
            : 0;
        addToCategory('stakePrincipalDeposits', principalPortion, principalUsd);
        addToCategory('stakeRewardRestaked', rewardPortion, rewardUsd);
        break;
      }
      case 'stake_slash':
        addToCategory('stakeSlashes', amount, usdValue);
        break;
      default:
        break;
    }
  });

  flowSummary.net = flowSummary.walletInflow - flowSummary.walletOutflow;

  return {
    totals: totalsSanitized,
    byType,
    range: {
      start: rangeStart,
      end: rangeEnd,
    },
    flow: flowSummary,
  };
}

export function buildTimelineData(
  events: StakingAnalyticsEvent[],
): TimelineDataPoint[] {
  const daily = new Map<string, TimelineDataPoint>();

  events.forEach((event) => {
    if (!event.timestamp) return;
    const date = event.timestamp.split('T')[0];
    if (!daily.has(date)) {
      daily.set(date, {
        date,
        deposits: 0,
        withdrawals: 0,
        purchases: 0,
        sales: 0,
        transfers: 0,
        totalVolume: 0,
        netFlow: 0,
        cumulativeDeposits: 0,
        cumulativeWithdrawals: 0,
        cumulativePurchases: 0,
        cumulativeSales: 0,
        cumulativeTransfers: 0,
        cumulativeTotalVolume: 0,
        cumulativeNetFlow: 0,
      });
    }
    const bucket = daily.get(date)!;
    switch (event.type) {
      case 'stake_deposit':
        bucket.deposits += event.amount;
        bucket.netFlow -= event.amount;
        break;
      case 'stake_withdrawal':
        bucket.withdrawals += event.amount;
        bucket.netFlow += event.amount;
        break;
      case 'purchase':
        bucket.purchases += event.amount;
        bucket.netFlow += event.amount;
        break;
      case 'sale':
        bucket.sales += event.amount;
        bucket.netFlow -= event.amount;
        break;
      case 'transfer_in':
      case 'transfer_out':
        bucket.transfers += event.amount;
        break;
      default:
        break;
    }
    bucket.totalVolume += event.amount;
  });

  const sorted = Array.from(daily.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  const runningTotals = {
    deposits: 0,
    withdrawals: 0,
    purchases: 0,
    sales: 0,
    transfers: 0,
    totalVolume: 0,
    netFlow: 0,
  };

  return sorted.map((entry) => {
    runningTotals.deposits += entry.deposits;
    runningTotals.withdrawals += entry.withdrawals;
    runningTotals.purchases += entry.purchases;
    runningTotals.sales += entry.sales;
    runningTotals.transfers += entry.transfers;
    runningTotals.totalVolume += entry.totalVolume;
    runningTotals.netFlow += entry.netFlow;

    return {
      ...entry,
      cumulativeDeposits: runningTotals.deposits,
      cumulativeWithdrawals: runningTotals.withdrawals,
      cumulativePurchases: runningTotals.purchases,
      cumulativeSales: runningTotals.sales,
      cumulativeTransfers: runningTotals.transfers,
      cumulativeTotalVolume: runningTotals.totalVolume,
      cumulativeNetFlow: runningTotals.netFlow,
    };
  });
}

export function buildPerformanceMetrics({
  totals,
  metadata,
  aggregates,
  widget,
  events,
  stakeAccount,
}: {
  totals: StakingEarningsTotals | undefined;
  metadata: StakingEarningsMetadata | undefined;
  aggregates: StakingAnalyticsAggregates;
  widget: StakingWidgetData | undefined;
  events: StakingAnalyticsEvent[];
  stakeAccount?: StakingStakeAccountDetails | null;
}): PerformanceMetrics {
  const totalDeposits =
    Number(totals?.stakeDeposited ?? aggregates.byType.stake_deposit?.amount ?? 0) || 0;
  const totalWithdrawals =
    Number(totals?.stakeWithdrawn ?? aggregates.byType.stake_withdrawal?.amount ?? 0) || 0;
  const restakedRewards = Number(totals?.rewardRestaked ?? 0) || 0;
  const restakedRewardsUsd = Number(totals?.rewardRestakedUsd ?? 0) || 0;
  const claimedRewards = Number(totals?.rewardsClaimed ?? 0) || 0;
  const claimedRewardsUsd = Number(totals?.rewardsClaimedUsd ?? 0) || 0;
  const realizedRewards = Number(totals?.realizedRewards ?? 0) || 0;
  const realizedRewardsUsd = Number(totals?.realizedRewardsUsd ?? 0) || 0;
  const totalRewardsAccrued =
    Number(
      totals?.totalRewardsAccrued ??
        restakedRewards + claimedRewards + realizedRewards,
    ) || 0;
  const totalRewardsAccruedUsd =
    Number(
      totals?.totalRewardsAccruedUsd ??
        restakedRewardsUsd + claimedRewardsUsd + realizedRewardsUsd,
    ) || 0;
  const currentStaked =
    Number(totals?.currentStakedAmount ?? Math.max(0, totalDeposits - totalWithdrawals)) || 0;
  const currentTokensHeld = Number(totals?.currentTokensHeld ?? currentStaked) || 0;
  const purchaseCostUsd = Number(totals?.purchaseCostUsd ?? 0) || 0;
  const salesProceedsUsd = Number(totals?.salesProceedsUsd ?? 0) || 0;
  const currentCostBasisUsd = Number(totals?.currentCostBasisUsd ?? 0) || 0;
  const averagePurchasePrice =
    Number(totals?.effectiveAveragePrice ?? totals?.averagePurchasePrice ?? 0) || 0;

  let referencePrice = averagePurchasePrice;
  const priceFromEvents = events.find((event) => event.priceUsd && event.priceUsd > 0);
  if (priceFromEvents?.priceUsd && priceFromEvents.priceUsd > 0) {
    referencePrice = priceFromEvents.priceUsd;
  }

  const currentValueUsd =
    referencePrice > 0 ? currentTokensHeld * referencePrice : currentCostBasisUsd;

  const realizedPnLUsd =
    salesProceedsUsd -
    Math.max(0, purchaseCostUsd - currentCostBasisUsd) +
    realizedRewardsUsd;
  const unrealizedPnLUsd = currentValueUsd - currentCostBasisUsd;

  const roi =
    purchaseCostUsd > 0
      ? ((salesProceedsUsd + realizedRewardsUsd + currentValueUsd - purchaseCostUsd) /
          purchaseCostUsd) *
        100
      : 0;

  const aprFromMetadata =
    typeof metadata?.averageApr === 'number' && Number.isFinite(metadata.averageApr)
      ? metadata.averageApr
      : null;
  const aprFromWidget =
    typeof widget?.apr?.current === 'number' && Number.isFinite(widget.apr.current)
      ? Number(widget.apr.current)
      : typeof widget?.apr?.display === 'string'
      ? Number(widget.apr.display.replace(/[^0-9.-]/g, ''))
      : null;
  const aprDisplay =
    aprFromMetadata != null && Number.isFinite(aprFromMetadata)
      ? aprFromMetadata
      : aprFromWidget != null && Number.isFinite(aprFromWidget)
      ? aprFromWidget
      : 0;

  const dcaPrincipalRaw = totals?.stakeDcaValue ?? metadata?.stakeDcaValue ?? null;
  const dcaWithRewardsRaw =
    totals?.stakeDcaValueWithRewards ?? metadata?.stakeDcaValueWithRewards ?? null;
  const dcaPrincipalValue =
    typeof dcaPrincipalRaw === 'number' && Number.isFinite(dcaPrincipalRaw)
      ? dcaPrincipalRaw
      : null;
  const dcaWithRewardsValue =
    typeof dcaWithRewardsRaw === 'number' && Number.isFinite(dcaWithRewardsRaw)
      ? dcaWithRewardsRaw
      : null;

  const startTs =
    sanitizeTimestamp(metadata?.firstEventAt) || aggregates.range.start;
  const endTs = sanitizeTimestamp(metadata?.lastEventAt) || aggregates.range.end;
  const durationMs = timestampToMs(endTs) - timestampToMs(startTs);
  const configuredDurationDays =
    typeof stakeAccount?.durationDays === 'number' && Number.isFinite(stakeAccount.durationDays)
      ? stakeAccount.durationDays
      : typeof metadata?.stakeDurationDays === 'number' &&
        Number.isFinite(metadata.stakeDurationDays)
      ? metadata.stakeDurationDays
      : null;
  const stakingDuration =
    configuredDurationDays != null
      ? Math.max(0, Math.round(configuredDurationDays))
      : durationMs > 0
      ? Math.round(durationMs / (1000 * 60 * 60 * 24))
      : 0;

  return {
    totalStaked: currentStaked,
    totalRewards: totalRewardsAccrued,
    totalRewardsUsd: totalRewardsAccruedUsd,
    realizedRewardsUsd,
    realizedRewards,
    restakedRewards,
    restakedRewardsUsd,
    claimedRewards,
    claimedRewardsUsd,
    realizedPnL: Number.isFinite(realizedPnLUsd) ? realizedPnLUsd : 0,
    unrealizedPnL: Number.isFinite(unrealizedPnLUsd) ? unrealizedPnLUsd : 0,
    averageAPR: Number.isFinite(aprDisplay) ? aprDisplay : 0,
    stakingDuration,
    totalDeposits,
    totalWithdrawals,
    activeStake: currentStaked,
    costBasis: Number.isFinite(currentCostBasisUsd) ? currentCostBasisUsd : 0,
    currentValue: Number.isFinite(currentValueUsd) ? currentValueUsd : 0,
    roi: Number.isFinite(roi) ? roi : 0,
    dcaValue: Number.isFinite(dcaPrincipalValue ?? NaN) ? (dcaPrincipalValue ?? 0) : 0,
    dcaValueWithRewards: Number.isFinite(dcaWithRewardsValue ?? NaN)
      ? (dcaWithRewardsValue ?? 0)
      : 0,
  };
}
