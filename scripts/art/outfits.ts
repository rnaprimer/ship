/**
 * Crew role outfits and hats (owner decision 2026-11-28), drawn as layers
 * that sit on top of the base characters (characters.ts). Every frame of
 * every layer matches the body's frame, including its bob and arm swing.
 *
 * Layer frames are 24×32: the 16×24 body frame sits at (4, 8), leaving room
 * for held tools beside the body and tall hats above the head. With the
 * sprite origin at the bottom centre the layers line up with the body.
 *
 * Role and colour indexes must match src/game/outfits.ts.
 */
import { Canvas, type Color } from "../lib/canvas.ts";
import { DIRECTION_ORDER, FRAME_H, FRAME_W, FRAMES_PER_ROW, OUTLINE, drawFrame, mix, type Dir, type Palette } from "./characters.ts";

export const LAYER_W = 24;
export const LAYER_H = 32;
const OX = (LAYER_W - FRAME_W) / 2; // 4
const OY = LAYER_H - FRAME_H; // 8

// Kept in step with src/game/outfits.ts (checked by a test).
export const ROLE_IDS = ["captain", "swordsman", "navigator", "sniper", "cook", "doctor", "archaeologist", "shipwright", "musician", "helmsman"] as const;
export const OUTFIT_COLORS = [
  { main: "#b33a35", dark: "#7f2524" },
  { main: "#2f4f86", dark: "#1f355e" },
  { main: "#3f7a45", dark: "#2a5530" },
  { main: "#d19a32", dark: "#9b6e1d" },
  { main: "#3a3440", dark: "#23202a" },
];
export const HAT_IDS = ["tricorn", "bandana", "chef", "straw", "bicorne", "feathered", "knit", "top", "explorer"] as const;

type RoleId = (typeof ROLE_IDS)[number];
type View = "down" | "up" | "left";

const O = OUTLINE;
const SKIP = "#ff00ff";
const GOLD = "#e0b266";
const GOLD_D = "#a8792f";
const WHITE = "#f2efe6";
const WHITE_D = "#c9c4b6";
const STEEL = "#d5dbe3";
const STEEL_D = "#8d96a3";
const WOOD = "#8a5a33";
const WOOD_D = "#5e3b20";
const LEATHER = "#5a3a22";
const LEATHER_L = "#7a5434";
const PAPER = "#eadcb4";
const PAPER_D = "#c2ab78";
const RED = "#c2483d";

/** Where the body is in this frame (mirrors drawFrame in characters.ts). */
type Pose = {
  bob: number;
  /** Front/back: hands at the bottom of each arm. Side: the near hand. */
  left: { x: number; y: number };
  right: { x: number; y: number };
  side: { x: number; y: number };
};

function poseFor(dir: Dir, frame: number): Pose {
  const walking = frame >= 2;
  const step = frame - 2;
  const bob = walking ? (step % 2 === 0 ? 1 : 0) : frame === 1 ? 1 : 0;
  const swing = walking && (dir === "down" || dir === "up") ? (step === 0 ? 1 : step === 2 ? -1 : 0) : 0;
  const stride = walking && (dir === "left" || dir === "right") ? (step === 0 ? 2 : step === 2 ? -2 : 0) : 0;
  return {
    bob,
    left: { x: 2, y: 16 + bob + Math.max(0, -swing) },
    right: { x: 13, y: 16 + bob + Math.max(0, swing) },
    side: { x: 6 - Math.sign(stride), y: 17 + bob },
  };
}

/** Draws into one 24×32 layer frame using body coordinates (0..15, 0..23). */
class Layer {
  readonly canvas = new Canvas(LAYER_W, LAYER_H);
  set(x: number, y: number, color: Color) {
    this.canvas.set(x + OX, y + OY, color);
  }
  rect(x: number, y: number, w: number, h: number, color: Color) {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, color);
  }
  get(x: number, y: number): number {
    if (x + OX < 0 || y + OY < 0 || x + OX >= LAYER_W || y + OY >= LAYER_H) return 255;
    const i = ((y + OY) * LAYER_W + (x + OX)) * 4;
    return this.canvas.data[i + 3];
  }
  /** Pattern rows; `H` marks the anchor (not drawn), "." skips. */
  /** Body silhouette in body coordinates, so tool outlines never cover the body. */
  body = new Set<string>();

  /**
   * Draws a tool pattern. `H` marks the hand (anchor, not drawn); "." skips.
   * Adds a 1 px outline around the tool wherever it sits off the body.
   */
  pattern(ax: number, ay: number, rows: string[], pal: Record<string, Color>, mirror = false) {
    let hx = 0;
    let hy = 0;
    rows.forEach((r, y) => {
      const i = r.indexOf("H");
      if (i >= 0) {
        hx = i;
        hy = y;
      }
    });
    const drawn = new Set<string>();
    rows.forEach((r, y) =>
      [...r].forEach((ch, x) => {
        if (ch === "." || ch === "H") return;
        const col = pal[ch];
        if (col === undefined) throw new Error(`no colour for "${ch}"`);
        const tx = ax + (mirror ? hx - x : x - hx);
        const ty = ay + (y - hy);
        this.set(tx, ty, col);
        drawn.add(`${tx},${ty}`);
      }),
    );
    for (const key of drawn) {
      const [x, y] = key.split(",").map(Number);
      for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
        const k = `${nx},${ny}`;
        if (drawn.has(k) || this.body.has(k) || this.get(nx, ny)) continue;
        this.set(nx, ny, O);
      }
    }
  }
}

/** Copies a layer frame into a sheet cell, mirrored when asked. */
function blit(sheet: Canvas, layer: Layer, col: number, row: number, mirror: boolean) {
  const src = layer.canvas.data;
  for (let y = 0; y < LAYER_H; y++)
    for (let x = 0; x < LAYER_W; x++) {
      const i = (y * LAYER_W + x) * 4;
      if (src[i + 3] === 0) continue;
      const hex = `#${[0, 1, 2].map((k) => src[i + k].toString(16).padStart(2, "0")).join("")}`;
      sheet.set(col * LAYER_W + (mirror ? LAYER_W - 1 - x : x), row * LAYER_H + y, hex);
    }
}

// --- Outfits -------------------------------------------------------------------

type Colors = { m: string; d: string; l: string };

/** Garment colours for the body pass: shirt c/C/k, trousers p/P, belt n/y, boots b/B. */
function garments(role: RoleId, k: Colors): Partial<Palette> {
  const plainPants = { p: "#2f3540", P: "#21262f" };
  switch (role) {
    case "captain":
      return { c: k.m, C: k.d, k: k.l, p: "#2b2b33", P: "#1c1c22", n: LEATHER, y: GOLD };
    case "swordsman":
      return { c: k.m, C: k.d, k: k.l, p: "#3a3226", P: "#28221a", n: WHITE, y: WHITE_D };
    case "navigator":
      return { c: WHITE, C: WHITE_D, k: "#ffffff", p: "#33507a", P: "#243a5a", n: LEATHER, y: GOLD };
    case "sniper":
      return { c: k.m, C: k.d, k: k.l, p: "#6a5a3c", P: "#4c402a", n: LEATHER, y: STEEL_D };
    case "cook":
      return { c: WHITE, C: WHITE_D, k: "#ffffff", ...plainPants, n: WHITE, y: WHITE_D, b: "#26222a", B: "#3a3440" };
    case "doctor":
      return { c: WHITE, C: WHITE_D, k: "#ffffff", ...plainPants, n: WHITE_D, y: WHITE_D };
    case "archaeologist":
      return { c: k.m, C: k.d, k: k.l, p: "#7a6440", P: "#5a4a2e", n: LEATHER, y: GOLD };
    case "shipwright":
      return { c: "#d9cfb6", C: "#b0a68e", k: "#efe8d6", p: k.m, P: k.d, n: LEATHER, y: STEEL_D };
    case "musician":
      return { c: k.m, C: k.d, k: k.l, p: "#24202a", P: "#17141b", n: k.d, y: k.d, b: "#17141b", B: "#2e2933" };
    case "helmsman":
      return { c: k.m, C: k.d, k: k.l, ...plainPants, n: LEATHER, y: GOLD, b: "#17141b", B: "#2e2933" };
  }
}

/** Tools held in the hand. `H` is the hand (left showing through). */
const TOOLS: Partial<Record<RoleId, string[]>> = {
  swordsman: [".H.", "ggg", ".s.", ".s.", ".s.", ".s.", "..s"],
  navigator: ["pp.", "ppH", "pP.", "pp.", "PP."],
  sniper: ["w.w", "w.w", ".W.", ".H."],
  cook: [".H.", ".s.", ".s.", ".s.", "sss", "SSS"],
  doctor: ["..H..", "mmmmm", "mmxmm", "MMMMM"],
  archaeologist: ["WWp.", "WWpH", "WWp."],
  shipwright: ["SSS", "sss", ".w.", ".H.", ".w.", ".w."],
  musician: [".W.", ".W.", "www", "wHw", "WWW", ".w."],
};

const toolPal = (k: Colors) => ({
  o: O,
  g: GOLD,
  s: STEEL,
  S: STEEL_D,
  w: WOOD,
  W: WOOD_D,
  p: PAPER,
  P: PAPER_D,
  m: k.m,
  M: k.d,
  x: WHITE,
});

/** Coat tails over the top of the legs. */
function tails(L: Layer, view: View, b: number, main: string, dark: string, long = false) {
  const rows = long ? 3 : 2;
  if (view === "down") {
    for (let y = 19 + b; y < 19 + b + rows; y++) {
      L.set(3, y, O);
      L.set(4, y, main);
      L.set(5, y, dark);
      L.set(10, y, dark);
      L.set(11, y, main);
      L.set(12, y, O);
    }
    L.rect(3, 19 + b + rows, 3, 1, O);
    L.rect(10, 19 + b + rows, 3, 1, O);
  } else if (view === "up") {
    for (let y = 19 + b; y < 19 + b + rows; y++) {
      L.set(3, y, O);
      L.rect(4, y, 8, 1, main);
      L.set(7, y, dark);
      L.set(8, y, dark);
      L.set(12, y, O);
    }
    L.rect(3, 19 + b + rows, 10, 1, O);
  } else {
    for (let y = 19 + b; y < 19 + b + rows; y++) {
      L.rect(7, y, 3, 1, main);
      L.set(7, y, dark);
      L.set(10, y, O);
    }
    L.rect(7, 19 + b + rows, 4, 1, O);
  }
}

/** Front buttons in two columns. */
function buttons(L: Layer, b: number, color: string, view: View) {
  if (view === "down") for (const y of [15, 16]) for (const x of [6, 9]) L.set(x, y + b, color);
  if (view === "left") for (const y of [15, 16]) L.set(4, y + b, color);
}

function decorate(L: Layer, role: RoleId, view: View, p: Pose, k: Colors) {
  const b = p.bob;
  const front = view === "down";
  const shoulders = (color: string) => {
    if (view === "left") L.set(p.side.x, 14 + b, color);
    else {
      L.set(p.left.x, p.left.y - 2, color);
      L.set(p.right.x, p.right.y - 2, color);
      L.set(5, 13 + b, color);
      L.set(10, 13 + b, color);
    }
  };
  switch (role) {
    case "captain":
      shoulders(GOLD);
      buttons(L, b, GOLD, view);
      if (front) L.rect(7, 13 + b, 2, 2, WHITE);
      tails(L, view, b, k.m, k.d, true);
      break;
    case "swordsman":
      // Sash ends hanging at the hip.
      if (front) {
        L.set(10, 18 + b, WHITE);
        L.set(10, 19 + b, WHITE_D);
      } else if (view === "left") {
        L.set(9, 18 + b, WHITE);
        L.set(9, 19 + b, WHITE_D);
      } else {
        L.set(5, 18 + b, WHITE);
        L.set(5, 19 + b, WHITE_D);
      }
      break;
    case "navigator":
      // Horizontal stripes on the shirt.
      for (let x = 3; x <= 12; x++)
        for (const y of [15, 17])
          if (L.get(x, y + b) && x !== 3 && x !== 12) L.set(x, y + b, k.m);
      if (view !== "left") {
        L.set(p.left.x, p.left.y - 1, k.m);
        L.set(p.right.x, p.right.y - 1, k.m);
      }
      break;
    case "sniper": {
      // Bandolier across the chest with brass rounds.
      const path = view === "left" ? [[4, 14], [5, 15], [6, 16], [7, 17]] : [[5, 14], [6, 14], [7, 15], [8, 15], [9, 16], [10, 16]];
      if (view !== "up") path.forEach(([x, y], i) => L.set(x, y + b, i % 2 ? GOLD : LEATHER));
      else [[5, 16], [6, 16], [7, 15], [8, 15], [9, 14], [10, 14]].forEach(([x, y]) => L.set(x, y + b, LEATHER));
      break;
    }
    case "cook":
      if (front) {
        for (const y of [14, 15]) for (const x of [6, 9]) L.set(x, y + b, "#9a9488");
        // Apron from chest to knee.
        L.rect(5, 16 + b, 6, 2, k.m);
        L.rect(5, 18 + b, 6, 1, k.m);
        for (let y = 19 + b; y <= 20 + b; y++) {
          L.set(4, y, O);
          L.rect(5, y, 6, 1, k.m);
          L.set(11, y, O);
        }
        L.rect(4, 21 + b, 8, 1, O);
        L.rect(5, 16 + b, 6, 1, k.l);
      } else if (view === "left") {
        L.rect(3, 16 + b, 2, 3, k.m);
        L.rect(3, 19 + b, 2, 2, k.m);
        L.set(2, 19 + b, O);
        L.set(2, 20 + b, O);
        L.rect(2, 21 + b, 3, 1, O);
      } else {
        L.rect(7, 17 + b, 2, 1, k.m);
        L.set(6, 17 + b, k.d);
        L.set(9, 17 + b, k.d);
      }
      break;
    case "doctor":
      if (front) {
        L.rect(7, 13 + b, 2, 1, k.m);
        L.set(10, 15 + b, RED);
        L.set(9, 15 + b, "#e98a82");
        L.set(10, 14 + b, "#e98a82");
        L.set(10, 16 + b, "#e98a82");
      }
      tails(L, view, b, WHITE, WHITE_D);
      break;
    case "archaeologist":
      if (front) {
        L.rect(4, 15 + b, 2, 2, k.d);
        L.rect(10, 15 + b, 2, 2, k.d);
        L.set(6, 13 + b, RED);
        L.set(9, 13 + b, RED);
        L.rect(7, 13 + b, 2, 1, RED);
      } else if (view === "left") {
        L.rect(4, 13 + b, 3, 1, RED);
      } else {
        L.rect(5, 13 + b, 6, 1, RED);
      }
      // Satchel at the far hip.
      if (view === "down") L.rect(11, 17 + b, 2, 2, LEATHER_L);
      else if (view === "up") L.rect(3, 17 + b, 2, 2, LEATHER_L);
      else L.rect(8, 16 + b, 2, 2, LEATHER_L);
      break;
    case "shipwright":
      // Overall bib and straps.
      if (front) {
        L.rect(5, 15 + b, 6, 3, k.m);
        L.rect(5, 15 + b, 6, 1, mix(k.m, "#ffffff", 0.2));
        L.set(5, 14 + b, k.d);
        L.set(10, 14 + b, k.d);
        L.set(6, 16 + b, GOLD);
        L.set(9, 16 + b, GOLD);
      } else if (view === "up") {
        L.set(5, 14 + b, k.d);
        L.set(10, 14 + b, k.d);
        L.set(6, 15 + b, k.d);
        L.set(9, 15 + b, k.d);
        L.rect(5, 17 + b, 6, 1, k.m);
      } else {
        L.rect(3, 15 + b, 4, 3, k.m);
        L.set(4, 14 + b, k.d);
      }
      break;
    case "musician":
      if (front) {
        L.rect(7, 13 + b, 2, 4, WHITE);
        L.set(6, 13 + b, GOLD_D);
        L.set(9, 13 + b, GOLD_D);
        L.rect(7, 13 + b, 2, 1, GOLD);
      } else if (view === "left") {
        L.set(4, 13 + b, GOLD);
        L.rect(3, 14 + b, 1, 2, WHITE);
      }
      tails(L, view, b, k.m, k.d, true);
      break;
    case "helmsman":
      // Gloves and a coil of rope on the shoulder.
      if (view === "left") L.rect(p.side.x, p.side.y, 2, 1, LEATHER);
      else {
        L.set(p.left.x, p.left.y, LEATHER);
        L.set(p.right.x, p.right.y, LEATHER);
      }
      if (front) {
        L.rect(10, 13 + b, 3, 1, "#c7a46a");
        L.set(11, 14 + b, "#c7a46a");
        L.set(12, 14 + b, "#9a7a48");
        L.rect(7, 14 + b, 2, 1, k.l);
      } else if (view === "up") {
        L.rect(3, 13 + b, 3, 1, "#c7a46a");
        L.set(4, 14 + b, "#9a7a48");
      } else {
        L.rect(6, 13 + b, 3, 1, "#c7a46a");
      }
      tails(L, view, b, k.m, k.d);
      break;
  }

  const tool = TOOLS[role];
  if (tool) {
    const pal = toolPal(k);
    if (view === "down") L.pattern(p.left.x, p.left.y, tool, pal);
    else if (view === "up") L.pattern(p.right.x, p.right.y, tool, pal, true);
    else L.pattern(p.side.x, p.side.y, tool, pal);
  }
}

function drawOutfitFrame(role: RoleId, color: number, dir: Dir, frame: number): { layer: Layer; mirror: boolean } {
  const view: View = dir === "right" ? "left" : dir;
  const c = OUTFIT_COLORS[color];
  const k: Colors = { m: c.main, d: c.dark, l: mix(c.main, "#ffffff", 0.3) };
  const base: Palette = {
    o: O,
    e: SKIP,
    w: SKIP,
    s: SKIP,
    S: SKIP,
    h: SKIP,
    H: SKIP,
    j: SKIP,
    m: SKIP,
    r: SKIP,
    n: LEATHER,
    y: GOLD,
    b: "#3b2a1e",
    B: "#5a4030",
    ...garments(role, k),
  } as Palette;
  const body = new Canvas(FRAME_W, FRAME_H);
  drawFrame(body.cell(0, 0, FRAME_W, FRAME_H), view, frame, base);
  const pose = poseFor(view, frame);
  const L = new Layer();
  const top = 13 + pose.bob;
  for (let y = 0; y < FRAME_H; y++)
    for (let x = 0; x < FRAME_W; x++) if (body.data[(y * FRAME_W + x) * 4 + 3]) L.body.add(`${x},${y}`);
  for (let y = top; y < FRAME_H; y++)
    for (let x = 0; x < FRAME_W; x++) {
      const i = (y * FRAME_W + x) * 4;
      if (body.data[i + 3] === 0) continue;
      L.body.add(`${x},${y}`);
      const hex = `#${[0, 1, 2].map((q) => body.data[i + q].toString(16).padStart(2, "0")).join("")}`;
      if (hex === SKIP) continue;
      L.set(x, y, hex);
    }
  decorate(L, role, view, pose, k);
  return { layer: L, mirror: dir === "right" };
}

/** outfits.png: rows = role × direction, columns = colour × frame. */
export function drawOutfits(): Canvas {
  const sheet = new Canvas(OUTFIT_COLORS.length * FRAMES_PER_ROW * LAYER_W, ROLE_IDS.length * DIRECTION_ORDER.length * LAYER_H);
  ROLE_IDS.forEach((role, r) =>
    DIRECTION_ORDER.forEach((dir, d) =>
      OUTFIT_COLORS.forEach((_, c) => {
        for (let f = 0; f < FRAMES_PER_ROW; f++) {
          const { layer, mirror } = drawOutfitFrame(role, c, dir, f);
          blit(sheet, layer, c * FRAMES_PER_ROW + f, r * DIRECTION_ORDER.length + d, mirror);
        }
      }),
    ),
  );
  return sheet;
}

// --- Hats ----------------------------------------------------------------------

/**
 * Hat art in body coordinates, top row first; `top` is the body row of the
 * first pattern row (negative = above the frame). Front art is mirrored
 * from its left half; side art faces left.
 */
type HatArt = { top: number; front: string[]; back?: string[]; side: string[]; pal: Record<string, Color> };

const half = (rows: string[]) => rows.map((l) => l + [...l].reverse().join(""));

const HATS: Record<(typeof HAT_IDS)[number], HatArt> = {
  tricorn: {
    top: -2,
    pal: { o: O, a: "#2e2a33", A: "#1f1c24", g: GOLD },
    front: half(["......oo", "....ooaa", "..ooaaaa", ".oaaaaaa", "ogaaaaaa", "ogoAAAAA", ".o.ooooo"]),
    side: ["......oooo......", "....ooaaaaoo....", "...oaaaaaaaao...", "..oaaaaaaaaaao..", ".ogaaaaaaaaaago.", "ogoAAAAAAAAAAogo", ".o.oooooooooo.o."],
  },
  bandana: {
    top: 1,
    pal: { o: O, a: RED, A: "#8f3029", w: "#f2efe6" },
    front: half(["....oooo", "..ooaaaa", ".oaawaaa", ".oaaaaaw", "oAAAAAAA", ".ooooooo"]),
    back: ["....oooooooo....", "..ooaaaaaaaaoo..", ".oaaaaaaaaaaaao.", ".oaaaaaaaaaaaao.", "oAAAAAAAAAAAAAAo", ".ooooooooooaaoo.", "..........oaAo..", "...........oo..."],
    side: ["....oooooo......", "..ooaaaaaaoo....", ".oaawaaaaaaao...", ".oaaaaaaawaaao..", "oAAAAAAAAAAAAoao", ".oooooooooooooAo", "..............o."],
  },
  chef: {
    top: -6,
    pal: { o: O, a: "#ffffff", A: "#d8d4ca" },
    front: half(["..oooooo", ".oaaaaaa", "oaaaaaaa", "oaaaaaaa", "oAaaaaaa", ".oAaaaaa", "..oaaaaa", "..oAaaaa", "..oaaaaa", "..oAAAAA", "...ooooo"]),
    side: ["...oooooooooo...", "..oaaaaaaaaaao..", ".oaaaaaaaaaaaao.", ".oaaaaaaaaaaaao.", ".oAaaaaaaaaaaAo.", "..oAaaaaaaaaAo..", "...oaaaaaaaao...", "...oAaaaaaaao...", "...oaaaaaaaao...", "...oAAAAAAAAo...", "....oooooooo...."],
  },
  straw: {
    top: -1,
    pal: { o: O, a: "#e8c76a", A: "#c49a3c", r: RED },
    front: half(["....oooo", "...oaaaa", "..oaaaaa", "..orrrrr", "ooAaaaaa", "oaaaaaaa", ".ooooooo"]),
    side: [".....oooooo.....", "....oaaaaaao....", "...oaaaaaaaao...", "...orrrrrrrro...", "ooooAaaaaaaAoooo", "oaaaaaaaaaaaaaao", ".oooooooooooooo."],
  },
  bicorne: {
    top: -3,
    pal: { o: O, a: "#2e2a33", A: "#1f1c24", g: GOLD },
    front: half(["......oo", ".....oaa", "....oaaa", "..ooaaaa", ".oaaaaag", "oaaaaaag", "oAAAAAAA", ".ooooooo"]),
    side: [".......oo.......", "......oaao......", ".....oaaaao.....", ".....oaaaao.....", "....oagaaaao....", "....oaaaaaao....", "...oAAAAAAAAo...", "....oooooooo...."],
  },
  feathered: {
    top: -4,
    pal: { o: O, a: "#5a2f4a", A: "#3e2034", f: "#f2efe6", F: "#c9c4b6", g: GOLD },
    front: ["...........oo...", "..........ofo...", ".........offo...", "....oooooFoo....", "...oaaaaaaaao...", "..oaaaaaaaaaao..", "..oggggggggggo..", "ooAaaaaaaaaaaAoo", "oaaaaaaaaaaaaaao", ".oooooooooooooo."],
    side: ["...........ooo..", "..........offfo.", ".........offFo..", ".....oooooFoo...", "....oaaaaaaao...", "...oaaaaaaaaao..", "...oggggggggggo.", "ooooAaaaaaaaAooo", "oaaaaaaaaaaaaaao", ".oooooooooooooo."],
  },
  knit: {
    top: 0,
    pal: { o: O, a: "#3f7a8a", A: "#2a5560", w: "#e9e4d8" },
    front: half(["......oo", ".....owo", "...oooao", "..oaaaaa", ".oaaaaaa", ".oAAAAAA", ".ooooooo"]),
    side: [".......oo.......", "......owo.......", "....oooaooo.....", "..ooaaaaaaaoo...", ".oaaaaaaaaaaao..", ".oAAAAAAAAAAAo..", ".ooooooooooooo.."],
  },
  top: {
    top: -6,
    pal: { o: O, a: "#26222a", A: "#17141b", r: "#b33a35" },
    front: half(["...ooooo", "...oaaaa", "...oaaaa", "...oaaaa", "...oaaaa", "...orrrr", "...oaaaa", ".ooAAAAA", ".ooooooo"]),
    side: ["...oooooooo.....", "...oaaaaaao.....", "...oaaaaaao.....", "...oaaaaaao.....", "...oaaaaaao.....", "...orrrrrro.....", "...oaaaaaao.....", ".ooAAAAAAAAoo...", ".oooooooooooo..."],
  },
  explorer: {
    top: -2,
    pal: { o: O, a: "#d8c79a", A: "#b0a070", r: LEATHER },
    front: half(["....oooo", "...oaaaa", "..oaaaaa", "..oaaaaa", ".orrrrrr", "oAaaaaaa", "oAAAAAAA", ".ooooooo"]),
    side: [".....oooooo.....", "....oaaaaaao....", "...oaaaaaaaao...", "...oaaaaaaaao...", "..orrrrrrrrrro..", "oAaaaaaaaaaaaaao", "oAAAAAAAAAAAAAAo", ".oooooooooooooo."],
  },
};

for (const [name, art] of Object.entries(HATS))
  for (const rows of [art.front, art.side, art.back ?? []])
    for (const r of rows) if (r.length !== 16) throw new Error(`hat ${name} row is ${r.length} wide: "${r}"`);

/** hats.png: rows = hat × direction, columns = frame. Hat 0 ("no hat") has no row. */
export function drawHats(): Canvas {
  const sheet = new Canvas(FRAMES_PER_ROW * LAYER_W, HAT_IDS.length * DIRECTION_ORDER.length * LAYER_H);
  HAT_IDS.forEach((id, h) =>
    DIRECTION_ORDER.forEach((dir, d) => {
      const art = HATS[id];
      const rows = dir === "down" ? art.front : dir === "up" ? (art.back ?? art.front) : art.side;
      for (let f = 0; f < FRAMES_PER_ROW; f++) {
        const L = new Layer();
        const b = poseFor(dir, f).bob;
        rows.forEach((r, y) =>
          [...r].forEach((ch, x) => {
            if (ch === ".") return;
            L.set(x, art.top + y + b, art.pal[ch]);
          }),
        );
        blit(sheet, L, f, h * DIRECTION_ORDER.length + d, dir === "right");
      }
    }),
  );
  return sheet;
}
