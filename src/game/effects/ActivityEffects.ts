import * as Phaser from "phaser";

/** Little pixel icons, drawn once into textures: [key, rows, palette]. */
const ICONS: Array<[string, string[], Record<string, number>]> = [
  [
    "fx-mug",
    ["oooooo..", "owwwwo..", "oyyyyooo", "oyyyyo.o", "oyyyyo.o", "oyyyyooo", "oyyyyo..", "oooooo.."],
    { o: 0x1c0f08, w: 0xffffff, y: 0xe0a53a },
  ],
  [
    "fx-glass",
    ["o.....o", "odddddo", ".odddo.", "..odo..", "...o...", "...o...", "..ooo.."],
    { o: 0x1c0f08, d: 0xffffff },
  ],
  ["fx-z", ["oooo", "..o.", ".o..", "oooo"], { o: 0xf4ead5 }],
];

/**
 * Short-lived visual effects for activities, built from plain shapes and
 * tiny generated textures (no extra art to load). Everything here is local
 * to the player and purely cosmetic.
 */
export class ActivityEffects {
  private readonly scene: Phaser.Scene;
  private readonly depth: number;

  constructor(scene: Phaser.Scene, depth: number) {
    this.scene = scene;
    this.depth = depth;
    for (const [key, rows, palette] of ICONS) {
      if (scene.textures.exists(key)) continue;
      const g = scene.make.graphics({}, false);
      rows.forEach((row, y) =>
        [...row].forEach((ch, x) => {
          if (ch === "." || !(ch in palette)) return;
          g.fillStyle(palette[ch], 1);
          g.fillRect(x, y, 1, 1);
        }),
      );
      g.generateTexture(key, rows[0].length, rows.length);
      g.destroy();
    }
  }

  /** A burst of square particles flying out and fading. */
  burst(
    x: number,
    y: number,
    opts: { count?: number; colors: number[]; spread?: number; rise?: number; life?: number; size?: number; gravity?: number },
  ): void {
    const { count = 12, colors, spread = 16, rise = 0, life = 700, size = 2, gravity = 0 } = opts;
    for (let i = 0; i < count; i++) {
      const dot = this.scene.add.rectangle(x, y, size, size, colors[i % colors.length]).setDepth(this.depth);
      const ang = Math.random() * Math.PI * 2;
      const dist = spread * (0.4 + Math.random() * 0.6);
      this.scene.tweens.add({
        targets: dot,
        x: x + Math.cos(ang) * dist,
        y: y + Math.sin(ang) * dist * 0.6 - rise * (0.5 + Math.random() * 0.5) + gravity,
        alpha: 0,
        duration: life * (0.7 + Math.random() * 0.6),
        ease: "Quad.Out",
        onComplete: () => dot.destroy(),
      });
    }
  }

  /** Soft puffs of smoke drifting up. */
  smoke(x: number, y: number, count = 6, color = 0xb8b0a4): void {
    for (let i = 0; i < count; i++) {
      const puff = this.scene.add.circle(x + (Math.random() - 0.5) * 8, y, 3 + Math.random() * 3, color, 0.85).setDepth(this.depth);
      this.scene.tweens.add({
        targets: puff,
        x: puff.x + (Math.random() - 0.5) * 20,
        y: y - 14 - Math.random() * 18,
        scale: 2.2,
        alpha: 0,
        delay: i * 60,
        duration: 1100 + Math.random() * 500,
        ease: "Sine.Out",
        onComplete: () => puff.destroy(),
      });
    }
  }

  /** A bright flash that pops and shrinks. */
  flash(x: number, y: number, color = 0xffe08a, radius = 8): void {
    const c = this.scene.add.circle(x, y, radius, color, 1).setDepth(this.depth);
    this.scene.tweens.add({ targets: c, scale: 0.1, alpha: 0, duration: 260, ease: "Quad.In", onComplete: () => c.destroy() });
  }

  /** An expanding ring (water rings, magic pulses). */
  ring(x: number, y: number, color: number, radius = 14, duration = 700, squash = 0.5): void {
    const r = this.scene.add.ellipse(x, y, 4, 4 * squash).setStrokeStyle(1, color, 1).setDepth(this.depth);
    this.scene.tweens.add({
      targets: r,
      displayWidth: radius * 2,
      displayHeight: radius * 2 * squash,
      alpha: 0,
      duration,
      ease: "Quad.Out",
      onComplete: () => r.destroy(),
    });
  }

  /** A splash: droplets up and out, plus rings on the water. */
  splash(x: number, y: number): void {
    this.burst(x, y, { count: 16, colors: [0xffffff, 0xcfe8ef, 0x6fd0e6], spread: 14, rise: 16, life: 650 });
    this.ring(x, y, 0xffffff, 12, 700);
    this.scene.time.delayedCall(180, () => this.ring(x, y, 0xcfe8ef, 18, 900));
  }

  /** An icon (mug, glass, z) that rises from (x, y) and fades. */
  rise(x: number, y: number, key: string, opts: { tint?: number; distance?: number; duration?: number; delay?: number } = {}): void {
    const { tint, distance = 14, duration = 1400, delay = 0 } = opts;
    const img = this.scene.add.image(x, y, key).setDepth(this.depth).setAlpha(0);
    if (tint !== undefined) img.setTint(tint);
    this.scene.tweens.add({ targets: img, alpha: 1, duration: 150, delay });
    this.scene.tweens.add({
      targets: img,
      y: y - distance,
      duration,
      delay,
      ease: "Sine.Out",
      onComplete: () => this.scene.tweens.add({ targets: img, alpha: 0, duration: 250, onComplete: () => img.destroy() }),
    });
  }

  /** A thin dagger flying from one point to another. */
  throwDagger(fromX: number, fromY: number, toX: number, toY: number, onHit: () => void): void {
    const d = this.scene.add.rectangle(fromX, fromY, 6, 1, 0xd0d0dc).setDepth(this.depth);
    d.setRotation(Math.atan2(toY - fromY, toX - fromX));
    this.scene.tweens.add({ targets: d, x: toX, y: toY, duration: 220, ease: "Quad.In", onComplete: () => {
      onHit();
      this.scene.time.delayedCall(600, () => d.destroy());
    } });
  }
}
