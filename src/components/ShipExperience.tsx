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
          router.replace("/");
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

  // Every minute while the page is visible, refresh who is active or stale.
  useEffect(() => {
    if (!data) return;
    const timer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/ship/passengers", { cache: "no-store" });
        if (!res.ok) return;
        const { passengers } = (await res.json()) as { passengers: PassengerProfile[] };
        bus.emit("passengers", { passengers: passengers.map((p) => ({ username: p.username, active: p.active })) });
      } catch {
        // Offline for a moment: keep the last known state.
      }
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [bus, data]);

  if (failed) {
    return (
      <div className="font-pixel absolute inset-0 flex items-center justify-center px-6 text-center text-base leading-relaxed text-[#f4ead5]">
        Couldn&apos;t reach the ship. Check your connection and reload.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="font-pixel absolute inset-0 flex items-center justify-center text-lg text-[#f4ead5]">
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
      <PlayerHUD bus={bus} player={data.player} />
    </>
  );
}
