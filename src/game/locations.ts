/**
 * The places in the location picker, without the map data, so the React HUD
 * can list them without loading the maps. Names and ids must match the
 * generated maps (checked in locations.test.ts).
 */
export type Location = { mapId: string; name: string; blurb: string };

export const LOCATIONS: { left: Location[]; right: Location[] } = {
  left: [
    { mapId: "grand-lobby", name: "Grand Lobby", blurb: "Twin staircases, lounges and the voyage board" },
    { mapId: "personal-cabin", name: "Personal Cabin", blurb: "Your own room: bed, desk and stern windows" },
    { mapId: "swimming-pool", name: "Swimming Pool", blurb: "Pool, cabana, bar and sun loungers" },
  ],
  right: [
    { mapId: "secret-deck", name: "Secret Deck", blurb: "Brig, treasure vault, map room and more" },
    { mapId: "ship-main", name: "First Deck", blurb: "Masts, the helm and the captain's cabin" },
    { mapId: "second-deck", name: "Second Deck", blurb: "Bunks, armoury, galley, mess and cargo" },
  ],
};

export const ALL_LOCATIONS: Location[] = [...LOCATIONS.left, ...LOCATIONS.right];
