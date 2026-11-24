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
  // --- Interiors and the other decks (Milestone 6) ---
  FLOOR_IN: 46,
  FLOOR_IN_SHADOW: 47,
  MARBLE: 48,
  MARBLE_SHADOW: 49,
  CARPET: 50,
  STONE: 51,
  NIGHT_DECK: 52,
  NIGHT_DECK_SHADOW: 53,
  WALL_PANEL: 54,
  WALL_PORTHOLE: 55,
  WALL_CAP: 56,
  WATER: 57,
  WATER_N: 58,
  WATER_W: 59,
  WATER_E: 60,
  WATER_NW: 61,
  WATER_NE: 62,
  PILLAR: 63,
  PILLAR_TOP: 64,
  CHANDELIER_A: 65,
  CHANDELIER_B: 66,
  BED_HEAD: 67,
  BED_FOOT: 68,
  DESK: 69,
  BOOKSHELF: 70,
  CHEST: 71,
  PLANT: 72,
  SOFA: 73,
  CANNON: 74,
  HAMMOCK: 75,
  LOUNGER: 76,
  UMBRELLA: 77,
  LIFEBUOY: 78,
  CANDLE: 79,
  MAP_TABLE: 80,
  WALL_PAINTING: 81,
  STAIRS_IN: 82,
  WATER_S: 83,
  WALL_DARK: 84,
  CHEST_OPEN: 85,
} as const;

export const TILESET_COLUMNS = 8;
export const TILESET_ROWS = 11;
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
  barrelDark: "#74472a",
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
  nail: "#5a3a22",
  glowHalo: "#ffd36b33",
  glowHaloHot: "#ffd36b55",
  collision: "#ff00ff80",
  // Interiors.
  floorIn: "#7a4a2c",
  floorInLight: "#8e5a37",
  floorInDark: "#633a22",
  floorInSeam: "#45271a",
  marble: "#e9e2d3",
  marbleDark: "#cfc4ae",
  marbleVein: "#b9ab92",
  marbleGold: "#c9a24b",
  carpet: "#9c2f3a",
  carpetLight: "#b7404b",
  carpetDark: "#741f29",
  stone: "#d6d0c2",
  stoneLight: "#e8e3d8",
  stoneDark: "#aea795",
  night: "#4a3a3e",
  nightLight: "#5a4848",
  nightDark: "#382b30",
  nightSeam: "#241a20",
  panel: "#5a3420",
  panelLight: "#764528",
  panelDark: "#3e2214",
  wainscot: "#8a5a32",
  cap: "#2b1a12",
  capLight: "#4a2e1e",
  water: "#3aa7c9",
  waterLight: "#6cc8e2",
  waterDark: "#2785a6",
  waterDeep: "#1f6d8c",
  sparkle: "#e6f8ff",
  pillar: "#e6dcc6",
  pillarShade: "#bfb193",
  linen: "#efe9dc",
  linenShade: "#cdc4b0",
  blanket: "#2f6f8f",
  blanketLight: "#4389ab",
  book1: "#a33a2f",
  book2: "#2f6a4f",
  book3: "#3a4f8f",
  book4: "#c9a24b",
  leaf: "#3f8a3a",
  leafLight: "#5fae4f",
  leafDark: "#2b6128",
  pot: "#a5552f",
  sofa: "#8e2f3d",
  sofaLight: "#ab4553",
  cannon: "#2e2f36",
  cannonLight: "#565866",
  canvas: "#e7dcc0",
  canvasShade: "#c4b48e",
  stripeA: "#e9e2d3",
  stripeB: "#c8443a",
  buoy: "#e9e2d3",
  buoyRed: "#c8443a",
  gold: "#f0c75a",
  gem: "#5fd3c4",
  parchment: "#e8d7a8",
  parchmentDark: "#bfa36a",
  frame: "#c9a24b",
  paint: "#3d6f8e",
  paintLight: "#86b6c8",
};

function planks(c: Cell, base: Color, light: Color, dark: Color, seam: Color, variant = 0): void {
  // Horizontal planks, 4 px tall: a light top edge, a seam below, staggered
  // butt joints with nail heads, and a little grain so the deck isn't flat.
  const tones = [base, light, base, dark];
  for (let row = 0; row < 4; row++) {
    const y = row * 4;
    const tone = tones[(row + variant) % 4] === light ? base : tones[(row + variant) % 4];
    c.rect(0, y, 16, 3, tone);
    c.rect(0, y, 16, 1, light);
    c.rect(0, y + 3, 16, 1, seam);
    const seamX = (row * 7 + variant * 5 + 3) % 16;
    c.rect(seamX, y, 1, 3, seam);
    if (row % 2 === 0) c.set((seamX + 1) % 16, y + 1, P.nail);
    // Grain: short darker streaks.
    const g = (row * 5 + variant * 3 + 9) % 16;
    c.rect(g, y + 2, 3, 1, dark);
    c.set((g + 7) % 16, y + 1, dark);
  }
  if (variant === 1) {
    c.set(5, 6, seam); // knot
    c.set(6, 6, dark);
    c.set(5, 5, dark);
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
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.abs(x - 7.5) + Math.abs(y - 7.5);
          if (Math.round(d) === 5) c.set(x, y, P.rugBorder);
          else if (Math.round(d) === 2) c.set(x, y, P.rugLight);
        }
      c.rect(0, 0, 16, 1, P.rugLight);
      c.rect(0, 15, 16, 1, "#6e2c36");
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
      c.rect(4, 1, 8, 14, P.outline);
      c.rect(3, 2, 10, 12, P.outline);
      c.rect(2, 4, 12, 8, P.outline);
      c.rect(4, 2, 8, 12, P.barrel);
      c.rect(3, 4, 10, 8, P.barrel);
      for (const x of [5, 8, 11]) c.rect(x, 3, 1, 10, P.barrelDark);
      c.rect(4, 3, 1, 10, P.barrelLight);
      c.rect(6, 4, 1, 8, P.barrelLight);
      c.rect(3, 5, 10, 1, P.iron);
      c.rect(3, 10, 10, 1, P.iron);
      c.rect(4, 5, 2, 1, P.ironLight);
      c.rect(4, 10, 2, 1, P.ironLight);
      c.rect(5, 1, 6, 2, P.barrelLight); // lid
      c.rect(6, 1, 4, 1, P.crateLight);
      return;
    case T.CRATE:
      shade(c, 1, 13, 14, 3);
      c.rect(1, 1, 14, 14, P.outline);
      c.rect(2, 2, 12, 12, P.crate);
      for (let y = 5; y < 14; y += 4) c.rect(2, y, 12, 1, P.crateDark);
      c.rect(2, 2, 12, 1, P.crateLight);
      c.rect(2, 2, 2, 12, P.crateDark);
      c.rect(12, 2, 2, 12, P.crateDark);
      c.rect(2, 2, 1, 12, P.crateLight);
      for (let i = 0; i < 8; i++) {
        c.set(4 + i, 3 + i + 2, P.crateLight);
        c.set(4 + i, 2 + i + 2, P.crateDark);
      }
      c.set(3, 3, P.nail);
      c.set(12, 3, P.nail);
      c.set(3, 12, P.nail);
      c.set(12, 12, P.nail);
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
      // Soft glow halo first, then the lantern on top.
      for (let y = 1; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 7.5, y - 8.5);
          if (d < (hot ? 7.5 : 6.5)) c.set(x, y, d < 4.5 ? P.glowHaloHot : P.glowHalo);
        }
      c.rect(7, 12, 2, 4, P.lanternPost);
      c.rect(5, 5, 6, 8, P.outline);
      c.rect(6, 6, 4, 6, hot ? P.glow : P.glowDim);
      c.rect(7, 7, 2, 3, hot ? P.glowHot : P.glow);
      c.rect(4, 4, 8, 2, P.outline);
      c.rect(5, 4, 6, 1, P.brassDark);
      c.rect(7, 2, 2, 2, P.outline);
      c.rect(5, 12, 6, 1, P.outline);
      return;
    }

    // --- Interiors and the other decks -------------------------------------
    case T.FLOOR_IN:
      return planks(c, P.floorIn, P.floorInLight, P.floorInDark, P.floorInSeam, 2);
    case T.FLOOR_IN_SHADOW:
      planks(c, P.floorIn, P.floorInLight, P.floorInDark, P.floorInSeam, 2);
      return shade(c, 0, 0, 16, 5);
    case T.MARBLE:
    case T.MARBLE_SHADOW: {
      // Big checker tiles with a fine vein and gold grout.
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) c.set(x, y, (x < 8) === (y < 8) ? P.marble : P.marbleDark);
      c.rect(0, 0, 16, 1, P.marbleGold);
      c.rect(0, 0, 1, 16, P.marbleGold);
      c.rect(0, 8, 16, 1, P.marbleVein);
      c.rect(8, 0, 1, 16, P.marbleVein);
      for (let i = 0; i < 5; i++) c.set(2 + i, 3 + (i >> 1), P.marbleVein);
      for (let i = 0; i < 4; i++) c.set(10 + i, 12 - (i >> 1), P.marbleVein);
      if (id === T.MARBLE_SHADOW) shade(c, 0, 0, 16, 5);
      return;
    }
    case T.CARPET:
      c.rect(0, 0, 16, 16, P.carpet);
      c.rect(0, 0, 2, 16, P.marbleGold);
      c.rect(14, 0, 2, 16, P.marbleGold);
      c.rect(2, 0, 1, 16, P.carpetDark);
      c.rect(13, 0, 1, 16, P.carpetDark);
      for (let y = 0; y < 16; y += 8) {
        c.rect(7, y + 2, 2, 4, P.carpetLight);
        c.rect(6, y + 3, 4, 2, P.carpetLight);
        c.set(7, y + 3, P.marbleGold);
      }
      return;
    case T.STONE:
      c.rect(0, 0, 16, 16, P.stone);
      c.rect(0, 0, 16, 1, P.stoneLight);
      c.rect(0, 0, 1, 16, P.stoneLight);
      c.rect(0, 7, 16, 1, P.stoneDark);
      c.rect(7, 0, 1, 8, P.stoneDark);
      c.rect(12, 8, 1, 8, P.stoneDark);
      c.rect(0, 15, 16, 1, P.stoneDark);
      c.set(3, 11, P.stoneDark);
      c.set(10, 3, P.stoneDark);
      return;
    case T.NIGHT_DECK:
      return planks(c, P.night, P.nightLight, P.nightDark, P.nightSeam, 3);
    case T.NIGHT_DECK_SHADOW:
      planks(c, P.night, P.nightLight, P.nightDark, P.nightSeam, 3);
      return shade(c, 0, 0, 16, 5);
    case T.WALL_PANEL:
    case T.WALL_PORTHOLE:
    case T.WALL_PAINTING:
    case T.WALL_DARK: {
      // The north wall seen face-on: dark panelling above a lighter wainscot.
      const dark = id === T.WALL_DARK;
      c.rect(0, 0, 16, 16, dark ? P.nightDark : P.panel);
      for (let x = 0; x < 16; x += 8) {
        c.rect(x + 1, 1, 6, 8, dark ? P.night : P.panelLight);
        c.rect(x + 1, 8, 6, 1, dark ? P.nightSeam : P.panelDark);
      }
      c.rect(0, 10, 16, 1, P.marbleGold);
      c.rect(0, 11, 16, 4, dark ? P.nightLight : P.wainscot);
      for (let x = 3; x < 16; x += 4) c.rect(x, 11, 1, 4, dark ? P.nightSeam : P.panelDark);
      c.rect(0, 15, 16, 1, P.cap);
      if (id === T.WALL_PORTHOLE) {
        c.rect(4, 1, 8, 8, P.brassDark);
        c.rect(5, 1, 6, 8, P.brass);
        c.rect(4, 2, 8, 6, P.brass);
        c.rect(5, 2, 6, 6, P.glass);
        c.rect(6, 3, 2, 2, "#cfe8ef");
      }
      if (id === T.WALL_PAINTING) {
        c.rect(2, 1, 12, 9, P.frame);
        c.rect(3, 2, 10, 7, P.paint);
        c.rect(3, 6, 10, 3, P.water);
        c.rect(7, 3, 1, 4, P.outline); // a tiny ship on the sea
        c.rect(5, 5, 5, 1, P.sail);
        c.rect(6, 7, 4, 1, P.hull);
        c.rect(3, 2, 10, 1, P.paintLight);
      }
      return;
    }
    case T.WALL_CAP:
      c.rect(0, 0, 16, 16, P.cap);
      c.rect(0, 0, 16, 2, P.capLight);
      c.rect(0, 7, 16, 1, P.capLight);
      c.rect(0, 15, 16, 1, "#140c08");
      return;
    case T.WATER:
    case T.WATER_N:
    case T.WATER_W:
    case T.WATER_E:
    case T.WATER_NW:
    case T.WATER_NE:
    case T.WATER_S: {
      c.rect(0, 0, 16, 16, P.water);
      for (const [x, y, w] of [[2, 3, 4], [9, 7, 5], [4, 12, 3], [12, 13, 3]] as const) {
        c.rect(x, y, w, 1, P.waterLight);
        c.rect(x + 1, y + 1, w - 1, 1, P.waterDark);
      }
      c.set(7, 2, P.sparkle);
      c.set(13, 10, P.sparkle);
      const north = id === T.WATER_N || id === T.WATER_NW || id === T.WATER_NE;
      const west = id === T.WATER_W || id === T.WATER_NW;
      const east = id === T.WATER_E || id === T.WATER_NE;
      // The pool's tiled inner wall, seen from above.
      if (north) {
        c.rect(0, 0, 16, 4, P.waterDeep);
        c.rect(0, 0, 16, 2, P.stoneLight);
        c.rect(0, 2, 16, 1, P.stoneDark);
      }
      if (west) {
        c.rect(0, 0, 2, 16, P.stoneLight);
        c.rect(2, 0, 1, 16, P.waterDeep);
      }
      if (east) {
        c.rect(14, 0, 2, 16, P.stoneLight);
        c.rect(13, 0, 1, 16, P.waterDeep);
      }
      if (id === T.WATER_S) {
        c.rect(0, 14, 16, 2, P.stoneLight);
        c.rect(0, 13, 16, 1, P.waterDeep);
      }
      return;
    }
    case T.PILLAR:
      shade(c, 2, 13, 13, 3);
      c.rect(3, 0, 10, 16, P.outline);
      c.rect(4, 0, 8, 14, P.pillar);
      c.rect(9, 0, 3, 14, P.pillarShade);
      c.rect(5, 0, 1, 14, "#fffaf0");
      c.rect(2, 12, 12, 4, P.outline);
      c.rect(3, 12, 10, 3, P.pillarShade);
      c.rect(3, 12, 10, 1, P.pillar);
      return;
    case T.PILLAR_TOP:
      c.rect(3, 4, 10, 12, P.outline);
      c.rect(4, 5, 8, 11, P.pillar);
      c.rect(9, 5, 3, 11, P.pillarShade);
      c.rect(5, 5, 1, 11, "#fffaf0");
      c.rect(1, 1, 14, 4, P.outline);
      c.rect(2, 2, 12, 2, P.marbleGold);
      c.rect(2, 2, 12, 1, P.gold);
      return;
    case T.CHANDELIER_A:
    case T.CHANDELIER_B: {
      const hot = id === T.CHANDELIER_A;
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 7.5, y - 8);
          if (d < (hot ? 8 : 7)) c.set(x, y, d < 5 ? P.glowHaloHot : P.glowHalo);
        }
      c.rect(7, 0, 2, 5, P.brassDark);
      c.rect(3, 7, 10, 2, P.brassDark);
      c.rect(4, 7, 8, 1, P.brass);
      for (const x of [3, 7, 11]) {
        c.rect(x, 4, 2, 3, P.linen);
        c.set(x, 3, hot ? P.glowHot : P.glow);
        c.set(x + 1, 3, P.glow);
      }
      c.rect(6, 9, 4, 3, P.brass);
      c.rect(7, 12, 2, 2, P.gem);
      return;
    }
    case T.BED_HEAD:
      shade(c, 1, 0, 14, 16);
      c.rect(1, 0, 14, 16, P.outline);
      c.rect(2, 1, 12, 4, P.door);
      c.rect(2, 1, 12, 1, P.barrelLight);
      c.rect(2, 5, 12, 11, P.linen);
      c.rect(3, 6, 10, 4, "#ffffff");
      c.rect(3, 9, 10, 1, P.linenShade);
      c.rect(2, 12, 12, 4, P.blanket);
      c.rect(2, 12, 12, 1, P.blanketLight);
      return;
    case T.BED_FOOT:
      shade(c, 1, 13, 14, 3);
      c.rect(1, 0, 14, 14, P.outline);
      c.rect(2, 0, 12, 11, P.blanket);
      for (let y = 2; y < 11; y += 4) c.rect(2, y, 12, 1, P.blanketLight);
      c.rect(2, 11, 12, 2, P.door);
      return;
    case T.DESK:
      shade(c, 1, 12, 14, 3);
      c.rect(1, 3, 14, 9, P.outline);
      c.rect(2, 4, 12, 7, P.door);
      c.rect(2, 4, 12, 2, P.barrelLight);
      c.rect(2, 12, 2, 3, P.outline);
      c.rect(12, 12, 2, 3, P.outline);
      c.rect(4, 5, 5, 4, P.parchment); // an open logbook
      c.rect(6, 5, 1, 4, P.parchmentDark);
      c.rect(11, 3, 2, 3, P.outline); // ink pot and quill
      c.rect(12, 1, 1, 3, P.linen);
      return;
    case T.BOOKSHELF:
      c.rect(0, 0, 16, 16, P.outline);
      c.rect(1, 1, 14, 14, P.door);
      for (const y of [1, 8]) {
        const books = [P.book1, P.book2, P.book3, P.book4, P.book1, P.book3, P.book2];
        books.forEach((col, i) => c.rect(1 + i * 2, y + (i % 3 === 1 ? 1 : 0), 2, 6 - (i % 3 === 1 ? 1 : 0), col));
        c.rect(1, y + 6, 14, 1, P.doorDark);
      }
      return;
    case T.CHEST:
    case T.CHEST_OPEN: {
      shade(c, 1, 13, 14, 3);
      c.rect(1, 4, 14, 11, P.outline);
      c.rect(2, 8, 12, 6, P.barrel);
      c.rect(2, 8, 12, 1, P.barrelLight);
      c.rect(2, 11, 12, 1, P.brassDark);
      if (id === T.CHEST_OPEN) {
        c.rect(2, 5, 12, 3, P.gold);
        c.rect(3, 4, 3, 2, P.gold);
        c.set(5, 5, P.gem);
        c.set(10, 6, "#ffffff");
        c.rect(1, 1, 14, 4, P.outline);
        c.rect(2, 2, 12, 2, P.barrelDark);
      } else {
        c.rect(2, 5, 12, 3, P.barrelDark);
        c.rect(2, 5, 12, 1, P.barrelLight);
      }
      c.rect(7, 9, 2, 3, P.brass);
      c.rect(3, 5, 1, 9, P.brassDark);
      c.rect(12, 5, 1, 9, P.brassDark);
      return;
    }
    case T.PLANT:
      shade(c, 3, 13, 10, 3);
      c.rect(4, 10, 8, 5, P.outline);
      c.rect(5, 10, 6, 4, P.pot);
      c.rect(5, 10, 6, 1, "#c46e43");
      for (const [x, y, w, h] of [[2, 4, 4, 3], [10, 4, 4, 3], [5, 1, 6, 4], [3, 6, 10, 4]] as const) {
        c.rect(x, y, w, h, P.leafDark);
        c.rect(x + 1, y, w - 2, h - 1, P.leaf);
      }
      c.set(7, 2, P.leafLight);
      c.set(4, 5, P.leafLight);
      c.set(11, 5, P.leafLight);
      return;
    case T.SOFA:
      shade(c, 0, 13, 16, 3);
      c.rect(0, 2, 16, 12, P.outline);
      c.rect(1, 3, 14, 5, P.sofa);
      c.rect(1, 3, 14, 1, P.sofaLight);
      c.rect(1, 8, 14, 5, P.sofaLight);
      c.rect(1, 12, 14, 1, P.sofa);
      c.rect(7, 8, 1, 5, P.sofa);
      c.rect(0, 5, 2, 8, P.carpetDark);
      c.rect(14, 5, 2, 8, P.carpetDark);
      return;
    case T.CANNON:
      // Facing up, toward a gun port in the north wall.
      shade(c, 1, 12, 14, 3);
      c.rect(2, 8, 12, 6, P.outline);
      c.rect(3, 9, 10, 4, P.barrel);
      c.rect(3, 9, 10, 1, P.barrelLight);
      c.rect(2, 12, 3, 3, P.outline);
      c.rect(11, 12, 3, 3, P.outline);
      c.rect(5, 0, 6, 11, P.outline);
      c.rect(6, 0, 4, 10, P.cannon);
      c.rect(6, 0, 1, 10, P.cannonLight);
      c.rect(5, 1, 6, 1, P.cannonLight);
      return;
    case T.HAMMOCK:
      c.rect(0, 7, 16, 1, P.ropeDark);
      for (let x = 0; x < 16; x++) {
        const sag = Math.round(Math.sin((x / 15) * Math.PI) * 4);
        c.rect(x, 5 + sag, 1, 4, x % 4 === 0 ? P.canvasShade : P.canvas);
        c.set(x, 4 + sag, P.outline);
        c.set(x, 9 + sag, P.outline);
      }
      return;
    case T.LOUNGER:
      shade(c, 1, 13, 14, 3);
      c.rect(1, 1, 14, 13, P.outline);
      c.rect(2, 2, 12, 4, P.stripeA);
      c.rect(2, 6, 12, 7, P.stripeA);
      for (let x = 2; x < 14; x += 4) {
        c.rect(x, 2, 2, 4, P.stripeB);
        c.rect(x, 6, 2, 7, P.stripeB);
      }
      c.rect(2, 6, 12, 1, P.outline);
      c.rect(4, 3, 8, 2, "#ffffff");
      return;
    case T.UMBRELLA: {
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 7.5, y - 7.5);
          if (d > 7.6) continue;
          const ang = Math.atan2(y - 7.5, x - 7.5);
          const seg = Math.floor(((ang + Math.PI) / (Math.PI * 2)) * 8);
          c.set(x, y, d > 6.8 ? P.outline : seg % 2 ? P.stripeB : P.stripeA);
        }
      c.rect(7, 7, 2, 2, P.outline);
      return;
    }
    case T.LIFEBUOY:
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) {
          const d = Math.hypot(x - 7.5, y - 7.5);
          if (d > 6.8 || d < 2.6) continue;
          const q = Math.floor(((Math.atan2(y - 7.5, x - 7.5) + Math.PI) / (Math.PI * 2)) * 4);
          c.set(x, y, d > 6 || d < 3.3 ? P.outline : q % 2 ? P.buoyRed : P.buoy);
        }
      return;
    case T.CANDLE:
      shade(c, 4, 13, 8, 3);
      for (let y = 0; y < 16; y++)
        for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 5) < 5) c.set(x, y, P.glowHalo);
      c.rect(5, 12, 6, 3, P.outline);
      c.rect(6, 12, 4, 2, P.brassDark);
      for (const [x, h] of [[5, 6], [8, 8]] as const) {
        c.rect(x, 12 - h, 3, h, P.linen);
        c.rect(x + 2, 12 - h, 1, h, P.linenShade);
        c.set(x + 1, 11 - h, P.glowHot);
        c.set(x + 1, 10 - h, P.glow);
      }
      return;
    case T.MAP_TABLE:
      shade(c, 0, 13, 16, 3);
      c.rect(0, 2, 16, 11, P.outline);
      c.rect(1, 3, 14, 9, P.table);
      c.rect(2, 4, 12, 7, P.parchment);
      c.rect(2, 4, 12, 1, "#f5e8c2");
      c.rect(4, 6, 3, 2, P.parchmentDark); // islands
      c.rect(9, 8, 2, 2, P.parchmentDark);
      for (let i = 0; i < 4; i++) c.set(6 + i, 8 - (i % 2), P.flag); // the dotted route
      c.set(10, 7, P.flag);
      c.set(11, 6, P.flag);
      c.set(11, 7, P.outline);
      c.rect(0, 13, 2, 2, P.outline);
      c.rect(14, 13, 2, 2, P.outline);
      return;
    case T.STAIRS_IN:
      c.rect(0, 0, 16, 16, P.panelDark);
      for (let y = 0; y < 16; y += 4) {
        c.rect(0, y, 16, 3, y < 8 ? P.carpetDark : P.carpet);
        c.rect(0, y, 16, 1, P.carpetLight);
        c.rect(0, y + 3, 16, 1, P.outline);
      }
      c.rect(0, 0, 2, 16, P.marbleGold);
      c.rect(14, 0, 2, 16, P.marbleGold);
      return;
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
  // Gentle depth variation.
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) if ((x * 3 + y * 5) % 23 === 0) c.set(x, y, "#16445f");
  const crests: Array<[number, number, number]> = [
    [2, 3, 5],
    [18, 7, 4],
    [9, 13, 6],
    [25, 18, 5],
    [4, 23, 4],
    [15, 27, 5],
    [28, 1, 3],
    [12, 20, 3],
  ];
  for (const [x, y, len] of crests) {
    for (let i = 0; i < len; i++) c.set((x + i) % 32, y, "#2d7598");
    c.set((x + 1) % 32, y - 1, "#4f97b8");
    c.set((x + 2) % 32, y - 1, "#4f97b8");
    c.set((x + len - 1) % 32, y + 1, "#123c56");
    c.set((x + len) % 32, y + 1, "#123c56");
  }
  for (const [x, y] of [
    [12, 4],
    [28, 11],
    [21, 22],
    [7, 30],
    [3, 16],
  ])
    c.set(x, y, "#9fd3e6");
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
