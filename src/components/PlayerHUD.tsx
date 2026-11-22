"use client";

import { useEffect, useState } from "react";
import type { GameBus, GameEvents } from "@/game/events";

/** Minimal overlay: welcome toast, current area, desktop controls hint, optional FPS (?debug). */
export function PlayerHUD({ bus }: { bus: GameBus }) {
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
    return () => {
      offReady();
      offArea();
      offStats();
      timers.forEach(clearTimeout);
    };
  }, [bus]);

  return (
    <div className="font-pixel pointer-events-none absolute inset-0 text-[#f4ead5] [text-shadow:0_2px_0_#1e1420]">
      {area && (
        <div
          key={areaKey}
          className="hud-fade absolute inset-x-0 top-[calc(env(safe-area-inset-top)+16px)] text-center text-[11px] tracking-wide sm:text-sm"
        >
          {area}
        </div>
      )}
      {welcome && (
        <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+48px)] flex justify-center px-4">
          <div className="rounded-sm border-4 border-[#3b2414] bg-[#f4ead5] px-4 py-3 text-center text-[10px] leading-relaxed text-[#3b2414] shadow-[0_4px_0_#3b2414] [text-shadow:none] sm:text-xs">
            {welcome}
          </div>
        </div>
      )}
      {showKeysHint && (
        <div className="absolute inset-x-0 bottom-6 text-center text-[10px]">WASD or arrow keys to walk</div>
      )}
      {debug && stats && (
        <div className="absolute left-2 top-2 bg-black/60 px-2 py-1 font-mono text-[11px] [text-shadow:none]">
          {stats.fps} fps · {Math.round(stats.x)},{Math.round(stats.y)} · {stats.direction}
        </div>
      )}
    </div>
  );
}
