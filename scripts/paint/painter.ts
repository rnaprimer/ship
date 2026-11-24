/**
 * Pixel painter used to draw whole maps as images (Milestone 7). Every
 * operation works in integer pixels; colours are "#rrggbb" plus an optional
 * alpha (0..1) that is composited over what is already there.
 */
import { Canvas } from "../lib/canvas.ts";

type RGB = [number, number, number];
const rgbCache = new Map<string, RGB>();
export function rgb(hex: string): RGB {
  let v = rgbCache.get(hex);
  if (!v) {
    const h = hex.replace("#", "");
    v = [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
    rgbCache.set(hex, v);
  }
  return v;
}

/** Mixes two hex colours (t = 0..1 towards b). */
export function mix(a: string, b: string, t: number): string {
  const pa = rgb(a);
  const pb = rgb(b);
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join("")}`;
}

/** Deterministic random numbers, so the maps come out the same on every build. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Painter {
  readonly canvas: Canvas;
  readonly width: number;
  readonly height: number;
  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.canvas = new Canvas(width, height);
  }

  get data() {
    return this.canvas.data;
  }

  /** Paints one pixel, compositing when alpha < 1. */
  px(x: number, y: number, color: string, alpha = 1): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height || alpha <= 0) return;
    const [r, g, b] = rgb(color);
    const d = this.canvas.data;
    const i = (y * this.width + x) * 4;
    if (alpha >= 1) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
      return;
    }
    const da = d[i + 3] / 255;
    const outA = alpha + da * (1 - alpha);
    d[i] = Math.round((r * alpha + d[i] * da * (1 - alpha)) / outA);
    d[i + 1] = Math.round((g * alpha + d[i + 1] * da * (1 - alpha)) / outA);
    d[i + 2] = Math.round((b * alpha + d[i + 2] * da * (1 - alpha)) / outA);
    d[i + 3] = Math.round(outA * 255);
  }

  /** Tints an already-painted pixel towards a colour (keeps empty pixels empty). */
  tint(x: number, y: number, color: string, amount: number): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    const d = this.canvas.data;
    const i = (y * this.width + x) * 4;
    if (d[i + 3] === 0) return;
    const [r, g, b] = rgb(color);
    d[i] = Math.round(d[i] + (r - d[i]) * amount);
    d[i + 1] = Math.round(d[i + 1] + (g - d[i + 1]) * amount);
    d[i + 2] = Math.round(d[i + 2] + (b - d[i + 2]) * amount);
  }

  isEmpty(x: number, y: number): boolean {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return true;
    return this.canvas.data[(y * this.width + x) * 4 + 3] === 0;
  }

  rect(x: number, y: number, w: number, h: number, color: string, alpha = 1): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, color, alpha);
  }

  /** Rectangle with a 1 px outline. */
  box(x: number, y: number, w: number, h: number, fill: string, outline: string): void {
    this.rect(x, y, w, h, outline);
    this.rect(x + 1, y + 1, w - 2, h - 2, fill);
  }

  hline(x: number, y: number, w: number, color: string, alpha = 1): void {
    this.rect(x, y, w, 1, color, alpha);
  }

  vline(x: number, y: number, h: number, color: string, alpha = 1): void {
    this.rect(x, y, 1, h, color, alpha);
  }

  line(x0: number, y0: number, x1: number, y1: number, color: string, alpha = 1): void {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
    for (let i = 0; i <= n; i++) this.px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, color, alpha);
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, color: string, alpha = 1): void {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, color, alpha);
      }
  }

  ring(cx: number, cy: number, r: number, thickness: number, color: string, alpha = 1): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy);
        if (d <= r && d > r - thickness) this.px(x, y, color, alpha);
      }
  }

  /** Soft radial light, strongest in the middle. */
  glow(cx: number, cy: number, r: number, color: string, strength: number): void {
    for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++)
      for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
        const d = Math.hypot(x + 0.5 - cx, y + 0.5 - cy) / r;
        if (d >= 1) continue;
        // Banded falloff keeps the pixel-art look (no smooth gradients).
        const band = Math.ceil((1 - d) * 5) / 5;
        this.tint(x, y, color, strength * Math.pow(band, 1.4));
      }
  }

  /** Draws ASCII art; each char maps to a colour, "." and " " are skipped. */
  pattern(x: number, y: number, rows: string[], palette: Record<string, string>, flip = false): void {
    rows.forEach((row, dy) =>
      [...row].forEach((ch, dx) => {
        if (ch === "." || ch === " ") return;
        const c = palette[ch];
        if (!c) throw new Error(`No colour for "${ch}"`);
        this.px(flip ? x + row.length - 1 - dx : x + dx, y + dy, c);
      }),
    );
  }

  /** Copies another painter on top of this one (alpha composited). */
  blit(src: Painter, dx: number, dy: number, sy0 = 0, sy1 = src.height): void {
    const s = src.canvas.data;
    for (let y = sy0; y < sy1; y++)
      for (let x = 0; x < src.width; x++) {
        const i = (y * src.width + x) * 4;
        const a = s[i + 3];
        if (a === 0) continue;
        const hex = `#${[s[i], s[i + 1], s[i + 2]].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
        this.px(dx + x, dy + y, hex, a / 255);
      }
  }
}
