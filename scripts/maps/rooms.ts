/**
 * Secret Deck, Grand Lobby, Swimming Pool and Personal Cabin, after the
 * owner's reference sheets (2026-11-24). Coordinates are in 16 px tiles.
 */
import { MapBuilder, TILE, type BuiltMap } from "../paint/mapkit.ts";
import * as P from "../paint/props.ts";
import { C, bigEmblem, postCap } from "../paint/materials.ts";
import type { Painter } from "../paint/painter.ts";

/** A hidden stone deck: smuggler's hold, brig, treasure vault, map room, alchemy lab, ritual chamber. */
export function secretDeck(): BuiltMap {
  const m = new MapBuilder({
    id: "secret-deck",
    ambient: 0.42,
    version: 2,
    name: "Secret Deck",
    width: 100,
    height: 34,
    outdoor: true,
    dark: false,
    private: false,
    background: "#0e2236",
  });
  m.hull({ x: 5, y: 5, w: 90, h: 22, bow: "round", bowLen: 6, stern: 6, floor: "stone", side: 24 });
  m.wall(11, 6, 78, 2, true);
  for (const x of [22, 34, 54, 71, 81]) {
    m.beam(x, 6, 1, 8);
    m.beam(x, 18, 1, 8);
    m.post(x, 6);
    m.post(x, 13);
    m.post(x, 18);
  }

  // 1. Smuggler's hold.
  m.place(P.cargoNet, 12, 6);
  for (const [x, y] of [[10, 9], [11, 9], [10, 10], [12, 22], [13, 22], [11, 23], [12, 23]]) m.place(P.barrel, x, y);
  for (const [x, y] of [[16, 9], [17, 9], [16, 10], [18, 22], [19, 22], [19, 21]]) m.place(P.crate, x, y);
  m.place(P.sack, 14, 23);
  m.place(P.sack, 19, 10);
  m.lantern(15, 15);

  // 2. Brig: a cell above and below the corridor, behind bars.
  m.place(P.bed(C.redDark), 25, 8);
  m.place(P.bed(C.redDark), 30, 8);
  m.place(P.bars(11), 23, 12);
  m.blockRect(23, 8, 11, 4);
  m.place(P.bars(11), 23, 19);
  m.place(P.bed(C.redDark), 25, 21);
  m.place(P.bed(C.redDark), 30, 21);
  m.blockRect(23, 20, 11, 6);
  m.light(28 * 16, 16 * 16, 36, 0.3);

  // 3. Treasure vault.
  m.place(P.banner, 43, 6);
  m.place(P.banner, 46, 6);
  m.rug(P.rug(7, 5, C.red, true, true), 41, 14);
  m.place(P.chest(true, true), 37, 9);
  m.place(P.goldPile, 42, 9);
  m.place(P.chest(true, true), 48, 9);
  m.place(P.chest(false), 36, 22);
  m.place(P.goldPile, 44, 22);
  m.place(P.chest(true, true), 50, 22);
  m.place(P.candles, 40, 9);
  m.place(P.candles, 46, 9);
  m.lantern(36, 15);
  m.lantern(52, 15);

  // 4. Map room / archives.
  m.place(P.bookshelf(), 56, 6);
  m.place(P.noticeBoard, 60, 6);
  m.place(P.bookshelf(), 66, 6);
  m.place(P.table(6, 3, "map"), 59, 14);
  m.place(P.globe, 67, 13);
  m.place(P.candles, 58, 14);
  m.place(P.chest(false), 56, 22);
  m.lantern(68, 22);

  // 5. Alchemy lab.
  m.place(P.alchemy, 73, 8);
  m.place(P.bookshelf(true), 77, 6);
  m.rug(P.rug(4, 3, C.redDark, false), 74, 20);
  m.place(P.candles, 79, 22);
  m.light(76 * 16, 13 * 16, 40, 0.3);

  // 6. Ritual chamber.
  m.place(P.curtains, 82, 6);
  m.place(P.banner, 85, 6);
  m.place(P.curtains, 87, 6);
  m.rug(P.ritualCircle(6), 84, 13);
  for (const [x, y] of [[83, 12], [90, 12], [83, 19], [90, 19], [86, 21]]) m.place(P.candles, x, y);
  m.place(P.bookshelf(), 87, 22);

  // --- Extra detail (Milestone 9) ---
  m.place(P.skullPile, 13, 12);
  m.place(P.skullPile, 90, 9);
  m.place(P.brazier, 86, 11);
  m.place(P.chestGold, 40, 22);
  for (const [x, y] of [[39, 13], [51, 13], [47, 20]]) m.place(P.coins, x, y);
  for (const x of [16, 28, 40, 50, 58, 75, 84]) m.place(P.torch, x, 7);

  // --- Things to do ---
  m.interact("chart", "Study the charts", 59, 14, 6, 3, "Old charts in many hands. One shows an island shaped like a skull, with a note: 'not yet'.");
  m.interact("globe", "Spin the globe", 67, 13, 1, 2);
  m.interact("potion", "Brew a potion", 73, 8, 3, 2);
  m.interact("ritual", "Step into the circle", 85, 14, 4, 4);
  for (const [x, y] of [[37, 9], [48, 9], [50, 22]]) m.interact("chest", "Run your hands through the gold", x, y, 2, 2);

  m.area("Smuggler's hold", 6, 5, 16, 22);
  m.area("Brig", 23, 5, 11, 22);
  m.area("Treasure vault", 35, 5, 19, 22);
  m.area("Map room", 55, 5, 16, 22);
  m.area("Alchemy lab", 72, 5, 9, 22);
  m.area("Ritual chamber", 82, 5, 13, 22);
  m.area("Secret Deck", 0, 0, 100, 34);
  m.setSpawn(44, 19);
  return m.build();
}

/** The great hall: twin staircases, emblem floor, lounges, voyage board and supply desk. */
export function grandLobby(): BuiltMap {
  const m = new MapBuilder({
    id: "grand-lobby",
    ambient: 0.26,
    version: 2,
    name: "Grand Lobby",
    width: 60,
    height: 46,
    outdoor: false,
    dark: false,
    private: false,
    background: "#0e1620",
  });
  m.hull({ x: 4, y: 4, w: 52, h: 36, bow: "round", bowLen: 5, stern: 5, floor: "deck", side: 32 });
  m.wall(10, 5, 40, 4);
  m.place(P.wallWindow, 12, 5);
  m.place(P.banner, 17, 5);
  m.place(P.wallWindow, 29, 5);
  m.place(P.banner, 42, 5);
  m.place(P.wallWindow, 46, 5);
  postCap(m.below, 29 * TILE + 11, 4 * TILE + 2);
  m.wallLamp(24, 6);
  m.wallLamp(35, 6);

  // Grand staircase: two flights either side of a landing that leads to the door.
  m.place(P.stairs(5, 4), 21, 9);
  m.place(P.stairs(5, 4), 34, 9);
  m.rug(P.runner(4, 4), 28, 9);
  m.place(P.plant, 19, 9);
  m.place(P.plant, 40, 9);

  // Central hall: the emblem floor and two lantern columns.
  m.rug(P.runner(2, 3), 29, 13);
  m.rug(P.rug(12, 9, C.red, true, true), 24, 16);
  m.rug(P.runner(2, 11), 29, 25);
  m.place(P.pillar, 19, 18);
  m.place(P.pillar, 39, 18);
  m.light(20 * 16, 20 * 16, 48, 0.3);
  m.light(40 * 16, 20 * 16, 48, 0.3);

  // Crew lounges.
  for (const x of [7, 43]) {
    m.rug(P.rug(7, 5, C.redDark, false), x, 10);
    m.place(P.sofa, x + 2, 10);
    m.place(P.roundTable, x + 2, 12);
    m.place(P.armchair("right"), x + 1, 13);
    m.place(P.armchair("left"), x + 5, 13);
    m.place(P.plant, x === 7 ? 7 : 49, 9);
  }

  // Voyage board (west) and supply desk (east).
  m.place(P.noticeBoard, 8, 21);
  m.blockRect(8, 22, 3, 1);
  m.place(P.table(4, 2, "map"), 8, 24);
  m.place(P.globe, 13, 22);
  m.place(P.barrel, 7, 28);
  m.place(P.crate, 8, 28);
  m.place(P.awning(6, 2, C.red), 44, 22);
  m.place(P.counter(6), 44, 23);
  m.place(P.crate, 51, 27);
  m.place(P.crate, 51, 28);
  m.place(P.barrel, 43, 28);

  for (const [x, y] of [[15, 16], [44, 16], [15, 31], [44, 31], [25, 35], [34, 35]]) m.lantern(x, y);
  // Main entrance from the foredeck.
  m.place(P.stairs(4, 2), 28, 38);
  m.place(P.banner, 25, 38);
  m.place(P.banner, 34, 38);

  // --- Extra detail (Milestone 9) ---
  m.place(P.keg, 50, 25);
  for (const x of [9, 45]) m.place(P.candelabraTable, x, 13);
  for (const x of [15, 20, 39, 44]) m.place(P.torch, x, 8);

  // --- Things to do ---
  m.interact("chart", "Read the voyage board", 8, 21, 3, 2, "Notices: Deck swabbing rota. Lost: one parrot, answers to 'Biscuit'. Next port of call: wherever the wind likes.");
  m.interact("chart", "Read the sea chart", 8, 24, 4, 2, "The whole known sea, inked by hand. Someone has drawn a tiny ship right where we are.");
  m.interact("globe", "Spin the globe", 13, 22, 1, 2);
  m.interact("beer", "Grab a cold one", 44, 23, 6, 2);

  m.area("Grand staircase", 19, 9, 22, 4);
  m.area("Crew lounge", 5, 9, 12, 8);
  m.area("Crew lounge", 42, 9, 13, 8);
  m.area("Voyage board", 5, 20, 11, 10);
  m.area("Supply desk", 42, 20, 13, 10);
  m.area("Main entrance", 24, 31, 12, 9);
  m.area("Central hall", 0, 0, 60, 46);
  m.setSpawn(29, 34);
  return m.build();
}

/** Paints an octagonal pool with a tiled border and an emblem mosaic. */
function pool(m: MapBuilder, tx: number, ty: number, w: number, h: number): void {
  const p: Painter = m.below;
  const X = tx * TILE;
  const Y = ty * TILE;
  const W = w * TILE;
  const H = h * TILE;
  const cut = 28;
  const inOct = (x: number, y: number, inset: number) => {
    const lx = x - X - inset;
    const ly = y - Y - inset;
    const rw = W - 2 * inset;
    const rh = H - 2 * inset;
    if (lx < 0 || ly < 0 || lx >= rw || ly >= rh) return false;
    const c = cut - inset * 0.4;
    return lx + ly >= c && rw - 1 - lx + ly >= c && lx + rh - 1 - ly >= c && rw - 1 - lx + rh - 1 - ly >= c;
  };
  for (let y = Y; y < Y + H; y++)
    for (let x = X; x < X + W; x++) {
      if (!inOct(x, y, 0)) continue;
      if (!inOct(x, y, 2)) p.px(x, y, C.outline);
      else if (!inOct(x, y, 12)) {
        // Border tiles: cream with a gold diamond every 12 px.
        const d = (x - X) % 12;
        const e = (y - Y) % 12;
        p.px(x, y, (d === 6 && e > 3 && e < 9) || (e === 6 && d > 3 && d < 9) ? C.gold : (d === 0 || e === 0 ? C.tileDark : C.tile));
      } else if (!inOct(x, y, 15)) p.px(x, y, C.waterDeep);
      else {
        // Water: caustic ripples in two blues.
        const v = Math.sin(x * 0.35 + Math.sin(y * 0.2) * 2) + Math.sin(y * 0.4 + x * 0.1);
        p.px(x, y, v > 1.3 ? C.waterLight : v < -1.2 ? C.waterDark : C.water);
      }
    }
  // Emblem mosaic on the pool floor.
  bigEmblem(p, X + W / 2 - 30, Y + H / 2 - 26, C.waterDark, C.waterDark, 4);
  // Ladder on the south side.
  const lx = X + W / 2 - 6;
  p.rect(lx, Y + H - 16, 2, 14, C.ironLight);
  p.rect(lx + 10, Y + H - 16, 2, 14, C.ironLight);
  for (let y = Y + H - 14; y < Y + H - 2; y += 4) p.hline(lx, y, 12, C.ironLight);
  m.blockRect(tx, ty, w, h);
}

/** The pool deck: pool, sun loungers, bar, cabana, changing room and shower. */
export function swimmingPool(): BuiltMap {
  const m = new MapBuilder({
    id: "swimming-pool",
    ambient: 0.12,
    version: 2,
    name: "Swimming Pool",
    width: 66,
    height: 48,
    outdoor: true,
    dark: false,
    private: false,
    background: "#0e2236",
  });
  m.hull({ x: 5, y: 5, w: 56, h: 36, bow: "round", bowLen: 6, stern: 6, floor: "deck", side: 40 });
  m.wall(11, 6, 44, 3);
  m.place(P.banner, 22, 6);
  m.place(P.banner, 40, 6);
  pool(m, 20, 15, 24, 13);

  m.place(P.cabana, 9, 9);
  m.place(P.bar, 28, 8);
  m.place(P.changingDoor, 44, 6);
  m.place(P.shower, 48, 7);
  for (const [x, y] of [[17, 9], [38, 9], [53, 9], [9, 32], [55, 32]]) m.place(P.plant, x, y);
  for (const [x, y] of [[18, 14], [45, 14], [18, 28], [45, 28]]) m.lantern(x, y, 40);
  for (const y of [16, 22]) {
    m.place(P.lounger, 10, y);
    m.place(P.sideTable, 11, y);
    m.place(P.lounger, 12, y);
    m.place(P.lounger, 52, y);
    m.place(P.sideTable, 53, y);
    m.place(P.lounger, 54, y);
  }
  m.rug(P.rug(3, 2, C.red, false), 40, 11);
  for (const x of [22, 26, 36, 40]) m.place(P.lounger, x, 31);
  for (const x of [24, 38]) m.place(P.sideTable, x, 32);
  for (const [x, y] of [[19, 12], [44, 12], [19, 29], [44, 29]]) m.place(P.plant, x, y);
  m.place(P.chest(false), 50, 34);
  m.place(P.barrel, 49, 35);
  m.place(P.lifeRing, 24, 40);
  m.place(P.lifeRing, 39, 40);

  // --- Extra detail (Milestone 9) ---
  m.place(P.keg, 34, 9);
  m.place(P.fruitCrate, 36, 10);
  m.place(P.bottleShelf, 30, 7);
  for (const x of [15, 26, 42, 52]) m.place(P.torch, x, 8);

  // --- Things to do ---
  m.interact("bar", "Order a drink", 28, 8, 6, 3);
  m.interact("pool", "Take a dip", 20, 15, 24, 13);
  m.interact("bed", "Nap in the cabana", 9, 9, 4, 4);
  for (const y of [16, 22]) for (const x of [10, 12, 52, 54]) m.interact("bed", "Sunbathe", x, y, 1, 2);
  m.interact("chest", "Open the chest", 50, 34, 2, 2);

  m.area("Pool", 19, 14, 26, 15);
  m.area("Sun lounge", 8, 15, 9, 13);
  m.area("Sun lounge", 48, 15, 10, 13);
  m.area("Drinks & bar", 26, 9, 12, 5);
  m.area("Shade cabana", 7, 8, 9, 7);
  m.area("Changing room & shower", 42, 8, 10, 4);
  m.area("Sun deck", 0, 0, 66, 48);
  m.setSpawn(32, 33);
  return m.build();
}

/** Tall lattice windows along the curved stern wall of the cabin. */
function sternWindows(m: MapBuilder, tx: number, ty: number, h: number): void {
  const p = m.below;
  const X = tx * TILE;
  for (let y = ty * TILE; y < (ty + h) * TILE; y++) {
    // The wall bows outwards towards the middle.
    const t = (y - ty * TILE) / (h * TILE) - 0.5;
    const bulge = Math.round(10 * (1 - 4 * t * t));
    for (let x = X; x < X + 32 + bulge; x++) {
      const local = x - X;
      let c: string = C.beam;
      if (local >= 32 + bulge - 2) c = C.outline;
      else if (local >= 32 + bulge - 6) c = C.beamLight;
      else if (local >= 6 && local < 24 + bulge) {
        const ry = (y - ty * TILE) % 40;
        if (ry < 4) c = C.gold;
        else c = (local + ry) % 6 === 0 || (local - ry + 60) % 6 === 0 ? C.goldDark : ry < 20 ? C.glow : C.flame;
      }
      p.px(x, y, c);
    }
  }
  for (let y = ty * TILE; y < (ty + h) * TILE; y += 40) postCap(p, X + 1, y - 3);
  for (let y = ty + 1; y < ty + h; y += 4) m.light(X - 40, y * TILE + 8, 40, 0.25);
  m.blockRect(tx, ty, 3, h);
}

/** A private cabin: bed, desk, shelves, emblem rug and the stern windows. */
export function personalCabin(): BuiltMap {
  const m = new MapBuilder({
    id: "personal-cabin",
    ambient: 0.32,
    version: 2,
    name: "Personal Cabin",
    width: 36,
    height: 28,
    outdoor: false,
    dark: false,
    private: true,
    background: "#0e1620",
  });
  m.floor("floor", 4, 7, 25, 16);
  m.wall(4, 4, 25, 3);
  m.beam(3, 4, 1, 20);
  m.beam(3, 23, 26, 1);
  sternWindows(m, 29, 4, 20);
  for (const [x, y] of [[3, 4], [3, 23], [28, 23], [28, 4]]) m.post(x, y);
  // The door in the west wall.
  m.below.box(3 * TILE - 2, 13 * TILE, 16 + 4, 32, C.beamDark, C.outline);
  m.below.rect(3 * TILE + 8, 14 * TILE + 4, 3, 3, C.gold);

  m.place(P.banner, 6, 4);
  m.place(P.bookshelf(), 9, 5);
  m.place(P.bookshelf(), 11, 5);
  m.wallLamp(16, 5);
  m.place(P.desk, 14, 7);
  m.place(P.chair, 15, 9);
  m.place(P.bookshelf(true), 20, 5);
  m.place(P.plant, 23, 5);
  m.place(P.bed(), 25, 7);
  m.place(P.chest(false), 5, 8);
  m.rug(P.rug(9, 6, C.red, true, true), 11, 12);
  m.place(P.table(3, 2, "map"), 14, 18);
  m.place(P.globe, 26, 17);
  m.place(P.plant, 5, 19);
  m.place(P.sack, 22, 21);
  m.place(P.crate, 23, 21);
  m.light(16 * 16, 9 * 16, 40, 0.3);

  // --- Extra detail (Milestone 9) ---
  m.place(P.candelabraTable, 14, 8);
  m.place(P.bottleShelf, 26, 5);
  m.place(P.coins, 7, 9);

  // --- Things to do ---
  m.place(P.lightSwitch, 19, 6);
  m.interact("light", "Switch the lights", 19, 6);
  m.interact("bed", "Go to sleep", 25, 7, 2, 3);
  m.interact("chart", "Read your logbook", 14, 7, 3, 2, "Your own log. First entry: 'Came aboard. The ship is bigger than it looks from the Reel.'");
  m.interact("chart", "Read the sea chart", 14, 18, 3, 2, "A chart of the waters ahead, with your cabin's window marked by a little star.");
  m.interact("globe", "Spin the globe", 26, 17, 1, 2);
  m.interact("chest", "Open your chest", 5, 8, 2, 2);

  m.area("Your cabin", 0, 0, 36, 28);
  m.setSpawn(10, 20);
  return m.build();
}
