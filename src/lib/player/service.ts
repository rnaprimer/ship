import "server-only";
import { z } from "zod";
import { readSessionToken, renewBefore, sessionCookie, sessionExpiry, sessionTokenHash } from "../auth/session";
import { savePosition, touchSession, type SessionPlayer } from "../db/rpc";
import { SHIP_MAP } from "@/game/maps";
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

/** The saved position if it is still valid for the current map; otherwise null (spawn). */
export function usablePosition(player: SessionPlayer) {
  const p = player.position;
  if (!p || p.map_id !== SHIP_MAP.mapId || p.map_version !== SHIP_MAP.mapVersion) return null;
  if (!isFootprintWalkable(SHIP_MAP, p.x, p.y)) return null;
  return { x: p.x, y: p.y, direction: p.direction };
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
  if (body.mapId !== SHIP_MAP.mapId || body.mapVersion !== SHIP_MAP.mapVersion) return { ok: false, error: "WRONG_MAP" };
  if (!isFootprintWalkable(SHIP_MAP, body.x, body.y)) return { ok: false, error: "NOT_WALKABLE" };
  const result = await savePosition({
    playerId,
    mapId: body.mapId,
    mapVersion: body.mapVersion,
    x: body.x,
    y: body.y,
    direction: body.direction,
    ...POSITION_RULES,
  });
  return result === "OK" ? { ok: true } : { ok: false, error: result };
}
