/**
 * "Attempts to call internal boarding APIs without authorization" (BRIEF §18),
 * at the database level: with the public (publishable) key, nothing can be
 * read, written or called. Only the server's secret key works.
 */
import { createClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { hasDb } from "../../../test/db";

const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!hasDb || !publishable)("anonymous access is denied", () => {
  const anon = () =>
    createClient(process.env.SUPABASE_URL!, publishable!, { auth: { persistSession: false, autoRefreshToken: false } });

  it.each(["ships", "players", "boarding_invites", "player_sessions", "player_positions", "processed_events", "rate_limits", "admin_audit"])(
    "cannot read or write %s",
    async (table) => {
      const read = await anon().from(table).select("*").limit(1);
      expect(read.error, `read ${table}`).not.toBeNull();
      const write = await anon().from(table).insert({});
      expect(write.error, `write ${table}`).not.toBeNull();
    },
  );

  it.each([
    ["check_invite", { p_ship_id: "main", p_code_hash: "0".repeat(64) }],
    ["issue_invite", {
      p_ship_id: "main", p_instagram_account_id: "a", p_instagram_user_id: "u", p_instagram_comment_id: "c",
      p_instagram_media_id: "m", p_code_hash: "0".repeat(64), p_code_ciphertext: "00", p_expires_at: new Date().toISOString(),
    }],
    ["redeem_invite", {
      p_ship_id: "main", p_code_hash: "0".repeat(64), p_username: "anon_user", p_character_variant: 0,
      p_session_hash: "0".repeat(64), p_session_expires: new Date().toISOString(), p_map_id: "ship-main",
      p_map_version: 1, p_spawn_x: 0, p_spawn_y: 0, p_spawn_direction: "up",
    }],
    ["set_outfit", { p_player_id: "00000000-0000-4000-8000-000000000000", p_character_variant: 0, p_crew_role: 1, p_outfit_color: 0, p_hat: 0 }],
    ["touch_session", { p_token_hash: "0".repeat(64), p_renew_before: new Date().toISOString(), p_new_expires: new Date().toISOString() }],
    ["save_position", {
      p_player_id: "00000000-0000-4000-8000-000000000000", p_map_id: "grand-lobby", p_map_version: 1, p_x: 0, p_y: 0,
      p_direction: "up", p_spawn_x: 0, p_spawn_y: 0, p_max_speed: 1000, p_slack: 1000, p_min_interval_ms: 0,
    }],
    ["rate_limit_hit", { p_key: "x", p_window_seconds: 60, p_limit: 1 }],
    ["sample_passengers", { p_ship_id: "main", p_exclude_player: null, p_limit: 5 }],
    ["passenger_count", { p_ship_id: "main" }],
    ["ship_public_info", { p_ship_id: "main" }],
    ["admin_overview", { p_ship_id: "main" }],
    ["admin_list_invites", { p_ship_id: "main", p_filter: "all", p_limit: 5 }],
    ["admin_search_players", { p_ship_id: "main", p_query: "", p_limit: 5 }],
    ["admin_set_ship_status", { p_ship_id: "main", p_status: "paused", p_actor: "anon" }],
    ["admin_revoke_invite", { p_ship_id: "main", p_invitation_id: "00000000-0000-4000-8000-000000000000", p_actor: "anon" }],
    ["admin_set_player_status", { p_ship_id: "main", p_player_id: "00000000-0000-4000-8000-000000000000", p_status: "disabled", p_actor: "anon" }],
    ["admin_recent_audit", { p_ship_id: "main", p_limit: 5 }],
    ["resume_with_code", { p_ship_id: "main", p_code_hash: "0".repeat(64), p_session_hash: "0".repeat(64), p_session_expires: new Date().toISOString() }],
    ["record_invite_delivery", { p_ship_id: "main", p_invitation_id: "00000000-0000-4000-8000-000000000000", p_outcome: "failed" }],
  ])("cannot call %s", async (fn, args) => {
    const { data, error } = await anon().rpc(fn, args);
    expect(error, fn).not.toBeNull();
    expect(data).toBeNull();
  });
});
