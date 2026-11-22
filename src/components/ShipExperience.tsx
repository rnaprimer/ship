"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GameBus } from "@/game/events";
import type { PassengerProfile, PlayerProfile, StartPosition } from "@/game/types";
import { sendPosition } from "@/lib/client/positionApi";
import { GameCanvas } from "./GameCanvas";
import { PlayerHUD } from "./PlayerHUD";
import { VirtualJoystick } from "./VirtualJoystick";

type Loaded = { player: PlayerProfile; position: StartPosition; passengers: PassengerProfile[] };

/** Loads the signed-in player (or sends them to /board), then starts the game. */
export function ShipExperience() {
  const router = useRouter();
  const [bus] = useState(() => new GameBus());
  const [data, setData] = useState<Loaded | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meRes = await fetch("/api/me", { cache: "no-store" });
        if (meRes.status === 401) {
          router.replace("/board");
          return;
        }
        if (!meRes.ok) throw new Error(`me ${meRes.status}`);
        const me = (await meRes.json()) as { player: PlayerProfile; position: StartPosition };
        const passengersRes = await fetch("/api/ship/passengers", { cache: "no-store" });
        const passengers = passengersRes.ok
          ? ((await passengersRes.json()) as { passengers: PassengerProfile[] }).passengers
          : [];
        if (!cancelled) setData({ player: me.player, position: me.position, passengers });
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (failed) {
    return (
      <div className="font-pixel absolute inset-0 flex items-center justify-center px-6 text-center text-xs leading-relaxed text-[#f4ead5]">
        Couldn&apos;t reach the ship. Check your connection and reload.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="font-pixel absolute inset-0 flex items-center justify-center text-xs text-[#f4ead5]">
        Boarding…
      </div>
    );
  }

  return (
    <>
      <GameCanvas
        bus={bus}
        player={data.player}
        passengers={data.passengers}
        initialPosition={data.position}
        savePosition={sendPosition}
      />
      <VirtualJoystick bus={bus} />
      <PlayerHUD bus={bus} />
    </>
  );
}
