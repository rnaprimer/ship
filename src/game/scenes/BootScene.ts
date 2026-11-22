import * as Phaser from "phaser";

/** Sets up anything the loader needs, then hands over to PreloadScene. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super("boot");
  }

  create() {
    this.scene.start("preload");
  }
}
