/**
 * Integration tests for sessions and position saves (BRIEF §18: expired
 * session, invalid movement coordinates, updating another player's position).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cookieFrom, createTestShip, deleteTestShip, hasDb, mintCode, req, sleep } from "../../../../test/db";
import { POST as redeem } from "../boarding/redeem/route";
import { GET as me } from "./route";
import { POST as savePos } from "./position/route";
import { POST as logout } from "../logout/route";
import { GET as passengers } from "../ship/passengers/route";
import { newSessionToken, sessionTokenHash } from "@/lib/auth/session";
import { MAPS, SHIP_MAP } from "@/game/maps";

let ship = "";
let n = 0;

async function board(prefix = "walker") {
  const username = `${prefix}_${Date.now() % 100000}_${n++}`;
  const res = await redeem(req("/api/boarding/redeem", { body: { code: await mintCode(ship), username, characterVariant: 1 } }));
  if (res.status !== 201) throw new Error(`redeem ${res.status}`);
  const { data } = await admin().from("players").select("id").eq("ship_id", ship).eq("username", username).single();
  return { cookie: cookieFrom(res), username, playerId: data!.id as string };
}

const pos = (x: number, y: number, extra: Record<string, unknown> = {}) => ({
  mapId: SHIP_MAP.mapId,
  mapVersion: SHIP_MAP.mapVersion,
  x,
  y,
  direction: "left",
  ...extra,
});
const spawn = SHIP_MAP.spawn;

describe.skipIf(!hasDb)("sessions and positions (database)", () => {
  beforeAll(async () => {
    ship = await createTestShip();
  });
  afterAll(async () => {
    if (ship) await deleteTestShip(ship);
  });

  describe("GET /api/me", () => {
    it("is 401 without a cookie or with a forged one", async () => {
      expect((await me(req("/api/me"))).status).toBe(401);
      expect((await me(req("/api/me", { cookie: `ship_session=${newSessionToken()}` }))).status).toBe(401);
      expect((await me(req("/api/me", { cookie: "ship_session=../../etc" }))).status).toBe(401);
    });

    it("is 401 for an expired session", async () => {
      const { playerId } = await board();
      const token = newSessionToken();
      await admin()
        .from("player_sessions")
        .insert({ player_id: playerId, token_hash: `\\x${await sessionTokenHash(token)}`, expires_at: new Date(Date.now() - 1000).toISOString() });
      expect((await me(req("/api/me", { cookie: `ship_session=${token}` }))).status).toBe(401);
    });

    it("renews a session that is more than a day old (rolling expiry)", async () => {
      const { playerId } = await board();
      const token = newSessionToken();
      const hash = await sessionTokenHash(token);
      await admin()
        .from("player_sessions")
        .insert({ player_id: playerId, token_hash: `\\x${hash}`, expires_at: new Date(Date.now() + 2 * 86_400_000).toISOString() });
      const res = await me(req("/api/me", { cookie: `ship_session=${token}` }));
      expect(res.status).toBe(200);
      expect(res.headers.get("set-cookie")).toMatch(/Max-Age=25\d{5}/); // ~30 days
      const { data } = await admin().from("player_sessions").select("expires_at").eq("token_hash", `\\x${hash}`).single();
      expect(new Date(data!.expires_at).getTime()).toBeGreaterThan(Date.now() + 29 * 86_400_000);
    });

    it("is 401 after logout (revoked server-side) and for a disabled player", async () => {
      const a = await board();
      const out = await logout(req("/api/logout", { method: "POST", cookie: a.cookie }));
      expect(out.status).toBe(204);
      expect(out.headers.get("set-cookie")).toMatch(/Max-Age=0/);
      expect((await me(req("/api/me", { cookie: a.cookie }))).status).toBe(401);

      const b = await board();
      await admin().from("players").update({ status: "disabled" }).eq("id", b.playerId);
      expect((await me(req("/api/me", { cookie: b.cookie }))).status).toBe(401);
    });
  });

  describe("POST /api/me/position", () => {
    it("saves a valid move and returns it from /api/me", async () => {
      const a = await board();
      await sleep(1100);
      const res = await savePos(req("/api/me/position", { body: pos(spawn.x, spawn.y - 30), cookie: a.cookie }));
      expect(res.status).toBe(204);
      const body = await (await me(req("/api/me", { cookie: a.cookie }))).json();
      expect(body.position).toEqual({ mapId: SHIP_MAP.mapId, x: spawn.x, y: spawn.y - 30, direction: "left" });
    });

    it("rejects saves too close together", async () => {
      const a = await board();
      const res = await savePos(req("/api/me/position", { body: pos(spawn.x, spawn.y - 10), cookie: a.cookie }));
      expect(res.status).toBe(429);
    });

    it("rejects invalid coordinates: ocean, furniture, off-map, non-numbers, wrong map", async () => {
      const a = await board();
      await sleep(1100);
      const cases: Array<[unknown, number]> = [
        [pos(5, 5), 422], // ocean
        [pos(7 * 16 + 8, 11 * 16 + 12), 422], // ship's wheel
        [pos(-50, 99999), 422],
        [{ ...pos(0, 0), x: "240" }, 400],
        [{ ...pos(0, 0), x: null }, 400],
        [{ ...pos(0, 0), direction: "diagonal" }, 400],
        [pos(spawn.x, spawn.y, { mapVersion: SHIP_MAP.mapVersion + 1 }), 409],
        [pos(spawn.x, spawn.y, { mapId: "captains-vault" }), 409], // no such map
        [pos(spawn.x, spawn.y, { mapId: "__proto__" }), 409],
        [pos(5, 5, { mapId: "grand-lobby", mapVersion: 1 }), 422], // the lobby's wall
      ];
      for (const [body, status] of cases) {
        const res = await savePos(req("/api/me/position", { body, cookie: a.cookie }));
        expect(res.status, JSON.stringify(body)).toBe(status);
      }
      const r = await savePos(req("/api/me/position", { rawBody: '{"x": NaN}', cookie: a.cookie }));
      expect(r.status).toBe(400);
    });

    it("rejects moves faster than walking speed (teleports)", async () => {
      const a = await board();
      await sleep(1100);
      const bow = { x: 41 * 16 + 8, y: 9 * 16 + 12 };
      const res = await savePos(req("/api/me/position", { body: pos(bow.x, bow.y), cookie: a.cookie }));
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: "TOO_FAST" });
    });

    it("saves a trip to another map, arriving at that map's spawn", async () => {
      const a = await board();
      const lobby = MAPS["grand-lobby"];
      await sleep(1100);
      const res = await savePos(
        req("/api/me/position", { body: pos(lobby.spawn.x, lobby.spawn.y - 16, { mapId: lobby.mapId, mapVersion: lobby.mapVersion }), cookie: a.cookie }),
      );
      expect(res.status).toBe(204);
      const body = await (await me(req("/api/me", { cookie: a.cookie }))).json();
      expect(body.position).toEqual({ mapId: lobby.mapId, x: lobby.spawn.x, y: lobby.spawn.y - 16, direction: "left" });
    });

    it("rejects a map hop that lands far from the new map's spawn (teleport via travel)", async () => {
      const a = await board();
      const pool = MAPS["swimming-pool"];
      await sleep(1100);
      // A walkable corner of the pool deck, far from its spawn at the bottom middle.
      const corner = { x: 3 * 16 + 8, y: 3 * 16 + 12 };
      const res = await savePos(
        req("/api/me/position", { body: pos(corner.x, corner.y, { mapId: pool.mapId, mapVersion: pool.mapVersion }), cookie: a.cookie }),
      );
      expect(res.status).toBe(422);
      expect(await res.json()).toEqual({ error: "TOO_FAST" });
    });

    it("cannot update another player's position", async () => {
      const a = await board("alice");
      const b = await board("bob");
      await sleep(1100);
      // No session at all.
      expect((await savePos(req("/api/me/position", { body: pos(spawn.x, spawn.y - 20) }))).status).toBe(401);
      // Naming the other player in the body is rejected outright.
      const named = await savePos(req("/api/me/position", { body: { ...pos(spawn.x, spawn.y - 20), playerId: b.playerId }, cookie: a.cookie }));
      expect(named.status).toBe(400);
      // Cross-site request with a's cookie is refused.
      expect((await savePos(req("/api/me/position", { body: pos(spawn.x, spawn.y - 20), cookie: a.cookie, origin: "https://evil.example" }))).status).toBe(403);
      // A valid save with a's cookie only moves a.
      expect((await savePos(req("/api/me/position", { body: pos(spawn.x, spawn.y - 20), cookie: a.cookie }))).status).toBe(204);
      const { data } = await admin().from("player_positions").select("player_id, x, y").in("player_id", [a.playerId, b.playerId]);
      const byId = Object.fromEntries(data!.map((r) => [r.player_id, r]));
      expect(byId[a.playerId]).toMatchObject({ x: spawn.x, y: spawn.y - 20 });
      expect(byId[b.playerId]).toMatchObject({ x: spawn.x, y: spawn.y });
    });

    it("falls back to spawn when the stored position is no longer walkable", async () => {
      const a = await board();
      await admin().from("player_positions").update({ x: 5, y: 5 }).eq("player_id", a.playerId);
      const body = await (await me(req("/api/me", { cookie: a.cookie }))).json();
      expect(body.position).toBeNull();
    });
  });

  describe("GET /api/ship/passengers", () => {
    it("lists other passengers by username and look only, excluding the caller", async () => {
      const a = await board("listed");
      await board("other");
      const res = await passengers(req("/api/ship/passengers", { cookie: a.cookie }));
      const body = await res.json();
      expect(body.passengers.length).toBeGreaterThan(0);
      for (const p of body.passengers) expect(Object.keys(p).sort()).toEqual(["characterVariant", "username"]);
      expect(body.passengers.map((p: { username: string }) => p.username)).not.toContain(a.username);
    });
  });
});
