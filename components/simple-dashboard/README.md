# Simple Dashboard Preview

This directory tracks the exploratory work for the fixed-layout **Simple Dashboard** preview requested for `/simple`. It documents how the existing modular widgets map into the new curated experience and captures the scoped design system decisions that will be applied to the Simple shell only.

## 1. Widget Audit

| Widget (path)                                                                   | Purpose & key metrics                          | Primary data shape / source                                                                     | Common failure modes                                                | Mobile-priority fields                          | Defer to “More”                                                      |
| ------------------------------------------------------------------------------- | ---------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------- |
| `components/widgets/PriceWidgets.tsx`<br/>`PriceInfoWidget`, `PriceChartWidget` | Spot price, absolute/percent deltas, sparkline | `apiClient.getWidgetData('usd')` → `WidgetData` (price, ranges, changes, metadata)              | API throttling, missing `ranges` array, stale `metadata.lastUpdate` | Current price, 1h/24h/7d %Δ, intraday sparkline | Extended timeframe toggle, historical stats (>30d), detailed tooltip |
| `components/widgets/VolumeWidgets.tsx`                                          | Total traded volume, delta, bar/line chart     | `apiClient.getVolumeWidgetData()` → `VolumeWidgetData` (current, changes, ranges, trend series) | Volume API returning `null` segments, slow updates, chart gaps      | 24h volume, 24h change %, market split hint     | Alternate time ranges beyond 24h, raw trade table                    |
| `components/widgets/HoldersWidgets.tsx`                                         | Holder count trajectory, retention hint, chart | `apiClient.getHoldersWidgetData()` → `HoldersWidgetData`                                        | Missing `ranges` for short windows, negative deltas on reorg        | Current holders, 24h/7d %Δ, churn badge         | Detailed buckets, long-range chart                                   |
| `components/widgets/DistributionWidget.tsx`                                     | Wallet tier distribution, concentration        | `apiClient.getDistributionWidgetData()` → buckets by tier                                       | API sometimes returns empty buckets, high latency                   | Top bucket share, whale %                       | Full table of tiers, long tail breakdown                             |
| `components/widgets/SentimentWidget.tsx`                                        | Sentiment index, component breakdown           | `apiClient.getSentimentWidgetData()` → `SentimentWidgetData`                                    | Index unavailable during maintenance, component scores missing      | Headline sentiment score, direction label       | Component weights, historical view                                   |
| `components/widgets/ForecastWidget.tsx`                                         | Modelled price forecast & confidence           | `apiClient.getForecastWidgetData()` → `ForecastWidgetData`                                      | Range request rejected, missing `interval` series                   | Next 7d forecast indicator, confidence note     | Raw forecast table, full chart                                       |
| `components/widgets/VolumeWidgets.tsx` (`VolumeChartWidget`)                    | Historical volume chart with range chips       | `apiClient.getVolumeChartData()` returning `VolumeChartResponse`                                | Range gaps for 1D intervals, timezone skew                          | 1D trend mini-chart, DEX vs CEX merge hint      | Deep comparison view, toggles for MA                                 |
| `components/widgets/PriceWidgets.tsx` (`PriceChartWidget`)                      | Historical price line + range toggle           | `apiClient.getChartData()` returning `ChartResponse`                                            | Interval mismatches, tooltip jitter on huge sets                    | 1D/7D/30D toggle, closing price                 | More granular intervals, indicator overlays                          |
| `components/widgets/RaydiumWidget.tsx`                                          | Raydium liquidity, pool ranking                | `apiClient.getRaydiumWidgetData()`                                                              | Pools API times out, APR nulls                                      | Total liquidity, top pool snapshot              | Full pool table, IL metric                                           |
| `components/widgets/StakersUnstakersWidget.tsx`                                 | Net staking flow, churn                        | `apiClient.getStakersUnstakersWidgetData()`                                                     | Balance snapshot delay, missing `netFlow`                           | Net 24h flow, stakers vs unstakers counts       | Detailed flow table, longer windows                                  |
| `components/widgets/StakingWidget.tsx`                                          | Staked %, APR, reward cadence                  | `apiClient.getStakingWidgetData()`                                                              | APR null when feed lags, reward schedule stale                      | Current APR, staked supply %, next reward       | Historic APR chart, validator list                                   |
| `components/widgets/StakingDetailsWidget.tsx`                                   | Staking payout schedule, forecasts             | `apiClient.getStakingDetailsWidgetData()`                                                       | Forecast endpoint 503 during upgrades                               | Upcoming reward amount & date                   | Payout history table                                                 |
| `components/widgets/BlogWidget.tsx`                                             | News/blog headlines                            | `apiClient.getBlogWidgetData()`                                                                 | Empty feed (rate limit or no recent posts)                          | Latest 1–3 articles, CTA                        | Archive link                                                         |
| `components/widgets/simple/Simple*`                                             | Legacy simple cards (timeless data)            | Same underlying clients as above                                                                | Cached states when reused w/out invalidation                        | Quick metrics (price/holders)                   | Everything else—will be replaced                                     |
| `components/monitor/ProfessionalOrderBook.tsx`                                  | Order book depth, spreads                      | `monitorWsClient` streaming `monitor.events`                                                    | WS auth failures, snapshot drift, high frequency updates            | Spread, top-of-book, DEX/CEX highlight          | Full depth table, live feed                                          |
| `components/monitor/LiveFeedVirtualized.tsx`                                    | Transaction feed                               | `monitorWsClient` streaming `monitor.events`                                                    | Burst events degrade mobile, filter failure                         | Latest 5 events, anomalies                      | Rich filtering, infinite scroll                                      |
| `components/monitor/StatsSummaryCard.tsx`                                       | Aggregated stats (volume, trades)              | `useStatsStream` (WS `monitor.stats`)                                                           | Stats channel offline                                               | 24h volume, transactions, fills                 | Extended stats grid                                                  |

### Notes

- All widget APIs return `{ success, widget, meta }`; when `success === false`, `widget` may be `undefined`. Components must guard and display an error micro-state.
- Widget `metadata.lastUpdate` can be reused for the sticky summary strip to indicate freshness.
- Websocket powered components share the monitor auth flow (`monitorWsClient`); Simple dashboard should reuse providers carefully to avoid interfering with Advanced mode.

## 2. Section Mapping

The Simple Dashboard reorganises the above widgets into curated sections:

- **Snapshot Strip** (sticky on mobile): current price, 24h & 7d change, 24h volume, staked %. Sources: price widget, volume widget, staking widget.
- **Market Snapshot**: price range (high/low), market cap, sparkline. Derived from price widgets + stats API.
- **Trend & Momentum**: primary price chart with range chips (1D/7D/30D) plus recent trade volume blips (volume widget).
- **Liquidity & Volume**: DEX vs CEX mix (volume stats), top Raydium pool snippets, order book spread summary.
- **Holders & Distribution**: holder growth line, churn badges, tier stack (holders + distribution widgets).
- **Staking & Rewards**: staked %, APR, next reward, net flows (staking + stakers/unstakers).
- **Risk & Sentiment**: sentiment index, volatility band (price stats), alert badges when deltas exceed thresholds.
- **News & Updates**: latest blog entries; fallback to “temporarily unavailable”.

Each preset (Overview, Trader Desk, Research) prioritises a subset:

1. **Overview (default)**: Snapshot strip, Market Snapshot, Trend & Momentum (1D), Liquidity preview, Risk & Sentiment, News.
2. **Trader Desk**: Snapshot strip (expanded), Trend & Momentum (1D/7D toggle), Liquidity & Volume (full), Order book summary, Live feed short list.
3. **Research**: Snapshot strip (compact), Holders & Distribution, Staking & Rewards, Risk & Sentiment (emphasis on anomalies), News & Updates.

## 3. Scoped Token Draft

To avoid bleeding styles, Simple mode uses a `simple` namespace via CSS modules & CSS variables.

- **Container width**: reuse the existing monitor width token `var(--monitor-max-width)` (defined in `components/monitor/MonitorLayout.css` equivalent) — measured at 1180px.
- **Spacing scale**: `--simple-space-1: 6px`, `--simple-space-2: 8px`, `--simple-space-3: 12px`, `--simple-space-4: 16px`, `--simple-space-5: 20px`. Vertical gutters follow 6/8/12 rhythm.
- **Radii**: cards `--simple-radius-card: 16px`, chips `12px`.
- **Surface tones**: background `--simple-surface: hsla(var(--muted), 0.35)`, card base `--simple-card: hsla(var(--background), 0.9)`, accent border `hsla(var(--accent), 0.35)`.
- **Typography**: Section titles = `text-[15px] font-semibold` (H3), metric labels = `text-[11px] uppercase`, numeric emphasis = `font-semibold tracking-tight`.
- **Shadows**: base `0 12px 24px -20px rgba(15, 23, 42, 0.45)`, hover lift `0 18px 28px -18px rgba(15, 23, 42, 0.5)`.
- **Density toggle**: data attribute `data-density="compact|comfort"` toggles padding increments (+4px on comfort).

## 4. Interaction & Accessibility Notes

- **Range chips**: 3-state segmented control with 44px minimum hit target, animated underline.
- **Quick-nav** (desktop): sticky subheader with anchor links to each section; ensures keyboard focus order follows document order.
- **Progressive disclosure**: sections include collapsible “More” panels (`<details>` semantics) for lower-priority fields.
- **Loading states**: skeleton placeholders (animated gradient), unique per section.
- **Error micro-state**: bordered notice with retry button if API fails once.
- **Reduced motion**: wrap `framer-motion` animations with media query check and degrade to static transforms.

## 5. Data & State Strategy

- Prefer `react-query` queries shared with existing widgets. Cache keys reused for cost savings but components stay isolated.
- Websocket streams (`useStatsStream`, `useMetricsStream`) mounted lazily via section observers to avoid unnecessary connections offscreen.
- Number formatting centralised via `Intl.NumberFormat` helpers to guarantee thousands separators & explicit currency symbol.

## 6. Compliance Checklist (to be updated post-implementation)

- [ ] Mobile sticky strip verified at 320/360/393/414/430 widths
- [ ] Desktop container width matches monitor token
- [ ] Range chips keyboard-accessible
- [x] Loading/empty/error states for every section
- [ ] Light/dark theme checks
- [ ] Reduced motion respected
- [ ] Advanced dashboard unaffected (no shared class leaks)
- [ ] Metrics mocked (if any) documented

This README will evolve as implementation solidifies. All styles and helpers introduced for Simple mode must live under `components/simple-dashboard` or `app/[locale]/simple` to preserve modularity.
