/**
 * Site-wide constants.
 *
 * Content here was taken from the existing zeroplastic.lk WordPress site so the
 * static front end carries the same messaging, figures and contact details.
 */

export const SITE = {
  name: 'ZeroPlastic Movement',
  shortName: 'ZeroPlastic',
  url: 'https://www.zeroplastic.lk',
  tagline: 'We say no to plastic',
  description:
    'A vibrant environmental organization dedicated to fostering a global transformation towards the reduction of plastic waste & promotion of sustainable alternatives.',
  locale: 'en_LK',
  lang: 'en',
  /** WordPress install that still acts as the CMS. */
  wpBase: 'https://www.zeroplastic.lk',
  /**
   * Media host. The WordPress install has Jetpack Site Accelerator enabled, so
   * uploads are rewritten to the Photon CDN — that, not wpBase, is where the
   * browser actually fetches images from.
   */
  mediaHost: 'https://i0.wp.com',
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
  { label: 'The Problem', href: '/problem-statement/' },
  { label: 'Projects', href: '/blog/' },
  { label: 'Volunteer', href: '/volunteers/' },
  { label: 'Contact', href: '/contact/' },
] as const;

/**
 * Headline impact figures, as published in the "What We Do" section of the
 * WordPress homepage. These supersede the older About-page numbers.
 */
export const STATS = [
  { value: '11,000', label: 'Change makers', detail: 'Activists engaged under ZeroPlastic clubs across the region.' },
  { value: '2 million', label: 'People educated', detail: 'Taught the 6Rs through ZeroPlastic club activities.' },
  { value: '100,000', label: 'Volunteers mobilised', detail: 'Joined environmental education and clean-up drives.' },
  { value: '1,000+', label: 'Clean-ups executed', detail: 'Organised and delivered across the country.' },
  { value: '250 MT', label: 'Plastic cleared', detail: 'Removed from waterways, coastlines and public spaces.' },
  { value: 'No. 1', label: 'Volunteer hours in Sri Lanka', detail: 'Highest recorded for 2023, recognised by UN Volunteers.' },
] as const;

/**
 * The movement's own positioning line, taken from the WordPress homepage.
 * Used as the hero headline.
 */
export const POSITIONING = 'Zero plastic in nature. Zero microplastics in humans.';

/** Public plastic-pollution reporting tool run by the movement. */
export const ALERT_URL = 'https://alert.zeroplastic.lk/';

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
