import type * as Phaser from "phaser";

export const LABEL_DEPTH = 30;

/** A bitmap-font username above a character, with a 1 px dark outline for legibility. */
export class NameLabel {
  private readonly shadow: Phaser.GameObjects.BitmapText;
  private readonly text: Phaser.GameObjects.BitmapText;
  private readonly tagShadow: Phaser.GameObjects.BitmapText;
  private readonly tag: Phaser.GameObjects.BitmapText;
  private staleTag = false;

  constructor(scene: Phaser.Scene, username: string, isSelf: boolean) {
    // Drop shadow on four sides reads as an outline at pixel scale.
    this.shadow = scene.add.bitmapText(0, 0, "ship-font", username).setOrigin(0.5, 1).setTint(0x1e1420);
    this.text = scene.add
      .bitmapText(0, 0, "ship-font", username)
      .setOrigin(0.5, 1)
      .setTint(isSelf ? 0xffe08a : 0xf4ead5);
    this.shadow.setDepth(LABEL_DEPTH);
    this.text.setDepth(LABEL_DEPTH + 0.1);
    // "stale" above the name, for passengers who aren't aboard right now.
    this.tagShadow = scene.add.bitmapText(0, 0, "ship-font", "stale").setOrigin(0.5, 1).setTint(0x1e1420).setDepth(LABEL_DEPTH).setVisible(false);
    this.tag = scene.add.bitmapText(0, 0, "ship-font", "stale").setOrigin(0.5, 1).setTint(0x9aa3ad).setDepth(LABEL_DEPTH + 0.1).setVisible(false);
  }

  /** Shows the "stale" tag and greys the name. */
  setStale(stale: boolean): void {
    this.staleTag = stale;
    this.tag.setVisible(stale);
    this.tagShadow.setVisible(stale);
    this.text.setTint(stale ? 0xb9b2a6 : 0xf4ead5);
  }

  follow(x: number, top: number): void {
    const lx = Math.round(x);
    const ly = Math.round(top + 1);
    this.text.setPosition(lx, ly);
    this.shadow.setPosition(lx + 1, ly + 1);
    if (this.staleTag) {
      const ty = ly - this.text.height - 1;
      this.tag.setPosition(lx, ty);
      this.tagShadow.setPosition(lx + 1, ty + 1);
    }
  }

  setVisible(visible: boolean): void {
    this.text.setVisible(visible);
    this.shadow.setVisible(visible);
    this.tag.setVisible(visible && this.staleTag);
    this.tagShadow.setVisible(visible && this.staleTag);
  }

  destroy(): void {
    this.text.destroy();
    this.shadow.destroy();
    this.tag.destroy();
    this.tagShadow.destroy();
  }
}
