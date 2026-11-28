import type * as Phaser from "phaser";
import { HAT_COUNT, OUTFIT_COLOR_COUNT, ROLE_COUNT, cleanOutfit, type Outfit } from "../outfits";

export const OUTFIT_TEXTURE = "outfits";
export const HAT_TEXTURE = "hats";
/** Layer frames are 24×32 with the 16×24 body frame at the bottom centre (scripts/art/outfits.ts). */
export const LAYER_FRAME = { width: 24, height: 32 } as const;

const FRAMES_PER_ROW = 6; // body columns: idle0, idle1, walk0..3
const DIRECTIONS = 4; // rows per variant/role/hat: down, left, right, up
const BODY_VARIANTS = 6;

/** Splits a body frame index (characters.png) into its direction row and column. */
export function bodyFramePart(index: number): { dir: number; col: number } | null {
  if (!Number.isInteger(index) || index < 0 || index >= BODY_VARIANTS * DIRECTIONS * FRAMES_PER_ROW) return null;
  const row = Math.floor(index / FRAMES_PER_ROW);
  return { dir: row % DIRECTIONS, col: index % FRAMES_PER_ROW };
}

/** outfits.png: rows = role × direction, columns = colour × frame. */
export function outfitFrame(role: number, color: number, dir: number, col: number): number {
  const columns = OUTFIT_COLOR_COUNT * FRAMES_PER_ROW;
  return (role * DIRECTIONS + dir) * columns + color * FRAMES_PER_ROW + col;
}

/** hats.png: rows = (hat − 1) × direction, columns = frame. Hat 0 has no art. */
export function hatFrame(hat: number, dir: number, col: number): number {
  return ((hat - 1) * DIRECTIONS + dir) * FRAMES_PER_ROW + col;
}

export const OUTFIT_SHEET_FRAMES = ROLE_COUNT * DIRECTIONS * OUTFIT_COLOR_COUNT * FRAMES_PER_ROW;
export const HAT_SHEET_FRAMES = (HAT_COUNT - 1) * DIRECTIONS * FRAMES_PER_ROW;

/**
 * The outfit and hat drawn over a character's body. They copy the body's
 * current frame every update, so they follow every bob and step exactly.
 */
export class CharacterLayers {
  private readonly outfitSprite: Phaser.GameObjects.Sprite;
  private readonly hatSprite: Phaser.GameObjects.Sprite;
  private outfit: Outfit;

  constructor(scene: Phaser.Scene, outfit: Outfit) {
    this.outfit = cleanOutfit(outfit);
    this.outfitSprite = scene.add.sprite(0, 0, OUTFIT_TEXTURE, 0).setOrigin(0.5, 1).setVisible(false);
    this.hatSprite = scene.add.sprite(0, 0, HAT_TEXTURE, 0).setOrigin(0.5, 1).setVisible(false);
  }

  setOutfit(outfit: Outfit): void {
    this.outfit = cleanOutfit(outfit);
  }

  /** Copies the body's position, frame, depth, alpha and visibility. */
  follow(body: Phaser.GameObjects.Sprite): void {
    const part = bodyFramePart(Number(body.frame.name));
    const { role, color, hat } = this.outfit;
    const showOutfit = part !== null && role !== null && body.visible;
    const showHat = part !== null && hat > 0 && body.visible;
    this.outfitSprite.setVisible(showOutfit);
    this.hatSprite.setVisible(showHat);
    if (showOutfit) {
      this.outfitSprite
        .setFrame(outfitFrame(role!, color, part!.dir, part!.col))
        .setPosition(body.x, body.y)
        .setDepth(body.depth + 0.000001)
        .setAlpha(body.alpha)
        .setScale(body.scaleX, body.scaleY);
    }
    if (showHat) {
      this.hatSprite
        .setFrame(hatFrame(hat, part!.dir, part!.col))
        .setPosition(body.x, body.y)
        .setDepth(body.depth + 0.000002)
        .setAlpha(body.alpha)
        .setScale(body.scaleX, body.scaleY);
    }
  }

  destroy(): void {
    this.outfitSprite.destroy();
    this.hatSprite.destroy();
  }
}
