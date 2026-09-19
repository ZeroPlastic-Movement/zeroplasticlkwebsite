// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Both are overridable so the same build can target the production domain or a
// GitHub Pages project subpath without code changes.
//   SITE_URL=https://www.zeroplastic.lk  BASE_PATH=/
//   SITE_URL=https://<org>.github.io     BASE_PATH=/zeroplasticlkwebsite
const SITE_URL = process.env.SITE_URL ?? 'https://www.zeroplastic.lk';
const BASE_PATH = process.env.BASE_PATH ?? '/';

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
    remotePatterns: [{ protocol: 'https', hostname: 'www.zeroplastic.lk' }],
  },
  compressHTML: true,

  // The old WordPress permalinks kept an auto-numbered slug (/about-5/). Redirect
  // rather than drop it, so any existing inbound links and rankings carry over.
  redirects: {
    '/about-5/': '/about/',
    '/projects/': '/blog/',
  },
});
