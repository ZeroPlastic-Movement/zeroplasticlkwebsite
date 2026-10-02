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
 * slr-gardens is a placeholder: the page needs a water-gardens photograph and
 * the repo has none. It is generated at the right aspect ratio and filename so
 * the layout is final, and swapping in a real photograph is a file copy with
 * no HTML change.
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

/**
 * Placeholder for the water gardens. Brand bone over ink so it reads as a
 * deliberate empty slot rather than a broken image, at the same 16:10 the
 * real photograph should be cropped to.
 */
for (const w of [800, 1200]) {
  const h = Math.round((w / 16) * 10);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">
       <rect width="100%" height="100%" fill="#2E4550"/>
       <text x="50%" y="50%" fill="#E9E8E2" opacity="0.55" text-anchor="middle"
             font-family="monospace" font-size="${Math.round(w / 34)}">
         photograph to be supplied: Sigiriya water gardens
       </text>
     </svg>`,
  );
  await sharp(svg).webp({ quality: 72 }).toFile(`${OUT}/slr-water-gardens-${w}.webp`);
}
console.log('slr-water-gardens            PLACEHOLDER, replace with a real photograph');
