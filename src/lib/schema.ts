/**
 * JSON-LD builders.
 *
 * Structured data is how search engines learn that ZeroPlastic is an NGO in
 * Sri Lanka and that each post is a dated article, the current site publishes
 * almost none of this.
 */

import { CONTACT, FOUNDED, SITE, SOCIAL } from '../consts';

/**
 * Structured data must describe the host it is served from, otherwise staging
 * emits a canonical of zeroplasticlk.pages.dev alongside JSON-LD identifiers
 * pointing at the production domain. Astro exposes the configured `site`, so
 * schema URLs follow the build rather than being hardcoded.
 */
const BASE = (import.meta.env.SITE ?? SITE.url).replace(/\/$/, '');

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    '@id': `${BASE}/#organization`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: BASE,
    description: SITE.description,
    foundingDate: String(FOUNDED),
    email: CONTACT.email,
    telephone: CONTACT.phone,
    areaServed: { '@type': 'Country', name: 'Sri Lanka' },
    address: {
      '@type': 'PostalAddress',
      streetAddress: `${CONTACT.address.name}, ${CONTACT.address.street}`,
      addressLocality: CONTACT.address.locality,
      addressCountry: CONTACT.address.countryCode,
    },
    sameAs: SOCIAL.map((s) => s.url),
  };
}

export function websiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${BASE}/#website`,
    url: BASE,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: { '@id': `${BASE}/#organization` },
  };
}

export function articleSchema(post: {
  title: string;
  excerpt: string;
  date: string;
  modified: string;
  slug: string;
  image: { src: string } | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'NewsArticle',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.modified,
    mainEntityOfPage: `${BASE}/${post.slug}/`,
    ...(post.image ? { image: [post.image.src] } : {}),
    author: { '@id': `${BASE}/#organization` },
    publisher: { '@id': `${BASE}/#organization` },
    inLanguage: SITE.lang,
  };
}

export function breadcrumbSchema(trail: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: new URL(item.url, BASE).href,
    })),
  };
}
