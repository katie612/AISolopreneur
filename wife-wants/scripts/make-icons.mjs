// Generates the PWA icons (hot pink tile, white heart, sunshine spark) as
// PNGs without any image library. Run: node scripts/make-icons.mjs
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";

const crcTable = new Int32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c;
});
const crc32 = (buf) => {
  let c = -1;
  for (const b of buf) c = crcTable[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
};
const chunk = (type, data) => {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
};

const PINK = [255, 45, 135];
const INK = [43, 27, 47];
const WHITE = [255, 255, 255];
const SUN = [255, 210, 63];

function heart(x, y) {
  // Classic implicit heart; x,y in roughly [-1.3, 1.3]
  const a = x * x + y * y - 1;
  return a * a * a - x * x * y * y * y <= 0;
}

function render(size, { rounded }) {
  const px = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const r = size * 0.22; // corner radius
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let color = PINK;
      let alpha = 255;
      if (rounded) {
        const dx = Math.max(Math.abs(i + 0.5 - cx) - (cx - r), 0);
        const dy = Math.max(Math.abs(j + 0.5 - cy) - (cy - r), 0);
        if (dx * dx + dy * dy > r * r) alpha = 0;
      }
      // heart in app coords: scale so heart is ~58% of tile
      const hx = ((i + 0.5 - cx) / size) * 3.6;
      const hy = (-(j + 0.5 - cy) / size) * 3.6 + 0.15;
      const outline = heart(hx / 1.14, hy / 1.14);
      const fill = heart(hx, hy);
      if (outline) color = INK;
      if (fill) color = WHITE;
      // sunshine spark top-right
      const sx = i + 0.5 - size * 0.78;
      const sy = j + 0.5 - size * 0.24;
      const sr = size * 0.075;
      const spark =
        (Math.abs(sx) < sr * 0.28 && Math.abs(sy) < sr) ||
        (Math.abs(sy) < sr * 0.28 && Math.abs(sx) < sr);
      const sparkOutline =
        (Math.abs(sx) < sr * 0.28 + size * 0.015 && Math.abs(sy) < sr + size * 0.015) ||
        (Math.abs(sy) < sr * 0.28 + size * 0.015 && Math.abs(sx) < sr + size * 0.015);
      if (sparkOutline) color = INK;
      if (spark) color = SUN;
      const o = (j * size + i) * 4;
      px[o] = color[0];
      px[o + 1] = color[1];
      px[o + 2] = color[2];
      px[o + 3] = alpha;
    }
  }
  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let j = 0; j < size; j++) {
    raw[j * (size * 4 + 1)] = 0;
    px.copy(raw, j * (size * 4 + 1) + 1, j * size * 4, (j + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public", { recursive: true });
writeFileSync("public/icon-192.png", render(192, { rounded: false }));
writeFileSync("public/icon-512.png", render(512, { rounded: false }));
writeFileSync("public/apple-touch-icon.png", render(180, { rounded: false }));
writeFileSync("public/favicon-64.png", render(64, { rounded: true }));
console.log("icons written");
