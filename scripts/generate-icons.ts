/**
 * Rasterises the logo mark into the favicon / app icons.
 * Run after changing src/lib/brand-art.ts:  bun scripts/generate-icons.ts
 */
import { writeFile } from "node:fs/promises";
import sharp from "sharp";
import { MARK_SVG } from "../src/lib/brand-art";

// Full-bleed version for "maskable" icons: Android crops to a circle/squircle,
// so the cards sit inside the central 80% safe zone on a solid background.
const MASKABLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="#1f2a44"/><g transform="translate(9.6 9.6) scale(0.7)">${MARK_SVG.replace(/^<svg[^>]*>/, "").replace(/<\/svg>$/, "").replace('<rect width="64" height="64" rx="16" fill="#1f2a44"/>', "")}</g></svg>`;

const png = (svg: string, size: number) => sharp(Buffer.from(svg), { density: 1200 }).resize(size, size).png().toBuffer();

/** Minimal ICO container holding PNG images (supported by every modern browser). */
function ico(images: { size: number; data: Buffer }[]) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // icon
  header.writeUInt16LE(images.length, 4);
  let offset = 6 + 16 * images.length;
  const entries = images.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(data.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...images.map((i) => i.data)]);
}

const sizes = [16, 32, 48];
const favicon = ico(await Promise.all(sizes.map(async (size) => ({ size, data: await png(MARK_SVG, size) }))));
await writeFile("src/app/favicon.ico", favicon);
await writeFile("public/icon-192.png", await png(MARK_SVG, 192));
await writeFile("public/icon-512.png", await png(MARK_SVG, 512));
await writeFile("public/icon-maskable-512.png", await png(MASKABLE_SVG, 512));
console.log("wrote src/app/favicon.ico, public/icon-{192,512,maskable-512}.png");
