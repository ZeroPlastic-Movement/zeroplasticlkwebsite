/**
 * Tests for functions/api/partner-enquiry.js.
 *
 *   node --test tests/*.test.mjs
 *
 * Make is never contacted: global fetch is replaced for every test that would
 * reach it, and a test fails loudly if a spam or validation path calls it.
 * Webhook URLs here are fake and end in .invalid, which cannot resolve.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { afterEach, test } from 'node:test';

import { onRequest } from '../functions/api/partner-enquiry.js';

const WEBHOOK = 'https://hook.example.invalid/partner-test-secret';
const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const valid = {
  submission_id: 'ZPP-LXYZ12-ABC123',
  company: 'Eco Trails',
  organisation_type: 'Tour operator',
  country: 'Australia',
  contact_name: 'Alex Green',
  email: 'alex@ecotrails.example',
  whatsapp: '+61 400 000 000',
  website: 'ecotrails.example',
  estimated_traveller_volume: '300 to 599',
  message: 'Planning groups for 2027',
  consent_contact: 'true',
  hp_check: '',
  seconds_on_page: '42',
  // Must never survive to Make: the endpoint fixes these itself.
  source: 'attacker',
  campaign: 'attacker',
};

function call(body, { method = 'POST', env = { PARTNER_ENQUIRY_ENABLED: 'true', PARTNER_ENQUIRY_WEBHOOK_URL: WEBHOOK }, headers } = {}) {
  const init = { method, headers: { 'content-type': 'application/json', ...headers } };
  if (method !== 'GET' && method !== 'HEAD') {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  return onRequest({ request: new Request('https://www.zeroplastic.lk/api/partner-enquiry', init), env });
}

/** Stub Make. Returns the list of payloads it was sent. */
function stubMake(reply = () => Response.json({ success: true })) {
  const sent = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(url, WEBHOOK);
    sent.push(JSON.parse(options.body));
    return reply();
  };
  return sent;
}

function forbidMake() {
  globalThis.fetch = async () => {
    throw new Error('Make must not be called on this path');
  };
}

test('accepts a valid application and forwards exactly the documented contract', async () => {
  const sent = stubMake();
  const res = await call(valid);
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { ok: true, submission_id: 'ZPP-LXYZ12-ABC123' });
  assert.equal(sent.length, 1);
  const p = sent[0];
  assert.equal(p.company, 'Eco Trails');
  assert.equal(p.website, 'https://ecotrails.example/');
  assert.equal(p.source, 'one-traveller-one-kilogram');
  assert.equal(p.campaign, 'One Traveller, One Kilogram');
  assert.equal(p.consent_contact, 'true');
  assert.ok(!Number.isNaN(Date.parse(p.submitted_at)));
  assert.equal(p.hp_check, undefined);
  assert.equal(p.seconds_on_page, undefined);
});

test('does not forward fields outside the contract', async () => {
  const sent = stubMake();
  await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC124', admin: 'x', webhook: 'y' });
  assert.equal(sent[0].admin, undefined);
  assert.equal(sent[0].webhook, undefined);
});

test('optional website and message may be empty', async () => {
  const sent = stubMake();
  const res = await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC125', website: '', message: '' });
  assert.equal(res.status, 200);
  assert.equal(sent[0].website, '');
});

test('honeypot is answered with a plausible 200 and nothing is sent', async () => {
  forbidMake();
  const res = await call({ ...valid, hp_check: 'http://spam.example' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.ok, true);
  assert.match(body.submission_id, /^ZPP-/);
});

test('a form submitted faster than a person could fill it is silently dropped', async () => {
  forbidMake();
  for (const seconds_on_page of ['0', '2', '', 'abc', undefined]) {
    const res = await call({ ...valid, seconds_on_page });
    assert.equal(res.status, 200);
  }
});

test('rejects each missing or malformed required field by name', async () => {
  forbidMake();
  const cases = {
    company: { company: '' },
    country: { country: '  ' },
    contact_name: { contact_name: '' },
    email: { email: 'not-an-email' },
    whatsapp: { whatsapp: '12' },
    organisation_type: { organisation_type: 'Pirate' },
    estimated_traveller_volume: { estimated_traveller_volume: '' },
    consent_contact: { consent_contact: 'false' },
    website: { website: 'javascript:alert(1)' },
  };
  for (const [name, patch] of Object.entries(cases)) {
    const res = await call({ ...valid, ...patch });
    assert.equal(res.status, 400, name);
    const body = await res.json();
    assert.equal(body.error, 'validation');
    assert.ok(body.fields.includes(name), `${name} in ${body.fields}`);
  }
});

test('missing secret fails closed with 503 and does not reach Make', async () => {
  forbidMake();
  // Fresh reference: the shared one was accepted by an earlier test.
  const res = await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC134' }, { env: { PARTNER_ENQUIRY_ENABLED: 'true' } });
  assert.equal(res.status, 503);
  assert.deepEqual(await res.json(), { ok: false, error: 'not_configured' });
});

test('Make answering a bare 2xx is not enough to report success', async () => {
  stubMake(() => new Response('Accepted', { status: 200 }));
  const res = await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC126' });
  assert.equal(res.status, 502);
  assert.equal((await res.json()).error, 'upstream_rejected');
});

test('Make answering success:false is a rejection', async () => {
  stubMake(() => Response.json({ success: false }));
  const res = await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC127' });
  assert.equal(res.status, 502);
});

test('Make answering a non-2xx is a rejection', async () => {
  stubMake(() => new Response('nope', { status: 500 }));
  const res = await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC128' });
  assert.equal(res.status, 502);
});

test('an unreachable Make is reported as 502 and never leaks details', async () => {
  globalThis.fetch = async () => {
    throw Object.assign(new Error('boom ' + WEBHOOK), { name: 'TypeError' });
  };
  const res = await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC129' });
  assert.equal(res.status, 502);
  const text = JSON.stringify(await res.json());
  assert.ok(!text.includes('hook.example'));
  assert.ok(!text.includes('boom'));
});

test('a repeat of an accepted reference is not forwarded twice', async () => {
  const sent = stubMake();
  const body = { ...valid, submission_id: 'ZPP-LXYZ12-ABC130' };
  assert.equal((await call(body)).status, 200);
  const second = await call(body);
  assert.equal(second.status, 200);
  assert.equal((await second.json()).duplicate, true);
  assert.equal(sent.length, 1);
});

test('the log never contains applicant details or the webhook URL', async () => {
  const lines = [];
  const realLog = console.log;
  console.log = (...a) => lines.push(a.join(' '));
  try {
    stubMake();
    await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC131' });
    stubMake(() => new Response('x', { status: 500 }));
    await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC132' });
    await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC135' }, { env: { PARTNER_ENQUIRY_ENABLED: 'true' } });
  } finally {
    console.log = realLog;
  }
  const all = lines.join('\n');
  for (const secret of ['Eco Trails', 'alex@ecotrails', '+61 400', 'partner-test-secret']) {
    assert.ok(!all.includes(secret), `log leaked ${secret}`);
  }
});

test('refuses non-JSON, malformed, oversized and non-object bodies', async () => {
  forbidMake();
  assert.equal((await call('x', { headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await call('{not json')).status, 400);
  assert.equal((await call('[1,2]')).status, 400);
  assert.equal((await call('null')).status, 400);
  assert.equal((await call({ ...valid, message: 'a'.repeat(20_000) })).status, 413);
});

test('only POST is served', async () => {
  forbidMake();
  assert.equal((await call(null, { method: 'GET' })).status, 405);
  const opt = await call(null, { method: 'OPTIONS' });
  assert.equal(opt.status, 204);
  assert.equal(opt.headers.get('allow'), 'POST, OPTIONS');
});

test('responses are never cacheable and carry no upstream detail', async () => {
  stubMake();
  const res = await call({ ...valid, submission_id: 'ZPP-LXYZ12-ABC133' });
  assert.equal(res.headers.get('cache-control'), 'no-store');
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
});

test('every select option on the page is accepted by the endpoint', async () => {
  // The page and the Function each hold the lists; this is what stops them
  // drifting apart and rejecting a legitimate applicant.
  const data = readFileSync(new URL('../src/data/one-traveller-one-kilogram.ts', import.meta.url), 'utf8');
  const grab = (name) => {
    const block = data.match(new RegExp(`export const ${name}[^=]*=\\s*\\[([\\s\\S]*?)\\n\\];`));
    assert.ok(block, `${name} not found in data file`);
    return [...block[1].matchAll(/'([^']+)'|"([^"]+)"/g)].map((m) => m[1] ?? m[2]);
  };
  const types = grab('ORGANISATION_TYPES');
  const volumes = grab('TRAVELLER_VOLUMES');
  assert.ok(types.length >= 6 && volumes.length >= 6);
  let n = 0;
  for (const organisation_type of types) {
    for (const estimated_traveller_volume of volumes) {
      stubMake();
      const res = await call({
        ...valid,
        submission_id: `ZPP-MATRIX-${String(++n).padStart(4, '0')}`,
        organisation_type,
        estimated_traveller_volume,
      });
      assert.equal(res.status, 200, `${organisation_type} / ${estimated_traveller_volume}`);
    }
  }
});

test('is off unless PARTNER_ENQUIRY_ENABLED is exactly "true", even with the secret set', async () => {
  // The webhook secret is present in Production before the integration is
  // verified. Having it must not be enough to accept applications.
  forbidMake();
  for (const flag of [undefined, '', 'false', '1', 'yes', 'TRUE']) {
    const env = { PARTNER_ENQUIRY_WEBHOOK_URL: WEBHOOK };
    if (flag !== undefined) env.PARTNER_ENQUIRY_ENABLED = flag;
    const res = await call({ ...valid, submission_id: 'ZPP-OFF000-ABC001' }, { env });
    assert.equal(res.status, 503, `flag ${JSON.stringify(flag)}`);
    assert.deepEqual(await res.json(), { ok: false, error: 'not_enabled' });
  }
});

test('when off, nothing is read, validated or forwarded, whatever the body', async () => {
  forbidMake();
  const env = { PARTNER_ENQUIRY_WEBHOOK_URL: WEBHOOK };
  for (const body of ['{not json', '[]', JSON.stringify(valid), JSON.stringify({ ...valid, hp_check: 'x' }), '{}']) {
    const res = await call(body, { env });
    assert.equal(res.status, 503);
  }
});

test('the page switch is a plain boolean, so the form cannot be half-configured', async () => {
  // Two switches control the form: this constant and PARTNER_ENQUIRY_ENABLED.
  // The constant must stay a literal that can be read and flipped on its own.
  const data = readFileSync(new URL('../src/data/one-traveller-one-kilogram.ts', import.meta.url), 'utf8');
  assert.match(data, /export const FORM_ENABLED = (true|false);/);
});
