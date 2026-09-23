/**
 * Legacy .html URL compatibility for the migrated landing pages.
 *
 * Cloudflare Pages canonicalises HTML paths: it answers /foo.html with a 308
 * to /foo, and /foo/index.html with a 308 to /foo/. That is fine for pages
 * nobody has linked to, but these eight landing pages were served directly at
 * their .html URLs on DreamHost for years, and one of them,
 * /impact-center-premium.html, is the Final URL of a live Google Ads campaign.
 * Those URLs are frozen, so they have to keep answering 200 themselves.
 *
 * Pages Functions run ahead of static asset serving, so a Function on exactly
 * these paths intercepts the request before the canonicalisation happens. It
 * then asks the asset server for the canonical path and returns that body
 * under the original URL, with no Location header.
 *
 * Scope is deliberately tight. public/_routes.json lists only these paths, so
 * every other request on the site is still served straight from static assets
 * with no Function invocation at all.
 *
 * Query strings survive for free: nothing redirects, so the browser keeps the
 * URL it asked for, including ?utm_source=... and the Google click ID.
 */

/** The only paths this Function is meant to answer. Must match public/_routes.json. */
const LEGACY_HTML_PATHS = new Set([
  '/impact-center-premium.html',
  '/craft-experiences-sigiriya.html',
  '/zeroplastic-movement-sri-lanka.html',
  '/es/craft-experiences-sigiriya.html',
  '/fr/craft-experiences-sigiriya.html',
  '/zh-cn/craft-experiences-sigiriya.html',
  '/sigiriya-craft-village/index.html',
  '/sigiriya-sri-lanka/index.html',
  // Monday.com redirects to these two after a form submission, and the URLs
  // are configured in forms we do not control, so they answer 200 themselves
  // rather than bouncing the person through a redirect.
  '/thank-you-contact.html',
  '/thank-you-volunteer.html',
]);

/** The path Cloudflare Pages actually serves this asset from. */
function canonicalPath(pathname) {
  if (pathname.endsWith('/index.html')) return pathname.slice(0, -'index.html'.length);
  if (pathname.endsWith('.html')) return pathname.slice(0, -'.html'.length);
  return pathname;
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  // Anything not on the legacy list is served exactly as it would have been.
  if (!LEGACY_HTML_PATHS.has(url.pathname)) {
    return env.ASSETS.fetch(request);
  }

  const target = new URL(url);
  target.pathname = canonicalPath(url.pathname);

  let response = await env.ASSETS.fetch(new Request(target, request));

  // Defensive: if the asset server still answers with a redirect, follow it
  // once so the caller never sees a 3xx on a frozen URL.
  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (location) {
      response = await env.ASSETS.fetch(new Request(new URL(location, url), request));
    }
  }

  if (response.status >= 300 && response.status < 400) {
    // Give up rewriting rather than emit a redirect from a frozen URL.
    return new Response('Landing page temporarily unavailable', { status: 502 });
  }

  // Rebuild the response so no Location header can survive, and so the status
  // is unambiguously the asset's own.
  const headers = new Headers(response.headers);
  headers.delete('location');
  headers.set('x-legacy-html-route', '1');

  return new Response(response.body, { status: response.status, headers });
}
