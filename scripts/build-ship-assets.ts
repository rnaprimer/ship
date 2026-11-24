/**
 * Generates the placeholder art and every map.
 *
 *   node scripts/build-ship-assets.ts   (or: npm run build:assets)
 *
 * Outputs:
 *   public/game/ship-tiles.png      16×16 tileset shared by all maps
 *   public/game/ocean.png, foam.png animated water textures
 *   public/game/characters.png      16×24 character frames, 6 variants
 *   public/game/ship-font.png/.xml  bitmap font for username labels
 *   public/game/ship-hero.png       First Deck rendered for the landing page
 *   public/game/maps/<id>.json      one Tiled map per location (open in Tiled to edit by hand)
 *   src/game/maps/generated/<id>.json  walkability grid and metadata, shared with the server
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./lib/png.ts";
import { Canvas } from "./lib/canvas.ts";
import { T, TILE, TILESET_COLUMNS, TILESET_ROWS, drawFoam, drawOcean, drawTileset } from "./art/tiles.ts";
import { drawCharacters } from "./art/characters.ts";
import { buildFont } from "./art/font.ts";
import { FLOOR_TILES, OBJECT_TILES, isWalkableCell, toAscii, type MapDef } from "./maps/kit.ts";
import { allMaps } from "./maps/index.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public", "game");
const publicMapsDir = join(publicDir, "maps");
const mapsDir = join(root, "src", "game", "maps", "generated");
for (const dir of [publicDir, publicMapsDir, mapsDir]) mkdirSync(dir, { recursive: true });
// Files from the single-map layout, before Milestone 6.
rmSync(join(publicDir, "ship.json"), { force: true });
rmSync(join(root, "src", "game", "maps", "walkable.json"), { force: true });

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

const gid = (id: number) => id + 1;

type Layers = { deck: number[]; decorBelow: number[]; decorAbove: number[] };

/** Writes one map's Tiled JSON and walkability file; returns its tile layers. */
function buildMap(layout: MapDef): Layers {
  const { width: W, height: H } = layout;
  const deck: number[] = [];
  const decorBelow: number[] = [];
  const decorAbove: number[] = new Array(W * H).fill(0);
  const collision: number[] = [];
  const walkableRows: string[] = [];

  for (let y = 0; y < H; y++) {
    let row = "";
    for (let x = 0; x < W; x++) {
      const f = layout.floor[y][x];
      if (f === "~") deck.push(0);
      else {
        const id = FLOOR_TILES[f];
        if (id === undefined) throw new Error(`${layout.id}: unknown floor char "${f}" at ${x},${y}`);
        // Sprinkle the knotted plank variant for texture.
        deck.push(gid(id === T.DECK && (x * 7 + y * 13) % 11 === 0 ? T.DECK_B : id));
      }
      const o = layout.obj[y][x];
      if (o === "") decorBelow.push(0);
      else {
        const id = OBJECT_TILES[o];
        if (id === undefined) throw new Error(`${layout.id}: unknown object char "${o}" at ${x},${y}`);
        decorBelow.push(gid(id));
      }
      const walkable = isWalkableCell(layout, x, y);
      collision.push(walkable ? 0 : gid(T.COLLISION));
      row += walkable ? "1" : "0";
    }
    walkableRows.push(row);
  }
  for (const [x, y, name] of layout.above) {
    if (x < 0 || y < 0 || x >= W || y >= H) throw new Error(`${layout.id}: above tile ${name} off the map at ${x},${y}`);
    decorAbove[y * W + x] = gid(T[name]);
  }

  const spawnTx = Math.floor(layout.spawn.x / TILE);
  const spawnTy = Math.floor((layout.spawn.y - 1) / TILE);
  if (walkableRows[spawnTy]?.[spawnTx] !== "1") throw new Error(`${layout.id}: spawn is not walkable`);

  const tileLayer = (id: number, name: string, data: number[], visible = true) => ({
    id, name, type: "tilelayer", width: W, height: H, x: 0, y: 0, opacity: 1, visible, data,
  });

  let nextObjectId = 1;
  const tiledMap = {
    type: "map",
    version: "1.10",
    tiledversion: "1.11.0",
    orientation: "orthogonal",
    renderorder: "right-down",
    infinite: false,
    width: W,
    height: H,
    tilewidth: TILE,
    tileheight: TILE,
    compressionlevel: -1,
    properties: [
      { name: "mapId", type: "string", value: layout.id },
      { name: "mapVersion", type: "int", value: layout.version },
    ],
    layers: [
      tileLayer(1, "deck", deck),
      tileLayer(2, "decor-below", decorBelow),
      tileLayer(3, "decor-above", decorAbove),
      tileLayer(4, "collision", collision, false),
      {
        id: 5, name: "areas", type: "objectgroup", draworder: "index", opacity: 1, visible: true, x: 0, y: 0,
        objects: layout.areas.map((a) => ({
          id: nextObjectId++, name: a.name, type: "area",
          x: a.x * TILE, y: a.y * TILE, width: a.w * TILE, height: a.h * TILE, rotation: 0, visible: true,
        })),
      },
      {
        id: 6, name: "spawn", type: "objectgroup", draworder: "topdown", opacity: 1, visible: true, x: 0, y: 0,
        objects: [
          {
            id: nextObjectId++, name: "spawn", type: "spawn", point: true,
            x: layout.spawn.x, y: layout.spawn.y, width: 0, height: 0, rotation: 0, visible: true,
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
        image: "../ship-tiles.png",
        imagewidth: TILESET_COLUMNS * TILE,
        imageheight: TILESET_ROWS * TILE,
        tilewidth: TILE,
        tileheight: TILE,
        columns: TILESET_COLUMNS,
        tilecount: TILESET_COLUMNS * TILESET_ROWS,
        margin: 0,
        spacing: 0,
        tiles: [
          { id: T.FLAG_A, animation: [{ tileid: T.FLAG_A, duration: 380 }, { tileid: T.FLAG_B, duration: 380 }] },
          {
            id: T.LANTERN_TOP_A,
            animation: [
              { tileid: T.LANTERN_TOP_A, duration: 700 },
              { tileid: T.LANTERN_TOP_B, duration: 160 },
              { tileid: T.LANTERN_TOP_A, duration: 420 },
              { tileid: T.LANTERN_TOP_B, duration: 120 },
            ],
          },
          {
            id: T.CHANDELIER_A,
            animation: [
              { tileid: T.CHANDELIER_A, duration: 900 },
              { tileid: T.CHANDELIER_B, duration: 200 },
            ],
          },
        ],
      },
    ],
  };
  writeFileSync(join(publicMapsDir, `${layout.id}.json`), JSON.stringify(tiledMap));

  const walkable = {
    mapId: layout.id,
    mapVersion: layout.version,
    name: layout.name,
    width: W,
    height: H,
    tileSize: TILE,
    outdoor: layout.outdoor,
    dark: layout.dark,
    private: layout.private,
    background: layout.background,
    foam: layout.foam,
    spawn: layout.spawn,
    areas: layout.areas,
    rows: walkableRows,
  };
  writeFileSync(join(mapsDir, `${layout.id}.json`), JSON.stringify(walkable, null, 2) + "\n");

  console.log(`\n${layout.name} (${layout.id} v${layout.version}, ${W}×${H})\n${toAscii(layout)}`);
  return { deck, decorBelow, decorAbove };
}

const maps = allMaps();
if (new Set(maps.map((m) => m.id)).size !== maps.length) throw new Error("duplicate map id");
const built = maps.map((m) => ({ def: m, layers: buildMap(m) }));

// --- Landing-page hero: First Deck rendered to one transparent PNG ----------
// Same tiles and layers as the game, cropped to the hull and pier, with a few
// passengers on deck (characters sit between decor-below and decor-above).
{
  const { def: layout, layers } = built[0];
  const HERO = { x: 2, y: 2, w: 44, h: 26 };
  const hero = new Canvas(HERO.w * TILE, HERO.h * TILE);
  const blitLayer = (data: number[]) => {
    for (let ty = HERO.y; ty < HERO.y + HERO.h; ty++)
      for (let tx = HERO.x; tx < HERO.x + HERO.w; tx++) {
        const g = data[ty * layout.width + tx];
        if (!g) continue;
        const id = g - 1;
        hero.drawFrom(tilesetCanvas, (id % TILESET_COLUMNS) * TILE, Math.floor(id / TILESET_COLUMNS) * TILE, TILE, TILE, (tx - HERO.x) * TILE, (ty - HERO.y) * TILE);
      }
  };
  blitLayer(layers.deck);
  blitLayer(layers.decorBelow);
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
  blitLayer(layers.decorAbove);
  writePng("ship-hero.png", hero);
}

console.log(`\nWrote ${maps.length} maps and the placeholder art.`);
