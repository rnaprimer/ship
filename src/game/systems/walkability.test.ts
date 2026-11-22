import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SHIP_MAP } from "../maps";
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
const tiled = JSON.parse(readFileSync(join(process.cwd(), "public/game/ship.json"), "utf8")) as {
  width: number;
  height: number;
  layers: TiledLayer[];
  properties: Array<{ name: string; value: unknown }>;
};
const layer = (name: string) => {
  const l = tiled.layers.find((x) => x.name === name);
  if (!l?.data) throw new Error(`missing layer ${name}`);
  return l.data;
};

const map = SHIP_MAP;
const spawnTile = tileOf(map, map.spawn.x, map.spawn.y - 1);
const key = (tx: number, ty: number) => ty * map.width + tx;

describe("walkable.json", () => {
  it("matches the Tiled map's size, version and collision layer exactly", () => {
    expect(map.width).toBe(tiled.width);
    expect(map.height).toBe(tiled.height);
    expect(tiled.properties.find((p) => p.name === "mapVersion")?.value).toBe(map.mapVersion);
    const collision = layer("collision");
    for (let ty = 0; ty < map.height; ty++)
      for (let tx = 0; tx < map.width; tx++) {
        expect(isWalkableTile(map, tx, ty), `tile ${tx},${ty}`).toBe(collision[key(tx, ty)] === 0);
      }
  });

  it("blocks every tile that has furniture or decor on it", () => {
    const decor = layer("decor-below");
    let furniture = 0;
    decor.forEach((gid, i) => {
      if (gid === 0) return;
      furniture++;
      expect(isWalkableTile(map, i % map.width, Math.floor(i / map.width))).toBe(false);
    });
    expect(furniture).toBeGreaterThan(40);
  });

  it("blocks every tile with no deck (ocean)", () => {
    const deck = layer("deck");
    deck.forEach((gid, i) => {
      if (gid === 0) expect(isWalkableTile(map, i % map.width, Math.floor(i / map.width))).toBe(false);
    });
  });
});

describe("ship boundaries", () => {
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
