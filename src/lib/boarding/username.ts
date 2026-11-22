/**
 * Username rules (BRIEF §3 Stage D): 3–20 chars, letters/numbers/underscore,
 * case-insensitive uniqueness (enforced in the database), no reserved or
 * impersonating names, and a basic profanity filter. The filter is
 * deliberately small; moderators can disable names later (admin, M5).
 */
export const USERNAME_RE = /^[A-Za-z0-9_]{3,20}$/;

export type UsernameCheck = { ok: true; username: string; normalized: string } | { ok: false; reason: string };

// Exact names that must not be taken.
const RESERVED = new Set([
  "admin", "administrator", "root", "system", "sys", "support", "help", "staff", "mod", "moderator",
  "owner", "official", "captain", "the_captain", "ship", "the_ship", "internetship", "theinternetship",
  "internet_ship", "the_internet_ship", "boarding", "security", "null", "undefined", "anonymous",
  "instagram", "meta", "openreply", "everyone", "here", "you", "me",
]);

// Substrings that suggest impersonating the crew.
const IMPERSONATION = ["admin", "moderator", "official", "staff", "support", "internetship"];

// Basic profanity / slur stems, matched after undoing common l33t swaps. Kept to stems that
// rarely appear inside innocent words (avoids blocking names like "grape" or "peacock").
const BLOCKED_STEMS = [
  "fuck", "shit", "cunt", "bitch", "whore", "slut", "nigg", "faggot", "retard", "nazi", "hitler",
  "porn", "penis", "vagina", "asshole", "kike", "chink",
];

const LEET: Record<string, string> = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "8": "b", "9": "g" };

function deLeet(s: string): string {
  return s.replace(/[01345789]/g, (c) => LEET[c] ?? c).replace(/_/g, "");
}

export function checkUsername(input: unknown): UsernameCheck {
  if (typeof input !== "string") return { ok: false, reason: "Choose a username." };
  const username = input.trim();
  if (username.length < 3 || username.length > 20) return { ok: false, reason: "Use 3 to 20 characters." };
  if (!USERNAME_RE.test(username)) return { ok: false, reason: "Use only letters, numbers and underscores." };
  const normalized = username.toLowerCase();
  if (RESERVED.has(normalized)) return { ok: false, reason: "That name is reserved." };
  const squashed = deLeet(normalized);
  if (IMPERSONATION.some((w) => squashed.includes(w))) return { ok: false, reason: "That name is reserved." };
  if (BLOCKED_STEMS.some((w) => squashed.includes(w))) return { ok: false, reason: "Please choose a different name." };
  return { ok: true, username, normalized };
}
