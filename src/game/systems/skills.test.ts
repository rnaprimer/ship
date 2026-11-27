import { describe, expect, it } from "vitest";
import { award, emptyXp, hasPerk, levelFor, loadSkills, perkAt, progressFor, saveSkills, skillFor, SKILL_IDS, SKILLS, XP_COOLDOWN_MS } from "./skills";
import type { ActivityKind } from "./interactions";

function memoryStorage() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

describe("levels", () => {
  it("climbs 1..5 at 0, 3, 8, 15, 25 XP and stops at 5", () => {
    expect([0, 2, 3, 7, 8, 15, 24, 25, 999].map(levelFor)).toEqual([1, 1, 2, 2, 3, 4, 4, 5, 5]);
    expect(progressFor(5)).toEqual({ level: 2, into: 2, need: 5, fraction: 0.4 });
    expect(progressFor(40).fraction).toBe(1);
  });

  it("maps every activity that earns XP to exactly one skill (lights earn nothing)", () => {
    const kinds: ActivityKind[] = ["chart", "bar", "beer", "cannon", "wheel", "bed", "chest", "pool", "potion", "ritual", "target", "globe"];
    for (const k of kinds) expect(skillFor(k), k).not.toBeNull();
    expect(skillFor("light")).toBeNull();
    for (const id of SKILL_IDS) expect(SKILLS[id].perks.map((p) => p.level)).toEqual([2, 3, 4, 5]);
  });
});

describe("award", () => {
  it("gives 1 XP per use, nothing for repeating the same thing too soon", () => {
    const s = { v: 1 as const, xp: emptyXp() };
    const last = new Map<string, number>();
    expect(award(s, "cannon", "cannon-1", 0, last)).toEqual({ skill: "gunnery", gained: 1, levelUp: null });
    expect(award(s, "cannon", "cannon-1", 1000, last)?.gained).toBe(0);
    expect(award(s, "cannon", "cannon-2", 1000, last)?.gained).toBe(1); // a different cannon counts
    expect(award(s, "cannon", "cannon-1", XP_COOLDOWN_MS + 1, last)).toEqual({ skill: "gunnery", gained: 1, levelUp: 2 });
    expect(s.xp.gunnery).toBe(3);
    expect(hasPerk(s.xp, "gunnery", 2)).toBe(true);
    expect(perkAt("gunnery", 2)?.name).toBe("Double broadside");
    expect(award(s, "light", "light-1", 0, last)).toBeNull();
  });
});

describe("storage", () => {
  it("saves per passenger and reads it back", () => {
    const st = memoryStorage();
    saveSkills("Sea_Dog", { v: 1, xp: { gunnery: 4, navigation: 0, brewing: 9, seamanship: 1 }, parrot: true }, st);
    expect(loadSkills("sea_dog", st)).toEqual({ v: 1, xp: { gunnery: 4, navigation: 0, brewing: 9, seamanship: 1 }, parrot: true });
    expect(loadSkills("someone_else", st).xp).toEqual(emptyXp());
  });

  it("starts fresh on tampered or broken data", () => {
    const st = memoryStorage();
    for (const bad of ["{nope", JSON.stringify({ v: 1, xp: { gunnery: -5, navigation: 0, brewing: 0, seamanship: 0 } }), JSON.stringify({ v: 2 }), JSON.stringify({ v: 1, xp: emptyXp(), extra: 1 })]) {
      st.m.set("ship.skills.v1:p", bad);
      expect(loadSkills("p", st)).toEqual({ v: 1, xp: emptyXp() });
    }
    expect(loadSkills("p", null)).toEqual({ v: 1, xp: emptyXp() });
  });
});
