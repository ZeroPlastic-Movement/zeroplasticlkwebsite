# Partner enquiry: data contract for Make

Applies to `POST /api/partner-enquiry` (`functions/api/partner-enquiry.js`),
the form on `/one-traveller-one-kilogram/`.

**Status at release: the online form is switched off.** The scenario exists but has not passed end-to-end testing, so visitors apply by email or WhatsApp. (Earlier drafts of this note said the scenario did not exist yet.)

**Original status note: the Make scenario does not exist yet.** The function is written and
tested against a mock. Nothing here has reached a real Make scenario, a CRM
record or a mailbox. Do not describe the form as live until the acceptance
test at the bottom has been run and passed.

## Isolation rules

- A new custom webhook and a new scenario, used by this form only.
- The URL goes in the Cloudflare Pages encrypted secret
  `PARTNER_ENQUIRY_WEBHOOK_URL` (Preview first, Production after approval).
- Never reuse `VOLUNTEER_FORM_WEBHOOK_URL`, the volunteer scenario, the
  volunteer Monday board, or anything in the referral or booking engine.
- The existing partnership enquiries on `/contact/` go to a Monday form
  (`EXTERNAL.contactForm`). That form is untouched. Where partner
  applications are stored is a decision for the owner: see "Destination".

## Request: browser to Function

JSON. The page builds it; the Function re-validates everything.

| Field | Required | Notes |
|---|---|---|
| `submission_id` | no | `ZPP-<stamp>-<rand>`. Generated per page load. Server issues one if absent or malformed. |
| `company` | yes | max 120 |
| `organisation_type` | yes | one of the fixed list below |
| `country` | yes | max 80 |
| `contact_name` | yes | max 100 |
| `email` | yes | business email, shape-checked only |
| `whatsapp` | yes | 8 to 15 digits |
| `website` | no | http(s); a bare domain is normalised to `https://` |
| `estimated_traveller_volume` | yes | one of the fixed list below |
| `message` | no | max 1500 |
| `consent_contact` | yes | must be `true` |
| `hp_check` | spam | must be empty. Non-empty is dropped with a fake 200 |
| `seconds_on_page` | spam | under 5 is dropped with a fake 200 |
| `utm_source`, `utm_medium`, `utm_campaign`, `referrer`, `page_url` | no | attribution, capped |

`organisation_type`: Tour operator; Destination management company (DMC);
Hotel or accommodation; International travel company; Adventure or group
travel; Other tourism business.

`estimated_traveller_volume`: Under 100; 100 to 299; 300 to 599; 600 to 1,199;
1,200 or more; Not sure yet.

## Payload: Function to Make

Every field above except `hp_check` and `seconds_on_page`, all strings, plus
fields the server fixes and never reads from the request:

| Field | Value |
|---|---|
| `submitted_at` | ISO 8601 UTC |
| `source` | `one-traveller-one-kilogram` |
| `campaign` | `One Traveller, One Kilogram` |

## Response: Make to Function

The Function treats the enquiry as accepted only when Make returns HTTP 200
**and** a JSON body with `"success": true`. Make's default `Accepted` body is a
rejection as far as the browser is concerned. Build the scenario so the
webhook response module runs last, after the record is stored and the
notification sent:

```json
{ "success": true, "submission_id": "{{submission_id}}" }
```

If a record already exists for that `submission_id`, return the same body
without creating a second record or sending a second email.

## What the scenario must do

1. Custom webhook receives the payload.
2. Filter: `consent_contact` is `true` and `source` is `one-traveller-one-kilogram`.
3. Data store lookup on `submission_id`; stop with the success body if found.
4. Create the record in the chosen destination (below), all fields mapped.
5. Send a notification email to `impactcenter@zeroplastic.lk` with the company,
   type, country, contact, email, WhatsApp, volume, website and message.
6. Webhook response with the success body.
7. Error route: no response module, so the Function reports a failure and the
   applicant is told nothing was recorded.

Do **not** send an automatic acceptance reply to the applicant. Applications
are reviewed by a person, and the page says submitting does not guarantee a
place.

## Durable duplicate handling

The Function's duplicate check is per-isolate and best effort. It only
shortens the common double-click. The guarantee has to live in Make, keyed on
`submission_id`, and must survive Make retries, browser retries and a run that
failed half way:

1. A Make data store, key `submission_id`, with fields `status`
   (`processing`, `record_created`, `done`), `monday_item_id` and `email_sent`.
2. First module after the filter: **add** the key with `status = processing`
   with overwrite disabled. If the key already existed, branch to step 4.
3. New submission: create the CRM record, store its id and
   `status = record_created`; send the notification, set `email_sent = true`;
   set `status = done`; respond with the success body.
4. Key already existed:
   - `done`: respond with the success body. Create nothing, send nothing.
   - `record_created` or `processing` (an earlier run died part way): search
     the destination for an item carrying that `submission_id` and create the
     record only if none exists; send the email only if `email_sent` is not
     true; then finish and respond.
5. Store `submission_id` in a column on the destination board as well, so the
   guarantee does not depend on the data store alone.
6. A second, softer check on company plus email (case-insensitive) to flag a
   likely repeat applicant for a person to review. Do not merge or discard
   automatically.

## Destination

Not decided. Options, for the owner:

- A new, separate Monday board or group for partner applications, with
  columns mirroring the table above. Recommended: keeps it apart from the
  volunteer board and from the general contact form.
- The existing contact-form Monday board. It already receives partnership
  enquiries, but mixing a structured programme application into it makes the
  founding-cohort list harder to manage.

This repository does not know which Monday workspace or board ids exist and
has not been given access to them.

## Acceptance test before going live

Run on a Cloudflare **Preview** deployment with the preview secret pointing at
the new scenario, with a clearly marked test company name:

1. Submit once. Expect the success screen with a `ZPP-` reference.
2. In Make: one execution, success.
3. In the destination: exactly one record, every field populated.
4. In the `impactcenter@zeroplastic.lk` inbox: exactly one notification.
5. Replay the identical payload (same `submission_id`) directly at the webhook,
   twice: still one record, one email, success body each time. Then kill the
   run after record creation and replay: still one record, one email.
6. Break the destination on purpose: the page must show the failure message,
   not success.
7. Delete the test record and note the test in the release notes.

## Cloudflare Pages configuration

The form endpoint and the page are built and served by the existing
`zeroplasticlk` Pages project, like `/api/volunteer-application`. No other
hosting is involved, and Vercel cannot run `functions/api/`.

Preview and Production builds both need the CMS origin, because the same
`astro build` that renders this page also fetches blog content from
WordPress. Without it the build falls back to `www.zeroplastic.lk`, which no
longer serves `/wp-json`, and the build fails before anything is deployed.

| Variable | Preview | Production |
|---|---|---|
| `WORDPRESS_BASE_URL` | `https://cms.zeroplastic.lk` | `https://cms.zeroplastic.lk` |
| `WORDPRESS_MEDIA_URL` | `https://cms.zeroplastic.lk` | `https://cms.zeroplastic.lk` |
| `PARTNER_ENQUIRY_WEBHOOK_URL` | encrypted secret, dedicated Make webhook | encrypted secret, set only at release |

The secret is read only by `functions/api/partner-enquiry.js`. It is never in
source, logs or the browser. `VOLUNTEER_FORM_WEBHOOK_URL` is a separate secret
and is not touched.

## Activating the form (not done at release)

The form is built but off, in two places, so having the Production webhook
secret is not enough to start accepting applications:

1. `FORM_ENABLED` in `src/data/one-traveller-one-kilogram.ts` is `false`, so the
   page shows email and WhatsApp buttons instead of the form.
2. `functions/api/partner-enquiry.js` answers 503 `not_enabled` to everything
   unless `PARTNER_ENQUIRY_ENABLED` is exactly `"true"` on the Pages project.

Turn both on only after the acceptance test above has passed: a recorded
Monday lead, the email and Slack notifications, and no second lead or
notification on a replayed `submission_id`. Set `FORM_ENABLED` to `true`,
deploy, then set `PARTNER_ENQUIRY_ENABLED` to `"true"`.
