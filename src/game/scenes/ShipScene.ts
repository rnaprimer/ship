import * as Phaser from "phaser";
import { ASSETS, mapKey } from "./PreloadScene";
import { REGISTRY } from "../registry";
import type { GameBus } from "../events";
import type { PassengerProfile, PlayerProfile, PositionSaver, SavedPosition, StartPosition } from "../types";
import { DEFAULT_MAP_ID, getMap, MAPS, type MapId } from "../maps";
import { Player } from "../entities/Player";
import { AmbientPassenger } from "../entities/AmbientPassenger";
import { areaAt, isFootprintWalkable, reachableFrom, tileOf, type WalkableMap } from "../systems/walkability";
import { combineInput, JOYSTICK_DEADZONE, type Vec } from "../systems/movement";
import { pickZoom } from "../systems/zoom";

export const DEPTH = {
  ocean: -20,
  foam: -15,
  deck: 0,
  decorBelow: 5,
  characters: 10, // + y / 10000 for y-sorting
  nightTint: 15,
  decorAbove: 20,
} as const;

/** Scene data: which map to open. Empty on first load (the saved position decides). */
export type ShipSceneData = { mapId?: MapId };

type MoveKeys = Record<"up" | "down" | "left" | "right" | "w" | "a" | "s" | "d", Phaser.Input.Keyboard.Key>;

export class ShipScene extends Phaser.Scene {
  private map!: WalkableMap;
  private ocean: Phaser.GameObjects.TileSprite | null = null;
  private foam: Phaser.GameObjects.TileSprite | null = null;
  private traveling = false;
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

  create(data: ShipSceneData = {}) {
    this.bus = this.registry.get(REGISTRY.bus) as GameBus;
    const profile = this.registry.get(REGISTRY.player) as PlayerProfile;
    // The scene instance is reused on every trip: reset per-visit state.
    this.traveling = false;
    this.currentArea = null;
    this.passengers = [];
    this.stick = { x: 0, y: 0 };

    // Where to start: the map we travelled to (at its spawn), else the saved
    // position if it is still valid, else First Deck's spawn.
    const saved = data.mapId ? null : (this.registry.get(REGISTRY.initialPosition) as StartPosition);
    const savedMap = saved ? getMap(saved.mapId) : null;
    this.map = data.mapId ? MAPS[data.mapId] : (savedMap ?? MAPS[DEFAULT_MAP_ID]);
    const start = saved && savedMap && isFootprintWalkable(savedMap, saved.x, saved.y) ? saved : this.map.spawn;

    const map = this.make.tilemap({ key: mapKey(this.map.mapId) });
    const tileset = map.addTilesetImage("ship-tiles", ASSETS.tiles);
    if (!tileset) throw new Error(`Tileset ship-tiles missing from ${this.map.mapId}`);
    this.mapW = map.widthInPixels;
    this.mapH = map.heightInPixels;
    this.cameras.main.setBackgroundColor(this.map.background);

    // Ocean: a world-space tile sprite slightly larger than the map so it can drift and bob.
    const pad = 32;
    this.ocean = this.map.outdoor
      ? this.add
          .tileSprite(-pad, -pad, this.mapW + pad * 2, this.mapH + pad * 2, ASSETS.ocean)
          .setOrigin(0)
          .setDepth(DEPTH.ocean)
      : null;

    map.createLayer("deck", tileset)?.setDepth(DEPTH.deck);
    map.createLayer("decor-below", tileset)?.setDepth(DEPTH.decorBelow);
    map.createLayer("decor-above", tileset)?.setDepth(DEPTH.decorAbove);
    const collision = map.createLayer("collision", tileset);
    if (!collision) throw new Error(`collision layer missing from ${this.map.mapId}`);
    collision.setVisible(false);
    collision.setCollisionByExclusion([-1]);

    // Foam where the hull meets the water.
    const foam = this.map.foam;
    this.foam = foam
      ? this.add.tileSprite(foam.x * 16, foam.y * 16, foam.w * 16, 6, ASSETS.foam).setOrigin(0).setDepth(DEPTH.foam)
      : null;
    if (this.map.dark) {
      // Night: dim everything below the lantern and candle glows.
      this.add.rectangle(-pad, -pad, this.mapW + pad * 2, this.mapH + pad * 2, 0x0a0a26, 0.5).setOrigin(0).setDepth(DEPTH.nightTint);
    }

    // --- Player ---
    this.player = new Player(this, start.x, start.y, profile.characterVariant, profile.username, start.direction);
    // After a trip, save the new map on the next periodic save even if the player stands still.
    this.lastSaved = data.mapId ? { x: Number.NaN, y: Number.NaN } : { x: start.x, y: start.y };
    this.physics.world.setBounds(0, 0, this.mapW, this.mapH);
    this.physics.add.collider(this.player.sprite, collision);
    this.playSpawnEffect();
    // Your own cabin is private: nobody else is shown there.
    if (!this.map.private) this.spawnPassengers((this.registry.get(REGISTRY.passengers) as PassengerProfile[]) ?? []);

    // --- Camera ---
    const cam = this.cameras.main;
    cam.startFollow(this.player.sprite, true, 1, 1, 0, 12);
    cam.fadeIn(350, 11, 42, 61);
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
    this.cleanup.push(this.bus.on("travel", ({ mapId }) => this.travel(mapId)));

    // --- Persistence: every 15 s if moved, and when the page is hidden or closed ---
    this.time.addEvent({ delay: 15_000, loop: true, callback: () => this.savePosition(false) });
    const onHide = () => {
      if (document.visibilityState === "hidden") this.savePosition(true);
    };
    const onPageHide = () => this.savePosition(true);
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("pagehide", onPageHide);
    this.cleanup.push(() => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("pagehide", onPageHide);
    });

    // Labels and y-sorting run after Arcade Physics has moved bodies this frame.
    this.events.on(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.savePosition(true);
      this.events.off(Phaser.Scenes.Events.POST_UPDATE, this.afterPhysics, this);
      this.passengers.forEach((p) => p.destroy());
      this.passengers = [];
      this.cleanup.forEach((fn) => fn());
      this.cleanup = [];
    });

    this.bus.emit("location", { mapId: this.map.mapId, name: this.map.name });
    if (!data.mapId) this.bus.emit("ready", { username: profile.username });
  }

  /** Fades out, saves where we were, and reopens the scene on the other map's spawn. */
  private travel(mapId: string) {
    const target = getMap(mapId);
    if (!target || this.traveling) return;
    if (target.mapId === this.map.mapId) return;
    this.traveling = true;
    this.stick = { x: 0, y: 0 };
    this.player.applyInput({ x: 0, y: 0 });
    const cam = this.cameras.main;
    cam.fadeOut(300, 11, 42, 61);
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.restart({ mapId: target.mapId as MapId } satisfies ShipSceneData);
    });
  }

  private applyZoom() {
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const { width, height } = this.scale.gameSize;
    const cam = this.cameras.main;
    const zoom = pickZoom(width, height, isTouch, this.mapW, this.mapH, this.map.outdoor);
    cam.setZoom(zoom);
    // A map smaller than the view is centred: widen the bounds evenly on both sides.
    const viewW = width / zoom;
    const viewH = height / zoom;
    const bx = this.mapW < viewW ? (this.mapW - viewW) / 2 : 0;
    const by = this.mapH < viewH ? (this.mapH - viewH) / 2 : 0;
    cam.setBounds(bx, by, Math.max(this.mapW, viewW), Math.max(this.mapH, viewH));
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
    const map = this.map;
    const spawnTile = tileOf(map, map.spawn.x, map.spawn.y - 1);
    const playerTile = tileOf(map, this.player.x, this.player.y - 1);
    const candidates = [...reachableFrom(map, spawnTile)]
      .map((key) => ({ tx: key % map.width, ty: Math.floor(key / map.width) }))
      .filter((t) => Math.abs(t.tx - playerTile.tx) + Math.abs(t.ty - playerTile.ty) > 4);
    Phaser.Utils.Array.Shuffle(candidates);
    // Roughly one passenger per 25 open tiles, so small rooms don't feel crowded.
    const room = Math.min(15, Math.floor(candidates.length / 25));
    this.passengers = Phaser.Utils.Array.Shuffle([...profiles])
      .slice(0, room)
      .map((p, i) => new AmbientPassenger(this, map, candidates[i], p.characterVariant, p.username, Math.random));
  }

  private savePosition(final: boolean) {
    const { x, y, direction } = this.player;
    if (Math.abs(x - this.lastSaved.x) < 1 && Math.abs(y - this.lastSaved.y) < 1) return;
    const position: SavedPosition = {
      mapId: this.map.mapId,
      mapVersion: this.map.mapVersion,
      x: Math.round(x),
      y: Math.round(y),
      direction,
    };
    (this.registry.get(REGISTRY.savePosition) as PositionSaver)(position, final);
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
    if (this.ocean) {
      this.ocean.tilePositionX = t * 4;
      this.ocean.tilePositionY = Math.round(Math.sin(t * 0.8) * 2);
      this.ocean.y = -32 + Math.round(Math.sin(t * 1.6));
    }
    if (this.foam && this.map.foam) {
      this.foam.tilePositionX = -t * 6;
      this.foam.y = this.map.foam.y * 16 + Math.round(Math.sin(t * 1.6));
    }

    const stick = Math.hypot(this.stick.x, this.stick.y) < JOYSTICK_DEADZONE ? { x: 0, y: 0 } : this.stick;
    this.player.applyInput(this.traveling ? { x: 0, y: 0 } : combineInput(this.keyboardVector(), stick));
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
    const area = areaAt(this.map, this.player.x, this.player.y - 3);
    if (area && area !== this.currentArea) {
      this.currentArea = area;
      this.bus.emit("area", { name: area });
    }
  }
}
