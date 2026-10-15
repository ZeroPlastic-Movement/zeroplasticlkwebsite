/**
 * POST /api/partner-enquiry
 *
 * Server-side receiver for the One Traveller, One Kilogram partner application
 * form. Same shape as functions/api/volunteer-application.js on purpose: the
 * page posts here, this Function validates, then forwards to a Make custom
 * webhook using a secret that only the Cloudflare Pages runtime can read.
 *
 * Environment:
 *   PARTNER_ENQUIRY_ENABLED       must be "true" for the endpoint to accept anything.
 *                                 Unset means it answers 503 and forwards nothing,
 *                                 whatever else is configured.
 *   PARTNER_ENQUIRY_WEBHOOK_URL   a Make custom webhook dedicated to this form.
 *                                 Encrypted Pages secret, never in source and
 *                                 never sent to the browser. It is deliberately
 *                                 not VOLUNTEER_FORM_WEBHOOK_URL: the two forms
 *                                 must not share a scenario, a board or a
 *                                 failure mode. Absent means the endpoint
 *                                 reports itself unconfigured rather than
 *                                 pretending to have accepted anything.
 *
 * The data contract with the Make scenario is in
 * docs/PARTNER-ENQUIRY-CONTRACT.md. Keep the two in step.
 */

/** Hard ceiling on the request body, well above a full application. */
const MAX_BODY_BYTES = 16 * 1024;

/** How long to wait for Make before giving up and telling the browser. */
const UPSTREAM_TIMEOUT_MS = 12_000;

/** A form filled in faster than this is a bot, not a person. */
const MIN_SECONDS_ON_PAGE = 5;

/** Submission references the page generates, one per page load. */
const SUBMISSION_ID = /^ZPP-[0-9A-Z]{4,12}-[0-9A-Z]{3,10}$/;

/**
 * Fixed lists. The page renders its selects from the same values, and the
 * server re-checks them because a request need not come from the page.
 * Plain words in the volume bands: en dashes would have to match byte for
 * byte across the page, this file and the Make filter. Only onRequest* names
 * are exported, because Pages treats every export of a route file as routing.
 */
const ORGANISATION_TYPES = [
  'Tour operator',
  'Destination management company (DMC)',
  'Hotel or accommodation',
  'International travel company',
  'Adventure or group travel',
  'Other tourism business',
];

const TRAVELLER_VOLUMES = [
  'Under 100',
  '100 to 299',
  '300 to 599',
  '600 to 1,199',
  '1,200 or more',
  'Not sure yet',
];

/**
 * Recently accepted references, for the double-click and browser-retry case.
 * Per-isolate and therefore best effort; the durable guarantee belongs in
 * Make, keyed on submission_id.
 */
const recentlySeen = new Map();
const DUPLICATE_WINDOW_MS = 120_000;

function rememberSubmission(id) {
  const now = Date.now();
  for (const [key, at] of recentlySeen) {
    if (now - at > DUPLICATE_WINDOW_MS) recentlySeen.delete(key);
  }
  recentlySeen.set(id, now);
}

function seenRecently(id) {
  const at = recentlySeen.get(id);
  return at !== undefined && Date.now() - at <= DUPLICATE_WINDOW_MS;
}

function json(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      'referrer-policy': 'no-referrer',
      'x-content-type-options': 'nosniff',
    },
  });
}

/** Trim, coerce to string, and cap length so nothing unbounded is forwarded. */
function field(value, max = 500) {
  if (value === undefined || value === null) return '';
  return String(value).trim().slice(0, max);
}

function isTrue(value) {
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === 'yes' || v === 'on' || v === '1';
}

function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function looksLikePhone(value) {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * The website is optional. When given, it must parse as an http(s) URL; a bare
 * domain is accepted and normalised, so "example.com" does not bounce a person
 * who did nothing wrong.
 */
function normaliseWebsite(value) {
  if (!value) return { ok: true, value: '' };
  const candidate = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(candidate);
    if (!/^https?:$/.test(url.protocol) || !url.hostname.includes('.')) return { ok: false, value: '' };
    return { ok: true, value: url.href.slice(0, 200) };
  } catch {
    return { ok: false, value: '' };
  }
}

function newSubmissionId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ZPP-${stamp}-${rand}`;
}

/**
 * Validate the submission. Returns the names of the fields that failed rather
 * than prose, so the page can highlight them and nothing about the applicant
 * is written to a log.
 */
function validate(body) {
  const bad = [];

  const data = {
    submission_id: field(body.submission_id, 40),
    company: field(body.company, 120),
    organisation_type: field(body.organisation_type, 80),
    country: field(body.country, 80),
    contact_name: field(body.contact_name, 100),
    email: field(body.email, 160),
    whatsapp: field(body.whatsapp, 40),
    website: '',
    estimated_traveller_volume: field(body.estimated_traveller_volume, 40),
    message: field(body.message, 1500),
    utm_source: field(body.utm_source, 120),
    utm_medium: field(body.utm_medium, 120),
    utm_campaign: field(body.utm_campaign, 160),
    referrer: field(body.referrer, 500),
    page_url: field(body.page_url, 500),
  };

  for (const name of ['company', 'country', 'contact_name']) {
    if (!data[name]) bad.push(name);
  }
  if (!ORGANISATION_TYPES.includes(data.organisation_type)) bad.push('organisation_type');
  if (!TRAVELLER_VOLUMES.includes(data.estimated_traveller_volume)) {
    bad.push('estimated_traveller_volume');
  }
  if (!looksLikeEmail(data.email)) bad.push('email');
  if (!looksLikePhone(data.whatsapp)) bad.push('whatsapp');

  const site = normaliseWebsite(field(body.website, 200));
  if (site.ok) data.website = site.value;
  else bad.push('website');

  // The applicant had to tick this to submit. Recorded as sent, because it is
  // the record of what they agreed to, not a value to trust blindly.
  const consent = isTrue(body.consent_contact);
  if (!consent) bad.push('consent_contact');
  data.consent_contact = consent ? 'true' : 'false';

  if (!SUBMISSION_ID.test(data.submission_id)) data.submission_id = newSubmissionId();

  return { data, bad };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  // Off unless explicitly switched on. The Make scenario behind this endpoint
  // has not passed end-to-end testing, and the webhook secret is already set in
  // Production, so having the secret must not be enough to start accepting
  // applications. Checked first, so a refused request is never read, never
  // validated and never forwarded. Turn it on by setting PARTNER_ENQUIRY_ENABLED
  // to "true" only after the integration has been verified.
  if (env.PARTNER_ENQUIRY_ENABLED !== 'true') {
    return json(503, { ok: false, error: 'not_enabled' });
  }

  const contentType = request.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return json(415, { ok: false, error: 'unsupported_media_type' });
  }

  const declared = Number.parseInt(request.headers.get('content-length') || '0', 10);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return json(413, { ok: false, error: 'too_large' });
  }

  let raw;
  try {
    raw = await request.text();
  } catch {
    return json(400, { ok: false, error: 'unreadable' });
  }
  if (raw.length > MAX_BODY_BYTES) return json(413, { ok: false, error: 'too_large' });

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    return json(400, { ok: false, error: 'malformed_json' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json(400, { ok: false, error: 'malformed_json' });
  }

  // Spam gates, checked before anything else is done with the payload. Both
  // answer 200 with a plausible reference: a bot learns nothing from the
  // response, and nothing is forwarded or notified.
  const seconds = Number.parseInt(field(body.seconds_on_page, 6) || '0', 10);
  if (field(body.hp_check, 200) !== '' || !Number.isFinite(seconds) || seconds < MIN_SECONDS_ON_PAGE) {
    return json(200, { ok: true, submission_id: newSubmissionId() });
  }

  const { data, bad } = validate(body);
  if (bad.length) return json(400, { ok: false, error: 'validation', fields: bad });

  if (seenRecently(data.submission_id)) {
    return json(200, { ok: true, submission_id: data.submission_id, duplicate: true });
  }

  const endpoint = env.PARTNER_ENQUIRY_WEBHOOK_URL;
  if (!endpoint) {
    // Nothing was stored anywhere, so do not imply that it was.
    console.log('partner-enquiry: PARTNER_ENQUIRY_WEBHOOK_URL is not configured');
    return json(503, { ok: false, error: 'not_configured' });
  }

  data.submitted_at = new Date().toISOString();
  // Fixed here and never read from the request, so a caller cannot label an
  // enquiry as coming from some other form and have it routed elsewhere.
  data.source = 'one-traveller-one-kilogram';
  data.campaign = 'One Traveller, One Kilogram';

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), UPSTREAM_TIMEOUT_MS);

  let upstream;
  try {
    upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
      signal: abort.signal,
    });
  } catch (error) {
    // Reference only. The applicant's details never reach a log line.
    console.log(
      `partner-enquiry: upstream unreachable for ${data.submission_id} (${error && error.name})`,
    );
    return json(502, { ok: false, error: 'upstream_unavailable' });
  } finally {
    clearTimeout(timer);
  }

  // Make answers 200 with {"success": true} only once the scenario has stored
  // the record and sent the notification. Make's default "Accepted" body is
  // not good enough to show the applicant a success screen, so the body is
  // checked as well as the status.
  let accepted = false;
  let reference = data.submission_id;
  if (upstream.ok) {
    try {
      const result = await upstream.json();
      accepted = result && result.success === true;
      if (accepted && typeof result.submission_id === 'string' && SUBMISSION_ID.test(result.submission_id)) {
        reference = result.submission_id;
      }
    } catch {
      accepted = false;
    }
  }

  if (!accepted) {
    console.log(
      `partner-enquiry: upstream rejected ${data.submission_id} (status ${upstream.status})`,
    );
    return json(502, { ok: false, error: 'upstream_rejected' });
  }

  rememberSubmission(reference);
  console.log(`partner-enquiry: accepted ${reference}`);
  return json(200, { ok: true, submission_id: reference });
}

/** Anything other than POST, including a curious GET, gets a flat refusal. */
export async function onRequest(context) {
  if (context.request.method === 'POST') return onRequestPost(context);
  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: { allow: 'POST, OPTIONS' } });
  }
  return json(405, { ok: false, error: 'method_not_allowed' });
}
