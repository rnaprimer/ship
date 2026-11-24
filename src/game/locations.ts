/**
 * The places in the location picker, without the map data, so the React HUD
 * can list them without loading the maps. Names and ids must match the
 * generated maps (checked in locations.test.ts).
 */
export type Location = { mapId: string; name: string; blurb: string };

export const LOCATIONS: { left: Location[]; right: Location[] } = {
  left: [
    { mapId: "grand-lobby", name: "Grand Lobby", blurb: "Marble, chandeliers and the grand staircase" },
    { mapId: "personal-cabin", name: "Personal Cabin", blurb: "Your own quiet room. Only you can see in" },
    { mapId: "swimming-pool", name: "Swimming Pool", blurb: "Sun loungers and a pool bar on deck" },
  ],
  right: [
    { mapId: "secret-deck", name: "Secret Deck", blurb: "Candlelight, charts and treasure" },
    { mapId: "ship-main", name: "First Deck", blurb: "The main deck, where everyone boards" },
    { mapId: "second-deck", name: "Second Deck", blurb: "Cannons, hammocks and the crew's mess" },
  ],
};

export const ALL_LOCATIONS: Location[] = [...LOCATIONS.left, ...LOCATIONS.right];
