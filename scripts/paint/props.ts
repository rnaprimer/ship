/**
 * Furniture and decor, drawn at pixel level on a w×h tile canvas.
 *
 * `tall` is the number of top tile rows drawn on the layer above the
 * characters (so a passenger walking behind a lantern or canopy is covered).
 * By default the remaining rows block movement; `block` overrides that with
 * a tile rect [x, y, w, h] relative to the prop, or false for none.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Painter } from "./painter.ts";
import { C, emblem, bigEmblem, shadow } from "./materials.ts";
import { decodePng } from "../lib/png.ts";

/** Where an animated flame sits, in the prop's own pixels: big torch flame or small lamp flame. */
export type Flame = [x: number, y: number, size: "big" | "small"];

export type Prop = {
  w: number;
  h: number;
  tall?: number;
  block?: [number, number, number, number] | false;
  /** Pixels the drawing reaches above its footprint (drawn over characters). */
  overhang?: number;
  /** Flames the game animates on top (prop pixels, including the overhang). */
  flames?: Flame[];
  draw: (p: Painter) => void;
};

// --- Hand-drawn sprites (art/props.px.js, built with pxl) ------------------------
const SPRITES = join(dirname(fileURLToPath(import.meta.url)), "..", "art", "sprites");
const spriteCache = new Map<string, Painter>();

/** Loads a pxl sprite as a painter. */
export function sprite(name: string): Painter {
  let p = spriteCache.get(name);
  if (!p) {
    const png = decodePng(readFileSync(join(SPRITES, `${name}.png`)));
    p = new Painter(png.width, png.height);
    p.canvas.data.set(png.data);
    spriteCache.set(name, p);
  }
  return p;
}

/**
 * A prop drawn from a sprite, standing bottom-centred on a w×h tile footprint
 * with a soft contact shadow. Taller sprites overhang upwards. `pick` cycles
 * through variants so rows of barrels don't all look the same.
 */
export function spriteProp(
  names: string | string[],
  w: number,
  h: number,
  opts: { block?: Prop["block"]; flames?: (sx: number, sy: number) => Flame[]; lift?: number; noShadow?: boolean } = {},
): Prop {
  const list = Array.isArray(names) ? names : [names];
  const tallest = Math.max(...list.map((n) => sprite(n).height));
  const overhang = Math.max(0, tallest - h * 16 + 1 + (opts.lift ?? 0));
  let next = 0;
  const first = sprite(list[0]);
  const sx0 = Math.floor((w * 16 - first.width) / 2);
  const sy0 = overhang + h * 16 - first.height - 1 - (opts.lift ?? 0);
  return {
    w,
    h,
    overhang,
    block: opts.block,
    flames: opts.flames?.(sx0, sy0),
    draw(p) {
      const s = sprite(list[next++ % list.length]);
      const sx = Math.floor((w * 16 - s.width) / 2);
      const sy = overhang + h * 16 - s.height - 1 - (opts.lift ?? 0);
      if (!opts.noShadow) p.ellipse(sx + s.width / 2, sy + s.height - 1, s.width / 2, 2.5, "#1a0d05", 0.35);
      p.blit(s, sx, sy);
    },
  };
}

const O = C.outline;

// --- Containers ---------------------------------------------------------------

export const barrel: Prop = spriteProp(["barrel", "barrel", "barrel_open", "barrel", "barrel_water"], 1, 1);
export const crate: Prop = spriteProp(["crate", "crate", "crate"], 1, 1);
export const fruitCrate: Prop = spriteProp(["crate_apples", "crate_oranges"], 1, 1);
export const sack: Prop = spriteProp("sack", 1, 1);
export const keg: Prop = spriteProp("keg", 2, 1);
export const skullPile: Prop = spriteProp("skull_pile", 2, 1);
export const chestGold: Prop = spriteProp("chest_gold", 2, 1);
export const coins: Prop = spriteProp("coins", 1, 1, { block: false, noShadow: true });
/** Things set down on a table: drawn on the tabletop, no extra blocking. */
export const tankards: Prop = spriteProp("tankards", 1, 1, { block: false, noShadow: true, lift: 6 });
export const potions: Prop = spriteProp("potions", 1, 1, { block: false, noShadow: true, lift: 4 });
export const bottleShelf: Prop = spriteProp("bottle_shelf", 2, 1, { block: false, noShadow: true, lift: 4 });
export const candelabra: Prop = spriteProp("candelabra", 1, 1, {
  flames: (sx, sy) => [[sx, sy - 1, "small"], [sx + 5, sy - 1, "small"], [sx + 10, sy - 1, "small"]],
});
/** A candelabra standing on a tabletop (drawn raised; the table already blocks). */
export const candelabraTable: Prop = spriteProp("candelabra", 1, 1, {
  block: false,
  noShadow: true,
  lift: 8,
  flames: (sx, sy) => [[sx, sy - 1, "small"], [sx + 5, sy - 1, "small"], [sx + 10, sy - 1, "small"]],
});
/** A torch in a wall bracket (place on a wall face). */
export const torch: Prop = spriteProp("torch", 1, 1, { block: false, noShadow: true, flames: (sx, sy) => [[sx + 2, sy - 4, "big"]] });
export const brazier: Prop = spriteProp("brazier", 1, 1, { flames: (sx, sy) => [[sx + 6, sy - 4, "big"]] });

export const barrelOld: Prop = {
  w: 1,
  h: 1,
  draw(p) {
    shadow(p, 2, 12, 12, 4);
    p.ellipse(8, 8, 6.5, 7, O);
    p.ellipse(8, 8, 5.5, 6, C.beam);
    p.ellipse(8, 7, 4.5, 4.5, C.beamLight);
    p.ring(8, 7, 4.5, 1, C.iron);
    p.ellipse(8, 7, 3, 3, C.beam);
    p.px(6, 5, C.deckLight);
    p.hline(3, 11, 10, C.iron);
  },
};

export const crateOld: Prop = {
  w: 1,
  h: 1,
  draw(p) {
    shadow(p, 1, 13, 15, 3);
    p.box(1, 1, 14, 14, C.deck, O);
    p.rect(2, 2, 12, 2, C.deckLight);
    p.rect(2, 12, 12, 2, C.deckDark);
    p.vline(2, 2, 12, C.deckDark);
    p.vline(13, 2, 12, C.deckDark);
    for (let i = 0; i < 10; i++) p.px(3 + i, 3 + i, C.deckSeam);
    for (const [x, y] of [[3, 3], [12, 3], [3, 12], [12, 12]]) p.px(x, y, C.iron);
  },
};

export const sackOld: Prop = {
  w: 1,
  h: 1,
  draw(p) {
    shadow(p, 2, 12, 13, 4);
    p.ellipse(8, 9, 6.5, 6, O);
    p.ellipse(8, 9, 5.5, 5, C.cream);
    p.ellipse(7, 8, 3, 3, C.linen);
    p.rect(6, 2, 4, 4, O);
    p.rect(7, 3, 2, 3, C.creamDark);
  },
};

export function chest(open = false, gold = false): Prop {
  return {
    w: 2,
    h: 2,
    tall: 1,
    block: [0, 1, 2, 1],
    draw(p) {
      shadow(p, 2, 26, 28, 5);
      p.box(3, 12, 26, 16, C.beam, O);
      p.rect(4, 13, 24, 2, C.beamLight);
      p.rect(3, 19, 26, 2, C.gold);
      p.vline(8, 12, 16, C.gold);
      p.vline(23, 12, 16, C.gold);
      p.box(14, 17, 4, 6, C.goldLight, O);
      if (open) {
        p.box(3, 3, 26, 10, C.beamDark, O);
        p.rect(4, 4, 24, 3, C.beam);
        if (gold) {
          p.ellipse(16, 13, 11, 4, C.goldCoin);
          for (const [x, y] of [[8, 12], [13, 11], [19, 12], [24, 13], [16, 10]]) p.px(x, y, C.goldLight);
          p.px(11, 13, C.gem);
          p.px(21, 11, C.potionPurple);
        }
      } else {
        p.box(3, 6, 26, 8, C.beamDark, O);
        p.rect(4, 7, 24, 2, C.beamLight);
        p.hline(3, 9, 26, C.gold);
      }
    },
  };
}

export const goldPile: Prop = {
  w: 3,
  h: 2,
  draw(p) {
    p.ellipse(24, 20, 22, 10, C.goldDark);
    p.ellipse(24, 18, 19, 8, C.goldCoin);
    p.ellipse(22, 15, 10, 5, C.goldLight);
    for (let i = 0; i < 30; i++) {
      const x = 6 + ((i * 37) % 36);
      const y = 12 + ((i * 17) % 14);
      p.px(x, y, i % 5 === 0 ? C.gem : i % 3 ? C.goldLight : C.goldDark);
    }
    p.rect(30, 8, 6, 8, C.gold); // a goblet
    p.rect(31, 16, 4, 3, C.goldDark);
    p.px(32, 10, C.redLight);
  },
};

// --- Light ----------------------------------------------------------------------

/** Lantern on a post: base blocks, the lamp is drawn over characters. */
export const lanternPost: Prop = {
  w: 1,
  h: 2,
  tall: 1,
  draw(p) {
    p.rect(6, 6, 4, 22, O);
    p.rect(7, 6, 2, 22, C.beamDark);
    p.ellipse(8, 28, 5, 2.5, C.beamDark);
    lamp(p, 8, 6);
  },
};

/** A hanging lamp centred at (cx, cy). */
export function lamp(p: Painter, cx: number, cy: number): void {
  p.rect(cx - 4, cy - 6, 8, 2, O);
  p.rect(cx - 3, cy - 7, 6, 1, C.goldDark);
  p.box(cx - 4, cy - 4, 8, 10, C.glow, O);
  p.rect(cx - 2, cy - 2, 4, 6, C.flame);
  p.vline(cx, cy - 3, 8, C.goldDark);
  p.rect(cx - 4, cy + 6, 8, 2, O);
}

/** A lamp mounted on a wall face. */
export const wallLamp: Prop = {
  w: 1,
  h: 1,
  block: false,
  draw(p) {
    p.glow(8, 8, 8, C.glow, 0.5);
    p.rect(7, 0, 2, 4, C.goldDark);
    lamp(p, 8, 8);
  },
};

export const candles: Prop = {
  w: 1,
  h: 1,
  flames: [[4, 3, "small"], [8, 0, "small"], [11, 4, "small"]],
  draw(p) {
    p.glow(8, 6, 8, C.glow, 0.6);
    p.ellipse(8, 13, 6, 2, C.goldDark);
    for (const [x, h] of [[4, 6], [8, 9], [11, 5]]) {
      p.rect(x, 13 - h, 3, h, C.linen);
      p.vline(x + 2, 13 - h, h, C.linenDark);
      p.px(x + 1, 12 - h, C.flame);
      p.px(x + 1, 11 - h, C.glowWarm);
    }
  },
};

// --- Furniture ------------------------------------------------------------------

export function table(w: number, h: number, items: "map" | "food" | "mugs" | "none" = "none"): Prop {
  return {
    w,
    h,
    draw(p) {
      const W = w * 16;
      const H = h * 16;
      shadow(p, 2, H - 5, W - 2, 5);
      p.box(1, 2, W - 2, H - 7, C.beam, O);
      p.rect(2, 3, W - 4, 2, C.beamLight);
      for (let x = 8; x < W - 4; x += 12) p.vline(x, 5, H - 11, C.beamDark, 0.5);
      p.rect(2, H - 5, 3, 4, O);
      p.rect(W - 5, H - 5, 3, 4, O);
      if (items === "map") {
        p.box(6, 6, W - 12, H - 15, C.paper, C.paperDark);
        for (let i = 0; i < 8; i++) p.ellipse(10 + ((i * 23) % (W - 22)), 10 + ((i * 11) % Math.max(1, H - 22)), 3, 2, C.paperDark);
        p.line(9, H - 12, W - 12, 9, C.red);
        p.px(W - 12, 9, O);
      } else if (items === "food") {
        for (let x = 6; x < W - 8; x += 14) {
          p.ellipse(x + 4, 9, 4, 3, C.linen);
          p.ellipse(x + 4, 9, 2, 1.5, x % 28 ? C.redLight : C.leafLight);
          p.rect(x + 2, 15, 3, 4, C.goldDark);
        }
      } else if (items === "mugs") {
        for (let x = 6; x < W - 6; x += 10) {
          p.box(x, 8, 5, 6, C.beamLight, O);
          p.px(x + 2, 9, C.cream);
        }
      }
    },
  };
}

export function bench(w: number): Prop {
  return {
    w,
    h: 1,
    draw(p) {
      const W = w * 16;
      shadow(p, 1, 12, W - 2, 4);
      p.box(1, 4, W - 2, 8, C.beam, O);
      p.hline(2, 5, W - 4, C.beamLight);
      p.rect(3, 12, 2, 3, O);
      p.rect(W - 5, 12, 2, 3, O);
    },
  };
}

export const stool: Prop = {
  w: 1,
  h: 1,
  draw(p) {
    shadow(p, 3, 11, 10, 4);
    p.ellipse(8, 8, 5, 4, O);
    p.ellipse(8, 7, 4, 3, C.redLight);
    p.rect(7, 11, 2, 4, O);
  },
};

export const roundTable: Prop = {
  w: 2,
  h: 2,
  draw(p) {
    shadow(p, 4, 22, 24, 7);
    p.ellipse(16, 14, 12, 10, O);
    p.ellipse(16, 13, 11, 9, C.beam);
    p.ellipse(15, 11, 8, 5, C.beamLight);
    p.rect(14, 22, 4, 6, O);
    p.ellipse(16, 12, 3, 2, C.linen);
  },
};

export function armchair(facing: "down" | "up" | "left" | "right" = "down"): Prop {
  return {
    w: 1,
    h: 1,
    draw(p) {
      shadow(p, 1, 12, 15, 4);
      p.box(1, 2, 14, 13, C.red, O);
      p.rect(2, 8, 12, 6, C.redLight);
      if (facing === "down") p.rect(2, 3, 12, 4, C.redDark);
      if (facing === "up") p.rect(2, 11, 12, 3, C.redDark);
      if (facing === "left") p.rect(10, 3, 4, 11, C.redDark);
      if (facing === "right") p.rect(2, 3, 4, 11, C.redDark);
      p.px(4, 4, C.gold);
      p.px(11, 4, C.gold);
    },
  };
}

export const sofa: Prop = {
  w: 3,
  h: 1,
  draw(p) {
    shadow(p, 1, 12, 46, 4);
    p.box(1, 1, 46, 14, C.red, O);
    p.rect(2, 2, 44, 5, C.redDark);
    p.rect(4, 7, 40, 6, C.redLight);
    p.vline(18, 7, 6, C.red);
    p.vline(30, 7, 6, C.red);
    p.rect(1, 4, 4, 11, C.redDark);
    p.rect(43, 4, 4, 11, C.redDark);
    for (let x = 6; x < 44; x += 8) p.px(x, 4, C.gold);
  },
};

export function bed(blanket: string = C.red): Prop {
  return {
    w: 2,
    h: 3,
    tall: 1,
    block: [0, 1, 2, 2],
    draw(p) {
      shadow(p, 3, 42, 28, 6);
      p.box(2, 2, 28, 10, C.beamDark, O); // headboard
      p.rect(3, 3, 26, 2, C.beamLight);
      p.box(0, 0, 5, 5, C.gold, O);
      p.box(27, 0, 5, 5, C.gold, O);
      p.box(3, 10, 26, 34, C.linen, O);
      p.box(6, 12, 20, 9, "#ffffff", C.linenDark);
      p.rect(4, 22, 24, 21, blanket);
      p.hline(4, 22, 24, C.linen);
      p.hline(4, 24, 24, C.redLight);
      for (let y = 28; y < 42; y += 5) p.hline(4, y, 24, C.redDark, 0.5);
      p.box(2, 42, 28, 4, C.beam, O);
    },
  };
}

export const bunk: Prop = {
  w: 2,
  h: 3,
  tall: 1,
  block: [0, 1, 2, 2],
  draw(p) {
    shadow(p, 2, 42, 30, 6);
    p.box(1, 1, 30, 46, C.beamDark, O);
    for (const y of [3, 25]) {
      p.box(3, y, 26, 20, C.linen, C.linenDark);
      p.box(6, y + 2, 20, 6, "#ffffff", C.linenDark);
      p.rect(4, y + 10, 24, 9, C.red);
      p.hline(4, y + 10, 24, C.redLight);
    }
    p.box(0, 0, 4, 48, C.beam, O);
    p.box(28, 0, 4, 48, C.beam, O);
  },
};

export const desk: Prop = {
  w: 3,
  h: 2,
  draw(p) {
    shadow(p, 2, 26, 44, 6);
    p.box(1, 4, 46, 22, C.beam, O);
    p.rect(2, 5, 44, 2, C.beamLight);
    p.box(6, 8, 18, 13, C.paper, C.paperDark); // map
    p.ellipse(12, 13, 3, 2, C.paperDark);
    p.ellipse(19, 16, 2, 2, C.paperDark);
    p.line(10, 18, 20, 11, C.red);
    p.box(29, 9, 9, 11, C.linen, C.linenDark); // notes
    for (let y = 11; y < 19; y += 2) p.hline(31, y, 5, C.ink);
    candleStick(p, 41, 12);
    p.rect(3, 26, 4, 4, O);
    p.rect(41, 26, 4, 4, O);
  },
};

function candleStick(p: Painter, x: number, y: number): void {
  p.glow(x, y - 4, 10, C.glow, 0.6);
  p.ellipse(x, y + 5, 3, 1.5, C.goldDark);
  p.rect(x - 1, y - 2, 3, 7, C.linen);
  p.px(x, y - 3, C.flame);
  p.px(x, y - 4, C.glowWarm);
}

export const chair: Prop = {
  w: 1,
  h: 1,
  draw(p) {
    shadow(p, 2, 12, 12, 4);
    p.box(3, 1, 10, 6, C.beamDark, O);
    p.box(3, 6, 10, 7, C.beam, O);
    p.rect(3, 13, 2, 2, O);
    p.rect(11, 13, 2, 2, O);
  },
};

/** Bookshelf against a wall: 2 wide, 2 tall, the top row drawn over characters. */
export function bookshelf(bottles = false): Prop {
  return {
    w: 2,
    h: 2,
    tall: 1,
    block: [0, 1, 2, 1],
    draw(p) {
      p.box(0, 0, 32, 30, C.beamDark, O);
      const books = [C.red, C.leafDark, "#2f4f8f", C.goldDark, C.redDark, "#5a3a7a", C.beamLight];
      for (const y of [2, 11, 20]) {
        p.rect(2, y, 28, 8, C.wallDark);
        for (let x = 2, i = y; x < 29; i++) {
          const bw = 2 + (i % 3);
          if (bottles && i % 2) {
            p.rect(x, y + 3, bw, 5, [C.potionGreen, C.potionPurple, C.potionBlue][i % 3]);
            p.px(x, y + 2, C.cream);
          } else p.rect(x, y + 1 + (i % 2), bw, 7 - (i % 2), books[i % books.length]);
          x += bw + 1;
        }
        p.hline(1, y + 8, 30, C.beam);
      }
    },
  };
}

export const plant: Prop = {
  w: 1,
  h: 2,
  tall: 1,
  draw(p) {
    shadow(p, 2, 28, 13, 4);
    p.box(3, 20, 10, 10, C.pot, O);
    p.hline(4, 21, 8, "#b5683b");
    p.rect(3, 22, 10, 1, C.goldDark);
    // Palm fronds radiating from the pot.
    for (const [dx, dy] of [[-7, -9], [7, -9], [-8, -2], [8, -2], [0, -12], [-4, -12], [4, -12]]) {
      p.line(8, 20, 8 + dx, 20 + dy, C.leafDark);
      p.line(8, 19, 8 + dx, 19 + dy, C.leaf);
      p.px(8 + dx, 19 + dy, C.leafLight);
    }
    p.ellipse(8, 14, 4, 3, C.leaf);
    p.ellipse(7, 12, 2, 2, C.leafLight);
  },
};

export const globe: Prop = {
  w: 1,
  h: 2,
  tall: 1,
  draw(p) {
    shadow(p, 3, 27, 11, 4);
    p.rect(5, 26, 6, 3, C.goldDark);
    p.vline(8, 18, 9, C.goldDark);
    p.ring(8, 12, 7, 1, C.gold);
    p.ellipse(8, 12, 5.5, 5.5, "#3f7fa0");
    p.ellipse(6, 10, 2.5, 2, C.leafLight);
    p.ellipse(10, 14, 2, 1.5, C.paperDark);
    p.px(6, 9, "#ffffff");
  },
};

/** A wall banner, red with the emblem. Sits on a wall face; doesn't block. */
export const banner: Prop = {
  w: 1,
  h: 2,
  block: false,
  draw(p) {
    p.rect(1, 1, 14, 2, C.goldDark);
    p.box(2, 2, 12, 24, C.red, O);
    p.vline(3, 3, 22, C.redLight);
    p.vline(12, 3, 22, C.redDark);
    for (let i = 0; i < 4; i++) {
      p.px(3 + i, 25 + i, C.red);
      p.px(12 - i, 25 + i, C.red);
    }
    p.rect(7, 26, 2, 4, C.red);
    p.px(7, 29, C.gold);
    // Crossed sabres.
    p.line(4, 7, 11, 16, C.cream);
    p.line(11, 7, 4, 16, C.cream);
    p.px(4, 17, C.gold);
    p.px(11, 17, C.gold);
    p.rect(7, 19, 2, 2, C.gold);
  },
};

/** An arched window glowing with lantern light, on a wall face. */
export const wallWindow: Prop = {
  w: 2,
  h: 2,
  block: false,
  draw(p) {
    p.ellipse(16, 12, 11, 11, O);
    p.rect(5, 12, 22, 16, O);
    p.ellipse(16, 12, 10, 10, C.beamDark);
    p.rect(6, 12, 20, 15, C.beamDark);
    p.ellipse(16, 13, 8, 8, C.glow);
    p.rect(8, 13, 16, 12, C.glow);
    p.rect(10, 16, 12, 8, C.flame);
    for (let i = -10; i < 22; i += 4) p.line(8 + i, 25, 18 + i, 8, C.goldDark);
    for (let i = -10; i < 22; i += 4) p.line(8 + i, 8, 18 + i, 25, C.goldDark);
    p.rect(5, 26, 22, 3, C.beam);
  },
};

/** Voyage / notice board with a pinned chart. */
export const noticeBoard: Prop = {
  w: 3,
  h: 2,
  block: false,
  draw(p) {
    p.box(1, 2, 46, 26, C.beam, O);
    p.rect(3, 4, 42, 22, "#8a6a42");
    p.box(5, 6, 22, 16, C.paper, C.paperDark);
    p.ellipse(12, 12, 4, 3, C.paperDark);
    p.ellipse(20, 16, 3, 2, C.paperDark);
    p.line(9, 18, 22, 9, C.red);
    for (const [x, y] of [[30, 7], [37, 12], [30, 17]]) {
      p.box(x, y, 8, 7, C.linen, C.linenDark);
      p.px(x + 3, y, C.red);
    }
    p.rect(0, 0, 48, 3, C.goldDark);
  },
};

export const wheel: Prop = {
  w: 2,
  h: 2,
  tall: 1,
  draw(p) {
    shadow(p, 4, 26, 24, 5);
    p.rect(14, 18, 4, 11, O);
    p.rect(15, 18, 2, 11, C.beam);
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      p.line(16, 13, 16 + Math.cos(ang) * 13, 13 + Math.sin(ang) * 13, C.beamLight);
      p.ellipse(16 + Math.cos(ang) * 13, 13 + Math.sin(ang) * 13, 1.5, 1.5, C.beamDark);
    }
    p.ring(16, 13, 10, 2, C.beam);
    p.ring(16, 13, 10, 1, C.beamLight);
    p.ellipse(16, 13, 3, 3, C.gold);
    p.px(15, 12, C.goldLight);
  },
};

export const cannon: Prop = {
  w: 1,
  h: 2,
  draw(p) {
    shadow(p, 1, 26, 15, 5);
    p.box(1, 16, 14, 12, C.beam, O); // carriage
    p.ellipse(3, 27, 2.5, 2.5, O);
    p.ellipse(13, 27, 2.5, 2.5, O);
    p.rect(4, 1, 8, 22, O); // barrel, pointing north
    p.rect(5, 1, 6, 21, C.iron);
    p.vline(6, 2, 19, C.ironLight);
    p.rect(3, 1, 10, 3, O);
    p.rect(4, 2, 8, 1, C.ironLight);
  },
};

/** A deck gun pointing out through the rail (south), run out and ready. */
export const cannonOut: Prop = {
  w: 1,
  h: 2,
  draw(p) {
    shadow(p, 1, 28, 15, 4);
    p.box(1, 2, 14, 12, C.beam, O); // carriage
    p.hline(2, 3, 12, C.beamLight);
    p.ellipse(3, 13, 2.5, 2.5, O);
    p.ellipse(13, 13, 2.5, 2.5, O);
    p.rect(4, 6, 8, 25, O); // barrel, pointing south
    p.rect(5, 6, 6, 24, C.iron);
    p.vline(6, 7, 22, C.ironLight);
    p.rect(3, 28, 10, 3, O);
    p.rect(4, 28, 8, 1, C.ironLight);
    p.ellipse(8, 5, 3, 2, C.iron); // cascabel
  },
};

/** A brass light switch on a wall face. */
export const lightSwitch: Prop = {
  w: 1,
  h: 1,
  block: false,
  draw(p) {
    p.box(4, 2, 8, 12, C.gold, O);
    p.rect(5, 3, 6, 2, C.goldLight);
    p.rect(7, 5, 2, 6, O);
    p.rect(7, 5, 2, 3, C.goldLight);
  },
};

/** A mast seen from above: a thick round post with iron bands and coiled rope. */
export const mast: Prop = {
  w: 2,
  h: 3,
  tall: 2,
  block: [0, 2, 2, 1],
  draw(p) {
    p.ellipse(16, 42, 13, 5, C.deckSeam);
    p.ring(16, 41, 12, 3, C.creamDark); // coiled rope
    p.ring(16, 41, 9, 2, C.cream);
    p.rect(9, 4, 14, 38, O);
    p.rect(10, 4, 12, 38, C.beam);
    p.rect(11, 4, 3, 38, C.beamLight);
    p.rect(19, 4, 2, 38, C.beamDark);
    for (const y of [8, 20, 32]) {
      p.rect(9, y, 14, 3, C.gold);
      p.hline(9, y, 14, C.goldLight);
    }
    p.ellipse(16, 4, 7, 3, C.beamLight);
    p.ellipse(16, 4, 4, 1.5, C.beam);
  },
};

/** Iron cargo grating set into the deck (walkable-looking, but blocks). */
export function grate(w: number, h: number): Prop {
  return {
    w,
    h,
    draw(p) {
      const W = w * 16;
      const H = h * 16;
      p.box(1, 1, W - 2, H - 2, C.beamDark, O);
      p.rect(3, 3, W - 6, H - 6, "#1a0f08");
      for (let x = 4; x < W - 4; x += 4) p.vline(x, 3, H - 6, C.beam);
      for (let y = 4; y < H - 4; y += 4) p.hline(3, y, W - 6, C.beam);
      p.hline(1, 1, W - 2, C.beamLight);
    },
  };
}

/** Wooden stairs going down (south to north, darkening). */
export function stairs(w: number, h: number): Prop {
  return {
    w,
    h,
    draw(p) {
      const W = w * 16;
      const H = h * 16;
      p.rect(0, 0, W, H, C.wallDark);
      for (let y = 0; y < H; y += 6) {
        const t = y / H;
        p.rect(4, y, W - 8, 5, t < 0.4 ? C.floorDark : t < 0.7 ? C.floor : C.floorLight);
        p.hline(4, y, W - 8, C.deckLight, 0.6);
        p.hline(4, y + 5, W - 8, O);
      }
      p.rect(0, 0, 4, H, C.beam);
      p.rect(W - 4, 0, 4, H, C.beam);
      p.vline(1, 0, H, C.beamLight);
      p.vline(W - 3, 0, H, C.beamLight);
      for (let y = 4; y < H; y += 16) {
        p.rect(0, y, 4, 4, C.gold);
        p.rect(W - 4, y, 4, 4, C.gold);
      }
    },
  };
}

export const weaponRack: Prop = {
  w: 2,
  h: 2,
  tall: 1,
  block: [0, 1, 2, 1],
  draw(p) {
    p.box(1, 2, 30, 26, C.beamDark, O);
    p.hline(2, 8, 28, C.beam);
    p.hline(2, 20, 28, C.beam);
    for (let x = 5; x < 29; x += 6) {
      p.line(x, 4, x + 2, 24, C.ironLight); // sabres and pikes
      p.px(x + 2, 24, C.gold);
      p.rect(x + 1, 18, 3, 2, C.goldDark);
    }
  },
};

export const target: Prop = {
  w: 1,
  h: 2,
  tall: 1,
  draw(p) {
    p.rect(7, 18, 2, 12, C.beamDark);
    p.ellipse(8, 11, 7, 7, O);
    p.ellipse(8, 11, 6, 6, C.cream);
    p.ellipse(8, 11, 4, 4, C.red);
    p.ellipse(8, 11, 2, 2, C.cream);
    p.px(8, 11, C.red);
  },
};

export const stove: Prop = {
  w: 2,
  h: 2,
  tall: 1,
  block: [0, 1, 2, 1],
  draw(p) {
    p.glow(16, 22, 16, C.glowWarm, 0.5);
    p.box(1, 4, 30, 26, C.iron, O);
    p.rect(2, 5, 28, 3, C.ironLight);
    p.box(8, 16, 16, 11, "#1a0f08", O);
    p.rect(10, 20, 12, 6, C.glowWarm);
    p.rect(12, 22, 8, 4, C.flame);
    p.box(12, 0, 8, 6, C.iron, O); // flue
    p.ellipse(9, 10, 4, 2, "#2a2a30"); // pots
    p.ellipse(23, 10, 4, 2, "#2a2a30");
  },
};

export function counter(w: number, food = true): Prop {
  return {
    w,
    h: 2,
    tall: 1,
    block: [0, 1, w, 1],
    draw(p) {
      const W = w * 16;
      p.box(1, 10, W - 2, 20, C.beam, O);
      p.rect(2, 11, W - 4, 3, C.beamLight);
      for (let x = 6; x < W - 6; x += 12) p.vline(x, 16, 13, C.beamDark);
      // Shelf above with pots and jars.
      p.box(1, 0, W - 2, 6, C.beamDark, O);
      for (let x = 4; x < W - 6; x += 7) p.rect(x, 1, 4, 4, [C.goldDark, C.potionGreen, C.cream][x % 3]);
      if (food)
        for (let x = 6; x < W - 10; x += 14) {
          p.ellipse(x + 4, 12, 4, 2, C.linen);
          p.ellipse(x + 4, 12, 2, 1, x % 28 ? C.redLight : C.goldCoin);
        }
    },
  };
}

export const cargoNet: Prop = {
  w: 3,
  h: 2,
  block: false,
  draw(p) {
    for (let i = 0; i < 48; i += 6) {
      p.line(i, 2, i + 8, 26, C.creamDark);
      p.line(i + 8, 2, i, 26, C.creamDark);
    }
    p.hline(0, 1, 48, C.beam);
    for (let x = 0; x < 48; x += 8) p.ellipse(x + 4, 4 + ((x * 3) % 5), 2, 3, C.creamDark);
  },
};

/** Jail-cell bars, drawn over the floor (a full wall of bars). */
export function bars(w: number): Prop {
  return {
    w,
    h: 1,
    tall: 1,
    block: [0, 0, w, 1],
    draw(p) {
      const W = w * 16;
      p.rect(0, 0, W, 3, C.iron);
      p.rect(0, 13, W, 3, C.iron);
      for (let x = 2; x < W; x += 5) {
        p.rect(x, 0, 2, 16, O);
        p.vline(x, 0, 16, C.ironLight);
      }
    },
  };
}

export const alchemy: Prop = {
  w: 3,
  h: 2,
  tall: 1,
  block: [0, 1, 3, 1],
  draw(p) {
    p.glow(24, 14, 20, C.potionPurple, 0.35);
    p.box(1, 12, 46, 18, C.beam, O);
    p.rect(2, 13, 44, 2, C.beamLight);
    const bottles: Array<[number, string, number]> = [[6, C.potionGreen, 8], [14, C.potionPurple, 12], [22, C.potionBlue, 6], [34, C.potionPurple, 14], [41, C.potionGreen, 7]];
    for (const [x, c, h] of bottles) {
      p.ellipse(x, 16 - h / 3, 3.5, 3.5, O);
      p.ellipse(x, 16 - h / 3, 2.5, 2.5, c);
      p.rect(x - 1, 16 - h, 2, h - 3, C.linen);
      p.px(x - 1, 15 - h / 3, "#ffffff");
    }
    p.line(26, 4, 34, 2, C.gold); // still coil
    p.ring(30, 8, 5, 1, C.gold);
  },
};

export const curtains: Prop = {
  w: 2,
  h: 2,
  block: false,
  draw(p) {
    for (let x = 0; x < 32; x += 4) {
      p.rect(x, 0, 4, 30 - ((x / 4) % 2) * 2, x % 8 ? C.red : C.redDark);
      p.vline(x, 0, 28, C.redLight, 0.5);
    }
    p.rect(0, 0, 32, 3, C.goldDark);
  },
};

// --- Pool deck ------------------------------------------------------------------

export const lounger: Prop = {
  w: 1,
  h: 2,
  draw(p) {
    shadow(p, 2, 26, 14, 5);
    p.box(1, 1, 14, 28, C.beam, O);
    p.box(2, 2, 12, 10, C.linen, C.linenDark); // raised back
    p.rect(2, 13, 12, 14, C.linen);
    p.rect(2, 20, 12, 4, C.red);
    p.hline(2, 12, 12, O);
  },
};

export const sideTable: Prop = {
  w: 1,
  h: 1,
  draw(p) {
    shadow(p, 3, 11, 10, 4);
    p.ellipse(8, 7, 6, 5, O);
    p.ellipse(8, 6, 5, 4, C.beamLight);
    p.rect(7, 2, 2, 5, C.potionGreen); // a drink
    p.px(7, 1, C.leafLight);
  },
};

/** Canvas cabana: a daybed under a canopy (the canopy is drawn over characters). */
export const cabana: Prop = {
  w: 4,
  h: 4,
  tall: 2,
  block: [0, 2, 4, 2],
  draw(p) {
    shadow(p, 2, 56, 60, 6);
    p.box(6, 30, 52, 28, C.cream, O); // daybed
    p.box(9, 33, 46, 8, C.linen, C.linenDark);
    p.rect(10, 44, 44, 10, C.red);
    for (const x of [3, 57]) for (const y of [8, 54]) p.rect(x, y, 4, 8, C.beam);
    // Canopy.
    p.box(0, 2, 64, 30, C.linen, O);
    for (let x = 4; x < 60; x += 8) p.vline(x, 4, 26, C.linenDark);
    p.rect(1, 3, 62, 3, C.cream);
    for (let x = 1; x < 63; x += 6) {
      p.rect(x, 30, 4, 3, C.linenDark);
    }
  },
};

/** The pool bar: a counter of bottles under a red awning, with stools in front. */
export const bar: Prop = {
  w: 6,
  h: 4,
  tall: 2,
  flames: [[5, 16, "small"], [89, 16, "small"]],
  block: [0, 1, 6, 2],
  draw(p) {
    const W = 96;
    p.box(4, 34, W - 8, 16, C.beam, O); // counter
    p.rect(5, 35, W - 10, 3, C.beamLight);
    for (let x = 10; x < W - 10; x += 10) {
      p.rect(x, 26, 3, 9, [C.potionGreen, C.redLight, C.goldCoin, C.potionBlue][(x / 10) % 4]);
      p.px(x + 1, 25, C.cream);
    }
    for (const x of [16, 34, 52, 70]) {
      p.ellipse(x + 4, 56, 4.5, 3.5, O);
      p.ellipse(x + 4, 55, 3.5, 2.5, C.redLight);
    }
    // Scalloped awning.
    p.box(0, 2, W, 22, C.red, O);
    for (let x = 1; x < W - 1; x += 8) {
      p.rect(x, 3, 4, 20, C.redLight);
      p.ellipse(x + 4, 24, 4, 3, x % 16 ? C.red : C.redDark);
    }
    p.rect(0, 0, W, 3, C.goldDark);
    lamp(p, 6, 18);
    lamp(p, W - 6, 18);
  },
};

export const changingDoor: Prop = {
  w: 2,
  h: 2,
  block: false,
  draw(p) {
    p.box(2, 0, 28, 32, C.beam, O);
    p.vline(16, 1, 30, O);
    for (const x of [4, 18]) {
      p.box(x, 3, 10, 12, C.beamDark, O);
      p.box(x, 17, 10, 12, C.beamDark, O);
    }
    p.rect(13, 15, 2, 3, C.gold);
    p.rect(17, 15, 2, 3, C.gold);
    p.ring(16, 7, 3, 1, C.goldLight); // hanger sign
  },
};

export const shower: Prop = {
  w: 2,
  h: 2,
  tall: 1,
  block: [0, 1, 2, 1],
  draw(p) {
    p.box(1, 0, 30, 30, C.tile, O);
    for (let y = 1; y < 29; y += 6) p.hline(2, y, 28, C.tileDark);
    for (let x = 1; x < 31; x += 6) p.vline(x, 1, 28, C.tileDark);
    p.rect(14, 2, 4, 6, C.goldDark);
    p.ellipse(16, 9, 4, 2, C.gold);
    for (const [x, y] of [[13, 13], [17, 15], [15, 18], [19, 12]]) p.px(x, y, C.waterLight);
    p.box(10, 24, 12, 4, C.ironLight, O);
  },
};

export const lifeRing: Prop = {
  w: 1,
  h: 1,
  block: false,
  draw(p) {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const d = Math.hypot(x - 7.5, y - 7.5);
        if (d > 7.2 || d < 3) continue;
        const q = Math.floor(((Math.atan2(y - 7.5, x - 7.5) + Math.PI) / (Math.PI * 2)) * 4);
        p.px(x, y, d > 6.4 || d < 3.7 ? O : q % 2 ? C.red : C.linen);
      }
  },
};

/** Canvas sun-shade over the planning table (canopy only; place a table under it). */
export function awning(w: number, h: number, color: string = C.linen): Prop {
  return {
    w,
    h,
    tall: h,
    block: false,
    draw(p) {
      const W = w * 16;
      const H = h * 16;
      p.box(0, 0, W, H - 4, color, O);
      for (let x = 6; x < W - 4; x += 10) p.vline(x, 2, H - 8, color === C.linen ? C.linenDark : C.redDark);
      p.rect(1, 1, W - 2, 3, color === C.linen ? C.cream : C.redLight);
      for (let x = 1; x < W - 1; x += 6) p.rect(x, H - 5, 4, 3, color === C.linen ? C.linenDark : C.redDark);
    },
  };
}

export const anchor: Prop = {
  w: 2,
  h: 2,
  draw(p) {
    shadow(p, 4, 26, 24, 5);
    p.rect(14, 4, 4, 20, O);
    p.rect(15, 4, 2, 20, C.ironLight);
    p.ring(16, 4, 4, 2, C.iron);
    p.rect(8, 8, 16, 3, C.iron);
    for (let a = 0; a <= 10; a++) {
      const ang = (a / 10) * Math.PI;
      p.rect(16 + Math.cos(ang) * 11, 18 + Math.sin(ang) * 8, 2, 2, C.iron);
    }
    p.ring(16, 4, 4, 1, C.ironLight);
  },
};

export const ropeCoil: Prop = {
  w: 1,
  h: 1,
  draw(p) {
    shadow(p, 2, 12, 13, 4);
    p.ellipse(8, 8, 6.5, 5.5, C.creamDark);
    p.ring(8, 8, 5, 1, C.paperDark);
    p.ring(8, 8, 3, 1, C.paperDark);
    p.ellipse(8, 8, 1.5, 1.5, O);
  },
};

export const pillar: Prop = {
  w: 2,
  h: 3,
  tall: 2,
  flames: [[3, 20, "small"], [27, 20, "small"]],
  block: [0, 2, 2, 1],
  draw(p) {
    p.ellipse(16, 42, 12, 5, C.wallDark);
    p.rect(8, 6, 16, 38, O);
    p.rect(9, 6, 14, 38, C.wall);
    p.rect(10, 6, 4, 38, C.wallLight);
    p.rect(20, 6, 2, 38, C.wallDark);
    for (const y of [8, 26, 40]) {
      p.rect(7, y, 18, 3, C.gold);
      p.hline(7, y, 18, C.goldLight);
    }
    p.ellipse(16, 6, 9, 4, C.gold);
    p.ellipse(16, 5, 6, 2, C.goldLight);
    lamp(p, 4, 22);
    lamp(p, 28, 22);
  },
};

// --- Rugs (walkable; painted on the floor) ---------------------------------------

export function rug(w: number, h: number, field: string = C.red, withEmblem = true, big = false): Prop {
  return {
    w,
    h,
    block: false,
    draw(p) {
      const W = w * 16;
      const H = h * 16;
      p.rect(1, 1, W - 2, H - 2, C.goldDark);
      p.rect(2, 2, W - 4, H - 4, field);
      p.rect(4, 4, W - 8, H - 8, C.redDark === field ? C.red : C.redDark);
      p.rect(5, 5, W - 10, H - 10, field);
      for (let x = 6; x < W - 6; x += 4) {
        p.px(x, 3, C.gold);
        p.px(x, H - 4, C.gold);
      }
      for (let x = 1; x < W - 1; x += 3) {
        p.px(x, 0, C.creamDark);
        p.px(x, H - 1, C.creamDark);
      }
      if (withEmblem) {
        const sc = Math.min(Math.floor((W - 16) / 16), Math.floor((H - 16) / 14));
        if (big && sc >= 2) bigEmblem(p, Math.floor(W / 2 - (15 * sc) / 2), Math.floor(H / 2 - (13 * sc) / 2), C.cream, C.creamDark, sc);
        else emblem(p, Math.floor(W / 2) - 7, Math.floor(H / 2) - 6);
      }
    },
  };
}

/** Narrow carpet runner (no emblem), any length. */
export function runner(w: number, h: number): Prop {
  return {
    w,
    h,
    block: false,
    draw(p) {
      const W = w * 16;
      const H = h * 16;
      p.rect(0, 0, W, H, C.red);
      if (W < H) {
        p.rect(1, 0, 2, H, C.gold);
        p.rect(W - 3, 0, 2, H, C.gold);
        for (let y = 6; y < H; y += 12) p.rect(W / 2 - 2, y, 4, 4, C.redDark);
      } else {
        p.rect(0, 1, W, 2, C.gold);
        p.rect(0, H - 3, W, 2, C.gold);
        for (let x = 6; x < W; x += 12) p.rect(x, H / 2 - 2, 4, 4, C.redDark);
      }
    },
  };
}

/** Compass-rose ritual circle inlaid in stone, with candles round it. */
export function ritualCircle(size: number): Prop {
  return {
    w: size,
    h: size,
    block: false,
    draw(p) {
      const R = (size * 16) / 2;
      p.ring(R, R, R - 2, 2, C.goldDark);
      p.ring(R, R, R - 7, 1, C.gold);
      p.ring(R, R, R / 2, 1, C.goldDark);
      for (let a = 0; a < 16; a++) {
        const ang = (a / 16) * Math.PI * 2;
        const len = a % 4 === 0 ? R - 8 : a % 2 === 0 ? R * 0.6 : R * 0.4;
        p.line(R, R, R + Math.cos(ang) * len, R + Math.sin(ang) * len, a % 4 === 0 ? C.gold : C.goldDark);
      }
      p.ellipse(R, R, 3, 3, C.gold);
    },
  };
}
