import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MAP_IDS, MAPS, SHIP_MAP } from "../maps";
import {
  areaAt,
  findPath,
  isFootprintWalkable,
  isWalkablePoint,
  isWalkableTile,
  reachableFrom,
  tileOf,
  walkableTiles,
} from "./walkability";

type TiledLayer = { name: string; type: string; data?: number[]; objects?: Array<{ name: string }> };
type TiledMap = { width: number; height: number; layers: TiledLayer[]; properties: Array<{ name: string; value: unknown }> };
const tiledFor = (id: string) =>
  JSON.parse(readFileSync(join(process.cwd(), `public/game/maps/${id}.json`), "utf8")) as TiledMap;
const layerOf = (tiled: TiledMap, name: string) => {
  const l = tiled.layers.find((x) => x.name === name);
  if (!l?.data) throw new Error(`missing layer ${name}`);
  return l.data;
};

describe.each(MAP_IDS)("map %s", (id) => {
  const m = MAPS[id];
  const tiled = tiledFor(id);
  const start = tileOf(m, m.spawn.x, m.spawn.y - 1);

  it("matches the Tiled map's id, size, version and collision layer exactly", () => {
    expect(m.width).toBe(tiled.width);
    expect(m.height).toBe(tiled.height);
    expect(tiled.properties.find((p) => p.name === "mapId")?.value).toBe(id);
    expect(tiled.properties.find((p) => p.name === "mapVersion")?.value).toBe(m.mapVersion);
    const collision = layerOf(tiled, "collision");
    for (let ty = 0; ty < m.height; ty++)
      for (let tx = 0; tx < m.width; tx++) {
        expect(isWalkableTile(m, tx, ty), `tile ${tx},${ty}`).toBe(collision[ty * m.width + tx] === 0);
      }
  });

  it("blocks every tile that has furniture on it, and every tile with no floor", () => {
    const decor = layerOf(tiled, "decor-below");
    const floor = layerOf(tiled, "deck");
    let furniture = 0;
    decor.forEach((gid, i) => {
      if (gid === 0) return;
      furniture++;
      expect(isWalkableTile(m, i % m.width, Math.floor(i / m.width))).toBe(false);
    });
    expect(furniture).toBeGreaterThan(8);
    floor.forEach((gid, i) => {
      if (gid === 0) expect(isWalkableTile(m, i % m.width, Math.floor(i / m.width))).toBe(false);
    });
  });

  it("spawns on a walkable footprint, is enclosed, and has no cut-off pockets", () => {
    expect(isFootprintWalkable(m, m.spawn.x, m.spawn.y)).toBe(true);
    const reachable = reachableFrom(m, start);
    for (const k of reachable) {
      const tx = k % m.width;
      const ty = Math.floor(k / m.width);
      expect(tx > 0 && ty > 0 && tx < m.width - 1 && ty < m.height - 1, `edge tile ${tx},${ty}`).toBe(true);
    }
    expect(reachable.size).toBe(walkableTiles(m).length);
  });

  // First Deck predates this rule (the pier's west end has no area; the HUD keeps the last name).
  it.skipIf(id === "ship-main")("names every walkable tile with an area", () => {
    for (const k of reachableFrom(m, start)) {
      expect(areaAt(m, (k % m.width) * 16 + 8, Math.floor(k / m.width) * 16 + 8), `tile ${k}`).not.toBeNull();
    }
  });
});

const map = SHIP_MAP;
const spawnTile = tileOf(map, map.spawn.x, map.spawn.y - 1);

describe("First Deck boundaries", () => {
  it("spawns the player on a walkable footprint", () => {
    expect(isFootprintWalkable(map, map.spawn.x, map.spawn.y)).toBe(true);
  });

  it("is fully enclosed: nothing reachable from spawn touches the map edge", () => {
    const reachable = reachableFrom(map, spawnTile);
    for (const k of reachable) {
      const tx = k % map.width;
      const ty = Math.floor(k / map.width);
      expect(tx > 0 && ty > 0 && tx < map.width - 1 && ty < map.height - 1, `edge tile ${tx},${ty}`).toBe(true);
    }
  });

  it("has no walkable tiles cut off from the spawn", () => {
    const reachable = reachableFrom(map, spawnTile);
    expect(reachable.size).toBe(walkableTiles(map).length);
  });

  it("reaches all six areas from the spawn", () => {
    const reachable = reachableFrom(map, spawnTile);
    const reachedAreas = new Set<string>();
    for (const k of reachable) {
      const name = areaAt(map, (k % map.width) * 16 + 8, Math.floor(k / map.width) * 16 + 8);
      if (name) reachedAreas.add(name);
    }
    expect([...reachedAreas].sort()).toEqual(
      ["Boarding area", "Cabin entrance", "Captain's bridge", "Lounge", "Main deck", "Observation deck"].sort(),
    );
  });

  it("treats rails as walls: the north rail row and stern rail column are blocked", () => {
    for (let tx = 3; tx <= 36; tx++) expect(isWalkableTile(map, tx, 3)).toBe(false);
    for (let ty = 3; ty <= 19; ty++) expect(isWalkableTile(map, 3, ty)).toBe(false);
  });

  it("rejects out-of-range, fractional and non-finite tiles and points", () => {
    expect(isWalkableTile(map, -1, 5)).toBe(false);
    expect(isWalkableTile(map, map.width, 5)).toBe(false);
    expect(isWalkableTile(map, 5, map.height)).toBe(false);
    expect(isWalkableTile(map, 10.5, 10)).toBe(false);
    expect(isWalkablePoint(map, Number.NaN, 100)).toBe(false);
    expect(isWalkablePoint(map, Number.POSITIVE_INFINITY, 100)).toBe(false);
    expect(isFootprintWalkable(map, 1e9, 1e9)).toBe(false);
  });
});

describe("isFootprintWalkable", () => {
  it("rejects a footprint that overlaps a blocked tile even if the centre is walkable", () => {
    // Spawn tile row 17; lantern at tile (13,18). Standing at the very left of tile 14 overlaps x=13.
    expect(isWalkableTile(map, 14, 17)).toBe(true);
    expect(isWalkableTile(map, 13, 17)).toBe(true);
    // Feet in tile (14,18)'s row would put the box into the lantern at (13,18) when hugging the left edge.
    expect(isFootprintWalkable(map, 14 * 16 + 2, 18 * 16 + 8)).toBe(false);
    expect(isFootprintWalkable(map, 14 * 16 + 8, 18 * 16 + 8)).toBe(true);
  });
});

describe("findPath", () => {
  it("returns a 4-connected path over walkable tiles only", () => {
    const to = { tx: 41, ty: 9 }; // observation deck
    const path = findPath(map, spawnTile, to);
    expect(path).not.toBeNull();
    expect(path![0]).toEqual(spawnTile);
    expect(path![path!.length - 1]).toEqual(to);
    for (let i = 0; i < path!.length; i++) {
      expect(isWalkableTile(map, path![i].tx, path![i].ty)).toBe(true);
      if (i > 0) {
        const d = Math.abs(path![i].tx - path![i - 1].tx) + Math.abs(path![i].ty - path![i - 1].ty);
        expect(d).toBe(1);
      }
    }
  });

  it("returns null for blocked endpoints", () => {
    expect(findPath(map, spawnTile, { tx: 0, ty: 0 })).toBeNull();
  });
});

describe("areaAt", () => {
  it("names the area at the spawn and at the ship's wheel", () => {
    expect(areaAt(map, map.spawn.x, map.spawn.y - 1)).toBe("Boarding area");
    expect(areaAt(map, 7 * 16 + 8, 10 * 16 + 8)).toBe("Captain's bridge");
    expect(areaAt(map, 0, 0)).toBeNull();
  });
});
