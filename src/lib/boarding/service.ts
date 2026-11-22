import "server-only";
import { normalizeCode, hashCode } from "./code";
import { checkUsername } from "./username";
import { checkInvite, rateLimitCount, rateLimitHit, redeemInvite } from "../db/rpc";
import { secrets, serverEnv } from "../env";
import { newSessionToken, sessionExpiry, sessionTokenHash } from "../auth/session";
import { SHIP_MAP } from "@/game/maps";

/**
 * Boarding flow orchestration with brute-force protection:
 *   - every boarding request counts against a per-IP budget;
 *   - wrong codes count against a tighter per-IP failure budget, checked
 *     before touching the code;
 *   - wrong codes also count against a ship-wide failure budget, a circuit
 *     breaker in case an attacker spreads guesses across many IPs.
 * With 80-bit codes, guessing is hopeless anyway; these limits keep it so.
 */
const WINDOW_S = 600;
export const LIMITS = {
  requestsPerIp: 60,
  failuresPerIp: 10,
  failuresGlobal: 1000,
};

export type BoardingError =
  | "INVALID"
  | "REDEEMED"
  | "REVOKED"
  | "EXPIRED"
  | "PAUSED"
  | "RATE_LIMITED"
  | "USERNAME_TAKEN"
  | "USERNAME_REJECTED";

const keys = (shipId: string, ip: string) => ({
  requests: `${shipId}:ip_req:${ip}`,
  ipFailures: `${shipId}:ip_fail:${ip}`,
  globalFailures: `${shipId}:global:redeem_fail`,
});

async function guard(shipId: string, ip: string): Promise<boolean> {
  const k = keys(shipId, ip);
  const allowed = await rateLimitHit(k.requests, WINDOW_S, LIMITS.requestsPerIp);
  if (!allowed) return false;
  const [ipFails, globalFails] = await Promise.all([
    rateLimitCount(k.ipFailures, WINDOW_S),
    rateLimitCount(k.globalFailures, WINDOW_S),
  ]);
  return ipFails < LIMITS.failuresPerIp && globalFails < LIMITS.failuresGlobal;
}

async function recordFailure(shipId: string, ip: string) {
  const k = keys(shipId, ip);
  await Promise.all([
    rateLimitHit(k.ipFailures, WINDOW_S, LIMITS.failuresPerIp),
    rateLimitHit(k.globalFailures, WINDOW_S, LIMITS.failuresGlobal),
  ]);
}

/** Checks a code without consuming it. */
export async function validateCode(rawCode: unknown, ip: string): Promise<{ ok: true } | { ok: false; error: BoardingError }> {
  const shipId = serverEnv().SHIP_ID;
  if (!(await guard(shipId, ip))) return { ok: false, error: "RATE_LIMITED" };
  const normalized = typeof rawCode === "string" ? normalizeCode(rawCode) : null;
  if (!normalized) {
    await recordFailure(shipId, ip);
    return { ok: false, error: "INVALID" };
  }
  const status = await checkInvite(shipId, await hashCode(normalized, secrets().pepper));
  if (status === "VALID") return { ok: true };
  if (status === "INVALID") await recordFailure(shipId, ip);
  return { ok: false, error: status };
}

export type RedeemOutcome =
  | { ok: true; sessionToken: string; sessionExpires: Date; player: { username: string; characterVariant: number } }
  | { ok: false; error: BoardingError; message?: string };

/** Atomically consumes the code and creates the player and session. */
export async function redeemCode(
  input: { code: unknown; username: unknown; characterVariant: number },
  ip: string,
): Promise<RedeemOutcome> {
  const shipId = serverEnv().SHIP_ID;
  // Username problems are the player's to fix and say nothing about the code.
  const name = checkUsername(input.username);
  if (!name.ok) return { ok: false, error: "USERNAME_REJECTED", message: name.reason };

  if (!(await guard(shipId, ip))) return { ok: false, error: "RATE_LIMITED" };
  const normalized = typeof input.code === "string" ? normalizeCode(input.code) : null;
  if (!normalized) {
    await recordFailure(shipId, ip);
    return { ok: false, error: "INVALID" };
  }

  const sessionToken = newSessionToken();
  const sessionExpires = sessionExpiry();
  const result = await redeemInvite({
    shipId,
    codeHash: await hashCode(normalized, secrets().pepper),
    username: name.username,
    characterVariant: input.characterVariant,
    sessionHash: await sessionTokenHash(sessionToken),
    sessionExpires,
    mapId: SHIP_MAP.mapId,
    mapVersion: SHIP_MAP.mapVersion,
    spawn: SHIP_MAP.spawn,
  });

  if (result.status === "OK") {
    return {
      ok: true,
      sessionToken,
      sessionExpires,
      player: { username: result.username, characterVariant: result.character_variant },
    };
  }
  if (result.status === "INVALID") await recordFailure(shipId, ip);
  return { ok: false, error: result.status };
}
