import { describe, expect, it } from "vitest";
import { SHIP_MAP } from "../maps";
import { loadPosition, parseSavedPosition, POSITION_STORAGE_KEY, savePosition } from "./PositionPersistence";

const valid = { mapId: SHIP_MAP.mapId, mapVersion: SHIP_MAP.mapVersion, x: SHIP_MAP.spawn.x, y: SHIP_MAP.spawn.y, direction: "left" };

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    data,
  };
}

describe("parseSavedPosition", () => {
  it("accepts a valid position on a walkable tile", () => {
    expect(parseSavedPosition(JSON.stringify(valid), SHIP_MAP)).toEqual(valid);
  });

  it("rejects missing, malformed and non-object data", () => {
    expect(parseSavedPosition(null, SHIP_MAP)).toBeNull();
    expect(parseSavedPosition("{not json", SHIP_MAP)).toBeNull();
    expect(parseSavedPosition("42", SHIP_MAP)).toBeNull();
    expect(parseSavedPosition("null", SHIP_MAP)).toBeNull();
  });

  it("falls back to spawn after a map update (version mismatch) or for another map", () => {
    expect(parseSavedPosition(JSON.stringify({ ...valid, mapVersion: SHIP_MAP.mapVersion + 1 }), SHIP_MAP)).toBeNull();
    expect(parseSavedPosition(JSON.stringify({ ...valid, mapId: "other" }), SHIP_MAP)).toBeNull();
  });

  it("rejects positions in the ocean, inside furniture, or off the map", () => {
    expect(parseSavedPosition(JSON.stringify({ ...valid, x: 5, y: 5 }), SHIP_MAP)).toBeNull();
    // Ship's wheel at tile (7,11).
    expect(parseSavedPosition(JSON.stringify({ ...valid, x: 7 * 16 + 8, y: 11 * 16 + 12 }), SHIP_MAP)).toBeNull();
    expect(parseSavedPosition(JSON.stringify({ ...valid, x: -100, y: 99999 }), SHIP_MAP)).toBeNull();
  });

  it("rejects bad types and unknown directions", () => {
    expect(parseSavedPosition(JSON.stringify({ ...valid, x: "240" }), SHIP_MAP)).toBeNull();
    expect(parseSavedPosition(JSON.stringify({ ...valid, direction: "diagonal" }), SHIP_MAP)).toBeNull();
  });
});

describe("loadPosition / savePosition", () => {
  it("round-trips through storage, rounding to whole pixels", () => {
    const storage = memoryStorage();
    savePosition(storage, { ...valid, x: valid.x + 0.4, y: valid.y - 0.3, direction: "up" });
    expect(JSON.parse(storage.data.get(POSITION_STORAGE_KEY)!)).toMatchObject({ x: valid.x, y: valid.y });
    expect(loadPosition(storage, SHIP_MAP)).toEqual({ ...valid, direction: "up" });
  });

  it("survives storage that throws (private mode) and missing storage", () => {
    const throwing = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(loadPosition(throwing, SHIP_MAP)).toBeNull();
    expect(() => savePosition(throwing, valid as never)).not.toThrow();
    expect(loadPosition(undefined, SHIP_MAP)).toBeNull();
  });
});
