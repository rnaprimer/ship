/**
 * Generates the game art and every map.
 *
 *   node scripts/build-ship-assets.ts   (or: npm run build:assets)
 *
 * Each place is painted as a whole picture (scripts/maps/, scripts/paint/),
 * then cut into 16×16 tiles: identical tiles are stored once in a per-map
 * tileset. Outputs:
 *   public/game/ocean.png, foam.png    animated water textures
 *   public/game/characters.png         16×24 character frames, 6 variants
 *   public/game/ship-font.png/.xml     bitmap font for username labels
 *   public/game/chart.png              the sea chart passengers can read
 *   public/game/maps/<id>.png          the map's tileset
 *   public/game/maps/<id>.json         Tiled map (layers: deck, decor-above, collision)
 *   src/game/maps/generated/<id>.json  walkability grid and metadata, shared with the server
 */
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { encodePng } from "./lib/png.ts";
import { Canvas } from "./lib/canvas.ts";
import { drawFoam, drawOcean } from "./art/ocean.ts";
import { drawCharacters } from "./art/characters.ts";
import { buildFont } from "./art/font.ts";
import { drawChart } from "./art/chart.ts";
import { allMaps } from "./maps/index.ts";
import { TILE, type BuiltMap } from "./paint/mapkit.ts";
import type { Painter } from "./paint/painter.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = join(root, "public", "game");
const publicMapsDir = join(publicDir, "maps");
const mapsDir = join(root, "src", "game", "maps", "generated");
for (const dir of [publicDir, publicMapsDir, mapsDir]) mkdirSync(dir, { recursive: true });
// Art from the tile-grid maps (Milestone 6 and before).
for (const f of ["ship-tiles.png", "ship-hero.png", "ship.json"]) rmSync(join(publicDir, f), { force: true });

const previewDir = process.argv.includes("--preview") ? process.argv[process.argv.indexOf("--preview") + 1] : null;
const writePng = (path: string, c: Canvas) => writeFileSync(path, encodePng(c.width, c.height, c.data));

// --- Shared art --------------------------------------------------------------
writePng(join(publicDir, "ocean.png"), drawOcean());
writePng(join(publicDir, "foam.png"), drawFoam());
writePng(join(publicDir, "characters.png"), drawCharacters());
const font = buildFont("ship-font.png");
writePng(join(publicDir, "ship-font.png"), font.canvas);
writeFileSync(join(publicDir, "ship-font.xml"), font.xml);
writePng(join(publicDir, "chart.png"), drawChart().canvas);

// --- Maps --------------------------------------------------------------------
const COLUMNS = 32;

/** Cuts a painted layer into tiles, adding new ones to `tiles`; returns the layer's gids. */
function slice(layer: Painter, map: BuiltMap, tiles: Uint8Array[], index: Map<string, number>): number[] {
  const gids: number[] = [];
  const src = layer.canvas.data;
  for (let ty = 0; ty < map.height; ty++)
    for (let tx = 0; tx < map.width; tx++) {
      const tile = new Uint8Array(TILE * TILE * 4);
      let opaque = false;
      for (let y = 0; y < TILE; y++) {
        const from = ((ty * TILE + y) * layer.width + tx * TILE) * 4;
        tile.set(src.subarray(from, from + TILE * 4), y * TILE * 4);
      }
      for (let i = 3; i < tile.length; i += 4)
        if (tile[i] !== 0) {
          opaque = true;
          break;
        }
      if (!opaque) {
        gids.push(0);
        continue;
      }
      const key = Buffer.from(tile).toString("base64");
      let id = index.get(key);
      if (id === undefined) {
        id = tiles.length;
        tiles.push(tile);
        index.set(key, id);
      }
      gids.push(id + 1);
    }
  return gids;
}

function buildMap(map: BuiltMap): void {
  const { width: W, height: H } = map;
  // Tile 0 of every tileset is the (invisible) collision marker.
  const marker = new Uint8Array(TILE * TILE * 4);
  for (let i = 0; i < marker.length; i += 4) marker.set([255, 0, 255, 128], i);
  const tiles: Uint8Array[] = [marker];
  const index = new Map<string, number>();
  const deck = slice(map.below, map, tiles, index);
  const above = slice(map.above, map, tiles, index);

  const rows = map.walk.map((r) => r.map((w) => (w ? "1" : "0")).join(""));
  const collision = rows.flatMap((r) => [...r].map((c) => (c === "1" ? 0 : 1)));
  const spawnTx = Math.floor(map.spawn.x / TILE);
  const spawnTy = Math.floor((map.spawn.y - 1) / TILE);
  if (rows[spawnTy]?.[spawnTx] !== "1") throw new Error(`${map.id}: spawn is not walkable`);

  const tileRows = Math.ceil(tiles.length / COLUMNS);
  const sheet = new Canvas(COLUMNS * TILE, tileRows * TILE);
  tiles.forEach((t, i) => {
    const ox = (i % COLUMNS) * TILE;
    const oy = Math.floor(i / COLUMNS) * TILE;
    for (let y = 0; y < TILE; y++) sheet.data.set(t.subarray(y * TILE * 4, (y + 1) * TILE * 4), ((oy + y) * sheet.width + ox) * 4);
  });
  writePng(join(publicMapsDir, `${map.id}.png`), sheet);

  const tileLayer = (id: number, name: string, data: number[], visible = true) => ({
    id, name, type: "tilelayer", width: W, height: H, x: 0, y: 0, opacity: 1, visible, data,
  });
  let nextObjectId = 1;
  const tiled = {
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
      { name: "mapId", type: "string", value: map.id },
      { name: "mapVersion", type: "int", value: map.version },
    ],
    layers: [
      tileLayer(1, "deck", deck),
      tileLayer(2, "decor-above", above),
      tileLayer(3, "collision", collision, false),
      {
        id: 4, name: "areas", type: "objectgroup", draworder: "index", opacity: 1, visible: true, x: 0, y: 0,
        objects: map.areas.map((a) => ({
          id: nextObjectId++, name: a.name, type: "area", x: a.x * TILE, y: a.y * TILE, width: a.w * TILE, height: a.h * TILE, rotation: 0, visible: true,
        })),
      },
      {
        id: 5, name: "spawn", type: "objectgroup", draworder: "topdown", opacity: 1, visible: true, x: 0, y: 0,
        objects: [{
          id: nextObjectId++, name: "spawn", type: "spawn", point: true, x: map.spawn.x, y: map.spawn.y, width: 0, height: 0, rotation: 0, visible: true,
          properties: [{ name: "direction", type: "string", value: map.spawn.direction }],
        }],
      },
    ],
    nextlayerid: 6,
    nextobjectid: nextObjectId,
    tilesets: [{
      firstgid: 1,
      name: map.id,
      image: `${map.id}.png`,
      imagewidth: sheet.width,
      imageheight: sheet.height,
      tilewidth: TILE,
      tileheight: TILE,
      columns: COLUMNS,
      tilecount: tiles.length,
      margin: 0,
      spacing: 0,
    }],
  };
  writeFileSync(join(publicMapsDir, `${map.id}.json`), JSON.stringify(tiled));

  writeFileSync(
    join(mapsDir, `${map.id}.json`),
    JSON.stringify({
      mapId: map.id,
      mapVersion: map.version,
      name: map.name,
      width: W,
      height: H,
      tileSize: TILE,
      outdoor: map.outdoor,
      dark: map.dark,
      private: map.private,
      background: map.background,
      foam: null,
      spawn: map.spawn,
      areas: map.areas,
      interactables: map.interactables,
      flames: map.flames,
      rows,
    }, null, 2) + "\n",
  );

  if (previewDir) {
    // Whole-map preview with the walkable tiles outlined, for checking layouts by eye.
    const prev = new Canvas(map.below.width, map.below.height);
    prev.drawFrom(map.below.canvas, 0, 0, prev.width, prev.height, 0, 0);
    prev.drawFrom(map.above.canvas, 0, 0, prev.width, prev.height, 0, 0);
    writePng(join(previewDir, `${map.id}.png`), prev);
    const walk = new Canvas(prev.width, prev.height);
    walk.drawFrom(prev, 0, 0, prev.width, prev.height, 0, 0);
    rows.forEach((r, ty) => [...r].forEach((c, tx) => {
      if (c === "1") for (let i = 0; i < TILE; i++) { walk.set(tx * TILE + i, ty * TILE, "#00ff0080"); walk.set(tx * TILE, ty * TILE + i, "#00ff0080"); }
    }));
    writePng(join(previewDir, `${map.id}.walk.png`), walk);
  }
  console.log(`${map.name.padEnd(15)} ${W}×${H} tiles, ${tiles.length} unique tiles, ${rows.join("").split("1").length - 1} walkable`);
}

const maps = allMaps();
if (new Set(maps.map((m) => m.id)).size !== maps.length) throw new Error("duplicate map id");
for (const m of maps) buildMap(m);
console.log(`\nWrote ${maps.length} maps.`);
