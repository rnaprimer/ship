import "server-only";
import { z } from "zod";
import { readSessionToken, renewBefore, sessionCookie, sessionExpiry, sessionTokenHash } from "../auth/session";
import { savePosition, touchSession, type SessionPlayer } from "../db/rpc";
import { getMap } from "@/game/maps";
import { isFootprintWalkable } from "@/game/systems/walkability";
import { PLAYER_SPEED } from "@/game/systems/movement";
import { serverEnv } from "../env";

export type AuthedPlayer = SessionPlayer & { setCookie?: string };

/**
 * Resolves the player from the session cookie. Returns null when there is
 * no valid, unexpired, unrevoked session for an active player on this ship.
 */
export async function authenticate(request: Request): Promise<AuthedPlayer | null> {
  const token = readSessionToken(request);
  if (!token) return null;
  const player = await touchSession(await sessionTokenHash(token), renewBefore(), sessionExpiry());
  if (!player || player.ship_id !== serverEnv().SHIP_ID) return null;
  return player.renewed
    ? { ...player, setCookie: sessionCookie(request, token, new Date(player.expires_at)) }
    : player;
}

/**
 * The saved position if its map still exists at the same version and the
 * spot is walkable; otherwise null (First Deck spawn).
 */
export function usablePosition(player: SessionPlayer) {
  const p = player.position;
  const map = p ? getMap(p.map_id) : null;
  if (!p || !map || p.map_version !== map.mapVersion) return null;
  if (!isFootprintWalkable(map, p.x, p.y)) return null;
  return { mapId: map.mapId, x: p.x, y: p.y, direction: p.direction };
}

/** Body of POST /api/me/position. Strict: unknown keys (e.g. a playerId) are rejected. */
export const PositionBody = z
  .object({
    mapId: z.string().max(40),
    mapVersion: z.number().int(),
    x: z.number().finite(),
    y: z.number().finite(),
    direction: z.enum(["up", "down", "left", "right"]),
  })
  .strict();

export const POSITION_RULES = {
  /** Allowed speed: the real walking speed plus 25% for timing jitter. */
  maxSpeed: PLAYER_SPEED * 1.25,
  /** Extra pixels allowed on top of speed × time (about three tiles). */
  slack: 48,
  minIntervalMs: 1000,
};

export type PositionError = "WRONG_MAP" | "NOT_WALKABLE" | "TOO_SOON" | "TOO_FAST";

export async function savePlayerPosition(
  playerId: string,
  body: z.infer<typeof PositionBody>,
): Promise<{ ok: true } | { ok: false; error: PositionError }> {
  const map = getMap(body.mapId);
  if (!map || body.mapVersion !== map.mapVersion) return { ok: false, error: "WRONG_MAP" };
  if (!isFootprintWalkable(map, body.x, body.y)) return { ok: false, error: "NOT_WALKABLE" };
  const result = await savePosition({
    playerId,
    mapId: body.mapId,
    mapVersion: body.mapVersion,
    x: body.x,
    y: body.y,
    direction: body.direction,
    spawnX: map.spawn.x,
    spawnY: map.spawn.y,
    ...POSITION_RULES,
  });
  return result === "OK" ? { ok: true } : { ok: false, error: result };
}
