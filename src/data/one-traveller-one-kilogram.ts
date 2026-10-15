/**
 * Content for /one-traveller-one-kilogram/, the tourism partnership landing page.
 *
 * Every programme term below is CONFIRMED: the owner set it out in the
 * approved brief for this page and it is not yet published anywhere else. The
 * Impact Center facts are PUBLISHED on public/impact-center-premium.html, and
 * the movement figures come from src/consts.ts. See CLAUDE.md for the tags.
 *
 * The distinction this page lives or dies on is between a COMMITMENT and a
 * VERIFIED completed removal. The programme has not started, so nothing on the
 * page may say plastic "has been" removed, and nothing may describe the
 * programme as carbon offsetting or as cancelling a traveller's own plastic
 * footprint. Keep that in mind before editing any sentence here.
 *
 * Photographs: none have been supplied. PHOTO_SLOTS lists what the page is
 * waiting for. Until then the sections use gradient artwork.
 */

import { CONTACT, EXTERNAL, STATS, FOUNDED } from '../consts';

/** CONFIRMED. The partnership inbox and WhatsApp number given for this page. */
export const PARTNER_CONTACT = {
  email: 'impactcenter@zeroplastic.lk',
  whatsappDisplay: '+94 71 690 1094',
  whatsappHref:
    'https://wa.me/94716901094?text=' +
    encodeURIComponent(
      'Hello ZeroPlastic, I would like to discuss the One Traveller, One Kilogram partnership.',
    ),
  mailSubject: 'One Traveller, One Kilogram partnership',
} as const;

export const PAGE = {
  path: '/one-traveller-one-kilogram/',
  // Contains "ZeroPlastic", so SEO.astro does not append the brand a second time.
  title: 'One Traveller, One Kilogram: ZeroPlastic Tourism Partnership',
  description:
    'A free partnership for tour operators, DMCs and hotels: each qualifying traveller to the ZeroPlastic Impact Center creates a 1 kg plastic removal commitment. Starts 1 January 2027.',
  ogImage: '/images/one-kg-social.jpg',
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt:
    'One Traveller. One Kilogram. One Movement. ZeroPlastic volunteers and visitors at a cleanup, with a 1 kg marker.',
} as const;

/** CONFIRMED. Launch date and the size of the founding cohort. */
export const PROGRAMME = {
  launch: '1 January 2027',
  launchIso: '2027-01-01',
  foundingPartners: 10,
  perTravellerKg: 1,
  milestoneTravellers: 300,
  milestoneKg: 300,
} as const;

export const HERO = {
  eyebrow: 'For tour operators, DMCs and hotels',
  h1Lines: ['One Traveller.', 'One Kilogram.', 'One Movement.'],
  sub:
    "Your travellers discover Sri Lanka. Together, we protect it. For every qualifying traveller who visits the ZeroPlastic Impact Center in Sigiriya through a registered partner, ZeroPlastic commits to removing 1 kg of plastic waste from Sri Lanka's environment, primarily its beaches.",
  facts: [
    `Programme begins ${PROGRAMME.launch}`,
    `${PROGRAMME.foundingPartners} founding partners to start`,
    'No participation or cleanup fee',
  ],
  medallion: { value: '1 kg', label: 'removal commitment per qualifying traveller' },
} as const;

/**
 * PUBLISHED. STATS and FOUNDED are the canonical movement figures in
 * src/consts.ts, so this strip cannot drift from the rest of the site.
 */
export const TRUST = {
  lead: 'Delivered by an established, youth-led environmental movement',
  items: [
    { value: STATS[0].value, label: STATS[0].label },
    { value: STATS[3].value, label: STATS[3].label },
    { value: `Since ${FOUNDED}`, label: 'Working across Sri Lanka' },
  ],
} as const;

export const BENEFITS = {
  eyebrow: 'For travel businesses that care',
  title: 'Give your Sri Lanka itineraries a bigger purpose',
  intro:
    'A practical partnership for travel businesses that want to connect a real visitor experience in Sigiriya with a documented environmental contribution.',
  items: [
    {
      title: 'A meaningful itinerary stop',
      body: 'Add a craft, culture and sustainability stop to your Sigiriya programmes, with free entry for your guests.',
    },
    {
      title: 'Recurring cleanup milestones',
      body: `Every additional ${PROGRAMME.milestoneTravellers} qualifying travellers from your company triggers another dedicated cleanup removing at least ${PROGRAMME.milestoneKg} kg of plastic.`,
    },
    {
      title: 'Evidence you can share',
      body: 'Receive cleanup photographs, collection records and an environmental impact report for your own sustainability reporting.',
    },
    {
      title: 'No extra budget',
      body: 'There is no additional participation or cleanup fee for travel partners. Paid workshops and purchases at the Impact Center stay optional.',
    },
  ],
} as const;

export const STEPS = {
  eyebrow: 'How the partnership works',
  title: 'You bring the travellers. We deliver the action.',
  intro:
    'Each partner has its own separately recorded visitor count. A commitment is created by a qualifying visit; it is only reported as removed once a cleanup has actually taken place.',
  items: [
    {
      title: 'Apply to become a partner',
      body: `Apply to join the first group of ${PROGRAMME.foundingPartners} founding travel partners. Our team reviews every application personally.`,
    },
    {
      title: 'Bring your travellers',
      body: 'Qualifying travellers visit the Impact Center through your registered company. General entry is free.',
    },
    {
      title: 'Each visit is a commitment',
      body: `Each qualifying visit creates a commitment to remove ${PROGRAMME.perTravellerKg} kg of plastic waste, and your visitor count is recorded separately from other partners'.`,
    },
    {
      title: `Every ${PROGRAMME.milestoneTravellers} travellers, another cleanup`,
      body: `At ${PROGRAMME.milestoneTravellers}, ${PROGRAMME.milestoneTravellers * 2}, ${PROGRAMME.milestoneTravellers * 3} and every further ${PROGRAMME.milestoneTravellers} qualifying travellers, ZeroPlastic organises a dedicated cleanup removing at least ${PROGRAMME.milestoneKg} kg, then shares the evidence.`,
    },
  ],
} as const;

/**
 * CONFIRMED worked examples. Each block of 300 travellers has its own
 * dedicated cleanup of at least 300 kg, so the cumulative figures are what the
 * programme works toward once each cleanup has been completed, never a
 * statement of what has been removed.
 */
export const EXAMPLES = {
  title: 'How the milestones add up',
  intro:
    'Each block of 300 qualifying travellers has its own dedicated cleanup. These figures are the removal ZeroPlastic commits to, and each is reported as removed only after its cleanup has taken place.',
  rows: [
    { travellers: 300, cleanups: 1, kg: 300 },
    { travellers: 600, cleanups: 2, kg: 600 },
    { travellers: 900, cleanups: 3, kg: 900 },
  ],
  note: 'No traveller is counted twice, and plastic already removed at one cleanup is never counted again toward the next.',
} as const;

/** The interactive illustration. Copy only: the arithmetic is in the page script. */
export const ILLUSTRATION = {
  eyebrow: 'See the commitment build',
  title: 'Small visits. Collective impact.',
  body: 'Move the slider to see how one partner\'s qualifying travellers add up. Each traveller adds 1 kg to the cumulative commitment, and every further 300 travellers triggers another dedicated cleanup. Nothing is counted twice.',
  caption:
    'An illustration of the arithmetic, not a live tracker and not a record of any partner. Committed kilograms are not removed kilograms: removal is reported only after a cleanup has taken place.',
  max: 900,
  step: 25,
  start: 150,
} as const;

/** PUBLISHED on public/impact-center-premium.html: free entry, paid workshops. */
export const CENTER = {
  eyebrow: 'An itinerary stop with a story',
  title: 'More than a stop. A local connection.',
  body:
    'The Impact Center by ZeroPlastic in Sigiriya brings sustainable local craftsmanship, plastic alternatives and Sri Lankan culture together in one place your guests can walk into.',
  points: [
    'Free entry for general visits, every day',
    'Local artisans and more than 1,000 plastic-free products',
    'Optional hands-on craft workshops, which are paid',
    'A story your travellers can take home',
  ],
  note:
    'Transport, optional workshops and purchases are not part of the partnership and stay with the operator or the traveller.',
} as const;

export const EVIDENCE = {
  eyebrow: 'Accountable action',
  title: 'Commitment first. Verified removal after the cleanup.',
  intro:
    'We want partners to talk about this programme accurately. These are the records you receive, and the lines we ask partners not to cross.',
  receive: [
    {
      title: 'Cleanup photographs',
      body: 'Photographs from each dedicated cleanup organised for your company.',
    },
    {
      title: 'Collection records',
      body: 'A record of the plastic collected at each cleanup.',
    },
    {
      title: 'An environmental impact report',
      body: 'A report you can reference in your own responsible-tourism communications.',
    },
    {
      title: 'An invitation to take part',
      body: 'Your employees and representatives may be invited to join your dedicated cleanup, subject to coordination.',
    },
  ],
  claims: {
    can: [
      'Say that each qualifying traveller creates a 1 kg removal commitment.',
      'Report the weight actually collected, once the cleanup has taken place and the records are issued.',
    ],
    cannot: [
      'Say that plastic has been removed before the cleanup happens.',
      'Describe the programme as carbon offsetting, or as cancelling a traveller\'s own plastic footprint.',
    ],
  },
} as const;

/**
 * Prevention matters more than removal, and saying so keeps the page honest
 * about what a beach cleanup is. The longer treatment lives in the WordPress
 * article, which is linked rather than repeated here.
 */
export const PREVENTION = {
  eyebrow: 'Prevention comes first',
  title: 'Cleanups remove plastic. Partners can help stop it arriving.',
  intro:
    'Removing plastic already in the environment is only half the answer. The tourism supply chain is where new waste can be avoided.',
  items: [
    {
      title: 'Replace disposable bottles',
      body: 'Encourage reusable bottles and safe refill options on tours, at accommodation and during transfers.',
    },
    {
      title: 'Rethink procurement',
      body: 'Ask hotels, restaurants and transport suppliers to avoid unnecessary wrapping, single-use amenities and food packaging.',
    },
    {
      title: 'Choose reusable local crafts',
      body: 'Introduce travellers to lasting local crafts instead of disposable souvenirs.',
    },
  ],
  article: {
    label: 'Read the full guide: how to reduce plastic waste in tourism in Sri Lanka',
    href: '/how-to-reduce-plastic-waste-in-tourism-sri-lankas-one-traveller-one-kilogram-initiative/',
  },
} as const;

/**
 * The answers restate the confirmed terms and add nothing. The FAQ JSON-LD is
 * generated from this same array, so the markup and the schema cannot differ.
 */
export const FAQS: { q: string; a: string }[] = [
  {
    q: 'What is One Traveller, One Kilogram?',
    a: `It is a ZeroPlastic Movement partnership with travel businesses. Every qualifying traveller who visits the ZeroPlastic Impact Center in Sigiriya through a registered partner creates a commitment to remove ${PROGRAMME.perTravellerKg} kg of plastic waste from Sri Lanka's environment, primarily from beaches. The programme begins on ${PROGRAMME.launch}.`,
  },
  {
    q: 'Who can become a partner?',
    a: `Tour operators, destination management companies, hotels, international travel companies and group travel businesses that can bring travellers to the Impact Center. We will start with ${PROGRAMME.foundingPartners} founding partners, and we review every application personally, so applying does not guarantee a place.`,
  },
  {
    q: 'Does it cost a travel partner anything?',
    a: 'No. There is no additional participation or cleanup fee for travel partners. General visits to the Impact Center are free. Optional craft workshops and purchases are paid, and transport remains the partner\'s or traveller\'s own cost.',
  },
  {
    q: `When does a partner get a dedicated cleanup?`,
    a: `Each partner's qualifying travellers are recorded separately. When a partner reaches ${PROGRAMME.milestoneTravellers} qualifying travellers, ZeroPlastic organises a dedicated cleanup removing at least ${PROGRAMME.milestoneKg} kg of plastic. The same applies for every additional ${PROGRAMME.milestoneTravellers} travellers: 300 travellers is at least 300 kg, 600 travellers is at least 600 kg cumulatively, 900 travellers is at least 900 kg cumulatively, and so on.`,
  },
  {
    q: 'What is the difference between a commitment and completed removal?',
    a: 'A commitment is created when a qualifying traveller visits: 1 kg of plastic removal that ZeroPlastic pledges. Completed removal is the plastic actually collected at a dedicated cleanup, which is reported with photographs and collection records after the cleanup has taken place. Commitments that have not yet reached a cleanup are pending, and are never described as removed.',
  },
  {
    q: 'Could the same traveller or the same plastic be counted twice?',
    a: 'No. Each qualifying traveller is counted once, for the partner they came through, and belongs to one block of 300. Plastic collected at one cleanup is not counted again toward the next, and a traveller\'s kilogram that has not yet reached a cleanup stays pending until it does.',
  },
  {
    q: 'Has any plastic been removed yet?',
    a: 'Not under this programme. It begins on 1 January 2027. A visit creates a commitment, and plastic is reported as removed only after a dedicated cleanup has taken place and the records are issued.',
  },
  {
    q: 'Is this carbon offsetting, or does it cancel a traveller\'s plastic footprint?',
    a: 'No. It is a commitment to remove plastic waste that is already in the environment. It does not offset carbon, and it does not neutralise the plastic an individual traveller uses. Avoiding new plastic remains the first priority.',
  },
  {
    q: 'What do partners receive?',
    a: 'Cleanup photographs, collection records and an environmental impact report for the partner\'s dedicated cleanup. Partner employees and representatives may also be invited to take part, subject to coordination.',
  },
  {
    q: 'Is the Impact Center free to visit?',
    a: 'Yes. General entry is free, and the centre is open every day from 7:30 to 18:30. Optional hands-on craft workshops and purchases are paid.',
  },
];

export const ORGANISATION_TYPES = [
  'Tour operator',
  'Destination management company (DMC)',
  'Hotel or accommodation',
  'International travel company',
  'Adventure or group travel',
  'Other tourism business',
];

export const TRAVELLER_VOLUMES = [
  'Under 100',
  '100 to 299',
  '300 to 599',
  '600 to 1,199',
  '1,200 or more',
  'Not sure yet',
];

/**
 * The online application form is built but switched off. The Make scenario
 * behind it has not passed end-to-end testing, so until it has, visitors apply
 * by email or WhatsApp. To activate: set this to true AND set
 * PARTNER_ENQUIRY_ENABLED to "true" on the Cloudflare Pages project (the
 * endpoint refuses everything otherwise). Do it only after the integration is
 * verified: a recorded Monday lead, the email and Slack notifications, and no
 * duplicates on a replayed submission.
 */
export const FORM_ENABLED = false;

/** Shown in place of the form while it is off. Email and WhatsApp are the live routes. */
export const APPLY_INTERIM = {
  title: 'Apply by email or WhatsApp',
  body: 'Send us a short message and our team will reply personally. Please include:',
  include: [
    'Company name and type of organisation',
    'Country, and your name and role',
    'Company website',
    'Roughly how many travellers you bring to Sri Lanka each year',
    'Anything else you would like us to know',
  ],
  emailLabel: 'Email impactcenter@zeroplastic.lk',
  whatsappLabel: 'Message us on WhatsApp',
  mailBody:
    'Hello ZeroPlastic,\n\nI would like to apply to become a One Traveller, One Kilogram travel partner.\n\nCompany name:\nType of organisation:\nCountry:\nMy name and role:\nWebsite:\nEstimated travellers to Sri Lanka each year:\nMessage:\n',
} as const;

export const APPLY = {
  eyebrow: 'Applications open',
  title: `Be one of our first ${PROGRAMME.foundingPartners} partners`,
  intro: `We are inviting a small founding group of travel businesses to show how a visit to the Impact Center can lead to documented environmental action, with no additional programme fee. The programme begins ${PROGRAMME.launch}.`,
  callout: 'Submitting an enquiry does not guarantee acceptance. Our team will contact you to discuss eligibility and how the Impact Center fits your Sigiriya itineraries.',
  formTitle: 'Apply to become a partner',
  consent:
    'I agree to be contacted about this partnership enquiry, and that my details will be used to respond to it.',
} as const;

/** Where the page links to, so no href is hand-typed in the template. */
export const LINKS = {
  impactCenter: EXTERNAL.impactCenter,
  sustainableTravel: '/sustainable-travel/',
  privacy: '/privacy-policy/',
  contact: '/contact/',
  general: CONTACT.email,
} as const;

/**
 * Photographs. All three are authentic ZeroPlastic images supplied by the
 * owner; none is stock or generated. Originals are in assets/source/one-kg/
 * and are encoded by scripts/build-one-kg-images.mjs.
 *
 * The programme has not started, so the hero and evidence photographs are
 * from earlier ZeroPlastic cleanups and say so in their captions. They must
 * never be presented as results of this programme.
 *
 * Alt text describes only what is visible. It does not name individuals.
 */
export const PHOTOS = {
  hero: {
    width: 1600,
    height: 1066,
    alt: 'A large group of ZeroPlastic volunteers and international visitors posing together beside piles of black bags of collected plastic, one person holding an "I support #ZeroPlasticMovement" sign.',
    caption: 'From a past ZeroPlastic cleanup',
  },
  center: {
    width: 1200,
    height: 1600,
    alt: 'Smiling visitors sitting at a long wooden workbench trying a hands-on coconut-shell craft at the Impact Center in Sigiriya, while a team member looks on.',
    caption: 'Hands-on craft at the Impact Center',
  },
  weighing: {
    width: 1200,
    height: 1798,
    alt: 'A hand holding a hanging scale with a clear bag of collected plastic waste attached, while a volunteer in a white cap and blue gloves gathers more plastic behind it.',
    caption: 'Weighing collected plastic at a past ZeroPlastic cleanup',
  },
} as const;
