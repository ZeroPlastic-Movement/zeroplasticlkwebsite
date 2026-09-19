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

The build is a folder of static files — host it anywhere.

The included workflow (`.github/workflows/deploy.yml`) publishes to GitHub Pages.
Two environment variables control the output URLs:

```bash
SITE_URL=https://www.zeroplastic.lk BASE_PATH=/ npm run build   # custom domain
SITE_URL=https://<org>.github.io BASE_PATH=/zeroplasticlkwebsite npm run build
```

To serve the real domain from this build, point `zeroplastic.lk` at the host and
keep WordPress on a subdomain (for example `admin.zeroplastic.lk`) for the
admin, forms and media library.

## Notes

- **No web fonts.** The site uses the system font stack, so there is nothing to
  download before text can paint.
- **No JavaScript.** Not a single script is shipped, including the mobile menu.
- **Images** are still served from the WordPress media library, using the size
  variants WordPress already generates. Compressing that library to WebP is the
  largest remaining win — see the audit.
