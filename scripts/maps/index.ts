import { firstDeck, secondDeck } from "./decks.ts";
import { grandLobby, personalCabin, secretDeck, swimmingPool } from "./rooms.ts";
import type { BuiltMap } from "../paint/mapkit.ts";

/** Every place on the ship. First Deck first: it is the default. */
export function allMaps(): BuiltMap[] {
  return [firstDeck(), grandLobby(), personalCabin(), swimmingPool(), secretDeck(), secondDeck()];
}
