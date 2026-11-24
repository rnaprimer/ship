"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { LOCATIONS, type Location } from "@/game/locations";

type Props = {
  current: string | null;
  onPick: (mapId: string) => void;
  onClose: () => void;
};

/**
 * The ship map: the logo and ship in the middle, three places down each side.
 * Picking one takes the player to that place's arrival point.
 */
export function LocationPicker({ current, onPick, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    dialogRef.current?.querySelector<HTMLButtonElement>("button[data-loc]:not([aria-current])")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [onClose]);

  const card = (loc: Location) => {
    const here = loc.mapId === current;
    return (
      <button
        key={loc.mapId}
        type="button"
        data-loc
        aria-current={here ? "location" : undefined}
        onClick={() => (here ? onClose() : onPick(loc.mapId))}
        className={`group flex min-h-24 flex-col items-center justify-center gap-1 rounded-sm px-3 py-4 text-center shadow-[0_3px_0_rgba(11,58,71,0.25)] transition-transform hover:-translate-y-0.5 focus-visible:outline-4 focus-visible:outline-offset-2 focus-visible:outline-[#3b2414] lg:min-h-32 ${
          here ? "bg-[#e0b266] ring-4 ring-[#3b2414]/70" : "bg-[#e3f3f9] hover:bg-white"
        }`}
      >
        <span className="text-base font-bold text-[#111] sm:text-lg">{loc.name}</span>
        <span className="hidden text-xs leading-snug text-[#0b3a47] sm:block">{here ? "You are here" : loc.blurb}</span>
        {here && <span className="text-xs font-medium text-[#3b2414] sm:hidden">You are here</span>}
      </button>
    );
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ship-map-title"
      className="home-sky font-display pointer-events-auto absolute inset-0 z-20 overflow-y-auto px-4 pb-8 pt-[calc(env(safe-area-inset-top)+12px)] sm:px-8"
    >
      <div className="mx-auto flex max-w-6xl items-start justify-between">
        <h2 id="ship-map-title" className="sr-only">
          Ship map: choose where to go
        </h2>
        <span />
        <button
          type="button"
          onClick={onClose}
          className="rounded-full border-2 border-[#3b2414]/70 bg-white/90 px-4 py-1.5 text-sm font-bold text-[#3b2414] hover:bg-white"
        >
          Close
        </button>
      </div>

      <div className="mx-auto -mt-4 w-48 sm:w-60">
        <Image src="/brand/logo.png" alt="Peekatribe" width={545} height={260} className="h-auto w-full" draggable={false} />
      </div>

      <div className="mx-auto mt-2 grid max-w-6xl grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-[minmax(0,15rem)_minmax(0,1fr)_minmax(0,15rem)] lg:items-center lg:gap-8">
        <div className="col-span-2 lg:order-2 lg:col-span-1">
          <Image
            src="/brand/ship.png"
            alt=""
            width={745}
            height={590}
            sizes="(min-width: 1024px) 50vw, 90vw"
            className="mx-auto h-auto w-full max-w-[560px]"
            draggable={false}
          />
        </div>
        <div className="flex flex-col gap-3 sm:gap-4 lg:order-1 lg:gap-5">{LOCATIONS.left.map(card)}</div>
        <div className="flex flex-col gap-3 sm:gap-4 lg:order-3 lg:gap-5">{LOCATIONS.right.map(card)}</div>
      </div>
    </div>
  );
}
