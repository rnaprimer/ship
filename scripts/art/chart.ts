/** The sea chart shown when a passenger reads a map (192×128 pixel art). */
import { Painter, rng } from "../paint/painter.ts";
import { C, emblem } from "../paint/materials.ts";

export function drawChart(): Painter {
  const W = 192;
  const H = 128;
  const p = new Painter(W, H);
  const r = rng(42);
  // Parchment with darkened, ragged edges.
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const edge = Math.min(x, y, W - 1 - x, H - 1 - y);
      if (edge < 2 && r() < 0.5) continue;
      const n = r();
      p.px(x, y, edge < 6 ? C.paperDark : n < 0.08 ? "#dcc890" : C.paper);
    }
  // Sea grid.
  for (let x = 16; x < W - 8; x += 24) for (let y = 8; y < H - 8; y += 2) p.px(x, y, "#c9b07a");
  for (let y = 16; y < H - 8; y += 24) for (let x = 8; x < W - 8; x += 2) p.px(x, y, "#c9b07a");
  // Islands.
  const island = (cx: number, cy: number, rx: number, ry: number) => {
    p.ellipse(cx, cy, rx + 2, ry + 2, "#c9a86a");
    p.ellipse(cx, cy, rx, ry, "#9fb36a");
    p.ellipse(cx - 1, cy - 1, rx * 0.5, ry * 0.5, "#7f9a4f");
  };
  island(40, 34, 14, 9);
  island(58, 46, 6, 4);
  island(138, 30, 10, 7);
  island(150, 92, 16, 10);
  island(88, 100, 6, 4);
  // Skull rock.
  p.ellipse(108, 60, 7, 6, C.stoneLight);
  p.rect(105, 58, 2, 2, C.outline);
  p.rect(110, 58, 2, 2, C.outline);
  // Dotted route from the ship to the X.
  const route: Array<[number, number]> = [[20, 104], [44, 96], [70, 84], [92, 76], [120, 74], [140, 80], [150, 90]];
  for (let i = 0; i < route.length - 1; i++) {
    const [x0, y0] = route[i];
    const [x1, y1] = route[i + 1];
    const n = Math.hypot(x1 - x0, y1 - y0);
    for (let k = 0; k < n; k += 4) p.rect(Math.round(x0 + ((x1 - x0) * k) / n), Math.round(y0 + ((y1 - y0) * k) / n), 2, 2, C.red);
  }
  // X marks the spot.
  p.line(146, 86, 154, 94, C.redDark);
  p.line(154, 86, 146, 94, C.redDark);
  p.line(147, 86, 155, 94, C.redDark);
  p.line(155, 86, 147, 94, C.redDark);
  // The ship.
  p.rect(14, 104, 12, 3, C.beamDark);
  p.rect(19, 96, 1, 8, C.beamDark);
  p.rect(16, 97, 6, 5, C.linen);
  // Compass rose.
  const cx = 168;
  const cy = 26;
  p.ring(cx, cy, 13, 1, C.ink);
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 - Math.PI / 2;
    const len = a % 2 ? 7 : 13;
    p.line(cx, cy, cx + Math.cos(ang) * len, cy + Math.sin(ang) * len, a === 0 ? C.red : C.ink);
  }
  // A sea serpent's coils.
  for (let i = 0; i < 4; i++) p.ring(70 + i * 9, 20 + (i % 2) * 3, 4, 1, "#3f6f6a");
  p.px(98, 19, C.ink);
  emblem(p, 10, 8, C.ink, "#7a5a3a");
  return p;
}
