/**
 * Encodes the /one-traveller-one-kilogram/ photography into public/images/.
 *
 * Run manually, like scripts/build-images.mjs: the output is committed so a
 * deploy never pays the encoding cost.
 *
 *   node scripts/build-one-kg-images.mjs
 *
 * Originals stay untouched in assets/source/one-kg/. Nothing is cropped on the
 * page images: every photograph keeps its native framing and the page frames
 * it with CSS object-position. The one exception is the social share card,
 * which has to be exactly 1200x630 and is therefore composed here from the
 * hero photograph with the programme branding over it.
 *
 * sharp drops EXIF by default, so GPS and camera metadata never ship.
 */
import { statSync } from 'node:fs';
import sharp from 'sharp';

const SRC = 'assets/source/one-kg';
const OUT = 'public/images';

/** Hero widths match the existing hero convention; sections match Figure.astro. */
const HERO = [640, 960, 1280, 1600];
const SECTION = [480, 800, 1200];

const JOBS = [
  { from: 'otk-01-hero-cleanup.jpg', name: 'otk-hero-cleanup', widths: HERO },
  { from: 'otk-02-impact-center-visitors.jpg', name: 'otk-impact-center', widths: SECTION },
  { from: 'otk-03-cleanup-weighing.jpg', name: 'otk-cleanup-weighing', widths: SECTION },
];

const report = [];
const record = (f) => report.push([f, statSync(f).size]);

for (const job of JOBS) {
  const base = sharp(`${SRC}/${job.from}`).rotate();
  const meta = await base.metadata();
  for (const w of job.widths) {
    if (w > meta.width) continue;
    const avif = `${OUT}/${job.name}-${w}.avif`;
    const webp = `${OUT}/${job.name}-${w}.webp`;
    await base.clone().resize({ width: w }).avif({ quality: 50, effort: 9 }).toFile(avif);
    await base.clone().resize({ width: w }).webp({ quality: 74, effort: 6 }).toFile(webp);
    record(avif);
    record(webp);
  }
  // One JPEG per image as the universal fallback. The hero uses its 960 step,
  // sections their 800 step, which is what Figure.astro asks for.
  const fbW = Math.min(job.widths[1], meta.width);
  const jpg = `${OUT}/${job.name}-${fbW}.jpg`;
  await base.clone().resize({ width: fbW }).jpeg({ quality: 76, mozjpeg: true }).toFile(jpg);
  record(jpg);
  console.log(`${job.name.padEnd(24)} from ${job.from} (${meta.width}x${meta.height})`);
}

/* Social share card ------------------------------------------------------- */

const W = 1200;
const H = 630;
const photo = await sharp(`${SRC}/otk-01-hero-cleanup.jpg`)
  .rotate()
  // 2000x1333 is 3:2 and the card is 1.9:1, so some height is trimmed. Keep
  // the top, where the "I support" sign and the faces are.
  .resize({ width: W, height: H, fit: 'cover', position: 'north' })
  .toBuffer();

const FONT = 'DejaVu Sans, Arial, sans-serif';
const overlay = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs>
  <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#062c2b" stop-opacity=".96"/>
    <stop offset=".46" stop-color="#083c38" stop-opacity=".88"/>
    <stop offset=".78" stop-color="#083c38" stop-opacity=".28"/>
    <stop offset="1" stop-color="#083c38" stop-opacity="0"/>
  </linearGradient>
</defs>
<rect width="${W}" height="${H}" fill="url(#g)"/>
<rect x="64" y="52" width="290" height="42" rx="21" fill="#b5edd4"/>
<text x="209" y="79" text-anchor="middle" font-family="${FONT}" font-weight="700" font-size="17" letter-spacing="1" fill="#083c38">ZEROPLASTIC MOVEMENT</text>
<g font-family="${FONT}" font-weight="800" font-size="70">
  <text x="64" y="232" fill="#fbfdf7">ONE TRAVELLER.</text>
  <text x="64" y="330" fill="#ff9b63">ONE KILOGRAM.</text>
  <text x="64" y="428" fill="#fbfdf7">ONE MOVEMENT.</text>
</g>
<text x="66" y="560" font-family="${FONT}" font-weight="700" font-size="21" letter-spacing="1" fill="#cfeedd">YOUR TRAVELLERS VISIT. OUR MOVEMENT ACTS.</text>
<circle cx="1082" cy="150" r="82" fill="#ff9b63"/>
<circle cx="1082" cy="150" r="62" fill="none" stroke="#ffd2b5" stroke-width="1.5"/>
<text x="1082" y="160" text-anchor="middle" font-family="${FONT}" font-weight="800" font-size="30" fill="#083c38">1 KG</text>
</svg>`;

const og = `${OUT}/one-kg-social.jpg`;
await sharp(photo)
  .composite([{ input: Buffer.from(overlay), top: 0, left: 0 }])
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(og);
record(og);
console.log(`one-kg-social            ${W}x${H} from otk-01-hero-cleanup.jpg`);

let total = 0;
for (const [, size] of report) total += size;
console.log(`\n${report.length} files, ${(total / 1024 / 1024).toFixed(2)} MB total`);
for (const [f, s] of report) console.log(`${(s / 1024).toFixed(0).padStart(6)} KB  ${f}`);
