/**
 * Palette and surface materials (floors, walls, frames, hull) in the warm,
 * lantern-lit style of the owner's reference sheets (2026-11-24).
 */
import { type Painter, rng } from "./painter.ts";

export const C = {
  outline: "#1c0f08",
  // Deck planks (honey) and interior planks (deeper brown).
  deck: "#b8793c",
  deckLight: "#cd8f4f",
  deckDark: "#9b622f",
  deckSeam: "#6a3d1b",
  floor: "#9a5f2c",
  floorLight: "#b07038",
  floorDark: "#7f4c22",
  floorSeam: "#542f13",
  // Frames, beams and walls.
  beam: "#7b4a22",
  beamLight: "#a26a34",
  beamDark: "#4d2c12",
  wall: "#3d2414",
  wallLight: "#56341d",
  wallDark: "#26150a",
  panel: "#4a2c17",
  // Brass and gold trim.
  gold: "#d9a441",
  goldLight: "#f6d27a",
  goldDark: "#9c6e22",
  // Fabric.
  red: "#9b2b26",
  redLight: "#bd3d33",
  redDark: "#6a1a17",
  cream: "#ead8a8",
  creamDark: "#c8b07c",
  linen: "#efe6d2",
  linenDark: "#cfc2a6",
  // Hull, sea and stone.
  hull: "#3b2415",
  hullLight: "#55351f",
  hullDark: "#24150b",
  waterline: "#7a2420",
  stone: "#5e4a3a",
  stoneLight: "#75604c",
  stoneDark: "#43342a",
  stoneSeam: "#2f241c",
  // Light.
  flame: "#fff1b8",
  glowWarm: "#ffb347",
  glow: "#ffd36b",
  // Odds and ends.
  iron: "#3a3a42",
  ironLight: "#666673",
  leaf: "#3f8a3a",
  leafLight: "#6fb64f",
  leafDark: "#255a24",
  pot: "#8f4f28",
  paper: "#e9d7a6",
  paperDark: "#bf9f63",
  ink: "#4a3020",
  water: "#2fa6c8",
  waterLight: "#6fd0e6",
  waterDark: "#1f7fa3",
  waterDeep: "#17607f",
  tile: "#e7dcc3",
  tileDark: "#bfae8a",
  potionPurple: "#a64fd6",
  potionGreen: "#4fd68a",
  potionBlue: "#4f8ad6",
  goldCoin: "#f0c75a",
  gem: "#5fd3c4",
} as const;

/** Horizontal planks with staggered joints, nail heads and grain. */
export function planks(
  p: Painter,
  x: number,
  y: number,
  w: number,
  h: number,
  tone: { base: string; light: string; dark: string; seam: string },
  seed = 1,
  inside: (px: number, py: number) => boolean = () => true,
): void {
  const r = rng(seed);
  const rowH = 8;
  for (let row = Math.floor(y / rowH); row * rowH < y + h; row++) {
    const ry = row * rowH;
    // Each plank row: boards 48–96 px long with offset joints.
    let bx = x - Math.floor(r() * 64);
    while (bx < x + w) {
      const len = 48 + Math.floor(r() * 3) * 16;
      const shade = r();
      const base = shade < 0.25 ? tone.dark : shade > 0.85 ? tone.light : tone.base;
      for (let yy = ry; yy < ry + rowH; yy++)
        for (let xx = bx; xx < bx + len; xx++) {
          if (xx < x || yy < y || xx >= x + w || yy >= y + h || !inside(xx, yy)) continue;
          let c: string = base;
          if (yy === ry) c = tone.light;
          else if (yy === ry + rowH - 1) c = tone.seam;
          else if (xx === bx) c = tone.seam;
          else if ((xx * 7 + yy * 3 + row * 11) % 37 === 0) c = tone.dark;
          p.px(xx, yy, c);
        }
      // Nail heads at the board ends.
      for (const nx of [bx + 2, bx + len - 3])
        if (nx >= x && nx < x + w && inside(nx, ry + 2)) {
          p.px(nx, ry + 2, tone.seam);
          p.px(nx, ry + 5, tone.seam);
        }
      bx += len;
    }
  }
}

export const DECK_TONE = { base: C.deck, light: C.deckLight, dark: C.deckDark, seam: C.deckSeam };
export const FLOOR_TONE = { base: C.floor, light: C.floorLight, dark: C.floorDark, seam: C.floorSeam };

/** Dark stone flags for the secret deck. */
export function stoneFloor(p: Painter, x: number, y: number, w: number, h: number, seed = 3, inside: (px: number, py: number) => boolean = () => true) {
  const r = rng(seed);
  for (let row = 0; row * 16 < h; row++) {
    let bx = x - (row % 2 ? 12 : 0);
    while (bx < x + w) {
      const len = 20 + Math.floor(r() * 3) * 6;
      const base = [C.stone, C.stoneLight, C.stoneDark][Math.floor(r() * 3)];
      for (let yy = y + row * 16; yy < y + row * 16 + 16; yy++)
        for (let xx = bx; xx < bx + len; xx++) {
          if (xx < x || yy >= y + h || xx >= x + w || !inside(xx, yy)) continue;
          const top = yy === y + row * 16;
          const edge = yy === y + row * 16 + 15 || xx === bx;
          p.px(xx, yy, edge ? C.stoneSeam : top ? C.stoneLight : base);
        }
      bx += len;
    }
  }
}

/** A thick wooden frame beam seen from above, with gold-capped posts. */
export function frame(p: Painter, x: number, y: number, w: number, h: number, posts = 64): void {
  p.rect(x, y, w, h, C.beamDark);
  p.rect(x + 1, y + 1, w - 2, h - 2, C.beam);
  if (w >= h) {
    p.hline(x + 1, y + 1, w - 2, C.beamLight);
    p.hline(x + 1, y + 2, w - 2, C.beamLight, 0.5);
    for (let px = x + 8; px < x + w - 8; px += posts) postCap(p, px, y + Math.floor(h / 2) - 5);
  } else {
    p.vline(x + 1, y + 1, h - 2, C.beamLight);
    for (let py = y + 8; py < y + h - 8; py += posts) postCap(p, x + Math.floor(w / 2) - 5, py);
  }
}

/** Gold square cap on top of a post (10×10). */
export function postCap(p: Painter, x: number, y: number): void {
  p.box(x, y, 10, 10, C.gold, C.outline);
  p.rect(x + 1, y + 1, 8, 2, C.goldLight);
  p.rect(x + 1, y + 7, 8, 2, C.goldDark);
  p.px(x + 4, y + 4, C.goldLight);
  p.px(x + 5, y + 5, C.goldDark);
}

/**
 * A wall face (seen from the front, the room's north side): dark panelling
 * with posts, a gold rail and a skirting board. `h` is usually 32 px.
 */
export function wallFace(p: Painter, x: number, y: number, w: number, h: number, seed = 5): void {
  const r = rng(seed);
  p.rect(x, y, w, h, C.wall);
  for (let px = x; px < x + w; px += 8) {
    p.vline(px, y + 4, h - 10, C.wallDark);
    p.vline(px + 1, y + 4, h - 10, C.wallLight, 0.5);
  }
  for (let px = x; px < x + w; px += 48 + Math.floor(r() * 2) * 16) {
    p.rect(px, y, 4, h, C.beam);
    p.vline(px, y, h, C.beamLight);
    p.vline(px + 3, y, h, C.beamDark);
  }
  p.hline(x, y, w, C.beamLight);
  p.rect(x, y + 1, w, 3, C.beam);
  p.hline(x, y + h - 9, w, C.goldDark);
  p.hline(x, y + h - 8, w, C.gold);
  p.rect(x, y + h - 6, w, 5, C.beamDark);
  p.hline(x, y + h - 1, w, C.outline);
}

/** Stone wall face for the secret deck. */
export function stoneWallFace(p: Painter, x: number, y: number, w: number, h: number): void {
  for (let row = 0; row * 8 < h; row++) {
    for (let px = x - (row % 2 ? 8 : 0); px < x + w; px += 16) {
      for (let yy = y + row * 8; yy < Math.min(y + row * 8 + 8, y + h); yy++)
        for (let xx = Math.max(px, x); xx < Math.min(px + 16, x + w); xx++) {
          const edge = yy === y + row * 8 + 7 || xx === px;
          p.px(xx, yy, edge ? C.stoneSeam : yy === y + row * 8 ? C.stoneLight : C.stoneDark);
        }
    }
  }
  p.rect(x, y + h - 4, w, 4, C.beamDark);
  p.hline(x, y + h - 4, w, C.beam);
}

/** Drop shadow cast on the floor below a wall or object. */
export function shadow(p: Painter, x: number, y: number, w: number, h: number, strength = 0.35): void {
  for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) p.tint(x + xx, y + yy, "#1a0d05", strength * (1 - yy / h));
}

/** Skull and crossed sabres, the ship's emblem (15×13). */
export const EMBLEM = [
  "x.....aaa.....x",
  ".x...aaaaa...x.",
  "..x.aaaaaaa.x..",
  "...xa.aaa.ax...",
  "....a.aaa.a....",
  "....aaaaaaa....",
  ".....aa.aa.....",
  ".....aaaaa.....",
  "....x.aaa.x....",
  "...x.......x...",
  "..x.........x..",
  ".hx.........xh.",
  "h.............h",
];

export function emblem(p: Painter, x: number, y: number, color: string = C.cream, blade: string = C.creamDark): void {
  p.pattern(x, y, EMBLEM, { a: color, x: blade, h: C.gold });
}

/** The emblem scaled up (15·s × 13·s) for big rugs and floors. */
export function bigEmblem(p: Painter, x: number, y: number, color: string = C.cream, blade: string = C.creamDark, s = 2): void {
  EMBLEM.forEach((row, dy) =>
    [...row].forEach((ch, dx) => {
      if (ch === ".") return;
      const c = ch === "a" ? color : ch === "x" ? blade : C.gold;
      p.rect(x + dx * s, y + dy * s, s, s, c);
    }),
  );
}
