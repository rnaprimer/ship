import * as Phaser from "phaser";
import { ASSET_BASE } from "../maps";
import { CHARACTER_FRAME, CHARACTER_TEXTURE, createCharacterAnims } from "../entities/characterAnims";

export const ASSETS = {
  tiles: "ship-tiles",
  map: "ship-map",
  ocean: "ocean",
  foam: "foam",
  font: "ship-font",
} as const;

/** Loads the map, tileset, sprites and font, with a simple progress bar. */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super("preload");
  }

  preload() {
    const { width, height } = this.scale;
    const barW = Math.min(240, width * 0.6);
    const frame = this.add.rectangle(width / 2, height / 2, barW + 8, 16, 0x000000, 0).setStrokeStyle(2, 0xf4ead5);
    const bar = this.add.rectangle(width / 2 - barW / 2, height / 2, 1, 8, 0xe0b266).setOrigin(0, 0.5);
    this.load.on("progress", (p: number) => bar.setSize(Math.max(1, barW * p), 8));
    this.load.once("complete", () => {
      frame.destroy();
      bar.destroy();
    });

    this.load.setPath(ASSET_BASE);
    this.load.image(ASSETS.tiles, "ship-tiles.png");
    this.load.tilemapTiledJSON(ASSETS.map, "ship.json");
    this.load.image(ASSETS.ocean, "ocean.png");
    this.load.image(ASSETS.foam, "foam.png");
    this.load.spritesheet(CHARACTER_TEXTURE, "characters.png", {
      frameWidth: CHARACTER_FRAME.width,
      frameHeight: CHARACTER_FRAME.height,
    });
    this.load.bitmapFont(ASSETS.font, "ship-font.png", "ship-font.xml");
  }

  create() {
    createCharacterAnims(this);
    this.scene.start("ship");
  }
}
