/**
 * JSON-LD builders.
 *
 * Structured data is how search engines learn that ZeroPlastic is an NGO in
 * Sri Lanka and that each post is a dated article — the current site publishes
 * almost none of this.
 */

import { CONTACT, SITE, SOCIAL } from '../consts';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'NGO',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    alternateName: SITE.shortName,
    url: SITE.url,
    description: SITE.description,
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
    '@id': `${SITE.url}/#website`,
    url: SITE.url,
    name: SITE.name,
    description: SITE.description,
    inLanguage: SITE.lang,
    publisher: { '@id': `${SITE.url}/#organization` },
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
    mainEntityOfPage: `${SITE.url}/${post.slug}/`,
    ...(post.image ? { image: [post.image.src] } : {}),
    author: { '@id': `${SITE.url}/#organization` },
    publisher: { '@id': `${SITE.url}/#organization` },
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
      item: new URL(item.url, SITE.url).href,
    })),
  };
}
