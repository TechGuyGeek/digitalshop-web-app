# Multilingual SEO routes for marketing pages

## Languages

10 short codes mapped to existing translation files:

| Prefix | Locale file | Language |
|---|---|---|
| `/es/` | es-ES | Spanish |
| `/fr/` | fr-FR | French |
| `/de/` | de-DE | German |
| `/it/` | it-IT | Italian |
| `/pt/` | pt-PT | Portuguese |
| `/nl/` | nl-NL | Dutch |
| `/pl/` | pl-PL | Polish |
| `/ja/` | ja-JP | Japanese |
| `/zh/` | zh-CN | Chinese (Simplified) |
| `/ar/` | ar-AE | Arabic |

English stays at root (`/`, `/about`, `/legal`, `/contact`) — no `/en/` prefix.

## Pages getting language variants

`/`, `/about`, `/legal`, `/contact` only. App routes (profile, basket, shop, etc.) stay single-URL.

Total indexable URLs: 4 English + (4 × 10) = **44 URLs** in sitemap.

## Routing

Add wrapper routes in `src/App.tsx`:

```text
/                → Index (English)
/about           → About
/legal           → Legal
/contact         → Contact
/:lang/          → Index   wrapped in <LocalizedRoute>
/:lang/about     → About   wrapped in <LocalizedRoute>
/:lang/legal     → Legal   wrapped in <LocalizedRoute>
/:lang/contact   → Contact wrapped in <LocalizedRoute>
```

`<LocalizedRoute>` reads `:lang`, validates against the prefix map, calls `setLanguage(localeFile)` once on mount, and renders the page. Invalid prefix → 404.

## Per-page SEO head

Install `react-helmet-async`, wrap app in `<HelmetProvider>`. Each marketing page emits via Helmet:

- `<title>` and `<meta name="description">` — read from translation keys (new keys: `SeoTitle_About`, `SeoDesc_About`, etc., one set per page; existing translator script used to populate all 37 files).
- `<link rel="canonical" href="/{lang-prefix}/about">` — self-canonical per variant (no cross-language consolidation, so each variant ranks for its language).
- `<link rel="alternate" hreflang="es" href="/es/about">` for every language including `x-default` → English.
- `<html lang="...">` updated via Helmet.

Remove existing `<link rel="canonical">` from `index.html` to avoid duplicates (per Helmet integration rules).

## Sitemap

Replace static `public/sitemap.xml` with `scripts/generate-sitemap.ts` (run via `prebuild`). Emits all 44 URLs with `<xhtml:link rel="alternate" hreflang="...">` blocks per entry so Google understands the cluster.

## Static prerendering

Add a `postbuild` step using **puppeteer** + a tiny static server:

1. `vite build` produces `dist/`.
2. `scripts/prerender.mjs` boots `sirv` on `dist/`, launches headless Chromium, visits each of the 44 URLs, waits for the translated content to render (waits until `document.title` differs from the shell title), and writes `dist/{path}/index.html` with the fully-rendered HTML.
3. The existing `cp index.html 404.html` step stays for client-side fallback.

Result: Google receives fully translated HTML on first byte for every variant. App routes keep shipping the SPA shell.

## Language switcher

Existing in-app language picker keeps writing to `localStorage` for app pages. On marketing pages it additionally calls `navigate("/{prefix}/{currentSubpath}")` so the URL reflects the choice and the user lands on the indexable variant.

## Files to create / change

**New**
- `src/components/LocalizedRoute.tsx` — URL-prefix → language sync wrapper.
- `src/lib/i18nRoutes.ts` — prefix↔locale map + helpers (`getLangPrefix`, `getAlternates`).
- `src/components/SeoHead.tsx` — Helmet wrapper that emits title/desc/canonical/hreflang for a given page key.
- `scripts/generate-sitemap.ts` — sitemap generator with hreflang alternates.
- `scripts/prerender.mjs` — puppeteer postbuild prerender.

**Edited**
- `src/main.tsx` — wrap in `<HelmetProvider>`.
- `src/App.tsx` — add `/:lang/...` route variants.
- `src/contexts/LanguageContext.tsx` — expose imperative `setLanguage` usable from URL sync without writing localStorage when the change comes from the URL (avoid clobbering user choice on app pages).
- `src/pages/{Index,About,Legal,Contact}.tsx` — replace `useSeo` with `<SeoHead pageKey="about" />`; ensure all visible copy already uses `t()` (Contact still has hardcoded English — translate via existing AI gateway script).
- `public/index.html` — remove static `<link rel="canonical">`.
- `public/sitemap.xml` — deleted, replaced by generator output.
- `package.json` — add `react-helmet-async`, `puppeteer`, `sirv`, `tsx`; add `prebuild` and `postbuild` scripts.
- `.github/workflows/deploy.yml` — Chromium needs no extra setup on `ubuntu-latest`, but install step gains `npx puppeteer browsers install chrome` before `npm run build`.

## Technical notes

- Hosting: GH Pages serves `dist/{lang}/about/index.html` on direct hits, so refresh and deep links work without SPA fallback for prerendered routes. The 404→index.html fallback still covers app routes.
- `<html lang>` is set both at prerender time (puppeteer captures it) and at runtime via Helmet, so SSR snapshot and hydrated app agree.
- No content-duplication risk: each variant has unique translated body + self-canonical + hreflang cluster.
- App routes (`/profile`, `/basket`, etc.) stay out of the sitemap and remain SPA-only.
