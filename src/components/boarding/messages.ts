/** Player-facing text for API error codes. */
export const BOARDING_MESSAGES: Record<string, string> = {
  INVALID: "That code doesn't match a boarding pass. Check your DM and try again.",
  EXPIRED: "This boarding pass has expired. Comment on our latest Reel to get a new one.",
  REDEEMED: "This boarding pass has already been used.",
  REVOKED: "This boarding pass is no longer valid.",
  PAUSED: "Boarding is paused right now. Please try again soon.",
  RATE_LIMITED: "Too many attempts. Please wait a few minutes and try again.",
  USERNAME_TAKEN: "Someone aboard already has that name. Try another one.",
  BAD_REQUEST: "Something about that didn't look right. Please try again.",
  FORBIDDEN: "Please use the boarding page on our site.",
};

export const GENERIC_ERROR = "We couldn't reach the ship. Check your connection and try again.";

/** Codes that mean the boarding pass itself can't be used, so the player must start over. */
export const CODE_ERRORS = new Set(["INVALID", "EXPIRED", "REDEEMED", "REVOKED"]);

export async function errorFrom(res: Response): Promise<{ code: string; message: string }> {
  try {
    const body = (await res.json()) as { error?: string; message?: string };
    const code = body.error ?? "UNKNOWN";
    return { code, message: body.message ?? BOARDING_MESSAGES[code] ?? GENERIC_ERROR };
  } catch {
    return { code: "UNKNOWN", message: GENERIC_ERROR };
  }
}
