import "server-only";
import { json } from "../http/request";
import type { BoardingError } from "./service";

const STATUS: Record<BoardingError, number> = {
  INVALID: 400,
  EXPIRED: 410,
  REDEEMED: 409,
  REVOKED: 410,
  PAUSED: 503,
  RATE_LIMITED: 429,
  USERNAME_TAKEN: 409,
  USERNAME_REJECTED: 422,
  NOT_BOARDED: 409,
  DISABLED: 403,
};

/** Consistent error bodies: a machine-readable code, plus a reason for username problems. */
export function boardingErrorResponse(error: BoardingError, message?: string): Response {
  return json(message ? { error, message } : { error }, STATUS[error], error === "RATE_LIMITED" ? { "Retry-After": "600" } : {});
}
