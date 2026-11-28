import type { Outfit } from "./outfits";

export type Direction = "up" | "down" | "left" | "right";

export const DIRECTIONS: readonly Direction[] = ["down", "left", "right", "up"];

/** Six palette-swapped character looks (BRIEF §4, PLAN §C `character_variant`). */
export const CHARACTER_VARIANT_COUNT = 6;

export type PlayerProfile = {
  username: string;
  characterVariant: number;
  outfit: Outfit;
};

export type PassengerProfile = {
  username: string;
  characterVariant: number;
  outfit: Outfit;
};

/** Where the player starts: their saved spot (on any map), or null for First Deck's spawn point. */
export type StartPosition = { mapId: string; x: number; y: number; direction: Direction } | null;

/** Called by the game to persist the position; `final` is true when the page is going away. */
export type PositionSaver = (position: SavedPosition, final: boolean) => void;

export type SavedPosition = {
  mapId: string;
  mapVersion: number;
  x: number;
  y: number;
  direction: Direction;
};
