"use client";

import { useEffect, useState } from "react";

type ShipInfo = { name: string; boardingOpen: boolean; passengers: number };

/** Live passenger count from /api/ship (CDN-cached 30 s), refreshed every 30 s. */
export function PassengerCount({ variant = "pixel" }: { variant?: "pixel" | "home" }) {
  const [info, setInfo] = useState<ShipInfo | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = () =>
      fetch("/api/ship")
        .then((r) => (r.ok ? r.json() : null))
        .then((j: ShipInfo | null) => {
          if (!cancelled && j) setInfo(j);
        })
        .catch(() => {});
    load();
    const t = window.setInterval(load, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(t);
    };
  }, []);

  if (variant === "home") {
    return (
      <div className="flex flex-col items-end gap-2 text-right" aria-live="polite">
        <p className="font-display flex items-center gap-2 text-base font-bold text-[#1f2a2e] sm:text-lg">
          <span className={info ? "" : "opacity-0"}>
            {(info?.passengers ?? 0).toLocaleString()} {info?.passengers === 1 ? "passenger" : "passengers"} aboard
          </span>
          <span className="live-dot inline-block size-3.5 rounded-full bg-[#ee2a1b]" aria-hidden />
        </p>
        {info && !info.boardingOpen && (
          <p className="font-display rounded-lg bg-white/80 px-3 py-2 text-sm text-[#1f2a2e]">
            Boarding is paused right now. Please check back soon.
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 text-center" aria-live="polite">
      <p className="font-pixel text-xs leading-relaxed text-[#f4ead5] [text-shadow:0_2px_0_#0b2a3d] sm:text-sm">
        {info ? (
          <>
            <span className="text-[#ffe08a]">{info.passengers.toLocaleString()}</span>{" "}
            {info.passengers === 1 ? "passenger" : "passengers"} aboard
          </>
        ) : (
          <span className="opacity-0">0 passengers aboard</span>
        )}
      </p>
      {info && !info.boardingOpen && (
        <p className="rounded-sm bg-[#0b2a3d]/80 px-3 py-2 text-xs text-[#f4ead5]">
          Boarding is paused right now. Please check back soon.
        </p>
      )}
    </div>
  );
}
