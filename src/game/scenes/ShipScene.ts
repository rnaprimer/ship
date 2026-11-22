import * as Phaser from "phaser";
import { ASSETS } from "./PreloadScene";
import { REGISTRY } from "../registry";
import type { GameBus } from "../events";
import type { PassengerProfile, PlayerProfile, SavedPosition } from "../types";
import { SHIP_MAP } from "../maps";
import { Player } from "../entities/Player";
import { AmbientPassenger } from "../entities/AmbientPassenger";
import { areaAt, reachableFrom, tileOf } from "../systems/walkability";
import { loadPosition, savePosition } from "../systems/PositionPersistence";
import { combineInput, JOYSTICK_DEADZONE, type Vec } from "../systems/movement";
import { pickZoom } from "../systems/zoom";

export const DEPTH = {
  ocean: -20,
  foam: -15,
  deck: 0,
  decorBelow: 5,
  characters: 10, // + y / 10000 for y-sorting
  decorAbove: 20,
} as const;

type MoveKeys = Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

export class ShipScene extends Phaser.Scene {
  private ocean!: Phaser.GameObjects.TileSprite;
  private foam!: Phaser.GameObjects.TileSprite;
  private player!: Player;
  private keys?: MoveKeys;
  private stick: Vec = { x: 0, y: 0 };
  private bus!: GameBus;
  private elapsed = 0;
  private mapW = 0;
  private mapH = 0;
  private cleanup: Array<() => void> = [];
  private passengers: AmbientPassenger[] = [];
  private lastSaved = { x: 0, y: 0 };
  private currentArea: string | null = null;
  private statsMs = 0;
  private statsFrames = 0;

  constructor() {
    super("ship");
  }

  create() {
    this.bus = this.registry.get(REGISTRY.bus) as GameBus;
    const profile = this.registry.get(REGISTRY.player) as PlayerProfile;

    const map = this.make.tilemap({ key: ASSETS.map });
    const tileset = map.addTilesetImage("ship-tiles", ASSETS.tiles);
    if (!tileset) throw new Error("Tileset ship-tiles missing from ship.json");
    this.mapW = map.widthInPixels;
    this.mapH = map.heightInPixels;

    // Ocean: a world-space tile sprite slightly larger than the map so it can drift and bob.
    const pad = 32;
    this.ocean = this.add
      .tileSprite(-pad, -pad, this.mapW + pad * 2, this.mapH + pad * 2, ASSETS.ocean)
      .setOrigin(0)
      .setDepth(DEPTH.ocean);

    map.createLayer("deck", tileset)?.setDepth(DEPTH.deck);
    map.createLayer("decor-below", tileset)?.setDepth(DEPTH.decorBelow);
    map.createLayer("decor-above", tileset)?.setDepth(DEPTH.decorAbove);
    const collision = map.createLayer("collision", tileset);
    if (!collision) throw new Error("collision layer missing from ship.json");
    collision.setVisible(false);
    collision.setCollisionByExclusion([-1]);

    // Foam where the hull meets the water (row 22, x 3..36).
    this.foam = this.add
      .tileSprite(3 * 16, 22 * 16, 34 * 16, 6, ASSETS.foam)
      .setOrigin(0)
      .setDepth(DEPTH.foam);

    // --- Player ---
    // Restore the last valid position, or use the spawn point (new player, or the map changed).
    const saved = loadPosition(window.localStorage, SHIP_MAP);
    const start = saved ?? SHIP_MAP.spawn;
    this.player = new Player(this, start.x, start.y, profile.characterVariant, profile.username, start.direction);
    this.lastSaved = { x: start.x, y: start.y };
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);
    this.physics.add.collider(this.player.sprite, collision);
    this.playSpawnEffect();
    this.spawnPassengers((this.registry.get(REGISTRY.passengers) as PassengerProfile[]) ?? []);

    // --- Camera ---
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapW, this.mapH);
    cam.startFollow(this.player.sprite, true, 1, 1, 0, 12);
    this.applyZoom();
    this.scale.on("resize", this.applyZoom, this);
    this.cleanup.push(() => this.scale.off("resize", this.applyZoom, this));

    // --- Input ---
    const kb = this.input.keyboard;
    if (kb) {
      this.keys = kb.addKeys({
        up: Phaser.Input.Keyboard.KeyCodes.UP,
        down: Phaser.Input.Keyboard.KeyCodes.DOWN,
        left: Phaser.Input.Keyboard.KeyCodes.LEFT,
        right: Phaser.Input.Keyboard.KeyCodes.RIGHT,
        w: Phaser.Input.Keyboard.KeyCodes.W,
        a: Phaser.Input.Keyboard.KeyCodes.A,
        s: Phaser.Input.Keyboard.KeyCodes.S,
        d: Phaser.Input.Keyboard.KeyCodes.D,
      }) as MoveKeys;
    }
    this.cleanup.push(this.bus.on("joystick", (v) => (this.stick = v)));

    // --- Persistence (mock): every 15 s if moved, and when the page is hidden or closed ---
    this.time.addEvent({ delay: 15_000, loop: true, callback: () => this.savePosition() });
    const onHide = () => {
      if (document.visibilityState === "hidden") this.savePosition();
    };
    const onPageHide = () => this.savePosition();
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    this.cleanup.push(() => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    });

    // Labels and y-sorting run after Arcade Physics has moved bodies this frame.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.savePosition();
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);
      this.passengers.forEach((p) => p.destroy());
      this.passengers = [];
      this.cleanup.forEach((fn) => fn());
      this.cleanup = [];
    });

    this.bus.emit("ready", { username: profile.username });
  }

  private applyZoom() {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const { width, height } = this.scale.gameSize;
    this.cameras.main.setZoom(pickZoom(width, height, isTouch, this.mapW, this.mapH));
  }

  private playSpawnEffect() {
    const { x, y } = this.player;
    this.player.sprite.setAlpha(0);
    this.tweens.add({ targets: this.player.sprite, alpha: 1, duration: 500, ease: "Quad.Out" });
    const ring = this.add.circle(x, y - 10, 16, 0xffe08a, 0.55).setDepth(DEPTH.decorAbove);
    this.tweens.add({ targets: ring, scale: 0.1, alpha: 0, duration: 650, ease: "Quad.In", onComplete: () => ring.destroy() });
  }

  /** Places passengers on random walkable tiles reachable from spawn, away from the player. */
  private spawnPassengers(profiles: PassengerProfile[]) {
    const spawnTile = tileOf(SHIP_MAP, SHIP_MAP.spawn.x, SHIP_MAP.spawn.y - 1);
    const playerTile = tileOf(SHIP_MAP, this.player.x, this.player.y - 1);
    const candidates = [...reachableFrom(SHIP_MAP, spawnTile)]
      .map((key) => ({ tx: key % SHIP_MAP.width, ty: Math.floor(key / SHIP_MAP.width) }))
      .filter((t) => Math.abs(t.tx - playerTile.tx) + Math.abs(t.ty - playerTile.ty) > 4);
    Phaser.Utils.Array.Shuffle(candidates);
    this.passengers = profiles
      .slice(0, 15)
      .map((p, i) => new AmbientPassenger(this, SHIP_MAP, candidates[i], p.characterVariant, p.username, Math.random));
  }

  private savePosition() {
    const { x, y, direction } = this.player;
    if (Math.abs(x - this.lastSaved.x) < 1 && Math.abs(y - this.lastSaved.y) < 1) return;
    const position: SavedPosition = { mapId: SHIP_MAP.mapId, mapVersion: SHIP_MAP.mapVersion, x, y, direction };
    savePosition(window.localStorage, position);
    this.lastSaved = { x, y };
  }

  private keyboardVector(): Vec {
    const k = this.keys;
    if (!k) return { x: 0, y: 0 };
    const x = (k.right.isDown || k.d.isDown ? 1 : 0) - (k.left.isDown || k.a.isDown ? 1 : 0);
    const y = (k.down.isDown || k.s.isDown ? 1 : 0) - (k.up.isDown || k.w.isDown ? 1 : 0);
    return { x, y };
  }

  override update(_time: number, delta: number) {
    this.elapsed += delta;
    const t = this.elapsed / 1000;
    // Waves drift; the water rises and falls a pixel against the hull ("hull bob").
    this.ocean.tilePositionX = t * 4;
    this.ocean.tilePositionY = Math.round(Math.sin(t * 0.8) * 2);
    this.ocean.y = -32 + Math.round(Math.sin(t * 1.6));
    this.foam.tilePositionX = -t * 6;
    this.foam.y = 22 * 16 + Math.round(Math.sin(t * 1.6));

    const stick = Math.hypot(this.stick.x, this.stick.y) < JOYSTICK_DEADZONE ? { x: 0, y: 0 } : this.stick;
    this.player.applyInput(combineInput(this.keyboardVector(), stick));
    for (const p of this.passengers) p.update(delta, DEPTH.characters);

    this.statsFrames++;
    this.statsMs += delta;
    if (this.statsMs >= 1000) {
      const fps = Math.round((this.statsFrames * 1000) / this.statsMs);
      this.bus.emit("stats", { fps, x: this.player.x, y: this.player.y, direction: this.player.direction });
      this.statsMs = 0;
      this.statsFrames = 0;
    }
  }

  private afterPhysics() {
    this.player.syncVisuals(DEPTH.characters);
    const area = areaAt(SHIP_MAP, this.player.x, this.player.y - 3);
    if (area && area !== this.currentArea) {
      this.currentArea = area;
      this.bus.emit("area", { name: area });
    }
  }
}
