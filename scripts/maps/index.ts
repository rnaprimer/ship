import { firstDeck } from "./first-deck.ts";
import { grandLobby, personalCabin, secondDeck, secretDeck, swimmingPool } from "./locations.ts";
import type { MapDef } from "./kit.ts";

/** Every map, in the order the location picker lists them. First Deck first: it is the default. */
export function allMaps(): MapDef[] {
  return [firstDeck(), grandLobby(), personalCabin(), swimmingPool(), secretDeck(), secondDeck()];
}
