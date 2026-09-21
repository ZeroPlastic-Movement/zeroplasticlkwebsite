/**
 * Build-time rewriting of WordPress media URLs.
 *
 * WordPress content arrives with image URLs pointing at two places, and both of
 * them break when www.zeroplastic.lk is handed to Cloudflare Pages:
 *
 *   1. Direct origin URLs, https://www.zeroplastic.lk/wp-content/uploads/...
 *   2. Jetpack Photon URLs, https://i0.wp.com/www.zeroplastic.lk/wp-content/...
 *
 * Photon is a proxy, not a store. It refetches from the origin on a cache miss
 * and returns 404 when the origin path is gone, so it is not a way to survive
 * the move. It also only proxies hostnames Jetpack recognises (an arbitrary
 * host returns 400), which means it cannot be pointed at a new CMS hostname
 * without Jetpack being reconnected there. Photon is therefore dropped and all
 * media is pointed straight at the WordPress origin.
 *
 * Dropping Photon means losing its on-the-fly resizing, so a `?fit=300,225`
 * URL has to be resolved to a real file. WordPress generates its own resized
 * variants and the media library lists exactly which ones exist, so that list
 * is the source of truth. Synthesising `-300x225` filenames instead was
 * measured against production and failed for about 15% of URLs, every failure
 * being a requested size at or above the original, where WordPress never
 * generates a variant.
 *
 * When a size cannot be resolved the original file is used. That is always
 * correct, because the original is the file the Photon URL was derived from.
 */

import { LEGACY_MEDIA_HOSTS, SITE } from '../consts';

interface Variant {
  width: number;
  /** Basename of the generated file, e.g. "photo-300x225.jpeg". */
  file: string;
}

/** Keyed by the upload-relative path, e.g. "2025/10/photo.jpeg". */
export type MediaManifest = Map<string, { width: number; variants: Variant[] }>;

/**
 * Hostnames that can appear as a WordPress media origin.
 *
 * The configured origins are included alongside the historical ones because
 * Jetpack builds its Photon URLs from whatever `siteurl` currently is. Moving
 * WordPress to cms.zeroplastic.lk changed the host nested inside every Photon
 * URL from www to cms, so a fixed list silently stopped matching and 24,594
 * Photon URLs survived into a build. Deriving the set from configuration keeps
 * that from happening again if the CMS ever moves.
 */
const LEGACY_HOSTS = new Set<string>([
  ...LEGACY_MEDIA_HOSTS,
  new URL(SITE.wpBase).hostname,
  new URL(SITE.wpMediaBase).hostname,
]);
const PHOTON_HOSTS = new Set(['i0.wp.com', 'i1.wp.com', 'i2.wp.com']);

let manifest: MediaManifest = new Map();

export function setMediaManifest(next: MediaManifest): void {
  manifest = next;
}

/**
 * Build the manifest from raw /wp/v2/media records.
 *
 * `media_details.file` and `sizes[].file` are used rather than `source_url`,
 * because Jetpack rewrites `source_url` to a Photon URL in API responses.
 * Those two fields are host independent.
 */
export function buildMediaManifest(raw: any[]): MediaManifest {
  const map: MediaManifest = new Map();

  for (const item of raw) {
    const details = item?.media_details;
    const file: string | undefined = details?.file;
    if (!file || typeof details?.width !== 'number') continue;

    const variants: Variant[] = Object.values<any>(details.sizes ?? {})
      .filter((size) => typeof size?.width === 'number' && typeof size?.file === 'string')
      .map((size) => ({ width: size.width as number, file: size.file as string }))
      .sort((a, b) => a.width - b.width);

    map.set(file, { width: details.width, variants });
  }

  return map;
}

/** The path a WordPress upload URL refers to, relative to the uploads root. */
function uploadKey(pathname: string): string | null {
  const marker = '/uploads/';
  const at = pathname.indexOf(marker);
  if (at === -1) return null;
  return decodeURIComponent(pathname.slice(at + marker.length));
}

/** Target width requested by a Photon URL, if it asks for one. */
function requestedWidth(search: URLSearchParams): number | null {
  for (const key of ['fit', 'resize']) {
    const value = search.get(key);
    if (value) {
      const width = Number.parseInt(value.split(',')[0]!, 10);
      if (Number.isFinite(width) && width > 0) return width;
    }
  }
  const w = Number.parseInt(search.get('w') ?? '', 10);
  return Number.isFinite(w) && w > 0 ? w : null;
}

/**
 * Resolve a requested width to a real file, falling back to the original.
 *
 * Picks an exact width match, otherwise the smallest generated variant that is
 * still at least as wide as requested, so an image is never upscaled by the
 * browser. Anything at or above the original resolves to the original.
 */
function resolveVariant(key: string, width: number | null): string | null {
  const entry = manifest.get(key);
  if (!entry || width === null || width >= entry.width) return null;

  const exact = entry.variants.find((v) => v.width === width);
  if (exact) return exact.file;

  const larger = entry.variants.find((v) => v.width >= width);
  return larger?.file ?? null;
}

/**
 * Rewrite one absolute URL to the configured WordPress media origin.
 *
 * Returns the input unchanged for anything that is not WordPress media, so it
 * is safe to run over arbitrary URLs. Output never carries a query string.
 */
export function rewriteMediaUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return input;
  }

  if (!LEGACY_HOSTS.has(url.hostname)) return input;

  let pathname = url.pathname;

  // Photon nests the real origin as the first path segment:
  //   /www.zeroplastic.lk/wp-content/uploads/...
  if (PHOTON_HOSTS.has(url.hostname)) {
    const match = pathname.match(/^\/([^/]+)(\/.*)$/);
    if (!match || !LEGACY_HOSTS.has(match[1]!)) return input;
    pathname = match[2]!;
  }

  if (!pathname.startsWith('/wp-content/')) return input;

  const key = uploadKey(pathname);
  if (key) {
    const variant = resolveVariant(key, requestedWidth(url.searchParams));
    if (variant) {
      const dir = pathname.slice(0, pathname.lastIndexOf('/'));
      return `${SITE.wpMediaBase}${dir}/${encodeURIComponent(variant)}`;
    }
  }

  return `${SITE.wpMediaBase}${pathname}`;
}

/**
 * Rewrite every WordPress media URL in a fragment of HTML.
 *
 * Deliberately URL-level rather than attribute-level, so it covers src, srcset,
 * href, data attributes and inline styles in one pass. A URL token ends at
 * whitespace, a quote or an angle bracket, which is exactly where srcset
 * separates a candidate from its width descriptor, so descriptors survive.
 */
export function rewriteMediaUrls(html: string): string {
  if (!html) return html;

  return html.replace(/https?:\/\/[^\s"'<>\\]+/g, (raw) => {
    // A trailing comma belongs to srcset, not to the URL.
    const trimmed = raw.replace(/,+$/, '');
    const suffix = raw.slice(trimmed.length);
    return rewriteMediaUrl(trimmed.replace(/&amp;/g, '&')) + suffix;
  });
}
