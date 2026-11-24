/**
 * First Deck and Second Deck, after the owner's reference sheets
 * (2026-11-24). The bow points left. Coordinates are in 16 px tiles.
 */
import { MapBuilder, type BuiltMap } from "../paint/mapkit.ts";
import * as P from "../paint/props.ts";
import { C } from "../paint/materials.ts";

/** The main (weather) deck: foredeck, planning table, masts, helm, captain's cabin. */
export function firstDeck(): BuiltMap {
  const m = new MapBuilder({
    id: "ship-main",
    ambient: 0.14,
    version: 2,
    name: "First Deck",
    width: 106,
    height: 40,
    outdoor: true,
    dark: false,
    private: false,
    background: "#0e2236",
  });
  m.hull({ x: 7, y: 6, w: 94, h: 26, bow: "point", bowLen: 15, stern: 5, floor: "deck", side: 44, ports: true, figurehead: true });

  // --- 1. Foredeck: anchor, rigging, stores ---
  m.place(P.anchor, 24, 17);
  m.place(P.ropeCoil, 27, 15);
  m.place(P.ropeCoil, 22, 21);
  for (const [x, y] of [[23, 9], [24, 9], [28, 8], [29, 8]]) m.place(P.barrel, x, y);
  for (const [x, y] of [[23, 27], [26, 28], [27, 28]]) m.place(P.crate, x, y);
  m.place(P.mast, 29, 14);
  m.lantern(21, 12);
  m.lantern(21, 22);
  for (const [x, y] of [[19, 14], [19, 18], [26, 10]]) m.place(P.barrel, x, y);
  m.place(P.ropeCoil, 18, 16);
  m.place(P.chest(false), 30, 26);
  m.place(P.cannon, 33, 26);

  // --- 2. Planning table under a canvas awning ---
  m.place(P.awning(9, 3), 34, 7);
  m.place(P.table(6, 2, "map"), 35, 10);
  m.place(P.bench(6), 35, 12);
  m.place(P.chair, 34, 10);
  m.place(P.chair, 41, 10);
  m.light(35 * 16 + 48, 11 * 16, 56, 0.25);

  // --- 3. Main deck: masts, cargo grates, stores along the rails ---
  m.place(P.mast, 47, 14);
  m.place(P.mast, 66, 14);
  m.place(P.grate(3, 3), 55, 15);
  m.place(P.grate(3, 3), 74, 15);
  for (const [x, y] of [[44, 7], [45, 7], [51, 7], [57, 7], [58, 7], [62, 8]]) m.place(P.barrel, x, y);
  for (const [x, y] of [[52, 7], [53, 7], [63, 7], [52, 8]]) m.place(P.crate, x, y);
  for (const [x, y] of [[36, 29], [37, 29], [45, 29], [58, 29], [59, 29], [66, 29]]) m.place(P.barrel, x, y);
  for (const [x, y] of [[42, 29], [43, 28], [43, 29], [52, 29], [53, 29], [67, 29]]) m.place(P.crate, x, y);
  m.place(P.sack, 46, 29);
  m.place(P.sack, 60, 29);
  for (const x of [40, 52, 62, 72]) {
    m.lantern(x, 8);
    m.lantern(x, 28);
  }

  // --- 4/5. Stairs up and down, by the quarterdeck wall ---
  m.place(P.stairs(3, 4), 79, 7);
  m.place(P.stairs(3, 4), 79, 26);
  // Quarterdeck bulkhead with a doorway in the middle.
  m.beam(83, 7, 1, 8);
  m.beam(83, 19, 1, 11);
  m.post(83, 7);
  m.post(83, 14);
  m.post(83, 19);

  // --- 6. Helm ---
  m.rug(P.rug(5, 5, C.red, false), 85, 14);
  m.place(P.wheel, 86, 15);
  m.place(P.globe, 85, 8);
  m.place(P.chest(false), 88, 8);
  m.lantern(84, 26);

  // --- 7. Captain's cabin at the stern ---
  m.beam(91, 7, 1, 9);
  m.beam(91, 21, 1, 9);
  m.post(91, 15);
  m.post(91, 21);
  m.wall(92, 7, 6, 2);
  m.place(P.banner, 94, 7);
  m.place(P.bookshelf(), 92, 8);
  m.place(P.bed(), 96, 11);
  m.rug(P.rug(4, 4), 92, 15);
  m.place(P.desk, 92, 25);
  m.place(P.chair, 93, 27);
  m.light(95 * 16, 18 * 16, 50, 0.3);

  m.area("Foredeck", 8, 6, 26, 26);
  m.area("Planning table", 34, 7, 9, 7);
  m.area("Stairs to Upper Deck", 78, 6, 5, 6);
  m.area("Stairs to Lower Deck", 78, 25, 5, 6);
  m.area("Helm", 84, 6, 7, 26);
  m.area("Captain's cabin", 91, 6, 10, 26);
  m.area("Main deck", 34, 6, 50, 26);
  m.setSpawn(52, 22);
  return m.build();
}

/** The working deck below: crew bunks, workshop, armoury, galley, mess, stairs, cargo hold. */
export function secondDeck(): BuiltMap {
  const m = new MapBuilder({
    id: "second-deck",
    ambient: 0.3,
    version: 2,
    name: "Second Deck",
    width: 106,
    height: 38,
    outdoor: true,
    dark: false,
    private: false,
    background: "#0e2236",
  });
  m.hull({ x: 7, y: 6, w: 94, h: 24, bow: "point", bowLen: 15, stern: 5, floor: "floor", side: 40, ports: true, figurehead: true });

  // North wall along the straight run, rooms divided by beams with doorways.
  m.wall(22, 7, 72, 2);
  const door = (x: number) => {
    m.beam(x, 7, 1, 8);
    m.beam(x, 19, 1, 10);
    m.post(x, 7);
    m.post(x, 14);
    m.post(x, 19);
  };
  door(36);
  door(76);
  door(83);

  // --- 1. Crew quarters (bunks) ---
  m.place(P.bunk, 22, 9);
  m.place(P.bunk, 26, 9);
  m.place(P.bunk, 30, 9);
  m.place(P.banner, 25, 7);
  m.rug(P.rug(4, 3, C.red, false), 27, 14);
  m.place(P.chest(false), 33, 13);
  m.lantern(25, 13);
  // --- 2. Workshop, walled off along the south side ---
  m.beam(22, 21, 6, 1);
  m.beam(31, 21, 5, 1);
  m.post(27, 21);
  m.post(31, 21);
  m.place(P.table(4, 2, "mugs"), 24, 24);
  m.place(P.weaponRack, 31, 23);
  m.place(P.barrel, 22, 25);
  m.place(P.crate, 34, 26);
  m.lantern(29, 26);

  // --- 3. Armoury and 4. Galley along the north wall ---
  m.place(P.weaponRack, 38, 8);
  m.place(P.weaponRack, 41, 8);
  m.place(P.target, 45, 8);
  m.place(P.weaponRack, 48, 8);
  m.beam(37, 12, 7, 1);
  m.beam(48, 12, 8, 1);
  m.post(43, 12);
  m.post(48, 12);
  m.beam(56, 7, 1, 6);
  m.place(P.stove, 64, 8);
  m.place(P.counter(5), 58, 8);
  m.place(P.counter(4), 67, 8);
  m.place(P.barrel, 72, 10);
  m.place(P.sack, 73, 10);
  m.beam(57, 12, 6, 1);
  m.beam(67, 12, 9, 1);
  m.post(62, 12);
  m.post(67, 12);
  m.wallLamp(53, 7);
  m.wallLamp(70, 7);

  // --- 5. Mess hall ---
  m.rug(P.rug(6, 5), 53, 17);
  m.place(P.table(8, 2, "food"), 41, 18);
  m.place(P.bench(8), 41, 17);
  m.place(P.bench(8), 41, 20);
  m.place(P.table(8, 2, "food"), 63, 18);
  m.place(P.bench(8), 63, 17);
  m.place(P.bench(8), 63, 20);
  for (const x of [40, 52, 62, 74]) m.lantern(x, 14);
  for (const [x, y] of [[38, 26], [39, 26], [74, 26]]) m.place(P.barrel, x, y);
  m.place(P.crate, 73, 26);

  // --- 6/7. Stairs up and down ---
  m.place(P.stairs(4, 4), 78, 9);
  m.place(P.stairs(4, 4), 78, 23);

  // --- 8. Cargo hold ---
  m.place(P.cargoNet, 86, 7);
  for (const [x, y] of [[85, 10], [86, 10], [85, 11], [89, 10], [93, 11], [94, 11], [93, 12]]) m.place(P.crate, x, y);
  for (const [x, y] of [[90, 12], [91, 12], [85, 25], [86, 25], [86, 26], [92, 26], [93, 26]]) m.place(P.barrel, x, y);
  for (const [x, y] of [[88, 26], [89, 26], [96, 15], [96, 16]]) m.place(P.sack, x, y);
  m.place(P.chest(false), 90, 16);
  m.lantern(88, 20);

  m.area("Crew quarters", 18, 9, 18, 12);
  m.area("Workshop", 18, 22, 18, 8);
  m.area("Armoury", 37, 9, 19, 3);
  m.area("Galley", 57, 9, 19, 3);
  m.area("Stairs to First Deck", 77, 7, 6, 9);
  m.area("Stairs to Lower Deck", 77, 20, 6, 10);
  m.area("Cargo hold", 84, 6, 17, 24);
  m.area("Mess hall", 37, 13, 39, 17);
  m.area("Second Deck", 0, 0, 106, 38);
  m.setSpawn(56, 24);
  return m.build();
}
