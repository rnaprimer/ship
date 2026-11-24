import { Canvas } from "../lib/canvas.ts";

/** Ocean texture used by the animated TileSprite (32×32, tiles seamlessly). */
export function drawOcean(): Canvas {
  const c = new Canvas(32, 32);
  c.rect(0, 0, 32, 32, "#0f2a40");
  // Gentle depth variation.
  for (let y = 0; y < 32; y++)
    for (let x = 0; x < 32; x++) if ((x * 3 + y * 5) % 23 === 0) c.set(x, y, "#0d263a");
  const crests: Array<[number, number, number]> = [
    [2, 3, 5],
    [18, 7, 4],
    [9, 13, 6],
    [25, 18, 5],
    [4, 23, 4],
    [15, 27, 5],
    [28, 1, 3],
    [12, 20, 3],
  ];
  for (const [x, y, len] of crests) {
    for (let i = 0; i < len; i++) c.set((x + i) % 32, y, "#1d4c6b");
    c.set((x + 1) % 32, y - 1, "#2f6a8c");
    c.set((x + 2) % 32, y - 1, "#2f6a8c");
    c.set((x + len - 1) % 32, y + 1, "#0a1f30");
    c.set((x + len) % 32, y + 1, "#0a1f30");
  }
  for (const [x, y] of [
    [12, 4],
    [28, 11],
    [21, 22],
    [7, 30],
    [3, 16],
  ])
    c.set(x, y, "#5f9ab8");
  return c;
}

/** Foam strip along the waterline (16×6, tiles horizontally). */
export function drawFoam(): Canvas {
  const c = new Canvas(16, 6);
  for (let x = 0; x < 16; x++) {
    c.set(x, 0, "#cfe8efcc");
    if (x % 3 !== 1) c.set(x, 1, "#cfe8ef99");
    if (x % 5 === 0 || x % 7 === 2) c.set(x, 2, "#cfe8ef66");
    if (x % 6 === 3) c.set(x, 4, "#cfe8ef44");
  }
  return c;
}
