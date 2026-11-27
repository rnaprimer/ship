/**
 * Sea skills (owner decision 2026-11-27): four skills that grow as you do the
 * ship's activities, levels 1–5, each level unlocking a fancier version of an
 * activity. Saved in this browser only (per passenger), never sent to the
 * server. No items, quests or leaderboards (BRIEF §14 still holds for those).
 */
import { z } from "zod";
import type { ActivityKind } from "./interactions";

export type SkillId = "gunnery" | "navigation" | "brewing" | "seamanship";
export const SKILL_IDS: SkillId[] = ["gunnery", "navigation", "brewing", "seamanship"];

export type Perk = { level: number; name: string; text: string; ability?: AbilityId };
export type AbilityId = "spyglass" | "bubbles" | "parrot";

export const SKILLS: Record<SkillId, { name: string; blurb: string; from: ActivityKind[]; perks: Perk[] }> = {
  gunnery: {
    name: "Gunnery",
    blurb: "Fire the cannons and throw daggers.",
    from: ["cannon", "target"],
    perks: [
      { level: 2, name: "Double broadside", text: "Cannons fire twice." },
      { level: 3, name: "Coloured smoke", text: "Gold and crimson smoke after every shot." },
      { level: 4, name: "Skipping shot", text: "Cannonballs skip across the waves." },
      { level: 5, name: "Fireworks", text: "Your cannon shots burst into fireworks at sea." },
    ],
  },
  navigation: {
    name: "Navigation",
    blurb: "Take the helm, read charts, spin globes.",
    from: ["wheel", "chart", "globe"],
    perks: [
      { level: 2, name: "Fair winds", text: "The helm's burst of speed lasts twice as long." },
      { level: 3, name: "Navigator's eye", text: "Charts show you a hidden second route." },
      { level: 4, name: "Dolphin escort", text: "Dolphins leap beside the ship when you steer." },
      { level: 5, name: "Spyglass", text: "Look out over the whole deck for a few seconds.", ability: "spyglass" },
    ],
  },
  brewing: {
    name: "Brewing",
    blurb: "Drinks at the bar, grog in the galley, potions in the lab.",
    from: ["bar", "beer", "potion"],
    perks: [
      { level: 2, name: "Secret recipes", text: "The pool bar serves Kraken grog and Mermaid's kiss." },
      { level: 3, name: "Fizzy brews", text: "Potions bubble over in sparkles." },
      { level: 4, name: "Glow brew", text: "Brewing a potion makes you glow for a while." },
      { level: 5, name: "Bubble trail", text: "Leave a trail of coloured bubbles as you walk.", ability: "bubbles" },
    ],
  },
  seamanship: {
    name: "Seamanship",
    blurb: "Swim, rest, open chests, brave the ritual circle.",
    from: ["pool", "bed", "chest", "ritual"],
    perks: [
      { level: 2, name: "Cannonball dive", text: "Your dips make a much bigger splash." },
      { level: 3, name: "Sea legs", text: "Strong drinks no longer make the deck sway." },
      { level: 4, name: "Lucky eye", text: "You sometimes spot a gem glinting in a chest." },
      { level: 5, name: "Parrot friend", text: "A parrot flies along with you.", ability: "parrot" },
    ],
  },
};

/** Total XP needed to reach each level (index 0 = level 1). */
export const LEVEL_XP = [0, 3, 8, 15, 25];
export const MAX_LEVEL = LEVEL_XP.length;
/** Doing the same thing again within this time earns nothing (no button-mashing). */
export const XP_COOLDOWN_MS = 12_000;

export type SkillXp = Record<SkillId, number>;

export function levelFor(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) level = i + 1;
  return level;
}

/** Progress within the current level, 0..1 (1 at max level). */
export function progressFor(xp: number): { level: number; into: number; need: number; fraction: number } {
  const level = levelFor(xp);
  if (level >= MAX_LEVEL) return { level, into: 0, need: 0, fraction: 1 };
  const into = xp - LEVEL_XP[level - 1];
  const need = LEVEL_XP[level] - LEVEL_XP[level - 1];
  return { level, into, need, fraction: into / need };
}

export function skillFor(kind: ActivityKind): SkillId | null {
  for (const id of SKILL_IDS) if (SKILLS[id].from.includes(kind)) return id;
  return null;
}

export function hasPerk(xp: SkillXp, skill: SkillId, level: number): boolean {
  return levelFor(xp[skill]) >= level;
}

export function emptyXp(): SkillXp {
  return { gunnery: 0, navigation: 0, brewing: 0, seamanship: 0 };
}

const Stored = z
  .object({
    v: z.literal(1),
    xp: z.object({
      gunnery: z.number().int().min(0).max(100_000),
      navigation: z.number().int().min(0).max(100_000),
      brewing: z.number().int().min(0).max(100_000),
      seamanship: z.number().int().min(0).max(100_000),
    }),
    parrot: z.boolean().optional(),
  })
  .strict();
export type StoredSkills = z.infer<typeof Stored>;

const storageKey = (username: string) => `ship.skills.v1:${username.toLowerCase()}`;

/** Reads a passenger's skills from this browser; anything missing or malformed starts fresh. */
export function loadSkills(username: string, storage: Pick<Storage, "getItem"> | null = safeStorage()): StoredSkills {
  try {
    const raw = storage?.getItem(storageKey(username));
    if (raw) {
      const parsed = Stored.safeParse(JSON.parse(raw));
      if (parsed.success) return parsed.data;
    }
  } catch {
    // Unreadable storage: start fresh.
  }
  return { v: 1, xp: emptyXp() };
}

export function saveSkills(username: string, skills: StoredSkills, storage: Pick<Storage, "setItem"> | null = safeStorage()): void {
  try {
    storage?.setItem(storageKey(username), JSON.stringify(skills));
  } catch {
    // Storage full or blocked: progress just isn't kept.
  }
}

function safeStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Awards XP for using something, unless the same thing was used too recently.
 * Returns the skill, and the new level when it went up.
 */
export function award(
  skills: StoredSkills,
  kind: ActivityKind,
  thingId: string,
  now: number,
  lastUsed: Map<string, number>,
): { skill: SkillId; gained: number; levelUp: number | null } | null {
  const skill = skillFor(kind);
  if (!skill) return null;
  const last = lastUsed.get(thingId);
  if (last !== undefined && now - last < XP_COOLDOWN_MS) return { skill, gained: 0, levelUp: null };
  lastUsed.set(thingId, now);
  const before = levelFor(skills.xp[skill]);
  skills.xp[skill] += 1;
  const after = levelFor(skills.xp[skill]);
  return { skill, gained: 1, levelUp: after > before ? after : null };
}

/** The perk unlocked at exactly this level, if any. */
export function perkAt(skill: SkillId, level: number): Perk | undefined {
  return SKILLS[skill].perks.find((p) => p.level === level);
}
