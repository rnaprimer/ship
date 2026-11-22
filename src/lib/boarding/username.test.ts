import { describe, expect, it } from "vitest";
import { checkUsername } from "./username";

const ok = (n: string) => checkUsername(n).ok;

describe("checkUsername", () => {
  it("accepts 3–20 letters, numbers and underscores, keeping the chosen case", () => {
    expect(checkUsername("OceanWanderer")).toEqual({ ok: true, username: "OceanWanderer", normalized: "oceanwanderer" });
    expect(ok("abc")).toBe(true);
    expect(ok("a_b_c_1234567890_xyz")).toBe(true);
  });

  it("rejects bad lengths, spaces and symbols", () => {
    for (const n of ["ab", "a".repeat(21), "has space", "emoji🚢", "dash-name", "dot.name", "", "@me"]) {
      expect(ok(n), n).toBe(false);
    }
    expect(ok(42 as unknown as string)).toBe(false);
  });

  it("rejects reserved and impersonating names in any case", () => {
    for (const n of ["admin", "ADMIN", "Captain", "Moderator", "official_ship", "SupportTeam", "the_admin_1", "Internet_Ship"]) {
      expect(ok(n), n).toBe(false);
    }
  });

  it("filters basic profanity, including l33t spellings", () => {
    for (const n of ["fuckboy", "Sh1tposter", "b1tch_99", "n4zi_fan"]) expect(ok(n), n).toBe(false);
  });

  it("does not block innocent names that contain short stems", () => {
    for (const n of ["grape_juice", "peacock", "Dickens_fan", "spicy_tuna", "captain_kofi"]) expect(ok(n), n).toBe(true);
  });
});
