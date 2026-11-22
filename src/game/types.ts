export type Direction = "up" | "down" | "left" | "right";

export const DIRECTIONS: readonly Direction[] = ["down", "left", "right", "up"];

/** Six palette-swapped character looks (BRIEF §4, PLAN §C `character_variant`). */
export const CHARACTER_VARIANT_COUNT = 6;

export type PlayerProfile = {
  username: string;
  characterVariant: number;
};

export type PassengerProfile = {
  username: string;
  characterVariant: number;
};

export type SavedPosition = {
  mapId: string;
  mapVersion: number;
  x: number;
  y: number;
  direction: Direction;
};
