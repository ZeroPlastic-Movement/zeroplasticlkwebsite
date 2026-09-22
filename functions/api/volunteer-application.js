/**
 * POST /api/volunteer-application
 *
 * Server-side receiver for the volunteer landing page form. It exists so the
 * Make.com webhook URL never reaches the browser: the page posts here, this
 * Function validates, then forwards to Make using a secret that only the
 * Cloudflare Pages runtime can read.
 *
 * Environment:
 *   VOLUNTEER_FORM_WEBHOOK_URL   the Make custom webhook URL. Stored as an
 *                                encrypted Pages secret, never in source and
 *                                never sent to the browser. Absent means the
 *                                endpoint reports itself unconfigured rather
 *                                than pretending to have accepted anything.
 *
 * What the browser gets back is deliberately thin: whether it worked and the
 * submission reference. No Make execution detail, no upstream status, no echo
 * of what was submitted.
 */

/** Hard ceiling on the request body, well above a full application. */
const MAX_BODY_BYTES = 24 * 1024;

/** How long to wait for Make before giving up and telling the browser. */
const UPSTREAM_TIMEOUT_MS = 12_000;

/** A form filled in faster than this is a bot, not a person. */
const MIN_SECONDS_ON_PAGE = 3;

/** Submission references the page generates, one per page load. */
const SUBMISSION_ID = /^ZPV-[0-9A-Z]{4,12}-[0-9A-Z]{3,10}$/;

/**
 * Recently accepted references, for the double-click and browser-retry case.
 *
 * This is per-isolate and therefore best effort: Cloudflare may run the next
 * request in a different isolate, and isolates are recycled. It is the cheap
 * first line only. The durable guarantee is in Make, which keys a data store
 * on submission_id and will not send a second pair of emails for one that has
 * already been processed.
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

/** Checkbox values arrive as true, "true", "yes" or "on" depending on the client. */
function isTrue(value) {
  const v = String(value).trim().toLowerCase();
  return v === 'true' || v === 'yes' || v === 'on' || v === '1';
}

/** Deliberately permissive: the real proof an address works is the reply. */
function looksLikeEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

/** Digits, spaces and the usual separators, with a country code. */
function looksLikePhone(value) {
  const digits = value.replace(/[^\d]/g, '');
  return digits.length >= 8 && digits.length <= 15;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

function newSubmissionId() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ZPV-${stamp}-${rand}`;
}

/**
 * Validate the submission.
 *
 * Returns the field names that failed rather than a prose message, so the page
 * can highlight them and nothing about the applicant is written to a log.
 */
function validate(body) {
  const bad = [];

  const data = {
    submission_id: field(body.submission_id, 40),
    full_name: field(body.full_name, 120),
    nationality: field(body.nationality, 80),
    country_of_residence: field(body.country_of_residence, 80),
    work_or_study_area: field(body.work_or_study_area, 120),
    email: field(body.email, 160),
    whatsapp: field(body.whatsapp, 40),
    // The form's date inputs are named expected_arrival and expected_departure,
    // while the Make scenario reads expected_arrival_date and
    // expected_departure_date. Bridging the two names here keeps both sides as
    // they are. Reading the outbound names from the request, as this did
    // before, silently dropped every travel date.
    expected_arrival_date: field(body.expected_arrival, 10),
    expected_departure_date: field(body.expected_departure, 10),
    preferred_programme: field(body.preferred_programme, 80),
    preferred_duration: field(body.preferred_duration, 60),
    people_travelling: field(body.people_travelling, 4),
    relevant_skills: field(body.relevant_skills, 500),
    contribution: field(body.contribution, 2000),
    accommodation_guidance: field(body.accommodation_guidance, 60),
    how_heard: field(body.how_heard, 80),
    utm_source: field(body.utm_source, 120),
    utm_medium: field(body.utm_medium, 120),
    utm_campaign: field(body.utm_campaign, 160),
    utm_term: field(body.utm_term, 160),
    utm_content: field(body.utm_content, 160),
    gclid: field(body.gclid, 200),
    // wbraid and gbraid are the click identifiers Google uses where gclid is
    // unavailable, mainly iOS and web-to-app journeys. The page already
    // captures all three; dropping two of them here lost that attribution.
    wbraid: field(body.wbraid, 200),
    gbraid: field(body.gbraid, 200),
    referrer: field(body.referrer, 500),
    page_url: field(body.page_url, 500),
  };

  for (const name of [
    'full_name',
    'nationality',
    'country_of_residence',
    'work_or_study_area',
    'preferred_programme',
    'preferred_duration',
  ]) {
    if (!data[name]) bad.push(name);
  }

  if (!looksLikeEmail(data.email)) bad.push('email');
  if (!looksLikePhone(data.whatsapp)) bad.push('whatsapp');

  const people = Number.parseInt(data.people_travelling || '1', 10);
  if (!Number.isFinite(people) || people < 1 || people > 60) bad.push('people_travelling');
  data.people_travelling = String(Number.isFinite(people) ? people : 1);

  // Dates are optional, but if given they must be real and in the right order.
  if (data.expected_arrival_date && !isIsoDate(data.expected_arrival_date)) {
    bad.push('expected_arrival_date');
  }
  if (data.expected_departure_date && !isIsoDate(data.expected_departure_date)) {
    bad.push('expected_departure_date');
  }
  if (
    isIsoDate(data.expected_arrival_date) &&
    isIsoDate(data.expected_departure_date) &&
    data.expected_departure_date < data.expected_arrival_date
  ) {
    bad.push('expected_departure_date');
  }

  const consentContact = isTrue(body.consent_contact);
  const consentPrivacy = isTrue(body.privacy_ack);
  if (!consentContact) bad.push('consent_contact');
  if (!consentPrivacy) bad.push('privacy_ack');

  // Make filters on these two names, and only forwards when both are "true".
  data.communication_consent = consentContact ? 'true' : 'false';
  data.privacy_consent = consentPrivacy ? 'true' : 'false';

  if (!SUBMISSION_ID.test(data.submission_id)) data.submission_id = newSubmissionId();

  return { data, bad };
}

export async function onRequestPost(context) {
  const { request, env } = context;

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
  // response, and no notification is sent.
  const seconds = Number.parseInt(field(body.seconds_on_page, 6) || '0', 10);
  if (field(body.hp_check, 200) !== '' || !Number.isFinite(seconds) || seconds < MIN_SECONDS_ON_PAGE) {
    return json(200, { ok: true, submission_id: newSubmissionId() });
  }

  const { data, bad } = validate(body);
  if (bad.length) return json(400, { ok: false, error: 'validation', fields: bad });

  if (seenRecently(data.submission_id)) {
    return json(200, { ok: true, submission_id: data.submission_id, duplicate: true });
  }

  const endpoint = env.VOLUNTEER_FORM_WEBHOOK_URL;
  if (!endpoint) {
    // Nothing was stored anywhere, so do not imply that it was.
    console.log('volunteer-application: VOLUNTEER_FORM_WEBHOOK_URL is not configured');
    return json(503, { ok: false, error: 'not_configured' });
  }

  data.submitted_at = new Date().toISOString();
  // Both are fixed here and never read from the request. The page posts its own
  // form_source, but trusting it would let any caller label an application as
  // coming from a different form and route it somewhere it does not belong.
  data.source = 'volunteer-sri-lanka';
  data.form_source = 'volunteer-sri-lanka';

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
      `volunteer-application: upstream unreachable for ${data.submission_id} (${error && error.name})`,
    );
    return json(502, { ok: false, error: 'upstream_unavailable' });
  } finally {
    clearTimeout(timer);
  }

  // Make answers 200 with a JSON body only once the scenario has validated the
  // application and claimed its reference. Anything else, including Make's own
  // default "Accepted", is not good enough to show the applicant a success
  // screen, so the body is checked rather than just the status.
  let accepted = false;
  let reference = data.submission_id;
  if (upstream.ok) {
    try {
      const result = await upstream.json();
      accepted = result && result.success === true;
      if (accepted && typeof result.submission_id === 'string' && result.submission_id) {
        reference = result.submission_id;
      }
    } catch {
      accepted = false;
    }
  }

  if (!accepted) {
    console.log(
      `volunteer-application: upstream rejected ${data.submission_id} (status ${upstream.status})`,
    );
    return json(502, { ok: false, error: 'upstream_rejected' });
  }

  rememberSubmission(reference);
  console.log(`volunteer-application: accepted ${reference}`);
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
