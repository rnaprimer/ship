import { afterEach, describe, expect, it, vi } from "vitest";
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
  const pepper = new Uint8Array(32).fill(1);
  afterEach(() => vi.unstubAllEnvs());

  it("is a keyed hash, never the raw IP", async () => {
    const k = await ipKey(r({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }), pepper);
    expect(k).toMatch(/^[0-9a-f]{32}$/);
    expect(k).not.toContain("203");
    expect(await ipKey(r({ "x-forwarded-for": "203.0.113.10" }), pepper)).not.toBe(k);
  });

  it("ignores client-controlled headers that the platform does not set", async () => {
    const real = await ipKey(r({ "x-forwarded-for": "203.0.113.9" }), pepper);
    // Without configuration, a spoofed cf-connecting-ip changes nothing.
    expect(await ipKey(r({ "x-forwarded-for": "203.0.113.9", "cf-connecting-ip": "1.2.3.4" }), pepper)).toBe(real);
  });

  it("uses x-real-ip on Vercel, and a configured header elsewhere", async () => {
    vi.stubEnv("VERCEL", "1");
    const vercel = await ipKey(r({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "6.6.6.6" }), pepper);
    expect(await ipKey(r({ "x-real-ip": "203.0.113.9", "x-forwarded-for": "7.7.7.7" }), pepper)).toBe(vercel);
    vi.stubEnv("CLIENT_IP_HEADER", "cf-connecting-ip");
    const cf = await ipKey(r({ "cf-connecting-ip": "203.0.113.9", "x-real-ip": "8.8.8.8" }), pepper);
    expect(await ipKey(r({ "cf-connecting-ip": "203.0.113.9", "x-real-ip": "9.9.9.9" }), pepper)).toBe(cf);
  });
});
