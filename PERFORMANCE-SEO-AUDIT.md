# zeroplastic.lk — performance & SEO audit

Measured 19 September 2026 against the live site (`https://www.zeroplastic.lk/`),
which runs WordPress with the Elementor page builder.

All figures are real measurements: the homepage HTML was downloaded and parsed,
and every asset it references was fetched and weighed.

---

## Headline finding

The homepage transfers **17.0 MB across 103 requests**.

A reasonable target for a content site is under 1 MB. The page is roughly
**twenty times heavier than it should be**, and on a typical Sri Lankan mobile
connection that is the difference between a page that appears in about a second
and one that takes the better part of a minute.

| Resource | Files | Weight |
|---|---:|---:|
| Images | 42 | 9,599.8 KB |
| CSS | 8 | 4,538.3 KB |
| JavaScript | 53 | 2,937.9 KB |
| HTML document | 1 | 329.8 KB |
| **Total** | **103** | **17.0 MB** |

---

## Performance problems, in priority order

### 1. Images are served at full resolution — 9.6 MB

The single worst offender is a decorative banner:

```
Why-volunteer-for-us-1.png            2,087.9 KB
```

It is a PNG, and it is displayed as a thin strip roughly 1363 × 117 pixels. As a
correctly sized WebP it would be **under 30 KB** — a ~98% saving on one image.

Nine further images exceed 390 KB each.

**Fix:** serve WebP/AVIF, size images to their display dimensions, and let
WordPress emit `srcset` so phones do not download desktop-sized files.

### 2. 4.5 MB of CSS, including one 2.1 MB file loaded twice

```
wp-content/boost-cache/static/7c76450179.min.css    2,112.2 KB  (referenced twice)
```

A 2.1 MB stylesheet is roughly 300× a typical hand-written one. It is Elementor
emitting CSS for every widget it supports, not only the ones this page uses. The
duplicate `<link>` is a straightforward bug.

**Fix:** remove the duplicate reference, and enable Elementor's per-page CSS
(`Elementor → Settings → Performance → Improved CSS Loading`) so each page loads
only the rules it needs.

### 3. 49 render-blocking scripts

The page includes 53 external scripts, of which **49 carry neither `defer` nor
`async`**. Each one blocks parsing: the browser stops building the page, fetches
the script, executes it, and only then continues.

There are also 32 inline `<script>` blocks.

**Fix:** add `defer` to everything that is not needed for first paint, and audit
whether all 53 are still in use — abandoned plugins are a common cause.

### 4. Images lack lazy loading and dimensions

Of 43 images on the homepage:

- **37 have no `loading="lazy"`** — all of them download immediately, even far
  below the fold.
- **30 have no `width`/`height`** — the page visibly jumps as each one arrives,
  which is what Google measures as Cumulative Layout Shift.

---

## SEO problems

### 1. The homepage has no usable `<h1>` — most severe

The page contains exactly one `<h1>`:

```html
<h1 id="link-modal-title">Insert/edit link</h1>
```

That is a hidden WordPress editor dialog that has leaked into the public page.
The homepage therefore has **no heading describing what the organisation does**.
The `<h1>` is one of the strongest on-page ranking signals, and right now it says
"Insert/edit link".

### 2. `robots.txt` throttles crawlers

```
Crawl-delay: 10
```

This asks crawlers to wait ten seconds between pages. Across ~700 URLs that is
close to two hours for a single pass. Google ignores the directive; **Bing and
Yandex honour it**, so indexing on those engines is being deliberately slowed.
There is also **no `Sitemap:` line**, so crawlers are not pointed at the sitemap.

### 3. Almost no structured data

The homepage carries a single JSON-LD block. There is no `Organization`/`NGO`
entity describing ZeroPlastic, and individual posts are not marked up as
articles — so search engines cannot reliably attribute the work, and rich
results (dates, author, logo) are unavailable.

### 4. Eleven images have no `alt` text

An accessibility failure and a lost source of image-search traffic.

### 5. Weak URL slugs

The About page lives at **`/about-5/`** — a WordPress auto-numbered slug from a
page that was recreated several times. It carries no keyword value and looks
untrustworthy in search results.

---

## What was done about it

This repository contains a static front end that addresses all of the above. It
keeps WordPress as the CMS — volunteers publish exactly as they do today — and
pulls that content over the WordPress REST API at build time, so visitors are
served pre-rendered HTML.

### Measured result, same methodology

| | Before | After | Change |
|---|---:|---:|---:|
| HTML document | 329.8 KB | 28.3 KB | −91% |
| CSS | 4,538.3 KB | 7.4 KB | −100% |
| JavaScript | 2,937.9 KB | 0 KB | −100% |
| Images (above the fold) | 9,599.8 KB | 418.9 KB | −96% |
| **Initial page load** | **17.00 MB** | **0.44 MB** | **−97%** |

**38× smaller — 16.55 MB saved on every first visit.**

Lazy-loaded images below the fold add a further 404 KB only if the visitor
scrolls, for a full-page total of 0.84 MB.

### SEO fixes applied

| Problem | Resolution |
|---|---|
| No usable `<h1>` | Every page has exactly one descriptive `<h1>` |
| `Crawl-delay: 10` | Removed; `Sitemap:` directive added |
| Minimal structured data | `NGO`, `WebSite`, `NewsArticle` and `BreadcrumbList` JSON-LD on every relevant page |
| Missing `alt` text | All images carry `alt`; decorative images correctly empty |
| Missing dimensions | Every image has `width`/`height`, eliminating layout shift |
| `/about-5/` slug | Now `/about/`, with a redirect from the old URL |
| No canonicals | Canonical URL on every page |
| Thin social metadata | Full Open Graph and Twitter card tags per page |

All **657 existing post URLs are preserved exactly**, so no accumulated search
ranking is lost.

---

## Still worth doing on the WordPress side

These apply whether or not the static front end is adopted, because WordPress
remains the CMS and still serves the admin, forms and media:

1. **Compress the media library.** The 2 MB banner and its peers are served from
   WordPress. Converting existing uploads to WebP benefits both front ends.
2. **Fix the duplicate stylesheet reference** in the Elementor/Boost cache setup.
3. **Set descriptive `alt` text** on the eleven images missing it.
4. **Replace the `/about-5/` permalink** and add a redirect if WordPress keeps
   serving the public site.
