/**
 * Verify a deployed site over HTTP.
 *
 * Complements scripts/preflight.mjs, which inspects build output on disk. This
 * one checks the deployed origin, so it also catches host behaviour that only
 * appears once Cloudflare Pages is serving: trailing-slash handling, the
 * automatic .html canonicalisation, and redirect rules.
 *
 *   node scripts/verify-staging.mjs https://zeroplasticlk.pages.dev
 */

import { readFileSync, existsSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';

const BASE = (process.argv[2] ?? 'https://zeroplasticlk.pages.dev').replace(/\/$/, '');
const DIST = 'dist';
const CONCURRENCY = 8;

let failures = 0;
function check(name, pass, detail = '') {
  if (!pass) failures++;
  console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? `  ${detail}` : ''}`);
}

async function head(path, { redirect = 'manual' } = {}) {
  const url = path.startsWith('http') ? path : BASE + path;
  try {
    const res = await fetch(url, { method: 'GET', redirect, headers: { 'User-Agent': 'zeroplastic-verify' } });
    return { status: res.status, location: res.headers.get('location'), type: res.headers.get('content-type'), res };
  } catch (error) {
    return { status: 0, error: String(error) };
  }
}

async function pool(items, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (i < items.length) {
        const n = i++;
        out[n] = await fn(items[n], n);
      }
    }),
  );
  return out;
}

/* ---- gather the link graph from the local build ------------------------- */

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const all = existsSync(DIST) ? await walk(DIST) : [];
const htmlFiles = all.filter((f) => f.endsWith('.html'));

const internalPaths = new Set();
for (const f of htmlFiles) {
  const body = readFileSync(f, 'utf8');
  for (const m of body.matchAll(/href="(\/[^"#][^"]*)"/g)) {
    if (!m[1].startsWith('//')) internalPaths.add(m[1].split('#')[0]);
  }
}

/* ---- 1. core pages ------------------------------------------------------ */

const CORE = ['/', '/about/', '/blog/', '/contact/', '/our-work/', '/advocacy/', '/clubs/',
  '/volunteers/', '/sustainable-travel/', '/advisory-board/', '/our-experts/',
  '/problem-statement/', '/privacy-policy/', '/terms-conditions/'];
const core = await pool(CORE, (p) => head(p));
const coreBad = CORE.filter((p, n) => core[n].status !== 200);
check('Core pages return 200', coreBad.length === 0, coreBad.length ? coreBad.join(', ') : `${CORE.length} pages`);

const home = await head('/');
const homeBody = home.res ? await home.res.text() : '';
check('Homepage renders content', /<h1/.test(homeBody) && homeBody.length > 5000, `${homeBody.length} bytes`);

/* ---- 2. blog posts: recent, old, Sinhala -------------------------------- */

const postPaths = htmlFiles
  .filter((f) => {
    const rel = relative(DIST, f);
    const depth = rel.split(/[\\/]/).length;
    return depth === 2 && rel.endsWith('index.html');
  })
  .map((f) => '/' + relative(DIST, f).split(/[\\/]/)[0] + '/');

const SINHALA = /[඀-෿]/;
const sinhala = postPaths.filter((p) => SINHALA.test(decodeURIComponent(p)));
const latin = postPaths.filter((p) => !SINHALA.test(decodeURIComponent(p)));

// "Old" posts: those whose built HTML references 2021/2022 uploads.
const oldPosts = htmlFiles
  .filter((f) => /wp-content\/uploads\/202[12]\//.test(readFileSync(f, 'utf8')))
  .map((f) => '/' + relative(DIST, f).split(/[\\/]/)[0] + '/')
  .filter((p) => p !== '/index.html/');

const sample = (arr, n) => arr.filter((_, i) => i % Math.max(1, Math.floor(arr.length / n)) === 0).slice(0, n);

for (const [label, paths] of [
  ['Recent blog posts', sample(latin, 10)],
  ['Older posts (2021-2022 media)', sample([...new Set(oldPosts)], 8)],
  ['Sinhala posts', sample(sinhala, 5)],
]) {
  if (!paths.length) { check(label, false, 'no sample found'); continue; }
  const r = await pool(paths, (p) => head(encodeURI(p)));
  const bad = paths.filter((p, n) => r[n].status !== 200);
  check(`${label} return 200`, bad.length === 0, bad.length ? bad.slice(0, 3).join(', ') : `${paths.length} sampled`);
}

/* ---- 3. the 8 landing pages + Cloudflare .html behaviour ---------------- */

const LANDING = [
  '/impact-center-premium.html',
  '/craft-experiences-sigiriya.html',
  '/zeroplastic-movement-sri-lanka.html',
  '/es/craft-experiences-sigiriya.html',
  '/fr/craft-experiences-sigiriya.html',
  '/zh-cn/craft-experiences-sigiriya.html',
  '/sigiriya-craft-village/',
  '/sigiriya-sri-lanka/',
];

const landing = await pool(LANDING, (p) => head(p, { redirect: 'follow' }));
const landingBad = LANDING.filter((p, n) => landing[n].status !== 200);
check('All 8 landing pages reachable (following redirects)', landingBad.length === 0,
  landingBad.length ? landingBad.join(', ') : '8/8 serve 200');

console.log('\n  Cloudflare .html canonicalisation:');
for (const p of LANDING.filter((p) => p.endsWith('.html'))) {
  const raw = await head(p);
  const note = raw.status === 200 ? 'served directly' : `${raw.status} -> ${raw.location ?? ''}`;
  console.log(`    ${p.padEnd(42)} ${note}`);
}

const ads = await head('/impact-center-premium.html', { redirect: 'follow' });
const adsBody = ads.res ? await ads.res.text() : '';
check('Google Ads landing page serves its real content', /ZeroPlastic Impact Center/.test(adsBody) && adsBody.length > 50000,
  `${adsBody.length} bytes`);
check('Ads page keeps its conversion webhook', adsBody.includes('hook.eu2.make.com'), '');

/* ---- 3b. images actually load on a deployed post ------------------------ */

// Staging builds with the default WordPress origin unless WORDPRESS_MEDIA_URL
// is set in the Pages project, so this asserts that whatever origin the live
// build chose actually serves its images. It does not assume which host.
{
  const probe = sample(latin, 1)[0] ?? '/';
  const r = await head(encodeURI(probe), { redirect: 'follow' });
  const body = r.res ? await r.res.text() : '';
  const imgs = [...new Set([...body.matchAll(/<img[^>]+src="([^"]+)"/g)].map((m) => m[1]))]
    .filter((u) => u.startsWith('http'))
    .slice(0, 6);
  if (!imgs.length) {
    check('Post images load from the configured origin', false, `no remote images found on ${probe}`);
  } else {
    const res = await pool(imgs, (u) => head(u, { redirect: 'follow' }));
    const bad = imgs.filter((_, n) => res[n].status !== 200);
    const hosts = [...new Set(imgs.map((u) => new URL(u).hostname))].join(', ');
    check('Post images load from the configured origin', bad.length === 0,
      bad.length ? `${bad.length} failed: ${bad[0]}` : `${imgs.length} images from ${hosts}`);
  }
}

/* ---- 4. landing page assets --------------------------------------------- */

const assetPaths = [...new Set(
  all.filter((f) => relative(DIST, f).replace(/\\/g, '/').startsWith('htmlimages/'))
     .map((f) => '/' + relative(DIST, f).replace(/\\/g, '/')),
)];
const assets = await pool(assetPaths, (p) => head(p));
const assetBad = assetPaths.filter((p, n) => assets[n].status !== 200);
check('Landing page assets all load', assetPaths.length > 0 && assetBad.length === 0,
  assetBad.length ? assetBad.slice(0, 3).join(', ') : `${assetPaths.length}/${assetPaths.length}`);

/* ---- 5. every unique internal link -------------------------------------- */

const linkList = [...internalPaths];
const links = await pool(linkList, (p) => head(encodeURI(p), { redirect: 'follow' }));
const brokenLinks = linkList.filter((p, n) => links[n].status !== 200);
check('Zero broken internal links', brokenLinks.length === 0,
  brokenLinks.length ? `${brokenLinks.length} broken, e.g. ${brokenLinks.slice(0, 5).join(', ')}` : `${linkList.length} unique targets checked`);

/* ---- 6. infrastructure --------------------------------------------------- */

for (const [p, want] of [['/sitemap-index.xml', 200], ['/rss.xml', 200], ['/robots.txt', 200], ['/404.html', 404]]) {
  const r = await head(p);
  check(`${p} returns ${want}`, r.status === want, r.status !== want ? `got ${r.status}` : '');
}

for (const [from, to] of [['/about-5', '/about/'], ['/projects', '/blog/']]) {
  const r = await head(from);
  const ok = [301, 302, 307, 308].includes(r.status) && (r.location ?? '').endsWith(to);
  check(`${from} redirects to ${to}`, ok, `${r.status} -> ${r.location ?? 'none'}`);
}

const robots = await head('/robots.txt');
const robotsBody = robots.res ? await robots.res.text() : '';
const isProdHost = /^https:\/\/(www\.)?zeroplastic\.lk$/.test(BASE);
check(
  isProdHost ? 'robots.txt is indexable on production' : 'robots.txt blocks indexing on staging',
  isProdHost ? /Allow: \//.test(robotsBody) && /Sitemap:/.test(robotsBody) : /Disallow: \//.test(robotsBody),
  robotsBody.split('\n').find((l) => /^(Allow|Disallow):/.test(l)) ?? '',
);

/* ---- summary ------------------------------------------------------------- */

console.log(failures === 0 ? '\nAll staging checks passed.' : `\n${failures} check(s) failed.`);
process.exit(failures === 0 ? 0 : 1);
