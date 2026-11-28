/**
 * Integration tests for changing your outfit (owner decision 2026-11-28):
 * only your own, only with a session, only valid values, and everyone sees it.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, cookieFrom, createTestShip, deleteTestShip, hasDb, mintCode, req } from "../../../../../test/db";
import { POST as redeem } from "../../boarding/redeem/route";
import { GET as me } from "../route";
import { POST as setOutfit } from "./route";
import { GET as passengers } from "../../ship/passengers/route";

let ship = "";
let n = 0;

async function board() {
  const username = `tailor_${Date.now() % 100000}_${n++}`;
  const res = await redeem(req("/api/boarding/redeem", { body: { code: await mintCode(ship), username, characterVariant: 1 } }));
  if (res.status !== 201) throw new Error(`redeem ${res.status}`);
  const { data } = await admin().from("players").select("id").eq("ship_id", ship).eq("username", username).single();
  return { cookie: cookieFrom(res), username, playerId: data!.id as string };
}

const cook = { characterVariant: 3, role: 4, color: 1, hat: 3 };
const lookOf = async (playerId: string) =>
  (await admin().from("players").select("character_variant, crew_role, outfit_color, hat").eq("id", playerId).single()).data;

describe.skipIf(!hasDb)("POST /api/me/outfit (database)", () => {
  beforeAll(async () => {
    ship = await createTestShip();
  });
  afterAll(async () => {
    if (ship) await deleteTestShip(ship);
  });

  it("new passengers start in plain clothes", async () => {
    const a = await board();
    const body = await (await me(req("/api/me", { cookie: a.cookie }))).json();
    expect(body.player).toMatchObject({ characterVariant: 1, outfit: { role: null, color: 0, hat: 0 } });
  });

  it("saves your own outfit, and /api/me and other passengers see it", async () => {
    const a = await board();
    const b = await board();
    expect((await setOutfit(req("/api/me/outfit", { body: cook, cookie: a.cookie }))).status).toBe(204);
    expect(await lookOf(a.playerId)).toEqual({ character_variant: 3, crew_role: 4, outfit_color: 1, hat: 3 });
    const mine = await (await me(req("/api/me", { cookie: a.cookie }))).json();
    expect(mine.player).toMatchObject({ characterVariant: 3, outfit: { role: 4, color: 1, hat: 3 } });
    const seen = (await (await passengers(req("/api/ship/passengers", { cookie: b.cookie }))).json()).passengers;
    expect(seen.find((p: { username: string }) => p.username === a.username)).toEqual({ username: a.username, characterVariant: 3, outfit: { role: 4, color: 1, hat: 3 }, active: true });
    // Back to plain clothes.
    expect((await setOutfit(req("/api/me/outfit", { body: { characterVariant: 0, role: null, color: 0, hat: 0 }, cookie: a.cookie }))).status).toBe(204);
    expect(await lookOf(a.playerId)).toEqual({ character_variant: 0, crew_role: null, outfit_color: 0, hat: 0 });
  });

  it("is 401 without a session, or for a disabled player", async () => {
    expect((await setOutfit(req("/api/me/outfit", { body: cook }))).status).toBe(401);
    const a = await board();
    await admin().from("players").update({ status: "disabled" }).eq("id", a.playerId);
    expect((await setOutfit(req("/api/me/outfit", { body: cook, cookie: a.cookie }))).status).toBe(401);
  });

  it("is 403 from another site", async () => {
    const a = await board();
    expect((await setOutfit(req("/api/me/outfit", { body: cook, cookie: a.cookie, origin: "https://evil.example" }))).status).toBe(403);
    expect(await lookOf(a.playerId)).toMatchObject({ crew_role: null });
  });

  it("cannot change someone else's outfit", async () => {
    const a = await board();
    const b = await board();
    const res = await setOutfit(req("/api/me/outfit", { body: { ...cook, playerId: b.playerId }, cookie: a.cookie }));
    expect(res.status).toBe(400);
    expect(await lookOf(b.playerId)).toEqual({ character_variant: 1, crew_role: null, outfit_color: 0, hat: 0 });
  });

  it.each([
    ["role out of range", { ...cook, role: 10 }],
    ["negative colour", { ...cook, color: -1 }],
    ["hat out of range", { ...cook, hat: 10 }],
    ["look out of range", { ...cook, characterVariant: 6 }],
    ["fractional role", { ...cook, role: 1.5 }],
    ["role as text", { ...cook, role: "cook" }],
    ["missing hat", { characterVariant: 0, role: 1, color: 0 }],
  ])("rejects a bad body: %s", async (_, body) => {
    const a = await board();
    expect((await setOutfit(req("/api/me/outfit", { body, cookie: a.cookie }))).status).toBe(400);
    expect(await lookOf(a.playerId)).toEqual({ character_variant: 1, crew_role: null, outfit_color: 0, hat: 0 });
  });

  it("the database refuses out-of-range values even when called directly", async () => {
    const a = await board();
    const { data } = await admin().rpc("set_outfit", { p_player_id: a.playerId, p_character_variant: 0, p_crew_role: 12, p_outfit_color: 0, p_hat: 0 });
    expect(data).toBe("INVALID");
    const unknown = await admin().rpc("set_outfit", { p_player_id: "00000000-0000-4000-8000-000000000000", p_character_variant: 0, p_crew_role: 1, p_outfit_color: 0, p_hat: 0 });
    expect(unknown.data).toBe("NOT_FOUND");
  });

  it("limits how often you can change", async () => {
    const a = await board();
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) statuses.push((await setOutfit(req("/api/me/outfit", { body: { ...cook, hat: i % 10 }, cookie: a.cookie }))).status);
    expect(statuses.slice(0, 30).every((s) => s === 204)).toBe(true);
    expect(statuses[30]).toBe(429);
  }, 60_000);
});
