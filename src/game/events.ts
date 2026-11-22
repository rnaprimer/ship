/**
 * Tiny typed event emitter shared by the React HUD and the Phaser game.
 * It has no Phaser dependency, so HUD components can import it without
 * pulling Phaser into the server or main client bundle.
 */
import type { Direction } from "./types";

export type GameEvents = {
  /** Game finished loading and the player has spawned. */
  ready: { username: string };
  /** The player walked into a different named area of the ship. */
  area: { name: string };
  /** Analog stick vector from the touch joystick, each axis in [-1, 1]. */
  joystick: { x: number; y: number };
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
