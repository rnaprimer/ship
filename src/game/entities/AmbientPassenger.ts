import type * as Phaser from "phaser";
import type { Direction } from "../types";
import { findPath, isWalkableTile, type TilePoint, type WalkableMap } from "../systems/walkability";
import { PASSENGER_SPEED, facingFrom, moveToward } from "../systems/movement";
import { CHARACTER_FRAME, CHARACTER_TEXTURE, animKey, clampVariant, idleFrame } from "./characterAnims";
import { NameLabel } from "./NameLabel";

const WANDER_RADIUS = 9; // tiles

/**
 * A decorative, non-interactive passenger. It strolls along tile paths
 * between random walkable waypoints and pauses in between. It has no physics
 * body and never claims to be online.
 */
export class AmbientPassenger {
  private readonly sprite: Phaser.GameObjects.Sprite;
  private readonly label: NameLabel;
  private readonly map: WalkableMap;
  private readonly variant: number;
  private readonly rng: () => number;
  private path: TilePoint[] = [];
  private waitMs: number;
  private direction: Direction = "down";

  constructor(scene: Phaser.Scene, map: WalkableMap, start: TilePoint, variant: number, username: string, rng: () => number) {
    this.map = map;
    this.variant = clampVariant(variant);
    this.rng = rng;
    const p = this.tileFeet(start);
    this.sprite = scene.add.sprite(p.x, p.y, CHARACTER_TEXTURE, idleFrame(this.variant, "down")).setOrigin(0.5, 1);
    this.label = new NameLabel(scene, username, false);
    this.waitMs = 500 + rng() * 3000;
    this.sprite.anims.play(animKey(this.variant, "idle", "down"));
  }

  /** Feet position for standing in the middle of a tile. */
  private tileFeet(t: TilePoint) {
    const s = this.map.tileSize;
    return { x: t.tx * s + s / 2, y: t.ty * s + s - 3 };
  }

  private currentTile(): TilePoint {
    const s = this.map.tileSize;
    return { tx: Math.floor(this.sprite.x / s), ty: Math.floor((this.sprite.y - 1) / s) };
  }

  private pickNewPath(): void {
    const from = this.currentTile();
    for (let attempt = 0; attempt < 12; attempt++) {
      const to = {
        tx: from.tx + Math.round((this.rng() * 2 - 1) * WANDER_RADIUS),
        ty: from.ty + Math.round((this.rng() * 2 - 1) * WANDER_RADIUS),
      };
      if (!isWalkableTile(this.map, to.tx, to.ty)) continue;
      const path = findPath(this.map, from, to);
      if (path && path.length > 1) {
        this.path = path.slice(1);
        return;
      }
    }
  }

  update(deltaMs: number, depthBase: number): void {
    if (this.path.length === 0) {
      this.waitMs -= deltaMs;
      if (this.waitMs <= 0) {
        this.pickNewPath();
        this.waitMs = 1500 + this.rng() * 4000;
      }
      this.play("idle");
    } else {
      const target = this.tileFeet(this.path[0]);
      const step = moveToward({ x: this.sprite.x, y: this.sprite.y }, target, (PASSENGER_SPEED * deltaMs) / 1000);
      this.direction = facingFrom({ x: target.x - this.sprite.x, y: target.y - this.sprite.y }, this.direction);
      this.sprite.setPosition(step.x, step.y);
      if (step.arrived) this.path.shift();
      this.play("walk");
    }
    this.sprite.setDepth(depthBase + this.sprite.y / 10000);
    this.label.follow(this.sprite.x, this.sprite.y - CHARACTER_FRAME.height);
  }

  private play(anim: "idle" | "walk") {
    const key = animKey(this.variant, anim, this.direction);
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.anims.play(key, true);
  }

  destroy(): void {
    this.label.destroy();
    this.sprite.destroy();
  }
}
