/**
 * The OpenReply → ship internal API: HMAC authentication (BRIEF §18
 * "internal boarding APIs without authorization", "duplicate webhook
 * deliveries") and the issue / delivery-status behaviour.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { admin, createTestShip, deleteTestShip, hasDb, req, signedReq } from "../../../../test/db";
import { POST as issue } from "./issue/route";
import { POST as delivery } from "./delivery-status/route";
import { POST as redeem } from "../../api/boarding/redeem/route";
import { INTERNAL_PATHS } from "@/lib/internal/contract";

let ship = "";
let seq = 0;
const ids = () => {
  seq++;
  const n = `${Date.now()}_${seq}`;
  return {
    instagram_account_id: "17841400000000001",
    instagram_user_id: `user_${n}`,
    instagram_comment_id: `comment_${n}`,
    instagram_media_id: "media_1",
  };
};

async function issueFor(body: Record<string, string>) {
  const res = await issue(await signedReq(INTERNAL_PATHS.issue, body));
  return { status: res.status, body: await res.json() };
}

describe.skipIf(!hasDb)("internal invites API (database)", () => {
  beforeAll(async () => {
    ship = await createTestShip();
  });
  afterAll(async () => {
    if (ship) await deleteTestShip(ship);
  });

  describe("authentication", () => {
    it("rejects unsigned, wrongly signed, tampered, stale and future requests", async () => {
      const body = ids();
      const unsigned = new Request(`http://ship.internal${INTERNAL_PATHS.issue}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      expect((await issue(unsigned)).status).toBe(401);
      const wrongKey = Buffer.alloc(32, 9).toString("base64");
      expect((await issue(await signedReq(INTERNAL_PATHS.issue, body, { secret: wrongKey }))).status).toBe(401);
      expect((await issue(await signedReq(INTERNAL_PATHS.issue, body, { tamper: true }))).status).toBe(401);
      const now = Math.floor(Date.now() / 1000);
      expect((await issue(await signedReq(INTERNAL_PATHS.issue, body, { timestamp: now - 301 }))).status).toBe(401);
      expect((await issue(await signedReq(INTERNAL_PATHS.issue, body, { timestamp: now + 301 }))).status).toBe(401);
      expect((await delivery(await signedReq(INTERNAL_PATHS.deliveryStatus, {}, { secret: wrongKey }))).status).toBe(401);
      // Nothing was issued by any of the rejected calls.
      const { data } = await admin().from("boarding_invites").select("id").eq("instagram_comment_id", body.instagram_comment_id);
      expect(data).toEqual([]);
    });

    it("rejects a session cookie or browser origin as a substitute for a signature", async () => {
      const browser = req(INTERNAL_PATHS.issue, { body: ids() });
      expect((await issue(browser)).status).toBe(401);
    });

    it("validates the body after the signature", async () => {
      expect((await issue(await signedReq(INTERNAL_PATHS.issue, { ...ids(), extra: 1 }))).status).toBe(400);
      expect((await issue(await signedReq(INTERNAL_PATHS.issue, { ...ids(), instagram_user_id: "has space" }))).status).toBe(400);
      expect((await issue(await signedReq(INTERNAL_PATHS.issue, null, { rawBody: "{nope" }))).status).toBe(400);
    });
  });

  describe("issue", () => {
    it("issues a code that redeems on the site", async () => {
      const r = await issueFor(ids());
      expect(r.status).toBe(200);
      expect(r.body).toMatchObject({ status: "issued", ship_url: expect.stringMatching(/\/board$/) });
      expect(r.body.boarding_code).toMatch(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/);
      const res = await redeem(
        req("/api/boarding/redeem", { body: { code: r.body.boarding_code, username: `dm_${seq}_${Date.now() % 1e5}`, characterVariant: 0 } }),
      );
      expect(res.status).toBe(201);
    });

    it("returns the same code when the same comment is processed again (duplicate webhook / retry)", async () => {
      const body = ids();
      const first = await issueFor(body);
      const again = await Promise.all([issueFor(body), issueFor(body), issueFor(body)]);
      for (const r of again) {
        expect(r.body).toMatchObject({ status: "existing", invitation_id: first.body.invitation_id, boarding_code: first.body.boarding_code });
      }
      const { data } = await admin().from("boarding_invites").select("id").eq("instagram_comment_id", body.instagram_comment_id);
      expect(data).toHaveLength(1);
    });

    it("re-sends the unused code when the same person comments again elsewhere", async () => {
      const first = ids();
      const a = await issueFor(first);
      const b = await issueFor({ ...ids(), instagram_user_id: first.instagram_user_id });
      expect(b.body).toMatchObject({ status: "active_elsewhere", invitation_id: a.body.invitation_id, boarding_code: a.body.boarding_code });
    });

    it("issues one invite when one person's comments race in parallel", async () => {
      const user = ids().instagram_user_id;
      const results = await Promise.all(Array.from({ length: 6 }, () => issueFor({ ...ids(), instagram_user_id: user })));
      const codes = new Set(results.map((r) => r.body.boarding_code));
      expect(codes.size).toBe(1);
      expect(results.filter((r) => r.body.status === "issued")).toHaveLength(1);
      const { data } = await admin().from("boarding_invites").select("id").eq("instagram_user_id", user).eq("status", "active");
      expect(data).toHaveLength(1);
    });

    it("sends nothing to someone who already boarded, on any later comment", async () => {
      const first = ids();
      const a = await issueFor(first);
      await redeem(req("/api/boarding/redeem", { body: { code: a.body.boarding_code, username: `boarded_${seq}`, characterVariant: 1 } }));
      expect((await issueFor({ ...ids(), instagram_user_id: first.instagram_user_id })).body).toEqual({ status: "already_boarded" });
      expect((await issueFor(first)).body).toEqual({ status: "already_boarded" });
    });

    it("issues a fresh code after the old one expired", async () => {
      const first = ids();
      const a = await issueFor(first);
      await admin().from("boarding_invites").update({ expires_at: new Date(Date.now() - 1000).toISOString() }).eq("id", a.body.invitation_id);
      const b = await issueFor({ ...ids(), instagram_user_id: first.instagram_user_id });
      expect(b.body.status).toBe("issued");
      expect(b.body.boarding_code).not.toBe(a.body.boarding_code);
      const { data } = await admin().from("boarding_invites").select("status, code_ciphertext").eq("id", a.body.invitation_id).single();
      expect(data).toEqual({ status: "expired", code_ciphertext: null });
      // The expired comment itself can't produce a code again.
      expect((await issueFor(first)).body).toEqual({ status: "comment_used" });
    });

    it("reports paused instead of issuing", async () => {
      await admin().from("ships").update({ status: "paused" }).eq("id", ship);
      try {
        expect((await issueFor(ids())).body).toEqual({ status: "paused" });
      } finally {
        await admin().from("ships").update({ status: "active" }).eq("id", ship);
      }
    });
  });

  describe("delivery status", () => {
    it("records outcomes and never downgrades a delivery", async () => {
      const a = await issueFor(ids());
      const send = async (outcome: string) =>
        delivery(await signedReq(INTERNAL_PATHS.deliveryStatus, { invitation_id: a.body.invitation_id, instagram_comment_id: "c1", outcome }));
      const read = async () =>
        (await admin().from("boarding_invites").select("delivery_status, delivery_attempts").eq("id", a.body.invitation_id).single()).data;

      expect((await send("unconfirmed")).status).toBe(200);
      expect(await read()).toEqual({ delivery_status: "unconfirmed", delivery_attempts: 1 });
      expect((await send("delivered")).status).toBe(200);
      expect((await send("failed")).status).toBe(200);
      expect(await read()).toEqual({ delivery_status: "delivered", delivery_attempts: 3 });
    });

    it("404s an unknown invitation and rejects free-text error codes", async () => {
      const unknown = await delivery(
        await signedReq(INTERNAL_PATHS.deliveryStatus, {
          invitation_id: "00000000-0000-4000-8000-000000000000",
          instagram_comment_id: "c1",
          outcome: "failed",
        }),
      );
      expect(unknown.status).toBe(404);
      const a = await issueFor(ids());
      const freeText = await delivery(
        await signedReq(INTERNAL_PATHS.deliveryStatus, {
          invitation_id: a.body.invitation_id,
          instagram_comment_id: "c1",
          outcome: "failed",
          error_code: "Your code is K7PM-4XQ2 sorry",
        }),
      );
      expect(freeText.status).toBe(400);
    });
  });
});
