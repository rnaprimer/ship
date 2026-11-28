/**
 * Crew roles, outfit colours and hats (owner decision 2026-11-28). Purely
 * cosmetic: a role changes your clothes and the tool you carry, and gives
 * you one harmless role action. Saved on the server so everyone sees it.
 * Indexes are stored in the database, so only ever append to these lists.
 */
export type RoleId =
  | "captain"
  | "swordsman"
  | "navigator"
  | "sniper"
  | "cook"
  | "doctor"
  | "archaeologist"
  | "shipwright"
  | "musician"
  | "helmsman";

export type Role = { id: RoleId; name: string; tool: string; action: string; icon: string };

export const ROLES: readonly Role[] = [
  { id: "captain", name: "Captain", tool: "Long coat with gold braid", action: "Rally the crew", icon: "🏴‍☠️" },
  { id: "swordsman", name: "Swordsman", tool: "Cutlass and sash", action: "Sword drill", icon: "⚔️" },
  { id: "navigator", name: "Navigator", tool: "Striped shirt and sea chart", action: "Read the wind", icon: "🧭" },
  { id: "sniper", name: "Sniper", tool: "Bandolier and slingshot", action: "Trick shot", icon: "🎯" },
  { id: "cook", name: "Cook", tool: "Apron and ladle", action: "Cook a stew", icon: "🍲" },
  { id: "doctor", name: "Doctor", tool: "White coat and medicine bag", action: "Patch yourself up", icon: "🩺" },
  { id: "archaeologist", name: "Archaeologist", tool: "Field jacket and old book", action: "Read the old runes", icon: "📜" },
  { id: "shipwright", name: "Shipwright", tool: "Overalls and hammer", action: "Mend a plank", icon: "🔨" },
  { id: "musician", name: "Musician", tool: "Tailcoat and fiddle", action: "Play a shanty", icon: "🎻" },
  { id: "helmsman", name: "Helmsman", tool: "Oilskin coat and gloves", action: "Ride the current", icon: "☸️" },
];

export const ROLE_COUNT = ROLES.length;

/** Main garment colours: base, shadow. */
export const OUTFIT_COLORS: readonly { name: string; main: string; dark: string }[] = [
  { name: "Crimson", main: "#b33a35", dark: "#7f2524" },
  { name: "Navy", main: "#2f4f86", dark: "#1f355e" },
  { name: "Forest", main: "#3f7a45", dark: "#2a5530" },
  { name: "Gold", main: "#d19a32", dark: "#9b6e1d" },
  { name: "Black", main: "#3a3440", dark: "#23202a" },
];

export const OUTFIT_COLOR_COUNT = OUTFIT_COLORS.length;

/** Index 0 is "no hat". */
export const HATS: readonly { name: string }[] = [
  { name: "No hat" },
  { name: "Tricorn" },
  { name: "Bandana" },
  { name: "Chef's hat" },
  { name: "Straw hat" },
  { name: "Bicorne" },
  { name: "Feathered hat" },
  { name: "Knit cap" },
  { name: "Top hat" },
  { name: "Explorer's helmet" },
];

export const HAT_COUNT = HATS.length;

/** What a passenger is wearing. `role` null means plain clothes. */
export type Outfit = { role: number | null; color: number; hat: number };

export const PLAIN_OUTFIT: Outfit = { role: null, color: 0, hat: 0 };

/** Clamps anything unexpected back to plain clothes. */
export function cleanOutfit(o: Partial<Outfit> | null | undefined): Outfit {
  const inRange = (v: unknown, n: number) => typeof v === "number" && Number.isInteger(v) && v >= 0 && v < n;
  return {
    role: inRange(o?.role, ROLE_COUNT) ? (o!.role as number) : null,
    color: inRange(o?.color, OUTFIT_COLOR_COUNT) ? (o!.color as number) : 0,
    hat: inRange(o?.hat, HAT_COUNT) ? (o!.hat as number) : 0,
  };
}

export function roleOf(o: Outfit): Role | null {
  return o.role === null ? null : (ROLES[o.role] ?? null);
}
