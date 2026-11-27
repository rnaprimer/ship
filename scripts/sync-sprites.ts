/**
 * Copies the pxl build of art/props.px.js into the repo:
 *   art/out/sprites/*.png  -> scripts/art/sprites/   (stamped into the maps)
 *   art/out/anims/*.png|json -> public/game/anims/   (animated in the game)
 *
 *   node ~/.claude/skills/pxl-pixel-art/bin/pxl.js build art/props.px.js --out art/out
 *   node scripts/sync-sprites.ts && npm run build:assets
 */
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "art", "out");
const sprites = join(root, "scripts", "art", "sprites");
const anims = join(root, "public", "game", "anims");
mkdirSync(sprites, { recursive: true });
mkdirSync(anims, { recursive: true });
let n = 0;
for (const f of readdirSync(join(from, "sprites"))) {
  if (!f.endsWith(".png")) continue;
  copyFileSync(join(from, "sprites", f), join(sprites, f));
  n++;
}
for (const f of readdirSync(join(from, "anims"))) {
  if (!/\.(png|json)$/.test(f)) continue;
  copyFileSync(join(from, "anims", f), join(anims, f));
  n++;
}
console.log(`Copied ${n} files.`);
