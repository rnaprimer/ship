/**
 * Integration tests for boarding (BRIEF §18 negative tests + the Milestone 2
 * "done when": a test code redeems exactly once, including under concurrency).
 * Runs the real route handlers against the Supabase project in .env.local,
 * on a throwaway ship.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cookieFrom, createTestShip, deleteTestShip, freshIp, hasDb, mintCode, req } from "../../../../test/db";
import { POST as validate } from "./validate/route";
import { POST as redeem } from "./redeem/route";
import { GET as me } from "../me/route";
import { hashCode, normalizeCode } from "@/lib/boarding/code";
import { aesGcmDecryptHex, base64ToBytes } from "@/lib/security/crypto";
import { LIMITS } from "@/lib/boarding/service";

let ship = "";
let n = 0;
const name = (prefix = "sailor") => `${prefix}_${Date.now() % 100000}_${n++}`;
const redeemBody = (code: string, username = name()) => ({ code, username, characterVariant: 2 });

describe.skipIf(!hasDb)("boarding (database)", () => {
  beforeAll(async () => {
    ship = await createTestShip();
  });
  afterAll(async () => {
    if (ship) await deleteTestShip(ship);
  });

  describe("validate", () => {
    it("accepts a valid code in any spelling without consuming it", async () => {
      const code = await mintCode(ship);
      for (const spelling of [code, code.toLowerCase(), code.replace(/-/g, " ")]) {
        const res = await validate(req("/api/boarding/validate", { body: { code: spelling } }));
        expect(res.status).toBe(200);
      }
      const res = await redeem(req("/api/boarding/redeem", { body: redeemBody(code) }));
      expect(res.status).toBe(201);
    });

    it("rejects a wrong code", async () => {
      const res = await validate(req("/api/boarding/validate", { body: { code: "AAAA-BBBB-CCCC-DDDD" } }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: "INVALID" });
    });

    it("rejects malformed codes without a database lookup", async () => {
      for (const code of ["", "short", "UUUU-UUUU-UUUU-UUUU", "x".repeat(64)]) {
        const res = await validate(req("/api/boarding/validate", { body: { code } }));
        expect(res.status).toBe(400);
      }
    });

    it("rejects an expired code", async () => {
      const code = await mintCode(ship, { expiresAt: new Date(Date.now() - 60_000) });
      const v = await validate(req("/api/boarding/validate", { body: { code } }));
      expect(v.status).toBe(410);
      expect(await v.json()).toEqual({ error: "EXPIRED" });
      const r = await redeem(req("/api/boarding/redeem", { body: redeemBody(code) }));
      expect(r.status).toBe(410);
      const { data } = await admin().from("players").select("id").eq("ship_id", ship).eq("username", "never");
      expect(data).toEqual([]);
    });

    it("rejects cross-origin and Origin-less requests, and unexpected fields", async () => {
      const code = await mintCode(ship);
      expect((await validate(req("/api/boarding/validate", { body: { code }, origin: "https://evil.example" }))).status).toBe(403);
      expect((await validate(req("/api/boarding/validate", { body: { code }, origin: null }))).status).toBe(403);
      expect((await validate(req("/api/boarding/validate", { body: { code, extra: 1 } }))).status).toBe(400);
      expect((await validate(req("/api/boarding/validate", { rawBody: "{not json" }))).status).toBe(400);
    });
  });

  describe("redeem", () => {
    it("creates the player, sets a secure session cookie, and consumes the code", async () => {
      const code = await mintCode(ship);
      const username = name("Captain_Ana");
      const res = await redeem(req("/api/boarding/redeem", { body: { code, username, characterVariant: 4 } }));
      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ player: { username, characterVariant: 4 } });
      const setCookie = res.headers.get("set-cookie")!;
      expect(setCookie).toMatch(/HttpOnly/);
      expect(setCookie).toMatch(/SameSite=Lax/);

      const meRes = await me(req("/api/me", { cookie: cookieFrom(res) }));
      expect(meRes.status).toBe(200);
      expect(await meRes.json()).toMatchObject({ player: { username, characterVariant: 4 }, position: { direction: "up" } });

      // Stored as hash only; ciphertext dropped on redemption.
      const pepper = base64ToBytes(process.env.CODE_PEPPER!);
      const hash = await hashCode(normalizeCode(code)!, pepper);
      const { data } = await admin()
        .from("boarding_invites")
        .select("status, code_hash, code_ciphertext, player_id")
        .eq("code_hash", `\\x${hash}`)
        .single();
      expect(data).toMatchObject({ status: "redeemed", code_ciphertext: null });
      expect(data!.player_id).toBeTruthy();
    });

    it("rejects a previously redeemed code", async () => {
      const code = await mintCode(ship);
      expect((await redeem(req("/api/boarding/redeem", { body: redeemBody(code) }))).status).toBe(201);
      const again = await redeem(req("/api/boarding/redeem", { body: redeemBody(code) }));
      expect(again.status).toBe(409);
      expect(await again.json()).toEqual({ error: "REDEEMED" });
      expect(again.headers.get("set-cookie")).toBeNull();
      const v = await validate(req("/api/boarding/validate", { body: { code } }));
      expect(await v.json()).toEqual({ error: "REDEEMED" });
    });

    it("rejects a wrong code without creating anything", async () => {
      const username = name("ghost");
      const res = await redeem(req("/api/boarding/redeem", { body: redeemBody("ZZZZ-ZZZZ-ZZZZ-ZZZZ", username) }));
      expect(res.status).toBe(400);
      const { data } = await admin().from("players").select("id").eq("ship_id", ship).eq("username", username);
      expect(data).toEqual([]);
    });

    it("treats usernames case-insensitively, and a taken name leaves the code unused", async () => {
      const [a, b] = [await mintCode(ship), await mintCode(ship)];
      const base = name("SeaDog");
      expect((await redeem(req("/api/boarding/redeem", { body: redeemBody(a, base) }))).status).toBe(201);

      const clash = await redeem(req("/api/boarding/redeem", { body: redeemBody(b, base.toLowerCase()) }));
      expect(clash.status).toBe(409);
      expect(await clash.json()).toEqual({ error: "USERNAME_TAKEN" });
      expect((await validate(req("/api/boarding/validate", { body: { code: b } }))).status).toBe(200);

      expect((await redeem(req("/api/boarding/redeem", { body: redeemBody(b, `${base}_2`) }))).status).toBe(201);
    });

    it("rejects invalid usernames before touching the code", async () => {
      const code = await mintCode(ship);
      for (const username of ["ab", "admin", "has space", "Sh1t_lord"]) {
        const res = await redeem(req("/api/boarding/redeem", { body: redeemBody(code, username) }));
        expect(res.status).toBe(422);
        expect((await res.json()).error).toBe("USERNAME_REJECTED");
      }
      expect((await validate(req("/api/boarding/validate", { body: { code } }))).status).toBe(200);
    });

    it("rejects out-of-range character variants and extra fields", async () => {
      const code = await mintCode(ship);
      expect((await redeem(req("/api/boarding/redeem", { body: { code, username: name(), characterVariant: 6 } }))).status).toBe(400);
      expect((await redeem(req("/api/boarding/redeem", { body: { ...redeemBody(code), playerId: "x" } }))).status).toBe(400);
    });
  });

  describe("concurrency (done-when)", () => {
    it("redeems one code exactly once when 12 requests race", async () => {
      const code = await mintCode(ship);
      const responses = await Promise.all(
        Array.from({ length: 12 }, (_, i) => redeem(req("/api/boarding/redeem", { body: redeemBody(code, name(`racer${i}`)) }))),
      );
      const statuses = responses.map((r) => r.status).sort();
      expect(statuses.filter((s) => s === 201)).toHaveLength(1);
      expect(statuses.filter((s) => s === 409)).toHaveLength(11);
      for (const r of responses.filter((r) => r.status === 409)) expect(await r.json()).toEqual({ error: "REDEEMED" });
      expect(responses.filter((r) => r.headers.get("set-cookie"))).toHaveLength(1);

      const hash = await hashCode(normalizeCode(code)!, base64ToBytes(process.env.CODE_PEPPER!));
      const { data: inv } = await admin().from("boarding_invites").select("player_id").eq("code_hash", `\\x${hash}`).single();
      const { data: players } = await admin().from("players").select("id").eq("ship_id", ship).like("username", "racer%");
      expect(players).toHaveLength(1);
      expect(players![0].id).toBe(inv!.player_id);
    });

    it("gives a contested username to exactly one of two codes", async () => {
      const codes = await Promise.all(Array.from({ length: 6 }, () => mintCode(ship)));
      const contested = name("Popular");
      const responses = await Promise.all(codes.map((code) => redeem(req("/api/boarding/redeem", { body: redeemBody(code, contested) }))));
      expect(responses.filter((r) => r.status === 201)).toHaveLength(1);
      expect(responses.filter((r) => r.status === 409)).toHaveLength(5);
      // The losers' codes are still unused.
      const loserCodes = codes.filter((_, i) => responses[i].status === 409);
      for (const code of loserCodes) expect((await validate(req("/api/boarding/validate", { body: { code } }))).status).toBe(200);
    });
  });

  describe("brute-force protection", () => {
    it("locks an IP out after repeated wrong codes, even for a valid code; other IPs are unaffected", async () => {
      const ip = freshIp();
      for (let i = 0; i < LIMITS.failuresPerIp; i++) {
        const res = await validate(req("/api/boarding/validate", { body: { code: "AAAA-AAAA-AAAA-AAA" + "A" }, ip }));
        expect(res.status).toBe(400);
      }
      const good = await mintCode(ship);
      const blocked = await validate(req("/api/boarding/validate", { body: { code: good }, ip }));
      expect(blocked.status).toBe(429);
      expect(await blocked.json()).toEqual({ error: "RATE_LIMITED" });
      expect((await redeem(req("/api/boarding/redeem", { body: redeemBody(good), ip }))).status).toBe(429);
      expect((await validate(req("/api/boarding/validate", { body: { code: good } }))).status).toBe(200);
    });
  });

  describe("paused ship", () => {
    it("refuses boarding while paused", async () => {
      const code = await mintCode(ship);
      await admin().from("ships").update({ status: "paused" }).eq("id", ship);
      try {
        const v = await validate(req("/api/boarding/validate", { body: { code } }));
        expect(v.status).toBe(503);
        expect((await redeem(req("/api/boarding/redeem", { body: redeemBody(code) }))).status).toBe(503);
      } finally {
        await admin().from("ships").update({ status: "active" }).eq("id", ship);
      }
      expect((await redeem(req("/api/boarding/redeem", { body: redeemBody(code) }))).status).toBe(201);
    });
  });

  describe("storage", () => {
    it("keeps only the hash and an encrypted copy of an unredeemed code", async () => {
      const code = await mintCode(ship);
      const normalized = normalizeCode(code)!;
      const hash = await hashCode(normalized, base64ToBytes(process.env.CODE_PEPPER!));
      const { data } = await admin()
        .from("boarding_invites")
        .select("*")
        .eq("code_hash", `\\x${hash}`)
        .single();
      const row = JSON.stringify(data);
      expect(row).not.toContain(normalized);
      expect(row).not.toContain(code);
      const ct = String(data!.code_ciphertext).replace(/^\\x/, "");
      expect(await aesGcmDecryptHex(base64ToBytes(process.env.CODE_ENCRYPTION_KEY!), ct)).toBe(normalized);
    });
  });
});
