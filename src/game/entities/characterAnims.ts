import type * as Phaser from "phaser";
import { CHARACTER_VARIANT_COUNT, type Direction } from "../types";

export const CHARACTER_TEXTURE = "characters";
export const CHARACTER_FRAME = { width: 16, height: 24 } as const;

/** Row order inside each variant block of characters.png (see scripts/art/characters.ts). */
const SHEET_DIRECTIONS: readonly Direction[] = ["down", "left", "right", "up"];
const FRAMES_PER_ROW = 6;

export type CharacterAnim = "idle" | "walk";

export function animKey(variant: number, anim: CharacterAnim, dir: Direction): string {
  return `char-${variant}-${anim}-${dir}`;
}

function frameIndex(variant: number, dir: Direction, column: number): number {
  const row = variant * SHEET_DIRECTIONS.length + SHEET_DIRECTIONS.indexOf(dir);
  return row * FRAMES_PER_ROW + column;
}

export function clampVariant(variant: number): number {
  return Number.isInteger(variant) && variant >= 0 && variant < CHARACTER_VARIANT_COUNT ? variant : 0;
}

/** Registers idle (2 frames) and walk (4 frames) animations for every variant and direction. */
export function createCharacterAnims(scene: Phaser.Scene): void {
  for (let v = 0; v < CHARACTER_VARIANT_COUNT; v++) {
    for (const dir of SHEET_DIRECTIONS) {
      scene.anims.create({
        key: animKey(v, "idle", dir),
        frames: [0, 1].map((c) => ({ key: CHARACTER_TEXTURE, frame: frameIndex(v, dir, c) })),
        frameRate: 2,
        repeat: -1,
      });
      scene.anims.create({
        key: animKey(v, "walk", dir),
        frames: [2, 3, 4, 5].map((c) => ({ key: CHARACTER_TEXTURE, frame: frameIndex(v, dir, c) })),
        frameRate: 9,
        repeat: -1,
      });
    }
  }
}

export function idleFrame(variant: number, dir: Direction): number {
  return frameIndex(variant, dir, 0);
}
