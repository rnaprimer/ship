/** Minimal RGBA pixel buffer for drawing placeholder pixel art. */
export type Color = string; // "#rrggbb" or "#rrggbbaa"; "" means transparent

const cache = new Map<string, [number, number, number, number]>();

function parse(color: Color): [number, number, number, number] {
  let rgba = cache.get(color);
  if (!rgba) {
    if (color === "") {
      rgba = [0, 0, 0, 0];
    } else {
      const hex = color.replace("#", "");
      if (!/^[0-9a-f]{6}([0-9a-f]{2})?$/i.test(hex)) throw new Error(`Bad colour ${color}`);
      rgba = [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16),
        hex.length === 8 ? parseInt(hex.slice(6, 8), 16) : 255,
      ];
    }
    cache.set(color, rgba);
  }
  return rgba;
}

export class Canvas {
  readonly data: Uint8Array;
  readonly width: number;
  readonly height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height * 4);
  }

  set(x: number, y: number, color: Color): void {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const [r, g, b, a] = parse(color);
    const i = (y * this.width + x) * 4;
    this.data[i] = r;
    this.data[i + 1] = g;
    this.data[i + 2] = b;
    this.data[i + 3] = a;
  }

  rect(x: number, y: number, w: number, h: number, color: Color): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, color);
  }

  /** Returns a view that draws into one cell of a grid (a tile or a sprite frame). */
  cell(col: number, row: number, cellW: number, cellH: number): Cell {
    return new Cell(this, col * cellW, row * cellH, cellW, cellH);
  }
}

export class Cell {
  private readonly canvas: Canvas;
  readonly ox: number;
  readonly oy: number;
  readonly w: number;
  readonly h: number;

  constructor(canvas: Canvas, ox: number, oy: number, w: number, h: number) {
    this.canvas = canvas;
    this.ox = ox;
    this.oy = oy;
    this.w = w;
    this.h = h;
  }

  set(x: number, y: number, color: Color): void {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    this.canvas.set(this.ox + x, this.oy + y, color);
  }

  rect(x: number, y: number, w: number, h: number, color: Color): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.set(xx, yy, color);
  }

  /** Draws an ASCII pixel map; each char is looked up in `palette` ("." = skip). */
  pattern(x: number, y: number, rows: string[], palette: Record<string, Color>, mirror = false): void {
    rows.forEach((row, dy) => {
      [...row].forEach((ch, dx) => {
        if (ch === "." || ch === " ") return;
        const color = palette[ch];
        if (color === undefined) throw new Error(`No palette entry for "${ch}"`);
        const px = mirror ? x + row.length - 1 - dx : x + dx;
        this.set(px, y + dy, color);
      });
    });
  }
}
