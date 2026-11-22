import { DIRECTIONS, type Direction, type SavedPosition } from "../types";
import { isFootprintWalkable, type WalkableMap } from "./walkability";

/**
 * Milestone 1 mock: the last position lives in localStorage. Milestone 2
 * replaces this with authenticated saves to `/api/me/position`, validated
 * server-side against the same walkability grid. Only position data is
 * stored here, never credentials.
 */
export const POSITION_STORAGE_KEY = "internet-ship:position";

type StorageLike = Pick<Storage, "getItem" | "setItem">;

function isDirection(value: unknown): value is Direction {
  return typeof value === "string" && (DIRECTIONS as readonly string[]).includes(value);
}

/**
 * Returns the saved position only if it is well-formed, for this map and map
 * version, and standing on walkable tiles. Otherwise null (use the spawn).
 */
export function parseSavedPosition(raw: string | null, map: WalkableMap): SavedPosition | null {
  if (!raw) return null;
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof value !== "object" || value === null) return null;
  const v = value as Record<string, unknown>;
  if (v.mapId !== map.mapId || v.mapVersion !== map.mapVersion) return null;
  if (typeof v.x !== "number" || typeof v.y !== "number" || !isDirection(v.direction)) return null;
  if (!isFootprintWalkable(map, v.x, v.y)) return null;
  return { mapId: map.mapId, mapVersion: map.mapVersion, x: v.x, y: v.y, direction: v.direction };
}

export function loadPosition(storage: StorageLike | undefined, map: WalkableMap): SavedPosition | null {
  try {
    return parseSavedPosition(storage?.getItem(POSITION_STORAGE_KEY) ?? null, map);
  } catch {
    return null; // storage can throw (private mode, blocked site data)
  }
}

export function savePosition(storage: StorageLike | undefined, position: SavedPosition): void {
  try {
    storage?.setItem(
      POSITION_STORAGE_KEY,
      JSON.stringify({ ...position, x: Math.round(position.x), y: Math.round(position.y) }),
    );
  } catch {
    // Best effort only.
  }
}
