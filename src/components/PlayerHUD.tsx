"use client";

import { useCallback, useEffect, useState } from "react";
import type { GameBus, GameEvents } from "@/game/events";
import { LocationPicker } from "./LocationPicker";
import { BarMenu, ChartPanel } from "./ActivityPanels";
import { SkillsPanel } from "./SkillsPanel";
import { levelFor, type AbilityId } from "@/game/systems/skills";
import type { DrinkId } from "@/game/systems/interactions";
import type { PlayerProfile } from "@/game/types";
import { cleanOutfit, roleOf } from "@/game/outfits";
import { WardrobePanel, type Look } from "./WardrobePanel";

/**
 * Overlay: welcome toast, arrival banner, current area, the ship-map button
 * and picker, desktop controls hint, optional FPS (?debug).
 */
export function PlayerHUD({ bus, player }: { bus: GameBus; player: PlayerProfile }) {
  const [look, setLook] = useState<Look>(() => ({ characterVariant: player.characterVariant, outfit: cleanOutfit(player.outfit) }));
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [location, setLocation] = useState<GameEvents["location"] | null>(null);
  const [arrival, setArrival] = useState<{ name: string; key: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [prompt, setPrompt] = useState<string | null>(null);
  const [said, setSaid] = useState<{ text: string; key: number } | null>(null);
  const [panel, setPanel] = useState<GameEvents["activity"] | null>(null);
  const [touch, setTouch] = useState(false);
  const [skills, setSkills] = useState<GameEvents["skills"]>({ xp: {}, parrot: false });
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [xpChip, setXpChip] = useState<{ text: string; key: number } | null>(null);
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
    setTouch(window.matchMedia("(pointer: coarse)").matches);
    let says = 0;
    const offPrompt = bus.on("prompt", (p) => setPrompt(p?.label ?? null));
    const offSay = bus.on("say", ({ text }) => setSaid({ text, key: ++says }));
    const offActivity = bus.on("activity", setPanel);
    const offSkills = bus.on("skills", setSkills);
    let chips = 0;
    const offXp = bus.on("xp", ({ skill, gained }) => setXpChip({ text: `+${gained} ${skill}`, key: ++chips }));
    let arrivals = 0;
    const offLocation = bus.on("location", (loc) => {
      setLocation(loc);
      // The first arrival is covered by the welcome toast.
      if (arrivals++ > 0) setArrival({ name: loc.name, key: arrivals });
    });
    return () => {
      offPrompt();
      offSay();
      offActivity();
      offSkills();
      offXp();
      offLocation();
      offReady();
      offArea();
      offStats();
      timers.forEach(clearTimeout);
    };
  }, [bus]);

  const closePicker = useCallback(() => setPickerOpen(false), []);
  const closePanel = useCallback(() => setPanel(null), []);
  const pickDrink = useCallback(
    (drink: DrinkId) => {
      setPanel(null);
      bus.emit("drink", { drink });
    },
    [bus],
  );
  // Freeze walking while any panel is open.
  const anyPanel = pickerOpen || skillsOpen || wardrobeOpen || panel !== null;
  const closeWardrobe = useCallback(() => setWardrobeOpen(false), []);
  const wearLook = useCallback(
    (next: Look) => {
      setLook(next);
      setWardrobeOpen(false);
      bus.emit("look", next);
    },
    [bus],
  );
  const role = roleOf(look.outfit);
  const closeSkills = useCallback(() => setSkillsOpen(false), []);
  const useAbility = useCallback(
    (id: AbilityId) => {
      setSkillsOpen(false);
      bus.emit("ability", { id });
    },
    [bus],
  );
  useEffect(() => {
    bus.emit("pause", { paused: anyPanel });
  }, [bus, anyPanel]);
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
      {said && (
        <div
          key={`say-${said.key}`}
          className="say-fade absolute inset-x-0 top-[calc(env(safe-area-inset-top)+144px)] flex justify-center px-4 sm:top-[calc(env(safe-area-inset-top)+92px)] sm:pr-44"
          aria-live="polite"
        >
          <div className="max-w-md rounded-sm border-2 border-[#3b2414] bg-[#f4ead5]/95 px-4 py-2 text-center text-base leading-snug text-[#3b2414] [text-shadow:none] sm:text-lg">
            {said.text}
          </div>
        </div>
      )}
      {prompt && !anyPanel && (
        <div className="absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+92px)] flex justify-center px-4 sm:bottom-14">
          <button
            type="button"
            onClick={() => bus.emit("use", {})}
            className="pointer-events-auto flex items-center gap-2 rounded-full border-2 border-[#3b2414] bg-[#f4ead5] py-1.5 pl-1.5 pr-4 text-base text-[#3b2414] shadow-[0_3px_0_#3b2414] [text-shadow:none] active:translate-y-0.5 active:shadow-none sm:text-lg"
          >
            <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-[#3b2414] px-2 text-sm text-[#f4ead5]">
              {touch ? "Tap" : "E"}
            </span>
            {prompt}
          </button>
        </div>
      )}
      {panel?.kind === "chart" && <ChartPanel title={panel.title} text={panel.text} onClose={closePanel} />}
      {panel?.kind === "bar" && <BarMenu onPick={pickDrink} onClose={closePanel} secret={levelFor(skills.xp.brewing ?? 0) >= 2} />}
      {skillsOpen && <SkillsPanel xp={skills.xp} parrot={skills.parrot} onAbility={useAbility} onClose={closeSkills} />}
      <button
        type="button"
        onClick={() => setSkillsOpen(true)}
        disabled={!location}
        aria-haspopup="dialog"
        className="font-heading pointer-events-auto absolute right-[calc(env(safe-area-inset-right)+12px)] top-[calc(env(safe-area-inset-top)+56px)] flex items-center gap-2 rounded-full border-2 border-[#3b2414] bg-[#f4ead5] px-4 py-1.5 text-sm font-bold tracking-wide text-[#3b2414] shadow-[0_3px_0_#3b2414] [text-shadow:none] active:translate-y-0.5 active:shadow-none disabled:opacity-0"
      >
        Skills
      </button>
      <button
        type="button"
        onClick={() => setWardrobeOpen(true)}
        disabled={!location}
        aria-haspopup="dialog"
        className="font-heading pointer-events-auto absolute right-[calc(env(safe-area-inset-right)+12px)] top-[calc(env(safe-area-inset-top)+98px)] flex items-center gap-2 rounded-full border-2 border-[#3b2414] bg-[#f4ead5] px-4 py-1.5 text-sm font-bold tracking-wide text-[#3b2414] shadow-[0_3px_0_#3b2414] [text-shadow:none] active:translate-y-0.5 active:shadow-none disabled:opacity-0"
      >
        Wardrobe
      </button>
      {role && location && !anyPanel && (
        <button
          type="button"
          onClick={() => bus.emit("roleAction", {})}
          aria-label={`${role.action}${touch ? "" : " (R)"}`}
          className="font-heading pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] right-[calc(env(safe-area-inset-right)+12px)] flex items-center gap-2 rounded-full border-2 border-[#3b2414] bg-[#e0b266] py-1.5 pl-1.5 pr-4 text-sm font-bold text-[#3b2414] shadow-[0_3px_0_#3b2414] [text-shadow:none] active:translate-y-0.5 active:shadow-none sm:text-base"
        >
          <span aria-hidden className="flex size-8 items-center justify-center rounded-full bg-[#f4ead5] text-base">{role.icon}</span>
          {role.action}
          {!touch && <span className="rounded-sm bg-[#3b2414] px-1.5 text-xs text-[#f4ead5]">R</span>}
        </button>
      )}
      {wardrobeOpen && <WardrobePanel look={look} onSaved={wearLook} onClose={closeWardrobe} />}
      {xpChip && (
        <div
          key={`xp-${xpChip.key}`}
          className="hud-fade absolute left-[calc(env(safe-area-inset-left)+12px)] top-[calc(env(safe-area-inset-top)+56px)] rounded-full bg-[#3b2414]/85 px-3 py-1 text-sm text-[#f6d27a] [text-shadow:none]"
        >
          {xpChip.text}
        </div>
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
