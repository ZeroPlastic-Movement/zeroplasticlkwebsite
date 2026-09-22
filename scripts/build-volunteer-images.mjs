/**
 * Regenerates the Sigiriya photograph variants used by the volunteer landing page.
 *
 * Run manually, not as part of `npm run build` — the output is committed, so a
 * deploy never pays the encoding cost. Same convention as build-images.mjs.
 *
 *   node scripts/build-volunteer-images.mjs
 *
 * The source is public/htmlimages/sig-rock-aerial-terraces.jpg, an aerial of
 * Sigiriya already in the repository and used by the craft-experiences page.
 * It ships only as a 575 KB JPEG, which is too heavy for a landing page that is
 * measured on Core Web Vitals. Nothing is cropped or retouched; the image is
 * only resized and re-encoded.
 */
import { statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'public/htmlimages/sig-rock-aerial-terraces.jpg';
const OUT = 'public/images';
const NAME = 'sigiriya-aerial';
const WIDTHS = [480, 800, 1200];

const report = [];
const record = (file) => report.push([file, statSync(file).size]);

const base = sharp(SRC);
const meta = await base.metadata();
console.log(`source: ${SRC} (${meta.width}x${meta.height})`);

for (const width of WIDTHS) {
  if (width > meta.width) continue;
  const avif = `${OUT}/${NAME}-${width}.avif`;
  const webp = `${OUT}/${NAME}-${width}.webp`;
  await base.clone().resize({ width }).avif({ quality: 44, effort: 9 }).toFile(avif);
  await base.clone().resize({ width }).webp({ quality: 70, effort: 6 }).toFile(webp);
  record(avif);
  record(webp);
}

const jpg = `${OUT}/${NAME}-800.jpg`;
await base.clone().resize({ width: 800 }).jpeg({ quality: 74, mozjpeg: true }).toFile(jpg);
record(jpg);

let total = 0;
for (const [file, size] of report) {
  total += size;
  console.log(`${file.padEnd(42)}${(size / 1024).toFixed(1).padStart(9)} KB`);
}
console.log(`${'TOTAL'.padEnd(42)}${(total / 1024).toFixed(1).padStart(9)} KB`);
