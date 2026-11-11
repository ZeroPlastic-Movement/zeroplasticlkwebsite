/**
 * One-off encoder for the impact-center-premium.html reservation hero.
 *
 * Run manually, not as part of `npm run build` — matches the convention in
 * build-images.mjs: output is committed, so a deploy never pays the encoding
 * cost.
 *
 *   node scripts/build-impact-center-premium-hero.mjs
 *
 * Source is assets/source/impact-center-premium/hero-reservation-original.jpg
 * (1024x536). The scripts never upscale, so this only produces the 640 and
 * 960 widths — there isn't enough source resolution for 1280/1600 without
 * fabricating detail that isn't there. Framing is untouched (no crop): the
 * source's own 1.91:1 ratio is already close to the hero's existing
 * letterboxed treatment, and `.hero-bg img{object-fit:cover}` handles the rest.
 */
import sharp from 'sharp';

const SRC = 'assets/source/impact-center-premium/hero-reservation-original.jpg';
const OUT = 'public/htmlimages';
const WIDTHS = [640, 960];

const src = sharp(SRC);
const meta = await src.metadata();
console.log(`source: ${meta.width}x${meta.height}`);

for (const width of WIDTHS) {
  const webp = `${OUT}/ic-hero-reservation-${width}.webp`;
  await src.clone().resize({ width }).webp({ quality: 66, effort: 6 }).toFile(webp);
  console.log(webp);
}

// Plain <img> fallback inside <picture>, native width, no upscale.
const jpg = `${OUT}/ic-hero-reservation.jpg`;
await src.clone().resize({ width: meta.width }).jpeg({ quality: 72, mozjpeg: true }).toFile(jpg);
console.log(jpg);
