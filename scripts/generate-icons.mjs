// PWAアイコン（PNG）を指定パレットの色だけで生成する。依存なし（node:zlib）。
// 実行: node scripts/generate-icons.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [0x0c, 0x7b, 0xbb]; // #0c7bbb
const RING = [0xf0, 0xf8, 0xff]; // #f0f8ff
const CHECK = [0x7c, 0xfc, 0x00]; // #7cfc00

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** 点(px,py)が線分(ax,ay)-(bx,by)から距離w以内か */
function nearSegment(px, py, ax, ay, bx, by, w) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const x = ax + t * dx - px;
  const y = ay + t * dy - py;
  return x * x + y * y <= w * w;
}

function pixel(x, y, size) {
  const u = x / size;
  const v = y / size;
  const r = Math.hypot(u - 0.5, v - 0.5);
  const w = 0.055;
  if (nearSegment(u, v, 0.3, 0.52, 0.45, 0.67, w) || nearSegment(u, v, 0.45, 0.67, 0.72, 0.36, w)) return CHECK;
  if (r < 0.36 && r > 0.3) return RING;
  return BG;
}

function png(size) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    raw[row] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x + 0.5, y + 0.5, size);
      raw[row + 1 + x * 3] = r;
      raw[row + 2 + x * 3] = g;
      raw[row + 3 + x * 3] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const dir = new URL("../src/presentation/public/icons/", import.meta.url);
mkdirSync(dir, { recursive: true });
for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
  writeFileSync(new URL(name, dir), png(size));
  console.info(`generated ${name}`);
}
