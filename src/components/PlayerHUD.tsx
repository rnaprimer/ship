"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameBus, GameEvents } from "@/game/events";
import { LocationPicker } from "./LocationPicker";

/**
 * Overlay: welcome toast, arrival banner, current area, the ship-map button
 * and picker, desktop controls hint, optional FPS (?debug).
 */
export function PlayerHUD({ bus }: { bus: GameBus }) {
  const [location, setLocation] = useState<GameEvents["location"] | null>(null);
  const [arrival, setArrival] = useState<{ name: string; key: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [welcome, setWelcome] = useState<string | null>(null);
  const [area, setArea] = useState<string | null>(null);
  const [areaKey, setAreaKey] = useState(0);
  const [showKeysHint, setShowKeysHint] = useState(false);
  const [stats, setStats] = useState<GameEvents["stats"] | null>(null);
  const [debug, setDebug] = useState(false);

  useEffect(() => {
    // Read once on the client; avoids a dynamic API in a static page.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDebug(new URLSearchParams(window.location.search).has("debug"));
    const timers: number[] = [];
    const offReady = bus.on("ready", ({ username }) => {
      setWelcome(`Welcome aboard, @${username}!`);
      timers.push(window.setTimeout(() => setWelcome(null), 4000));
      if (!window.matchMedia("(pointer: coarse)").matches) {
        setShowKeysHint(true);
        timers.push(window.setTimeout(() => setShowKeysHint(false), 7000));
      }
    });
    const offArea = bus.on("area", ({ name }) => {
      setArea(name);
      setAreaKey((k) => k + 1);
    });
    const offStats = bus.on("stats", setStats);
    let arrivals = 0;
    const offLocation = bus.on("location", (loc) => {
      setLocation(loc);
      // The first arrival is covered by the welcome toast.
      if (arrivals++ > 0) setArrival({ name: loc.name, key: arrivals });
    });
    return () => {
      offLocation();
      offReady();
      offArea();
      offStats();
      timers.forEach(clearTimeout);
    };
  }, [bus]);

  const closePicker = useCallback(() => setPickerOpen(false), []);
  const travel = useCallback(
    (mapId: string) => {
      setPickerOpen(false);
      bus.emit("travel", { mapId });
    },
    [bus],
  );

  return (
    <div className="font-pixel pointer-events-none absolute inset-0 text-[#f4ead5] [text-shadow:0_2px_0_#1e1420]">
      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        disabled={!location}
        aria-haspopup="dialog"
        className="font-display pointer-events-auto absolute right-[calc(env(safe-area-inset-right)+12px)] top-[calc(env(safe-area-inset-top)+12px)] flex items-center gap-2 rounded-full border-2 border-[#3b2414] bg-[#e0b266] px-4 py-2 text-sm font-bold text-[#3b2414] shadow-[0_3px_0_#3b2414] [text-shadow:none] font-heading tracking-wide active:translate-y-0.5 active:shadow-none disabled:opacity-0"
      >
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden fill="currentColor">
          <path d="M7 2 1 4.5v13.5l6-2.5 6 2.5 6-2.5V2l-6 2.5L7 2Zm0 2.2 6 2.5v11.1l-6-2.5V4.2Z" />
        </svg>
        Ship map
      </button>
      {arrival && (
        <div
          key={`arrival-${arrival.key}`}
          className="hud-fade font-heading absolute inset-x-0 top-[38%] text-center text-2xl font-bold tracking-wide sm:text-4xl"
          aria-live="polite"
        >
          {arrival.name}
        </div>
      )}
      {area && (
        <div
          key={`area-${areaKey}`}
          className="hud-fade absolute inset-x-0 top-[calc(env(safe-area-inset-top)+16px)] text-center text-sm tracking-wide sm:text-lg"
        >
          {area}
        </div>
      )}
      {welcome && (
        <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+48px)] flex justify-center px-4">
          <div className="rounded-sm border-4 border-[#3b2414] bg-[#f4ead5] px-4 py-3 text-center text-base leading-snug text-[#3b2414] shadow-[0_4px_0_#3b2414] [text-shadow:none] sm:text-lg">
            {welcome}
          </div>
        </div>
      )}
      {showKeysHint && (
        <div className="absolute inset-x-0 bottom-6 text-center text-sm">WASD or arrow keys to walk</div>
      )}
      {pickerOpen && <LocationPicker current={location?.mapId ?? null} onPick={travel} onClose={closePicker} />}
      {debug && stats && (
        <div className="absolute left-2 top-2 bg-black/60 px-2 py-1 font-mono text-[11px] [text-shadow:none]">
          {stats.fps} fps · {Math.round(stats.x)},{Math.round(stats.y)} · {stats.direction}
        </div>
      )}
    </div>
  );
}
