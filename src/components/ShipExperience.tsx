"use client";

import { useState } from "react";
import { GameBus } from "@/game/events";
import { MOCK_PASSENGERS, MOCK_PLAYER } from "@/game/mock";
import { GameCanvas } from "./GameCanvas";
import { PlayerHUD } from "./PlayerHUD";
import { VirtualJoystick } from "./VirtualJoystick";

/**
 * Milestone 1: mock player and passengers. Milestone 2 replaces these with
 * the session-backed `/api/me` profile and `/api/ship/passengers`.
 */
export function ShipExperience() {
  const [bus] = useState(() => new GameBus());
  return (
    <>
      <GameCanvas bus={bus} player={MOCK_PLAYER} passengers={MOCK_PASSENGERS} />
      <VirtualJoystick bus={bus} />
      <PlayerHUD bus={bus} />
    </>
  );
}
