// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

/**
 * Absolute URLs (canonicals, sitemap, RSS, social cards) need to know where the
 * site is being served from. Resolution order:
 *
 *   1. SITE_URL          — set this explicitly in Cloudflare Pages / CI.
 *   2. CF_PAGES_URL      — injected automatically by Cloudflare Pages, so a
 *                          pages.dev deployment is correct without anyone
 *                          hardcoding the generated hostname.
 *   3. the production domain, as a last resort for local builds.
 */
const SITE_URL = process.env.SITE_URL || process.env.CF_PAGES_URL || 'https://www.zeroplastic.lk';
const BASE_PATH = process.env.BASE_PATH || '/';

/**
 * WordPress origin, mirrored from src/consts.ts.
 *
 * Only needed here so Astro's image service will accept remote URLs from the
 * CMS host. Keep the default in step with WP_ORIGIN_FALLBACK in src/consts.ts.
 */
const WP_HOSTS = [
  process.env.WORDPRESS_MEDIA_URL,
  process.env.WORDPRESS_BASE_URL,
  'https://www.zeroplastic.lk',
]
  .flatMap((value) => (value ? [new URL(value).hostname] : []));

/**
 * Static landing pages that live in public/ rather than as Astro routes.
 *
 * They are plain HTML deployed straight into the old web root, so the sitemap
 * integration cannot discover them. /impact-center-premium.html is the Final
 * URL of a live Google Ads campaign, so it matters that it is listed.
 */
const STATIC_LANDING_PAGES = [
  // Listed without the .html suffix because that is the canonical URL this
  // page declares, and the one Cloudflare Pages serves at HTTP 200.
  '/volunteer-sri-lanka',
  '/impact-center-premium.html',
  '/craft-experiences-sigiriya.html',
  '/zeroplastic-movement-sri-lanka.html',
  '/es/craft-experiences-sigiriya.html',
  '/fr/craft-experiences-sigiriya.html',
  '/zh-cn/craft-experiences-sigiriya.html',
  '/sigiriya-craft-village/',
  '/sigiriya-sri-lanka/',
];

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    sitemap({
      // The thank-you pages are form confirmations: noindex, not linked from
      // navigation, and reachable only by redirect after a submission.
      filter: (page) => !page.includes('/404') && !page.includes('/thank-you-'),
      changefreq: 'weekly',
      lastmod: new Date(),
      customPages: STATIC_LANDING_PAGES.map((path) => new URL(path, SITE_URL).href),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  image: {
    // Featured images still live on the WordPress install; allow Astro to
    // reference them and let WordPress serve its pre-generated size variants.
    // Photon (i*.wp.com) is deliberately absent: media is rewritten to the
    // WordPress origin at build time, see src/lib/media.ts.
    remotePatterns: [...new Set(WP_HOSTS)].map((hostname) => ({
      protocol: 'https',
      hostname,
    })),
  },
  compressHTML: true,

  // The old WordPress permalinks kept an auto-numbered slug (/about-5/). Redirect
  // rather than drop it, so any existing inbound links and rankings carry over.
  redirects: {
    '/about-5/': '/about/',
    '/projects/': '/blog/',
  },
});
