import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { cleanOutfit, HAT_COUNT, HATS, OUTFIT_COLOR_COUNT, OUTFIT_COLORS, PLAIN_OUTFIT, ROLE_COUNT, ROLES, roleOf } from "./outfits";
import { HAT_IDS, OUTFIT_COLORS as ART_COLORS, ROLE_IDS } from "../../scripts/art/outfits.ts";
import { bodyFramePart, hatFrame, HAT_SHEET_FRAMES, OUTFIT_SHEET_FRAMES, outfitFrame } from "./entities/CharacterLayers";

/** Width and height of a PNG, read from its header. */
function pngSize(file: string) {
  const buf = readFileSync(join(__dirname, "../../public/game", file));
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

describe("crew outfits", () => {
  it("lists the same roles, colours and hats as the art (indexes are stored in the database)", () => {
    expect(ROLES.map((r) => r.id)).toEqual([...ROLE_IDS]);
    expect(OUTFIT_COLORS.map((c) => c.main)).toEqual(ART_COLORS.map((c) => c.main));
    expect(HATS.length).toBe(HAT_IDS.length + 1);
    // The database checks these exact ranges (20261128133535_crew_outfits.sql).
    expect([ROLE_COUNT, OUTFIT_COLOR_COUNT, HAT_COUNT]).toEqual([10, 5, 10]);
  });

  it("turns anything unexpected into plain clothes", () => {
    expect(cleanOutfit({ role: 4, color: 2, hat: 3 })).toEqual({ role: 4, color: 2, hat: 3 });
    expect(cleanOutfit(null)).toEqual(PLAIN_OUTFIT);
    expect(cleanOutfit({ role: 10, color: -1, hat: 1.5 })).toEqual(PLAIN_OUTFIT);
    expect(cleanOutfit({ role: "cook" as unknown as number, color: 4, hat: 9 })).toEqual({ role: null, color: 4, hat: 9 });
    expect(roleOf({ role: 4, color: 0, hat: 0 })?.name).toBe("Cook");
    expect(roleOf(PLAIN_OUTFIT)).toBeNull();
  });

  it("finds every layer frame inside the built sheets", () => {
    const outfits = pngSize("outfits.png");
    const hats = pngSize("hats.png");
    expect((outfits.w / 24) * (outfits.h / 32)).toBe(OUTFIT_SHEET_FRAMES);
    expect((hats.w / 24) * (hats.h / 32)).toBe(HAT_SHEET_FRAMES);
    expect(outfitFrame(ROLE_COUNT - 1, OUTFIT_COLOR_COUNT - 1, 3, 5)).toBe(OUTFIT_SHEET_FRAMES - 1);
    expect(outfitFrame(0, 0, 0, 0)).toBe(0);
    expect(hatFrame(HAT_COUNT - 1, 3, 5)).toBe(HAT_SHEET_FRAMES - 1);
    expect(hatFrame(1, 0, 0)).toBe(0);
  });

  it("reads direction and column from a body frame", () => {
    // Variant 2, facing right (row 2 of its block), walk frame column 4.
    expect(bodyFramePart((2 * 4 + 2) * 6 + 4)).toEqual({ dir: 2, col: 4 });
    expect(bodyFramePart(-1)).toBeNull();
    expect(bodyFramePart(6 * 4 * 6)).toBeNull();
  });
});
