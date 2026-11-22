/**
 * Internal API contract between OpenReply (caller) and the ship (server).
 *
 * THIS FILE IS SHARED: an identical copy lives at openreply/lib/ship/contract.ts.
 * Change both together. It depends only on zod.
 *
 * Every request is a JSON POST signed with HMAC-SHA256 over
 * `${timestamp}.${rawBody}` using SHIP_INTERNAL_SECRET, sent as lowercase hex in
 * X-Ship-Signature, with the Unix timestamp (seconds) in X-Ship-Timestamp.
 * The ship rejects a clock skew over MAX_SKEW_SECONDS.
 */
import { z } from "zod";

export const INTERNAL_PATHS = {
  issue: "/internal/invites/issue",
  deliveryStatus: "/internal/invites/delivery-status",
} as const;

export const TIMESTAMP_HEADER = "x-ship-timestamp";
export const SIGNATURE_HEADER = "x-ship-signature";
export const MAX_SKEW_SECONDS = 300;

export function signingPayload(timestamp: string, rawBody: string): string {
  return `${timestamp}.${rawBody}`;
}

/** Instagram / Meta identifiers: opaque, short, no whitespace. */
const MetaId = z.string().min(1).max(128).regex(/^[A-Za-z0-9_.:-]+$/);

export const IssueRequest = z
  .object({
    event_id: z.string().max(200).optional(),
    instagram_account_id: MetaId,
    instagram_user_id: MetaId,
    instagram_comment_id: MetaId,
    instagram_media_id: MetaId,
  })
  .strict();
export type IssueRequest = z.infer<typeof IssueRequest>;

export const IssueResponse = z.discriminatedUnion("status", [
  z.object({
    /** issued: new code. existing: same comment retried. active_elsewhere: unused code from another comment. */
    status: z.enum(["issued", "existing", "active_elsewhere"]),
    invitation_id: z.uuid(),
    boarding_code: z.string().regex(/^[0-9A-Z]{4}(-[0-9A-Z]{4}){3}$/),
    expires_at: z.string(),
    ship_url: z.url(),
  }),
  z.object({
    /** No code to send: already a passenger, boarding paused, or this comment's invite is spent. */
    status: z.enum(["already_boarded", "paused", "comment_used"]),
  }),
]);
export type IssueResponse = z.infer<typeof IssueResponse>;

export const DeliveryOutcome = z.enum(["delivered", "unconfirmed", "failed"]);
export type DeliveryOutcome = z.infer<typeof DeliveryOutcome>;

export const DeliveryStatusRequest = z
  .object({
    invitation_id: z.uuid(),
    instagram_comment_id: MetaId,
    outcome: DeliveryOutcome,
    /** A short machine code (e.g. "MetaApiError:10"), never message text. */
    error_code: z.string().max(64).regex(/^[A-Za-z0-9_.:-]*$/).optional(),
  })
  .strict();
export type DeliveryStatusRequest = z.infer<typeof DeliveryStatusRequest>;

export const DeliveryStatusResponse = z.object({ ok: z.literal(true) });
