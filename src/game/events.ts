/**
 * Tiny typed event emitter shared by the React HUD and the Phaser game.
 * It has no Phaser dependency, so HUD components can import it without
 * pulling Phaser into the server or main client bundle.
 */
import type { Direction } from "./types";
import type { Outfit } from "./outfits";

export type GameEvents = {
  /** Game finished loading and the player has spawned. */
  ready: { username: string };
  /** The player walked into a different named area of the ship. */
  area: { name: string };
  /** Analog stick vector from the touch joystick, each axis in [-1, 1]. */
  joystick: { x: number; y: number };
  /** The player arrived on a map (at load and after every trip). */
  location: { mapId: string; name: string };
  /** Ask the game to take the player to another map (from the location picker). */
  travel: { mapId: string };
  /** Something usable is within reach (its prompt), or nothing (null). */
  prompt: { label: string } | null;
  /** The player used something that needs a panel: a chart to read or the bar menu. */
  activity: { kind: "chart" | "bar"; title: string; text: string };
  /** A short line to show the player ("Cheers!", "BOOM!"). */
  say: { text: string };
  /** Use whatever is within reach (the on-screen button). */
  use: Record<string, never>;
  /** A drink chosen from the bar menu. */
  drink: { drink: string };
  /** Freeze movement while a panel is open. */
  pause: { paused: boolean };
  /** The passenger's skills (sent at start and after every change). */
  skills: { xp: Record<string, number>; parrot: boolean };
  /** XP was earned (for the little "+1 Gunnery" chip). */
  xp: { skill: string; gained: number };
  /** Use a level-5 ability from the skills panel. */
  ability: { id: string };
  /** The player's look changed in the Wardrobe (already saved on the server). */
  look: { characterVariant: number; outfit: Outfit };
  /** Do your crew role's action (button or R key). */
  roleAction: Record<string, never>;
  /** A fresh passenger list (polled while the page is visible), to update who is stale. */
  passengers: { passengers: { username: string; active: boolean }[] };
  /** Debug stats, emitted about once per second. */
  stats: { fps: number; x: number; y: number; direction: Direction };
};

type Handler<T> = (payload: T) => void;

export class GameBus {
  private handlers = new Map<keyof GameEvents, Set<Handler<never>>>();

  on<K extends keyof GameEvents>(event: K, handler: Handler<GameEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) {
      set = new Set();
      this.handlers.set(event, set);
    }
    set.add(handler as Handler<never>);
    return () => {
      set.delete(handler as Handler<never>);
    };
  }

  emit<K extends keyof GameEvents>(event: K, payload: GameEvents[K]): void {
    const set = this.handlers.get(event);
    if (!set) return;
    for (const handler of set) (handler as Handler<GameEvents[K]>)(payload);
  }

  clear(): void {
    this.handlers.clear();
  }
}
