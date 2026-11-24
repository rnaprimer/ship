/**
 * Builds one place on the ship as two painted layers plus a walkability grid.
 *
 *   below   floors, walls, rugs, furniture (drawn under characters)
 *   above   the tops of tall things: lamps, canopies, mast tops (over characters)
 *   walk    one flag per 16×16 tile; everything starts blocked
 *
 * The build script slices both layers into a per-map tileset and writes a
 * Tiled map plus the walkability JSON the server validates against.
 */
import { Painter, mix } from "./painter.ts";
import { C, DECK_TONE, FLOOR_TONE, frame, planks, postCap, stoneFloor, wallFace, stoneWallFace, shadow } from "./materials.ts";
import { lamp, type Prop } from "./props.ts";

export const TILE = 16;
export type Direction = "up" | "down" | "left" | "right";
export type AreaRect = { name: string; x: number; y: number; w: number; h: number };

export type MapMeta = {
  id: string;
  version: number;
  name: string;
  /** Size in tiles. */
  width: number;
  height: number;
  /** The animated ocean shows around the hull. */
  outdoor: boolean;
  dark: boolean;
  private: boolean;
  background: string;
  /** How far the base colours are pulled into shadow before lights are added (0..1). */
  ambient?: number;
};

export type BuiltMap = MapMeta & {
  below: Painter;
  above: Painter;
  walk: boolean[][];
  areas: AreaRect[];
  spawn: { x: number; y: number; direction: Direction };
};

type Floor = "deck" | "floor" | "stone";

export type HullSpec = {
  /** Outer bounds in tiles. */
  x: number;
  y: number;
  w: number;
  h: number;
  bow: "point" | "round";
  /** How far the bow curve reaches in, in tiles. */
  bowLen: number;
  /** Stern rounding, in tiles. */
  stern: number;
  floor: Floor;
  /** Hull side visible below the south rail, in pixels (0 for none). */
  side: number;
  ports?: boolean;
  figurehead?: boolean;
};

type Queued = { prop: Prop; tx: number; ty: number; floorLayer: boolean; order: number };

export class MapBuilder {
  readonly below: Painter;
  readonly above: Painter;
  readonly walk: boolean[][];
  private readonly areas: AreaRect[] = [];
  private readonly queue: Queued[] = [];
  private readonly lights: Array<[number, number, number, number]> = [];
  private spawn: BuiltMap["spawn"] | null = null;
  readonly meta: MapMeta;

  constructor(meta: MapMeta) {
    this.meta = meta;
    this.below = new Painter(meta.width * TILE, meta.height * TILE);
    this.above = new Painter(meta.width * TILE, meta.height * TILE);
    this.walk = Array.from({ length: meta.height }, () => Array<boolean>(meta.width).fill(false));
  }

  // --- Walkability ---------------------------------------------------------------

  walkRect(tx: number, ty: number, w: number, h: number): void {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) if (this.walk[y]?.[x] !== undefined) this.walk[y][x] = true;
  }

  blockRect(tx: number, ty: number, w: number, h: number): void {
    for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) if (this.walk[y]?.[x] !== undefined) this.walk[y][x] = false;
  }

  // --- Surfaces --------------------------------------------------------------------

  floor(kind: Floor, tx: number, ty: number, w: number, h: number, seed = tx * 31 + ty): void {
    const [x, y, pw, ph] = [tx * TILE, ty * TILE, w * TILE, h * TILE];
    if (kind === "stone") stoneFloor(this.below, x, y, pw, ph, seed);
    else planks(this.below, x, y, pw, ph, kind === "deck" ? DECK_TONE : FLOOR_TONE, seed);
    this.walkRect(tx, ty, w, h);
  }

  /** A wall face `h` tiles tall (default 2): blocks, and shades the floor below it. */
  wall(tx: number, ty: number, w: number, h = 2, stone = false): void {
    if (stone) stoneWallFace(this.below, tx * TILE, ty * TILE, w * TILE, h * TILE);
    else wallFace(this.below, tx * TILE, ty * TILE, w * TILE, h * TILE, tx + ty);
    shadow(this.below, tx * TILE, (ty + h) * TILE, w * TILE, 8, 0.4);
    this.blockRect(tx, ty, w, h);
  }

  /** A top-down beam (room divider or outer frame), one tile thick. */
  beam(tx: number, ty: number, w: number, h: number): void {
    frame(this.below, tx * TILE, ty * TILE, w * TILE, h * TILE);
    if (w >= h) shadow(this.below, tx * TILE, (ty + h) * TILE, w * TILE, 5, 0.35);
    this.blockRect(tx, ty, w, h);
  }

  /** A gold post cap at a beam joint. */
  post(tx: number, ty: number): void {
    postCap(this.below, tx * TILE + 3, ty * TILE + 3);
  }

  // --- Things ----------------------------------------------------------------------

  place(prop: Prop, tx: number, ty: number): void {
    this.queue.push({ prop, tx, ty, floorLayer: false, order: this.queue.length });
  }

  /** Rugs and floor inlays: painted before lights and furniture; never block. */
  rug(prop: Prop, tx: number, ty: number): void {
    this.queue.push({ prop, tx, ty, floorLayer: true, order: this.queue.length });
  }

  /** Warm light pool on the floor (pixels). */
  light(px: number, py: number, r = 40, strength = 0.35, color: string = C.glowWarm): void {
    this.lights.push([px, py, r, strength]);
    void color;
  }

  /** A lantern on a post that also lights the floor around it. */
  lantern(tx: number, ty: number, r = 44): void {
    this.queue.push({ prop: LANTERN, tx, ty, floorLayer: false, order: this.queue.length });
    this.light(tx * TILE + 8, ty * TILE + 10, r);
  }

  /** A lamp hung on a wall face at tile (tx, ty), lighting the floor below. */
  wallLamp(tx: number, ty: number): void {
    lamp(this.below, tx * TILE + 8, ty * TILE + 8);
    this.light(tx * TILE + 8, (ty + 1) * TILE + 8, 40, 0.3);
  }

  area(name: string, tx: number, ty: number, w: number, h: number): void {
    this.areas.push({ name, x: tx, y: ty, w, h });
  }

  setSpawn(tx: number, ty: number, direction: Direction = "up"): void {
    this.spawn = { x: tx * TILE + 8, y: ty * TILE + 12, direction };
  }

  // --- Hull --------------------------------------------------------------------------

  /**
   * A ship's deck seen from above: curved bow and stern, a one-tile rail or
   * frame all round, the deck inside, and the hull's side below the south rail.
   * Returns the inner (walkable) shape test in pixels.
   */
  hull(spec: HullSpec): (px: number, py: number) => boolean {
    const X = spec.x * TILE;
    const Y = spec.y * TILE;
    const W = spec.w * TILE;
    const H = spec.h * TILE;
    const cy = Y + H / 2;
    const half = H / 2;
    const bowLen = spec.bowLen * TILE;
    const stern = spec.stern * TILE;

    const inside = (px: number, py: number, inset: number): boolean => {
      const t = Math.abs(py + 0.5 - cy) / (half - inset);
      if (t > 1) return false;
      const left =
        spec.bow === "point" ? X + inset * 1.4 + bowLen * Math.pow(t, 1.8) : X + inset + bowLen * (1 - Math.sqrt(1 - t * t));
      const right = X + W - inset - stern * (1 - Math.sqrt(1 - t * t));
      return px + 0.5 >= left && px + 0.5 < right;
    };
    const RAIL = TILE;
    const deck = (px: number, py: number) => inside(px, py, RAIL);
    const b = this.below;

    // Hull side below the south edge, then a faint wake round it.
    if (spec.side > 0) {
      for (let px = X; px < X + W; px++) {
        let yb = -1;
        for (let py = Y + H - 1; py >= Y; py--)
          if (inside(px, py, 0)) {
            yb = py;
            break;
          }
        if (yb < 0) continue;
        for (let k = 1; k <= spec.side; k++) {
          const py = yb + k;
          const band = Math.floor((k - 1) / 6);
          let c: string = band % 2 ? C.hull : C.hullLight;
          if ((k - 1) % 6 === 5) c = C.hullDark;
          if (k > spec.side - 6) c = k > spec.side - 2 ? C.hullDark : C.waterline;
          b.px(px, py, c);
        }
        for (let k = 1; k <= 4; k++) b.px(px, yb + spec.side + k, "#dff3f8", 0.35 - k * 0.07);
      }
      if (spec.ports) {
        const y0 = Y + H + 2;
        for (let px = X + bowLen + 40; px < X + W - stern - 24; px += 72) {
          // The port sits where the side is full height.
          b.box(px, y0, 18, 14, "#120a05", C.outline);
          b.rect(px, y0, 18, 2, C.redDark);
          b.rect(px + 5, y0 + 9, 8, 9, C.outline);
          b.rect(px + 6, y0 + 9, 6, 8, C.iron);
          b.vline(px + 7, y0 + 10, 6, C.ironLight);
        }
      }
    }

    // Rail / frame band with a light outer edge and a dark inner edge.
    for (let py = Y; py < Y + H; py++)
      for (let px = X; px < X + W; px++) {
        if (!inside(px, py, 0) || deck(px, py)) continue;
        let c: string = C.beam;
        if (!inside(px, py, 1)) c = C.outline;
        else if (!inside(px, py, 3)) c = C.beamLight;
        else if (!inside(px, py, RAIL - 3)) c = (px + py) % 9 === 0 ? C.beamDark : C.beam;
        else c = C.beamDark;
        b.px(px, py, c);
      }
    // Gold caps along the straight runs of the rail.
    for (let px = X + bowLen + 24; px < X + W - stern - 16; px += 64) {
      postCap(b, px, Y + 3);
      postCap(b, px, Y + H - 13);
    }

    // The deck.
    const kind = spec.floor;
    if (kind === "stone") stoneFloor(b, X, Y, W, H, 7, deck);
    else planks(b, X, Y, W, H, kind === "deck" ? DECK_TONE : FLOOR_TONE, spec.x * 13 + spec.y, deck);
    // Shadow under the north rail.
    for (let py = Y + RAIL; py < Y + RAIL + 8; py++)
      for (let px = X; px < X + W; px++) if (deck(px, py) && !deck(px, py - (py - Y - RAIL + 1))) b.tint(px, py, "#1a0d05", 0.3 * (1 - (py - Y - RAIL) / 8));

    if (spec.figurehead) this.figurehead(X + spec.bowLen * 0 + 2, cy);

    // Tiles whose whole area is deck are walkable.
    for (let ty = spec.y; ty < spec.y + spec.h; ty++)
      for (let tx = spec.x; tx < spec.x + spec.w; tx++) {
        const pts: Array<[number, number]> = [[1, 1], [14, 1], [1, 14], [14, 14], [8, 8]];
        if (pts.every(([dx, dy]) => inside(tx * TILE + dx, ty * TILE + dy, RAIL + 1))) this.walk[ty][tx] = true;
      }
    return deck;
  }

  /** Bowsprit, hanging lantern and a gilded figurehead at the bow tip. */
  private figurehead(x: number, cy: number): void {
    const b = this.below;
    b.rect(x - 70, cy - 4, 80, 8, C.outline);
    b.rect(x - 69, cy - 3, 78, 6, C.beam);
    b.hline(x - 69, cy - 3, 78, C.beamLight);
    for (const k of [x - 60, x - 40, x - 20]) b.rect(k, cy - 4, 3, 8, C.gold);
    b.vline(x - 56, cy + 4, 10, C.outline);
    lamp(b, x - 56, cy + 20);
    // A gilded lion's head with a curling mane.
    b.ellipse(x - 2, cy + 14, 13, 11, C.outline);
    b.ellipse(x - 2, cy + 14, 12, 10, C.goldDark);
    for (let a = 0; a < 10; a++) {
      const ang = (a / 10) * Math.PI * 2;
      b.ellipse(x - 2 + Math.cos(ang) * 9, cy + 14 + Math.sin(ang) * 8, 3, 3, a % 2 ? C.gold : C.goldDark);
    }
    b.ellipse(x - 6, cy + 14, 6, 6, C.gold);
    b.ellipse(x - 8, cy + 12, 3, 2, C.goldLight);
    b.px(x - 9, cy + 12, C.outline);
    b.rect(x - 12, cy + 16, 4, 2, C.goldDark);
  }

  // --- Output ----------------------------------------------------------------------

  build(): BuiltMap {
    if (!this.spawn) throw new Error(`${this.meta.id}: no spawn`);
    const queue = [...this.queue];
    const paint = (q: Queued) => {
      const { prop, tx, ty } = q;
      const tmp = new Painter(prop.w * TILE, prop.h * TILE);
      prop.draw(tmp);
      const tall = (prop.tall ?? 0) * TILE;
      if (tall > 0) this.above.blit(tmp, tx * TILE, ty * TILE, 0, tall);
      this.below.blit(tmp, tx * TILE, ty * TILE, tall, tmp.height);
      if (q.floorLayer || prop.block === false) return;
      const [bx, by, bw, bh] = prop.block ?? [0, prop.tall ?? 0, prop.w, prop.h - (prop.tall ?? 0)];
      this.blockRect(tx + bx, ty + by, bw, bh);
    };
    queue.filter((q) => q.floorLayer).forEach(paint);
    // Warm grade: pull everything towards shadow, then let the lamps light it back up.
    const ambient = this.meta.ambient ?? 0.2;
    for (let y = 0; y < this.below.height; y++) for (let x = 0; x < this.below.width; x++) this.below.tint(x, y, "#2a1205", ambient);
    for (const [x, y, r, s] of this.lights) this.below.glow(x, y, r * 1.25, "#ffc46b", Math.min(0.7, s * 1.4));
    // Furniture back to front, so nearer things overlap farther ones.
    queue
      .filter((q) => !q.floorLayer)
      .sort((a, b) => a.ty + a.prop.h - (b.ty + b.prop.h) || a.order - b.order)
      .forEach(paint);
    return { ...this.meta, below: this.below, above: this.above, walk: this.walk, areas: this.areas, spawn: this.spawn };
  }
}

const LANTERN: Prop = {
  w: 1,
  h: 2,
  tall: 1,
  draw(p) {
    p.rect(6, 8, 4, 21, C.outline);
    p.rect(7, 8, 2, 21, C.beamDark);
    p.ellipse(8, 29, 5, 2.5, C.beamDark);
    lamp(p, 8, 7);
  },
};

export { mix };
