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

export function recordInviteDelivery(shipId: string, invitationId: string, outcome: "delivered" | "unconfirmed" | "failed") {
  return call(
    "record_invite_delivery",
    { p_ship_id: shipId, p_invitation_id: invitationId, p_outcome: outcome },
    z.boolean(),
  );
}

// --- Milestone 5: landing page and admin panel ---------------------------

export const ShipPublicInfo = z.object({ name: z.string(), boarding_open: z.boolean(), passengers: z.number().int() }).nullable();

export function shipPublicInfo(shipId: string) {
  return call("ship_public_info", { p_ship_id: shipId }, ShipPublicInfo);
}

export const AdminOverview = z.object({
  ship_status: z.enum(["active", "paused"]).nullable(),
  players_active: z.number().int(),
  players_disabled: z.number().int(),
  invites_active: z.number().int(),
  invites_redeemed: z.number().int(),
  invites_expired: z.number().int(),
  invites_revoked: z.number().int(),
  delivery_failed: z.number().int(),
  delivery_unconfirmed: z.number().int(),
  delivery_pending: z.number().int(),
});
export type AdminOverview = z.infer<typeof AdminOverview>;

export function adminOverview(shipId: string) {
  return call("admin_overview", { p_ship_id: shipId }, AdminOverview);
}

export const INVITE_FILTERS = ["all", "active", "redeemed", "expired", "revoked", "delivery_problems"] as const;
export type InviteFilter = (typeof INVITE_FILTERS)[number];

const AdminInvite = z.object({
  id: z.uuid(),
  status: z.string(),
  delivery_status: z.string(),
  delivery_attempts: z.number().int(),
  created_at: z.string(),
  expires_at: z.string(),
  redeemed_at: z.string().nullable(),
  username: z.string().nullable(),
});
export type AdminInvite = z.infer<typeof AdminInvite>;

export function adminListInvites(shipId: string, filter: InviteFilter, limit = 100) {
  return call("admin_list_invites", { p_ship_id: shipId, p_filter: filter, p_limit: limit }, z.array(AdminInvite));
}

const AdminPlayer = z.object({
  id: z.uuid(),
  username: z.string(),
  status: z.enum(["active", "disabled"]),
  character_variant: z.number().int(),
  joined_at: z.string(),
  last_seen_at: z.string().nullable(),
});
export type AdminPlayer = z.infer<typeof AdminPlayer>;

export function adminSearchPlayers(shipId: string, query: string, limit = 100) {
  return call("admin_search_players", { p_ship_id: shipId, p_query: query, p_limit: limit }, z.array(AdminPlayer));
}

export function adminSetPlayerStatus(shipId: string, playerId: string, status: "active" | "disabled", actor: string) {
  return call(
    "admin_set_player_status",
    { p_ship_id: shipId, p_player_id: playerId, p_status: status, p_actor: actor },
    z.boolean(),
  );
}

export function adminRevokeInvite(shipId: string, invitationId: string, actor: string) {
  return call(
    "admin_revoke_invite",
    { p_ship_id: shipId, p_invitation_id: invitationId, p_actor: actor },
    z.enum(["REVOKED", "NOT_ACTIVE", "NOT_FOUND"]),
  );
}

export function adminSetShipStatus(shipId: string, status: "active" | "paused", actor: string) {
  return call("admin_set_ship_status", { p_ship_id: shipId, p_status: status, p_actor: actor }, z.boolean());
}

const AuditRow = z.object({ actor_email: z.string(), action: z.string(), target: z.string().nullable(), created_at: z.string() });
export type AuditRow = z.infer<typeof AuditRow>;

export function adminRecentAudit(shipId: string, limit = 20) {
  return call("admin_recent_audit", { p_ship_id: shipId, p_limit: limit }, z.array(AuditRow));
}

// --- Returning players: a redeemed code signs back in to its character ---

const ResumeResult = z.discriminatedUnion("status", [
  z.object({ status: z.literal("OK"), username: z.string(), character_variant: z.number().int() }),
  z.object({ status: z.enum(["INVALID", "NOT_BOARDED", "DISABLED"]) }),
]);

export function resumeWithCode(shipId: string, codeHash: string, sessionHash: string, sessionExpires: Date) {
  return call(
    "resume_with_code",
    { p_ship_id: shipId, p_code_hash: codeHash, p_session_hash: sessionHash, p_session_expires: sessionExpires.toISOString() },
    ResumeResult,
  );
}
