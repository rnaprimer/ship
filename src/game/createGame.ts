import * as Phaser from "phaser";
import type { GameBus } from "./events";
import type { PassengerProfile, PlayerProfile, PositionSaver, StartPosition } from "./types";
import { BootScene } from "./scenes/BootScene";
import { PreloadScene } from "./scenes/PreloadScene";
import { ShipScene } from "./scenes/ShipScene";
import { REGISTRY } from "./registry";

export type GameOptions = {
  parent: HTMLElement;
  bus: GameBus;
  player: PlayerProfile;
  passengers: PassengerProfile[];
  initialPosition: StartPosition;
  savePosition: PositionSaver;
};

export function createGame(options: GameOptions): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent: options.parent,
    backgroundColor: "#0b2a3d",
    // Crisp pixels: nearest-neighbour textures, no antialias, roundPixels on.
    pixelArt: true,
    banner: false,
    scale: {
      // The canvas fills its parent 1:1; we pick an integer camera zoom ourselves.
      mode: Phaser.Scale.RESIZE,
      width: "100%",
      height: "100%",
    },
    physics: {
      default: "arcade",
      arcade: {
        debug: false,
        // Variable step so movement stays smooth on 90/120 Hz phone screens.
        fixedStep: false,
      },
    },
    input: { keyboard: true, touch: true, mouse: true },
    callbacks: {
      preBoot: (game) => {
        game.registry.set(REGISTRY.bus, options.bus);
        game.registry.set(REGISTRY.player, options.player);
        game.registry.set(REGISTRY.passengers, options.passengers);
        game.registry.set(REGISTRY.initialPosition, options.initialPosition);
        game.registry.set(REGISTRY.savePosition, options.savePosition);
      },
    },
    scene: [BootScene, PreloadScene, ShipScene],
  });
}
