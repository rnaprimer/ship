import { describe, expect, it } from "vitest";
import { distanceTo, nearestInteractable, REACH, type Interactable } from "./interactions";
import { MAP_IDS, MAPS } from "../maps";
import { isFootprintWalkable, walkableTiles } from "./walkability";

const chart: Interactable = { id: "chart-2-2", kind: "chart", label: "Read", x: 2, y: 2, w: 3, h: 2 };
const cannon: Interactable = { id: "cannon-9-2", kind: "cannon", label: "Fire", x: 9, y: 2, w: 1, h: 2 };

describe("nearestInteractable", () => {
  it("measures distance to the rect's edge, zero inside", () => {
    expect(distanceTo(chart, 40, 40)).toBe(0);
    expect(distanceTo(chart, 40, 64 + 10)).toBe(10);
    expect(distanceTo(chart, 80 + 3, 32 - 4)).toBe(5);
  });

  it("picks the closest thing within reach, or nothing", () => {
    // Standing just below the chart table.
    expect(nearestInteractable([chart, cannon], 48, 64 + 12)?.id).toBe("chart-2-2");
    // Standing just left of the cannon.
    expect(nearestInteractable([chart, cannon], 9 * 16 - 6, 40)?.id).toBe("cannon-9-2");
    // From behind a chair in front of the table (a tile and a bit away) it still reaches.
    expect(nearestInteractable([chart], 48, 64 + 16 + 12)?.id).toBe("chart-2-2");
    // Far from both.
    expect(nearestInteractable([chart, cannon], 300, 300)).toBeNull();
    expect(nearestInteractable(undefined, 0, 0)).toBeNull();
  });
});

describe.each(MAP_IDS)("activities on %s", (id) => {
  const m = MAPS[id];
  it("can all be reached from a walkable spot", () => {
    for (const it of m.interactables ?? []) {
      const reachable = walkableTiles(m).some(({ tx, ty }) => {
        const x = tx * 16 + 8;
        const y = ty * 16 + 12;
        return isFootprintWalkable(m, x, y) && nearestInteractable([it], x, y) !== null;
      });
      expect(reachable, `${it.id} (${it.label})`).toBe(true);
    }
  });

  it("has unique ids and sensible rects", () => {
    const items = m.interactables ?? [];
    expect(new Set(items.map((i) => i.id)).size).toBe(items.length);
    for (const i of items) {
      expect(i.x >= 0 && i.y >= 0 && i.x + i.w <= m.width && i.y + i.h <= m.height, i.id).toBe(true);
      expect(i.label.length).toBeGreaterThan(2);
    }
    expect(REACH).toBeGreaterThan(8);
  });
});

it("every place has something to do", () => {
  for (const id of MAP_IDS) expect((MAPS[id].interactables ?? []).length, id).toBeGreaterThan(2);
});
