# Pre-production cutover audit

Read-only investigation of everything that could break when `www.zeroplastic.lk`
moves from DreamHost/WordPress to Cloudflare Pages/Astro.

- **Date of audit:** 2026-09-21
- **Astro commit audited:** `6b5f61a`
- **Staging URL audited:** `https://zeroplasticlk.pages.dev`
- **Production audited:** `https://www.zeroplastic.lk` and `https://zeroplastic.lk`
- **Changes made to production:** none. No DNS, DreamHost, WordPress, Azure or
  Cloudflare configuration was modified. No domain was attached. Nothing was deleted.

**Recommendation: NOT READY.** Seven blockers are listed in section 18. The
largest is that 714 of the 729 pages on the new site load their images from
`www.zeroplastic.lk`, which is the exact hostname being moved.

---

## 1. Inventory of URLs currently served

Taken from the live Yoast sitemap index at `/sitemap_index.xml` and from the
WordPress REST API, then verified against the live site.

| Family | Count | Source | Served by |
| --- | --- | --- | --- |
| Posts | 658 | `post-sitemap.xml`, `x-wp-total: 658` | WordPress |
| Pages | 39 | `page-sitemap.xml` | WordPress |
| Team members | 6 | `team-sitemap.xml` | WordPress CPT `team` |
| Events | 3 | `etn-sitemap.xml` | WordPress CPT `etn` (Eventin) |
| Event schedules | 3 | `etn-schedule-sitemap.xml` | WordPress CPT `etn-schedule` |
| Categories | 4 | `category-sitemap.xml` | WordPress |
| Tags | 401 | `post_tag-sitemap.xml` | WordPress |
| Authors | 3 | `author-sitemap.xml` | WordPress |
| Media items | 2,807 | `/wp-json/wp/v2/media` | WordPress uploads |
| Static landing pages | 8 | not in any sitemap | **Apache, not WordPress** |
| Landing page images | 21 | `/htmlimages/` | **Apache, not WordPress** |

The sitemap is stale. `/events/applied-ai-machine-learning-summit-2026/` and all
three `/etn-schedule/*` URLs are listed but now return 404. The REST API reports
only 1 live `etn` and 0 live `etn-schedule` records.

Registered custom post types (`/wp-json/wp/v2/types`): `team`, `etn`,
`etn-schedule`, `etn-attendee`, `etn-template`, `elementor_library`,
`e-floating-buttons`, `kadence_form`, `kadence_navigation`, `kadence_header`,
`kadence_lottie`, `kadence_vector`, `bdpp_layout`, `spectra-popup`,
`jp_act_log_event`.

`etn-attendee` is publicly readable over the REST API. It currently holds 0
records, so nothing is exposed today, but it is an open endpoint that would have
returned attendee data had any existed.

### Non-WordPress URLs

These are **not** WordPress and are **not** in the sitemap. All eight return HTTP
200 today and all eight return 404 on the new site.

```
/impact-center-premium.html
/craft-experiences-sigiriya.html
/zeroplastic-movement-sri-lanka.html
/es/craft-experiences-sigiriya.html
/fr/craft-experiences-sigiriya.html
/zh-cn/craft-experiences-sigiriya.html
/sigiriya-craft-village/
/sigiriya-sri-lanka/
/htmlimages/*            (21 images)
```

`/impact-center-premium.html.backup` is also publicly readable. It is a backup
copy written by the deploy pipeline and should not be web accessible.

---

## 2. Origin of `impact-center-premium.html`: resolved

**It is not on Azure.** It is a physical static file on DreamHost disk, served
directly by Apache, and it has no relationship to WordPress.

Four independent lines of evidence:

1. **Apache ETag encodes the on-disk size.** The response carries
   `etag: "fa64-65bd5cebb5f8a"`. `0xfa64` is 64,100, which matches the byte count
   of the response exactly. Apache only produces that ETag form for a real file.
2. **It survives WordPress being down.** During a WordPress maintenance window
   observed mid-audit (see section 7), `/`, `/about-5/` and `/wp-json/...` all
   returned 503 while `/impact-center-premium.html`,
   `/craft-experiences-sigiriya.html`, `/sigiriya-craft-village/`,
   `/htmlimages/ic-hero-studio-dusk.jpg` and `/robots.txt` all still returned 200.
3. **No cloud-host markers.** Zero references to Azure, `azurewebsites`,
   `blob.core`, CloudFront, AWS, Netlify or Vercel in the HTML. No proxy, Front
   Door or CDN headers in the response. Server reports plain `Apache`.
4. **There is a deploy pipeline that puts it there.** The repository
   `ZeroPlastic-Movement/zeroplastic-landing-pages` contains
   `.github/workflows/deploy-impact-center.yml`, which rsyncs these files over SSH
   into the DreamHost web root on every push to `main`.

Searches for `impact-center-premium`, `Azure`, `rewrite`, `proxy` and `redirect`
found no Azure hosting anywhere. The only `azure` match in this repository is a
list of optional peer dependencies inside `package-lock.json`, unrelated to hosting.

### The deploy pipeline is itself a cutover problem

`deploy-impact-center.yml` writes to DreamHost using repository secrets
`DREAMHOST_SSH_KEY`, `DREAMHOST_HOST`, `DREAMHOST_USER` and `DREAMHOST_PATH`. After
cutover it will keep succeeding, writing files to a server that no longer receives
traffic for this domain, with no visible error. Its behaviour must be decided
before the switch, not after.

---

## 3. URL migration table

Classification used (stated explicitly so it can be re-mapped if your A to F
definitions differ):

- **A** Already live on the new site at the same URL. No action.
- **B** Migrated but the URL changed. Needs a 301.
- **C** Not migrated. Must be built before cutover.
- **D** Not migrated. Must continue to be served by the old host or a subdomain.
- **E** Intentionally dropped. Needs a 301 to the closest relevant page.
- **F** Intentionally dropped. A 410 or 404 is acceptable.

| URL | Class | Status on new site | Action required |
| --- | --- | --- | --- |
| `/` | A | 200 | none |
| `/blog/` | A | 200 | none |
| `/contact/` | A | 200 | none |
| `/our-experts/` | A | 200 | none |
| `/privacy-policy/` | A | 200 | rewrite content, see section 13 |
| `/terms-conditions/` | A | 200 | rewrite content, see section 13 |
| `/problem-statement/` | A | 200 | none |
| `/volunteers/` | A | 200 | none |
| 658 blog posts | A | 200 | images broken, see section 11 |
| `/about-5/` | B | 301 to `/about/` | already handled |
| `/projects/` | B | 301 to `/blog/` | already handled |
| `/advisory-board-zeroplastic-movement/` | B | **404** | 301 to `/advisory-board/` |
| `/about-5/engagement/` | B | 404 | 301 to `/about/` |
| `/about-5/organizational-profile/` | B | 404 | 301 to `/about/` |
| `/about-5/problem-statement/` | B | 404 | 301 to `/problem-statement/` |
| `/impact-center-premium.html` | **C/D** | **404** | **blocker, see section 18** |
| `/craft-experiences-sigiriya.html` | C/D | 404 | rebuild or keep on old host |
| `/zeroplastic-movement-sri-lanka.html` | C/D | 404 | rebuild or keep on old host |
| `/es/`, `/fr/`, `/zh-cn/` craft pages | C/D | 404 | rebuild or keep on old host |
| `/sigiriya-craft-village/` | C/D | 404 | rebuild or keep on old host |
| `/sigiriya-sri-lanka/` | C/D | 404 | rebuild or keep on old host |
| `/htmlimages/*` | C/D | 404 | must follow the pages above |
| `/wp-content/uploads/*` | **D** | **404** | **blocker, see section 11** |
| `/download-volunteer-app/` | C | 404 | build, links the iOS and Android apps |
| `/theory-of-change/` | C | 404 | build or reclassify |
| `/zeroplastic-commitment-certification/` | C | 404 | build or 301 to the Commitment site |
| `/zpcstandard/` | C | 404 | build or 301 to the Commitment site |
| `/volunteer-certificate/` | C | 404 | build or 301 |
| `/apply/` | C | 404 | build or 301 to the relevant form |
| `/zeroplastic-events-guide-for-corporates/` | C | 404 | build or 301 |
| `/zeroplastic-policy-for-corporate/` | C | 404 | build or 301 |
| `/project-ideas-for-corporates-world-environment-day-2025/` | C | 404 | build or 301 |
| `/publish-university-project-to-the-zeroplastic-main-website/` | C | 404 | build or 301 |
| `/wcd/`, `/world-cleanup-day/`, `/world-cleanup-day-2023/` | E | 404 | 301 to `/our-work/` |
| `/world-cleanup-day-2022-*` (2 URLs) | E | 404 | 301 to `/our-work/` |
| `/trail/`, `/trail2023/`, `/trail_guidelines/` | E | 404 | 301 to `/our-work/` |
| `/worldcup2025/` | E | 404 | 301 to `/our-work/` |
| `/wiki/` | E | 404 | 301 to `/blog/` |
| `/thank-you/` | F | 404 | acceptable |
| `/home-01/` | F | 404 | theme demo page, acceptable |
| `/etn-tags/`, `/etn_category/` | F | 404 | plugin artefacts, acceptable |
| `/pen-bin-love-.../` | A | 200 | served as a post |
| `/team/*` (6 URLs) | E | 404 | 301 to `/advisory-board/` or `/our-experts/` |
| `/events/`, `/events/*` | E/F | 404 | 301 `/events/` to `/our-work/`, rest 410 |
| `/etn-schedule/*` | F | 404 | already 404 on production |
| `/category/*` (4) | E | 404 | 301 to `/blog/` |
| `/tag/*` (401) | E | 404 | 301 to `/blog/`, or 410 in bulk |
| `/author/*` (3) | F | 404 | acceptable |
| `/feed/` | B | 404 | 301 to `/rss.xml` |
| `/comments/feed/` | F | 404 | acceptable |
| `/sitemap_index.xml` | B | **404** | 301 to `/sitemap-index.xml` |
| `/sitemap.xml` | B | 404 | 301 to `/sitemap-index.xml` |
| `/wp-json/*` | D | 404 | must stay reachable, see section 4 |
| `/wp-admin/`, `/wp-login.php` | D | 404 | must stay reachable, see section 7 |

Summary: **28 of the 39 indexed WordPress pages return 404 on the new site today**,
plus all 8 static landing pages, all 401 tag URLs, all 6 team URLs and all
category, author and event URLs.

---

## 4. `cms.zeroplastic.lk` readiness

`cms.zeroplastic.lk` **does not exist**. Confirmed NXDOMAIN, no A, AAAA or CNAME
record.

This matters more than it first appears. WordPress has to stay reachable after
cutover for three reasons: the Astro build reads content from it, five Make.com
scenarios write into it, and 2,580 images are served from its uploads directory.
It cannot stay on `www.zeroplastic.lk` because that hostname is the one moving.

Readiness plan, in order:

1. Create `cms.zeroplastic.lk` as an A record to `64.90.54.244` in DreamHost DNS.
   This is additive and safe to do well before cutover.
2. Add the hostname to the DreamHost panel so Apache answers for it and issue a
   TLS certificate for it. Verify `https://cms.zeroplastic.lk/` serves the site.
3. Only then change the WordPress Site URL and Home URL to
   `https://cms.zeroplastic.lk`. This rewrites every `wp-content/uploads` URL that
   WordPress generates, and changes the Jetpack Photon URLs from
   `i0.wp.com/www.zeroplastic.lk/...` to `i0.wp.com/cms.zeroplastic.lk/...`.
4. Re-point every Make.com WordPress connection (section 6) at the new host.
5. Rebuild the Astro site and confirm image URLs now resolve to `cms.` before
   touching public DNS.

Step 3 is the one your standing instruction forbids doing now, and it is also the
step everything else depends on. It is a scheduled maintenance action, not part of
this audit.

Note that changing the Site URL does **not** rewrite URLs already stored inside
post content in the database. A search and replace across `post_content` is also
needed, or the 12,623 hardcoded references described in section 11 will still
point at `www.`.

---

## 5. WordPress API dependencies in this repository

| Location | Dependency |
| --- | --- |
| `src/consts.ts` | `SITE.wpBase = 'https://www.zeroplastic.lk'` |
| `src/lib/wp.ts` | `const API = \`${SITE.wpBase}/wp-json/wp/v2\`` |
| `src/consts.ts` | `SITE.mediaHost = 'https://i0.wp.com'` |
| `astro.config.mjs` | `remotePatterns` allows `www.zeroplastic.lk` and `i0.wp.com` |
| `.github/workflows/ci.yml` | `SITE_URL: https://www.zeroplastic.lk` |

Endpoints consumed at build time: `/posts`, `/categories`, `/pages`, `/media`.

Everything funnels through the single constant `SITE.wpBase`, so the code change
for a CMS move is one line. The work is in the data, not the code.

---

## 6. Make.com migration checklist (manual)

Organisation `My Organization` (3227788), team `My Team` (1465306), zone `eu2.make.com`.
Twenty active scenarios. Webhook tokens are deliberately not reproduced here.

### Scenarios that write into WordPress at `www.zeroplastic.lk`

These break the moment the WordPress host changes, and all five need their
WordPress connection re-pointed at `cms.zeroplastic.lk`.

| ID | Scenario | Modules | Health |
| --- | --- | --- | --- |
| 9792241 | ZeroPlastic Website Blog Agent | `createPost`, `createMediaItem`, `updatePost` | 53 runs, 2 errors |
| 9792298 | Zeroplastic Blog Approval Publisher | `updatePost`, `getPost` | 31 runs, 0 errors |
| 9773634 | ZeroPlastic Impact Center Blog Agent v2 | `createPost`, `createMediaItem`, `updatePost` | 47 runs, 3 errors |
| 9773691 | Impact Blog Approval Publisher | `updatePost`, `getPost`, `getMediaItem` | 96 runs, **84 errors** |
| 9443572 | Monday 5029075958 to WordPress blog (Projects) | HTTP to WP | 19 runs, 4 errors |

Two of these call `createMediaItem`, which uploads into
`www.zeroplastic.lk/wp-content/uploads/`. Every image they add after cutover would
be written to a location the public site can no longer serve.

**Scenario 9773691 is already failing 87 percent of its runs.** That is a
pre-existing fault, not a cutover risk, but it should be fixed before anyone
relies on this pipeline during a migration.

### Scenario tied to the static landing page

| ID | Scenario | Trigger |
| --- | --- | --- |
| 9577352 | Impact Center, visit request (landing page) | gateway webhook, then Slack and Monday |

The webhook it listens on is hardcoded into `impact-center-premium.html`,
`craft-experiences-sigiriya.html` and the three translated copies. If those pages
stop being served, this scenario stops receiving submissions, and the Google Ads
conversion action that depends on it stops firing.

### Scenarios not affected by the cutover

Google Business review automation (9488547, 9699190, 9486635), the Monday to
social pipelines (9448627, 9448665, 9448686, 9438951, 9439206, 9448784, 9484129),
Intrepid Remittance to Monday (9459483), Lead Researcher Agent (9772250),
Integration Data store (9764195), Integration HTTP (9537019). One scenario,
9442607, is already inactive and flagged invalid.

### Checklist

1. Before cutover, confirm `cms.zeroplastic.lk` serves WordPress over HTTPS.
2. Update the WordPress connection on scenarios 9792241, 9792298, 9773634, 9773691, 9443572.
3. Fix or disable 9773691 before relying on it.
4. Decide the fate of the landing pages, then update or retire 9577352 to match.
5. Re-run one scenario of each type and confirm the post and its media appear.
6. Rebuild the Astro site and confirm the new post is present with working images.

---

## 7. WordPress backend paths

| Path | Production | On new site | Note |
| --- | --- | --- | --- |
| `/wp-login.php` | 200 | 404 | editors lose login at this URL |
| `/wp-admin/` | 302 | 404 | redirects to login |
| `/wp-json/` | 200 | 404 | needed by the build and by Make.com |
| `/xmlrpc.php` | 405 | 404 | already disabled, fine |
| `/wp-cron.php` | no response | 404 | scheduled tasks |
| `/readme.html` | 200 | 404 | discloses the WordPress version, should be removed |
| `/wp-config.php` | 418 | 404 | protected |
| `/.htaccess` | 503 | 404 | protected |
| `/wp-content/uploads/` | 200 | 404 | see section 11 |

All of these must remain reachable on `cms.zeroplastic.lk` after cutover. None
should be reachable on the public `www` hostname.

### Observed during the audit: WordPress went into maintenance mode

At 12:03 UTC the entire WordPress site returned HTTP 503 with a `Maintenance`
page and `retry-after: 600`, recovering by 12:04 UTC. This is WordPress writing
its `.maintenance` file during an automatic update.

This is a live risk to the build: if a Cloudflare Pages build starts during one of
these windows, every REST call fails and the build either errors or produces an
incomplete site. This is also the most likely explanation for the slow builds
observed earlier. The build should fail loudly on a non-200 from the API rather
than publishing a partial site.

---

## 8. Active subdomains

| Host | Resolves to | Status | Note |
| --- | --- | --- | --- |
| `zeroplastic.lk` | 64.90.54.244 | 200 | DreamHost |
| `www.zeroplastic.lk` | 64.90.54.244 | 200 | DreamHost, A record not CNAME |
| `impactcenter.zeroplastic.lk` | 64.90.54.244 | 200 | **same DreamHost server** |
| `ftp.zeroplastic.lk` | 64.90.54.244 | n/a | DreamHost |
| `alert.zeroplastic.lk` | 13.214.53.126 | **no response** | AWS Singapore, already broken |
| `cms.zeroplastic.lk` | NXDOMAIN | n/a | does not exist yet |
| `products.zeroplastic.lk` | NXDOMAIN | n/a | dead, link already removed |
| mail, shop, store, api, app, blog, staging, dev, portal, impact, donate, events, volunteer, academy, commitment, m | NXDOMAIN | n/a | do not exist |

`impactcenter.zeroplastic.lk` sharing the main IP is important: it is a separate
site on the same DreamHost account. Its DNS record must be left pointing at
DreamHost when `www` moves.

`alert.zeroplastic.lk` is referenced three times on the WordPress homepage and
does not respond at all. It is already broken in production today.

---

## 9. External systems

| System | Endpoint | Status | Cutover impact |
| --- | --- | --- | --- |
| Google Ads (Ad Grants) | landing page Final URL | **serving** | **blocker, section 18** |
| Google Tag Manager | `GTM-N85V5638` | live on WP | **lost, no GTM on the new site** |
| Google Ads conversion tag | `AW-17612444693` | on landing page | lost with the page |
| Google Ads tag on WP | `AW-18330573756` | on WP homepage | noted as the wrong tag in the ads repo |
| Google Workspace mail | MX `aspmx.l.google.com` | live | **at risk if the zone moves** |
| Make.com | 5 WordPress scenarios | live | see section 6 |
| Monday.com forms | 4 forms | all 200 | unaffected, they are external |
| Jetpack Photon | `i0.wp.com` | live | **blocker, section 11** |
| Volunteers Academy | `volunteersacademy.com` | 200 | unaffected |
| Commitment Standard | `zeroplasticcommitment.org` | 200 | unaffected |
| Impact Center store | `impactcenter.zeroplastic.lk` | 200 | unaffected if DNS preserved |
| Alert service | `alert.zeroplastic.lk` | **down** | already broken |
| Mobile apps | iOS `id6450773604`, Android `lk.zeroplastic` | live | `/download-volunteer-app/` 404s |

### Analytics is silently lost

The production WordPress site loads Google Tag Manager container `GTM-N85V5638`
on every page. The new Astro site contains **no analytics of any kind**: zero
references to `googletagmanager`, `gtag`, `GTM-`, or any alternative. The only
`<script>` tags in the output are two JSON-LD blocks.

At cutover, all web analytics stop. This is a deliberate consequence of the
zero-JavaScript design, but it has not been decided explicitly and it should be.

---

## 10. Build-time WordPress content dependencies

The build calls `/wp-json/wp/v2` for posts, categories, pages and media. Two of
the hand-built pages, `/privacy-policy/` and `/terms-conditions/`, fetch their body
text live from WordPress through `getPageBySlug()`. If WordPress is unreachable or
those pages are deleted, those two pages lose their content at the next build.

Responses are cached under `.cache/wp`, which does not persist between Cloudflare
Pages builds. Every build therefore depends on WordPress being up and responsive,
including during the maintenance windows described in section 7.

---

## 11. Media dependency: the largest blocker

Images on the new site resolve through two paths, and **both terminate at
`www.zeroplastic.lk`**, the hostname being moved.

**Path 1, Jetpack Photon.** URLs of the form
`https://i0.wp.com/www.zeroplastic.lk/wp-content/uploads/...`. Photon is a proxy,
not a store. It fetches from the origin on a cache miss.

Verified behaviour:

| Request | Result |
| --- | --- |
| Photon URL for a real image | 200, `image/jpeg` |
| Photon URL for a **novel size** of a real image | 200, proves it fetches the origin on demand |
| Photon URL for a **non-existent** origin path | **404** |

So Photon does not shield the site. Any new image, any new size, and any evicted
cache entry requires the origin to still be there.

**Path 2, direct references.** WordPress post content contains `srcset`
attributes that point straight at the origin, with no proxy at all.

Measured on the committed build output:

| Measure | Count |
| --- | --- |
| Total pages built | 729 |
| Pages referencing `i0.wp.com` | 727 |
| Photon references | 26,709 |
| Distinct origin paths behind Photon | 1,242 |
| **Direct `https://www.zeroplastic.lk/wp-content/` references** | **12,623** |
| **Distinct directly referenced files** | **2,580** |
| Pages with at least one direct origin reference | 532 |
| **Pages with any origin dependency** | **714 of 729** |

Only 15 pages are self-contained, and they are exactly the hand-built ones:
`404`, `about`, `about-5`, `advisory-board`, `advocacy`, `clubs`, `contact`,
`our-experts`, `our-work`, `privacy-policy`, `problem-statement`, `projects`,
`sustainable-travel`, `terms-conditions`, `volunteers`.

`/wp-content/uploads/` already returns 404 on the staging Astro site, confirmed.

**Consequence.** On the day `www.zeroplastic.lk` points at Cloudflare Pages, every
one of the 2,580 directly referenced images returns 404 immediately, across 532
pages. The 1,242 Photon-backed images fail progressively as the cache expires.
The blog becomes a wall of broken images.

Options, in order of preference:

1. Move WordPress to `cms.zeroplastic.lk`, then search and replace
   `www.zeroplastic.lk/wp-content` to `cms.zeroplastic.lk/wp-content` across
   `post_content`, and rebuild. Also updates the Photon URLs.
2. Download all 2,807 media items into the repository and rewrite URLs at build
   time to local paths. Removes the dependency entirely but adds significant weight.
3. Serve `/wp-content/uploads/*` from the new host by proxying to DreamHost. This
   keeps the old URLs working but leaves the dependency in place indefinitely.

Option 1 is the smallest change. Option 2 is the only one that actually removes
the coupling.

---

## 12. Redirect plan

Currently implemented in `public/_redirects`: `/about-5` and `/projects` only.
That covers 2 of the roughly 450 URLs that need a rule.

Recommended additions, in `public/_redirects` so Cloudflare serves real 301s:

```
# Sitemap and feed
/sitemap_index.xml   /sitemap-index.xml   301
/sitemap.xml         /sitemap-index.xml   301
/feed                /rss.xml             301
/feed/               /rss.xml             301

# Pages that moved
/advisory-board-zeroplastic-movement/  /advisory-board/     301
/about-5/engagement/                   /about/              301
/about-5/organizational-profile/       /about/              301
/about-5/problem-statement/            /problem-statement/  301

# Campaign and event pages, consolidated
/wcd/                    /our-work/  301
/world-cleanup-day/      /our-work/  301
/world-cleanup-day-2023/ /our-work/  301
/world-cleanup-day-2022-guidelines-for-safety-and-efficiency/  /our-work/  301
/world-cleanup-day-2022-zeroplastic-movement-agenda/           /our-work/  301
/trail/                  /our-work/  301
/trail2023/              /our-work/  301
/trail_guidelines/       /our-work/  301
/worldcup2025/           /our-work/  301
/wiki/                   /blog/      301

# Taxonomies and CPTs
/category/*   /blog/             301
/tag/*        /blog/             301
/team/*       /advisory-board/   301
/events       /our-work/         301
/events/*     /our-work/         301
```

Note that `_redirects` on Cloudflare Pages has a 2,100 rule limit and only 100 may
use wildcards, which the wildcard forms above stay well within.

Three decisions are still needed before this list is final:

1. Whether the static landing pages are rebuilt on the new site, kept on the old
   host under a different hostname, or redirected. This changes several rows.
2. Whether the class C pages in section 3 are rebuilt or redirected.
3. Whether `/wp-content/uploads/*` is proxied, which would add a rule here.

---

## 13. Legal pages: e-commerce wording

Both legal pages are unmodified **Shopify boilerplate**, and both describe a
business that does not exist.

`/privacy-policy/` states, verbatim:

- "we use **Shopify to power our online store**"
- "when you make a purchase or attempt to make a purchase through the Site, we
  collect certain information from you, including your name, billing address,
  shipping address, **payment information (including credit card numbers)**"
- "to fulfill any orders placed through the Site (including processing your
  payment information, **arranging for shipping**, and providing you with
  **invoices and/or order confirmations**)"
- "Screen our orders for potential risk or fraud"

`/terms-conditions/` contains "Section 1, **Online Store Terms**", "Section 4,
Modifications to the Service and **Prices**", "Section 5, **Products or Services**",
"Section 6, Accuracy of **Billing** and Account Information", references to a
"**Returns Policy**" that does not exist, and language about cancelling orders,
credit cards and resellers.

There is no store on `zeroplastic.lk` and no payment is taken. Three separate
problems follow:

1. **Factually false.** The policy claims to collect credit card numbers. It does not.
2. **Google Ad Grants exposure.** Per the org's own `googleads` repository, the
   Ad Grants account was previously **suspended** for a Website Policy violation
   whose confirmed root cause was "grant-funded ads driving traffic to commercial
   activity". A privacy policy on the grant domain announcing an online store is
   direct written evidence of exactly that.
3. **Carried forward unchanged.** These pages are pulled live from WordPress by
   `getPageBySlug()`, so the new site reproduces the problem faithfully.

**Recommendation:** rewrite both pages for a non-profit that operates no store and
takes no payments, before cutover. This is a content task, not a technical one, and
it does not depend on any other item in this audit.

Related and worth a decision: the new site links prominently to
`impactcenter.zeroplastic.lk`, which the same repository describes as a live
e-commerce store with 1,000-plus products and paid bookings. That link is fine for
organic traffic. It should be reviewed before any Ad Grants traffic is ever pointed
at a `zeroplastic.lk` page.

---

## 14. Production domain configuration plan

Current DNS, read live:

| Record | Value |
| --- | --- |
| NS | `ns1.dreamhost.com`, `ns2`, `ns3` |
| SOA | `ns1.dreamhost.com. hostmaster.dreamhost.com. 2026090707` |
| A `zeroplastic.lk` | `64.90.54.244` |
| A `www` | `64.90.54.244` (an A record, **not** a CNAME) |
| MX | Google Workspace, `aspmx.l.google.com` and 4 alternates |
| TXT SPF | `v=spf1` including SendGrid, Mailchimp, Google, Salesforce, Zendesk, Qualtrics IPs, ending `-all` |
| TXT DKIM | `google._domainkey`, RSA key present |
| TXT DMARC | `v=DMARC1; p=none; rua=...; adkim=s; aspf=s` |
| TXT | Twilio domain verification |
| TXT | Anthropic domain verification |
| CAA | none |

**The nameservers are at DreamHost.** That is the single most important fact in
this section, and it creates a fork:

**Option A, keep DNS at DreamHost.** Add a CNAME for `www` to the Pages hostname.
Lowest risk: MX, SPF, DKIM, DMARC and the verification records are never touched.
The catch is the apex. `zeroplastic.lk` needs an ALIAS or ANAME record to point at
Cloudflare Pages, and DreamHost does not offer one. The apex would have to keep
working some other way, for example a DreamHost-level redirect to `www`.

Note this also changes today's behaviour, where the apex serves the static landing
pages directly at 200 while WordPress URLs 301 from apex to `www`. The Google Ads
Final URL relies on that apex 200.

**Option B, move the zone to Cloudflare.** Gives a proper apex through CNAME
flattening and the full Cloudflare feature set. It also means **every record above
must be recreated by hand before the nameservers change**. Miss the MX records and
all organisation email stops, including `info@zeroplastic.lk`. Miss the SPF or DKIM
and outbound mail from SendGrid, Mailchimp, Salesforce and Zendesk starts failing
authentication.

If Option B is chosen: export the zone first, recreate every record, verify with
`dig` against Cloudflare's nameservers **before** changing NS at the registrar, and
lower TTLs 48 hours ahead.

Either way, `impactcenter`, `ftp` and `alert` must keep their current values, and
`cms` must be added first.

---

## 15. Robots and SEO cutover checklist

- [ ] `SITE_URL` must be set explicitly to `https://www.zeroplastic.lk` in the
      Cloudflare Pages production environment. The fallback chain resolves to
      `CF_PAGES_URL`, which is deployment-specific, and would poison every
      canonical and sitemap URL.
- [ ] Confirm the generated `robots.txt` flips from `Disallow: /` to the
      production form. This is keyed on hostname and is correct in code, but must
      be verified on the live domain within minutes of cutover.
- [ ] Production `robots.txt` today has **no `Sitemap:` directive**. The new one
      adds it. Confirm it points at `/sitemap-index.xml`.
- [ ] Production `robots.txt` today sets `Crawl-delay: 10`. Deliberately dropped.
- [ ] Add the `/sitemap_index.xml` to `/sitemap-index.xml` redirect **before**
      cutover. Google Search Console has the old URL registered.
- [ ] Submit the new sitemap in Search Console and keep the old one until the new
      one is fully processed.
- [ ] Verify canonicals resolve to `https://www.zeroplastic.lk/...` and not to a
      `pages.dev` host, on at least one page of each template.
- [ ] Confirm JSON-LD `url` and `@id` values use the production host.
- [ ] Decide the apex policy and make it consistent. Today apex 301s to `www` for
      WordPress URLs but serves 200 for static files.
- [ ] Watch Search Console Coverage daily for two weeks. A spike in 404s is the
      first signal that section 3 was under-specified.
- [ ] Decide whether to reinstate analytics before cutover, see section 9.

---

## 16. Rollback plan

Rollback is genuinely cheap **only if** WordPress is left completely intact, which
section 17 requires anyway.

Preconditions:

1. Lower the TTL on the `www` and apex records to 300 seconds at least 48 hours
   before cutover. Without this, rollback takes as long as the old TTL.
2. Do not change the WordPress Site URL and Home URL in the same maintenance
   window as the DNS change. Separate them by at least a few days, so that
   rolling back DNS does not also require rolling back WordPress.
3. Record the current DNS zone in full before any change.

To roll back:

1. Point `www` and apex back to `64.90.54.244`.
2. Wait out the TTL.
3. Verify `https://www.zeroplastic.lk/` returns the WordPress homepage and that
   `/impact-center-premium.html` returns 200.

If the WordPress Site URL was already moved to `cms.`, rollback additionally
requires changing it back and re-running the `post_content` search and replace in
reverse. This is why the two changes must not be combined.

Rollback does **not** recover: Google Ads impressions lost while the landing page
was 404, and any Make.com writes that failed during the window.

---

## 17. Do not decommission

Nothing on this list may be deleted, disabled or cancelled, before or after cutover.

- DreamHost hosting account and the `64.90.54.244` server
- The WordPress installation, its database and its `wp-content/uploads` directory
  (2,807 media items, the origin for 2,580 images on the new site)
- All WordPress plugins currently active: Elementor, Astra theme, `tlp-team`,
  `wp-event-solution` (Eventin), `revslider`, `supportcandy`, `easy-video-player`,
  Yoast SEO, Jetpack, the MCP Adapter plugin
- The `WebEditor` WordPress account and its application password
- `impactcenter.zeroplastic.lk` and its DNS record
- `ftp.zeroplastic.lk`
- `alert.zeroplastic.lk` DNS record, even though the service is down
- The 8 static landing pages and `/htmlimages/` on the DreamHost filesystem
- The `zeroplastic-landing-pages` repository, its workflow and its DreamHost secrets
- All 20 Make.com scenarios and their webhooks, including the inactive one
- Google Ads account 542-121-6511, campaign 24084222862, conversion action
  7701353172 and custom goal 6458493274
- Google Tag Manager container `GTM-N85V5638`
- Monday.com boards, especially board `5029075958`, and the 4 public forms
- Google Workspace, and every MX, SPF, DKIM and DMARC record
- The Twilio and Anthropic domain verification TXT records
- The iOS and Android apps and their store listings

---

## 18. Risk table

| # | Risk | Severity | Evidence |
| --- | --- | --- | --- |
| 1 | 2,580 images across 714 pages break when the origin host moves | **BLOCKER** | 12,623 direct references plus 1,242 Photon paths in the build output; Photon 404s on a missing origin |
| 2 | Live Google Ads Final URL `zeroplastic.lk/impact-center-premium.html` returns 404 | **BLOCKER** | campaign 24084222862 enabled and serving; page absent from the Astro site |
| 3 | Moving the DNS zone can break Google Workspace mail, SPF, DKIM, DMARC and two verification records | **BLOCKER** | NS at DreamHost; all records confirmed live |
| 4 | 28 of 39 indexed WordPress pages return 404 | **BLOCKER** | per-URL check in section 3 |
| 5 | 7 more static landing pages plus `/htmlimages/` disappear | **BLOCKER** | all 200 today, all 404 on the new site |
| 6 | Legal pages advertise a Shopify store on an Ad Grants domain previously suspended for commercial activity | **BLOCKER** | verbatim text in section 13 |
| 7 | WordPress becomes unreachable, so the build, 5 Make.com scenarios and all media lose their source | **BLOCKER** | `cms.zeroplastic.lk` is NXDOMAIN |
| 8 | All analytics stop; GTM container not carried over | HIGH | `GTM-N85V5638` on WP, zero analytics on the new site |
| 9 | `/sitemap_index.xml` and `/feed/` 404 with no redirect | HIGH | registered in Search Console; only 2 redirect rules exist today |
| 10 | `SITE_URL` unset would poison canonicals with a per-deployment hostname | HIGH | fallback chain in `astro.config.mjs` |
| 11 | 401 tag URLs, 4 category URLs, 6 team URLs, 3 author URLs all 404 | HIGH | sitemap versus live check |
| 12 | Landing-page deploy workflow keeps writing to a dead host, silently | MEDIUM | `deploy-impact-center.yml` |
| 13 | WordPress maintenance windows return 503 and can corrupt a build | MEDIUM | observed live at 12:03 UTC during this audit |
| 14 | Make.com scenario 9773691 fails 87 percent of runs | MEDIUM | 84 errors in 96 executions, pre-existing |
| 15 | Make.com media uploads land where the public site cannot serve them | MEDIUM | `createMediaItem` in scenarios 9792241 and 9773634 |
| 16 | `/download-volunteer-app/` 404s while both mobile apps are live | MEDIUM | store links on the WP homepage |
| 17 | Apex versus www behaviour is inconsistent and undecided | MEDIUM | apex 301s for WP, 200 for static files |
| 18 | `alert.zeroplastic.lk` does not respond, linked 3 times from the homepage | LOW | pre-existing, not caused by the cutover |
| 19 | `/impact-center-premium.html.backup` is publicly readable | LOW | written by the deploy workflow |
| 20 | `/readme.html` discloses the WordPress version | LOW | pre-existing |
| 21 | Yoast sitemap lists URLs that already 404 | LOW | pre-existing |
| 22 | `etn-attendee` REST endpoint is publicly readable | LOW | currently 0 records |

---

## 19. Final report

1. **Is the Astro site a complete replacement for the WordPress site today?** No.
   It covers the homepage, the blog and 9 hand-built pages well. It does not cover
   28 of 39 indexed pages, any taxonomy or team URL, or any of the 8 static
   landing pages.
2. **Where is `impact-center-premium.html` hosted?** On DreamHost, as a physical
   file served by Apache, deployed by GitHub Actions over SSH from the
   `zeroplastic-landing-pages` repository. Not Azure. Not WordPress.
3. **What breaks immediately at cutover?** 2,580 images across 532 pages, all 8
   landing pages, the live Google Ads destination, 28 WordPress pages, 401 tag
   URLs, the registered sitemap URL, the RSS feed URL, and all analytics.
4. **What breaks gradually?** Photon-backed images as the cache expires, and any
   new content published through Make.com.
5. **What is the single largest risk?** The media dependency. It is the only one
   that affects almost every page and cannot be fixed with a redirect.
6. **Is `cms.zeroplastic.lk` ready?** No. It does not exist.
7. **Can the WordPress backend stay reachable?** Yes, once `cms.zeroplastic.lk`
   exists. Nothing prevents it.
8. **What must not be decommissioned?** See section 17. Nothing on that list.
9. **Is DNS safe to move?** Only with a full record-by-record migration plan.
   Mail is the exposure, not the website.
10. **Are the legal pages fit for production?** No. They are Shopify store
    boilerplate on a Google Ad Grants domain that was previously suspended for
    exactly this category of problem.
11. **Is SEO continuity in place?** Partially. Canonicals, sitemap and structured
    data are sound. The redirect map covers 2 of roughly 450 URLs.
12. **Is rollback viable?** Yes, and cheaply, provided TTLs are lowered first and
    the WordPress Site URL change is kept in a separate maintenance window.
13. **Go or no go?**

> ### NOT READY
>
> Seven blockers, any one of which is sufficient on its own. The two that carry
> real-world cost beyond the website are the Google Ad Grants landing page, where
> a 404 on a live campaign's Final URL risks the account that was already
> suspended once, and the DNS zone move, which puts organisation email at risk.
>
> None of the blockers is architectural. The Astro site itself is sound: 729
> pages, zero JavaScript, and a large measured performance gain. The gap is
> migration completeness, not build quality.

### Shortest credible path to GO

1. Create `cms.zeroplastic.lk`, serve WordPress there over HTTPS, leaving
   `www` untouched.
2. Resolve the media dependency: move the Site URL, run the `post_content` search
   and replace, rebuild, and confirm zero references to `www.zeroplastic.lk/wp-content`
   remain in the output.
3. Decide the fate of the 8 static landing pages, and either port them into the
   Astro build or give them a host that survives the move. Do not let the Google
   Ads Final URL 404 for a single minute.
4. Rewrite the two legal pages.
5. Expand `public/_redirects` to cover section 12 and re-verify against the full
   sitemap.
6. Re-point the 5 Make.com WordPress connections and fix scenario 9773691.
7. Decide the analytics question.
8. Write out the full DNS record set, lower TTLs 48 hours ahead, then cut over.

Steps 1, 2, 4 and 5 can proceed in parallel and none of them touches production DNS.

---

*No production system was modified in the course of this audit.*
