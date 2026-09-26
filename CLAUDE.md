# ZeroPlastic.lk

Static front end for **zeroplastic.lk**. Astro 7 (`output: 'static'`), deployed on
Cloudflare Pages, with blog content pulled from a headless WordPress install at
build time.

---

## The one thing to know first

**`main` auto-deploys to production.** Cloudflare Pages watches `main` through its
Git integration. There is no staging gate and no manual approval step: a push to
`main` is live on https://www.zeroplastic.lk within roughly 3 to 6 minutes.

So: **never push to `main` without being asked to.** Work on a feature branch.

---

## Commands

```bash
npm run check                                            # astro check (types)
WORDPRESS_BASE_URL=https://cms.zeroplastic.lk npm run build
node scripts/preflight.mjs                               # 15 checks, run after every build
```

The build **must** have `WORDPRESS_BASE_URL` set, or it falls back to the old
origin and silently fetches the wrong content. There is no test runner beyond
`check` and `preflight`: those two are the suite.

To look at a build in a browser, serve `dist/` over plain HTTP:

```bash
cd dist && npx http-server -p 8099 -s
```

Two things only exist in production, so a 404 for either locally is expected and
not a bug: `/api/place-reviews` and `/api/volunteer-application` are Cloudflare
Functions (`functions/api/`).

---

## Working agreement

The site owner gates anything outward-facing. Treat these as standing rules
unless the current request overrides them:

- **Do not commit, merge, push or deploy unless explicitly told to in that
  message.** Approval for one step is not approval for the next. "Commit it" is
  not "merge it"; "merge it" is not "deploy it" (though on `main` those are the
  same act, so say so).
- **Never fabricate.** No invented statistics, testimonials, partner names,
  accreditations, prices, review text or project results. If a number cannot be
  traced to something already published, leave it off the page and say why.
- **Do not touch live integrations** without a specific instruction naming them:
  Make.com scenarios, Monday.com boards and forms, Slack notifications, the
  volunteer form endpoint, GTM, GA4 or Google Ads conversions.
- **Never print or commit a secret.** Webhook URLs, API keys, OAuth tokens and
  refresh tokens stay out of chat, logs, commits and client-side JavaScript.
  Server-side env vars only: `VOLUNTEER_FORM_WEBHOOK_URL`, `GOOGLE_PLACES_API_KEY`.
- **Never point a local test at production Make.** Use a mock and prove the
  isolation before sending anything.
- Report honestly. If a check failed, say so with the output. If you skipped
  something, say that. Do not describe work as verified when it was not.

---

## House style

- **No em dashes.** `scripts/preflight.mjs` exits non-zero on any em dash in
  Astro-generated content. It is a separate step from `npm run build`, so a build
  can succeed while preflight fails: always run both. Use a comma, a colon or a full stop. (The migrated
  `public/*.html` landing pages carry pre-existing em dashes; those are grandfathered
  and reported as a NOTE, not a failure. Do not add more.)
- **No emoji** in page content.
- British spelling in prose: *organisation*, *programme*, *colour*, *traveller*.
- Straight apostrophes, not curly.
- Write comments that explain *why*, matching the density already in the file.
  This codebase comments decisions, not syntax.

---

## Content provenance

Marketing pages make claims about a real organisation, so every claim needs a
source. `src/data/self-drive.ts` is the reference pattern: each value is tagged
in a comment with where it came from.

| Tag | Meaning |
|---|---|
| `PUBLISHED` | Already live on `public/impact-center-premium.html` or another shipped page. Safe. |
| `CONFIRMED` | Signed off by the owner in conversation. Authoritative, but not published elsewhere. |
| `OMITTED` | Could not be verified. Left off the page, listed in an `UNVERIFIED` export. |

Before publishing any figure, grep the repo for it. Several plausible-sounding
numbers conflict with what `src/consts.ts` actually publishes.

Wording that is currently **approved**: "a registered Sri Lankan non-profit",
"249 artisan families", "more than 1,000 plastic-free products", "free entry",
"7:30 to 18:30, every day", "about 5 km before Sigiriya Rock".

Wording that is **withheld**: "government-registered".

---

## Conventions

**Images** are pre-encoded and committed, so a deploy pays no encoding cost.
Originals go in `assets/source/<page>/`, and a script in `scripts/build-*-images.mjs`
writes AVIF/WebP/JPEG variants into `public/images/`. Section widths are
`[480, 800, 1200]` (`SECTION_IMAGE_WIDTHS`), hero widths `[640, 960, 1280, 1600]`.
The scripts never upscale, so a small original yields fewer variants, so pass the
widths that actually exist to any hand-written `srcset`, or the browser will
request a 404. Nothing is cropped; framing is handled in CSS with `object-position`.

**SEO** goes through `src/components/SEO.astro`, which derives the canonical from
`Astro.url.pathname` and accepts `image`, `schema[]`, `noindex`. Structured-data
helpers live in `src/lib/schema.ts`.

**Analytics.** Astro routes carry no analytics by default. The `public/*.html`
landing pages and `/self-drive-sri-lanka/` load GTM container `GTM-N85V5638`
inline. Conversions are configured **in GTM**, never hardcoded: do not add an
`AW-` id or fire a `gtag` conversion from page code. Landing pages push named
`dataLayer` events via `data-ev="..."` attributes and one delegated listener.
Event names are a contract with GTM: renaming one silently breaks a conversion.

**Styling** is scoped to the page. `src/styles/global.css` is shared by every
route, so changing a token there changes the whole site. To fix contrast or
spacing on one page, override inside that page's `<style>` block.

---

## Verification routine

For anything user-facing, this is the expected sequence. Do not report success
without it:

1. `npm run check`, expecting 0 errors
2. Build with `WORDPRESS_BASE_URL` set
3. `node scripts/preflight.mjs`, expecting 15/15
4. Serve `dist/` and drive it in a real browser at **320, 375, 390, 430, 768,
   1280, 1440**: no horizontal overflow, exactly one `<h1>`, every image has
   `alt`, every local asset resolves, no console errors
5. Check contrast against the *composited* background. A naive computed-style
   reading treats `rgba(255,255,255,0.1)` over a dark hero as a white background
   and reports a false failure. Sample real rendered pixels before "fixing" it
6. Anchor targets need `scroll-margin-top` clearing the sticky header (4.5rem)
   plus any sticky sub-nav, or headings land hidden
7. Standalone tap targets ≥ 44px. Inline links inside a sentence are exempt
   (WCAG 2.5.8)
8. After deploying, confirm the live bytes match the build you verified
   (`sha256sum`), rather than assuming the deploy shipped what you tested

Note `html { scroll-behavior: smooth }` is global, so
`scrollIntoView({behavior:'auto'})` still animates, so use `'instant'`.

---

## Repo map

```
src/pages/        Astro routes. [slug].astro renders WordPress posts.
src/data/         Typed page content, provenance-tagged. Keep copy out of markup.
src/lib/          wp.ts (REST client), media.ts (URL rewriting), schema.ts (JSON-LD)
src/components/   SEO.astro, Figure.astro
src/consts.ts     Contact details, external URLs, published statistics
public/*.html     Legacy landing pages, served verbatim. Google Ads points at these.
functions/        Cloudflare Functions (form relay, Google reviews proxy)
scripts/          Image encoders and preflight
assets/source/    Photo originals, committed
```

`public/impact-center-premium.html` is the Final URL of a live Google Ads
campaign. Treat it as production infrastructure: do not restructure it casually.
