import { describe, expect, it } from "vitest";
import { ALL_LOCATIONS } from "./locations";
import { MAP_IDS, MAPS } from "./maps";
import { isFootprintWalkable } from "./systems/walkability";

describe("locations", () => {
  it("lists every map exactly once, with the map's own name", () => {
    expect(ALL_LOCATIONS.map((l) => l.mapId).sort()).toEqual([...MAP_IDS].sort());
    for (const l of ALL_LOCATIONS) expect(MAPS[l.mapId as keyof typeof MAPS].name).toBe(l.name);
  });

  it("puts every spawn point on a walkable spot", () => {
    for (const id of MAP_IDS) {
      const m = MAPS[id];
      expect(isFootprintWalkable(m, m.spawn.x, m.spawn.y), id).toBe(true);
    }
  });

  it("keeps First Deck's id (its version bumps whenever the layout changes)", () => {
    expect(MAPS["ship-main"].mapVersion).toBe(2);
    expect(MAPS["ship-main"].name).toBe("First Deck");
  });

  it("only marks the cabin as private", () => {
    expect(MAP_IDS.filter((id) => MAPS[id].private)).toEqual(["personal-cabin"]);
  });
});
