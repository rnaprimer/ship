import type * as Phaser from "phaser";
import type { Direction } from "../types";
import { FOOT_BOX } from "../systems/walkability";
import { PLAYER_SPEED, facingFrom, inputToVelocity, type Vec } from "../systems/movement";
import { CHARACTER_FRAME, CHARACTER_TEXTURE, animKey, clampVariant, idleFrame } from "./characterAnims";
import { NameLabel } from "./NameLabel";

/**
 * The player's own character: an Arcade Physics sprite whose body is just its
 * feet (FOOT_BOX), so it can walk "behind" furniture tops but never through
 * collision tiles. The sprite's x/y is the bottom-centre of the feet.
 */
export class Player {
  readonly sprite: Phaser.Physics.Arcade.Sprite;
  private readonly label: NameLabel;
  private readonly variant: number;
  direction: Direction;

  constructor(scene: Phaser.Scene, x: number, y: number, variant: number, username: string, direction: Direction) {
    this.variant = clampVariant(variant);
    this.direction = direction;
    this.sprite = scene.physics.add.sprite(x, y, CHARACTER_TEXTURE, idleFrame(this.variant, direction));
    this.sprite.setOrigin(0.5, 1);
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    body.setSize(FOOT_BOX.width, FOOT_BOX.height);
    body.setOffset((CHARACTER_FRAME.width - FOOT_BOX.width) / 2, CHARACTER_FRAME.height - FOOT_BOX.height);
    this.sprite.setCollideWorldBounds(true);
    this.label = new NameLabel(scene, username, true);
    this.sprite.anims.play(animKey(this.variant, "idle", direction));
  }

  get x() {
    return this.sprite.x;
  }

  get y() {
    return this.sprite.y;
  }

  /** Called every frame with the combined keyboard/joystick input. */
  applyInput(input: Vec): void {
    const v = inputToVelocity(input, PLAYER_SPEED);
    this.sprite.setVelocity(v.x, v.y);
    const moving = v.x !== 0 || v.y !== 0;
    this.direction = facingFrom(v, this.direction);
    const key = animKey(this.variant, moving ? "walk" : "idle", this.direction);
    if (this.sprite.anims.currentAnim?.key !== key) this.sprite.anims.play(key, true);
  }

  /** Called after physics has moved the body for this frame. */
  syncVisuals(depthBase: number): void {
    this.sprite.setDepth(depthBase + this.sprite.y / 10000);
    this.label.follow(this.sprite.x, this.sprite.y - CHARACTER_FRAME.height);
  }

  destroy(): void {
    this.label.destroy();
    this.sprite.destroy();
  }
}
