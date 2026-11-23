/**
 * Returning players (owner decision 2026-11-23): the redeemed boarding code
 * signs back in to the same character on any device, and never creates one.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cookieFrom, createTestShip, deleteTestShip, freshIp, hasDb, mintCode, req } from "../../../../../test/db";
import { POST as resume } from "./route";
import { POST as redeem } from "../redeem/route";
import { POST as validate } from "../validate/route";
import { GET as me } from "../../me/route";
import { LIMITS } from "@/lib/boarding/service";

let ship = "";
let n = 0;
const uname = (p: string) => `${p}_${Date.now() % 100000}_${n++}`;

async function boardWith(code: string, username: string) {
  const res = await redeem(req("/api/boarding/redeem", { body: { code, username, characterVariant: 5 } }));
  if (res.status !== 201) throw new Error(`redeem ${res.status}`);
  return cookieFrom(res);
}

describe.skipIf(!hasDb)("returning players sign back in with their boarding pass (database)", () => {
  beforeAll(async () => {
    ship = await createTestShip();
  });
  afterAll(async () => {
    if (ship) await deleteTestShip(ship);
  });

  it("signs in to the same character on a new device, in any spelling, keeping other sessions", async () => {
    const code = await mintCode(ship);
    const username = uname("Returner");
    const phoneCookie = await boardWith(code, username);

    const res = await resume(req("/api/boarding/resume", { body: { code: code.toLowerCase().replace(/-/g, " ") } }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ player: { username, characterVariant: 5 } });
    const laptopCookie = cookieFrom(res);
    expect(laptopCookie).not.toBe(phoneCookie);

    for (const cookie of [phoneCookie, laptopCookie]) {
      const m = await me(req("/api/me", { cookie }));
      expect(m.status).toBe(200);
      expect((await m.json()).player.username).toBe(username);
    }
    const { data } = await admin().from("players").select("id").eq("ship_id", ship).eq("username", username);
    expect(data).toHaveLength(1);
  });

  it("still never creates a second character from a used code", async () => {
    const code = await mintCode(ship);
    await boardWith(code, uname("Original"));
    const again = await redeem(req("/api/boarding/redeem", { body: { code, username: uname("Second"), characterVariant: 0 } }));
    expect(again.status).toBe(409);
    expect(await again.json()).toEqual({ error: "REDEEMED" });
  });

  it("does nothing for a code that hasn't boarded yet", async () => {
    const code = await mintCode(ship);
    const res = await resume(req("/api/boarding/resume", { body: { code } }));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "NOT_BOARDED" });
    expect(res.headers.get("set-cookie")).toBeNull();
    expect((await validate(req("/api/boarding/validate", { body: { code } }))).status).toBe(200);
  });

  it("rejects wrong codes and locks the IP out after repeated failures", async () => {
    const good = await mintCode(ship);
    await boardWith(good, uname("Locked"));
    const ip = freshIp();
    for (let i = 0; i < LIMITS.failuresPerIp; i++) {
      const r = await resume(req("/api/boarding/resume", { body: { code: "QQQQ-QQQQ-QQQQ-QQQQ" }, ip }));
      expect(r.status).toBe(400);
    }
    expect((await resume(req("/api/boarding/resume", { body: { code: good }, ip }))).status).toBe(429);
    expect((await resume(req("/api/boarding/resume", { body: { code: good } }))).status).toBe(200);
  });

  it("refuses a disabled character", async () => {
    const code = await mintCode(ship);
    const username = uname("Banned");
    await boardWith(code, username);
    await admin().from("players").update({ status: "disabled" }).eq("ship_id", ship).eq("username", username);
    const res = await resume(req("/api/boarding/resume", { body: { code } }));
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "DISABLED" });
  });

  it("lets passengers back aboard while new boarding is paused", async () => {
    const code = await mintCode(ship);
    await boardWith(code, uname("Paused"));
    await admin().from("ships").update({ status: "paused" }).eq("id", ship);
    try {
      expect((await resume(req("/api/boarding/resume", { body: { code } }))).status).toBe(200);
    } finally {
      await admin().from("ships").update({ status: "active" }).eq("id", ship);
    }
  });

  it("refuses cross-site requests and unexpected fields", async () => {
    const code = await mintCode(ship);
    await boardWith(code, uname("Strict"));
    expect((await resume(req("/api/boarding/resume", { body: { code }, origin: "https://evil.example" }))).status).toBe(403);
    expect((await resume(req("/api/boarding/resume", { body: { code, username: "x" } }))).status).toBe(400);
  });
});
