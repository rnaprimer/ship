/**
 * Generates the placeholder art and the ship map.
 *
 *   node scripts/build-ship-assets.ts   (or: npm run build:assets)
 *
 * Outputs:
 *   public/game/ship-tiles.png      16×16 tileset
 *   public/game/ocean.png, foam.png animated water textures
 *   public/game/characters.png      16×24 character frames, 6 variants
 *   public/game/ship-font.png/.xml  bitmap font for username labels
 *   public/game/ship.json           Tiled map (open it in Tiled to edit by hand)
 *   src/game/maps/walkable.json     walkability grid, shared with the server (Milestone 2)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./lib/png.ts";
import { Canvas } from "./lib/canvas.ts";
import { T, TILE, TILESET_COLUMNS, TILESET_ROWS, drawFoam, drawOcean, drawTileset } from "./art/tiles.ts";
import { drawCharacters } from "./art/characters.ts";
import { buildFont } from "./art/font.ts";
import { MAP_H, MAP_ID, MAP_VERSION, MAP_W, buildLayout, isWalkableCell, toAscii } from "./ship-layout.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public", "game");
const mapsDir = join(root, "src", "game", "maps");
mkdirSync(publicDir, { recursive: true });
mkdirSync(mapsDir, { recursive: true });

const writePng = (name: string, c: Canvas) => writeFileSync(join(publicDir, name), encodePng(c.width, c.height, c.data));

// --- Art -------------------------------------------------------------------
const tilesetCanvas = drawTileset();
writePng("ship-tiles.png", tilesetCanvas);
writePng("ocean.png", drawOcean());
writePng("foam.png", drawFoam());
const charactersCanvas = drawCharacters();
writePng("characters.png", charactersCanvas);
const font = buildFont("ship-font.png");
writePng("ship-font.png", font.canvas);
writeFileSync(join(publicDir, "ship-font.xml"), font.xml);

// --- Map -------------------------------------------------------------------
const layout = buildLayout();
const gid = (id: number) => id + 1;

const FLOOR_TILES: Record<string, number> = {
  ".": T.DECK,
  ":": T.DECK_SHADOW,
  "=": T.BRIDGE,
  ";": T.BRIDGE_SHADOW,
  s: T.STAIRS,
  g: T.GANGWAY,
  p: T.PIER,
  r: T.RUG,
  x: T.HATCH,
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
};

const OBJECT_TILES: Record<string, number> = {
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
};

const deck: number[] = [];
const decorBelow: number[] = [];
const decorAbove: number[] = new Array(MAP_W * MAP_H).fill(0);
const collision: number[] = [];
const walkableRows: string[] = [];

for (let y = 0; y < MAP_H; y++) {
  let row = "";
  for (let x = 0; x < MAP_W; x++) {
    const f = layout.floor[y][x];
    if (f === "~") deck.push(0);
    else {
      const id = FLOOR_TILES[f];
      if (id === undefined) throw new Error(`Unknown floor char "${f}" at ${x},${y}`);
      // Sprinkle the knotted plank variant for texture.
      deck.push(gid(id === T.DECK && (x * 7 + y * 13) % 11 === 0 ? T.DECK_B : id));
    }
    const o = layout.obj[y][x];
    if (o === "") decorBelow.push(0);
    else {
      const id = OBJECT_TILES[o];
      if (id === undefined) throw new Error(`Unknown object char "${o}" at ${x},${y}`);
      decorBelow.push(gid(id));
    }
    const walkable = isWalkableCell(layout, x, y);
    collision.push(walkable ? 0 : gid(T.COLLISION));
    row += walkable ? "1" : "0";
  }
  walkableRows.push(row);
}
for (const [x, y, name] of layout.above) decorAbove[y * MAP_W + x] = gid(T[name]);

const tileLayer = (id: number, name: string, data: number[], visible = true) => ({
  id,
  name,
  type: "tilelayer",
  width: MAP_W,
  height: MAP_H,
  x: 0,
  y: 0,
  opacity: 1,
  visible,
  data,
});

let nextObjectId = 1;
const tiledMap = {
  type: "map",
  version: "1.10",
  tiledversion: "1.11.0",
  orientation: "orthogonal",
  renderorder: "right-down",
  infinite: false,
  width: MAP_W,
  height: MAP_H,
  tilewidth: TILE,
  tileheight: TILE,
  compressionlevel: -1,
  properties: [
    { name: "mapId", type: "string", value: MAP_ID },
    { name: "mapVersion", type: "int", value: MAP_VERSION },
  ],
  layers: [
    tileLayer(1, "deck", deck),
    tileLayer(2, "decor-below", decorBelow),
    tileLayer(3, "decor-above", decorAbove),
    tileLayer(4, "collision", collision, false),
    {
      id: 5,
      name: "areas",
      type: "objectgroup",
      draworder: "index",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects: layout.areas.map((a) => ({
        id: nextObjectId++,
        name: a.name,
        type: "area",
        x: a.x * TILE,
        y: a.y * TILE,
        width: a.w * TILE,
        height: a.h * TILE,
        rotation: 0,
        visible: true,
      })),
    },
    {
      id: 6,
      name: "spawn",
      type: "objectgroup",
      draworder: "topdown",
      opacity: 1,
      visible: true,
      x: 0,
      y: 0,
      objects: [
        {
          id: nextObjectId++,
          name: "spawn",
          type: "spawn",
          point: true,
          x: layout.spawn.x,
          y: layout.spawn.y,
          width: 0,
          height: 0,
          rotation: 0,
          visible: true,
          properties: [{ name: "direction", type: "string", value: layout.spawn.direction }],
        },
      ],
    },
  ],
  nextlayerid: 7,
  nextobjectid: nextObjectId,
  tilesets: [
    {
      firstgid: 1,
      name: "ship-tiles",
      image: "ship-tiles.png",
      imagewidth: TILESET_COLUMNS * TILE,
      imageheight: TILESET_ROWS * TILE,
      tilewidth: TILE,
      tileheight: TILE,
      columns: TILESET_COLUMNS,
      tilecount: TILESET_COLUMNS * TILESET_ROWS,
      margin: 0,
      spacing: 0,
      tiles: [
        {
          id: T.FLAG_A,
          animation: [
            { tileid: T.FLAG_A, duration: 380 },
            { tileid: T.FLAG_B, duration: 380 },
          ],
        },
        {
          id: T.LANTERN_TOP_A,
          animation: [
            { tileid: T.LANTERN_TOP_A, duration: 700 },
            { tileid: T.LANTERN_TOP_B, duration: 160 },
            { tileid: T.LANTERN_TOP_A, duration: 420 },
            { tileid: T.LANTERN_TOP_B, duration: 120 },
          ],
        },
      ],
    },
  ],
};

writeFileSync(join(publicDir, "ship.json"), JSON.stringify(tiledMap));

// --- Landing-page hero: the ship rendered to one transparent PNG ------------
// Same tiles and layers as the game, cropped to the hull and pier, with a few
// passengers on deck (characters sit between decor-below and decor-above).
const HERO = { x: 2, y: 2, w: 44, h: 26 };
const hero = new Canvas(HERO.w * TILE, HERO.h * TILE);
const blitLayer = (data: number[]) => {
  for (let ty = HERO.y; ty < HERO.y + HERO.h; ty++)
    for (let tx = HERO.x; tx < HERO.x + HERO.w; tx++) {
      const g = data[ty * MAP_W + tx];
      if (!g) continue;
      const id = g - 1;
      hero.drawFrom(tilesetCanvas, (id % TILESET_COLUMNS) * TILE, Math.floor(id / TILESET_COLUMNS) * TILE, TILE, TILE, (tx - HERO.x) * TILE, (ty - HERO.y) * TILE);
    }
};
blitLayer(deck);
blitLayer(decorBelow);
// [tileX, tileY, variant, direction row: 0 down, 1 left, 2 right, 3 up]
const heroPassengers: Array<[number, number, number, number]> = [
  [8, 10, 3, 0],
  [17, 9, 1, 0],
  [24, 14, 2, 1],
  [33, 14, 4, 0],
  [40, 11, 5, 2],
  [14, 17, 0, 3],
];
for (const [tx, ty, variant, dir] of heroPassengers) {
  if (!isWalkableCell(layout, tx, ty)) throw new Error(`hero passenger on blocked tile ${tx},${ty}`);
  hero.drawFrom(charactersCanvas, 0, (variant * 4 + dir) * 24, 16, 24, (tx - HERO.x) * TILE, (ty - HERO.y) * TILE - 10);
}
blitLayer(decorAbove);
writePng("ship-hero.png", hero);

const walkable = {
  mapId: MAP_ID,
  mapVersion: MAP_VERSION,
  width: MAP_W,
  height: MAP_H,
  tileSize: TILE,
  spawn: layout.spawn,
  areas: layout.areas,
  rows: walkableRows,
};
writeFileSync(join(mapsDir, "walkable.json"), JSON.stringify(walkable, null, 2) + "\n");

console.log(toAscii(layout));
console.log(`\nWrote ship map v${MAP_VERSION} (${MAP_W}×${MAP_H}) and placeholder art.`);
