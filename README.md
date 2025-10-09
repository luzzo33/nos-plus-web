# NOS.plus Alpha

![Build status](https://github.com/luzzo33/nos-plus-web/actions/workflows/build.yml/badge.svg?branch=main)

NOS.plus Alpha is the community frontend for the Nosana network. It gathers token analytics, staking tools, and exchange monitoring into one Next.js app that anyone can explore and improve.

## 🌟 Features

- 📡 **Live monitor** streams trades, venue activity, and depth snapshots from Bitvavo, Gate.io, Kraken, MEXC, Raydium, Jupiter, and more. Filter venues, search markets, compare venues side by side, and explore the professional order book view.
- 🧩 **Dashboard** supplies draggable/resizable widgets for price, volume, holders, sentiment, forecast signals, staking metrics, Raydium pools, and the latest blog posts. Layouts persist locally so personal setups stick around.
- 🪙 **Staking analytics** highlight total staked/unstaking balances, momentum across multiple time ranges, distributions, and flow summaries for stakers and unstakers.
- 📈 **Token analytics** include price and volume charts, holder breakdowns, distribution views, rich list comparisons, and forecast widgets shared across dedicated pages.
- 🌐 **Translations** cover English, German, Spanish, Italian, and Chinese with checks that keep localisation files consistent.
- 🔌 **API helpers** pair the `/api/v3` explorer with typed fetchers in `lib/api`, making scripted integrations or custom dashboards easier to build.

## 🛠️ Tech Stack

- Next.js 15 (App Router + React Server Components)
- React 19 with TypeScript strict mode
- Tailwind CSS for styling
- TanStack Query for data fetching
- next-intl for localisation
- Framer Motion and Zustand for polished interactions and state

## 🚀 Getting Started

1. Install dependencies: `npm ci`
2. Copy `.env.example` to `.env.local` and add your values
3. Launch the dev server: `npm run dev` (defaults to `http://localhost:3016`)

Environment variables documented in `.env.example` cover every call made from `lib/api` and `app/api`. Keep real credentials local or in your deployment platform.

## 🧰 Useful Scripts

- `npm run dev` — development server with hot reloading
- `npm run lint` — shared ESLint configuration
- `npm run build:alpha` — staging build output
- `npm run check:translations` — verifies locale coverage

## 🗂️ Project Structure

```
app/          Route groups, layouts, middleware, and API handlers
components/   Monitor, staking, dashboard, and shared UI modules
lib/          API clients, hooks, Zustand stores, and utilities
messages/     Localised copy organised per locale
services/     Streaming helpers and monitor service clients
docs/         Operational notes, design references, and rollout guides
```

## 🤝 Contributing

Read [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow, then open issues or pull requests with ideas, translations, or UI polish. Security reports belong in [SECURITY.md](./SECURITY.md).

## 📄 License

Released under the [MIT License](./LICENSE). Deployments are responsible for their own secrets, infrastructure, and monitoring.

## Summary

NOS.plus Alpha supplies the Nosana community with a transparent analytics and monitoring toolkit that keeps growing through shared effort. If you build something cool on top of it, let everyone know! 🚀
