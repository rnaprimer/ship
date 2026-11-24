"use client";

import { useEffect, useRef } from "react";
import { BAR_MENU, DRINKS, type DrinkId } from "@/game/systems/interactions";

function usePanelKeys(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      prev?.focus();
    };
  }, [onClose]);
  return ref;
}

const card =
  "pointer-events-auto w-full max-w-lg rounded-sm border-4 border-[#3b2414] bg-[#f4ead5] p-5 text-[#3b2414] shadow-[0_6px_0_#3b2414] [text-shadow:none] sm:p-6";

/** A chart, log or notice board: the pixel sea chart plus a line of flavour text. */
export function ChartPanel({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const ref = usePanelKeys(onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="chart-title" className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 px-4">
      <div className={card}>
        <h2 id="chart-title" className="font-heading mb-3 text-center text-xl font-bold sm:text-2xl">
          {title.replace(/^(Read|Study) (the |your )?/, "").replace(/^\w/, (c) => c.toUpperCase())}
        </h2>
        {/* eslint-disable-next-line @next/next/no-img-element -- pixel art must not be resampled */}
        <img
          src="/game/chart.png"
          width={192}
          height={128}
          alt="A hand-drawn sea chart: islands, a skull-shaped rock, a compass rose and a dotted route from a little ship to a red X"
          className="mx-auto block h-auto w-full max-w-[384px] [image-rendering:pixelated]"
        />
        {text && <p className="font-display mt-4 text-center text-lg leading-snug">{text}</p>}
        <button
          type="button"
          onClick={onClose}
          className="font-heading mt-5 w-full rounded-sm border-4 border-[#3b2414] bg-[#e0b266] px-4 py-2.5 text-lg font-bold tracking-wide shadow-[0_4px_0_#3b2414] active:translate-y-1 active:shadow-none"
        >
          Roll it up
        </button>
      </div>
    </div>
  );
}

/** The pool bar's drinks list. */
export function BarMenu({ onPick, onClose }: { onPick: (drink: DrinkId) => void; onClose: () => void }) {
  const ref = usePanelKeys(onClose);
  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="bar-title" className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 px-4">
      <div className={`${card} max-w-sm`}>
        <h2 id="bar-title" className="font-heading mb-1 text-center text-2xl font-bold">
          The Pool Bar
        </h2>
        <p className="font-display mb-4 text-center text-base">What&apos;ll it be?</p>
        <div className="flex flex-col gap-2.5">
          {BAR_MENU.map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className="font-display flex items-center gap-3 rounded-sm border-2 border-[#3b2414] bg-white/80 px-4 py-2.5 text-left text-lg font-bold hover:bg-white"
            >
              <span
                aria-hidden
                className="inline-block size-4 rounded-sm border-2 border-[#3b2414]"
                style={{ background: `#${DRINKS[id].color.toString(16).padStart(6, "0")}` }}
              />
              {DRINKS[id].name}
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} className="font-display mt-4 w-full text-center text-base underline underline-offset-4">
          Maybe later
        </button>
      </div>
    </div>
  );
}
