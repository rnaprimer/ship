/**
 * Writes an enlarged preview of every crew outfit and hat on the base
 * characters, for checking the art by eye.
 *   node scripts/preview-outfits.ts <out.png>
 */
import { writeFileSync } from "node:fs";
import { Canvas } from "./lib/canvas.ts";
import { encodePng } from "./lib/png.ts";
import { drawCharacters, FRAME_H, FRAME_W, FRAMES_PER_ROW } from "./art/characters.ts";
import { drawHats, drawOutfits, HAT_IDS, LAYER_H, LAYER_W, OUTFIT_COLORS, ROLE_IDS } from "./art/outfits.ts";

const out = process.argv[2];
if (!out) throw new Error("usage: preview-outfits.ts <out.png>");
const body = drawCharacters();
const outfits = drawOutfits();
const hats = drawHats();
const SCALE = Number(process.argv[3] ?? 4);
const ONLY = process.argv[4] ? process.argv[4].split(",").map(Number) : null;
const CELL = { w: LAYER_W + 4, h: LAYER_H + 4 };
const shots = [[0, 0], [1, 0], [2, 0], [3, 0], [0, 2], [1, 3]]; // [direction, frame]
const cols = shots.length * 2;
const sheet = new Canvas(cols * CELL.w, (ROLE_IDS.length + 1) * CELL.h);
sheet.rect(0, 0, sheet.width, sheet.height, "#7fb3c4");

function put(px: number, py: number, variant: number, role: number | null, color: number, hat: number, dir: number, frame: number) {
  const ox = px + 2;
  const oy = py + 2;
  sheet.drawFrom(body, frame * FRAME_W, (variant * 4 + dir) * FRAME_H, FRAME_W, FRAME_H, ox + 4, oy + 8);
  if (role !== null) sheet.drawFrom(outfits, (color * FRAMES_PER_ROW + frame) * LAYER_W, (role * 4 + dir) * LAYER_H, LAYER_W, LAYER_H, ox, oy);
  if (hat > 0) sheet.drawFrom(hats, frame * LAYER_W, ((hat - 1) * 4 + dir) * LAYER_H, LAYER_W, LAYER_H, ox, oy);
}

ROLE_IDS.forEach((_, r) =>
  shots.forEach(([dir, frame], i) => {
    if (ONLY && !ONLY.includes(r)) return;
    put(i * CELL.w, r * CELL.h, r % 6, r, r % OUTFIT_COLORS.length, 0, dir, frame);
    put((i + shots.length) * CELL.w, r * CELL.h, (r + 3) % 6, r, (r + 2) % OUTFIT_COLORS.length, (r % HAT_IDS.length) + 1, dir, frame);
  }),
);
// Last row: every hat on plain clothes, front and side.
HAT_IDS.forEach((_, h) => put(h * CELL.w, ROLE_IDS.length * CELL.h, h % 6, null, 0, h + 1, h % 2 ? 1 : 0, 0));

const big = new Canvas(sheet.width * SCALE, sheet.height * SCALE);
for (let y = 0; y < big.height; y++)
  for (let x = 0; x < big.width; x++) {
    const i = (Math.floor(y / SCALE) * sheet.width + Math.floor(x / SCALE)) * 4;
    const j = (y * big.width + x) * 4;
    big.data.set(sheet.data.subarray(i, i + 4), j);
  }
writeFileSync(out, encodePng(big.width, big.height, big.data));
console.log(`wrote ${out}`);
