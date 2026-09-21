# Read-only audit: separating WP_HOME and WP_SITEURL

Question: is it safe to set `WP_HOME=https://www.zeroplastic.lk` and
`WP_SITEURL=https://cms.zeroplastic.lk`?

**Answer: yes, but not on its own.** The split fixes the admin lockout, but it
leaves the REST API advertised on a hostname that will no longer run WordPress,
which breaks the block editor after cutover. One small filter fixes that.

Nothing was changed. No DNS, no wp-config, no WordPress option, no Google Ads,
no `book.zeroplastic.lk`, no `pos.zeroplastic.lk`.

- Date: 2026-09-21
- WordPress reachable at `https://cms.zeroplastic.lk` (same web root as `www`)
- Current state: `home` and `siteurl` are both `https://www.zeroplastic.lk`

## Live test results

| URL | Result |
| --- | --- |
| `https://cms.zeroplastic.lk/wp-login.php` | **200**, login form renders |
| `https://cms.zeroplastic.lk/wp-admin/` | **302** to `https://www.zeroplastic.lk/wp-login.php?redirect_to=...` |
| `https://cms.zeroplastic.lk/wp-json/wp/v2/posts?per_page=1` | **200**, `application/json` |
| `https://cms.zeroplastic.lk/wp-admin/admin-ajax.php` | **400** bare, but `action=heartbeat` returns valid JSON, so it works |

Also checked: `/wp-admin/load-scripts.php` 200, `/xmlrpc.php` 405 (already
disabled), `/wp-admin/authorize-application.php` 302 to `www` (same lockout).

## The decisive finding

Requested through `cms.zeroplastic.lk`, WordPress still generates **`www`** in
every URL it builds:

```
_links.self       https://www.zeroplastic.lk/wp-json/wp/v2/posts/15648
_links.collection https://www.zeroplastic.lk/wp-json/wp/v2/posts
Link: header      <https://www.zeroplastic.lk/wp-json/wp/v2/posts?...&page=2>; rel="next"
post.link         https://www.zeroplastic.lk/zeroplastic-school-club-.../
app passwords     https://www.zeroplastic.lk/wp-admin/authorize-application.php
```

Generated URLs follow the stored options, not the request host. Which option
each one follows is what decides this migration. Confirmed against WordPress
source rather than assumed:

| Derived from | Source |
| --- | --- |
| `WP_CONTENT_URL = get_option('siteurl') . '/wp-content'` | `wp-includes/default-constants.php:176` |
| `COOKIEHASH = md5( siteurl )` | `default-constants.php:249-252` |
| `COOKIEPATH` from `get_option('home')` (path only) | `default-constants.php:304` |
| `SITECOOKIEPATH` from `get_option('siteurl')` (path only) | `default-constants.php:311` |
| `ADMIN_COOKIE_PATH = SITECOOKIEPATH . 'wp-admin'` | `default-constants.php:318` |
| `COOKIE_DOMAIN = ''` (so cookies bind to the requested host) | `default-constants.php:333` |
| **`get_rest_url()` uses `get_home_url()`, not `get_site_url()`** | `get_rest_url()` reference |

That last row is the problem. With `WP_HOME=www`, `rest_url()` stays on `www`,
and after cutover `www` is Cloudflare Pages with no `/wp-json`.

## Item-by-item

| # | Area | Effect of the split | Verdict |
| --- | --- | --- | --- |
| 1 | wp-admin login | `wp_login_url()` uses `site_url()`, so it becomes `cms/wp-login.php`. `auth_redirect()` follows it. The current 302 to `www` disappears. | **Fixed** |
| 2 | Auth cookies | `COOKIE_DOMAIN` is empty, so cookies bind to whichever host served the request, `cms`. `COOKIEPATH` `/`, `ADMIN_COOKIE_PATH` `/wp-admin`. No cross-domain cookie needed, because login and admin are both on `cms`. `COOKIEHASH` is `md5(siteurl)` and siteurl changes, so cookie **names** change and every existing session is invalidated once. | Works, one forced re-login |
| 3 | REST API authentication | Endpoints keep responding on `cms`. But the advertised root and the Application Passwords authorize URL follow `home`, so they point at `www`. Anything that discovers the API rather than being told its address breaks. | **Needs the filter** |
| 4 | Media uploads | `WP_CONTENT_URL` follows **siteurl**, so new uploads get `cms/wp-content/uploads/...`. That is exactly what the Astro build already expects. | **Improves** |
| 5 | Permalinks | `home_url()` is `www`, structure is flat `/%postname%/`, which maps one to one onto the Astro routes. `get_permalink()` returns the real live URL. | **Correct** |
| 6 | Jetpack | Jetpack and Jetpack Boost are active (`jetpack/v4`, `jetpack-boost/v1`, `my-jetpack/v1`). Jetpack identifies a site by its URL, so changing siteurl can trigger safe mode and ask you to confirm whether this is a moved site or a staging copy. Photon is no longer used by the site, so the functional blast radius is small. | **Expect a reconnect prompt** |
| 7 | Cloudflare Deploy Hook MU-plugin | Prepared but never installed, and it reads its hook URL from a wp-config constant. Nothing in it depends on home or siteurl. | No effect |
| 8 | Make.com integrations | See the table below. Two scenarios have the main site's REST URL hardcoded. | **Action needed** |
| 9 | Plugins using `home_url()` | Yoast (sitemaps, canonicals), Redirection, Google Site Kit, WPForms, MailChimp, Eventin. They will emit `www` URLs, which is correct for public links. Site Kit is bound to the property URL in Search Console and may need re-verification. | Mostly correct, watch Site Kit |
| 10 | Plugins using `site_url()` | Elementor, Spectra, Kadence, Astra, Header Footer Elementor, SupportCandy and the admin UI generally use `site_url()`/`admin_url()` for assets and AJAX. These all move to `cms` together, which is consistent. | Consistent |
| 11 | Elementor and legacy frontend | Elementor stores absolute URLs inside `_elementor_data`. Those are page-builder layouts for the old front end, which Cloudflare now serves instead, so they are not rendered to the public. Editing an Elementor page while home and siteurl disagree can still produce mixed URLs. | Low risk, headless |
| 12 | wp-cron | `spawn_cron()` calls `site_url('wp-cron.php')`, so it self-requests on `cms`, which stays on DreamHost. Unaffected by the www move. | No effect |
| 13 | admin-ajax.php | `admin_url()` follows siteurl, so it becomes `cms/wp-admin/admin-ajax.php`. Verified already working there: `action=heartbeat` returned valid JSON. | **Fixed** |
| 14 | Webhook and callback URLs | Anything registered with an external service using a `www` callback keeps pointing at `www`, which will be Cloudflare. Audited below. | **Action needed** |
| 15 | Absolute URLs in content | Sampled the 20 newest posts: the only hosts inside `post_content` are `www.zeroplastic.lk` (2), `impactcenter.zeroplastic.lk` (2) and `www.impactcenter.lk` (1). Media URLs in content are already rewritten to `cms` at build time by `src/lib/media.ts`. No database rewrite is needed. | No action |

## Recommendation

Apply the split **together with** a `rest_url` filter. Without the filter the
block editor calls `https://www.zeroplastic.lk/wp-json/` from `cms`, which after
cutover is a cross-origin request to a host with no REST API: a 404, and a CORS
failure on top.

### 1. wp-config.php

Add these two lines **above** the `/* That's all, stop editing! */` comment:

```php
define( 'WP_HOME',    'https://www.zeroplastic.lk' );
define( 'WP_SITEURL', 'https://cms.zeroplastic.lk' );
```

These constants override the database at runtime. The `home` and `siteurl`
rows in `wp_options` are **not modified**, which is what makes rollback trivial.
Settings, General will show both fields greyed out while the constants exist,
which is expected.

### 2. MU-plugin to keep the REST API on the CMS host

`wp-content/mu-plugins/zeroplastic-rest-origin.php`:

```php
<?php
/**
 * Plugin Name: ZeroPlastic REST origin
 * Description: Keeps the REST API on the CMS hostname while WP_HOME points at the public site.
 */

// get_rest_url() builds from home_url(), which is the public Cloudflare site
// and serves no REST API. Rewrite it to the host WordPress actually runs on.
add_filter( 'rest_url', static function ( $url ) {
    if ( ! defined( 'WP_SITEURL' ) || ! defined( 'WP_HOME' ) ) {
        return $url;
    }
    return str_replace(
        rtrim( WP_HOME, '/' ),
        rtrim( WP_SITEURL, '/' ),
        $url
    );
}, 10, 1 );
```

Install both changes in the same maintenance window, then check, in this order:

1. `https://cms.zeroplastic.lk/wp-admin/` returns the login form rather than
   redirecting to `www`.
2. Log in, open any post in the block editor, make a trivial edit and save.
3. `curl -s https://cms.zeroplastic.lk/wp-json/ | grep -o '"self":[^,]*'`
   should show `cms`, not `www`.
4. Upload a test image and confirm its `source_url` is on `cms`.
5. Re-run the Astro build and `node scripts/preflight.mjs`.

### Immediate rollback

Delete or comment the two `define()` lines and delete the MU-plugin file. That
is the whole rollback. Because the constants never wrote to the database, the
stored options are still `https://www.zeroplastic.lk` for both, so WordPress
returns to exactly its current behaviour on the next request. No database
restore, no search and replace, no cache flush required.

Everyone will be logged out once on the way out as well as on the way in,
because `COOKIEHASH` is derived from siteurl.

### Considered and rejected

Setting **both** `WP_HOME` and `WP_SITEURL` to `https://cms.zeroplastic.lk`
needs no filter and is internally consistent. It was rejected because
`home_url()` would then be `cms`, so permalinks, RSS, oEmbed and the editor's
"View Post" link would all point at a second, crawlable copy of the site on
`cms`, and the canonical redirect that currently sends `cms` traffic to `www`
would stop. It remains a valid zero-code fallback if the MU-plugin is
unwelcome, but it needs `noindex` on `cms` to avoid duplicate content.

## Make.com changes required

| Scenario | ID | What holds a `www` URL | Action |
| --- | --- | --- | --- |
| Monday 5029075958 to WordPress blog (Projects) | 9443572 | Two hardcoded HTTP module URLs: `https://www.zeroplastic.lk/wp-json/wp/v2/media` and `.../wp/v2/posts` | **Change both to `cms.zeroplastic.lk`** |
| ZeroPlastic Website Blog Agent | 9792241 | WordPress connection 14586250 ("ZeroPlastic Movement") | **Re-point the connection to `https://cms.zeroplastic.lk`** |
| Zeroplastic Blog Approval Publisher | 9792298 | Same connection 14586250 | Covered by the connection change |

Not affected, confirmed by inspection:

- 9773691 and 9773634 use WordPress connection 14563656, which is the Impact
  Center site.
- 9448784 posts to `impactcenter.zeroplastic.lk`, hardcoded, unrelated.
- ZPCS Blog connection 14414097 is the Commitment Standard site.
- The landing page webhook scenario 9577352 posts to Make, not to WordPress.

Strictly, the connection change is only required once `www` stops serving
WordPress. Doing it at the same time as the wp-config change keeps everything
on one host and avoids a second window.

## Incidental finding: credentials stored in clear text in Make

Scenario 9443572 stores the `WebEditor` WordPress Application Password in
plain text in two HTTP module configurations, and scenario 9448784 does the
same for an Impact Center account. Any Make user who can open those scenarios
can read them, and they are returned in full by the Make API.

Values are deliberately not reproduced here. Recommended: move them into Make
connections or custom variables rather than module fields, and rotate both
application passwords once the migration settles. This is pre-existing and not
caused by the URL split.
