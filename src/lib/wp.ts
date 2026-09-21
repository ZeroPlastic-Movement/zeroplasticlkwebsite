/**
 * Build-time WordPress content layer.
 *
 * The existing WordPress install stays the CMS, volunteers keep publishing
 * exactly as they do today, and this module pulls that content over the REST
 * API when the site is built, so visitors are served pre-rendered static HTML
 * instead of a live PHP render.
 *
 * Responses are cached under .cache/wp so repeat builds are fast, and so a
 * transient API outage cannot break a deploy.
 */

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

import { SITE } from '../consts';
import { buildMediaManifest, rewriteMediaUrl, rewriteMediaUrls, setMediaManifest } from './media';

const API = `${SITE.wpBase}/wp-json/wp/v2`;
const PER_PAGE = 100;
const MAX_RETRIES = 3;

/**
 * Raw API responses, which do not depend on where media is served from.
 */
const RAW_CACHE_DIR = join(process.cwd(), '.cache', 'wp');

/**
 * Normalised content, which has media URLs already rewritten into it.
 *
 * Scoped by the configured origins so that flipping WORDPRESS_MEDIA_URL cannot
 * be silently undone by a stale cache: if the API is unreachable straight after
 * the switch, the build fails loudly instead of serving the old host's URLs.
 */
const DERIVED_CACHE_DIR = join(
  RAW_CACHE_DIR,
  createHash('sha1').update(`${SITE.wpBase}|${SITE.wpMediaBase}`).digest('hex').slice(0, 12),
);

export interface WPImage {
  src: string;
  srcset?: string;
  width?: number;
  height?: number;
  alt: string;
}

export interface WPPost {
  id: number;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  date: string;
  modified: string;
  categories: string[];
  image: WPImage | null;
  readingMinutes: number;
}

/* ------------------------------------------------------------------ */
/* fetching                                                            */
/* ------------------------------------------------------------------ */

async function readCache<T>(key: string, dir = DERIVED_CACHE_DIR): Promise<T | null> {
  try {
    return JSON.parse(await readFile(join(dir, `${key}.json`), 'utf8')) as T;
  } catch {
    return null;
  }
}

async function writeCache(key: string, value: unknown, dir = DERIVED_CACHE_DIR): Promise<void> {
  const file = join(dir, `${key}.json`);
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value), 'utf8');
}

async function fetchJSON(url: string): Promise<{ body: any; totalPages: number }> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'zeroplastic-astro-build' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
      return {
        body: await res.json(),
        totalPages: Number(res.headers.get('x-wp-totalpages') ?? '1'),
      };
    } catch (error) {
      lastError = error;
      if (attempt < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 2 ** attempt * 500));
      }
    }
  }

  throw lastError;
}

/** Fetch every page of a paginated collection. */
async function fetchAll(path: string, params: Record<string, string>): Promise<any[]> {
  const query = new URLSearchParams({ ...params, per_page: String(PER_PAGE) });
  const items: any[] = [];

  query.set('page', '1');
  const first = await fetchJSON(`${API}/${path}?${query}`);
  items.push(...first.body);

  for (let page = 2; page <= first.totalPages; page++) {
    query.set('page', String(page));
    const next = await fetchJSON(`${API}/${path}?${query}`);
    items.push(...next.body);
  }

  return items;
}

/* ------------------------------------------------------------------ */
/* normalising                                                         */
/* ------------------------------------------------------------------ */

const ENTITIES: Record<string, string> = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&#39;': "'",
  '&nbsp;': ' ', '&hellip;': '…', '&#8217;': '’', '&#8216;': '‘',
  '&#8220;': '“', '&#8221;': '”', '&#8211;': '–', '&#8212;': '—',
  '&#038;': '&', '&#8230;': '…',
};

export function decodeEntities(input: string): string {
  return input
    .replace(/&[a-zA-Z]+;|&#\d+;/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

/**
 * House style: the site does not use em dashes in public-facing copy.
 *
 * A small number of WordPress posts are written with them, so they are
 * normalised to commas here rather than edited in WordPress. Only the
 * punctuation changes; the wording is untouched.
 */
export function houseStyle(input: string): string {
  return input
    .replace(/\s*\u2014\s*/g, ', ')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,/g, ',');
}

export function stripTags(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

/**
 * WordPress ships legacy WPBakery shortcodes on some older pages. They render as
 * literal text, so strip them rather than showing `[vc_row ...]` to visitors.
 */
export function stripShortcodes(html: string): string {
  return html.replace(/\[\/?[a-z_]+[^\]]*\]/gi, '');
}

function toImage(media: any, fallbackAlt: string): WPImage | null {
  if (!media?.source_url) return null;

  const sizes = media.media_details?.sizes ?? {};
  // Prefer a mid-weight variant as the default src; WordPress already generated
  // these, so we avoid serving multi-megabyte originals.
  const preferred = sizes.medium_large ?? sizes.large ?? sizes.medium ?? sizes.full;

  const srcset = Object.values<any>(sizes)
    .filter((s) => s?.source_url && s?.width)
    .sort((a, b) => a.width - b.width)
    .map((s) => `${s.source_url} ${s.width}w`)
    .join(', ');

  return {
    src: rewriteMediaUrl(preferred?.source_url ?? media.source_url),
    srcset: srcset ? rewriteMediaUrls(srcset) : undefined,
    width: preferred?.width,
    height: preferred?.height,
    alt: decodeEntities(media.alt_text || fallbackAlt),
  };
}

function readingMinutes(html: string): number {
  const words = stripTags(html).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/**
 * WordPress percent-encodes non-Latin slugs (several posts use Sinhala titles).
 * Astro matches routes against the decoded path, so decode once on ingest and
 * let the router re-encode when it writes the file.
 */
function decodeSlug(slug: string): string {
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}

function toPost(raw: any): WPPost {
  const embedded = raw._embedded ?? {};
  const media = embedded['wp:featuredmedia']?.[0];
  const terms: any[][] = embedded['wp:term'] ?? [];

  const title = houseStyle(decodeEntities(raw.title?.rendered ?? ''));

  return {
    id: raw.id,
    slug: decodeSlug(raw.slug),
    title,
    excerpt: rewriteMediaUrls(houseStyle(stripTags(raw.excerpt?.rendered ?? ''))),
    content: rewriteMediaUrls(houseStyle(stripShortcodes(raw.content?.rendered ?? ''))),
    date: raw.date,
    modified: raw.modified ?? raw.date,
    categories: terms
      .flat()
      .filter((t) => t?.taxonomy === 'category' && t.name !== 'Uncategorized')
      .map((t) => decodeEntities(t.name)),
    image: toImage(media, title),
    readingMinutes: readingMinutes(raw.content?.rendered ?? ''),
  };
}

/* ------------------------------------------------------------------ */
/* public API                                                          */
/* ------------------------------------------------------------------ */

let manifestPromise: Promise<void> | null = null;

/**
 * Load the media size manifest, once per build.
 *
 * Tells the media rewriter which resized variants WordPress actually generated,
 * so a Photon `?fit=300,225` URL can be resolved to a real file instead of
 * falling back to the full-size original. Fetch failures are not fatal: without
 * the manifest every image still resolves, just to its original file.
 */
function ensureMediaManifest(): Promise<void> {
  manifestPromise ??= (async () => {
    const cacheKey = 'media';

    try {
      const raw = await fetchAll('media', {
        _fields: 'media_details',
        orderby: 'id',
        order: 'asc',
      });
      await writeCache(cacheKey, raw, RAW_CACHE_DIR);
      setMediaManifest(buildMediaManifest(raw));
      console.log(`[wp] media manifest: ${raw.length} items from ${API}`);
    } catch (error) {
      const cached = await readCache<any[]>(cacheKey, RAW_CACHE_DIR);
      if (cached?.length) {
        setMediaManifest(buildMediaManifest(cached));
        console.warn(`[wp] media manifest fetch failed, using ${cached.length} cached items`);
        return;
      }
      console.warn(
        `[wp] media manifest unavailable (${(error as Error).message}); ` +
          'images will resolve to full-size originals',
      );
    }
  })();

  return manifestPromise;
}

let postsPromise: Promise<WPPost[]> | null = null;

/**
 * Every published post, newest first.
 *
 * Memoised so the many routes that need it during a build share one fetch.
 */
export function getAllPosts(): Promise<WPPost[]> {
  postsPromise ??= (async () => {
    const cacheKey = 'posts';

    try {
      await ensureMediaManifest();

      const raw = await fetchAll('posts', {
        _embed: 'wp:featuredmedia,wp:term',
        orderby: 'date',
        order: 'desc',
        status: 'publish',
      });

      const posts = raw.map(toPost).filter((p) => p.slug && p.title);
      await writeCache(cacheKey, posts);
      console.log(`[wp] fetched ${posts.length} posts from ${API}`);
      return posts;
    } catch (error) {
      const cached = await readCache<WPPost[]>(cacheKey);
      if (cached?.length) {
        console.warn(
          `[wp] fetch failed (${(error as Error).message}), falling back to ${cached.length} cached posts`,
        );
        return cached;
      }
      throw new Error(
        `Unable to reach the WordPress REST API at ${API} and no cache is available: ${(error as Error).message}`,
      );
    }
  })();

  return postsPromise;
}

export async function getRecentPosts(limit: number): Promise<WPPost[]> {
  return (await getAllPosts()).slice(0, limit);
}

export interface WPPage {
  slug: string;
  title: string;
  content: string;
}

/**
 * A single WordPress page by slug.
 *
 * Used for the legal pages, so their text stays editable in WordPress and this
 * site never becomes the place where legal wording is authored.
 */
export async function getPageBySlug(slug: string): Promise<WPPage | null> {
  const cacheKey = `page-${slug}`;

  try {
    await ensureMediaManifest();

    const { body } = await fetchJSON(
      `${API}/pages?slug=${encodeURIComponent(slug)}&_fields=slug,title,content`,
    );
    const raw = Array.isArray(body) ? body[0] : null;
    if (!raw) return null;

    const page: WPPage = {
      slug: raw.slug,
      title: houseStyle(decodeEntities(raw.title?.rendered ?? '')),
      content: rewriteMediaUrls(houseStyle(stripShortcodes(raw.content?.rendered ?? ''))),
    };
    await writeCache(cacheKey, page);
    return page;
  } catch (error) {
    const cached = await readCache<WPPage>(cacheKey);
    if (cached) {
      console.warn(`[wp] page "${slug}" fetch failed, using cache`);
      return cached;
    }
    throw new Error(`Unable to fetch WordPress page "${slug}": ${(error as Error).message}`);
  }
}

/** Distinct category names across all posts, most used first. */
export async function getCategories(): Promise<string[]> {
  const counts = new Map<string, number>();
  for (const post of await getAllPosts()) {
    for (const category of post.categories) {
      counts.set(category, (counts.get(category) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
}
