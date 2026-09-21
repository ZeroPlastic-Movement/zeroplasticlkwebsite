/**
 * Verify the WordPress URL split, before and after it is applied.
 *
 * Read-only over HTTP. Run it once before the change to capture a baseline and
 * again afterwards; the expectations flip and the script says which state it
 * thinks WordPress is in.
 *
 *   node scripts/verify-wp-cutover.mjs
 *
 * Checks that cannot be done without a browser session (block editor save,
 * Media Library upload, DevTools console) are listed at the end as manual
 * steps, because this script has no WordPress credentials and does not want any.
 */

const CMS = 'https://cms.zeroplastic.lk';
const PUBLIC_SITE = 'https://www.zeroplastic.lk';

let failures = 0;
let warnings = 0;

function check(name, pass, detail = '') {
  if (!pass) failures++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? `  ${detail}` : ''}`);
}
function note(name, detail) {
  console.log(`[NOTE] ${name}${detail ? `  ${detail}` : ''}`);
}
function warn(name, detail) {
  warnings++;
  console.log(`[WARN] ${name}${detail ? `  ${detail}` : ''}`);
}

async function req(url, { method = 'GET', redirect = 'manual', body, headers } = {}) {
  try {
    const res = await fetch(url, {
      method,
      redirect,
      body,
      headers: { 'User-Agent': 'zeroplastic-wp-verify', ...headers },
    });
    return { status: res.status, location: res.headers.get('location'), res };
  } catch (error) {
    return { status: 0, error: String(error) };
  }
}

const host = (u) => {
  try {
    return new URL(u).host;
  } catch {
    return '(unparseable)';
  }
};

console.log(`CMS    : ${CMS}\nPUBLIC : ${PUBLIC_SITE}\n`);

/* ---- what state is WordPress in? ---------------------------------------- */

const rootRes = await req(`${CMS}/wp-json/`);
let root = null;
try {
  root = rootRes.res ? await rootRes.res.json() : null;
} catch {
  /* handled below */
}

if (!root) {
  check('REST root readable', false, `HTTP ${rootRes.status}`);
  process.exit(1);
}

const restSelf = root?._links?.self?.[0]?.href ?? root?.routes?.['/']?._links?.self?.[0]?.href ?? '';
const applied = host(root.url) === 'cms.zeroplastic.lk';
console.log(
  `Detected state: ${applied ? 'SPLIT APPLIED (siteurl on cms)' : 'NOT YET APPLIED (siteurl still www)'}\n`,
);

/* ---- 1. the four URLs ---------------------------------------------------- */

const login = await req(`${CMS}/wp-login.php`);
check('cms /wp-login.php returns 200', login.status === 200, `${login.status}`);

const admin = await req(`${CMS}/wp-admin/`);
const adminGoesToPublic = (admin.location ?? '').startsWith(PUBLIC_SITE);
if (applied) {
  check('cms /wp-admin/ does not bounce to the public host', !adminGoesToPublic,
    `${admin.status}${admin.location ? ` -> ${admin.location}` : ''}`);
} else {
  note('cms /wp-admin/ (pre-change, bounce to www expected)',
    `${admin.status}${admin.location ? ` -> ${admin.location}` : ''}`);
}

const posts = await req(`${CMS}/wp-json/wp/v2/posts?per_page=1`);
check('cms REST posts endpoint returns 200', posts.status === 200, `${posts.status}`);

const ajax = await req(`${CMS}/wp-admin/admin-ajax.php`, {
  method: 'POST',
  body: 'action=heartbeat',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
});
let ajaxJson = null;
try {
  ajaxJson = ajax.res ? await ajax.res.json() : null;
} catch {
  /* not json */
}
check('cms admin-ajax.php responds to heartbeat', ajaxJson !== null && 'server_time' in (ajaxJson ?? {}),
  ajaxJson ? `server_time present` : `HTTP ${ajax.status}, non-JSON`);

/* ---- 2. which host does WordPress advertise for what? -------------------- */

console.log('\n  Generated URL hosts:');
const authorize = root?.authentication?.['application-passwords']?.endpoints?.authorization ?? '';
const rows = [
  ['home  (public site)', root.home, 'www.zeroplastic.lk'],
  ['url   (siteurl)', root.url, applied ? 'cms.zeroplastic.lk' : 'www.zeroplastic.lk'],
  ['REST _links.self', restSelf, applied ? 'cms.zeroplastic.lk' : 'www.zeroplastic.lk'],
  ['app-passwords authorize', authorize, applied ? 'cms.zeroplastic.lk' : 'www.zeroplastic.lk'],
];
for (const [label, value, expected] of rows) {
  const got = host(value);
  console.log(`    ${label.padEnd(26)} ${got}${got === expected ? '' : `   (expected ${expected})`}`);
}

if (applied) {
  check('REST API is advertised on the CMS host', host(restSelf) === 'cms.zeroplastic.lk', host(restSelf));
  check('home_url stays on the public host', host(root.home) === 'www.zeroplastic.lk', host(root.home));
  check('Application Passwords authorize URL is on the CMS host',
    host(authorize) === 'cms.zeroplastic.lk', host(authorize));
}

/* ---- 3. permalinks and feeds must stay public ---------------------------- */

const one = await req(`${CMS}/wp-json/wp/v2/posts?per_page=1&_fields=link,slug`);
let post = null;
try {
  post = one.res ? (await one.res.json())[0] : null;
} catch {
  /* ignore */
}
if (post) {
  check('Post permalinks still point at the public site',
    host(post.link) === 'www.zeroplastic.lk', post.link);
} else {
  check('Post permalinks readable', false, `HTTP ${one.status}`);
}

const feed = await req(`${PUBLIC_SITE}/feed/`);
if (feed.status === 200) {
  const xml = await feed.res.text();
  const firstLink = xml.match(/<link>([^<]+)<\/link>/)?.[1] ?? '';
  check('RSS still advertises public URLs', host(firstLink) === 'www.zeroplastic.lk', firstLink);
} else {
  note('RSS feed', `HTTP ${feed.status} (WordPress feed; will be replaced by /rss.xml after DNS)`);
}

/* ---- 4. public WordPress front end during the transition ----------------- */

console.log('\n  Public WordPress front end (www still on DreamHost):');
const pages = ['/', '/a-plastic-free-kitchen/'];
for (const p of pages) {
  const r = await req(`${PUBLIC_SITE}${p}`, { redirect: 'follow' });
  check(`front end ${p} loads`, r.status === 200, `${r.status}`);
}

const homeRes = await req(`${PUBLIC_SITE}/`, { redirect: 'follow' });
const html = homeRes.res ? await homeRes.res.text() : '';

const assets = {
  css: [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*href=["']([^"']+)["']/g)].map((m) => m[1]),
  js: [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/g)].map((m) => m[1]),
  img: [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/g)].map((m) => m[1]),
};

for (const [kind, list] of Object.entries(assets)) {
  const abs = [...new Set(list.filter((u) => u.startsWith('http')))];
  const hosts = [...new Set(abs.map(host))];
  console.log(`    ${kind.padEnd(4)} ${abs.length} absolute refs from: ${hosts.join(', ') || '(none)'}`);
}

// Fetch a sample of each asset type and confirm it still serves.
const sample = [
  ...new Set([
    ...assets.css.filter((u) => u.startsWith('http')).slice(0, 3),
    ...assets.js.filter((u) => u.startsWith('http')).slice(0, 3),
    ...assets.img.filter((u) => u.startsWith('http')).slice(0, 3),
  ]),
];
let assetBad = 0;
for (const u of sample) {
  const r = await req(u, { redirect: 'follow' });
  if (r.status !== 200) {
    assetBad++;
    console.log(`      MISS ${r.status} ${u}`);
  }
  await new Promise((r2) => setTimeout(r2, 300));
}
check('Sampled front-end assets all load', assetBad === 0, `${sample.length - assetBad}/${sample.length}`);

// Mixed content: an https page must not pull http subresources.
const httpRefs = [...assets.css, ...assets.js, ...assets.img].filter((u) => u.startsWith('http://'));
check('No mixed content on the public front end', httpRefs.length === 0,
  httpRefs.length ? httpRefs.slice(0, 3).join(', ') : 'all subresources https');

// Cross-origin webfonts would need CORS headers, which DreamHost does not send.
const fontRefs = [...html.matchAll(/https?:\/\/[^"')]+\.(?:woff2?|ttf|otf|eot)/g)].map((m) => m[0]);
const crossOriginFonts = fontRefs.filter((u) => host(u) !== 'www.zeroplastic.lk' && !host(u).includes('gstatic'));
if (crossOriginFonts.length) {
  warn('Cross-origin self-hosted fonts referenced', `${crossOriginFonts.length}, e.g. ${crossOriginFonts[0]}`);
} else {
  check('No cross-origin self-hosted webfonts to break', true,
    'dashicons ships as a data: URI, Google Fonts is external');
}

/* ---- manual steps -------------------------------------------------------- */

console.log(`\n${failures === 0 ? 'All automated checks passed.' : `${failures} automated check(s) failed.`}`);
if (warnings) console.log(`${warnings} warning(s).`);
console.log(`
Manual, browser-only (this script holds no WordPress credentials):
  1. Log in at ${CMS}/wp-login.php and confirm you land on the CMS dashboard.
  2. Dashboard loads, Posts list loads.
  3. Open a DRAFT or test post (never a published article), edit, Update, and
     confirm it saves without an error notice.
  4. Media Library loads; upload a small test image; confirm its URL is on
     cms.zeroplastic.lk, then delete it.
  5. DevTools Network: every /wp-json/ request goes to cms.zeroplastic.lk.
  6. DevTools Network: admin-ajax.php requests go to cms.zeroplastic.lk.
  7. DevTools Console: no CORS errors and no mixed-content warnings.
`);

process.exit(failures === 0 ? 0 : 1);
