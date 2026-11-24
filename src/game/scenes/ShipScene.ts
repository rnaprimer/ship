import * as Phaser from "phaser";
import { ASSETS, mapKey, tilesKey } from "./PreloadScene";
import { REGISTRY } from "../registry";
import type { GameBus } from "../events";
import type { PassengerProfile, PlayerProfile, PositionSaver, SavedPosition, StartPosition } from "../types";
import { DEFAULT_MAP_ID, getMap, MAPS, type MapId } from "../maps";
import { Player } from "../entities/Player";
import { AmbientPassenger } from "../entities/AmbientPassenger";
import { areaAt, isFootprintWalkable, reachableFrom, tileOf, type WalkableMap } from "../systems/walkability";
import { combineInput, JOYSTICK_DEADZONE, type Vec } from "../systems/movement";
import { pickZoom } from "../systems/zoom";
import { DRINKS, GLOBE_PLACES, nearestInteractable, type DrinkId, type Interactable } from "../systems/interactions";
import { boom, click, clink, splash } from "../systems/sfx";
import { ActivityEffects } from "../effects/ActivityEffects";

export const DEPTH = {
  ocean: -20,
  foam: -15,
  deck: 0,
  decorBelow: 5,
  characters: 10, // + y / 10000 for y-sorting
  nightTint: 15,
  decorAbove: 20,
  effects: 25,
} as const;

const CABIN_LIGHTS_KEY = "ship.cabinLights";

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
  // Activities (Milestone 8).
  private fx!: ActivityEffects;
  private near: Interactable | null = null;
  private paused = false;
  private busyUntil = 0;
  private drift = 0;
  private driftBoostUntil = 0;
  private tipsyUntil = 0;
  private lightsOverlay: Phaser.GameObjects.Rectangle | null = null;

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
    this.near = null;
    this.paused = false;
    this.busyUntil = 0;
    this.tipsyUntil = 0;
    this.lightsOverlay = null;

    // Where to start: the map we travelled to (at its spawn), else the saved
    // position if it is still valid, else First Deck's spawn.
    const saved = data.mapId ? null : (this.registry.get(REGISTRY.initialPosition) as StartPosition);
    const savedMap = saved ? getMap(saved.mapId) : null;
    this.map = data.mapId ? MAPS[data.mapId] : (savedMap ?? MAPS[DEFAULT_MAP_ID]);
    const start = saved && savedMap && isFootprintWalkable(savedMap, saved.x, saved.y) ? saved : this.map.spawn;

    const map = this.make.tilemap({ key: mapKey(this.map.mapId) });
    // Each map is painted as one picture and cut into its own tileset.
    const tileset = map.addTilesetImage(this.map.mapId, tilesKey(this.map.mapId));
    if (!tileset) throw new Error(`Tileset missing from ${this.map.mapId}`);
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
    // Activities: E or Space, or the on-screen button.
    this.fx = new ActivityEffects(this, DEPTH.effects);
    const use = () => this.activate();
    kb?.on("keydown-E", use);
    kb?.on("keydown-SPACE", use);
    this.cleanup.push(() => {
      kb?.off("keydown-E", use);
      kb?.off("keydown-SPACE", use);
    });
    this.cleanup.push(this.bus.on("use", use));
    this.cleanup.push(this.bus.on("drink", ({ drink }) => this.drink(drink as DrinkId)));
    this.cleanup.push(this.bus.on("pause", ({ paused }) => (this.paused = paused)));
    this.bus.emit("prompt", null);
    if (this.map.mapId === "personal-cabin") this.setupCabinLights();

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

  // --- Activities --------------------------------------------------------------
  // All cosmetic and local: nothing is collected, scored or shared (BRIEF §14).

  private say(text: string) {
    this.bus.emit("say", { text });
  }

  private activate() {
    const it = this.near;
    if (!it || this.paused || this.traveling || this.time.now < this.busyUntil) return;
    this.busyUntil = this.time.now + 600;
    const cx = (it.x + it.w / 2) * 16;
    const cy = (it.y + it.h / 2) * 16;
    const head = { x: this.player.x, y: this.player.y - 26 };
    switch (it.kind) {
      case "chart":
        this.bus.emit("activity", { kind: "chart", title: it.label, text: it.text ?? "" });
        break;
      case "bar":
        this.bus.emit("activity", { kind: "bar", title: it.label, text: "" });
        break;
      case "beer":
        this.drink("beer");
        break;
      case "light":
        this.toggleCabinLights();
        break;
      case "cannon":
        this.fireCannon(it);
        break;
      case "wheel":
        this.driftBoostUntil = this.time.now + 3500;
        this.cameras.main.shake(400, 0.002);
        click(300);
        this.say("Hard a-starboard! The ship leans into the wind.");
        break;
      case "bed":
        this.rest(it.label.startsWith("Sunbathe") ? "You soak up the sun. Lovely." : "Zzz… you wake up feeling rested.");
        break;
      case "chest":
        click(500);
        this.fx.burst(cx, cy - 6, { count: 18, colors: [0xf6d27a, 0xffffff, 0xd9a441], spread: 14, rise: 18, life: 900 });
        this.say("Gold glints in the lantern light… but it all belongs to the ship.");
        break;
      case "pool": {
        // Splash at the edge of the pool nearest to you.
        const px = Math.max(it.x * 16 + 10, Math.min((it.x + it.w) * 16 - 10, this.player.x));
        const py = Math.max(it.y * 16 + 10, Math.min((it.y + it.h) * 16 - 10, this.player.y - 6));
        this.fx.splash(px, py);
        splash();
        this.say("Splash! The water's lovely and warm.");
        break;
      }
      case "potion":
        for (let i = 0; i < 4; i++)
          this.time.delayedCall(i * 180, () =>
            this.fx.burst(cx + (Math.random() - 0.5) * 24, cy - 8, { count: 5, colors: [0xa64fd6, 0x4fd68a, 0x4f8ad6], spread: 6, rise: 22, life: 1000 }),
          );
        this.say(["It fizzes and smells of plums.", "The potion turns a worrying shade of green.", "A puff of purple smoke! Nothing else happens."][Math.floor(Math.random() * 3)]);
        break;
      case "ritual":
        for (let i = 0; i < 3; i++) this.time.delayedCall(i * 250, () => this.fx.ring(cx, cy, 0xb36bff, 36 + i * 8, 900, 0.6));
        this.player.sprite.setTint(0xd9b3ff);
        this.time.delayedCall(900, () => this.player.sprite.clearTint());
        this.say("The candles flicker… and the room hums softly.");
        break;
      case "target":
        this.fx.throwDagger(head.x, head.y + 12, cx, cy - 4, () => {
          click(1400);
          this.fx.burst(cx, cy - 4, { count: 6, colors: [0xead8a8], spread: 6, life: 400 });
          this.say(Math.random() < 0.4 ? "Bullseye!" : "Thunk. Just off the mark.");
        });
        break;
      case "globe":
        click(700);
        this.say(`You spin the globe. It stops on ${GLOBE_PLACES[Math.floor(Math.random() * GLOBE_PLACES.length)]}.`);
        break;
    }
  }

  private drink(id: DrinkId) {
    const d = DRINKS[id];
    if (!d) return;
    const head = { x: this.player.x, y: this.player.y - 24 };
    clink();
    this.fx.rise(head.x, head.y, id === "beer" || id === "grog" ? "fx-mug" : "fx-glass", { tint: id === "beer" || id === "grog" ? undefined : d.color });
    this.fx.burst(head.x, head.y - 4, { count: 6, colors: [0xffffff, 0xf6d27a], spread: 8, rise: 8, life: 600 });
    if (d.tipsy) this.tipsyUntil = this.time.now + 6000;
    this.say(`Cheers! ${d.name}${d.tipsy ? ", and the deck sways a little." : ". Refreshing."}`);
  }

  private fireCannon(it: Interactable) {
    // Cannons point south, out through the rail.
    const tipX = it.x * 16 + 8;
    const tipY = (it.y + it.h) * 16 + 2;
    this.busyUntil = this.time.now + 1200;
    this.fx.flash(tipX, tipY, 0xffe08a, 10);
    this.fx.burst(tipX, tipY, { count: 10, colors: [0xffd36b, 0xff8a3c, 0xffffff], spread: 12, life: 300 });
    this.fx.smoke(tipX, tipY, 8);
    this.cameras.main.shake(260, 0.006);
    boom();
    if (this.map.outdoor) {
      const sx = tipX + (Math.random() - 0.5) * 40;
      const sy = tipY + 110 + Math.random() * 40;
      this.time.delayedCall(700, () => {
        this.fx.splash(sx, sy);
        this.fx.burst(sx, sy, { count: 14, colors: [0xffffff, 0xcfe8ef], spread: 10, rise: 30, life: 800 });
      });
      splash(0.7);
    }
    this.say("BOOM! A plume of spray rises far off the side.");
  }

  /** Lie down: fade out, a few Zs, fade back in. */
  private rest(message: string) {
    this.busyUntil = this.time.now + 2600;
    const cam = this.cameras.main;
    for (let i = 0; i < 3; i++) this.fx.rise(this.player.x + 6 + i * 3, this.player.y - 22, "fx-z", { delay: i * 300, distance: 18 });
    this.time.delayedCall(500, () => cam.fadeOut(500, 0, 0, 0));
    this.time.delayedCall(1700, () => {
      cam.fadeIn(700, 0, 0, 0);
      this.say(message);
    });
  }

  private setupCabinLights() {
    this.lightsOverlay = this.add
      .rectangle(0, 0, this.mapW, this.mapH, 0x05030a, 0.72)
      .setOrigin(0)
      .setDepth(DEPTH.nightTint);
    let off = false;
    try {
      off = window.localStorage.getItem(CABIN_LIGHTS_KEY) === "off";
    } catch {
      // Storage may be blocked; lights default to on.
    }
    this.lightsOverlay.setAlpha(off ? 1 : 0);
  }

  private toggleCabinLights() {
    const overlay = this.lightsOverlay;
    if (!overlay) return;
    const turnOff = overlay.alpha < 0.5;
    click(turnOff ? 600 : 1100);
    this.tweens.add({ targets: overlay, alpha: turnOff ? 1 : 0, duration: 180 });
    try {
      window.localStorage.setItem(CABIN_LIGHTS_KEY, turnOff ? "off" : "on");
    } catch {
      // Not saved; fine.
    }
    this.say(turnOff ? "Click. The cabin goes dark; moonlight through the stern windows." : "Click. Warm lamplight again.");
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
      // At the helm the sea rushes past faster for a few seconds.
      this.drift += (delta / 1000) * (this.time.now < this.driftBoostUntil ? 26 : 4);
      this.ocean.tilePositionX = this.drift;
      this.ocean.tilePositionY = Math.round(Math.sin(t * 0.8) * 2);
      this.ocean.y = -32 + Math.round(Math.sin(t * 1.6));
    }
    if (this.foam && this.map.foam) {
      this.foam.tilePositionX = -t * 6;
      this.foam.y = this.map.foam.y * 16 + Math.round(Math.sin(t * 1.6));
    }

    const stick = Math.hypot(this.stick.x, this.stick.y) < JOYSTICK_DEADZONE ? { x: 0, y: 0 } : this.stick;
    const frozen = this.traveling || this.paused || this.time.now < this.busyUntil;
    this.player.applyInput(frozen ? { x: 0, y: 0 } : combineInput(this.keyboardVector(), stick));
    // A little sway after a strong drink.
    const sway = this.time.now < this.tipsyUntil ? Math.round(Math.sin(t * 2.2) * 5) : 0;
    this.cameras.main.setFollowOffset(sway, 12);
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
    // What's within reach? Tell the HUD when it changes.
    const near = this.traveling || this.paused ? null : nearestInteractable(this.map.interactables, this.player.x, this.player.y);
    if (near?.id !== this.near?.id) {
      this.near = near;
      this.bus.emit("prompt", near ? { label: near.label } : null);
    }
    const area = areaAt(this.map, this.player.x, this.player.y - 3);
    if (area && area !== this.currentArea) {
      this.currentArea = area;
      this.bus.emit("area", { name: area });
    }
  }
}
