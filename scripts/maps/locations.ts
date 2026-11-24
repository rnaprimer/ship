/**
 * The places a passenger can travel to from the ship map (besides First
 * Deck). Character legend: ./kit.ts.
 */
import { at, canvas, railedDeck, walls, type MapDef } from "./kit.ts";

const INTERIOR_BG = "#140c08";

/** A small private cabin: every passenger gets their own (no one else is shown inside). */
export function personalCabin(): MapDef {
  const W = 16;
  const H = 12;
  const g = canvas(W, H);
  walls(g, 0, 0, W, H, "f", "F");
  g.floor[1][4] = "O";
  g.floor[1][7] = "A";
  g.floor[1][11] = "O";
  g.fill(g.floor, 5, 5, 6, 4, "r");

  g.put(2, 2, "E");
  g.put(2, 3, "e");
  g.put(3, 2, "L");
  g.put(9, 2, "Y");
  g.put(10, 2, "Y");
  g.put(13, 2, "k");
  g.put(8, 6, "T");
  g.put(12, 7, "s");
  g.put(1, 10, "V");
  g.put(14, 10, "X");
  g.put(14, 5, "V");
  g.finishAbove();

  return {
    id: "personal-cabin",
    version: 1,
    name: "Personal Cabin",
    width: W,
    height: H,
    outdoor: false,
    dark: false,
    private: true,
    background: INTERIOR_BG,
    foam: null,
    floor: g.floor,
    obj: g.obj,
    above: g.above,
    areas: [{ name: "Your cabin", x: 0, y: 0, w: W, h: H }],
    spawn: { ...at(7, 9), direction: "up" },
  };
}

/** Marble hall with a grand staircase, chandeliers, a reception desk and two lounges. */
export function grandLobby(): MapDef {
  const W = 30;
  const H = 20;
  const g = canvas(W, H);
  walls(g, 0, 0, W, H, "m", "M");
  for (const x of [4, 9, 20, 25]) g.floor[1][x] = "A";
  g.fill(g.floor, 12, 2, 6, 3, "S");
  g.fill(g.floor, 14, 5, 2, 14, "c");

  g.put(11, 4, "Q");
  g.put(18, 4, "Q");
  for (const [x, y] of [[6, 7], [23, 7], [6, 14], [23, 14]]) g.put(x, y, "Q");
  for (let x = 21; x <= 24; x++) g.put(x, 3, "k");
  g.put(26, 3, "L");
  // Lounges: sofa, table, sofa.
  for (const x of [2, 3, 26, 27]) {
    g.put(x, 9, "s");
    g.put(x, 10, "T");
    g.put(x, 11, "s");
  }
  for (const [x, y] of [[1, 2], [28, 2], [1, 18], [28, 18], [10, 2], [19, 2]]) g.put(x, y, "V");
  g.finishAbove();
  g.above.push([9, 9, "CHANDELIER_A"], [20, 9, "CHANDELIER_A"], [14, 13, "CHANDELIER_A"], [15, 13, "CHANDELIER_A"]);

  return {
    id: "grand-lobby",
    version: 1,
    name: "Grand Lobby",
    width: W,
    height: H,
    outdoor: false,
    dark: false,
    private: false,
    background: INTERIOR_BG,
    foam: null,
    floor: g.floor,
    obj: g.obj,
    above: g.above,
    areas: [
      { name: "Grand staircase", x: 11, y: 2, w: 8, h: 3 },
      { name: "Reception", x: 20, y: 2, w: 6, h: 3 },
      { name: "West lounge", x: 1, y: 8, w: 5, h: 5 },
      { name: "East lounge", x: 25, y: 8, w: 4, h: 5 },
      { name: "Grand Lobby", x: 0, y: 0, w: W, h: H },
    ],
    spawn: { ...at(14, 17), direction: "up" },
  };
}

/** An open sun deck with a pool, loungers, umbrellas and a bar. */
export function swimmingPool(): MapDef {
  const W = 32;
  const H = 22;
  const g = canvas(W, H);
  railedDeck(g, 1, 1, 30, 17, "t", "t");
  // The pool, 14×7 tiles.
  g.floor[6][9] = "{";
  g.fill(g.floor, 10, 6, 12, 1, "^");
  g.floor[6][22] = "}";
  for (let y = 7; y <= 11; y++) {
    g.floor[y][9] = "<";
    g.fill(g.floor, 10, y, 12, 1, "w");
    g.floor[y][22] = ">";
  }
  g.fill(g.floor, 9, 12, 14, 1, "v");

  for (const x of [10, 12, 14, 17, 19, 21]) {
    g.put(x, 4, "l");
    g.put(x, 14, "l");
  }
  for (const [x, y] of [[5, 6], [26, 6], [5, 12], [26, 12]]) g.put(x, y, "u");
  for (const [x, y] of [[2, 2], [29, 2], [2, 16], [29, 16]]) g.put(x, y, "V");
  g.put(2, 9, "O");
  g.put(29, 9, "O");
  for (let x = 24; x <= 27; x++) g.put(x, 15, "k");
  g.put(28, 15, "B");
  g.put(8, 3, "L");
  g.put(23, 3, "L");
  g.finishAbove();

  return {
    id: "swimming-pool",
    version: 1,
    name: "Swimming Pool",
    width: W,
    height: H,
    outdoor: true,
    dark: false,
    private: false,
    background: "#0b2a3d",
    foam: { x: 1, y: 20, w: 30 },
    floor: g.floor,
    obj: g.obj,
    above: g.above,
    areas: [
      { name: "Pool bar", x: 23, y: 14, w: 6, h: 3 },
      { name: "Poolside", x: 8, y: 5, w: 16, h: 9 },
      { name: "Sun deck", x: 0, y: 0, w: W, h: H },
    ],
    spawn: { ...at(15, 16), direction: "up" },
  };
}

/** A hidden night deck: a chart table, treasure chests and candlelight. */
export function secretDeck(): MapDef {
  const W = 28;
  const H = 20;
  const g = canvas(W, H);
  railedDeck(g, 1, 1, 26, 15, "n", "N");

  g.put(13, 8, "m");
  g.put(14, 8, "m");
  g.put(12, 7, "c");
  g.put(15, 7, "c");
  for (const [x, y, ch] of [[4, 3, "J"], [5, 3, "X"], [22, 3, "X"], [23, 3, "J"], [3, 13, "X"], [24, 13, "J"]] as const) g.put(x, y, ch);
  for (const [x, y, ch] of [[2, 6, "B"], [2, 7, "C"], [25, 6, "B"], [25, 7, "C"], [6, 13, "c"], [21, 13, "c"]] as const) g.put(x, y, ch);
  g.put(10, 2, "G");
  g.put(17, 2, "G");
  g.put(20, 11, "M");
  g.put(21, 12, "R");
  g.put(24, 9, "P");
  for (const [x, y] of [[7, 4], [20, 4], [3, 10], [8, 12]]) g.put(x, y, "L");
  g.finishAbove();

  return {
    id: "secret-deck",
    version: 1,
    name: "Secret Deck",
    width: W,
    height: H,
    outdoor: true,
    dark: true,
    private: false,
    background: "#0b2a3d",
    foam: { x: 1, y: 18, w: 26 },
    floor: g.floor,
    obj: g.obj,
    above: g.above,
    areas: [
      { name: "Chart table", x: 10, y: 6, w: 8, h: 5 },
      { name: "Treasure hoard", x: 2, y: 2, w: 6, h: 4 },
      { name: "Treasure hoard", x: 20, y: 2, w: 6, h: 4 },
      { name: "Secret Deck", x: 0, y: 0, w: W, h: H },
    ],
    spawn: { ...at(13, 13), direction: "up" },
  };
}

/** The gun deck below: cannons at the ports, hammocks, stores and a mess table. */
export function secondDeck(): MapDef {
  const W = 40;
  const H = 14;
  const g = canvas(W, H);
  walls(g, 0, 0, W, H, "f", "F");
  for (let x = 3; x < W - 1; x += 4) g.floor[1][x] = "O";
  g.fill(g.floor, 1, 9, 2, 4, "S");

  for (const x of [7, 11, 15, 23, 27, 31]) g.put(x, 2, "G");
  for (const x of [6, 7, 10, 11, 14, 15]) g.put(x, 6, "h");
  for (const [x, y, ch] of [[19, 10, "B"], [20, 10, "B"], [19, 11, "C"], [20, 11, "C"], [21, 11, "B"], [37, 11, "R"], [36, 2, "C"], [37, 2, "B"]] as const) g.put(x, y, ch);
  for (const x of [31, 32, 33]) {
    g.put(x, 7, "b");
    g.put(x, 8, "T");
    g.put(x, 9, "b");
  }
  for (const [x, y] of [[12, 9], [25, 9], [35, 5]]) g.put(x, y, "L");
  g.finishAbove();

  return {
    id: "second-deck",
    version: 1,
    name: "Second Deck",
    width: W,
    height: H,
    outdoor: false,
    dark: false,
    private: false,
    background: INTERIOR_BG,
    foam: null,
    floor: g.floor,
    obj: g.obj,
    above: g.above,
    areas: [
      { name: "Gun deck", x: 3, y: 2, w: 32, h: 2 },
      { name: "Crew quarters", x: 5, y: 5, w: 12, h: 3 },
      { name: "Mess", x: 29, y: 6, w: 8, h: 5 },
      { name: "Second Deck", x: 0, y: 0, w: W, h: H },
    ],
    spawn: { ...at(6, 11), direction: "up" },
  };
}
