import { describe, expect, it } from "vitest";
import { ipKey, isSameOrigin } from "./request";

const r = (headers: Record<string, string>) => new Request("http://ship.test/api/x", { method: "POST", headers });

describe("isSameOrigin", () => {
  it("accepts our own origin", () => {
    expect(isSameOrigin(r({ host: "ship.test", origin: "http://ship.test" }))).toBe(true);
    expect(isSameOrigin(r({ host: "internal:3000", "x-forwarded-host": "ship.example.com", origin: "https://ship.example.com" }))).toBe(true);
  });

  it("rejects other origins, a missing Origin, and garbage", () => {
    expect(isSameOrigin(r({ host: "ship.test", origin: "https://evil.example" }))).toBe(false);
    expect(isSameOrigin(r({ host: "ship.test", origin: "http://ship.test.evil.example" }))).toBe(false);
    expect(isSameOrigin(r({ host: "ship.test" }))).toBe(false);
    expect(isSameOrigin(r({ host: "ship.test", origin: "null" }))).toBe(false);
  });
});

describe("ipKey", () => {
  it("is a keyed hash, never the raw IP", async () => {
    const pepper = new Uint8Array(32).fill(1);
    const k = await ipKey(r({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }), pepper);
    expect(k).toMatch(/^[0-9a-f]{32}$/);
    expect(k).not.toContain("203");
    expect(await ipKey(r({ "cf-connecting-ip": "203.0.113.9" }), pepper)).toBe(k);
    expect(await ipKey(r({ "x-forwarded-for": "203.0.113.10" }), pepper)).not.toBe(k);
  });
});
