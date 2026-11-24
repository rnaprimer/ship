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

  it("blocks every tile with nothing painted on it (open water or void)", () => {
    const floor = layerOf(tiled, "deck");
    floor.forEach((gid, i) => {
      if (gid === 0) expect(isWalkableTile(m, i % m.width, Math.floor(i / m.width))).toBe(false);
    });
    expect(walkableTiles(m).length).toBeGreaterThan(300);
  });

  it("has tall things drawn over the characters", () => {
    expect(layerOf(tiled, "decor-above").filter((g) => g !== 0).length).toBeGreaterThan(5);
  });

  it("can reach every named area from the spawn", () => {
    const reached = new Set<string>();
    for (const k of reachableFrom(m, start)) {
      const name = areaAt(m, (k % m.width) * 16 + 8, Math.floor(k / m.width) * 16 + 8);
      if (name) reached.add(name);
    }
    expect([...reached].sort()).toEqual([...new Set(m.areas.map((a) => a.name))].sort());
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

  it("names every walkable tile with an area", () => {
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

  it("treats rails as walls: the north and south rail rows are blocked", () => {
    for (let tx = 30; tx <= 90; tx++) {
      expect(isWalkableTile(map, tx, 6)).toBe(false);
      expect(isWalkableTile(map, tx, 31)).toBe(false);
    }
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
    // The ship's wheel blocks tiles (86,16) and (87,16); (85,16) is open rug.
    expect(isWalkableTile(map, 85, 16)).toBe(true);
    expect(isWalkableTile(map, 86, 16)).toBe(false);
    expect(isFootprintWalkable(map, 85 * 16 + 14, 16 * 16 + 8)).toBe(false);
    expect(isFootprintWalkable(map, 85 * 16 + 6, 16 * 16 + 8)).toBe(true);
  });
});

describe("findPath", () => {
  it("returns a 4-connected path over walkable tiles only", () => {
    const to = { tx: 88, ty: 20 }; // the helm
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
    expect(areaAt(map, map.spawn.x, map.spawn.y - 1)).toBe("Main deck");
    expect(areaAt(map, 86 * 16 + 8, 15 * 16 + 8)).toBe("Helm");
    expect(areaAt(map, -5, -5)).toBeNull();
  });
});
