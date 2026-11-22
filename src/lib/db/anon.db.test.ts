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

  it.each(["ships", "players", "boarding_invites", "player_sessions", "player_positions", "processed_events", "rate_limits"])(
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
    ["touch_session", { p_token_hash: "0".repeat(64), p_renew_before: new Date().toISOString(), p_new_expires: new Date().toISOString() }],
    ["rate_limit_hit", { p_key: "x", p_window_seconds: 60, p_limit: 1 }],
    ["sample_passengers", { p_ship_id: "main", p_exclude_player: null, p_limit: 5 }],
    ["passenger_count", { p_ship_id: "main" }],
  ])("cannot call %s", async (fn, args) => {
    const { data, error } = await anon().rpc(fn, args);
    expect(error, fn).not.toBeNull();
    expect(data).toBeNull();
  });
});
