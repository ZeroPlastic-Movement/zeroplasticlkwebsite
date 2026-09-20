import type { APIContext } from 'astro';

import { SITE } from '../consts';

/**
 * robots.txt is generated rather than static so that a staging deployment can
 * never be indexed.
 *
 * Only the real production hostnames get an indexable robots.txt. Any other
 * host — a pages.dev preview, a branch deployment, a local build — is served
 * "Disallow: /", which stops Google indexing a duplicate copy of the site and
 * competing with zeroplastic.lk in search results.
 *
 * Note this is the opposite of the live WordPress robots.txt, which sets
 * "Crawl-delay: 10". That throttles crawlers honouring it (Bing, Yandex) to one
 * page every ten seconds — roughly two hours for a full pass of ~700 URLs — so
 * it is deliberately not carried over.
 */

const PRODUCTION_HOSTS = new Set(['zeroplastic.lk', 'www.zeroplastic.lk']);

export function GET(context: APIContext) {
  const site = context.site ?? new URL(SITE.url);
  const isProduction = PRODUCTION_HOSTS.has(site.hostname);

  const body = isProduction
    ? `# ${SITE.name} — ${site.origin}

User-agent: *
Allow: /

# Admin and internal WordPress paths remain closed.
Disallow: /wp-admin/
Disallow: /wp-includes/
Disallow: /wp-json/
Disallow: /admin/
Disallow: /includes/
Disallow: /config/
Disallow: /logs/
Disallow: /backup/
Disallow: /.env

Sitemap: ${new URL('sitemap-index.xml', site).href}
`
    : `# Staging / preview deployment (${site.origin}) — not for indexing.
# The production site is ${SITE.url}

User-agent: *
Disallow: /
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
