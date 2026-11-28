"use client";

import { useEffect, useRef, useState } from "react";
import { HATS, OUTFIT_COLORS, ROLES, type Outfit } from "@/game/outfits";
import { CHARACTER_VARIANT_COUNT } from "@/game/types";

export type Look = { characterVariant: number; outfit: Outfit };

// Sheet geometry (scripts/art/characters.ts and scripts/art/outfits.ts).
const BODY = { w: 16, h: 24, sheetW: 96, sheetH: 576 };
const LAYER = { w: 24, h: 32 };
const OUTFIT_SHEET = { w: 720, h: 1280 };
const HAT_SHEET = { w: 144, h: 1152 };
const DIRS = ["down", "left", "up", "right"] as const;
const DIR_ROW = { down: 0, left: 1, right: 2, up: 3 } as const;

/** The character with outfit and hat, drawn from the game's own sprite sheets. */
export function LookPreview({ look, scale, dir = "down" }: { look: Look; scale: number; dir?: (typeof DIRS)[number] }) {
  const d = DIR_ROW[dir];
  const { role, color, hat } = look.outfit;
  const layer = (url: string, sheet: { w: number; h: number }, x: number, y: number) => ({
    backgroundImage: `url(${url})`,
    backgroundSize: `${sheet.w * scale}px ${sheet.h * scale}px`,
    backgroundPosition: `-${x * scale}px -${y * scale}px`,
    imageRendering: "pixelated" as const,
  });
  return (
    <span aria-hidden className="relative block" style={{ width: LAYER.w * scale, height: LAYER.h * scale }}>
      <span
        className="absolute"
        style={{
          left: 4 * scale,
          top: 8 * scale,
          width: BODY.w * scale,
          height: BODY.h * scale,
          ...layer("/game/characters.png", { w: BODY.sheetW, h: BODY.sheetH }, 0, (look.characterVariant * 4 + d) * BODY.h),
        }}
      />
      {role !== null && (
        <span
          className="absolute inset-0"
          style={layer("/game/outfits.png", OUTFIT_SHEET, color * 6 * LAYER.w, (role * 4 + d) * LAYER.h)}
        />
      )}
      {hat > 0 && <span className="absolute inset-0" style={layer("/game/hats.png", HAT_SHEET, 0, ((hat - 1) * 4 + d) * LAYER.h)} />}
    </span>
  );
}

type Props = {
  look: Look;
  onSaved: (look: Look) => void;
  onClose: () => void;
};

const choice = (on: boolean) =>
  `flex flex-col items-center justify-end rounded-sm border-4 p-1 text-xs leading-tight ${
    on ? "border-[#2f8f83] bg-[#e7f3ef]" : "border-[#3b2414]/25 bg-white/70 hover:bg-white"
  }`;

/** Dress up: crew role, outfit colour, hat and base look. Saved on the server so everyone sees it. */
export function WardrobePanel({ look, onSaved, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<Look>(look);
  const [turn, setTurn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const set = (o: Partial<Outfit>) => setDraft((d) => ({ ...d, outfit: { ...d.outfit, ...o } }));
  const role = draft.outfit.role === null ? null : ROLES[draft.outfit.role];
  const changed = JSON.stringify(draft) !== JSON.stringify(look);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/me/outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterVariant: draft.characterVariant, ...draft.outfit }),
      });
      if (res.status === 204) {
        onSaved(draft);
        return;
      }
      setError(res.status === 429 ? "Easy there! Too many changes. Try again in a minute." : res.status === 401 ? "Your boarding session has ended. Reload to board again." : "That didn't save. Please try again.");
    } catch {
      setError("No connection to the ship. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby="wardrobe-title"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      className="pointer-events-auto absolute inset-0 z-30 flex justify-center overflow-y-auto bg-black/55 px-3 py-6 [text-shadow:none]"
    >
      <div className="font-display relative my-auto h-fit w-full max-w-2xl rounded-sm border-4 border-[#3b2414] bg-[#f4ead5] p-4 text-[#3b2414] shadow-[0_6px_0_#3b2414] sm:p-6">
        <div className="sticky -top-6 z-10 -mx-4 -mt-4 mb-3 flex items-start justify-between gap-3 border-b-2 border-[#3b2414]/20 bg-[#f4ead5] px-4 pb-2 pt-4 sm:-mx-6 sm:-mt-6 sm:px-6 sm:pt-6">
          <div>
            <h2 id="wardrobe-title" className="font-heading text-2xl font-bold">Wardrobe</h2>
            <p className="text-base leading-snug">Pick a crew role, then make it yours. Everyone on the ship sees your outfit.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close wardrobe" className="shrink-0 rounded-full border-2 border-[#3b2414] bg-white px-3 py-1 text-sm font-bold shadow-[0_2px_0_#3b2414] hover:bg-[#fff8e6] active:translate-y-0.5 active:shadow-none">
            <span aria-hidden="true">✕</span> Close
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-start">
          <div className="flex shrink-0 flex-col items-center gap-2 rounded-sm border-2 border-[#3b2414]/40 bg-[#cfe3e8] p-3">
            <LookPreview look={draft} scale={5} dir={DIRS[turn]} />
            <button type="button" onClick={() => setTurn((t) => (t + 1) % 4)} className="rounded-full border-2 border-[#3b2414] bg-white px-3 py-0.5 text-sm font-bold">
              ↻ Turn around
            </button>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="font-heading text-xl font-bold">{role ? `${role.icon} ${role.name}` : "Deckhand"}</p>
            <p className="text-base leading-snug">{role ? role.tool : "Plain sailor's clothes. Pick a role below to dress up."}</p>
            {role && (
              <p className="mt-1 text-sm leading-snug text-[#5a3a22]">
                Role action: <span className="font-bold">{role.action}</span>. Use the button on screen, or press R.
              </p>
            )}
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="font-heading mb-2 text-lg font-bold">Crew role</legend>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            <button type="button" aria-pressed={draft.outfit.role === null} onClick={() => set({ role: null })} className={choice(draft.outfit.role === null)}>
              <LookPreview look={{ ...draft, outfit: { ...draft.outfit, role: null } }} scale={2} />
              Deckhand
            </button>
            {ROLES.map((r, i) => (
              <button key={r.id} type="button" aria-pressed={draft.outfit.role === i} onClick={() => set({ role: i })} className={choice(draft.outfit.role === i)}>
                <LookPreview look={{ ...draft, outfit: { ...draft.outfit, role: i } }} scale={2} />
                {r.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4" disabled={draft.outfit.role === null}>
          <legend className="font-heading mb-2 text-lg font-bold">Outfit colour</legend>
          <div className={`flex flex-wrap gap-2 ${draft.outfit.role === null ? "opacity-40" : ""}`}>
            {OUTFIT_COLORS.map((c, i) => (
              <button
                key={c.name}
                type="button"
                aria-label={c.name}
                aria-pressed={draft.outfit.color === i}
                onClick={() => set({ color: i })}
                className={`flex items-center gap-2 rounded-full border-4 py-1 pl-1 pr-3 text-sm ${draft.outfit.color === i ? "border-[#2f8f83] bg-[#e7f3ef]" : "border-[#3b2414]/25 bg-white/70"}`}
              >
                <span aria-hidden className="size-6 rounded-full border-2 border-[#3b2414]" style={{ background: c.main }} />
                {c.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="font-heading mb-2 text-lg font-bold">Hat</legend>
          <div className="grid grid-cols-5 gap-2">
            {HATS.map((h, i) => (
              <button key={h.name} type="button" aria-pressed={draft.outfit.hat === i} onClick={() => set({ hat: i })} className={choice(draft.outfit.hat === i)}>
                <LookPreview look={{ ...draft, outfit: { ...draft.outfit, hat: i } }} scale={2} />
                {h.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="mt-4">
          <legend className="font-heading mb-2 text-lg font-bold">Face and hair</legend>
          <div className="grid grid-cols-6 gap-2">
            {Array.from({ length: CHARACTER_VARIANT_COUNT }, (_, v) => (
              <button key={v} type="button" aria-label={`Look ${v + 1}`} aria-pressed={draft.characterVariant === v} onClick={() => setDraft((d) => ({ ...d, characterVariant: v }))} className={choice(draft.characterVariant === v)}>
                <LookPreview look={{ characterVariant: v, outfit: { role: null, color: 0, hat: 0 } }} scale={2} />
              </button>
            ))}
          </div>
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 rounded-sm border-2 border-[#c2483d] bg-[#fbe4e1] px-3 py-2 text-sm">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-3">
          <button type="button" onClick={onClose} className="font-heading flex-1 rounded-sm border-2 border-[#3b2414] bg-white py-2 text-base font-bold">
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={busy || !changed}
            className="font-heading flex-[2] rounded-sm border-2 border-[#3b2414] bg-[#e0b266] py-2 text-base font-bold shadow-[0_2px_0_#3b2414] active:translate-y-0.5 active:shadow-none disabled:opacity-50"
          >
            {busy ? "Saving…" : changed ? "Wear this outfit" : "You're wearing this"}
          </button>
        </div>
      </div>
    </div>
  );
}
