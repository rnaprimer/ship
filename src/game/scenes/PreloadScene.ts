import * as Phaser from "phaser";
import { ASSET_BASE, MAP_IDS } from "../maps";
import { CHARACTER_FRAME, CHARACTER_TEXTURE, createCharacterAnims } from "../entities/characterAnims";
import { HAT_TEXTURE, LAYER_FRAME, OUTFIT_TEXTURE } from "../entities/CharacterLayers";

export const ASSETS = {
  ocean: "ocean",
  foam: "foam",
  font: "ship-font",
  flame: "fx-flame",
  flameSmall: "fx-flame-small",
  parrot: "parrot",
} as const;

/** Phaser cache keys of a map's Tiled JSON and its tileset image. */
export const mapKey = (mapId: string) => `map:${mapId}`;
export const tilesKey = (mapId: string) => `tiles:${mapId}`;

/** Loads every map, tileset, sprites and font, with a simple progress bar. */
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
    for (const id of MAP_IDS) {
      this.load.tilemapTiledJSON(mapKey(id), `maps/${id}.json`);
      this.load.image(tilesKey(id), `maps/${id}.png`);
    }
    this.load.image(ASSETS.ocean, "ocean.png");
    this.load.image(ASSETS.foam, "foam.png");
    this.load.spritesheet(CHARACTER_TEXTURE, "characters.png", {
      frameWidth: CHARACTER_FRAME.width,
      frameHeight: CHARACTER_FRAME.height,
    });
    // Crew outfits and hats drawn over the body (scripts/art/outfits.ts).
    this.load.spritesheet(OUTFIT_TEXTURE, "outfits.png", { frameWidth: LAYER_FRAME.width, frameHeight: LAYER_FRAME.height });
    this.load.spritesheet(HAT_TEXTURE, "hats.png", { frameWidth: LAYER_FRAME.width, frameHeight: LAYER_FRAME.height });
    this.load.bitmapFont(ASSETS.font, "ship-font.png", "ship-font.xml");
    // Hand-drawn animations (art/props.px.js, built with pxl).
    this.load.spritesheet(ASSETS.flame, "anims/flame.png", { frameWidth: 7, frameHeight: 10 });
    this.load.spritesheet(ASSETS.flameSmall, "anims/flame_small.png", { frameWidth: 3, frameHeight: 5 });
    this.load.spritesheet(ASSETS.parrot, "anims/parrot.png", { frameWidth: 14, frameHeight: 14 });
  }

  create() {
    createCharacterAnims(this);
    this.anims.create({ key: ASSETS.flame, frames: this.anims.generateFrameNumbers(ASSETS.flame), frameRate: 10, repeat: -1 });
    this.anims.create({ key: ASSETS.flameSmall, frames: this.anims.generateFrameNumbers(ASSETS.flameSmall), frameRate: 8, repeat: -1 });
    this.anims.create({ key: ASSETS.parrot, frames: this.anims.generateFrameNumbers(ASSETS.parrot), frameRate: 6, repeat: -1 });
    this.scene.start("ship");
  }
}
