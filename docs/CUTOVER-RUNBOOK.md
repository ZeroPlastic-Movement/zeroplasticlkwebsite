# Cutover runbook

Operational sequence for moving `www.zeroplastic.lk` to Cloudflare Pages while
DreamHost stays the authoritative DNS provider.

Companion to `docs/CUTOVER-AUDIT.md`, which explains why each step exists.

## Target architecture

| Hostname | Serves | Changes |
| --- | --- | --- |
| `www.zeroplastic.lk` | Cloudflare Pages, Astro | yes, at cutover |
| `cms.zeroplastic.lk` | existing DreamHost WordPress | new hostname, additive |
| `book.zeroplastic.lk` | booking system, `64.236.125.137` | none |
| `pos.zeroplastic.lk` | point of sale, `64.90.48.72` | none |
| `impactcenter.zeroplastic.lk` | store, DreamHost `64.90.54.244` | none |
| `zeroplastic.lk` apex | redirect to `www`, paths preserved | last step |
| Nameservers | DreamHost | **not moving** |

Keeping the nameservers at DreamHost removes the largest risk in the audit:
Google Workspace MX, the SPF record, DKIM, DMARC and the Twilio and Anthropic
verification TXT records are never touched.

## What is already done in code

- The WordPress origin is configurable (`WORDPRESS_BASE_URL`,
  `WORDPRESS_MEDIA_URL`) and still defaults to `https://www.zeroplastic.lk`, so
  merging this work changes nothing on its own.
- All WordPress media URLs are rewritten at build time to the configured media
  origin, covering `src`, `srcset`, featured images, post body HTML, excerpts,
  Open Graph images and RSS. Width descriptors are preserved.
- Jetpack Photon is no longer used at all.
- The 8 static landing pages and their 21 images are served by the Astro project
  at their exact existing paths.
- `scripts/preflight.mjs` verifies all of the above against a real build.

## Step 1: create the CMS hostname (done, verified 2026-09-21)

`cms.zeroplastic.lk` now exists and serves the same WordPress install. Verified
read-only:

| Check | Result |
| --- | --- |
| DNS | resolves to `64.90.50.211` (note: not the same address as `www`) |
| `/wp-json/wp/v2/posts?per_page=1` | `200`, `application/json`, `x-wp-total: 658` |
| `/wp-content/uploads/.../-768x576.jpeg` | `200`, `image/jpeg`, 73,817 bytes |
| Same file as `www`? | yes, identical ETag `"12059-641e009d35993"` |

Identical ETags on both hostnames prove the same file on the same disk, so this
is the existing web root and not a second copy, despite the different IP.

`https://cms.zeroplastic.lk/` itself returns `301` to `https://www.zeroplastic.lk/`
because `WP_HOME` and `WP_SITEURL` are still set to `www`. That is expected and
harmless: the REST API and the uploads directory both bypass that canonical
redirect, and those are the only two things the build uses.

### Known consequence: admin access

While `WP_SITEURL` stays on `www`, WordPress sends admin traffic back to `www`:

```
https://cms.zeroplastic.lk/wp-admin/
  -> 302 https://www.zeroplastic.lk/wp-login.php?redirect_to=...
```

After step 4 that target is Cloudflare Pages, which has no `wp-login.php`, so
**editors would be locked out of WordPress**. `cms.zeroplastic.lk/wp-login.php`
itself still returns `200`, but the post-login redirect goes to `www`.

Two ways to fix it, either is sufficient:

- Add these to `public/_redirects` so the public host hands admin traffic back
  to the CMS. This changes nothing in WordPress:

  ```
  /wp-admin/*    https://cms.zeroplastic.lk/wp-admin/:splat  302
  /wp-login.php  https://cms.zeroplastic.lk/wp-login.php     302
  ```

- Or move `WP_HOME` and `WP_SITEURL` to `https://cms.zeroplastic.lk`. This is
  the cleaner end state but is a WordPress configuration change, and it also
  rewrites the URLs WordPress generates, so it needs its own verification pass.

Neither has been applied. The first is the lower-risk option for cutover day.

### If the hostname ever needs recreating

### Original setup steps, for reference


1. In the DreamHost DNS panel add `cms.zeroplastic.lk` as an **A record** to
   `64.90.54.244`, the same address `www` uses today.
2. In the DreamHost hosting panel, add `cms.zeroplastic.lk` as a hostname for
   the existing WordPress web root, and let it issue a TLS certificate.
3. Verify, without changing anything else:

   ```
   curl -sI https://cms.zeroplastic.lk/wp-json/wp/v2/posts?per_page=1
   curl -sI https://cms.zeroplastic.lk/wp-content/uploads/2025/10/large-WhatsApp-Image-2025-09-29-at-21.19.19-768x576.jpeg
   ```

   Both must return `200`. The second is the check that matters most: it proves
   the uploads directory is reachable on the new hostname.

`WP_HOME` and `WP_SITEURL` stay on `www.zeroplastic.lk` at this stage. WordPress
serves the same files under either hostname, which is exactly what is needed.

## Step 2: activate the new origin in the build

Only after step 1 passes. In the Cloudflare Pages project, set:

```
WORDPRESS_MEDIA_URL = https://cms.zeroplastic.lk
```

Leave `WORDPRESS_BASE_URL` unset for now so the build keeps reading the REST API
from `www`, which still works. This separation is deliberate: it lets the image
rewrite be verified in isolation before the API endpoint also moves.

Redeploy, then run `node scripts/preflight.mjs` against the build output, and
spot check that images load on a few blog posts.

## Step 3: move the API read to the CMS hostname

```
WORDPRESS_BASE_URL = https://cms.zeroplastic.lk
```

Redeploy and confirm the build log reports the expected post and media counts.
After this the build no longer depends on `www.zeroplastic.lk` for anything.

## Step 4: point www at Cloudflare Pages

1. Lower the TTL on the `www` record to 300 seconds at least 48 hours ahead.
2. Add `www.zeroplastic.lk` as a custom domain in the Cloudflare Pages project
   and complete its validation.
3. Replace the `www` **A record** at DreamHost with a **CNAME** to the Pages
   hostname. Note that `www` is an A record today, not a CNAME.
4. Verify:

   ```
   curl -sI https://www.zeroplastic.lk/
   curl -sI https://www.zeroplastic.lk/impact-center-premium.html
   curl -s  https://www.zeroplastic.lk/robots.txt
   ```

   `robots.txt` must flip to the indexable production form. If it still reads
   `Disallow: /`, `SITE_URL` is wrong in the Pages project.

## Step 5: the apex, and the Google Ads URL

Leave this until `www` is confirmed healthy.

**The live Google Ads Final URL is on the apex, not on `www`:**

```
https://zeroplastic.lk/impact-center-premium.html
```

That has two consequences worth being deliberate about.

While the apex still points at DreamHost, the ads keep hitting the old static
file on DreamHost. That is a useful safety property during steps 1 to 4: paid
traffic is unaffected by the `www` cutover. It also means the two hosts serve
two copies of that page until the apex moves, so do not edit one and expect the
other to change.

Once the apex redirects to `www`, that URL takes two hops:

1. `zeroplastic.lk/impact-center-premium.html` redirects to
   `www.zeroplastic.lk/impact-center-premium.html`
2. Cloudflare Pages then redirects `.html` to the extension-less path,
   `www.zeroplastic.lk/impact-center-premium`

The second hop is not configurable. Cloudflare Pages canonicalises HTML paths by
default: `/contact.html` is redirected to `/contact` and `/about/index.html` to
`/about/`. This was confirmed against the live staging deployment, where
`/index.html` returns `308` to `/`.

Ads follow redirects, so the campaign keeps working either way. To remove both
hops, update the campaign's Final URL to:

```
https://www.zeroplastic.lk/impact-center-premium
```

Do that in the same change window as the apex redirect, and keep the existing
Final URL suffix so auto-tagging and GCLID are unaffected.

## Open decisions

These are not blockers for the code, but they are still unresolved.

1. **Landing page canonicals.** All 8 pages carry `rel=canonical` pointing at
   `https://zeroplastic.lk/...`, the apex. Once the apex redirects, those
   canonicals point at redirecting URLs. The pages were migrated byte-identical
   on instruction, so this has not been changed.
2. **Em dashes in the landing pages.** 6 of the 8 carry 127 em dashes, 36 of
   them in visible copy on the Google Ads page. They conflict with the house
   style but rewording a live paid landing page is a copy decision, not a
   migration step.
3. **Image weight without Photon.** Photon served WebP; the WordPress origin
   serves the original format. Measured on one representative image at 768px:
   51,470 bytes from Photon versus 73,817 bytes from the origin, about 30% more.
   The origin sends `cache-control: max-age=2592000` and ETags, so repeat views
   are unaffected. Photon could be reinstated later if `WP_SITEURL` moves to
   `cms.zeroplastic.lk` and Jetpack is reconnected there.
4. **The wider redirect map.** `docs/CUTOVER-AUDIT.md` section 12 lists roughly
   450 URLs that still need rules, including `/sitemap_index.xml` and `/feed/`.
   Only the original `/about-5` and `/projects` rules are in `public/_redirects`.
5. **Analytics.** The new site still carries no Google Tag Manager.
6. **Legal pages.** Still Shopify e-commerce boilerplate.
7. **The landing page deploy pipeline.** `zeroplastic-landing-pages` still
   rsyncs to DreamHost on every push. Once these pages are served by Astro,
   that workflow writes to a host that no longer receives this traffic. Decide
   whether to disable it or point it at this repository.

## Rollback

Within step 4, rollback is a single DNS change: put the `www` A record back to
`64.90.54.244` and wait out the 300 second TTL. Nothing in WordPress has changed
at that point, so there is nothing else to undo. This is why `WP_HOME` and
`WP_SITEURL` stay untouched.

---

## Blocker: the Pages API token cannot write project settings

Setting `WORDPRESS_BASE_URL` and `WORDPRESS_MEDIA_URL` on the Pages project
from CI is not currently possible. The stored `CLOUDFLARE_API_TOKEN` can read
the project and list deployments, but a `PATCH` to the project returns:

```
HTTP 403
[{"code":10000,"message":"Authentication error"}]
```

This is the same permission gap that made the old Wrangler deploy workflow
fail, and it is a property of the token, not of the request: the read-only
steps in the same workflow succeed against the same project.

The dry run confirmed exactly what the change would be, so the merge itself is
not in doubt:

| Variable | Before | After |
| --- | --- | --- |
| `BASE_PATH` | `/` | `/` |
| `NODE_VERSION` | `22` | `22` |
| `SITE_URL` | `https://zeroplasticlk.pages.dev` | unchanged |
| `WORDPRESS_BASE_URL` | not set | `https://cms.zeroplastic.lk` |
| `WORDPRESS_MEDIA_URL` | not set | `https://cms.zeroplastic.lk` |

There are no encrypted variables on the project, so nothing would be lost.

Either remedy unblocks it:

1. **Set the two variables in the Cloudflare dashboard**, under the
   `zeroplasticlk` project, Settings, Environment variables, Production. Leave
   `SITE_URL` alone. Then redeploy.
2. **Grant the API token `Cloudflare Pages: Edit`** on this account, then
   re-run the "Cloudflare set CMS origin" workflow with `set`. It reads,
   merges, writes and then reads back to prove nothing else changed.

Until one of those happens, deployed builds keep reading WordPress from
`www.zeroplastic.lk`, which still works today and is the safe default.
