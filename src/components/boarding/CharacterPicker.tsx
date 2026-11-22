"use client";

import { CHARACTER_VARIANT_COUNT } from "@/game/types";

const SCALE = 3;
const FRAME_W = 16;
const FRAME_H = 24;
const SHEET_W = 96;
const SHEET_H = 576;

/** Shows the front-facing idle frame of each look from the same sprite sheet the game uses. */
export function CharacterPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <fieldset className="mb-5">
      <legend className="mb-2 text-sm">Pick your look</legend>
      <div className="grid grid-cols-6 gap-2">
        {Array.from({ length: CHARACTER_VARIANT_COUNT }, (_, v) => (
          <button
            key={v}
            type="button"
            aria-label={`Look ${v + 1}`}
            aria-pressed={value === v}
            onClick={() => onChange(v)}
            className={`flex aspect-[2/3] items-center justify-center rounded-sm border-4 ${
              value === v ? "border-[#2f8f83] bg-[#e7f3ef]" : "border-[#3b2414]/30 bg-white"
            }`}
          >
            <span
              aria-hidden
              style={{
                width: FRAME_W * SCALE,
                height: FRAME_H * SCALE,
                backgroundImage: "url(/game/characters.png)",
                backgroundSize: `${SHEET_W * SCALE}px ${SHEET_H * SCALE}px`,
                backgroundPosition: `0 -${v * 4 * FRAME_H * SCALE}px`,
                imageRendering: "pixelated",
              }}
            />
          </button>
        ))}
      </div>
    </fieldset>
  );
}
