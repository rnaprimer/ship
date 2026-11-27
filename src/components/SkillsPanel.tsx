"use client";

import { useEffect, useRef } from "react";
import { progressFor, SKILL_IDS, SKILLS, type AbilityId, type SkillId } from "@/game/systems/skills";

const ICON: Record<SkillId, string> = { gunnery: "💥", navigation: "🧭", brewing: "🧪", seamanship: "⚓" };
const ABILITY_LABEL: Record<AbilityId, (on: boolean) => string> = {
  spyglass: () => "Use the spyglass",
  bubbles: () => "Drink a rainbow brew",
  parrot: (on) => (on ? "Send your parrot away" : "Call your parrot"),
};

type Props = {
  xp: Record<string, number>;
  parrot: boolean;
  onAbility: (id: AbilityId) => void;
  onClose: () => void;
};

/** Your four sea skills: level, progress to the next level, and what each level unlocks. */
export function SkillsPanel({ xp, parrot, onAbility, onClose }: Props) {
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

  return (
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="skills-title" className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-black/55 px-3 py-6 [text-shadow:none]">
      <div className="font-display w-full max-w-2xl rounded-sm border-4 border-[#3b2414] bg-[#f4ead5] p-4 text-[#3b2414] shadow-[0_6px_0_#3b2414] sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2 id="skills-title" className="font-heading text-2xl font-bold">Sea Skills</h2>
            <p className="text-base leading-snug">Do things around the ship to grow your skills. Each level unlocks something new.</p>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full border-2 border-[#3b2414] bg-white/80 px-3 py-1 text-sm font-bold hover:bg-white">
            Close
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SKILL_IDS.map((id) => {
            const skill = SKILLS[id];
            const p = progressFor(xp[id] ?? 0);
            return (
              <section key={id} className="rounded-sm border-2 border-[#3b2414]/60 bg-white/60 p-3">
                <div className="flex items-baseline justify-between">
                  <h3 className="font-heading text-lg font-bold">
                    <span aria-hidden className="mr-1">{ICON[id]}</span>
                    {skill.name}
                  </h3>
                  <span className="text-sm font-bold">Level {p.level}</span>
                </div>
                <p className="text-sm leading-snug text-[#5a3a22]">{skill.blurb}</p>
                <div
                  className="mt-2 h-2.5 overflow-hidden rounded-full border border-[#3b2414]/50 bg-[#e8d7a6]"
                  role="progressbar"
                  aria-label={`${skill.name} progress`}
                  aria-valuemin={0}
                  aria-valuemax={p.need || 1}
                  aria-valuenow={p.need ? p.into : 1}
                >
                  <div className="h-full bg-[#d29a3a]" style={{ width: `${Math.round(p.fraction * 100)}%` }} />
                </div>
                <p className="mt-1 text-xs text-[#5a3a22]">{p.need ? `${p.into} / ${p.need} to level ${p.level + 1}` : "Mastered"}</p>
                <ul className="mt-2 space-y-1">
                  {skill.perks.map((perk) => {
                    const open = p.level >= perk.level;
                    return (
                      <li key={perk.name} className={`text-sm leading-snug ${open ? "" : "opacity-55"}`}>
                        <span className="font-bold">{open ? "✓" : `Lv ${perk.level}`}</span> {perk.name}: {perk.text}
                        {open && perk.ability && (
                          <button
                            type="button"
                            onClick={() => onAbility(perk.ability!)}
                            className="font-heading mt-1 block rounded-sm border-2 border-[#3b2414] bg-[#e0b266] px-3 py-1 text-sm font-bold shadow-[0_2px_0_#3b2414] active:translate-y-0.5 active:shadow-none"
                          >
                            {ABILITY_LABEL[perk.ability](parrot)}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
        <p className="mt-3 text-xs text-[#5a3a22]">Your skills are saved in this browser.</p>
      </div>
    </div>
  );
}
