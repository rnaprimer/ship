"use client";

import { useEffect, useRef } from "react";
import type { Game } from "phaser";
import type { GameBus } from "@/game/events";
import type { PassengerProfile, PlayerProfile, PositionSaver, StartPosition } from "@/game/types";

type Props = {
  bus: GameBus;
  player: PlayerProfile;
  passengers: PassengerProfile[];
  initialPosition: StartPosition;
  savePosition: PositionSaver;
};

/**
 * Mounts the Phaser game. Phaser touches `window` at import time, so it is
 * imported dynamically inside the effect: it never runs on the server and
 * lives in its own client chunk.
 */
export function GameCanvas({ bus, player, passengers, initialPosition, savePosition }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const parent = containerRef.current;
    if (!parent) return;

    let game: Game | undefined;
    let cancelled = false;

    import("@/game/createGame").then(({ createGame }) => {
      if (cancelled) return;
      game = createGame({ parent, bus, player, passengers, initialPosition, savePosition });
      // Dev-only handle for manual testing in the browser console.
      if (process.env.NODE_ENV !== "production") {
        (window as unknown as { __shipGame?: Game }).__shipGame = game;
      }
    });

    return () => {
      cancelled = true;
      game?.destroy(true);
      if (process.env.NODE_ENV !== "production") {
        delete (window as unknown as { __shipGame?: Game }).__shipGame;
      }
    };
  }, [bus, player, passengers, initialPosition, savePosition]);

  return <div ref={containerRef} className="game-canvas absolute inset-0" />;
}
