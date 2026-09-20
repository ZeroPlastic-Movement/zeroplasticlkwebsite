/**
 * Regenerates the committed homepage images in public/images/.
 *
 * Run manually, not as part of `npm run build` — the output is committed, so a
 * deploy never pays the encoding cost.
 *
 *   node scripts/build-images.mjs <path-to-hero-original> <path-to-logo-original>
 *
 * The hero original is the full-resolution Mount Lavinia clean-up photograph
 * from the WordPress media library. It carries a burned-in caption bar starting
 * at y=1240, which CROP_HEIGHT removes; the photograph is otherwise unaltered.
 */
import { statSync } from 'node:fs';
import sharp from 'sharp';

const [heroSrc, logoSrc] = process.argv.slice(2);

if (!heroSrc || !logoSrc) {
  console.error('usage: node scripts/build-images.mjs <hero-original> <logo-original>');
  process.exit(1);
}

const CROP_WIDTH = 2000;
const CROP_HEIGHT = 1236;
const WIDTHS = [640, 960, 1280, 1600];
const OUT = 'public/images';

const hero = sharp(heroSrc).extract({ left: 0, top: 0, width: CROP_WIDTH, height: CROP_HEIGHT });
const report = [];
const record = (file) => report.push([file, statSync(file).size]);

for (const width of WIDTHS) {
  const avif = `${OUT}/hero-cleanup-${width}.avif`;
  const webp = `${OUT}/hero-cleanup-${width}.webp`;
  await hero.clone().resize({ width }).avif({ quality: 40, effort: 9 }).toFile(avif);
  await hero.clone().resize({ width }).webp({ quality: 66, effort: 6 }).toFile(webp);
  record(avif);
  record(webp);
}

await hero.clone().resize({ width: 1280 }).jpeg({ quality: 72, mozjpeg: true })
  .toFile(`${OUT}/hero-cleanup-1280.jpg`);
record(`${OUT}/hero-cleanup-1280.jpg`);

await hero.clone().resize({ width: 1200, height: 630, fit: 'cover', position: 'attention' })
  .jpeg({ quality: 72, mozjpeg: true }).toFile(`${OUT}/og-home.jpg`);
record(`${OUT}/og-home.jpg`);

// The wordmark is only recompressed, never resized or redrawn.
await sharp(logoSrc).png({ compressionLevel: 9, palette: true })
  .toFile(`${OUT}/zeroplastic-logo.png`);
record(`${OUT}/zeroplastic-logo.png`);

let total = 0;
for (const [file, size] of report) {
  total += size;
  console.log(`${file.padEnd(40)}${(size / 1024).toFixed(1).padStart(9)} KB`);
}
console.log(`${'TOTAL'.padEnd(40)}${(total / 1024).toFixed(1).padStart(9)} KB`);
