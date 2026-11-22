import type { PassengerProfile, PlayerProfile } from "./types";

/** Milestone 1 only: stands in for the redeemed player from `/api/me`. */
export const MOCK_PLAYER: PlayerProfile = {
  username: "test_sailor",
  characterVariant: 0,
};

/** Milestone 1 only: stands in for `/api/ship/passengers`. */
export const MOCK_PASSENGERS: PassengerProfile[] = [
  { username: "saltyseadog", characterVariant: 1 },
  { username: "Mira_Waves", characterVariant: 2 },
  { username: "captain_kofi", characterVariant: 3 },
  { username: "nightowl", characterVariant: 4 },
  { username: "Pixel_Pete", characterVariant: 5 },
  { username: "luna22", characterVariant: 1 },
  { username: "anchorAnna", characterVariant: 3 },
  { username: "deckhand_dev", characterVariant: 2 },
];
