/**
 * Source layout for the ship map (48×28 tiles of 16 px). The bow points right.
 *
 * `floor` chars (deck layer):
 *   walkable:  .  deck   :  deck in shadow   =  bridge   ;  bridge in shadow
 *              s  stairs  g  gangway  p  pier  r  rug  x  hatch grate
 *   blocking:  -  _  [  ]  rails (N, S, W, E)   1 2 3 4  rail corners (NW NE SW SE)
 *              \  /  bow rails   I  inner rail   h  hull   o  hull porthole   ~  ocean
 * `obj` chars (decor-below layer, always blocking):
 *   B barrel  C crate  M mast  L lantern  R rope  H ship wheel  T table  b bench
 *   P telescope  K cabin roof  W wall  w wall with window  D door
 * Masts and lanterns also get tiles on the decor-above layer (drawn over players).
 *
 * Run `npm run build:assets` after editing to regenerate the Tiled map,
 * walkable.json and the placeholder art.
 */
export const MAP_ID = "ship-main";
/** Bump when the walkable layout changes, so saved positions fall back to spawn. */
export const MAP_VERSION = 1;
export const MAP_W = 48;
export const MAP_H = 28;

export const WALKABLE_FLOOR = new Set([".", ":", "=", ";", "s", "g", "p", "r", "x"]);

export type AreaRect = { name: string; x: number; y: number; w: number; h: number };

export type Layout = {
  floor: string[][];
  obj: string[][];
  /** Tiles drawn above characters: [x, y, tileName]. */
  above: Array<[number, number, "MAST_POLE" | "YARD_L" | "YARD_M" | "YARD_R" | "MAST_TOP" | "FLAG_A" | "LANTERN_TOP_A"]>;
  /** In priority order: the first rect containing the player names the area. Tile units. */
  areas: AreaRect[];
  /** Spawn point in pixels (feet position) and facing. */
  spawn: { x: number; y: number; direction: "up" };
};

export function buildLayout(): Layout {
  const floor = Array.from({ length: MAP_H }, () => Array<string>(MAP_W).fill("~"));
  const obj = Array.from({ length: MAP_H }, () => Array<string>(MAP_W).fill(""));
  const above: Layout["above"] = [];

  const fill = (g: string[][], x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = ch;
  };
  const put = (x: number, y: number, ch: string) => {
    obj[y][x] = ch;
  };

  // --- Hull and main deck -------------------------------------------------
  fill(floor, 4, 4, 33, 15, ".");
  // Bow: a 45° taper to a tip at row 11.
  for (let k = 1; k <= 7; k++) {
    const y = 3 + k;
    fill(floor, 37, y, k - 1, 1, ".");
    floor[y][36 + k] = "\\";
  }
  fill(floor, 37, 11, 7, 1, ".");
  floor[11][44] = "]";
  for (let k = 1; k <= 7; k++) {
    const y = 11 + k;
    const edge = 44 - k;
    fill(floor, 37, y, edge - 37, 1, ".");
    floor[y][edge] = "/";
  }
  // Rails.
  floor[3][3] = "1";
  fill(floor, 4, 3, 33, 1, "-");
  fill(floor, 3, 4, 1, 15, "[");
  floor[19][3] = "3";
  fill(floor, 4, 19, 33, 1, "_");
  // Hull face below the south rail, with portholes.
  fill(floor, 3, 20, 34, 2, "h");
  for (const x of [6, 10, 20, 26, 32]) floor[20][x] = "o";
  // Shadow cast by the north rail.
  fill(floor, 12, 4, 33 - 8, 1, ":");

  // --- 3. Captain's bridge (raised stern deck) -----------------------------
  fill(floor, 4, 4, 7, 15, "=");
  fill(floor, 4, 4, 7, 1, ";");
  fill(floor, 11, 4, 1, 15, "I");
  fill(floor, 11, 7, 1, 2, "s");
  fill(floor, 11, 14, 1, 2, "s");
  put(7, 11, "H");
  put(9, 5, "L");
  put(9, 17, "L");
  put(5, 9, "B");
  put(5, 13, "B");

  // --- 6. Decorative cabin entrance ---------------------------------------
  fill(obj, 14, 4, 7, 3, "K");
  ["W", "w", "W", "D", "W", "w", "W"].forEach((ch, i) => put(14 + i, 7, ch));
  fill(floor, 14, 8, 7, 1, ":");
  put(15, 8, "L");
  put(19, 8, "L");

  // --- 2. Main deck --------------------------------------------------------
  put(26, 11, "M");
  put(27, 12, "R");
  put(33, 9, "M");
  put(32, 10, "R");
  fill(floor, 20, 12, 2, 2, "x");
  put(12, 4, "C");
  put(12, 5, "B");
  put(28, 4, "B");
  put(29, 4, "B");
  put(30, 4, "C");
  put(28, 5, "C");
  put(22, 18, "B");
  put(23, 18, "C");
  put(24, 18, "B");
  put(23, 17, "C");

  // --- 1. Boarding area: gangway down to a pier ----------------------------
  put(13, 18, "L");
  put(16, 18, "L");
  fill(floor, 14, 19, 2, 4, "g");
  fill(floor, 13, 20, 1, 3, "[");
  fill(floor, 16, 20, 1, 3, "]");
  floor[23][8] = "1";
  fill(floor, 9, 23, 5, 1, "-");
  fill(floor, 14, 23, 2, 1, "p");
  fill(floor, 16, 23, 5, 1, "-");
  floor[23][21] = "2";
  fill(floor, 9, 24, 12, 3, "p");
  fill(floor, 8, 24, 1, 3, "[");
  fill(floor, 21, 24, 1, 3, "]");
  floor[27][8] = "3";
  fill(floor, 9, 27, 12, 1, "_");
  floor[27][21] = "4";
  put(10, 24, "B");
  put(10, 25, "C");
  put(19, 24, "B");
  put(18, 26, "R");

  // --- 5. Lounge -----------------------------------------------------------
  fill(floor, 30, 14, 6, 4, "r");
  put(30, 15, "b");
  put(31, 15, "T");
  put(32, 15, "b");
  put(33, 16, "b");
  put(34, 16, "T");
  put(35, 16, "b");
  put(36, 13, "L");
  put(29, 17, "L");

  // --- 4. Observation deck (bow) -------------------------------------------
  put(41, 11, "P");
  put(39, 8, "b");
  put(39, 14, "b");
  put(37, 7, "L");

  // --- Tiles drawn above characters ----------------------------------------
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (obj[y][x] === "M") {
        above.push([x, y - 1, "MAST_POLE"], [x, y - 2, "MAST_POLE"]);
        above.push([x - 1, y - 3, "YARD_L"], [x, y - 3, "YARD_M"], [x + 1, y - 3, "YARD_R"]);
        above.push([x, y - 4, "MAST_TOP"], [x, y - 5, "FLAG_A"]);
      }
      if (obj[y][x] === "L") above.push([x, y - 1, "LANTERN_TOP_A"]);
    }

  const areas: AreaRect[] = [
    { name: "Cabin entrance", x: 15, y: 8, w: 5, h: 2 },
    { name: "Boarding area", x: 12, y: 15, w: 10, h: 13 },
    { name: "Captain's bridge", x: 4, y: 4, w: 8, h: 15 },
    { name: "Lounge", x: 29, y: 13, w: 8, h: 6 },
    { name: "Observation deck", x: 37, y: 4, w: 8, h: 15 },
    { name: "Main deck", x: 12, y: 4, w: 25, h: 15 },
  ];

  return { floor, obj, above, areas, spawn: { x: 15 * 16, y: 17 * 16 + 12, direction: "up" } };
}

export function isWalkableCell(layout: Layout, x: number, y: number): boolean {
  return WALKABLE_FLOOR.has(layout.floor[y][x]) && layout.obj[y][x] === "";
}

export function toAscii(layout: Layout): string {
  return layout.floor.map((row, y) => row.map((ch, x) => layout.obj[y][x] || ch).join("")).join("\n");
}
