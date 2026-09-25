/**
 * Content model for /self-drive-sri-lanka/.
 *
 * A Google Ads landing page for independent travellers driving Sri Lanka by
 * tuk-tuk, bike or car, pointing them at the Impact Center in Sigiriya.
 *
 * Every factual claim here is tagged in the comments with where it was
 * verified. Three sources, in descending order of authority:
 *
 *   PUBLISHED  already live in public/impact-center-premium.html, which is the
 *              current Google Ads landing page for the Impact Center. Safe.
 *   CONFIRMED  signed off by the business owner at review as a verified
 *              business requirement for this page. Not published elsewhere
 *              yet, but authoritative: the owner is the source of truth for
 *              their own operation.
 *   OMITTED    could not be verified in either. Left off the page entirely.
 *              See UNVERIFIED at the foot of this file.
 */

export interface Step {
  n: string;
  title: string;
  body: string;
}

export interface Card {
  title: string;
  body: string;
  note?: string;
}

/* ------------------------------------------------------------------ */
/* Verified constants                                                  */
/* ------------------------------------------------------------------ */

/** PUBLISHED: "Free entry · Open daily 7:30 — 18:30" on the Impact Center page. */
export const VISIT = {
  hours: '7:30 to 18:30, every day',
  entry: 'Free entry, no ticket and no booking for a normal visit',
  /** PUBLISHED: "About 5 km before Sigiriya Rock". */
  distance: 'About 5 km before Sigiriya Rock, on the main road',
  /** PUBLISHED: the map link already used by the Impact Center page. */
  directions: 'https://maps.app.goo.gl/jEaZkPa4oMAFCiTu9',
  /** PUBLISHED: the WhatsApp number already used by the Impact Center page. */
  whatsapp: 'https://wa.me/94716901094',
  /**
   * The Impact Center's "Plan your visit or request an experience" section,
   * which is where a workshop enquiry belongs. Site-relative on purpose: it is
   * the same origin, so it needs no new tab and works on preview deploys.
   */
  planVisit: '/impact-center-premium.html#plan',
} as const;

/**
 * PUBLISHED: "249 artisan families" and "more than 1,000 plastic-free
 * products" both appear in the live Impact Center page copy and its meta
 * description.
 */
export const ARTISAN = {
  families: '249',
  products: '1,000+',
} as const;

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

export const HERO = {
  eyebrow: 'RESPONSIBLE TRAVEL STOP · SIGIRIYA',
  h1: 'Sri Lanka by Tuk Tuk, Bike or Self-Drive',
  sub: 'Drive deeper. Travel responsibly.',
  body: [
    'Travelling independently across Sri Lanka gives you the freedom to discover villages, communities and places beyond the usual tourist route.',
    'If your journey takes you through Sigiriya, make ZeroPlastic Impact Center one of your meaningful stops.',
    'Drop off suitable plastic collected during your journey, refill your water bottle, use our washrooms, meet local craftspeople, see waste transformed, join a hands-on workshop and continue your road trip with a smaller plastic footprint.',
  ],
  primary: { label: 'Add ZeroPlastic to Your Route', href: '#visit', event: 'self_drive_get_directions' },
  secondary: { label: 'View Experiences', href: '#experiences', event: 'self_drive_view_experience' },
} as const;

/** In-page jump navigation. Every id exists as a section on the page. */
export const JUMPNAV = [
  { label: 'Road Trip Stop', href: '#journey' },
  { label: 'Free Services', href: '#free' },
  { label: 'Experiences', href: '#experiences' },
  { label: 'Families', href: '#families' },
  { label: 'Couples', href: '#couples' },
  { label: 'Local Makers', href: '#artisans' },
  { label: 'Discounts', href: '#benefit' },
  { label: 'Rental Partners', href: '#partners' },
  { label: 'FAQ', href: '#faq' },
] as const;

/* ------------------------------------------------------------------ */
/* Journey                                                             */
/* ------------------------------------------------------------------ */

export const JOURNEY: Step[] = [
  { n: '01', title: 'DRIVE', body: 'Explore Sri Lanka independently by tuk-tuk, bike, scooter or car.' },
  { n: '02', title: 'COLLECT', body: 'Keep suitable plastic bottles and travel plastic safely with you rather than leaving them behind.' },
  { n: '03', title: 'DROP', body: 'Bring them to the ZeroPlastic Elephant at the Impact Center in Sigiriya.' },
  { n: '04', title: 'REFILL', body: 'Refill your reusable drinking-water bottle free of charge.' },
  { n: '05', title: 'CREATE', body: 'See bottle lids and recovered materials transformed into small ornaments or useful products.' },
  { n: '06', title: 'SUPPORT', body: `Discover products sourced from ${ARTISAN.families} local artisan families and support Sri Lankan craftspeople.` },
  { n: '07', title: 'CONTINUE', body: 'Continue your journey with less waste and a stronger connection to local communities.' },
];

/* ------------------------------------------------------------------ */
/* Free services                                                       */
/*                                                                     */
/* CONFIRMED: free drinking-water refill and free washroom access were  */
/* signed off by the owner at review as available to self-drive         */
/* travellers. The drop-off and the demonstration are PUBLISHED.        */
/* ------------------------------------------------------------------ */

export const FREE: Card[] = [
  {
    title: 'Free water refill',
    body: 'Refill your reusable drinking bottle before continuing your journey.',
  },
  {
    title: 'Free washroom access',
    body: 'Take a comfortable break during your road trip.',
  },
  {
    title: 'Plastic drop-off',
    body: 'Leave suitable plastic collected during your journey at our Impact Center.',
    note: 'Please ask our team which materials we currently accept.',
  },
  {
    title: 'Free waste-to-value demonstration',
    body: 'See how recovered bottle lids can be transformed into small ornaments or fridge magnets.',
    note: 'The demonstration is free. Hands-on craft workshops are paid and arranged separately.',
  },
];

/* ------------------------------------------------------------------ */
/* Experiences                                                         */
/*                                                                     */
/* PUBLISHED: coconut shell carving, mask painting and recycled        */
/* plastic craft are all named on the live Impact Center page, as is   */
/* the Tree of Life experience and its advance-booking requirement.    */
/* No prices or durations are published, so none are stated here.      */
/* ------------------------------------------------------------------ */

export interface Experience {
  id: string;
  title: string;
  body: string;
  meta: string;
}

export const EXPERIENCES: Experience[] = [
  {
    id: 'coconut',
    title: 'Make Your Own Coconut Shell Bowl',
    body: 'Turn a discarded coconut shell into a useful handmade bowl while learning why the coconut tree is known as the Tree of Life in Sri Lanka.',
    meta: 'Paid hands-on workshop. The Tree of Life experience requires advance booking.',
  },
  {
    id: 'craft',
    title: 'Carving, Jewellery and Mask Painting',
    body: 'Coconut shell carved into bowls and jewellery, and traditional mask painting, depending on who is working the bench that day.',
    meta: 'Paid hands-on workshop. Ask the team what is running when you arrive.',
  },
  {
    id: 'waste-to-value',
    title: 'Turn Plastic Into Something New',
    body: 'See recovered plastic bottle lids transformed into a small ornament, fridge magnet or creative piece.',
    meta: 'Watching the demonstration is free. A hands-on session is a paid workshop.',
  },
];

/* ------------------------------------------------------------------ */
/* Benefit                                                             */
/*                                                                     */
/* CONFIRMED: the owner signed off both rates at review. 20% is for     */
/* customers arriving through a registered Responsible Travel Partner;  */
/* 15% is for independent travellers whose rental company is not yet    */
/* registered. Both apply to ELIGIBLE purchases and ELIGIBLE paid       */
/* workshops only. Keep "eligible" in the copy: it is what stops the    */
/* page promising a discount on future excluded products or services.   */
/* ------------------------------------------------------------------ */

export const BENEFIT = {
  intro:
    'The discounts exist to encourage more travellers to choose local products and meaningful experiences over another mass-produced souvenir.',
  cards: [
    {
      label: 'Partner Benefit',
      who: 'Registered Partner Customer',
      rate: '20% OFF',
      body: 'Customers arriving through a registered ZeroPlastic Responsible Travel Partner receive 20% off eligible Impact Center purchases and eligible paid workshop experiences.',
    },
    {
      label: 'Ask Our Team',
      who: 'Independent Traveller',
      rate: '15% OFF',
      body: 'Travelling with a tuk-tuk, bike, scooter, motorbike or self-drive vehicle from a rental company that is not yet registered? Ask our Impact Center team for the independent traveller discount: 15% off eligible Impact Center purchases and eligible paid workshop experiences.',
    },
  ],
  footnote: 'Free services are available regardless of discount status where applicable:',
  freeList: [
    'drinking-water refill',
    'washroom access',
    'suitable travel-plastic drop-off',
    'waste-to-value demonstration',
  ],
} as const;

/* ------------------------------------------------------------------ */
/* Partners                                                            */
/*                                                                     */
/* CONFIRMED: the owner signed off at review that TukTukRental.com is  */
/* an official partner of ZeroPlastic Impact Center Sigiriya.          */
/*                                                                     */
/* The partnership is named but never exclusive. Travellers using any  */
/* other rental company are welcome, and those businesses are invited  */
/* to join the Responsible Travel Partner network. Keep it that way.   */
/* ------------------------------------------------------------------ */

export const PARTNERS = {
  heading: 'Responsible Self-Drive Travel Partners',
  body: [
    'TukTukRental.com and ZeroPlastic Impact Center Sigiriya have partnered to encourage more responsible self-drive travel across Sri Lanka.',
    'Registered ZeroPlastic rental partners can offer their customers 20% off eligible Impact Center purchases and eligible paid workshop experiences.',
  ],
  inclusive: 'Travelling with another rental company? You are welcome too.',
  invite:
    'If your rental business is not yet registered, ask them to join the ZeroPlastic Responsible Travel Partner network.',
  cta: { label: 'Register Your Rental Business', href: '/contact/', event: 'self_drive_partner_register' },
} as const;

export const RENTAL_BENEFITS = {
  customers: [
    '20% off eligible Impact Center purchases',
    '20% off eligible paid workshop experiences',
    'free water refill',
    'free washroom access',
    'plastic drop-off',
    'waste-to-value demonstration',
    'local artisan connection',
    'a responsible travel experience in Sigiriya',
  ],
} as const;

/* ------------------------------------------------------------------ */
/* FAQ                                                                 */
/*                                                                     */
/* The FAQPage JSON-LD is generated from this array, so the structured */
/* data cannot drift from what a visitor reads.                        */
/* ------------------------------------------------------------------ */

export interface Faq {
  id: string;
  q: string;
  a: string[];
}

export const FAQS: Faq[] = [
  {
    id: 'other-rental',
    q: 'Can I visit ZeroPlastic Impact Center if I rented my tuk-tuk from another company?',
    a: [
      'Yes. Independent travellers are welcome regardless of rental company.',
      'Customers from registered ZeroPlastic rental partners receive the registered partner benefit. If your rental company is not registered, ask our team about the independent traveller discount.',
    ],
  },
  {
    id: 'discount',
    q: 'What discount do self-drive travellers receive?',
    a: [
      'Customers arriving through a registered ZeroPlastic Responsible Travel Partner receive 20% off eligible Impact Center purchases and eligible paid workshop experiences.',
      'Independent travellers arriving through a rental company that is not registered with ZeroPlastic may ask our team for the independent traveller discount: 15% off eligible Impact Center purchases and eligible paid workshop experiences.',
    ],
  },
  {
    id: 'register',
    q: 'How can my tuk-tuk rental company register?',
    a: [
      'Use the Responsible Travel Partner contact route on this page. Our team will review the request and provide the current partner terms and customer-benefit details.',
    ],
  },
  {
    id: 'bring-plastic',
    q: 'Can I bring plastic collected during my road trip?',
    a: [
      'Yes. Suitable plastic can be brought to the Impact Center and placed in the ZeroPlastic Elephant.',
      'Ask the team which materials are currently accepted. Not every type of plastic can be recovered.',
    ],
  },
  {
    id: 'refill',
    q: 'Can I refill my water bottle?',
    a: ['Yes. Self-drive travellers can refill reusable drinking-water bottles at the Impact Center.'],
  },
  {
    id: 'children',
    q: 'Can children join the activities?',
    a: [
      'Families are welcome.',
      'Several craft and waste-awareness experiences can be suitable for children depending on the activity. Ask the team if you need guidance for younger children.',
    ],
  },
  {
    id: 'booking',
    q: 'Do I have to book before visiting?',
    a: [
      'Not for a normal visit. Entry and looking around are free every day during opening hours, with no ticket and no booking.',
      'Booking applies to paid experiences: hands-on craft workshops, and the Tree of Life experience, which requires advance booking.',
    ],
  },
  {
    id: 'rentals',
    q: 'Do you rent tuk-tuks?',
    a: [
      'No. ZeroPlastic Impact Center does not rent vehicles.',
      'We work with responsible travel and rental partners and welcome independent travellers using tuk-tuks, motorbikes, scooters or self-drive cars. Already rented a tuk-tuk in Negombo, Colombo or elsewhere in Sri Lanka? You are welcome to stop in.',
    ],
  },
  {
    id: 'where',
    q: 'Where is ZeroPlastic Impact Center?',
    a: [
      'About 5 km before Sigiriya Rock, on the main road, in Sigiriya, Sri Lanka.',
      'It is an easy stop if you are driving between Dambulla and Sigiriya, or touring the Cultural Triangle.',
    ],
  },
  {
    id: 'couples',
    q: 'What can couples do at the Impact Center?',
    a: [
      'Create a handmade keepsake together in a paid craft workshop, see the ZeroPlastic Elephant, browse locally made products, refill your bottles and continue your road trip.',
    ],
  },
  {
    id: 'families',
    q: 'What can families with children do?',
    a: [
      'Children can drop travel plastic into the ZeroPlastic Elephant, watch the free waste-to-value demonstration, browse locally made alternatives to plastic and, where suitable, join a paid hands-on craft session.',
    ],
  },
];

/**
 * UNVERIFIED and therefore deliberately absent from this page.
 *
 * Each of these appeared in the brief as a candidate claim. None could be
 * confirmed against the repository or the live Impact Center page, so none is
 * published. Supply a source and they can be added.
 *
 *   0% ZeroPlastic commission on artisan sales
 *       No mention of commission anywhere in the repository.
 *   250+ metric tonnes of plastic removed
 *       Not present in src/consts.ts or any page.
 *   200,000+ people mobilised
 *       CONFLICT. src/consts.ts publishes "300,000+ Volunteers mobilised".
 *   2 million+ educated in person
 *       CONFLICT. src/consts.ts publishes "5 million+ People educated".
 *   10 million+ annual social reach
 *       Not present anywhere.
 *   Workshop prices and durations
 *       No prices or per-workshop durations are published.
 *   Exact list of materials accepted at the elephant
 *       Not published, so the page tells visitors to ask the team.
 *   "Government-registered" non-profit
 *       The owner confirmed "a registered Sri Lankan non-profit" at review,
 *       which is the wording this page uses. The stronger
 *       "government-registered" phrasing was explicitly withheld, so it must
 *       not appear here without separate instruction.
 */
export const UNVERIFIED = [
  '0% commission on artisan sales',
  '250+ metric tonnes of plastic removed',
  '200,000+ mobilised (repository says 300,000+)',
  '2 million+ educated (repository says 5 million+)',
  '10 million+ annual reach',
  'workshop prices and durations',
  'list of materials accepted at the elephant',
  '"government-registered" wording ("registered Sri Lankan non-profit" is approved)',
] as const;
