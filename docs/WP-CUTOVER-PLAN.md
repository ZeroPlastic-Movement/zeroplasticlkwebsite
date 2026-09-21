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
