# WordPress URL split: prepared change, test plan and rollback

Applies the configuration agreed in `docs/WP-URL-SPLIT-AUDIT.md`:

```
WP_HOME    = https://www.zeroplastic.lk     (public site, Cloudflare Pages)
WP_SITEURL = https://cms.zeroplastic.lk     (where WordPress actually runs)
```

plus one MU-plugin, because `get_rest_url()` builds from `home_url()` and would
otherwise advertise the REST API on a host that serves no `/wp-json`.

**This change has not been applied.** No DNS, no WordPress, no Google Ads, no
`book.zeroplastic.lk`, no `pos.zeroplastic.lk`.

## Who applies this

Both artefacts live on the WordPress filesystem, so they need SFTP, SSH or the
DreamHost file manager. There is no WordPress REST endpoint that can write
`wp-config.php` or drop a file into `mu-plugins/`, and this session holds no
DreamHost credentials. **The two files have to be placed by hand.** Once they
are in place, `node scripts/verify-wp-cutover.mjs` runs the whole automated
half of the test plan.

## The two files

| Source in this repo | Destination on the server |
| --- | --- |
| `wordpress/mu-plugins/zeroplastic-rest-origin.php` | `wp-content/mu-plugins/zeroplastic-rest-origin.php` |
| `wordpress/wp-config-cutover.txt` | two `define()` lines pasted into `wp-config.php` |

Create `wp-content/mu-plugins/` if it does not exist. Files there load
automatically; there is nothing to activate.

**Order matters.** Upload the MU-plugin first, then edit `wp-config.php`. The
plugin is inert until the constants exist (it returns early when `WP_HOME` and
`WP_SITEURL` are undefined), so uploading it first changes nothing and removes
any window where the REST API points at the wrong host.

## Verified before writing

The filter was unit-tested against real REST URLs. It rewrites only the origin
prefix, so a hostname appearing inside a path or query string is left intact,
which a blanket string replace would have corrupted:

| Input | Output |
| --- | --- |
| `https://www.zeroplastic.lk/wp-json/` | `https://cms.zeroplastic.lk/wp-json/` |
| `.../wp-json/wp/v2/posts?per_page=1&page=2` | same, host swapped, query intact |
| `.../wp/v2/search?search=www.zeroplastic.lk` | host swapped, **search term untouched** |
| already on `cms` | unchanged |
| `impactcenter.zeroplastic.lk` | unchanged |
| `http://` scheme | unchanged (fails safe) |

## Test plan

### Automated

```
node scripts/verify-wp-cutover.mjs
```

It detects whether the split is applied and flips its expectations, so it is
useful before and after. Baseline captured before any change, all green:

```
Detected state: NOT YET APPLIED (siteurl still www)
[PASS] cms /wp-login.php returns 200
[NOTE] cms /wp-admin/ -> 302 https://www.zeroplastic.lk/wp-login.php?...   (the lockout)
[PASS] cms REST posts endpoint returns 200
[PASS] cms admin-ajax.php responds to heartbeat
[PASS] Post permalinks still point at the public site
[PASS] RSS still advertises public URLs
[PASS] front end / loads,  /a-plastic-free-kitchen/ loads
[PASS] Sampled front-end assets all load  7/7
[PASS] No mixed content on the public front end
```

After the change the same script additionally asserts:

- `cms/wp-admin/` no longer bounces to the public host
- REST `_links.self` is on `cms`
- Application Passwords authorize URL is on `cms`
- `home_url()` is still `www`
- post permalinks and RSS are still `www`

### Manual, in a browser

The script holds no WordPress credentials by design. These need a logged-in session:

1. Log in at `https://cms.zeroplastic.lk/wp-login.php`, land on the CMS dashboard.
2. Dashboard loads. Posts list loads.
3. Open a **draft or purpose-made test post**, never a published article. Edit,
   Update, confirm it saves with no error notice.
4. Media Library loads. Upload a small test image. Confirm its URL is on
   `cms.zeroplastic.lk`. Delete it afterwards.
5. DevTools Network: every `/wp-json/` request goes to `cms.zeroplastic.lk`.
6. DevTools Network: `admin-ajax.php` goes to `cms.zeroplastic.lk`.
7. DevTools Console: no CORS errors, no mixed-content warnings.

## Public front end during the window

While `www` still points at DreamHost, `WP_SITEURL=cms` moves the front end's
own assets to `cms`, because `WP_CONTENT_URL` derives from siteurl. So a page
on `www` will pull its CSS, JS and images from `cms`.

Checked in advance, and this is expected to be fine:

- Stylesheets and scripts do not require CORS, so cross-origin loading is
  transparent. Both hosts are HTTPS, so no mixed content.
- The homepage currently pulls 4 stylesheets, 53 scripts and 42 images, all
  from `www` plus Google Fonts, Tag Manager, `i0.wp.com` and the Impact Center.
- **Webfonts were the real risk**, since they are CORS-restricted and
  `cms.zeroplastic.lk` sends no `Access-Control-Allow-Origin`. Confirmed
  harmless here: no stylesheet on the front end declares a self-hosted
  `@font-face`, and the one WordPress font in play, dashicons, is embedded as a
  `data:` URI rather than fetched as a file. Google Fonts is third-party and
  unaffected.

If the front end does visibly break, roll back. It is a two-minute revert and
nothing in the database will have changed.

## Rollback

No database modification is required, because the constants never write to it.

1. Delete `wp-content/mu-plugins/zeroplastic-rest-origin.php`.
2. Remove or comment the two `define()` lines in `wp-config.php`, or restore
   `wp-config.php.bak-before-url-split`.
3. Confirm restoration:
   ```
   node scripts/verify-wp-cutover.mjs     # should report NOT YET APPLIED
   curl -sI https://www.zeroplastic.lk/   # 200
   curl -sI https://www.zeroplastic.lk/wp-admin/   # redirects to www login
   ```

Everyone is logged out once on rollback too, for the same `COOKIEHASH` reason.

Order on the way out is the reverse of the way in: remove the constants first,
then the MU-plugin, so the REST API is never pointed at `cms` while WordPress
believes it lives on `www`.

## Make.com, manual, not automated

Nothing in Make has been changed. Required, once WordPress stops answering on
`www`:

| What | Where | Change |
| --- | --- | --- |
| Scenario **9443572**, "Monday 5029075958 to WordPress blog (Projects)" | HTTP module "WordPress - Upload photo" | URL `https://www.zeroplastic.lk/wp-json/wp/v2/media` to `https://cms.zeroplastic.lk/wp-json/wp/v2/media` |
| Scenario **9443572** | HTTP module "WordPress - Create post" | URL `https://www.zeroplastic.lk/wp-json/wp/v2/posts` to `https://cms.zeroplastic.lk/wp-json/wp/v2/posts` |
| WordPress connection **14586250**, "ZeroPlastic Movement" | Make connections | Base URL to `https://cms.zeroplastic.lk`. Used by scenarios **9792241** and **9792298**. |

Do not touch: connection **14563656** (Impact Center), connection **14414097**
(Commitment Standard), or scenario **9448784**, which posts to
`impactcenter.zeroplastic.lk`.

These can be changed any time between applying the WordPress split and the DNS
cutover. Until `www` stops serving WordPress, both hostnames work, so there is
no rush and no outage either way.

## Explicitly not done

DreamHost stays active. No `www` CNAME. No apex change. No Google Ads change.
No `book.zeroplastic.lk` or `pos.zeroplastic.lk` change. DNS cutover is a
separate, later decision.

---

# Post-change verification (WordPress split applied)

Verified after the constants and MU-plugin went live. The public site is still
on DreamHost; no DNS was changed.

## Automated result

`node scripts/verify-wp-cutover.mjs` reports **SPLIT APPLIED** and all checks pass:

| Check | Result |
| --- | --- |
| `cms/wp-login.php` | 200 |
| `cms/wp-admin/` | 302 to **`cms`** login, no longer to the public host |
| `cms/wp-json/wp/v2/posts` | 200 |
| `cms/wp-admin/admin-ajax.php` | heartbeat returns valid JSON |
| REST `_links.self` | `cms.zeroplastic.lk` |
| Application Passwords authorize | `cms.zeroplastic.lk` |
| `home_url()` | `www.zeroplastic.lk` |
| Post permalinks | `www.zeroplastic.lk` |
| RSS | `www.zeroplastic.lk` |

Media on `cms` serves originals and generated sizes (200, `image/jpeg`), and the
newest upload now records `source_url` on `cms`, confirming `WP_CONTENT_URL`
follows siteurl as predicted.

CORS is a non-issue: the editor runs on `cms` and calls `cms`, so REST is
same-origin. WordPress echoes the request Origin with
`Access-Control-Allow-Credentials: true` when asked cross-origin anyway.

Plugin surface is intact: 43 REST namespaces, 789 routes, valid JSON. Yoast,
Site Kit, Elementor, WPForms, Redirection, Eventin and the MCP adapter all
respond. No PHP notices, warnings or fatals in any response body.

## Regression found and fixed: Photon URLs returned

The first post-split build put **24,594 Jetpack Photon URLs back into the
output**, after months of builds at zero.

Cause: Jetpack builds Photon URLs from whatever `siteurl` currently is. Before
the split it emitted `i0.wp.com/www.zeroplastic.lk/...`; afterwards
`i0.wp.com/cms.zeroplastic.lk/...`. The rewriter in `src/lib/media.ts` matched
the host nested inside a Photon URL against a fixed list that knew `www` and the
apex but not `cms`, so every Photon URL passed through untouched.

Fix: derive that set from the configured origins rather than hardcoding it, so
it follows the CMS wherever it goes. Unit-tested against both the `cms` and the
legacy `www` Photon shapes, a direct `cms` URL, a Photon URL wrapping a foreign
host (left alone) and an unrelated external URL (left alone).

After the fix, a full build is clean again:

```
www/wp-json = 0   www/wp-content = 0   i0.wp.com = 0   cms/wp-content = 37,877
preflight: 15/15
```

This is exactly what the preflight exists to catch, and it would have shipped
broken image URLs into production had the build not been re-run after the
WordPress change.

## Build against the split CMS

| Measure | Result |
| --- | --- |
| Result | success, 727 pages |
| Duration | 4m 14s (faster than the 8m 47s pre-split run) |
| Posts | 658, from `cms.zeroplastic.lk/wp-json/wp/v2` |
| Media manifest | 2,633 items |
| Retries, 4xx, 5xx, cache fallbacks | 0 |

REST pagination from `cms` reports `x-wp-total: 658`, `x-wp-totalpages: 7`.

## The cms root redirect, traced (not changed)

Behaviour depends on the WP-Optimize page cache, which is why it can look
inconsistent:

| Request | Result |
| --- | --- |
| `cms/` served from cache | **200**, full page, `wpo-cache-status: cached`, `canonical` points at `www` |
| `cms/?cachebust=...` (PHP runs) | **301** to `www`, `x-redirect-by: WordPress` |
| `cms/a-plastic-free-kitchen/?cachebust=...` | **200**, no redirect |

So the canonical redirect fires on the front page but not on individual posts,
and cached responses skip it entirely. Backend paths never redirect:
`wp-login.php`, `wp-json`, `admin-ajax.php` and `wp-content/uploads` are all
direct 200 or the expected auth 302 on `cms`.

Not a functional problem, so it has been left alone as instructed. Worth
knowing, though: `cms` currently serves a browsable copy of the site and
`cms/robots.txt` allows crawling, because that file is physically shared with
`www`. The mitigations already in place are that every page carries a canonical
pointing at `www`, and the Yoast sitemap on `cms` lists `www` URLs, so crawlers
following it land on the public site.

If you want that closed later, the right mechanism is an `X-Robots-Tag: noindex`
sent only when the request host is `cms`, not a robots.txt edit, since robots.txt
is shared with the public site.

## Deploy Hook

Not verified, and not verifiable from here. No deploy-hook MU-plugin was ever
installed (only `zeroplastic-rest-origin.php` was added), mu-plugins cannot be
listed remotely, and every Cloudflare deployment on record was triggered by a
git commit rather than a hook.

Treat this as an open item rather than a pass. Two ten-second checks:

1. Cloudflare dashboard, Pages project, Settings, Builds and deployments, Deploy
   hooks: is one defined?
2. On the server: `ls wp-content/mu-plugins/`.

It matters after DNS cutover. Until a hook exists, publishing in WordPress does
not update the public site; only a git push or a manual redeploy does.
