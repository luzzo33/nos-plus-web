'use client';
import React, { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { FixedSizeList as List } from 'react-window';
import type { FixedSizeList as FixedSizeListRef } from 'react-window';
import { Activity, ExternalLink, Settings, X } from 'lucide-react';
import { useMonitorStream } from '@/lib/monitor/useMonitorStream';
import type { LiveMonitorEvent } from '@/lib/monitor/liveTypes';
import { cn } from '@/lib/utils';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { Tooltip } from '@/components/ui/Tooltip';
import { toDate } from '@/lib/time';
import {
  MONITOR_EXCHANGES,
  buildDefaultExchangeSelection,
  selectedVenues as resolveSelectedVenues,
  type MonitorExchangeSelection,
} from '@/lib/monitor/exchanges';
import { usePlanModal } from '@/components/monitor/PlanModalProvider';
import type { PlanType } from '@/components/monitor/PlanModalProvider';
import { MonitorWidgetFrame } from '@/components/monitor/MonitorWidgetFrame';

const ROW_HEIGHT = 28;
const FILL_CAP_USD = 10000;

const VENUE_LABELS: Record<string, string> = {
  gate: 'Gate.io',
  raydium: 'Raydium',
  mexc: 'MEXC',
  'jupiter-limit-nos': 'Jupiter LO',
  'jupiter-dca-nos': 'Jupiter DCA',
  kraken: 'Kraken',
  cryptocom: 'CDC',
};

const STABLE_QUOTES = new Set(['USDC', 'USDT', 'USD', 'UST', 'USDC.SOL']);

function prettyVenueLabel(slug?: string | null) {
  if (!slug) return '';
  const key = slug.toLowerCase();
  return VENUE_LABELS[key] ?? slug.toUpperCase();
}

type SortKey = 'time' | 'amount' | 'price' | 'pair' | 'action';
type VenueBadge = { slug: string; icon: string; label: string };

function formatRelativeNoAgo(iso: string, nowMs: number) {
  let t: number;
  if (/^\d+$/.test(iso.trim())) {
    const n = Number(iso);
    t = n > 1e12 ? n : n * 1000;
  } else {
    const coerced = iso.endsWith('Z') || iso.includes('+') ? iso : `${iso}Z`;
    t = new Date(coerced).getTime();
  }
  let diff = nowMs - t;
  if (diff < 0 && diff > -5 * 60 * 1000) diff = 0;
  const abs = Math.abs(diff);
  const s = Math.floor(abs / 1000);
  if (s < 60) return diff >= 0 ? `${s}s` : `in ${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return diff >= 0 ? `${m}m` : `in ${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return diff >= 0 ? `${h}h ${m % 60}m` : `in ${h}h ${m % 60}m`;
  const d = Math.floor(h / 24);
  return diff >= 0 ? `${d}d ${h % 24}h` : `in ${d}d ${h % 24}h`;
}

function formatCompact(n?: number | null) {
  if (n == null || !Number.isFinite(Number(n))) return '';
  const v = Number(n);
  const a = Math.abs(v);
  if (a === 0) return '0';
  if (a < 0.001) return '<0.001';
  if (a < 1) return v.toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
  if (a < 1000) return v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
  if (a < 1_000_000) return v.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return (v / 1_000_000).toFixed(2) + 'M';
}

function formatWithSymbol(value: number | null, symbol: string): string {
  if (value == null || !Number.isFinite(Number(value))) return '—';
  const formatted = formatCompact(value);
  if (!symbol) return formatted;
  const fiatSymbols = new Set(['$', '€', '£', '¥']);
  if (fiatSymbols.has(symbol)) return `${symbol}${formatted}`;
  if (/^[A-Z0-9]{2,6}$/.test(symbol)) return `${formatted} ${symbol}`;
  return `${symbol}${formatted}`;
}

function formatPresetLabel(value: number): string {
  if (value <= 0) return 'All';
  if (value >= 1_000_000_000)
    return `$${(value / 1_000_000_000).toFixed(value % 1_000_000_000 === 0 ? 0 : 1)}B`;
  if (value >= 1_000_000)
    return `$${(value / 1_000_000).toFixed(value % 1_000_000 === 0 ? 0 : 1)}M`;
  if (value >= 1_000) {
    const thousands = value / 1_000;
    const formatted = Number.isInteger(thousands) ? thousands.toFixed(0) : thousands.toFixed(1);
    return `$${formatted}k`;
  }
  const maxDigits = value < 1 ? 4 : value < 10 ? 2 : 0;
  return `$${value.toLocaleString(undefined, { maximumFractionDigits: maxDigits })}`;
}

function parsePresetValue(raw: string): number | null {
  const normalized = raw.trim();
  if (!normalized.length) return null;
  const sanitized = normalized.replace(/,/g, '').toLowerCase();
  let multiplier = 1;
  let numericPortion = sanitized;
  if (sanitized.endsWith('k')) {
    multiplier = 1_000;
    numericPortion = sanitized.slice(0, -1);
  } else if (sanitized.endsWith('m')) {
    multiplier = 1_000_000;
    numericPortion = sanitized.slice(0, -1);
  }
  const parsed = Number(numericPortion);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return parsed * multiplier;
}

type PlacementSnapshot = {
  baseAmount?: number | null;
  quoteAmount?: number | null;
  price?: number | null;
  usdPrice?: number | null;
  quoteUsdPrice?: number | null;
  usdValue?: number | null;
} | null;

const placementCache = new WeakMap<LiveMonitorEvent, PlacementSnapshot>();

function toFiniteNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const normalized = value.replace(/,/g, '').trim();
    if (!normalized.length) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function pickPlacementNumber(
  meta: Record<string, unknown> | null | undefined,
  keys: string[],
): number | null {
  if (!meta) return null;
  for (const key of keys) {
    const candidate = meta[key];
    const numeric = toFiniteNumber(candidate);
    if (numeric != null) return numeric;
  }
  return null;
}

function resolvePlacementDetails(evt: LiveMonitorEvent): PlacementSnapshot {
  if (placementCache.has(evt)) {
    return placementCache.get(evt) ?? null;
  }
  const snapshot = computePlacementDetails(evt);
  placementCache.set(evt, snapshot ?? null);
  return snapshot ?? null;
}

function computePlacementDetails(evt: LiveMonitorEvent): PlacementSnapshot {
  const explicit = evt.limitOrderPlacementDetails;
  let base = explicit?.baseAmount;
  let quote = explicit?.quoteAmount;
  let price = explicit?.price;

  const metadata = (evt.metadata as Record<string, unknown> | null) ?? null;
  const metaBase = pickPlacementNumber(metadata, [
    'remainingBaseAmount',
    'remaining_base_amount',
    'originalBaseAmount',
    'original_base_amount',
    'baseAmount',
    'base_amount',
  ]);
  const metaQuote = pickPlacementNumber(metadata, [
    'remainingQuoteAmount',
    'remaining_quote_amount',
    'originalQuoteAmount',
    'original_quote_amount',
    'quoteAmount',
    'quote_amount',
  ]);
  const metaPrice = pickPlacementNumber(metadata, [
    'priceTarget',
    'targetPrice',
    'target_price',
    'limitPrice',
    'limit_price',
    'price',
  ]);

  if ((base == null || base <= 0) && metaBase != null && metaBase > 0) {
    base = metaBase;
  }
  if ((quote == null || quote <= 0) && metaQuote != null && metaQuote > 0) {
    quote = metaQuote;
  }

  const metaUsdPrice = pickPlacementNumber(metadata, [
    'placementUsdPrice',
    'placement_usd_price',
    'usdBasePrice',
    'usd_base_price',
  ]);
  const metaQuoteUsdPrice = pickPlacementNumber(metadata, [
    'counterpartUsdPrice',
    'counterpart_usd_price',
    'quoteUsdPrice',
    'quote_usd_price',
    'counterpartUsd',
  ]);
  const metaUsdValue =
    pickPlacementNumber(metadata, [
      'placementUsdValue',
      'placement_usd_value',
      'usdFromCounterpart',
      'usd_from_counterpart',
      'usdValue',
      'usd_value',
      'usdNotional',
      'usd_notional',
    ]) ?? null;

  if ((price == null || price <= 0) && base != null && base > 0 && quote != null && quote > 0) {
    price = quote / base;
  }
  if ((price == null || price <= 0) && metaPrice != null && metaPrice > 0) {
    price = metaPrice;
  }

  const normalizedBase =
    base != null && Number.isFinite(base) && base > 0 ? Number(base) : undefined;
  const normalizedQuote =
    quote != null && Number.isFinite(quote) && quote > 0 ? Number(quote) : undefined;

  const quoteUsdPrice =
    metaQuoteUsdPrice != null && metaQuoteUsdPrice > 0 ? metaQuoteUsdPrice : undefined;
  const usdValue =
    metaUsdValue != null && metaUsdValue > 0
      ? metaUsdValue
      : normalizedQuote && quoteUsdPrice
        ? normalizedQuote * quoteUsdPrice
        : undefined;
  const usdPrice =
    metaUsdPrice != null && metaUsdPrice > 0
      ? metaUsdPrice
      : usdValue != null && normalizedBase
        ? usdValue / normalizedBase
        : normalizedQuote && quoteUsdPrice && normalizedBase
          ? (normalizedQuote * quoteUsdPrice) / normalizedBase
          : undefined;

  const snapshot: PlacementSnapshot = {
    baseAmount: normalizedBase,
    quoteAmount: normalizedQuote,
    price: price != null && Number.isFinite(price) && price > 0 ? Number(price) : undefined,
    usdPrice: usdPrice != null && Number.isFinite(usdPrice) && usdPrice > 0 ? usdPrice : undefined,
    quoteUsdPrice,
    usdValue: usdValue != null && Number.isFinite(usdValue) && usdValue > 0 ? usdValue : undefined,
  };

  if (snapshot.baseAmount == null && snapshot.quoteAmount == null && snapshot.price == null) {
    if (!snapshot.usdPrice && !snapshot.usdValue) {
      return explicit ?? null;
    }
  }

  return snapshot;
}

function deriveDisplayTotal(evt: LiveMonitorEvent): { value: number | null; symbol: string } {
  const placement = resolvePlacementDetails(evt);
  const displayedBase = getDisplayBaseAmount(evt);
  const displayedPrice = getDisplayPrice(evt);
  const displayedQuote = getDisplayQuoteAmount(evt);
  const usdFromEvent =
    evt.usdValue != null && Number.isFinite(Number(evt.usdValue)) && Number(evt.usdValue) > 0
      ? Number(evt.usdValue)
      : null;
  const usdFromPlacement = placement?.usdValue != null ? placement.usdValue : null;
  const usdFromPlacementPrice =
    placement?.usdPrice != null && displayedBase != null && displayedBase > 0
      ? placement.usdPrice * displayedBase
      : null;
  const usdFromQuotePricing =
    placement?.quoteUsdPrice != null && displayedQuote != null && displayedQuote > 0
      ? placement.quoteUsdPrice * displayedQuote
      : null;
  const usd = usdFromEvent ?? usdFromPlacement ?? usdFromPlacementPrice ?? usdFromQuotePricing;
  if (usd != null) return { value: usd, symbol: '$' };
  const q = (evt.quoteSymbol || '').toUpperCase();
  const isUsdStable = STABLE_QUOTES.has(q);
  const isEur = q === 'EUR';
  if (isUsdStable) {
    if (displayedQuote != null && displayedQuote > 0) return { value: displayedQuote, symbol: '$' };
    if (displayedPrice != null && displayedBase != null && displayedBase > 0)
      return { value: displayedPrice * displayedBase, symbol: '$' };
  }
  if (isEur) {
    if (displayedQuote != null && displayedQuote > 0) return { value: displayedQuote, symbol: '€' };
    if (displayedPrice != null && displayedBase != null && displayedBase > 0)
      return { value: displayedPrice * displayedBase, symbol: '€' };
  }
  const quoteValue = displayedQuote ?? placement?.quoteAmount ?? null;
  if (quoteValue != null && placement?.quoteUsdPrice != null && placement.quoteUsdPrice > 0) {
    return { value: quoteValue * placement.quoteUsdPrice, symbol: '$' };
  }
  return { value: null, symbol: '$' };
}

function getDisplayBaseAmount(evt: LiveMonitorEvent): number | null {
  const raw =
    evt.baseAmount != null && Number.isFinite(Number(evt.baseAmount))
      ? Number(evt.baseAmount)
      : null;
  if (raw && raw > 0) return raw;
  const placement = resolvePlacementDetails(evt);
  if (!placement) return raw;
  const value = placement.baseAmount;
  if (value == null) return raw;
  return Number.isFinite(Number(value)) ? Number(value) : raw;
}

function getDisplayQuoteAmount(evt: LiveMonitorEvent): number | null {
  const raw =
    evt.quoteAmount != null && Number.isFinite(Number(evt.quoteAmount))
      ? Number(evt.quoteAmount)
      : null;
  if (raw && raw > 0) return raw;
  const placement = resolvePlacementDetails(evt);
  if (!placement) return raw;
  const value = placement.quoteAmount;
  if (value == null) return raw;
  return Number.isFinite(Number(value)) ? Number(value) : raw;
}

function getDisplayPrice(evt: LiveMonitorEvent): number | null {
  const raw = evt.price != null && Number.isFinite(Number(evt.price)) ? Number(evt.price) : null;
  if (raw && raw > 0) return raw;
  const placement = resolvePlacementDetails(evt);
  if (!placement) return raw;
  const value = placement.price;
  if (value == null) return raw;
  return Number.isFinite(Number(value)) ? Number(value) : raw;
}

function formatAbsoluteLocal(iso: string): string {
  const date = toDate(iso);
  if (!date) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

function getMetadataAction(evt: LiveMonitorEvent): string | null {
  const meta = evt.metadata as Record<string, unknown> | null | undefined;
  if (!meta) return null;
  const raw = meta.action ?? meta.status ?? meta.state;
  if (typeof raw === 'string') return raw.toLowerCase();
  return null;
}

function getLifecycleState(evt: LiveMonitorEvent): string | null {
  const meta = evt.metadata as Record<string, unknown> | null | undefined;
  if (!meta) return null;
  const raw = meta.lifecycleEvent ?? meta.lifecycle_event ?? meta.lifecycle ?? null;
  if (typeof raw === 'string' && raw.length) return raw.toLowerCase();
  return null;
}

function isLikelyLimitPlacement(evt: LiveMonitorEvent, metaAction: string | null): boolean {
  if (evt.linkedLimitOrderPlacement) return true;
  if (evt.linkedLimitOrder || evt.linkedLimitOrderFill) return false;
  const placement = resolvePlacementDetails(evt);
  const hasPlacementSnapshot = Boolean(
    placement &&
      (placement.baseAmount ||
        placement.quoteAmount ||
        placement.price ||
        placement.usdPrice ||
        placement.usdValue),
  );
  if (!hasPlacementSnapshot) return false;
  if (metaAction === 'open' || metaAction === 'placed') return true;
  if (metaAction === 'updated') {
    const baseAmount = toFiniteNumber(evt.baseAmount);
    const quoteAmount = toFiniteNumber(evt.quoteAmount);
    const baseIsZero = baseAmount == null || baseAmount <= 0;
    const quoteIsZero = quoteAmount == null || quoteAmount <= 0;
    const lifecycle = getLifecycleState(evt);
    if (
      baseIsZero &&
      quoteIsZero &&
      (!lifecycle || lifecycle === 'resting' || lifecycle === 'created')
    ) {
      return true;
    }
  }
  return false;
}

function actionLabel(evt: LiveMonitorEvent) {
  const k = (evt.kind || '').toLowerCase();
  const metaAction = getMetadataAction(evt);
  const venuePretty = prettyVenueLabel(evt.venue);
  if (isLikelyLimitPlacement(evt, metaAction))
    return `${(evt.side || '').toUpperCase()} (LIMIT PLACED)`.trim();
  if (evt.linkedLimitOrder || evt.linkedLimitOrderFill)
    return `${(evt.side || '').toUpperCase()} (LIMIT FILL)`.trim();
  if (evt.linkedDca) return `${(evt.side || '').toUpperCase()} (DCA FILL)`.trim();
  if (k.includes('limit')) {
    let base = 'LIMIT ORDER';
    if (metaAction === 'open' || metaAction === 'placed') base = 'LO PLACED';
    else if (metaAction === 'closed') base = 'LO CLOSED';
    else if (metaAction === 'updated') base = 'LO UPDATE';
    const side = evt.side ? ` (${evt.side.toUpperCase()})` : '';
    return `${base}${side}`;
  }
  if (k.includes('dca')) {
    let base = 'DCA ORDER';
    if (metaAction === 'open') base = 'DCA PLACED';
    else if (metaAction === 'closed') base = 'DCA CLOSED';
    else if (metaAction === 'updated') base = 'DCA UPDATE';
    return `${base}${evt.side ? ` (${evt.side.toUpperCase()})` : ''}`.trim();
  }
  if (k.includes('swap') || k.includes('trade')) {
    const sideLabel = (evt.side || 'TRADE').toUpperCase();
    return venuePretty ? `${sideLabel} (${venuePretty})` : sideLabel;
  }
  return (evt.kind || 'EVENT').toUpperCase();
}

function actionTooltipContent(evt: LiveMonitorEvent) {
  const meta = (evt.metadata as Record<string, unknown> | null) ?? null;
  const actionState = getMetadataAction(evt);
  const planId = evt.linkedPlanId ?? (evt as any)?.planId ?? null;
  const limitId =
    Array.isArray(evt.linkedLimitOrderIds) && evt.linkedLimitOrderIds.length > 0
      ? evt.linkedLimitOrderIds[0]
      : (evt.externalId ?? null);
  const venueBadges = resolveVenueBadges(evt);
  const venueLabel = venueBadges.length
    ? venueBadges.map((badge) => badge.label).join(' · ')
    : prettyVenueLabel(evt.venue);

  const displayBaseAmount = getDisplayBaseAmount(evt);
  const placement = resolvePlacementDetails(evt);
  const placementPrice = getDisplayPrice(evt);
  const total = deriveDisplayTotal(evt);
  const derivedUsdPrice =
    total.value != null && displayBaseAmount != null && displayBaseAmount > 0
      ? total.value / Math.max(displayBaseAmount, 1e-12)
      : null;
  const quoteSymbolUpper = (evt.quoteSymbol || '').toUpperCase();
  const priceValue =
    placement?.usdPrice ??
    (total.symbol === '$' && derivedUsdPrice != null ? derivedUsdPrice : placementPrice);
  let priceSymbol =
    placement?.usdPrice != null || (total.symbol === '$' && derivedUsdPrice != null) ? '$' : '';
  if (!priceSymbol && quoteSymbolUpper === 'EUR') priceSymbol = '€';
  else if (!priceSymbol && STABLE_QUOTES.has(quoteSymbolUpper)) priceSymbol = '$';
  else if (!priceSymbol) priceSymbol = quoteSymbolUpper;
  const totalDisplay = total.value != null ? formatWithSymbol(total.value, total.symbol) : '—';
  const priceDisplay = priceValue != null ? formatWithSymbol(priceValue, priceSymbol) : '—';
  let marketLink = evt.tradeUrl ?? evt.marketUrl ?? null;
  if (!marketLink) {
    const venue = (evt.venue || '').toLowerCase();
    const base = (evt.baseSymbol || '').toUpperCase();
    const quote = (evt.quoteSymbol || '').toUpperCase();
    if (venue.includes('bitvavo')) {
      const m = `${base || 'NOS'}-${quote || 'EUR'}`;
      marketLink = `https://bitvavo.com/en/trade/${m}`;
    } else if (venue.includes('gate')) {
      const p = `${base || 'NOS'}_${quote || 'USDT'}`;
      marketLink = `https://www.gate.io/trade/${p}`;
    } else if (venue.includes('mexc')) {
      const p = `${base || 'NOS'}_${quote || 'USDT'}`;
      marketLink = `https://www.mexc.com/exchange/${p}`;
    } else if (venue.includes('cryptocom') || venue.includes('crypto.com') || venue.includes('cdc')) {
      const p = `${base || 'NOS'}_${quote || 'USDT'}`;
      marketLink = `https://crypto.com/exchange/trade/spot/${p}`;
    }
  }

  return (
    <div className="space-y-1 max-w-[240px]">
      <div className="font-semibold text-foreground leading-tight whitespace-normal">
        {actionLabel(evt)}
      </div>
      {evt.narrative && (
        <p className="text-[10px] text-muted-foreground leading-snug whitespace-normal">
          {evt.narrative}
        </p>
      )}
      <dl className="grid grid-cols-[auto_auto] gap-x-2 gap-y-1 text-[10px] leading-tight">
        <dt className="uppercase text-muted-foreground">Side</dt>
        <dd className="text-foreground">{evt.side?.toUpperCase?.() ?? '—'}</dd>
        <dt className="uppercase text-muted-foreground">Base</dt>
        <dd className="text-foreground">
          {formatCompact(displayBaseAmount)} {evt.baseSymbol ?? ''}
        </dd>
        <dt className="uppercase text-muted-foreground">Price</dt>
        <dd className="text-foreground">{priceDisplay}</dd>
        <dt className="uppercase text-muted-foreground">Total</dt>
        <dd className="text-foreground">{totalDisplay}</dd>
        {venueLabel && (
          <>
            <dt className="uppercase text-muted-foreground">Venue</dt>
            <dd className="text-foreground">{venueLabel}</dd>
          </>
        )}
        {marketLink && (
          <>
            <dt className="uppercase text-muted-foreground">Market</dt>
            <dd className="text-foreground break-all">
              <a
                className="text-primary hover:underline"
                href={marketLink}
                target="_blank"
                rel="noreferrer"
              >
                Open
              </a>
            </dd>
          </>
        )}
        {actionState && (
          <>
            <dt className="uppercase text-muted-foreground">State</dt>
            <dd className="text-foreground">{actionState.toUpperCase()}</dd>
          </>
        )}
        {planId && (
          <>
            <dt className="uppercase text-muted-foreground">Plan</dt>
            <dd className="text-foreground break-all">{planId}</dd>
          </>
        )}
        {limitId &&
          (evt.linkedLimitOrder || evt.linkedLimitOrderFill || evt.linkedLimitOrderPlacement) && (
            <>
              <dt className="uppercase text-muted-foreground">Order</dt>
              <dd className="text-foreground break-all">{limitId}</dd>
            </>
          )}
        <dt className="uppercase text-muted-foreground">Tx</dt>
        <dd className="text-foreground break-all">{evt.txHash ?? 'No on-chain tx'}</dd>
      </dl>
    </div>
  );
}

function resolveVenueBadges(evt: LiveMonitorEvent): VenueBadge[] {
  const venueHint = evt.venue?.toLowerCase?.() ?? '';
  const metadata = evt.metadata as Record<string, unknown> | null;
  const linkedKinds = Array.isArray(evt.linkedOrderKinds)
    ? evt.linkedOrderKinds.map((k) => k.toLowerCase())
    : [];
  const metaSource = typeof metadata?.source === 'string' ? metadata.source.toLowerCase() : '';
  const kindLabel = (evt.kind ?? '').toLowerCase();

  const executedViaRaw =
    metadata && typeof metadata.executedVia === 'object'
      ? (metadata.executedVia as Record<string, unknown>)
      : null;
  const executionVenue =
    executedViaRaw && typeof executedViaRaw.executionVenue === 'string'
      ? executedViaRaw.executionVenue.toLowerCase()
      : null;
  const executedOnRaydium = Boolean(
    (executedViaRaw?.raydium as boolean | undefined) ||
      (executedViaRaw?.raydiumSwap as boolean | undefined) ||
      executionVenue === 'raydium',
  );

  const badges: VenueBadge[] = [];

  const isJupiterContext =
    evt.linkedLimitOrder ||
    evt.linkedLimitOrderFill ||
    evt.linkedLimitOrderPlacement ||
    evt.linkedDca ||
    linkedKinds.includes('limit_order') ||
    linkedKinds.includes('dca') ||
    venueHint.includes('jupiter') ||
    metaSource.includes('jupiter') ||
    kindLabel.includes('limit') ||
    kindLabel.includes('dca');

  if (isJupiterContext) {
    badges.push({ slug: 'jupiter', icon: '/jupiter.svg', label: 'Jupiter' });
    if (executedOnRaydium) {
      badges.push({ slug: 'raydium', icon: '/raydium.svg', label: 'Raydium' });
    }
    return badges;
  }

  const gateSignals =
    venueHint.includes('gate') ||
    metaSource.includes('gate') ||
    (evt.marketUrl ?? '').includes('gate.io') ||
    (evt.tradeUrl ?? '').includes('gate.io');
  if (gateSignals) {
    badges.push({ slug: 'gate', icon: '/gate-io.svg', label: 'Gate.io' });
    return badges;
  }

  const mexcSignals =
    venueHint.includes('mexc') ||
    metaSource.includes('mexc') ||
    (evt.marketUrl ?? '').toLowerCase().includes('mexc.com') ||
    (evt.tradeUrl ?? '').toLowerCase().includes('mexc.com');
  if (mexcSignals) {
    badges.push({ slug: 'mexc', icon: '/mexc.svg', label: 'MEXC' });
    return badges;
  }

  const cryptocomSignals =
    venueHint.includes('cryptocom') ||
    venueHint.includes('crypto.com') ||
    venueHint.includes('cdc') ||
    metaSource.includes('cryptocom') ||
    metaSource.includes('crypto.com') ||
    metaSource.includes('cdc') ||
    (evt.marketUrl ?? '').toLowerCase().includes('crypto.com') ||
    (evt.tradeUrl ?? '').toLowerCase().includes('crypto.com');
  if (cryptocomSignals) {
    badges.push({ slug: 'cryptocom', icon: '/cryptocom.svg', label: 'CDC' });
    return badges;
  }

  const bitvavoSignals =
    venueHint.includes('bitvavo') ||
    metaSource.includes('bitvavo') ||
    (evt.marketUrl ?? '').toLowerCase().includes('bitvavo.com') ||
    (evt.tradeUrl ?? '').toLowerCase().includes('bitvavo.com');
  if (bitvavoSignals) {
    badges.push({ slug: 'bitvavo', icon: '/bitvavo.svg', label: 'Bitvavo' });
    return badges;
  }

  const krakenSignals =
    venueHint.includes('kraken') ||
    metaSource.includes('kraken') ||
    (evt.marketUrl ?? '').toLowerCase().includes('kraken.com') ||
    (evt.tradeUrl ?? '').toLowerCase().includes('kraken.com');
  if (krakenSignals) {
    badges.push({ slug: 'kraken', icon: '/kraken.svg', label: 'Kraken' });
    return badges;
  }

  if (venueHint.includes('raydium') || metaSource.includes('raydium')) {
    badges.push({ slug: 'raydium', icon: '/raydium.svg', label: 'Raydium' });
    return badges;
  }

  badges.push({
    slug: venueHint || 'raydium',
    icon: venueHint.includes('bitvavo')
      ? '/bitvavo.svg'
      : venueHint.includes('kraken')
        ? '/kraken.svg'
        : venueHint.includes('cryptocom') || venueHint.includes('crypto.com') || venueHint.includes('cdc')
          ? '/cryptocom.svg'
          : '/raydium.svg',
    label: prettyVenueLabel(evt.venue ?? 'Raydium'),
  });
  return badges;
}

function Row({
  index,
  style,
  data,
}: {
  index: number;
  style: React.CSSProperties;
  data: {
    items: LiveMonitorEvent[];
    onSelect: (i: number) => void;
    selected: number | null;
    showExactTime: boolean;
    nowMs: number;
    isMobile: boolean;
    showIdColumn: boolean;
  };
}) {
  const evt = data.items[index];
  const isBuy = evt.side === 'buy';
  const isSell = evt.side === 'sell';
  const pair = `${evt.baseSymbol ?? 'BASE'}/${evt.quoteSymbol ?? 'QUOTE'}`;
  const selected = data.selected === index;
  const total = deriveDisplayTotal(evt);
  const displayBaseAmount = getDisplayBaseAmount(evt);
  const placement = resolvePlacementDetails(evt);
  const displayPrice = getDisplayPrice(evt);
  const derivedUsdPrice =
    total.value != null && displayBaseAmount != null && displayBaseAmount > 0
      ? total.value / Math.max(displayBaseAmount, 1e-12)
      : null;
  const quoteSymbolUpper = (evt.quoteSymbol || '').toUpperCase();
  const priceValue =
    placement?.usdPrice ??
    (total.symbol === '$' && derivedUsdPrice != null ? derivedUsdPrice : displayPrice);
  let priceSymbol =
    placement?.usdPrice != null || (total.symbol === '$' && derivedUsdPrice != null) ? '$' : '';
  if (!priceSymbol && quoteSymbolUpper === 'EUR') priceSymbol = '€';
  else if (!priceSymbol && STABLE_QUOTES.has(quoteSymbolUpper)) priceSymbol = '$';
  else if (!priceSymbol) priceSymbol = quoteSymbolUpper;
  const totalDisplay = total.value != null ? formatWithSymbol(total.value, total.symbol) : '—';
  const priceDisplay = priceValue != null ? formatWithSymbol(priceValue, priceSymbol) : '—';
  const overlayUsdNotional =
    total.symbol === '$'
      ? total.value
      : (placement?.usdValue ??
        (placement?.usdPrice && displayBaseAmount != null
          ? placement.usdPrice * displayBaseAmount
          : null));
  const normalizedUsd = overlayUsdNotional != null ? Number(overlayUsdNotional) : 0;
  const usd = Number.isFinite(normalizedUsd) ? normalizedUsd : 0;
  const proportion = Math.min(1, usd / FILL_CAP_USD);
  const overlayColor = isBuy
    ? 'rgba(16,185,129,0.25)'
    : isSell
      ? 'rgba(239,68,68,0.25)'
      : 'transparent';
  const venueBadges = resolveVenueBadges(evt);
  const venueLabel = venueBadges.length
    ? venueBadges.map((badge) => badge.label).join(' · ')
    : prettyVenueLabel(evt.venue);
  const actionText = actionLabel(evt);
  const planLinkId = evt.linkedPlanId ?? (evt as any)?.planId ?? null;
  const kindLower = (evt.kind || '').toLowerCase();
  const limitContext =
    evt.linkedLimitOrder ||
    evt.linkedLimitOrderFill ||
    evt.linkedLimitOrderPlacement ||
    kindLower.includes('limit');
  const planType: PlanType | null = planLinkId
    ? ((evt.planType as PlanType | undefined) ?? (limitContext ? 'limit' : 'dca'))
    : null;
  const { openPlan } = usePlanModal();
  const linkHref = evt.txHash
    ? `https://solscan.io/tx/${evt.txHash}`
    : typeof evt.tradeUrl === 'string' && evt.tradeUrl
      ? evt.tradeUrl
      : typeof evt.marketUrl === 'string' && evt.marketUrl
        ? evt.marketUrl
        : null;
  const linkTitle = evt.txHash
    ? 'View transaction on Solscan'
    : linkHref
      ? `Open on ${venueBadges[0]?.label ?? venueLabel}`
      : '';
  const desktopGrid = data.showIdColumn ? DESKTOP_GRID_WITH_ID : DESKTOP_GRID_NO_ID;
  const mobileGrid = data.showIdColumn ? MOBILE_GRID_WITH_ID : MOBILE_GRID;
  if (data.isMobile) {
    return (
      <div
        style={style}
        className={cn(
          'relative grid items-center gap-1 px-1.5 text-[11px] font-mono border-b border-border/40 sm:px-2',
          mobileGrid,
          selected ? 'ring-1 ring-primary/40' : index % 2 === 0 ? 'bg-background' : 'bg-card',
        )}
        onClick={() => data.onSelect(index)}
      >
        <div
          className="pointer-events-none absolute left-0 top-0 h-full"
          style={{ width: `${(proportion * 100).toFixed(2)}%`, background: overlayColor }}
        />
        <span
          className={cn(
            'z-[1] inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-semibold',
            isBuy
              ? 'bg-emerald-500/15 text-emerald-700'
              : isSell
                ? 'bg-red-500/15 text-red-700'
                : 'bg-muted text-muted-foreground',
          )}
        >
          {isBuy ? 'B' : isSell ? 'S' : '·'}
        </span>
        {data.showIdColumn && (
          <span className="z-[1] text-right text-[10px] text-muted-foreground truncate">
            {String(evt.id)}
          </span>
        )}
        <span
          className="z-[1] text-left tabular-nums text-muted-foreground truncate"
          title={formatAbsoluteLocal(evt.occurredAt)}
        >
          {data.showExactTime
            ? formatAbsoluteLocal(evt.occurredAt)
            : formatRelativeNoAgo(evt.occurredAt, data.nowMs)}
        </span>
        <span className="z-[1] flex items-center gap-1 truncate text-left text-foreground">
          {venueBadges.map((badge) => (
            <Image
              key={`${badge.slug}-venue-mobile`}
              src={badge.icon}
              alt={`${badge.label} logo`}
              width={14}
              height={14}
              className="h-3.5 w-3.5 flex-shrink-0"
            />
          ))}
          <span className="truncate max-[360px]:hidden">{venueLabel}</span>
        </span>
        <span className="z-[1] text-right font-medium">{totalDisplay}</span>
        <span className="z-[1] text-right text-muted-foreground">{priceDisplay}</span>
        {planLinkId && planType ? (
          <button
            type="button"
            className="z-[1] justify-self-end text-primary underline decoration-dotted hover:text-primary/80"
            onClick={(e) => {
              e.stopPropagation();
              openPlan({ planType, planId: String(planLinkId) });
            }}
          >
            plan
          </button>
        ) : linkHref ? (
          <a
            className="z-[1] justify-self-end text-muted-foreground hover:text-primary"
            href={linkHref}
            target="_blank"
            rel="noreferrer"
            title={linkTitle}
            onClick={(e) => e.stopPropagation()}
          >
            <ExternalLink className="h-3 w-3" />
          </a>
        ) : (
          <span className="z-[1]" />
        )}
      </div>
    );
  }
  return (
    <div
      style={style}
      className={cn(
        'relative grid items-center gap-2 px-2 text-[11px] font-mono border-b border-border/40',
        desktopGrid,
        selected ? 'ring-1 ring-primary/40' : index % 2 === 0 ? 'bg-background' : 'bg-card',
      )}
      onClick={() => data.onSelect(index)}
    >
      {/* proportional overlay */}
      <div
        className="pointer-events-none absolute left-0 top-0 h-full"
        style={{ width: `${(proportion * 100).toFixed(2)}%`, background: overlayColor }}
      />
      <span
        className="z-[1] text-left text-muted-foreground tabular-nums"
        title={formatAbsoluteLocal(evt.occurredAt)}
      >
        {data.showExactTime
          ? formatAbsoluteLocal(evt.occurredAt)
          : formatRelativeNoAgo(evt.occurredAt, data.nowMs)}
      </span>
      {data.showIdColumn && (
        <span className="z-[1] text-left font-mono text-[10px] text-muted-foreground">
          {String(evt.id)}
        </span>
      )}
      <Tooltip content={actionTooltipContent(evt)}>
        <span
          className={cn(
            'z-[1] rounded px-2 font-semibold whitespace-nowrap overflow-hidden text-ellipsis text-center',
            isBuy ? 'text-emerald-600' : isSell ? 'text-red-600' : 'text-muted-foreground',
          )}
        >
          {actionText}
        </span>
      </Tooltip>
      <span className="z-[1] flex items-center justify-center">
        <Tooltip content={`${venueLabel} source`}>
          <span className="inline-flex items-center gap-1">
            {venueBadges.map((badge) => (
              <span key={badge.slug} className="inline-flex h-4 w-4 items-center justify-center">
                <Image
                  src={badge.icon}
                  alt={`${badge.label} logo`}
                  width={16}
                  height={16}
                  className="h-4 w-4"
                />
              </span>
            ))}
          </span>
        </Tooltip>
      </span>
      <span className="z-[1] text-left text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
        {venueLabel}
      </span>
      <span className="z-[1] text-right">{formatCompact(displayBaseAmount)}</span>
      <span className="z-[1] text-center">@</span>
      <span className="z-[1] text-right text-muted-foreground">{priceDisplay}</span>
      <span className="z-[1] text-right font-medium">{totalDisplay}</span>
      <span className="z-[1] min-w-0 truncate text-muted-foreground">{pair}</span>
      {planLinkId && planType ? (
        <button
          type="button"
          className="z-[1] text-primary underline decoration-dotted hover:text-primary/80 text-right"
          onClick={(e) => {
            e.stopPropagation();
            openPlan({ planType, planId: String(planLinkId) });
          }}
        >
          plan
        </button>
      ) : linkHref ? (
        <a
          className="z-[1] text-muted-foreground hover:text-primary text-right"
          href={linkHref}
          target="_blank"
          rel="noreferrer"
          title={linkTitle}
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3 inline" />
        </a>
      ) : (
        <span className="z-[1]" />
      )}
    </div>
  );
}

const DESKTOP_GRID_WITH_ID =
  'grid-cols-[140px_90px_220px_40px_140px_120px_24px_140px_140px_200px_56px]';
const DESKTOP_GRID_NO_ID = 'grid-cols-[140px_220px_40px_140px_120px_24px_140px_140px_200px_56px]';

const MOBILE_GRID =
  'grid-cols-[28px_minmax(64px,1fr)_minmax(94px,1.1fr)_minmax(70px,0.9fr)_minmax(70px,0.9fr)_20px]';
const MOBILE_GRID_WITH_ID =
  'grid-cols-[28px_minmax(50px,0.6fr)_minmax(64px,0.9fr)_minmax(94px,1.1fr)_minmax(70px,0.9fr)_minmax(70px,0.9fr)_minmax(72px,0.8fr)_20px]';

export function LiveFeedVirtualized({
  height = 420,
  forceMobile,
  showInitialSkeleton,
}: {
  height?: number;
  forceMobile?: boolean;
  showInitialSkeleton?: boolean;
}) {
  const isDebug = process.env.NODE_ENV !== 'production';
  const [action, setAction] = useState<'all' | 'buy' | 'sell'>('all');
  const [minUsd, setMinUsd] = useState<number>(0);
  const [pricePresets, setPricePresets] = useState<number[]>([0, 100, 1000, 10000]);
  const [customPreset, setCustomPreset] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [showIdColumn, setShowIdColumn] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [showExactTime, setShowExactTime] = useState(false);
  const [sortBy, setSortBy] = useState<SortKey>('time');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [tick, setTick] = useState(0);
  const skewRef = useRef(0);
  const [isMobile, setIsMobile] = useState(forceMobile || false);
  const [mobileInitialLoading, setMobileInitialLoading] = useState(
    !!forceMobile || !!showInitialSkeleton,
  );
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const settingsButtonRef = useRef<HTMLButtonElement | null>(null);
  const [fallbackEvents, setFallbackEvents] = useState<LiveMonitorEvent[]>([]);
  const hasLoadedRef = useRef(false);
  useEffect(() => {
    if (forceMobile) return;
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => {
      setIsMobile(mq.matches);
    };
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, [forceMobile]);

  useEffect(() => {
    if (!showSettings) return;
    const handleClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (settingsRef.current?.contains(target)) return;
      if (settingsButtonRef.current?.contains(target)) return;
      setShowSettings(false);
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShowSettings(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keyup', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keyup', handleEscape);
    };
  }, [showSettings]);

  useEffect(() => {
    if (!showSearchInput) {
      setSearch('');
    }
  }, [showSearchInput]);

  useEffect(() => {
    setPricePresets((prev) => {
      if (prev.includes(minUsd)) return prev;
      const next = [...prev, minUsd];
      next.sort((a, b) => a - b);
      return next;
    });
  }, [minUsd]);

  const [selectedExchanges, setSelectedExchanges] = useState<MonitorExchangeSelection>(() =>
    buildDefaultExchangeSelection(MONITOR_EXCHANGES),
  );
  const handleExchangeClick = useCallback(
    (id: string, event: React.MouseEvent<HTMLButtonElement>) => {
      const exclusive = event.ctrlKey || event.metaKey;
      setSelectedExchanges((prev) => {
        if (exclusive) {
          const next: MonitorExchangeSelection = {};
          for (const exchange of MONITOR_EXCHANGES) {
            next[exchange.id] = exchange.id === id;
          }
          return next;
        }

        const next = { ...prev, [id]: !prev[id] };
        if (!Object.values(next).some(Boolean)) {
          return prev;
        }
        return next;
      });
    },
    [],
  );
  const handleAddPreset = useCallback(() => {
    const normalized = customPreset.trim();
    if (!normalized.length) return;
    const parsed = parsePresetValue(normalized);
    if (parsed == null) return;
    const value = parsed;
    setPricePresets((prev) => {
      const unique = new Set(prev);
      unique.add(value);
      const next = Array.from(unique).sort((a, b) => a - b);
      return next;
    });
    setMinUsd(value);
    setCustomPreset('');
  }, [customPreset]);

  const handleRemovePreset = useCallback((value: number) => {
    if (value === 0) return;
    setPricePresets((prev) => {
      const next = prev.filter((entry) => entry !== value);
      return next.length ? next : [0];
    });
    setMinUsd((current) => (current === value ? 0 : current));
  }, []);

  const activeVenueSlugs = useMemo(
    () => resolveSelectedVenues(selectedExchanges, MONITOR_EXCHANGES),
    [selectedExchanges],
  );

  const side = useMemo<'buy' | 'sell' | undefined>(
    () => (action === 'all' ? undefined : action),
    [action],
  );

  const listRef = useRef<FixedSizeListRef>(null);
  const isAtTopRef = useRef<boolean>(true);
  const prevTopIdRef = useRef<string | number | null>(null);

  const { events, connected, error, loadingMore } = useMonitorStream({
    idOnlyMode: true,
    bootstrapLimit: 500,
    side,
    venues: activeVenueSlugs.length ? activeVenueSlugs : undefined,
    minUsd: minUsd || undefined,
    debug: isDebug,
  });
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (events.length) {
      hasLoadedRef.current = true;
      setFallbackEvents(events);
    }
  }, [events]);

  useEffect(() => {
    if (mobileInitialLoading && connected && events.length > 0) {
      setMobileInitialLoading(false);
    }
  }, [mobileInitialLoading, connected, events.length]);

  const nowMs = Date.now();
  const [search, setSearch] = useState('');

  const items = useMemo(() => {
    const isRecovering = events.length === 0 && (loadingMore || !connected);
    const source = events.length ? events : isRecovering ? fallbackEvents : [];
    const term = search.trim().toLowerCase();
    if (!term) return source;
    return source.filter((e) => {
      const idStr = String(e.id).toLowerCase();
      if (idStr.includes(term)) return true;
      if ((e.venue || '').toLowerCase().includes(term)) return true;
      if ((e.baseSymbol || '').toLowerCase().includes(term)) return true;
      if ((e.quoteSymbol || '').toLowerCase().includes(term)) return true;
      return false;
    });
  }, [connected, events, fallbackEvents, loadingMore, search]);

  useEffect(() => {
    const topId = items.length ? (items[0]?.id ?? null) : null;
    if (topId == null || topId === prevTopIdRef.current) return;
    prevTopIdRef.current = topId;
    if (isAtTopRef.current) {
      listRef.current?.scrollToItem(0, 'smart');
    }
  }, [items]);

  const handleListScroll = useCallback((props: { scrollOffset: number }) => {
    const { scrollOffset } = props;
    isAtTopRef.current = scrollOffset <= ROW_HEIGHT * 1.5;
  }, []);

  const onSelect = useCallback((i: number) => setSelected(i), []);

  const bootstrapping = !error && !hasLoadedRef.current && events.length === 0;
  const isLoading = bootstrapping || loadingMore;
  const showSkeleton = !hasLoadedRef.current && (isLoading || mobileInitialLoading);

  const desktopGridClass = showIdColumn ? DESKTOP_GRID_WITH_ID : DESKTOP_GRID_NO_ID;
  const mobileGridClass = showIdColumn ? MOBILE_GRID_WITH_ID : MOBILE_GRID;
  const pendingPresetValue = parsePresetValue(customPreset);
  const canAddPreset = pendingPresetValue != null && !pricePresets.includes(pendingPresetValue);
  const headerOffset = isMobile ? 118 : 130;
  const listHeight = Math.max(isMobile ? 420 : 120, height - headerOffset);

  const headerStatus = error
    ? { label: 'Error', tone: 'danger' as const }
    : connected
      ? { label: 'Live', tone: 'success' as const, pulse: true }
      : bootstrapping
        ? { label: 'Syncing', tone: 'warning' as const, pulse: true }
        : { label: 'Connecting', tone: 'warning' as const, pulse: true };

  const controlPillBase =
    'inline-flex h-9 items-center rounded-xl border border-border/40 bg-background/80 px-3 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30';
  const filterPillBase =
    'inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30';

  const headerActions = useMemo(
    () => (
      <div className="flex w-full flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2 py-1 xl:gap-3 xl:py-1.5">
          <div className="order-1 flex shrink-0 flex-wrap items-center gap-2 overflow-x-auto py-1 xl:flex-nowrap xl:overflow-visible">
            {pricePresets.map((value) => {
              const label = formatPresetLabel(value);
              const active = minUsd === value;
              return (
                <button
                  key={`preset-pill-${value}`}
                  type="button"
                  onClick={() => setMinUsd(value)}
                  className={cn(
                    filterPillBase,
                    'whitespace-nowrap',
                    active
                      ? 'border-primary/60 bg-primary/10 text-primary shadow-sm'
                      : 'border-border/40 bg-background/70 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div
            className="order-3 flex w-full min-w-[220px] flex-wrap items-center gap-2 overflow-x-auto py-1 xl:order-2 xl:w-auto xl:flex-1 xl:min-w-[320px] xl:overflow-visible xl:justify-center xl:mx-auto"
            aria-label="Live feed venue filters"
          >
            {MONITOR_EXCHANGES.map((filter) => {
              const checked = !!selectedExchanges[filter.id];
              return (
                <button
                  key={filter.id}
                  type="button"
                  onClick={(event) => handleExchangeClick(filter.id, event)}
                  className={cn(
                    filterPillBase,
                    checked
                      ? 'border-primary/40 bg-primary/10 text-primary shadow-sm'
                      : 'border-border/40 bg-background/60 text-muted-foreground hover:text-foreground',
                  )}
                >
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded border border-border/50 bg-background/80">
                    <Image
                      src={
                        filter.icon ||
                        (filter.id === 'gate'
                          ? '/gate-io.svg'
                          : filter.id === 'mexc'
                            ? '/mexc.svg'
                            : filter.id === 'raydium'
                              ? '/raydium.svg'
                              : filter.id === 'bitvavo'
                                ? '/bitvavo.svg'
                                : '/jupiter.svg')
                      }
                      alt=""
                      width={16}
                      height={16}
                      className="h-4 w-4"
                    />
                  </span>
                  <span className="max-w-[90px] truncate" title={filter.label}>
                    {filter.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="order-2 flex w-full items-center gap-2 justify-start sm:w-auto sm:flex-none sm:justify-end sm:ml-auto xl:order-3 xl:ml-0">
            <CustomDropdown
              options={[
                { value: 'all', label: 'All' },
                { value: 'buy', label: 'Buy' },
                { value: 'sell', label: 'Sell' },
              ]}
              value={action}
              onSelect={(value) => setAction(value as 'all' | 'buy' | 'sell')}
              size="sm"
              variant="ghost"
              triggerClassName={cn(
                controlPillBase,
                'min-w-[110px] justify-between text-[11px] sm:min-w-[130px] sm:text-xs',
              )}
            />
            {showSearchInput && (
              <div className="relative w-full max-w-[220px] sm:w-60">
                <input
                  type="text"
                  value={search}
                  placeholder="Search id / venue / base / quote"
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 w-full rounded-xl border border-border/50 bg-background/70 px-3 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-2 text-[10px] text-muted-foreground transition-colors hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            )}
            <div className="relative">
              <button
                ref={settingsButtonRef}
                type="button"
                onClick={() => setShowSettings((prev) => !prev)}
                className={cn(controlPillBase, 'w-9 justify-center px-0 text-muted-foreground')}
                aria-label="Open live feed settings"
                aria-expanded={showSettings}
              >
                <Settings className="h-4 w-4" />
              </button>
              {showSettings && (
                <div
                  ref={settingsRef}
                  className="absolute top-10 z-30 w-72 max-w-[calc(100vw-2.5rem)] origin-top rounded-lg border border-border/60 bg-background/95 shadow-xl backdrop-blur-sm left-1/2 -translate-x-1/2 sm:left-auto sm:right-0 sm:translate-x-0"
                >
                  <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Feed Settings
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSettings(false)}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                      aria-label="Close settings"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <div className="space-y-4 p-3 text-xs">
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Display
                      </span>
                      <label className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/70 px-2 py-1.5">
                        <span className="font-medium text-foreground">Show ID column</span>
                        <input
                          type="checkbox"
                          checked={showIdColumn}
                          onChange={(e) => setShowIdColumn(e.target.checked)}
                          className="h-3.5 w-3.5 accent-primary"
                        />
                      </label>
                      <label className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/70 px-2 py-1.5">
                        <span className="font-medium text-foreground">Enable search bar</span>
                        <input
                          type="checkbox"
                          checked={showSearchInput}
                          onChange={(e) => setShowSearchInput(e.target.checked)}
                          className="h-3.5 w-3.5 accent-primary"
                        />
                      </label>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Time mode
                      </span>
                      <div className="flex rounded-lg border border-border/60 bg-background/60 p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => setShowExactTime(false)}
                          className={cn(
                            'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-200',
                            !showExactTime
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground hover:bg-background/80',
                          )}
                        >
                          Relative
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowExactTime(true)}
                          className={cn(
                            'flex-1 rounded-md px-2 py-1 text-xs font-medium transition-all duration-200',
                            showExactTime
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground hover:bg-background/80',
                          )}
                        >
                          Absolute
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Price filter
                      </span>
                      <p className="text-[10px] text-muted-foreground">
                        Manage USD thresholds used for the header shortcuts.
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        {pricePresets.map((value) => {
                          const label = formatPresetLabel(value);
                          const active = minUsd === value;
                          return (
                            <div key={`preset-${value}`} className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setMinUsd(value)}
                                className={cn(
                                  'rounded-md border px-2 py-1 text-xs font-medium transition-all duration-200',
                                  active
                                    ? 'border-primary/70 bg-primary text-primary-foreground shadow-sm'
                                    : 'border-border/60 bg-background/70 text-muted-foreground hover:border-border hover:text-foreground',
                                )}
                              >
                                {label}
                              </button>
                              {value !== 0 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemovePreset(value)}
                                  className="inline-flex h-5 w-5 items-center justify-center rounded-md border border-border/60 text-muted-foreground transition-colors hover:border-border hover:text-foreground"
                                  aria-label={`Remove preset ${label}`}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={customPreset}
                          onChange={(e) => setCustomPreset(e.target.value)}
                          placeholder="e.g. 350 or 5k"
                          className="flex-1 rounded-md border border-border/60 bg-background/70 px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-primary/30"
                        />
                        <button
                          type="button"
                          onClick={handleAddPreset}
                          disabled={!canAddPreset}
                          className={cn(
                            'rounded-md px-2 py-1 text-xs font-semibold transition-colors',
                            canAddPreset
                              ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                              : 'cursor-not-allowed bg-muted text-muted-foreground',
                          )}
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    ),
    [
      action,
      canAddPreset,
      customPreset,
      filterPillBase,
      handleAddPreset,
      handleExchangeClick,
      handleRemovePreset,
      minUsd,
      pricePresets,
      search,
      selectedExchanges,
      showExactTime,
      showIdColumn,
      showSearchInput,
      showSettings,
    ],
  );

  return (
    <MonitorWidgetFrame
      title="Live Feed"
      subtitle="Real-time fills across venues"
      icon={<Activity className="h-5 w-5" />}
      status={headerStatus}
      actions={headerActions}
      className="h-full flex flex-col"
      contentClassName="flex flex-1 flex-col gap-2 sm:gap-3 px-2 sm:px-4 py-3 sm:py-4 space-y-0"
    >
      <div className="flex-1 min-h-[420px] overflow-hidden rounded-xl border border-border/50 bg-background shadow-inner sm:min-h-0 sm:rounded-2xl">
        <div className="border-b border-border/60 bg-muted/10 px-2 py-1.5 text-[10px] uppercase tracking-wide text-muted-foreground sm:px-3 sm:py-2">
          <div className={cn('hidden w-full gap-2 md:grid', desktopGridClass)}>
            <button
              className="text-left"
              onClick={() => {
                setSortBy('time');
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
              }}
            >
              Date
            </button>
            {showIdColumn && <span className="text-left">ID</span>}
            <button
              className="text-center"
              onClick={() => {
                setSortBy('action');
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
              }}
            >
              Action
            </button>
            <span className="text-center">Ex.</span>
            <span className="text-left">Venue</span>
            <button
              className="text-right"
              onClick={() => {
                setSortBy('amount');
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
              }}
            >
              Base
            </button>
            <span className="text-center">@</span>
            <button
              className="text-right"
              onClick={() => {
                setSortBy('price');
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
              }}
            >
              Price
            </button>
            <button
              className="text-right"
              onClick={() => {
                setSortBy('amount');
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
              }}
            >
              USD
            </button>
            <button
              className="text-left"
              onClick={() => {
                setSortBy('pair');
                setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
              }}
            >
              Pair
            </button>
            <span className="text-right">Link</span>
          </div>
          <div className={cn('grid items-center gap-1 md:hidden', mobileGridClass)}>
            <span className="text-center">Side</span>
            {showIdColumn && <span className="text-right">ID</span>}
            <span className="text-left">Time</span>
            <span className="text-left">Venue</span>
            <span className="text-right">USD</span>
            <span className="text-right">Price</span>
            <span className="text-right">Link</span>
          </div>
        </div>
        <div className="relative flex-1 min-h-0">
          {error && (
            <div className="px-2 py-1.5 text-[11px] text-red-500 bg-red-50 dark:bg-red-950/20 border-b border-border/40 sm:px-3 sm:py-2">
              {String(error)}
            </div>
          )}
          {showSkeleton ? (
            <div className="absolute inset-0 p-1.5 sm:p-2" aria-busy="true" aria-live="polite">
              <div className="space-y-1">
                {Array.from({ length: Math.max(8, Math.floor(listHeight / ROW_HEIGHT)) }).map(
                  (_, i) => (
                    <div
                      key={i}
                      className={cn(
                        'relative h-[28px] border-b border-border/40',
                        i % 2 === 0 ? 'bg-background' : 'bg-card',
                      )}
                    >
                      <div
                        className={cn(
                          'grid items-center gap-1 px-1.5 h-full md:hidden sm:px-2',
                          mobileGridClass,
                        )}
                      >
                        <div className="flex items-center justify-center">
                          <div className="h-4 w-4 rounded bg-muted animate-pulse" />
                        </div>
                        {showIdColumn && (
                          <div className="justify-self-end h-3 w-10 rounded bg-muted animate-pulse" />
                        )}
                        <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                        <div className="flex items-center gap-1">
                          <div className="h-3 w-3 rounded bg-muted animate-pulse" />
                          <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                        </div>
                        <div className="justify-self-end h-3 w-12 rounded bg-muted animate-pulse" />
                        <div className="justify-self-end h-3 w-12 rounded bg-muted animate-pulse" />
                        <div className="justify-self-end h-3 w-3 rounded bg-muted animate-pulse" />
                      </div>
                      <div
                        className={cn(
                          'hidden md:grid items-center gap-2 px-2 h-full',
                          desktopGridClass,
                        )}
                      >
                        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                        {showIdColumn && (
                          <div className="h-3 w-16 rounded bg-muted animate-pulse" />
                        )}
                        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                        <div className="flex items-center justify-center gap-1">
                          <div className="h-3 w-3 rounded bg-muted animate-pulse" />
                        </div>
                        <div className="h-3 w-20 rounded bg-muted animate-pulse" />
                        <div className="justify-self-end h-3 w-12 rounded bg-muted animate-pulse" />
                        <div className="flex items-center justify-center">
                          <div className="h-3 w-3 rounded bg-muted animate-pulse" />
                        </div>
                        <div className="justify-self-end h-3 w-16 rounded bg-muted animate-pulse" />
                        <div className="justify-self-end h-3 w-16 rounded bg-muted animate-pulse" />
                        <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                        <div className="justify-self-end h-3 w-3 rounded bg-muted animate-pulse" />
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : (
            <List
              ref={listRef}
              height={listHeight}
              width={'100%'}
              className="bg-background"
              itemSize={ROW_HEIGHT}
              itemCount={items.length}
              itemData={{ items, onSelect, selected, showExactTime, nowMs, isMobile, showIdColumn }}
              onScroll={handleListScroll as any}
              itemKey={(index, data) => {
                const evt = data.items[index];
                if (!evt) return `row-${index}`;
                return `${evt.venue || 'unknown'}:${evt.id}`;
              }}
            >
              {Row}
            </List>
          )}
        </div>
      </div>
    </MonitorWidgetFrame>
  );
}
