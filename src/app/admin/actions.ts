"use server";

import { z } from "zod";
import { refresh } from "next/cache";
import { requireAdmin } from "@/lib/admin/session";
import { adminRevokeInvite, adminSetPlayerStatus, adminSetShipStatus } from "@/lib/db/rpc";
import { serverEnv } from "@/lib/env";

/*
 * Admin mutations. Server actions are reachable by direct POST, so each one
 * re-checks the Cloudflare Access token and validates its input with Zod.
 * Every change is written to admin_audit by the database function.
 */

export async function setBoardingStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const status = z.enum(["active", "paused"]).parse(formData.get("status"));
  await adminSetShipStatus(serverEnv().SHIP_ID, status, admin.email);
  refresh();
}

export async function setPlayerStatus(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const { playerId, status } = z
    .object({ playerId: z.uuid(), status: z.enum(["active", "disabled"]) })
    .parse({ playerId: formData.get("playerId"), status: formData.get("status") });
  await adminSetPlayerStatus(serverEnv().SHIP_ID, playerId, status, admin.email);
  refresh();
}

export async function revokeInvite(formData: FormData): Promise<void> {
  const admin = await requireAdmin();
  const invitationId = z.uuid().parse(formData.get("invitationId"));
  await adminRevokeInvite(serverEnv().SHIP_ID, invitationId, admin.email);
  refresh();
}
