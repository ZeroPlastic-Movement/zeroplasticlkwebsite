/**
 * GET /api/place-reviews
 *
 * Google rating and reviews for the ZeroPlastic Impact Center in Sigiriya,
 * fetched server side so the Places API key never reaches the browser. The
 * landing page calls this from the same origin and gets back only the handful
 * of fields it renders.
 *
 * Environment:
 *   GOOGLE_PLACES_API_KEY   Places API (New) key, stored as an encrypted
 *                           Cloudflare Pages secret. Restrict it to the Places
 *                           API in the Google Cloud console: this is a server
 *                           side call, so an HTTP referrer restriction would
 *                           not apply to it.
 *
 * The page ships with a static rating, count and review cards and treats this
 * endpoint purely as an enhancement, so every failure here is answered with a
 * status the page can ignore rather than anything it has to render.
 */

/** The Impact Center listing. Public information; it is not a secret. */
const PLACE_ID = 'ChIJ2X-VEHil_DoR4fvp9VnczS0';

/**
 * Only the fields the page renders. The field mask is not optional: it decides
 * which billing SKU the call lands in, and asking for everything would both
 * cost more and hand the browser data it has no use for.
 */
const FIELD_MASK = 'displayName,rating,userRatingCount,reviews,googleMapsUri';

/** Twelve hours, as agreed. Long enough to make the call rare, short enough that a new review shows up the same day. */
const CACHE_SECONDS = 12 * 60 * 60;

/** Browsers may hold it for an hour; the edge holds the full twelve. */
const BROWSER_CACHE_SECONDS = 60 * 60;

/** Google is normally fast. If it is not, the page has its static copy already. */
const UPSTREAM_TIMEOUT_MS = 6000;

/** Places returns at most five reviews and does not let the caller choose which. */
const MAX_REVIEWS = 5;

function json(status, payload, cacheSeconds) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': cacheSeconds
        ? `public, max-age=${BROWSER_CACHE_SECONDS}, s-maxage=${cacheSeconds}`
        : 'no-store',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Trim, coerce and cap, so nothing unbounded is passed on to the page. */
function field(value, max) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

/**
 * Reduce a Places review to what the card shows.
 *
 * The review text is passed through unchanged apart from a length cap well
 * above any realistic review: Google's terms do not allow rewriting or
 * paraphrasing what somebody wrote. Author name and the relative time come
 * along with it because attribution is required, not decorative.
 */
function normaliseReview(review) {
  if (!review || typeof review !== 'object') return null;

  const author = review.authorAttribution || {};
  const text = field((review.text && review.text.text) || '', 1200);
  const name = field(author.displayName || '', 120);
  if (!text || !name) return null;

  return {
    author: name,
    authorUri: field(author.uri || '', 500),
    photoUri: field(author.photoUri || '', 500),
    rating: typeof review.rating === 'number' ? review.rating : null,
    relativeTime: field(review.relativePublishTimeDescription || '', 60),
    publishTime: field(review.publishTime || '', 40),
    uri: field(review.googleMapsUri || '', 500),
    text,
  };
}

async function fetchPlace(apiKey) {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(PLACE_ID)}`;

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream;
  try {
    upstream = await fetch(url, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': FIELD_MASK,
      },
      signal: abort.signal,
    });
  } finally {
    clearTimeout(timer);
  }

  if (!upstream.ok) {
    // The upstream body can name the key or the project, so only the status
    // is ever logged and nothing from it reaches the browser.
    throw new Error(`places_http_${upstream.status}`);
  }

  return upstream.json();
}

export async function onRequestGet(context) {
  const { request, env, waitUntil } = context;

  // A stable key, so the query string a visitor arrives with cannot fragment
  // the cache or be used to force a fresh upstream call.
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/place-reviews', request.url).toString(), {
    method: 'GET',
  });

  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const apiKey = env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.log('place-reviews: GOOGLE_PLACES_API_KEY is not configured');
    return json(503, { ok: false, error: 'not_configured' });
  }

  let place;
  try {
    place = await fetchPlace(apiKey);
  } catch (error) {
    console.log(`place-reviews: upstream failed (${error && error.message})`);
    return json(502, { ok: false, error: 'upstream_unavailable' });
  }

  const reviews = Array.isArray(place.reviews)
    ? place.reviews.map(normaliseReview).filter(Boolean).slice(0, MAX_REVIEWS)
    : [];

  const payload = {
    ok: true,
    displayName: field((place.displayName && place.displayName.text) || '', 200),
    rating: typeof place.rating === 'number' ? place.rating : null,
    userRatingCount: typeof place.userRatingCount === 'number' ? place.userRatingCount : null,
    googleMapsUri: field(place.googleMapsUri || '', 500),
    reviews,
    fetchedAt: new Date().toISOString(),
  };

  const response = json(200, payload, CACHE_SECONDS);
  // Cache after responding, so the first visitor after an expiry does not wait
  // on the write.
  if (typeof waitUntil === 'function') waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

/** Nothing here is writable, so anything other than GET is refused outright. */
export async function onRequest(context) {
  if (context.request.method === 'GET') return onRequestGet(context);
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { allow: 'GET, OPTIONS' } });
  }
  return json(405, { ok: false, error: 'method_not_allowed' });
}
