import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from "jose";

/**
 * Verifies a Cloudflare Access application token (the Cf-Access-Jwt-Assertion
 * header Cloudflare adds after the admin signs in). Checks the RS256
 * signature against the team's published keys, the issuer, the application
 * audience (AUD tag), expiry, and that the email is an allowed admin.
 * No server-only import so it can run in proxy.ts and in tests.
 */
export type AccessConfig = { teamDomain: string; aud: string; adminEmails: string[] };
export type Admin = { email: string };

export const ACCESS_HEADER = "cf-access-jwt-assertion";

/** Reads and validates the Access settings; null means admin is closed (fail closed). */
export function accessConfigFromEnv(env: Record<string, string | undefined> = process.env): AccessConfig | null {
  const teamDomain = env.CF_ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const aud = env.CF_ACCESS_AUD?.trim();
  const adminEmails = (env.ADMIN_EMAILS ?? "").split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!teamDomain || !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(teamDomain)) return null;
  if (!aud || !/^[a-f0-9]{64}$/.test(aud)) return null;
  if (adminEmails.length === 0) return null;
  return { teamDomain, aud, adminEmails };
}

const jwksCache = new Map<string, JWTVerifyGetKey>();
function remoteKeys(teamDomain: string): JWTVerifyGetKey {
  let keys = jwksCache.get(teamDomain);
  if (!keys) {
    keys = createRemoteJWKSet(new URL(`https://${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, keys);
  }
  return keys;
}

export async function verifyAccessToken(
  token: string | null | undefined,
  config: AccessConfig | null,
  getKey?: JWTVerifyGetKey,
): Promise<Admin | null> {
  if (!config || !token || token.length > 8192) return null;
  try {
    const { payload } = await jwtVerify(token, getKey ?? remoteKeys(config.teamDomain), {
      issuer: `https://${config.teamDomain}`,
      audience: config.aud,
      algorithms: ["RS256"],
      clockTolerance: 30,
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : "";
    if (!email || !config.adminEmails.includes(email)) return null;
    return { email };
  } catch {
    return null;
  }
}
