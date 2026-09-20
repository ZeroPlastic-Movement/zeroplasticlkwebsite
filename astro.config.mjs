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

export default defineConfig({
  site: SITE_URL,
  base: BASE_PATH,
  trailingSlash: 'always',
  output: 'static',
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/404'),
      changefreq: 'weekly',
      lastmod: new Date(),
    }),
  ],
  build: {
    inlineStylesheets: 'auto',
    format: 'directory',
  },
  image: {
    // Featured images still live on the WordPress install; allow Astro to
    // reference them and let WordPress serve its pre-generated size variants.
    remotePatterns: [
      { protocol: 'https', hostname: 'www.zeroplastic.lk' },
      // Jetpack Photon CDN, where WordPress actually serves uploads from.
      { protocol: 'https', hostname: 'i0.wp.com' },
    ],
  },
  compressHTML: true,

  // The old WordPress permalinks kept an auto-numbered slug (/about-5/). Redirect
  // rather than drop it, so any existing inbound links and rankings carry over.
  redirects: {
    '/about-5/': '/about/',
    '/projects/': '/blog/',
  },
});
