# SEO mode toggle

The application now switches between staging and production SEO behaviour by reading `process.env.SEO_MODE`.

| variable                               | required | default                 | description                                                  |
| -------------------------------------- | -------- | ----------------------- | ------------------------------------------------------------ |
| `SEO_MODE`                             | yes      | `beta`                  | Switches between `beta` (no indexing) and `live` (full SEO). |
| `SEO_LIVE_BASE_URL`                    | no       | `https://nos.plus`      | Canonical origin for live mode.                              |
| `SEO_BETA_BASE_URL`                    | no       | `https://beta.nos.plus` | Canonical origin for beta/staging.                           |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID`        | no       | –                       | GA4 measurement id. Loaded only when `SEO_MODE=live`.        |
| `NEXT_PUBLIC_GTM_ID`                   | no       | –                       | Google Tag Manager container id. Live mode only.             |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | no       | –                       | Search Console verification token. Live mode only.           |
| `NEXT_PUBLIC_BING_SITE_VERIFICATION`   | no       | –                       | Bing verification token. Live mode only.                     |
| `NEXT_PUBLIC_BAIDU_SITE_VERIFICATION`  | no       | –                       | Baidu verification token. Live mode only.                    |

The values of `SEO_MODE`, `SEO_LIVE_BASE_URL` and `SEO_BETA_BASE_URL` are mirrored into the browser bundle via `next.config.ts` and then reused across server/client helpers.

## Mode behaviour

### Beta (`SEO_MODE=beta`)

- Sets `<meta name="robots" content="noindex, nofollow">` via the metadata API.
- Generates canonical URLs, hreflang alternates, `robots.txt` and `sitemap.xml` pointing at the staging origin.
- Omits Google Analytics, Google Tag Manager, Search Console tokens and JSON‑LD scripts.
- `VisitorTracker` short-circuits on the client so no tracking requests are sent.

### Live (`SEO_MODE=live`)

- Enables full metadata output (titles, descriptions, Open Graph, Twitter cards, hreflang alternates, structured data).
- `robots.txt` allows crawling and `sitemap.xml` enumerates all static locale routes.
- Loads GA4 and/or GTM scripts if IDs are provided and emits the required `<noscript>` fallback.
- Adds Search Console / Bing / Baidu verifications when present.
- Emits organisation/web-site JSON‑LD globally and page specific JSON‑LD for blog articles.

## Editing metadata and translations

Metadata strings live in `messages/<locale>/seo.json`. Add or update the relevant entry and ensure the same keys exist across every locale (`en`, `de`, `es`, `zh`, `it`).

Use the helper below to wire metadata into a page or layout:

```ts
import { createPageMetadata } from '@/lib/seo/metadata';
import { resolveLocale } from '@/lib/seo/config';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return createPageMetadata({
    locale: resolveLocale(locale),
    page: 'your.translation.key',
    pathSegments: ['route', 'segments'],
    overrides: {
      // Optional: { title, description, keywords, ogImage }
    },
  });
}
```

For purely client pages, add a `layout.tsx` in the route directory (see `app/[locale]/analysis/layout.tsx`) and wrap `children` so that the metadata hook runs server‑side.

Blog articles demonstrate how to customise metadata dynamically and attach JSON‑LD by calling:

```ts
getArticleStructuredData({
  locale,
  title,
  description,
  pathSegments,
  publishedAt,
  updatedAt,
  authorName,
  tags,
  image,
});
```

## Local testing

1. Copy `.env.example` to `.env.local` (or use your own) and set:

   ```bash
   SEO_MODE=beta   # or live
   SEO_LIVE_BASE_URL=https://nos.plus
   SEO_BETA_BASE_URL=https://beta.nos.plus
   ```

2. Run `npm install` (or `pnpm install`) once to pull dependencies, then `npm run dev`.
3. Visit a page and inspect the `<head>` output:
   - In beta you should see `noindex,nofollow`, no GA/GTM scripts and the staging canonical.
   - In live you should see the locale alternates, JSON‑LD and, if configured, the analytics scripts.
4. Fetch `http://localhost:3016/robots.txt` and `/sitemap.xml` to verify the behaviour per mode.

To override analytics during QA, leave the `NEXT_PUBLIC_*` IDs undefined—the scripts short-circuit even in live mode.
