/**
 * Small things passengers can do on the ship (Milestone 8): read a chart,
 * have a drink, fire a cannon into the sea, switch the cabin lights... All
 * purely cosmetic and local to the player: nothing is collected, scored or
 * shared (BRIEF §14 rules out quests, inventories and combat).
 */
export type ActivityKind =
  | "chart"
  | "bar"
  | "beer"
  | "light"
  | "cannon"
  | "wheel"
  | "bed"
  | "chest"
  | "pool"
  | "potion"
  | "ritual"
  | "target"
  | "globe";

/** Something usable on a map: a rect in tiles plus the prompt shown when you're near it. */
export type Interactable = {
  id: string;
  kind: ActivityKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  text?: string;
};

/** How close (pixels, from the feet) you must stand to use something. */
export const REACH = 22;

/** Distance in pixels from a point to an interactable's rect (0 when inside). */
export function distanceTo(it: Interactable, px: number, py: number, tileSize = 16): number {
  const x0 = it.x * tileSize;
  const y0 = it.y * tileSize;
  const x1 = (it.x + it.w) * tileSize;
  const y1 = (it.y + it.h) * tileSize;
  const dx = px < x0 ? x0 - px : px > x1 ? px - x1 : 0;
  const dy = py < y0 ? y0 - py : py > y1 ? py - y1 : 0;
  return Math.hypot(dx, dy);
}

/**
 * The usable thing nearest the player's feet, if any is within reach. The
 * test point sits a little above the feet so things just in front of you
 * (north) count while you face them.
 */
export function nearestInteractable(items: readonly Interactable[] | undefined, x: number, y: number, tileSize = 16): Interactable | null {
  let best: Interactable | null = null;
  let bestD = REACH;
  for (const it of items ?? []) {
    const d = distanceTo(it, x, y - 6, tileSize);
    if (d <= bestD) {
      best = it;
      bestD = d;
    }
  }
  return best;
}

export const DRINKS = {
  grog: { name: "Grog", color: 0xc98a3c, tipsy: true },
  rum: { name: "Captain's rum", color: 0x8a3c1c, tipsy: true },
  punch: { name: "Coconut punch", color: 0xf0e2c0, tipsy: false },
  lemonade: { name: "Sea-salt lemonade", color: 0xf2e36b, tipsy: false },
  beer: { name: "Beer", color: 0xe0a53a, tipsy: true },
  kraken: { name: "Kraken grog", color: 0x4a2464, tipsy: true },
  mermaid: { name: "Mermaid's kiss", color: 0x5fd3c4, tipsy: false },
} as const;
export type DrinkId = keyof typeof DRINKS;
export const BAR_MENU: DrinkId[] = ["grog", "rum", "punch", "lemonade"];
/** Unlocked by Brewing level 2. */
export const SECRET_MENU: DrinkId[] = ["kraken", "mermaid"];

export const GLOBE_PLACES = [
  "the Lantern Isles",
  "the Whispering Reefs",
  "a speck of ocean nobody has named",
  "Skull Rock",
  "the Sunken Market",
  "the Cape of Second Thoughts",
  "the Coral Gate",
];
