import { Canvas, type Cell, type Color } from "../lib/canvas.ts";

/** Tile ids in the tileset image (Tiled gid = id + 1). */
export const T = {
  DECK: 0,
  DECK_B: 1,
  DECK_SHADOW: 2,
  BRIDGE: 3,
  STAIRS: 4,
  GANGWAY: 5,
  PIER: 6,
  RUG: 7,
  HATCH: 8,
  RAIL_N: 9,
  RAIL_S: 10,
  RAIL_W: 11,
  RAIL_E: 12,
  RAIL_NW: 13,
  RAIL_NE: 14,
  RAIL_SW: 15,
  RAIL_SE: 16,
  RAIL_DIAG_UP: 17, // "\" upper bow edge, deck to the lower left
  RAIL_DIAG_DOWN: 18, // "/" lower bow edge, deck to the upper left
  RAIL_INNER: 19,
  HULL: 20,
  HULL_PORT: 21,
  ROOF: 22,
  WALL: 23,
  WALL_WINDOW: 24,
  DOOR: 25,
  BARREL: 26,
  CRATE: 27,
  MAST_BASE: 28,
  LANTERN_BASE: 29,
  ROPE: 30,
  WHEEL: 31,
  TABLE: 32,
  BENCH: 33,
  TELESCOPE: 34,
  MAST_POLE: 35,
  YARD_L: 36,
  YARD_M: 37,
  YARD_R: 38,
  MAST_TOP: 39,
  FLAG_A: 40,
  FLAG_B: 41,
  LANTERN_TOP_A: 42,
  LANTERN_TOP_B: 43,
  COLLISION: 44,
  BRIDGE_SHADOW: 45,
} as const;

export const TILESET_COLUMNS = 8;
export const TILESET_ROWS = 6;
export const TILE = 16;

const P = {
  outline: "#2a1a12",
  deck: "#b07a45",
  deckLight: "#c48c55",
  deckDark: "#93643a",
  deckSeam: "#6e4627",
  bridge: "#9a5d3b",
  bridgeLight: "#ad6d48",
  bridgeDark: "#7c482d",
  bridgeSeam: "#5a321f",
  rail: "#7a4a28",
  railLight: "#a8703f",
  railDark: "#4e2e18",
  hull: "#5a3520",
  hullDark: "#3e2414",
  hullLight: "#6f4429",
  brass: "#d9a441",
  brassDark: "#9c7022",
  glass: "#7fb8c9",
  wall: "#dcc79d",
  wallShade: "#bba57b",
  wallSeam: "#9c875f",
  roof: "#7d3b2a",
  roofLight: "#9a4c36",
  roofDark: "#5e2a1e",
  door: "#6b3f22",
  doorDark: "#4a2a16",
  barrel: "#8f5a31",
  barrelLight: "#b0743f",
  iron: "#4a4a55",
  ironLight: "#6c6c78",
  crate: "#c08a4e",
  crateDark: "#8a5a30",
  crateLight: "#d9a468",
  mast: "#6e4426",
  mastLight: "#8d5a33",
  sail: "#efe3c2",
  sailShade: "#d3c096",
  lanternPost: "#3a2a20",
  glow: "#ffd36b",
  glowHot: "#fff1b8",
  glowDim: "#f0a63c",
  rope: "#c9a66b",
  ropeDark: "#987640",
  table: "#9a6a3e",
  tableLight: "#b5804d",
  bench: "#7d5330",
  benchLight: "#996840",
  flag: "#c8443a",
  flagLight: "#e0604a",
  rug: "#8e3b46",
  rugLight: "#a84d58",
  rugBorder: "#d9a441",
  pier: "#8f7a62",
  pierLight: "#a68f74",
  pierDark: "#6e5c47",
  shadow: "#00000040",
  collision: "#ff00ff80",
};

function planks(c: Cell, base: Color, light: Color, dark: Color, seam: Color, variant = 0): void {
  c.rect(0, 0, 16, 16, base);
  // Horizontal planks, 4 px tall, with staggered end seams.
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    c.rect(0, y, 16, 1, light);
    c.rect(0, y + 3, 16, 1, seam);
    const seamX = (row * 7 + variant * 5 + 3) % 16;
    c.rect(seamX, y, 1, 3, seam);
    c.set((seamX + 8) % 16, y + 2, dark);
  }
  if (variant === 1) {
    c.set(5, 6, dark); // knot
    c.set(6, 6, seam);
    c.set(11, 13, P.outline); // nail heads
    c.set(2, 9, P.outline);
  }
}

function deck(c: Cell, variant = 0) {
  planks(c, P.deck, P.deckLight, P.deckDark, P.deckSeam, variant);
}

function bridge(c: Cell) {
  planks(c, P.bridge, P.bridgeLight, P.bridgeDark, P.bridgeSeam, 1);
}

function shade(c: Cell, x: number, y: number, w: number, h: number) {
  c.rect(x, y, w, h, P.shadow);
}

/** Horizontal rail beam with posts; `y` is the top of the 6 px tall rail. */
function railH(c: Cell, y: number, front: boolean) {
  c.rect(0, y, 16, 2, P.railLight);
  c.rect(0, y + 2, 16, front ? 3 : 2, P.rail);
  c.rect(0, y + (front ? 5 : 4), 16, 1, P.railDark);
  for (const px of [2, 10]) {
    c.rect(px, y + 2, 2, front ? 3 : 2, P.railDark);
    c.set(px, y + 2, P.rail);
  }
}

function railV(c: Cell, x: number) {
  c.rect(x, 0, 2, 16, P.railLight);
  c.rect(x + 2, 0, 2, 16, P.rail);
  c.rect(x + 4, 0, 1, 16, P.railDark);
  for (const py of [3, 11]) c.rect(x, py, 5, 2, P.railDark);
}

function drawTile(c: Cell, id: number): void {
  switch (id) {
    case T.DECK:
      return deck(c, 0);
    case T.DECK_B:
      return deck(c, 1);
    case T.DECK_SHADOW:
      deck(c, 0);
      return shade(c, 0, 0, 16, 4);
    case T.BRIDGE:
      return bridge(c);
    case T.BRIDGE_SHADOW:
      bridge(c);
      return shade(c, 0, 0, 16, 4);
    case T.STAIRS:
      c.rect(0, 0, 16, 16, P.bridgeDark);
      for (let x = 0; x < 16; x += 4) {
        c.rect(x, 0, 3, 16, x < 8 ? P.deckLight : P.bridgeLight);
        c.rect(x + 3, 0, 1, 16, P.outline);
      }
      return;
    case T.GANGWAY:
      c.rect(0, 0, 16, 16, P.deckLight);
      for (let y = 1; y < 16; y += 4) c.rect(1, y, 14, 1, P.deckSeam);
      c.rect(0, 0, 1, 16, P.deckDark);
      c.rect(15, 0, 1, 16, P.deckDark);
      return;
    case T.PIER:
      c.rect(0, 0, 16, 16, P.pier);
      for (let x = 0; x < 16; x += 4) {
        c.rect(x, 0, 1, 16, P.pierLight);
        c.rect(x + 3, 0, 1, 16, P.pierDark);
      }
      c.set(1, 3, P.outline);
      c.set(9, 12, P.outline);
      return;
    case T.RUG:
      c.rect(0, 0, 16, 16, P.rug);
      for (let y = 1; y < 16; y += 3) for (let x = (y % 2) * 2; x < 16; x += 4) c.set(x, y, P.rugLight);
      return;
    case T.HATCH:
      deck(c, 0);
      c.rect(1, 1, 14, 14, P.railDark);
      for (let y = 2; y < 14; y += 3) for (let x = 2; x < 14; x += 3) c.rect(x, y, 2, 2, P.outline);
      c.rect(1, 1, 14, 1, P.railLight);
      return;
    case T.RAIL_N:
      deck(c, 0);
      shade(c, 0, 6, 16, 3);
      return railH(c, 0, false);
    case T.RAIL_S:
      deck(c, 0);
      c.rect(0, 9, 16, 7, P.hullDark);
      return railH(c, 9, true);
    case T.RAIL_W:
      deck(c, 0);
      shade(c, 5, 0, 2, 16);
      return railV(c, 0);
    case T.RAIL_E:
      deck(c, 0);
      shade(c, 9, 0, 2, 16);
      return railV(c, 11);
    case T.RAIL_NW:
      deck(c, 0);
      shade(c, 5, 6, 11, 3);
      railV(c, 0);
      return railH(c, 0, false);
    case T.RAIL_NE:
      deck(c, 0);
      shade(c, 0, 6, 11, 3);
      railV(c, 11);
      return railH(c, 0, false);
    case T.RAIL_SW:
      deck(c, 0);
      c.rect(0, 9, 16, 7, P.hullDark);
      railV(c, 0);
      return railH(c, 9, true);
    case T.RAIL_SE:
      deck(c, 0);
      c.rect(0, 9, 16, 7, P.hullDark);
      railV(c, 11);
      return railH(c, 9, true);
    case T.RAIL_DIAG_UP:
      // "\" : deck below-left of the diagonal, water above-right.
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = x - y;
          if (d < -2) c.set(x, y, (y % 4 === 3 ? P.deckSeam : y % 4 === 0 ? P.deckLight : P.deck));
          else if (d <= 2) c.set(x, y, d <= -1 ? P.railLight : d <= 1 ? P.rail : P.railDark);
        }
      return;
    case T.RAIL_DIAG_DOWN:
      // "/" : deck above-left of the diagonal, water below-right.
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = x + y - 15;
          if (d < -2) c.set(x, y, (y % 4 === 3 ? P.deckSeam : y % 4 === 0 ? P.deckLight : P.deck));
          else if (d <= 3) c.set(x, y, d <= -1 ? P.railLight : d <= 1 ? P.rail : P.hullDark);
        }
      return;
    case T.RAIL_INNER:
      deck(c, 0);
      shade(c, 10, 0, 2, 16);
      return railV(c, 5);
    case T.HULL:
    case T.HULL_PORT:
      c.rect(0, 0, 16, 16, P.hull);
      for (let y = 0; y < 16; y += 4) {
        c.rect(0, y, 16, 1, P.hullLight);
        c.rect(0, y + 3, 16, 1, P.hullDark);
      }
      if (id === T.HULL_PORT) {
        c.rect(5, 4, 6, 6, P.brassDark);
        c.rect(6, 4, 4, 6, P.brass);
        c.rect(5, 5, 6, 4, P.brass);
        c.rect(6, 5, 4, 4, P.glass);
        c.set(7, 6, "#cfe8ef");
      }
      return;
    case T.ROOF:
      c.rect(0, 0, 16, 16, P.roof);
      for (let y = 0; y < 16; y += 4) {
        c.rect(0, y, 16, 1, P.roofLight);
        c.rect(0, y + 3, 16, 1, P.roofDark);
        for (let x = (y / 4) % 2 ? 0 : 4; x < 16; x += 8) c.rect(x, y, 1, 3, P.roofDark);
      }
      return;
    case T.WALL:
    case T.WALL_WINDOW:
      c.rect(0, 0, 16, 16, P.wall);
      for (let x = 0; x < 16; x += 4) c.rect(x + 3, 0, 1, 16, P.wallSeam);
      c.rect(0, 0, 16, 2, P.roofDark);
      c.rect(0, 14, 16, 2, P.wallShade);
      if (id === T.WALL_WINDOW) {
        c.rect(3, 4, 10, 8, P.outline);
        c.rect(4, 5, 8, 6, P.glow);
        c.rect(4, 5, 8, 2, P.glowHot);
        c.rect(7, 5, 2, 6, P.outline);
        c.rect(4, 7, 8, 1, P.outline);
      }
      return;
    case T.DOOR:
      c.rect(0, 0, 16, 16, P.wall);
      c.rect(0, 0, 16, 2, P.roofDark);
      c.rect(2, 2, 12, 14, P.outline);
      c.rect(3, 3, 10, 13, P.door);
      for (let x = 5; x < 13; x += 3) c.rect(x, 3, 1, 13, P.doorDark);
      c.rect(10, 9, 2, 2, P.brass);
      return;
    case T.BARREL:
      shade(c, 2, 13, 12, 3);
      c.rect(3, 1, 10, 14, P.outline);
      c.rect(2, 3, 12, 10, P.outline);
      c.rect(3, 2, 10, 12, P.barrel);
      c.rect(4, 2, 2, 12, P.barrelLight);
      c.rect(3, 4, 10, 1, P.iron);
      c.rect(3, 11, 10, 1, P.iron);
      c.rect(4, 2, 8, 2, P.barrelLight); // lid
      return;
    case T.CRATE:
      shade(c, 1, 13, 14, 3);
      c.rect(1, 1, 14, 14, P.outline);
      c.rect(2, 2, 12, 12, P.crate);
      c.rect(2, 2, 12, 1, P.crateLight);
      c.rect(2, 13, 12, 1, P.crateDark);
      for (let i = 0; i < 12; i++) {
        c.set(2 + i, 2 + i, P.crateDark);
        c.set(13 - i, 2 + i, P.crateDark);
      }
      return;
    case T.MAST_BASE:
      shade(c, 3, 12, 10, 3);
      c.rect(3, 9, 10, 5, P.ropeDark);
      c.rect(4, 10, 8, 3, P.rope);
      c.rect(5, 0, 6, 12, P.outline);
      c.rect(6, 0, 4, 12, P.mast);
      c.rect(6, 0, 1, 12, P.mastLight);
      return;
    case T.LANTERN_BASE:
      shade(c, 4, 13, 8, 2);
      c.rect(6, 11, 4, 3, P.outline);
      c.rect(7, 0, 2, 13, P.lanternPost);
      return;
    case T.ROPE:
      shade(c, 2, 12, 12, 3);
      c.rect(3, 4, 10, 9, P.ropeDark);
      c.rect(2, 5, 12, 7, P.ropeDark);
      c.rect(4, 5, 8, 7, P.rope);
      c.rect(6, 7, 4, 3, P.ropeDark);
      c.rect(7, 8, 2, 1, P.outline);
      return;
    case T.WHEEL:
      shade(c, 2, 13, 12, 3);
      c.rect(7, 8, 2, 7, P.railDark); // stand
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        c.set(Math.round(8 + Math.cos(ang) * 6), Math.round(7 + Math.sin(ang) * 6), P.barrel);
      }
      for (let a = 0; a < 8; a++) {
        const ang = (a / 8) * Math.PI * 2;
        for (let r = 1; r <= 7; r++)
          c.set(Math.round(8 + Math.cos(ang) * r), Math.round(7 + Math.sin(ang) * r), r === 7 ? P.barrelLight : P.barrel);
      }
      c.rect(7, 6, 2, 2, P.brass);
      return;
    case T.TABLE:
      shade(c, 1, 12, 14, 3);
      c.rect(1, 2, 14, 10, P.outline);
      c.rect(2, 3, 12, 8, P.table);
      c.rect(2, 3, 12, 2, P.tableLight);
      c.rect(2, 12, 2, 3, P.outline);
      c.rect(12, 12, 2, 3, P.outline);
      c.rect(6, 5, 4, 3, P.glowHot); // a candle-lit plate
      c.rect(7, 4, 2, 1, P.glow);
      return;
    case T.BENCH:
      shade(c, 1, 12, 14, 3);
      c.rect(1, 5, 14, 7, P.outline);
      c.rect(2, 6, 12, 4, P.bench);
      c.rect(2, 6, 12, 1, P.benchLight);
      c.rect(2, 12, 2, 2, P.outline);
      c.rect(12, 12, 2, 2, P.outline);
      return;
    case T.TELESCOPE:
      shade(c, 3, 13, 10, 3);
      c.rect(4, 8, 1, 7, P.railDark);
      c.rect(8, 8, 1, 7, P.railDark);
      c.rect(12, 8, 1, 7, P.railDark);
      c.rect(3, 4, 11, 4, P.outline);
      c.rect(4, 5, 9, 2, P.brass);
      c.rect(11, 3, 4, 6, P.outline);
      c.rect(12, 4, 2, 4, P.brass);
      c.rect(4, 5, 9, 1, "#f3cf72");
      return;
    case T.MAST_POLE:
      c.rect(5, 0, 6, 16, P.outline);
      c.rect(6, 0, 4, 16, P.mast);
      c.rect(6, 0, 1, 16, P.mastLight);
      return;
    case T.MAST_TOP:
      c.rect(5, 4, 6, 12, P.outline);
      c.rect(6, 5, 4, 11, P.mast);
      c.rect(4, 2, 8, 3, P.outline);
      c.rect(5, 3, 6, 1, P.mastLight);
      return;
    case T.YARD_L:
    case T.YARD_M:
    case T.YARD_R: {
      // Furled sail lashed to a yard (cross beam).
      const left = id === T.YARD_L ? 2 : 0;
      const right = id === T.YARD_R ? 14 : 16;
      c.rect(left, 3, right - left, 3, P.outline);
      c.rect(left, 4, right - left, 1, P.mastLight);
      c.rect(left, 6, right - left, 6, P.outline);
      c.rect(left + (left ? 1 : 0), 7, right - left - (left ? 1 : 0) - (right < 16 ? 1 : 0), 4, P.sail);
      c.rect(left + (left ? 1 : 0), 10, right - left - (left ? 1 : 0) - (right < 16 ? 1 : 0), 1, P.sailShade);
      for (let x = left + 3; x < right - 1; x += 5) c.rect(x, 6, 1, 6, P.ropeDark);
      if (id === T.YARD_M) {
        c.rect(5, 0, 6, 3, P.outline);
        c.rect(6, 0, 4, 3, P.mast);
        c.rect(5, 12, 6, 4, P.outline);
        c.rect(6, 12, 4, 4, P.mast);
      }
      return;
    }
    case T.FLAG_A:
    case T.FLAG_B: {
      c.rect(7, 0, 2, 16, P.outline);
      c.rect(7, 2, 1, 14, P.mastLight);
      const wave = id === T.FLAG_A ? [0, 0, 1, 1, 1, 0] : [1, 1, 0, 0, 0, 1];
      for (let x = 0; x < 6; x++) {
        const h = 6 - Math.floor(x / 2);
        const top = 2 + wave[x] + Math.floor(x / 2) / 2;
        c.rect(9 + x, Math.floor(top), 1, h, x % 2 ? P.flag : P.flagLight);
      }
      return;
    }
    case T.LANTERN_TOP_A:
    case T.LANTERN_TOP_B: {
      const hot = id === T.LANTERN_TOP_A;
      c.rect(7, 12, 2, 4, P.lanternPost);
      c.rect(5, 5, 6, 8, P.outline);
      c.rect(6, 6, 4, 6, hot ? P.glow : P.glowDim);
      c.rect(7, 7, 2, 3, hot ? P.glowHot : P.glow);
      c.rect(4, 4, 8, 2, P.outline);
      c.rect(7, 2, 2, 2, P.outline);
      return;
    }
    case T.COLLISION:
      c.rect(0, 0, 16, 16, P.collision);
      return;
    default:
      throw new Error(`No drawing for tile ${id}`);
  }
}

export function drawTileset(): Canvas {
  const canvas = new Canvas(TILESET_COLUMNS * TILE, TILESET_ROWS * TILE);
  for (const id of Object.values(T)) {
    drawTile(canvas.cell(id % TILESET_COLUMNS, Math.floor(id / TILESET_COLUMNS), TILE, TILE), id);
  }
  return canvas;
}

/** Ocean texture used by the animated TileSprite (32×32, tiles seamlessly). */
export function drawOcean(): Canvas {
  const c = new Canvas(32, 32);
  c.rect(0, 0, 32, 32, "#174a68");
  const crests: Array<[number, number, number]> = [
    [2, 3, 5],
    [18, 7, 4],
    [9, 13, 6],
    [25, 18, 5],
    [4, 23, 4],
    [15, 27, 5],
  ];
  for (const [x, y, len] of crests) {
    for (let i = 0; i < len; i++) c.set((x + i) % 32, y, "#2d7598");
    c.set((x + 1) % 32, y - 1, "#4f97b8");
    c.set((x + len - 1) % 32, y + 1, "#123c56");
  }
  for (const [x, y] of [
    [12, 4],
    [28, 11],
    [21, 22],
    [7, 30],
  ])
    c.set(x, y, "#6fb3cf");
  return c;
}

/** Foam strip along the waterline (16×6, tiles horizontally). */
export function drawFoam(): Canvas {
  const c = new Canvas(16, 6);
  for (let x = 0; x < 16; x++) {
    c.set(x, 0, "#cfe8efcc");
    if (x % 3 !== 1) c.set(x, 1, "#cfe8ef99");
    if (x % 5 === 0 || x % 7 === 2) c.set(x, 2, "#cfe8ef66");
    if (x % 6 === 3) c.set(x, 4, "#cfe8ef44");
  }
  return c;
}
