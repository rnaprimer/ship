/**
 * Admin panel database functions and the public ship info endpoint, on a
 * throwaway ship. Covers BRIEF §11: stats, search, revoke, disable, pause.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cookieFrom, createTestShip, deleteTestShip, hasDb, mintCode, req } from "../../../test/db";
import {
  adminListInvites,
  adminOverview,
  adminRecentAudit,
  adminRevokeInvite,
  adminSearchPlayers,
  adminSetPlayerStatus,
  adminSetShipStatus,
} from "./rpc";
import { POST as redeem } from "@/app/api/boarding/redeem/route";
import { GET as me } from "@/app/api/me/route";
import { GET as passengers } from "@/app/api/ship/passengers/route";
import { GET as shipInfo } from "@/app/api/ship/route";
import { hashCode, normalizeCode } from "../boarding/code";
import { base64ToBytes } from "../security/crypto";

let ship = "";
const ACTOR = "owner@example.com";
let n = 0;

async function board(name: string) {
  const res = await redeem(req("/api/boarding/redeem", { body: { code: await mintCode(ship), username: name, characterVariant: 2 } }));
  if (res.status !== 201) throw new Error(`redeem ${res.status}`);
  const { data } = await admin().from("players").select("id").eq("ship_id", ship).eq("username", name).single();
  return { cookie: cookieFrom(res), id: data!.id as string };
}

async function inviteIdFor(code: string) {
  const hash = await hashCode(normalizeCode(code)!, base64ToBytes(process.env.CODE_PEPPER!));
  const { data } = await admin().from("boarding_invites").select("id").eq("code_hash", `\\x${hash}`).single();
  return data!.id as string;
}

describe.skipIf(!hasDb)("admin functions (database)", () => {
  beforeAll(async () => {
    ship = await createTestShip();
  });
  afterAll(async () => {
    if (ship) await deleteTestShip(ship);
  });

  it("overview counts players and invitations by status", async () => {
    await board(`alpha_${n++}`);
    await mintCode(ship);
    await mintCode(ship, { expiresAt: new Date(Date.now() - 1000) });
    const o = await adminOverview(ship);
    expect(o).toMatchObject({ ship_status: "active", players_active: 1, invites_redeemed: 1, invites_active: 1, invites_expired: 1 });
  });

  it("lists invitations by filter without any Instagram identifiers", async () => {
    const all = await adminListInvites(ship, "all", 50);
    expect(all.length).toBeGreaterThanOrEqual(3);
    for (const row of all) expect(Object.keys(row).sort()).toEqual(
      ["created_at", "delivery_attempts", "delivery_status", "expires_at", "id", "redeemed_at", "status", "username"].sort(),
    );
    expect(JSON.stringify(all)).not.toMatch(/test-account|test-user|test-comment|test-media/);
    expect((await adminListInvites(ship, "expired", 50)).every((r) => r.status === "expired")).toBe(true);
    expect((await adminListInvites(ship, "redeemed", 50)).every((r) => r.username)).toBe(true);
  });

  it("searches usernames case-insensitively and treats % and _ literally", async () => {
    await board(`Search_Me_${n++}`);
    await board(`searchXme_${n++}`);
    const hits = await adminSearchPlayers(ship, "SEARCH_ME", 50);
    expect(hits.map((p) => p.username)).toEqual([expect.stringMatching(/^Search_Me_/)]);
    expect(await adminSearchPlayers(ship, "%", 50)).toEqual([]);
    expect((await adminSearchPlayers(ship, "", 50)).length).toBeGreaterThanOrEqual(3);
  });

  it("disabling a player signs them out, hides them from passengers, and is audited; re-enabling restores the name", async () => {
    const victim = await board(`rude_${n++}`);
    const viewer = await board(`viewer_${n++}`);
    expect((await me(req("/api/me", { cookie: victim.cookie }))).status).toBe(200);

    expect(await adminSetPlayerStatus(ship, victim.id, "disabled", ACTOR)).toBe(true);
    expect((await me(req("/api/me", { cookie: victim.cookie }))).status).toBe(401);
    const list = await (await passengers(req("/api/ship/passengers", { cookie: viewer.cookie }))).json();
    expect(list.passengers.map((p: { username: string }) => p.username)).not.toContain(expect.stringMatching(/^rude_/));

    expect(await adminSetPlayerStatus(ship, victim.id, "active", ACTOR)).toBe(true);
    // Sessions stay revoked even after re-enabling.
    expect((await me(req("/api/me", { cookie: victim.cookie }))).status).toBe(401);
    const audit = await adminRecentAudit(ship, 10);
    expect(audit.map((a) => a.action)).toEqual(expect.arrayContaining(["player_disabled", "player_active"]));
    expect(audit[0].actor_email).toBe(ACTOR);
  });

  it("revoking an invitation makes its code unusable; only active invitations can be revoked", async () => {
    const code = await mintCode(ship);
    const id = await inviteIdFor(code);
    expect(await adminRevokeInvite(ship, id, ACTOR)).toBe("REVOKED");
    const res = await redeem(req("/api/boarding/redeem", { body: { code, username: `late_${n++}`, characterVariant: 0 } }));
    expect(res.status).toBe(410);
    expect(await res.json()).toEqual({ error: "REVOKED" });
    expect(await adminRevokeInvite(ship, id, ACTOR)).toBe("NOT_ACTIVE");
    expect(await adminRevokeInvite(ship, "00000000-0000-4000-8000-000000000000", ACTOR)).toBe("NOT_FOUND");
    const { data } = await admin().from("boarding_invites").select("code_ciphertext").eq("id", id).single();
    expect(data!.code_ciphertext).toBeNull();
  });

  it("pausing boarding blocks redemption and shows on the landing info; resuming reopens it", async () => {
    const code = await mintCode(ship);
    expect(await adminSetShipStatus(ship, "paused", ACTOR)).toBe(true);
    try {
      expect((await redeem(req("/api/boarding/redeem", { body: { code, username: `paused_${n++}`, characterVariant: 0 } }))).status).toBe(503);
      const info = await (await shipInfo()).json();
      expect(info.boardingOpen).toBe(false);
    } finally {
      expect(await adminSetShipStatus(ship, "active", ACTOR)).toBe(true);
    }
    expect((await redeem(req("/api/boarding/redeem", { body: { code, username: `resumed_${n++}`, characterVariant: 0 } }))).status).toBe(201);
    const actions = (await adminRecentAudit(ship, 5)).map((a) => a.action);
    expect(actions).toEqual(expect.arrayContaining(["boarding_paused", "boarding_resumed"]));
  });

  it("GET /api/ship returns name, boarding state and passenger count with a short CDN cache", async () => {
    const res = await shipInfo();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toMatch(/s-maxage=30/);
    const body = await res.json();
    expect(Object.keys(body).sort()).toEqual(["boardingOpen", "name", "passengers"]);
    expect(body.passengers).toBe((await adminOverview(ship)).players_active);
  });
});
