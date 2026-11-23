import { beforeAll, describe, expect, it } from "vitest";
import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey } from "jose";
import { accessConfigFromEnv, verifyAccessToken, type AccessConfig } from "./access";

const TEAM = "peekatribe.cloudflareaccess.com";
const AUD = "a".repeat(64);
const config: AccessConfig = { teamDomain: TEAM, aud: AUD, adminEmails: ["owner@example.com"] };

let privateKey: CryptoKey;
let otherKey: CryptoKey;
let getKey: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  otherKey = (await generateKeyPair("RS256")).privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  getKey = createLocalJWKSet({ keys: [jwk] });
});

function token(claims: Record<string, unknown> = {}, opts: { key?: CryptoKey; iss?: string; aud?: string; exp?: string | number } = {}) {
  return new SignJWT({ email: "owner@example.com", ...claims })
    .setProtectedHeader({ alg: "RS256", kid: "k1" })
    .setIssuer(opts.iss ?? `https://${TEAM}`)
    .setAudience(opts.aud ?? AUD)
    .setIssuedAt()
    .setExpirationTime(opts.exp ?? "10m")
    .sign(opts.key ?? privateKey);
}

describe("verifyAccessToken", () => {
  it("accepts a valid token for an allowed admin (case-insensitive email)", async () => {
    expect(await verifyAccessToken(await token(), config, getKey)).toEqual({ email: "owner@example.com" });
    expect(await verifyAccessToken(await token({ email: "Owner@Example.com" }), config, getKey)).toEqual({ email: "owner@example.com" });
  });

  it("rejects other emails, wrong audience, wrong issuer, expired tokens and other signers", async () => {
    expect(await verifyAccessToken(await token({ email: "someone@example.com" }), config, getKey)).toBeNull();
    expect(await verifyAccessToken(await token({}, { aud: "b".repeat(64) }), config, getKey)).toBeNull();
    expect(await verifyAccessToken(await token({}, { iss: "https://evil.cloudflareaccess.com" }), config, getKey)).toBeNull();
    expect(await verifyAccessToken(await token({}, { exp: Math.floor(Date.now() / 1000) - 120 }), config, getKey)).toBeNull();
    expect(await verifyAccessToken(await token({}, { key: otherKey }), config, getKey)).toBeNull();
    expect(await verifyAccessToken(await token({ email: undefined }), config, getKey)).toBeNull();
  });

  it("rejects tampered, unsigned and HMAC tokens", async () => {
    const good = await token();
    const [h, p, s] = good.split(".");
    const forged = Buffer.from(JSON.stringify({ email: "owner@example.com", iss: `https://${TEAM}`, aud: AUD, exp: 9999999999 })).toString("base64url");
    expect(await verifyAccessToken(`${h}.${forged}.${s}`, config, getKey)).toBeNull();
    const none = `${Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url")}.${p}.`;
    expect(await verifyAccessToken(none, config, getKey)).toBeNull();
    const hs = await new SignJWT({ email: "owner@example.com" })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuer(`https://${TEAM}`).setAudience(AUD).setExpirationTime("10m")
      .sign(new TextEncoder().encode("x".repeat(32)));
    expect(await verifyAccessToken(hs, config, getKey)).toBeNull();
  });

  it("fails closed with no token or no configuration", async () => {
    expect(await verifyAccessToken(null, config, getKey)).toBeNull();
    expect(await verifyAccessToken("", config, getKey)).toBeNull();
    expect(await verifyAccessToken(await token(), null, getKey)).toBeNull();
  });
});

describe("accessConfigFromEnv", () => {
  it("requires a cloudflareaccess.com team domain, a 64-hex AUD tag and at least one admin email", () => {
    const ok = { CF_ACCESS_TEAM_DOMAIN: TEAM, CF_ACCESS_AUD: AUD, ADMIN_EMAILS: " Owner@Example.com , b@example.com" };
    expect(accessConfigFromEnv(ok)).toEqual({ teamDomain: TEAM, aud: AUD, adminEmails: ["owner@example.com", "b@example.com"] });
    expect(accessConfigFromEnv({ ...ok, CF_ACCESS_TEAM_DOMAIN: "evil.example.com" })).toBeNull();
    expect(accessConfigFromEnv({ ...ok, CF_ACCESS_AUD: "short" })).toBeNull();
    expect(accessConfigFromEnv({ ...ok, ADMIN_EMAILS: " , " })).toBeNull();
    expect(accessConfigFromEnv({})).toBeNull();
  });
});
