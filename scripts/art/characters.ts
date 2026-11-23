import { Canvas, type Cell, type Color } from "../lib/canvas.ts";

export const FRAME_W = 16;
export const FRAME_H = 24;
/** Columns: idle0, idle1, walk0, walk1, walk2, walk3. */
export const FRAMES_PER_ROW = 6;
/** Row order within each variant block. Must match src/game/entities/characterAnims.ts. */
export const DIRECTION_ORDER = ["down", "left", "right", "up"] as const;
export const VARIANTS = 6;

type Palette = Record<string, Color>;

const OUTLINE = "#1e1420";

/** Mixes a hex colour towards another (t = 0..1). */
function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

// shirt c/C, hair h/H, skin s/S, pants p/P. Highlights are derived.
const VARIANT_BASES: Palette[] = [
  { c: "#2f8f83", C: "#1f6a61", h: "#5a3a22", H: "#3f2716", s: "#f2c79b", S: "#d9a57a", p: "#2c3a5a", P: "#1f2a43" },
  { c: "#c2483d", C: "#8f3029", h: "#2e2a33", H: "#17151a", s: "#c98d5e", S: "#a56f45", p: "#4a3b2a", P: "#33281c" },
  { c: "#e3b341", C: "#b38726", h: "#c0612b", H: "#8f4520", s: "#f6d2b4", S: "#dcae8c", p: "#3a4a3a", P: "#283428" },
  { c: "#7a54a8", C: "#593b80", h: "#e8cf7a", H: "#bfa253", s: "#8d5a3b", S: "#6e432a", p: "#2b2b33", P: "#1c1c22" },
  { c: "#e9e4d8", C: "#bdb6a6", h: "#9a9aa6", H: "#6e6e7a", s: "#e0ac80", S: "#c08a60", p: "#33507a", P: "#243a5a" },
  { c: "#5c9a3c", C: "#41702a", h: "#d9708f", H: "#a84f6a", s: "#6b4330", S: "#4e2f21", p: "#5a3b2a", P: "#3f291c" },
];

function paletteFor(base: Palette): Palette {
  return {
    ...base,
    o: OUTLINE,
    e: OUTLINE,
    w: "#ffffff",
    j: mix(base.h, "#ffffff", 0.18), // hair highlight
    k: mix(base.c, "#ffffff", 0.3), // shirt highlight
    m: mix(base.S, OUTLINE, 0.45), // mouth
    r: mix(base.s, "#e0606a", 0.35), // cheek blush
    n: "#3a2618", // belt
    y: "#e0b266", // buckle
    b: "#3b2a1e", // boots
    B: "#5a4030", // boot highlight
  };
}

/** Builds a symmetric 16-px row from its left 8 px. */
const sym = (left: string) => {
  if (left.length !== 8) throw new Error(`half row must be 8 px: "${left}"`);
  return left + [...left].reverse().join("");
};

// Head and torso, rows 0..18. Legs and arms are drawn in code.
const FRONT = [
  "........",
  ".....ooo",
  "...oohjj",
  "..ohhhjh",
  ".ohhhhhh",
  ".ohHhhhh",
  ".ohHhsss",
  ".oHsssss",
  ".oHswess",
  ".oHseess",
  "..osrsss",
  "..oSsssm",
  "...oSSSS",
  "....okkk",
  "...occck",
  "...oCccc",
  "...oCccc",
  "...onnny",
  "....oppp",
].map(sym);

const BACK = [
  "........",
  ".....ooo",
  "...oohjj",
  "..ohhhjh",
  ".ohhhhhh",
  ".ohHhhhh",
  ".ohHhhhh",
  ".oHhhhhh",
  ".oHhhhhh",
  ".oHHhhhh",
  "..oHHhhh",
  "..oSHHHH",
  "...oSSSS",
  "....okkk",
  "...occcc",
  "...oCccc",
  "...oCccc",
  "...onnnn",
  "....oppp",
].map(sym);

// Facing left; mirrored for right.
const SIDE = [
  "................",
  ".....oooooo.....",
  "...oohhhhhjoo...",
  "..ohhhhhhhhhho..",
  ".ohhhhhhhhhhhho.",
  ".ohhhhhhhhhHhho.",
  ".ohsssshhhHHho..",
  ".osssssshhHHho..",
  "osswesSshHhho...",
  ".osseesssHhho...",
  "..osrssSShho....",
  "..oSmssSSho.....",
  "...oSSSSoo......",
  "....okkkkko.....",
  "...occcccCo.....",
  "...oCccccCo.....",
  "...oCccccCo.....",
  "...onnnnnno.....",
  "....oppppo......",
];

for (const art of [FRONT, BACK, SIDE]) {
  if (art.length !== 19) throw new Error("character art must be 19 rows");
  for (const row of art) if (row.length !== 16) throw new Error(`Character row is ${row.length} wide: "${row}"`);
}

/** One leg: 2 px of trousers, a boot, and an outline. `lift` raises the foot. */
function leg(c: Cell, x: number, lift: number, pal: Palette, far = false, toe = 0) {
  const bottom = 22 - lift;
  for (let y = 19; y <= bottom; y++) {
    const boot = y >= bottom - 1;
    c.set(x - 1, y, pal.o);
    c.set(x + 2, y, pal.o);
    c.rect(x, y, 2, 1, boot ? (y === bottom - 1 ? pal.B : pal.b) : far ? pal.P : pal.p);
  }
  if (toe) {
    const tx = toe < 0 ? x - 1 : x + 2;
    c.set(tx, bottom, pal.b);
    c.set(tx + toe, bottom, pal.o);
  }
  c.rect(x - 1 + Math.min(toe, 0), bottom + 1, 4 + Math.abs(toe), 1, pal.o);
}

/** A front/back arm hanging at the side: sleeve, hand, outline. `dy` swings it. */
function sideArm(c: Cell, x: number, dy: number, pal: Palette) {
  for (let y = 14 + dy; y <= 16 + dy; y++) {
    c.set(x, y, pal.o);
    c.set(x + 1, y, y === 16 + dy ? pal.s : y === 14 + dy ? pal.c : pal.C);
    c.set(x + 2, y, pal.o);
  }
  c.rect(x, 17 + dy, 3, 1, pal.o);
}

type Dir = (typeof DIRECTION_ORDER)[number];

function drawFrame(c: Cell, dir: Dir, frame: number, pal: Palette) {
  const walking = frame >= 2;
  const step = frame - 2; // 0..3 when walking
  const bob = walking ? (step % 2 === 0 ? 1 : 0) : frame === 1 ? 1 : 0;

  if (dir === "down" || dir === "up") {
    const liftLeft = walking && step === 0 ? 1 : 0;
    const liftRight = walking && step === 2 ? 1 : 0;
    leg(c, 5, liftLeft, pal);
    leg(c, 9, liftRight, pal);
    c.pattern(0, bob, dir === "down" ? FRONT : BACK, pal);
    // Arms swing opposite to the legs.
    const swing = walking ? (step === 0 ? 1 : step === 2 ? -1 : 0) : 0;
    sideArm(c, 1, bob + Math.max(0, -swing), pal);
    sideArm(c, 12, bob + Math.max(0, swing), pal);
  } else {
    const mirror = dir === "right";
    const toe = -1; // boots point the way the character faces (left before mirroring)
    const stride = walking ? (step === 0 ? 2 : step === 2 ? -2 : 0) : 0;
    const layer = new Canvas(16, 24);
    const lc = layer.cell(0, 0, 16, 24);
    leg(lc, 7 + stride, 0, pal, true, toe);
    leg(lc, 7 - stride, walking && step % 2 === 1 ? 1 : 0, pal, false, toe);
    lc.pattern(0, bob, SIDE, pal);
    // The near arm: a sleeve-shaded strip that swings forward and back.
    const armX = 6 - Math.sign(stride);
    for (let y = 14 + bob; y <= 16 + bob; y++) lc.rect(armX, y, 2, 1, pal.C);
    lc.rect(armX, 17 + bob, 2, 1, pal.s);
    lc.rect(armX, 18 + bob, 2, 1, pal.o);
    // Copy (mirrored for right) into the frame.
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < 16; x++) {
        const i = (y * 16 + x) * 4;
        if (layer.data[i + 3] === 0) continue;
        const hex = `#${[0, 1, 2].map((k) => layer.data[i + k].toString(16).padStart(2, "0")).join("")}`;
        c.set(mirror ? 15 - x : x, y, hex);
      }
  }
}

export function drawCharacters(): Canvas {
  const canvas = new Canvas(FRAMES_PER_ROW * FRAME_W, VARIANTS * DIRECTION_ORDER.length * FRAME_H);
  VARIANT_BASES.forEach((base, v) => {
    const pal = paletteFor(base);
    DIRECTION_ORDER.forEach((dir, d) => {
      for (let f = 0; f < FRAMES_PER_ROW; f++) {
        drawFrame(canvas.cell(f, v * DIRECTION_ORDER.length + d, FRAME_W, FRAME_H), dir, f, pal);
      }
    });
  });
  return canvas;
}
