import "server-only";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ACCESS_HEADER, accessConfigFromEnv, verifyAccessToken, type Admin } from "./access";

/**
 * The signed-in admin, from the Cloudflare Access token on this request.
 * Anything else gets a 404, so the admin panel's existence isn't revealed.
 * Admin identity is completely separate from player sessions.
 *
 * Local development only: ADMIN_DEV_EMAIL stands in for Access when
 * NODE_ENV is "development" (never in a production build).
 */
export async function requireAdmin(): Promise<Admin> {
  const h = await headers();
  if (process.env.NODE_ENV === "development" && process.env.ADMIN_DEV_EMAIL) {
    return { email: process.env.ADMIN_DEV_EMAIL.toLowerCase() };
  }
  const admin = await verifyAccessToken(h.get(ACCESS_HEADER), accessConfigFromEnv());
  if (!admin) notFound();
  return admin;
}
