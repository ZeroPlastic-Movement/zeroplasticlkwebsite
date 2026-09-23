/**
 * Site-wide constants.
 *
 * Content here was taken from the existing zeroplastic.lk WordPress site so the
 * static front end carries the same messaging, figures and contact details.
 */

/**
 * WordPress origin, read from the environment rather than hardcoded.
 *
 * The CMS is moving off www.zeroplastic.lk, because that hostname is being
 * handed to Cloudflare Pages. Both the REST API (/wp-json/wp/v2) and the
 * uploads directory (/wp-content/uploads) are served by the WordPress host, so
 * the build needs to know where that host is.
 *
 *   WORDPRESS_BASE_URL   origin serving /wp-json/wp/v2
 *   WORDPRESS_MEDIA_URL  origin serving /wp-content/uploads (defaults to the base)
 *
 * The default deliberately stays on the current production host. Nothing moves
 * until cms.zeroplastic.lk is confirmed reachable and the variable is set, so
 * checking this code in cannot by itself change what a build fetches.
 */
const WP_ORIGIN_FALLBACK = 'https://www.zeroplastic.lk';

function resolveOrigin(value: string | undefined, fallback: string): string {
  const raw = (value ?? '').trim();
  if (!raw) return fallback;

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `Invalid WordPress origin ${JSON.stringify(raw)}. Expected an absolute URL such as https://cms.zeroplastic.lk`,
    );
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`WordPress origin ${JSON.stringify(raw)} must be http or https.`);
  }
  return parsed.origin;
}

const WP_BASE = resolveOrigin(process.env.WORDPRESS_BASE_URL, WP_ORIGIN_FALLBACK);
const WP_MEDIA = resolveOrigin(process.env.WORDPRESS_MEDIA_URL, WP_BASE);

/**
 * Hostnames that historically served WordPress media and must be rewritten to
 * the configured origin at build time.
 *
 * i*.wp.com are Jetpack Photon. Photon is a proxy, not a store: it refetches
 * from the origin on a cache miss and 404s when the origin path is gone. It
 * also only proxies hosts Jetpack recognises, so it cannot be relied on once
 * the CMS moves. Media is therefore pointed straight at the WordPress origin.
 */
export const LEGACY_MEDIA_HOSTS = [
  'www.zeroplastic.lk',
  'zeroplastic.lk',
  'i0.wp.com',
  'i1.wp.com',
  'i2.wp.com',
] as const;

export const SITE = {
  name: 'ZeroPlastic Movement',
  shortName: 'ZeroPlastic',
  url: 'https://www.zeroplastic.lk',
  tagline: 'We say no to single-use plastic',
  description:
    "Sri Lanka's largest youth-led environmental movement, working to cut single-use plastic through education, advocacy, clean-ups and sustainable alternatives.",
  locale: 'en_LK',
  lang: 'en',
  /** WordPress install that still acts as the CMS. Override with WORDPRESS_BASE_URL. */
  wpBase: WP_BASE,
  /** Origin serving /wp-content/uploads. Override with WORDPRESS_MEDIA_URL. */
  wpMediaBase: WP_MEDIA,
} as const;

export const CONTACT = {
  email: 'info@zeroplastic.lk',
  phone: '+94 716 901 094',
  phoneHref: '+94716901094',
  address: {
    name: 'ZeroPlastic Movement HQ',
    street: 'No 256, Olympus, Millennium City',
    locality: 'Athurugiriya',
    country: 'Sri Lanka',
    countryCode: 'LK',
  },
} as const;

export const SOCIAL = [
  { name: 'Facebook', url: 'https://www.facebook.com/ZeroPlastic.lk' },
  { name: 'Instagram', url: 'https://www.instagram.com/zeroplasticlk/' },
  { name: 'LinkedIn', url: 'https://www.linkedin.com/company/zeroplasticmovement/' },
  { name: 'YouTube', url: 'https://www.youtube.com/channel/UCIkWO4RuQ2Z062SaURklBFQ' },
] as const;

export const NAV = [
  { label: 'About', href: '/about/' },
  { label: 'Our Work', href: '/our-work/' },
  { label: 'Clubs', href: '/clubs/' },
  { label: 'Get Involved', href: '/volunteers/' },
  { label: 'Sustainable Travel', href: '/sustainable-travel/' },
  { label: 'Stories', href: '/blog/' },
] as const;

/**
 * Headline impact figures.
 *
 * These are the canonical movement-wide figures for this website. The older
 * numbers still published on the WordPress site are superseded. Historical
 * figures inside individual blog posts are left alone, because they describe
 * the situation at the time each post was written.
 */
export const STATS = [
  { value: '12,000+', label: 'Change makers', detail: 'Activists engaged through ZeroPlastic clubs across Sri Lanka.' },
  { value: '5 million+', label: 'People educated', detail: 'Reached with plastic-reduction education and awareness.' },
  { value: '300,000+', label: 'Volunteers mobilised', detail: 'Taking part in campaigns, clean-ups and education drives.' },
  { value: '1,000+', label: 'Environmental actions', detail: 'Clean-up campaigns and environmental actions delivered.' },
] as const;

/**
 * The movement's own positioning line, taken from the WordPress homepage.
 * Used as the hero headline.
 */
/** Year the movement was formally established. */
export const FOUNDED = 2021;

export const POSITIONING = 'Zero Plastic in Nature, Zero Microplastics in Us';

/**
 * External platforms in the ZeroPlastic ecosystem.
 *
 * Each has its own dedicated site or form. This website explains the
 * programme and then hands off; it never reproduces their functionality.
 */
export const EXTERNAL = {
  impactCenter: 'https://impactcenter.zeroplastic.lk/',
  volunteersAcademy: 'https://volunteersacademy.com/',
  commitment: 'https://www.zeroplasticcommitment.org/',
  schoolClubForm: 'https://forms.monday.com/forms/62b0b890c267e9ec619bf2a9ac155ac4?r=apse2',
  clubForm: 'https://forms.monday.com/forms/5fb1d5240ca347a5e056018f45e117f8?r=apse2',
  travellerPledge: 'https://forms.monday.com/forms/c351b9e6446530939747ada85a9fe335?r=apse2',
  /**
   * Volunteer registration for people in Sri Lanka.
   *
   * Stored as the wkf.ms short link rather than the form it currently
   * resolves to, so the form behind it can be repointed in Monday without a
   * deploy. This is only the local pathway: international applicants use the
   * form embedded in public/volunteer-sri-lanka.html, which posts to its own
   * endpoint and is deliberately not routed through Monday.
   */
  volunteerForm: 'https://wkf.ms/3GkxYNK',
  /**
   * Partnership and contact enquiries, for organisations rather than
   * individual volunteers. This is the same Monday form the production
   * WordPress contact page already embeds, so submissions continue to land in
   * one place. Recovered from the iframe on https://www.zeroplastic.lk/contact/
   * and the same form the short link https://wkf.ms/3EZOTEs resolves to.
   */
  contactFormEmbed: 'https://forms.monday.com/forms/embed/9b3e25c3f1f917465270bfb91b1bf634?r=apse2',
  contactForm: 'https://forms.monday.com/forms/9b3e25c3f1f917465270bfb91b1bf634?r=apse2',
} as const;

export const MISSION =
  "Zero Plastic's mission is to create a behavioural change among Sri Lankan citizens to reduce plastic waste while building a demand for plastic substitutes produced by local entrepreneurs.";

export const GOALS = [
  {
    title: 'Reduce plastic pollution',
    body: 'Awareness campaigns, clean-up drives and education that shift everyday habits away from single-use plastic.',
  },
  {
    title: 'Drive adoption of alternatives',
    body: 'Get people using sustainable plastic alternatives by making them visible, available and desirable.',
  },
  {
    title: 'Empower the entrepreneur network',
    body: 'Expand and support the local producers who make plastic substitutes, building real demand for what they create.',
  },
] as const;

/**
 * The four-pillar framework the movement publishes under "What We Do".
 */
export const PILLARS = [
  {
    stage: 'Prevention',
    title: 'Awareness & education',
    body: 'Raising awareness and educating communities to refuse and reduce plastic use, to cut pollution and promote sustainable practices.',
  },
  {
    stage: 'Assessment',
    title: 'ZeroPlastic Certification',
    body: 'Certification in partnership with Control Union, recognising businesses committed to reducing plastic pollution.',
  },
  {
    stage: 'Removal',
    title: 'Environmental protection',
    body: 'Community-driven clean-ups and plastic traps that capture waste in waterways before it reaches the ocean.',
  },
  {
    stage: 'Reduction',
    title: 'Empowering alternatives',
    body: 'Backing the industries and innovations producing sustainable alternatives to plastic.',
  },
] as const;

/** Figures cited on the Problem Statement page. */
export const PROBLEM_FACTS = [
  {
    value: '1.59M',
    unit: 'tonnes',
    label: 'of plastic waste produced in Sri Lanka each year',
  },
  {
    value: '300,000 → 50,000',
    unit: 'tonnes',
    label: 'decline in fishing stocks between 1980 and 2020',
  },
  {
    value: '65,610',
    unit: 'km²',
    label: 'island carrying one of the world’s highest plastic-pollution rankings',
  },
] as const;

export const PROBLEM_POINTS = [
  'Lack of national-level initiatives driving citizens towards a behavioural change to reduce plastic waste and to encourage development and production of plastic alternatives.',
  'Absence of continued awareness education geared towards creating a behavioural change so citizens seek alternatives for plastic in both consumption and production.',
  'Lack of support for the ecosystem within the country that establishes a healthy level of supply and demand for plastic-alternative products.',
] as const;

export const VOLUNTEER_OPTIONS = [
  {
    title: 'On-ground volunteering',
    body: 'Join clean-up drives, awareness sessions and community events, or support project logistics in person.',
  },
  {
    title: 'Virtual volunteering',
    body: 'Contribute from anywhere by designing flyers, creating content, managing social media campaigns, planning projects or writing press releases.',
  },
] as const;

/**
 * Homepage hero photograph: ZeroPlastic volunteers clearing waste from the
 * rocks at Mount Lavinia beach, from the movement's own media library. Cropped
 * above the burned-in caption bar; otherwise unaltered.
 */
export const HERO = {
  base: '/images/hero-cleanup',
  widths: [640, 960, 1280, 1600],
  alt: 'ZeroPlastic volunteers collecting plastic waste into bags among the rocks at Mount Lavinia beach, Sri Lanka.',
  width: 2000,
  height: 1236,
} as const;

/** Posts shown per page on the blog index. */
export const POSTS_PER_PAGE = 12;

/* ------------------------------------------------------------------ */
/* Advocacy & system change                                            */
/* ------------------------------------------------------------------ */

export const ADVOCACY = [
  {
    title: 'Make Extended Producer Responsibility mandatory',
    body: 'Advocating for mandatory Extended Producer Responsibility, so the companies that place plastic on the market carry the cost and the duty of recovering it.',
    tag: 'Regulation',
  },
  {
    title: 'End single-use PET water bottles in government institutions',
    body: 'Campaigning for Sri Lankan government institutions to eliminate single-use PET drinking-water bottles and move to refill and reuse systems.',
    tag: 'Policy campaign',
  },
  {
    title: 'Cut single-use plastic in institutional operations',
    body: 'Working with institutions and businesses to design single-use plastic out of everyday operations, rather than managing it as waste after the fact.',
    tag: 'Institutional action',
  },
  {
    title: 'Promote reusable systems and alternatives',
    body: 'Making refill and reuse practical, and building demand for the local producers whose alternatives replace single-use plastic.',
    tag: 'Market building',
  },
  {
    title: 'Shift institutional behaviour',
    body: 'Changing procurement habits, event practice and everyday defaults inside organisations, so reduction outlasts any single campaign.',
    tag: 'Behaviour change',
  },
] as const;

/* ------------------------------------------------------------------ */
/* National and global roles                                           */
/* ------------------------------------------------------------------ */

export const MOVEMENT = [
  {
    title: 'World Cleanup Day',
    body: 'ZeroPlastic organises World Cleanup Day activities in Sri Lanka, mobilising volunteers nationwide for the global day of action.',
    meta: 'National organiser',
  },
  {
    title: 'SPOGOMI World Cup',
    body: 'ZeroPlastic Movement is the authorised Sri Lanka organiser for the SPOGOMI World Cup, bringing the global sport of competitive litter collection to Sri Lanka.',
    meta: 'Sri Lanka Authorised Organiser',
  },
  {
    title: 'ZeroPlastic Clubs',
    body: 'A network of clubs across universities, schools and communities, giving the movement a permanent presence in Sri Lankan education.',
    meta: 'Nationwide network',
    href: '/clubs/',
  },
] as const;

/* ------------------------------------------------------------------ */
/* Clubs                                                               */
/* ------------------------------------------------------------------ */

export const CLUB_TYPES = [
  {
    title: 'University clubs',
    body: 'Student-led clubs running campaigns, clean-ups and awareness programmes on campus and in surrounding communities. Clubs operate across Sri Lankan universities and higher-education institutions.',
  },
  {
    title: 'School clubs',
    body: 'ZeroPlastic clubs in schools, introducing students to plastic reduction through hands-on projects, education sessions and school-wide campaigns.',
  },
  {
    title: 'Community clubs',
    body: 'Neighbourhood and community groups taking on local plastic problems, from waterway clean-ups to running refill and reuse initiatives.',
  },
] as const;

/* ------------------------------------------------------------------ */
/* Volunteering                                                        */
/* ------------------------------------------------------------------ */

export const VOLUNTEER_LOCAL = [
  'Environmental campaigns',
  'Clean-ups',
  'Awareness',
  'Education',
  'Advocacy',
  'Research',
  'Communication',
  'University, school and community activities',
] as const;

export const VOLUNTEER_INTERNATIONAL = [
  'Clean-up campaigns',
  'Community engagement',
  'Environmental education',
  'Impact Center activities',
  'Sustainable tourism initiatives',
  'Content creation',
  'Research',
  'Youth engagement',
] as const;

/* ------------------------------------------------------------------ */
/* Sustainable travel                                                  */
/* ------------------------------------------------------------------ */

export const TRAVEL = [
  {
    title: 'Impact Center by ZeroPlastic, Sigiriya',
    body: "Sri Lanka's first plastic-alternative and traveller experience center in Sigiriya, connecting sustainable travel with Sri Lankan culture, craftsmanship and practical alternatives to plastic.",
    points: [
      'Sustainable local craftsmanship',
      'Plastic alternatives',
      'Sri Lankan culture',
      'Environmental responsibility',
      'Community impact',
    ],
    cta: 'Explore the Impact Center',
    href: EXTERNAL.impactCenter,
    image: 'impact-center',
    alt: 'The Impact Center by ZeroPlastic in Sigiriya at dusk, an open timber pavilion lit from within and surrounded by forest.',
  },
  {
    title: 'Travel Without Plastic',
    body: 'A personal commitment travellers can make to cut the plastic they use while travelling in Sri Lanka, from refusing single-use bottles to choosing businesses that have done the same.',
    points: [],
    cta: "Take the Traveller's Pledge",
    href: EXTERNAL.travellerPledge,
    image: 'traveller-craft',
    alt: 'International visitors making coconut-shell craft at a workbench during an Impact Center session.',
  },
] as const;

/* ------------------------------------------------------------------ */
/* Wider ecosystem                                                     */
/* ------------------------------------------------------------------ */

export const ECOSYSTEM = [
  {
    title: 'Volunteers Academy',
    tagline: 'Developing the people behind the movement.',
    body: 'The youth-development and volunteer-development arm of the ZeroPlastic ecosystem, training the volunteers who lead campaigns and clubs.',
    cta: 'Visit Volunteers Academy',
    href: EXTERNAL.volunteersAcademy,
  },
  {
    title: 'ZeroPlastic Commitment Standard',
    tagline: 'A standard for organisations cutting plastic.',
    body: 'A dedicated platform where organisations commit to reducing plastic and have that commitment recognised against a published standard.',
    cta: 'Explore the ZeroPlastic Commitment Standard',
    href: EXTERNAL.commitment,
  },
  {
    title: 'Impact Center by ZeroPlastic',
    tagline: 'Sigiriya.',
    body: "Sri Lanka's first plastic-alternative and traveller experience center, where visitors meet the craftspeople and alternatives replacing plastic.",
    cta: 'Explore the Impact Center',
    href: EXTERNAL.impactCenter,
  },
  {
    title: 'Travel Without Plastic',
    tagline: "A traveller's pledge.",
    body: 'A commitment for visitors to Sri Lanka to reduce the plastic they use while they travel.',
    cta: "Take the Traveller's Pledge",
    href: EXTERNAL.travellerPledge,
  },
] as const;

/** Responsive widths generated for the non-hero section photographs. */
export const SECTION_IMAGE_WIDTHS = [480, 800, 1200] as const;
