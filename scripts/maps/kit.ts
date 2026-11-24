/**
 * Shared vocabulary for the map layouts in this folder. Each map is drawn as
 * two character grids: `floor` (the ground layer) and `obj` (furniture and
 * props on the decor-below layer, always blocking).
 *
 * `floor` chars:
 *   walkable:  .  deck   :  deck in shadow   =  bridge   ;  bridge in shadow
 *              s  stairs  g  gangway  p  pier  r  rug  x  hatch grate
 *              f  cabin floor  F  cabin floor in shadow  m  marble  M  marble in shadow
 *              c  carpet runner  t  stone tiles  n  night deck  N  night deck in shadow
 *              S  carpeted stairs
 *   blocking:  -  _  [  ]  rails (N, S, W, E)   1 2 3 4  rail corners (NW NE SW SE)
 *              \  /  bow rails   I  inner rail   h  hull   o  hull porthole   ~  ocean or void
 *              #  wall top   |  wall face   O  wall with porthole   A  wall with painting
 *              Z  dark wall face   w  water (pool)   ^ < > v  pool edges (N W E S)
 *              {  }  pool corners (NW NE)
 * `obj` chars:
 *   B barrel  C crate  M mast  L lantern  R rope  H ship wheel  T table  b bench
 *   P telescope  K cabin roof  W wall  w wall with window  D door
 *   Q pillar  E bed head  e bed foot  k desk  Y bookshelf  X chest  J open chest
 *   V potted plant  s sofa  G cannon  h hammock  l sun lounger  u table with umbrella
 *   O lifebuoy  c candles  m chart table
 * Masts, lanterns, pillars and umbrellas also get tiles on the decor-above
 * layer (drawn over players).
 */
import { T } from "../art/tiles.ts";

export type Direction = "up" | "down" | "left" | "right";
export type AreaRect = { name: string; x: number; y: number; w: number; h: number };
export type AboveTile = keyof typeof T;

export type MapDef = {
  id: string;
  /** Bump when the walkable layout changes, so saved positions fall back to spawn. */
  version: number;
  /** Shown in the location picker and as the arrival title. */
  name: string;
  width: number;
  height: number;
  /** Open to the sky: the animated ocean shows around the hull. */
  outdoor: boolean;
  /** Night-time tint over the whole scene. */
  dark: boolean;
  /** Only the player is shown here (their own cabin). */
  private: boolean;
  /** Colour behind the map where there is no tile (interiors). */
  background: string;
  /** Foam strip where the hull meets the water, in tiles. */
  foam: { x: number; y: number; w: number } | null;
  floor: string[][];
  obj: string[][];
  /** Tiles drawn above characters: [x, y, tileName]. */
  above: Array<[number, number, AboveTile]>;
  /** In priority order: the first rect containing the player names the area. Tile units. */
  areas: AreaRect[];
  /** Spawn point in pixels (feet position) and facing. */
  spawn: { x: number; y: number; direction: Direction };
};

export const WALKABLE_FLOOR = new Set([".", ":", "=", ";", "s", "g", "p", "r", "x", "f", "F", "m", "M", "c", "t", "n", "N", "S"]);

export const FLOOR_TILES: Record<string, number> = {
  ".": T.DECK,
  ":": T.DECK_SHADOW,
  "=": T.BRIDGE,
  ";": T.BRIDGE_SHADOW,
  s: T.STAIRS,
  g: T.GANGWAY,
  p: T.PIER,
  r: T.RUG,
  x: T.HATCH,
  f: T.FLOOR_IN,
  F: T.FLOOR_IN_SHADOW,
  m: T.MARBLE,
  M: T.MARBLE_SHADOW,
  c: T.CARPET,
  t: T.STONE,
  n: T.NIGHT_DECK,
  N: T.NIGHT_DECK_SHADOW,
  S: T.STAIRS_IN,
  "-": T.RAIL_N,
  _: T.RAIL_S,
  "[": T.RAIL_W,
  "]": T.RAIL_E,
  "1": T.RAIL_NW,
  "2": T.RAIL_NE,
  "3": T.RAIL_SW,
  "4": T.RAIL_SE,
  "\\": T.RAIL_DIAG_UP,
  "/": T.RAIL_DIAG_DOWN,
  I: T.RAIL_INNER,
  h: T.HULL,
  o: T.HULL_PORT,
  "#": T.WALL_CAP,
  "|": T.WALL_PANEL,
  O: T.WALL_PORTHOLE,
  A: T.WALL_PAINTING,
  Z: T.WALL_DARK,
  w: T.WATER,
  "^": T.WATER_N,
  "<": T.WATER_W,
  ">": T.WATER_E,
  v: T.WATER_S,
  "{": T.WATER_NW,
  "}": T.WATER_NE,
};

export const OBJECT_TILES: Record<string, number> = {
  B: T.BARREL,
  C: T.CRATE,
  M: T.MAST_BASE,
  L: T.LANTERN_BASE,
  R: T.ROPE,
  H: T.WHEEL,
  T: T.TABLE,
  b: T.BENCH,
  P: T.TELESCOPE,
  K: T.ROOF,
  W: T.WALL,
  w: T.WALL_WINDOW,
  D: T.DOOR,
  Q: T.PILLAR,
  E: T.BED_HEAD,
  e: T.BED_FOOT,
  k: T.DESK,
  Y: T.BOOKSHELF,
  X: T.CHEST,
  J: T.CHEST_OPEN,
  V: T.PLANT,
  s: T.SOFA,
  G: T.CANNON,
  h: T.HAMMOCK,
  l: T.LOUNGER,
  u: T.TABLE,
  O: T.LIFEBUOY,
  c: T.CANDLE,
  m: T.MAP_TABLE,
};

/** Drawing helpers over a pair of grids. */
export function canvas(width: number, height: number, fillCh = "~") {
  const floor = Array.from({ length: height }, () => Array<string>(width).fill(fillCh));
  const obj = Array.from({ length: height }, () => Array<string>(width).fill(""));
  const above: MapDef["above"] = [];
  const fill = (g: string[][], x: number, y: number, w: number, h: number, ch: string) => {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) g[yy][xx] = ch;
  };
  const put = (x: number, y: number, ch: string) => {
    if (!(ch in OBJECT_TILES)) throw new Error(`Unknown object "${ch}"`);
    obj[y][x] = ch;
  };
  /** Adds the decor-above tiles that tall objects need (masts, lanterns, pillars, umbrellas). */
  const finishAbove = () => {
    for (let y = 0; y < height; y++)
      for (let x = 0; x < width; x++) {
        const o = obj[y][x];
        if (o === "M") {
          above.push([x, y - 1, "MAST_POLE"], [x, y - 2, "MAST_POLE"]);
          above.push([x - 1, y - 3, "YARD_L"], [x, y - 3, "YARD_M"], [x + 1, y - 3, "YARD_R"]);
          above.push([x, y - 4, "MAST_TOP"], [x, y - 5, "FLAG_A"]);
        }
        if (o === "L") above.push([x, y - 1, "LANTERN_TOP_A"]);
        if (o === "Q") above.push([x, y - 1, "PILLAR_TOP"]);
        if (o === "u") above.push([x, y - 1, "UMBRELLA"]);
      }
  };
  return { floor, obj, above, fill, put, finishAbove };
}

/**
 * An enclosed room: a wall top all round, a wall face along the north side
 * (row 1) and floor inside, with a shadow row under the north wall.
 */
export function walls(
  g: ReturnType<typeof canvas>,
  x: number,
  y: number,
  w: number,
  h: number,
  floorCh: string,
  shadowCh: string,
  face = "|",
) {
  g.fill(g.floor, x, y, w, h, "#");
  g.fill(g.floor, x + 1, y + 1, w - 2, 1, face);
  g.fill(g.floor, x + 1, y + 2, w - 2, h - 3, floorCh);
  g.fill(g.floor, x + 1, y + 2, w - 2, 1, shadowCh);
}

/** An open-air deck: rails all round, hull below the south rail. */
export function railedDeck(g: ReturnType<typeof canvas>, x: number, y: number, w: number, h: number, floorCh: string, shadowCh: string) {
  g.fill(g.floor, x + 1, y + 1, w - 2, h - 2, floorCh);
  g.fill(g.floor, x + 1, y + 1, w - 2, 1, shadowCh);
  g.floor[y][x] = "1";
  g.fill(g.floor, x + 1, y, w - 2, 1, "-");
  g.floor[y][x + w - 1] = "2";
  g.fill(g.floor, x, y + 1, 1, h - 2, "[");
  g.fill(g.floor, x + w - 1, y + 1, 1, h - 2, "]");
  g.floor[y + h - 1][x] = "3";
  g.fill(g.floor, x + 1, y + h - 1, w - 2, 1, "_");
  g.floor[y + h - 1][x + w - 1] = "4";
  g.fill(g.floor, x, y + h, w, 2, "h");
  for (let px = x + 3; px < x + w - 2; px += 6) g.floor[y + h][px] = "o";
}

/** Feet position in pixels for a tile. */
export const at = (tx: number, ty: number) => ({ x: tx * 16 + 8, y: ty * 16 + 12 });

export function isWalkableCell(map: Pick<MapDef, "floor" | "obj">, x: number, y: number): boolean {
  return WALKABLE_FLOOR.has(map.floor[y][x]) && map.obj[y][x] === "";
}

export function toAscii(map: Pick<MapDef, "floor" | "obj">): string {
  return map.floor.map((row, y) => row.map((ch, x) => map.obj[y][x] || ch).join("")).join("\n");
}
