# zeroplastic.lk — static front end

A fast, SEO-optimised static front end for the
[ZeroPlastic Movement](https://www.zeroplastic.lk/), built with
[Astro](https://astro.build/).

WordPress stays the CMS. Volunteers keep publishing exactly as they do today;
this project pulls that content over the WordPress REST API **at build time** and
renders it to static HTML, so visitors never wait for a PHP render.

## Why

The live WordPress site loads **17.0 MB across 103 requests** on the homepage.
This build loads **0.44 MB** — 38× smaller. Full measurements, and the SEO
defects found alongside them, are in
[`PERFORMANCE-SEO-AUDIT.md`](./PERFORMANCE-SEO-AUDIT.md).

| | Before | After |
|---|---:|---:|
| Initial page load | 17.00 MB | 0.44 MB |
| Requests | 103 | 8 |
| JavaScript shipped | 2.9 MB | **0 bytes** |
| CSS | 4.5 MB | 7.4 KB |

## How it works

```
WordPress (unchanged)          This repo                    Visitor
────────────────────           ─────────                    ───────
wp-admin: volunteers    ──>    npm run build          ──>   static HTML
publish as usual               fetches /wp-json/…           no PHP, no JS
                               renders 718 pages
```

Content is fetched once per build and cached under `.cache/wp`, so a transient
WordPress outage cannot break a deploy.

## Getting started

```bash
npm install
npm run dev      # local dev server at http://localhost:4321
npm run build    # production build into dist/
npm run preview  # serve the built site locally
```

The build fetches all 657 posts from the live WordPress REST API and takes about
100 seconds.

## Project structure

```
src/
  consts.ts              Site config: nav, contact details, impact figures, copy
  lib/
    wp.ts                WordPress REST API client (fetch, cache, normalise)
    schema.ts            JSON-LD builders (NGO, WebSite, NewsArticle, Breadcrumb)
  components/
    SEO.astro            Per-page meta, canonical, OG/Twitter, structured data
    Header.astro         Nav — CSS-only mobile menu, no JavaScript
    Footer.astro
    PostCard.astro       Project card with srcset, dimensions, lazy loading
  layouts/
    BaseLayout.astro
  pages/
    index.astro          Homepage
    about.astro          /about/  (redirected from the old /about-5/)
    problem-statement.astro
    volunteers.astro
    contact.astro
    blog/[...page].astro Paginated project archive
    [slug].astro         657 post pages, at their existing URLs
    rss.xml.ts
    404.astro
public/
  robots.txt             No crawl-delay; points at the sitemap
  favicon.svg
```

## URL compatibility

Existing post URLs are preserved exactly (`/<slug>/`), so none of the 657 posts
lose their accumulated search ranking. Two redirects cover the pages that moved:

| Old | New |
|---|---|
| `/about-5/` | `/about/` |
| `/projects/` | `/blog/` |

## Editing content

- **Posts and projects** — publish in WordPress as usual, then rebuild.
- **Homepage copy, impact figures, contact details, navigation** — edit
  `src/consts.ts`.
- **Forms** (volunteer registration, contact) — still handled by WordPress, so
  submissions continue to arrive in one place.

Because content is pulled at build time, a rebuild is needed for new posts to
appear. The included GitHub Actions workflow rebuilds on every push and on a
daily schedule; add a webhook from WordPress to trigger it on publish if you want
new posts live immediately.

## Deployment

Deployed by **Cloudflare Pages** using its Git integration, which builds directly
from this repository on every push to `main`.

GitHub Actions does **not** deploy — `.github/workflows/ci.yml` only type-checks
and builds, so there are never two systems publishing the site.

### Cloudflare Pages build settings

| Setting | Value |
|---|---|
| Production branch | `main` |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Root directory | `/` |
| Node version | `22` (also pinned in `.nvmrc`) |

### Environment variables

| Variable | Value |
|---|---|
| `SITE_URL` | **Always set this explicitly.** `https://zeroplasticlk.pages.dev` for staging; `https://www.zeroplastic.lk` at go-live. |
| `BASE_PATH` | `/` |

`SITE_URL` controls canonical URLs, the sitemap, RSS links and social card URLs.
Resolution order is `SITE_URL` → `CF_PAGES_URL` (injected by Cloudflare) → the
production domain.

Do not rely on the `CF_PAGES_URL` fallback. Cloudflare sets it to the
*deployment-specific* hostname (`https://<hash>.zeroplasticlk.pages.dev`), not
the stable project alias, so leaving `SITE_URL` unset makes every canonical and
every sitemap entry point at a URL that changes on each deploy. This was
observed on the first two staging deployments and fixed by setting `SITE_URL`
explicitly in the Cloudflare project.

### Staging is not indexable

`robots.txt` is generated at build time from the deployment host. Only
`zeroplastic.lk` and `www.zeroplastic.lk` receive an indexable robots.txt; every
other host — including any `*.pages.dev` URL — is served `Disallow: /`, so a
staging deployment cannot compete with the live site in search results. This
flips automatically once `SITE_URL` is set to the production domain.

### Rebuilding when content changes

Posts are fetched at build time, so a new WordPress post appears only after a
rebuild. Once the Cloudflare project exists, create a **Deploy Hook** in
Cloudflare and call it from WordPress on publish. That is not configured yet.

## Notes

- **No web fonts.** The site uses the system font stack, so there is nothing to
  download before text can paint.
- **No JavaScript.** Not a single script is shipped, including the mobile menu.

### How images are handled

**No images are stored in this repository.** The only binary asset committed is
`public/favicon.svg`; the tracked tree is about 330 KB in total.

Featured images are referenced by absolute URL at build time, pointing at
**`https://i0.wp.com/...`** — the Jetpack Photon CDN, which the WordPress install
already rewrites its uploads to. Each `<img>` carries a `srcset` assembled from
the size variants WordPress generates, plus explicit `width`/`height` and lazy
loading below the fold.

Two consequences worth knowing:

1. Cloudflare Pages serves only HTML and CSS. Image bandwidth stays on Jetpack's
   CDN, which is free and already in use.
2. The rendered site depends on `i0.wp.com` (and behind it the WordPress media
   library) remaining available. If WordPress is ever decommissioned, images must
   be exported into the repository or another CDN first.

Compressing the WordPress media library to WebP remains the single largest
outstanding performance win — see
[`PERFORMANCE-SEO-AUDIT.md`](./PERFORMANCE-SEO-AUDIT.md).

### Build-time dependency on WordPress

The build calls `https://www.zeroplastic.lk/wp-json/wp/v2` and will fail if that
API is unreachable. Locally there is a fallback cache in `.cache/wp`, but that
directory is gitignored and therefore absent on a fresh Cloudflare build — so a
Cloudflare deploy requires the WordPress REST API to be up at build time.
