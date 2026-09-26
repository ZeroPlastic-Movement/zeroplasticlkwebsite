/**
 * Pre-cutover preflight.
 *
 * Verifies the built site in dist/ against the conditions that have to hold
 * before www.zeroplastic.lk is pointed at Cloudflare Pages. Read-only: it
 * inspects build output and never touches a remote system.
 *
 *   node scripts/preflight.mjs
 */

import { readFileSync, existsSync, statSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { join, relative, posix } from 'node:path';

const DIST = 'dist';
const results = [];

function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${name}${detail ? `  ${detail}` : ''}`);
}

async function walk(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(full)));
    else out.push(full);
  }
  return out;
}

const all = await walk(DIST);
const htmlFiles = all.filter((f) => f.endsWith('.html'));
const htmlCache = new Map();
const read = (f) => {
  if (!htmlCache.has(f)) htmlCache.set(f, readFileSync(f, 'utf8'));
  return htmlCache.get(f);
};

/* 1. pages built ---------------------------------------------------------- */

check('Site builds a full page set', htmlFiles.length > 700, `${htmlFiles.length} HTML files`);

/* 2 & 3. representative and Sinhala posts --------------------------------- */

const SINHALA = /[඀-෿]/;
const sinhalaPages = htmlFiles.filter((f) => SINHALA.test(decodeURIComponent(f)));
check('Sinhala-slug post renders', sinhalaPages.length > 0, `${sinhalaPages.length} page(s)`);

if (sinhalaPages.length) {
  const body = read(sinhalaPages[0]);
  check(
    'Sinhala post has a title and body',
    /<h1[^>]*>[^<]/.test(body) && body.length > 4000,
    `${relative(DIST, sinhalaPages[0])} (${body.length} bytes)`,
  );
}

const oldPosts = htmlFiles.filter((f) => {
  const body = read(f);
  return /wp-content\/uploads\/20(2[0-3])\//.test(body);
});
check('Older WordPress posts render with their media', oldPosts.length > 50, `${oldPosts.length} pages reference 2020-2023 uploads`);

/* 4. no dependency on www.zeroplastic.lk as the WordPress origin ----------- */

const WP_ORIGIN_DEP = /https?:\/\/(?:www\.)?zeroplastic\.lk\/wp-(?:content|includes)\//g;
const PHOTON = /https?:\/\/i[0-9]\.wp\.com\//g;

let originRefs = 0;
let photonRefs = 0;
const offenders = new Set();
for (const f of [...htmlFiles, ...all.filter((f) => /\.(xml|json|txt)$/.test(f))]) {
  const body = read(f);
  const o = body.match(WP_ORIGIN_DEP)?.length ?? 0;
  const p = body.match(PHOTON)?.length ?? 0;
  if (o || p) offenders.add(relative(DIST, f));
  originRefs += o;
  photonRefs += p;
}
check(
  'No image URLs depend on www.zeroplastic.lk as the WordPress origin',
  originRefs === 0,
  originRefs ? `${originRefs} refs in ${offenders.size} files, e.g. ${[...offenders][0]}` : '',
);
check('No Jetpack Photon URLs remain', photonRefs === 0, photonRefs ? `${photonRefs} refs` : '');

/* srcset descriptors survived --------------------------------------------- */

let descriptorPages = 0;
let brokenSrcset = 0;
for (const f of htmlFiles) {
  for (const m of read(f).matchAll(/srcset="([^"]+)"/g)) {
    const parts = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    const withDescriptor = parts.filter((p) => /\s\d+(w|x)$/.test(p));
    if (parts.length > 1) {
      descriptorPages++;
      if (withDescriptor.length !== parts.length) brokenSrcset++;
    }
  }
}
check(
  'Responsive width descriptors preserved',
  descriptorPages > 0 && brokenSrcset === 0,
  `${descriptorPages} srcset attributes, ${brokenSrcset} malformed`,
);

/* 5 & 6. static landing pages --------------------------------------------- */

const LANDING = [
  'impact-center-premium.html',
  'craft-experiences-sigiriya.html',
  'zeroplastic-movement-sri-lanka.html',
  'es/craft-experiences-sigiriya.html',
  'fr/craft-experiences-sigiriya.html',
  'zh-cn/craft-experiences-sigiriya.html',
  'sigiriya-craft-village/index.html',
  'sigiriya-sri-lanka/index.html',
];
const missingLanding = LANDING.filter((p) => !existsSync(join(DIST, p)));
check('All 8 static landing pages present', missingLanding.length === 0, missingLanding.join(', '));

// This page is the Final URL of a live Google Ads campaign, so what matters is
// that the parts the campaign depends on survive an edit, not that the file is
// a particular number of bytes. A size assertion failed on every legitimate
// change and said nothing about whether the page still worked.
const ads = join(DIST, 'impact-center-premium.html');
const adsExists = existsSync(ads);
const adsBody = adsExists ? read(ads) : '';
const adsParts = [
  ['page present', adsExists],
  ['Ads conversion label', adsBody.includes('AW-17612444693/ioVgCNSlpdgcEJWoos5B')],
  ['GTM container', adsBody.includes('GTM-N85V5638')],
  ['enquiry form posts to its endpoint', /<form[^>]+id="visitForm"[^>]+action="https:\/\/hook\.[^"]+"/.test(adsBody)],
  ['conversion fires on a sent enquiry', /function showSent\(\)\{\s*reportConversion\(\);/.test(adsBody)],
];
const adsMissing = adsParts.filter(([, ok]) => !ok).map(([name]) => name);
check(
  'Google Ads landing page intact',
  adsMissing.length === 0,
  adsMissing.length
    ? `missing: ${adsMissing.join(', ')}`
    : `${adsParts.length} checks, ${adsExists ? statSync(ads).size : 0} bytes`,
);

const htmlImages = all.filter((f) => f.includes(`${posix.sep}htmlimages${posix.sep}`) || f.includes('/htmlimages/'));
check('Landing page images present', htmlImages.length >= 21, `${htmlImages.length} files`);

/* 7. internal links -------------------------------------------------------- */

const distPaths = new Set(
  all.map((f) => '/' + relative(DIST, f).split(/[\\/]/).join('/')),
);
function resolves(p) {
  const clean = decodeURIComponent(p.split('#')[0].split('?')[0]);
  if (clean === '/' ) return distPaths.has('/index.html');
  if (distPaths.has(clean)) return true;
  if (distPaths.has(clean.replace(/\/$/, '') + '/index.html')) return true;
  if (distPaths.has(clean + '/index.html')) return true;
  // Cloudflare Pages serves foo.html at the extensionless /foo and 308s
  // /foo.html to it, so a link to the clean URL is not broken. This is how
  // /volunteer-sri-lanka resolves to volunteer-sri-lanka.html.
  if (distPaths.has(clean + '.html')) return true;
  return false;
}

const broken = new Map();
for (const f of htmlFiles) {
  for (const m of read(f).matchAll(/href="(\/[^"#][^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith('//')) continue;
    if (!resolves(href)) {
      if (!broken.has(href)) broken.set(href, new Set());
      broken.get(href).add(relative(DIST, f));
    }
  }
}
check(
  'No broken internal links',
  broken.size === 0,
  broken.size ? [...broken.entries()].slice(0, 5).map(([h, s]) => `${h} (${s.size} pages)`).join('; ') : '',
);

/* 8. redirects ------------------------------------------------------------- */

const redirectsFile = join(DIST, '_redirects');
const redirects = existsSync(redirectsFile) ? readFileSync(redirectsFile, 'utf8') : '';
const expected = ['/about-5', '/about-5/', '/projects', '/projects/'];
const present = expected.filter((r) => new RegExp(`^${r.replace(/\//g, '\\/')}\\s`, 'm').test(redirects));
check('Existing redirects intact', present.length === expected.length, `${present.length}/${expected.length} rules`);

/* 9 & 10. untouched systems ------------------------------------------------ */

// book. and pos. are separate live systems that the migration must not touch.
// The two Sigiriya landing pages already linked to the booking system before
// this migration and are carried over byte-identical, so those links are
// expected. What must hold is that nothing Astro generates points at them, and
// that no new reference is introduced.
//
// coconut-shell-lamp-workshop-sigiriya/index.html is the one deliberate
// exception: it intentionally embeds the centralized booking widget
// (book.zeroplastic.lk/widget.js). Allowed here only, not added to LANDING
// itself, so it stays subject to the page-count and em-dash checks below.
const BOOKING_REFERENCE_ALLOWED = [...LANDING, 'coconut-shell-lamp-workshop-sigiriya/index.html'];
const landingPaths = new Set(BOOKING_REFERENCE_ALLOWED.map((p) => join(DIST, p)));
for (const host of ['book.zeroplastic.lk', 'pos.zeroplastic.lk']) {
  const hits = all.filter((f) => /\.(html|xml|txt|json|js|css)$/.test(f) && read(f).includes(host));
  const fromAstro = hits.filter((f) => !landingPaths.has(f));
  check(
    `${host} is not referenced by anything the migration generates`,
    fromAstro.length === 0,
    fromAstro.length
      ? fromAstro.map((f) => relative(DIST, f)).join(', ')
      : hits.length
        ? `${hits.length} pre-existing link(s) inside migrated landing pages, unchanged`
        : 'no references at all',
  );
}

/* 11. em dashes ------------------------------------------------------------ */

// The 8 migrated landing pages are carried over byte-identical from the
// zeroplastic-landing-pages repo, so they are reported separately. They were
// authored outside the house style, and rewording the live Google Ads landing
// page is a deliberate copy change rather than part of a migration.
const EM_DASH = '\u2014';
const landingSet = new Set(LANDING.map((p) => join(DIST, p)));
const emDashAstro = htmlFiles.filter((f) => !landingSet.has(f) && read(f).includes(EM_DASH));
const emDashLanding = htmlFiles.filter((f) => landingSet.has(f) && read(f).includes(EM_DASH));

check(
  'No em dash characters in Astro-generated content',
  emDashAstro.length === 0,
  emDashAstro.length ? `${emDashAstro.length} pages, e.g. ${relative(DIST, emDashAstro[0])}` : '',
);

if (emDashLanding.length) {
  const total = emDashLanding.reduce(
    (n, f) => n + read(f).split(EM_DASH).length - 1,
    0,
  );
  console.log(
    `[NOTE] ${emDashLanding.length} migrated landing page(s) carry ${total} em dashes, ` +
      'preserved byte-identical from the source repo. Rewording them is a separate decision.',
  );
}

/* summary ------------------------------------------------------------------ */

const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log('\nFailed:');
  for (const f of failed) console.log(`  - ${f.name}${f.detail ? `: ${f.detail}` : ''}`);
  process.exit(1);
}
