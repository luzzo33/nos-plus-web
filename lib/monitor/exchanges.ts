export type MonitorExchange = {
  id: string;
  label: string;
  venues: string[];
  icon?: string;
};

export const MONITOR_EXCHANGES: readonly MonitorExchange[] = [
  {
    id: 'jupiter',
    label: 'Jupiter (LO/DCA)',
    venues: ['jupiter-limit-nos', 'jupiter-dca-nos'],
    icon: '/jupiter.svg',
  },
  { id: 'raydium', label: 'Raydium', venues: ['raydium'], icon: '/raydium.svg' },
  { id: 'gate', label: 'Gate.io', venues: ['gate'], icon: '/gate-io.svg' },
  { id: 'mexc', label: 'MEXC', venues: ['mexc'], icon: '/mexc.svg' },
  { id: 'bitvavo', label: 'Bitvavo', venues: ['bitvavo'], icon: '/bitvavo.svg' },
  { id: 'kraken', label: 'Kraken', venues: ['kraken'], icon: '/kraken.svg' },
] as const;

export const LIMIT_WALL_EXCHANGES: readonly MonitorExchange[] = [
  { id: 'jupiter', label: 'Jupiter (LO)', venues: ['jupiter-limit-nos'], icon: '/jupiter.svg' },
  { id: 'gate', label: 'Gate.io', venues: ['gate'], icon: '/gate-io.svg' },
  { id: 'mexc', label: 'MEXC', venues: ['mexc'], icon: '/mexc.svg' },
  { id: 'bitvavo', label: 'Bitvavo', venues: ['bitvavo'], icon: '/bitvavo.svg' },
  { id: 'kraken', label: 'Kraken', venues: ['kraken'], icon: '/kraken.svg' },
] as const;

export type MonitorExchangeSelection = Record<string, boolean>;

export function buildDefaultExchangeSelection(
  exchanges: readonly MonitorExchange[],
): MonitorExchangeSelection {
  return exchanges.reduce<MonitorExchangeSelection>((acc, exchange) => {
    acc[exchange.id] = true;
    return acc;
  }, {});
}

export function selectedVenues(
  selection: MonitorExchangeSelection,
  exchanges: readonly MonitorExchange[],
): string[] {
  return exchanges
    .filter((exchange) => selection[exchange.id])
    .flatMap((exchange) => exchange.venues)
    .map((venue) => venue.toLowerCase());
}

export function selectedExchangeIds(
  selection: MonitorExchangeSelection,
  exchanges: readonly MonitorExchange[],
): string[] {
  return exchanges.filter((exchange) => selection[exchange.id]).map((exchange) => exchange.id);
}
