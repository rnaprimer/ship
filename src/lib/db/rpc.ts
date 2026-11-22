import "server-only";
import { z } from "zod";
import { db } from "./supabase";

/**
 * Typed wrappers around the Postgres functions in
 * supabase/migrations/*_boarding_schema.sql. Hash arguments are hex. Errors
 * are thrown without echoing arguments (which may include hashes).
 */
async function call<T>(fn: string, args: Record<string, unknown>, schema: z.ZodType<T>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw new Error(`Database call ${fn} failed: ${error.code ?? ""} ${error.message}`);
  return schema.parse(data);
}

export const CheckStatus = z.enum(["VALID", "INVALID", "REDEEMED", "REVOKED", "EXPIRED", "PAUSED"]);
export type CheckStatus = z.infer<typeof CheckStatus>;

export function checkInvite(shipId: string, codeHash: string) {
  return call("check_invite", { p_ship_id: shipId, p_code_hash: codeHash }, CheckStatus);
}

const RedeemResult = z.discriminatedUnion("status", [
  z.object({
    status: z.literal("OK"),
    player_id: z.uuid(),
    username: z.string(),
    character_variant: z.number().int(),
  }),
  z.object({ status: z.enum(["INVALID", "REDEEMED", "REVOKED", "EXPIRED", "PAUSED", "USERNAME_TAKEN"]) }),
]);
export type RedeemResult = z.infer<typeof RedeemResult>;

export function redeemInvite(args: {
  shipId: string;
  codeHash: string;
  username: string;
  characterVariant: number;
  sessionHash: string;
  sessionExpires: Date;
  mapId: string;
  mapVersion: number;
  spawn: { x: number; y: number; direction: string };
}) {
  return call(
    "redeem_invite",
    {
      p_ship_id: args.shipId,
      p_code_hash: args.codeHash,
      p_username: args.username,
      p_character_variant: args.characterVariant,
      p_session_hash: args.sessionHash,
      p_session_expires: args.sessionExpires.toISOString(),
      p_map_id: args.mapId,
      p_map_version: args.mapVersion,
      p_spawn_x: args.spawn.x,
      p_spawn_y: args.spawn.y,
      p_spawn_direction: args.spawn.direction,
    },
    RedeemResult,
  );
}

export const IssueResult = z.object({
  status: z.enum(["issued", "existing", "active_elsewhere", "already_boarded", "paused", "comment_used"]),
  invitation_id: z.uuid().optional(),
  code_ciphertext: z.string().optional(),
  expires_at: z.string().optional(),
});

export function issueInvite(args: {
  shipId: string;
  instagramAccountId: string;
  instagramUserId: string;
  instagramCommentId: string;
  instagramMediaId: string;
  codeHash: string;
  codeCiphertext: string;
  expiresAt: Date;
}) {
  return call(
    "issue_invite",
    {
      p_ship_id: args.shipId,
      p_instagram_account_id: args.instagramAccountId,
      p_instagram_user_id: args.instagramUserId,
      p_instagram_comment_id: args.instagramCommentId,
      p_instagram_media_id: args.instagramMediaId,
      p_code_hash: args.codeHash,
      p_code_ciphertext: args.codeCiphertext,
      p_expires_at: args.expiresAt.toISOString(),
    },
    IssueResult,
  );
}

const SessionPlayer = z
  .object({
    player_id: z.uuid(),
    ship_id: z.string(),
    username: z.string(),
    character_variant: z.number().int(),
    renewed: z.boolean(),
    expires_at: z.string(),
    position: z
      .object({
        map_id: z.string(),
        map_version: z.number().int(),
        x: z.number(),
        y: z.number(),
        direction: z.enum(["up", "down", "left", "right"]),
      })
      .nullable(),
  })
  .nullable();
export type SessionPlayer = NonNullable<z.infer<typeof SessionPlayer>>;

export function touchSession(tokenHash: string, renewBefore: Date, newExpires: Date) {
  return call(
    "touch_session",
    { p_token_hash: tokenHash, p_renew_before: renewBefore.toISOString(), p_new_expires: newExpires.toISOString() },
    SessionPlayer,
  );
}

export async function revokeSession(tokenHash: string): Promise<void> {
  const { error } = await db().rpc("revoke_session", { p_token_hash: tokenHash });
  if (error) throw new Error(`Database call revoke_session failed: ${error.code ?? ""}`);
}

export const SaveResult = z.enum(["OK", "TOO_SOON", "TOO_FAST"]);

export function savePosition(args: {
  playerId: string;
  mapId: string;
  mapVersion: number;
  x: number;
  y: number;
  direction: string;
  maxSpeed: number;
  slack: number;
  minIntervalMs: number;
}) {
  return call(
    "save_position",
    {
      p_player_id: args.playerId,
      p_map_id: args.mapId,
      p_map_version: args.mapVersion,
      p_x: args.x,
      p_y: args.y,
      p_direction: args.direction,
      p_max_speed: args.maxSpeed,
      p_slack: args.slack,
      p_min_interval_ms: args.minIntervalMs,
    },
    SaveResult,
  );
}

export function rateLimitHit(key: string, windowSeconds: number, limit: number) {
  return call("rate_limit_hit", { p_key: key, p_window_seconds: windowSeconds, p_limit: limit }, z.boolean());
}

export function rateLimitCount(key: string, windowSeconds: number) {
  return call("rate_limit_count", { p_key: key, p_window_seconds: windowSeconds }, z.number().int());
}

export function samplePassengers(shipId: string, excludePlayerId: string | null, limit: number) {
  return call(
    "sample_passengers",
    { p_ship_id: shipId, p_exclude_player: excludePlayerId, p_limit: limit },
    z.array(z.object({ username: z.string(), character_variant: z.number().int() })),
  );
}
