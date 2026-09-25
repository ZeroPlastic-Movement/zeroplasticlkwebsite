/**
 * Encodes the /self-drive-sri-lanka/ photography into public/images/.
 *
 * Run manually, like scripts/build-images.mjs: the output is committed so a
 * deploy never pays the encoding cost.
 *
 *   node scripts/build-self-drive-images.mjs
 *
 * Originals stay untouched in assets/source/self-drive/. Nothing is cropped:
 * every photograph keeps its native framing and the page positions it with
 * CSS object-position, so a subject is never cut off by a hard-coded crop.
 */
import { statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets/source/self-drive';
const OUT = 'public/images';

/** Hero widths match the existing hero convention; sections match Figure.astro. */
const HERO = [640, 960, 1280, 1600];
const SECTION = [480, 800, 1200];

const JOBS = [
  { from: 'sd02.jpg', name: 'sd-hero-roadtrip', widths: HERO },
  { from: 'sd12.jpg', name: 'sd-elephant-feed', widths: SECTION },
  { from: 'sd01.jpg', name: 'sd-elephant-visitors', widths: SECTION },
  { from: 'sd05.jpg', name: 'sd-workshop-coconut', widths: SECTION },
  { from: 'sd15.jpg', name: 'sd-tuktuks-parked', widths: SECTION },
  { from: 'sd04.jpg', name: 'sd-couple-sigiriya', widths: SECTION },
  { from: 'sd03.jpg', name: 'sd-partner-sigiriya', widths: SECTION },
  { from: 'sd11.jpg', name: 'sd-artisan-tuktuks', widths: SECTION },
  { from: 'sd07.jpg', name: 'sd-center-dusk', widths: SECTION },
];

const report = [];
const record = (f) => report.push([f, statSync(f).size]);

for (const job of JOBS) {
  const base = sharp(`${SRC}/${job.from}`);
  const meta = await base.metadata();
  for (const w of job.widths) {
    if (w > meta.width) continue;
    const avif = `${OUT}/${job.name}-${w}.avif`;
    const webp = `${OUT}/${job.name}-${w}.webp`;
    await base.clone().resize({ width: w }).avif({ quality: 44, effort: 9 }).toFile(avif);
    await base.clone().resize({ width: w }).webp({ quality: 70, effort: 6 }).toFile(webp);
    record(avif);
    record(webp);
  }
  // One JPEG per image as the universal fallback, at the middle width.
  const fbW = Math.min(job.widths[Math.min(1, job.widths.length - 1)], meta.width);
  const jpg = `${OUT}/${job.name}-${fbW}.jpg`;
  await base.clone().resize({ width: fbW }).jpeg({ quality: 74, mozjpeg: true }).toFile(jpg);
  record(jpg);
  console.log(`${job.name.padEnd(24)} from ${job.from} (${meta.width}x${meta.height})`);
}

let total = 0;
for (const [, size] of report) total += size;
console.log(`\n${report.length} files, ${(total / 1024 / 1024).toFixed(2)} MB total`);
