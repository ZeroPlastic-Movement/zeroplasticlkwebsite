/**
 * Encodes the /sigiriya-lion-rock/ photography into public/htmlimages/.
 *
 * Run manually, like scripts/build-images.mjs: the output is committed so a
 * deploy never pays the encoding cost.
 *
 *   node scripts/build-lion-rock-images.mjs
 *
 * The two source photographs are already in the repo as large JPEGs (500 to
 * 580 KB each), which is far too heavy for a mobile landing page aiming at a
 * Lighthouse Performance score of 90. They are re-encoded to WebP at the
 * widths the page actually requests, and nothing is upscaled.
 *
 */
import sharp from 'sharp';
import { existsSync, mkdirSync } from 'node:fs';

const OUT = 'public/htmlimages';
if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true });

/** Re-encode an existing photograph to WebP at each width it is used at. */
const PHOTOS = [
  // The hero is the LCP element on mobile, so it is encoded harder than the rest.
  { from: 'public/htmlimages/sig-rock-aerial-terraces.jpg', name: 'slr-hero-lion-rock', widths: [800, 1200, 1600], quality: 60 },
  // ic-bench-laughing is 1000x750: the only landscape workshop photograph in
  // the repo at a usable width. The portrait ones are narrower than 800px, so
  // every requested width would be skipped as an upscale.
  { from: 'public/htmlimages/ic-bench-laughing.jpg', name: 'slr-impact-center-workshop', widths: [600, 1000], quality: 68 },
];

for (const job of PHOTOS) {
  const meta = await sharp(job.from).metadata();
  for (const w of job.widths) {
    if (w > meta.width) continue; // never upscale
    await sharp(job.from)
      .resize({ width: w })
      .webp({ quality: job.quality })
      .toFile(`${OUT}/${job.name}-${w}.webp`);
  }
  console.log(`${job.name.padEnd(28)} from ${job.from.split('/').pop()} (${meta.width}x${meta.height})`);
}
