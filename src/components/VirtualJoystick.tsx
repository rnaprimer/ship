"use client";

import { useEffect, useRef, useState, type PointerEvent } from "react";
import type { GameBus } from "@/game/events";

const RADIUS = 56; // px the knob can travel from the centre
const KNOB = 26;

type Stick = { id: number; cx: number; cy: number; dx: number; dy: number };

/**
 * Floating touch joystick: put a thumb down anywhere and drag. Touch and pen
 * only. Mouse users have the keyboard. Emits a vector in [-1, 1] per axis.
 */
export function VirtualJoystick({ bus }: { bus: GameBus }) {
  const [stick, setStick] = useState<Stick | null>(null);
  const [isTouch, setIsTouch] = useState(false);
  const [used, setUsed] = useState(false);
  const stickRef = useRef<Stick | null>(null);

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)");
    const update = () => setIsTouch(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const emit = (s: Stick | null) => {
    stickRef.current = s;
    setStick(s);
    bus.emit("joystick", s ? { x: s.dx / RADIUS, y: s.dy / RADIUS } : { x: 0, y: 0 });
  };

  const onDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" || stickRef.current) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Capture is a nicety (keeps tracking if the finger leaves the element).
    }
    setUsed(true);
    emit({ id: e.pointerId, cx: e.clientX, cy: e.clientY, dx: 0, dy: 0 });
  };

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const s = stickRef.current;
    if (!s || s.id !== e.pointerId) return;
    let dx = e.clientX - s.cx;
    let dy = e.clientY - s.cy;
    const len = Math.hypot(dx, dy);
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS;
      dy = (dy / len) * RADIUS;
    }
    emit({ ...s, dx, dy });
  };

  const onUp = (e: PointerEvent<HTMLDivElement>) => {
    const s = stickRef.current;
    if (s && s.id === e.pointerId) emit(null);
  };

  return (
    <div
      className="absolute inset-0 touch-none"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
    >
      {stick && (
        <div
          className="pointer-events-none absolute rounded-full border-4 border-[#f4ead5]/50 bg-[#0b2a3d]/35"
          style={{ width: RADIUS * 2, height: RADIUS * 2, left: stick.cx - RADIUS, top: stick.cy - RADIUS }}
        >
          <div
            className="absolute rounded-full border-4 border-[#3b2414] bg-[#e0b266]"
            style={{
              width: KNOB * 2,
              height: KNOB * 2,
              left: RADIUS - KNOB - 4 + stick.dx,
              top: RADIUS - KNOB - 4 + stick.dy,
            }}
          />
        </div>
      )}
      {isTouch && !used && (
        <div className="font-pixel pointer-events-none absolute inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+40px)] text-center text-sm leading-relaxed text-[#f4ead5] [text-shadow:0_2px_0_#1e1420]">
          Touch and drag to walk
        </div>
      )}
    </div>
  );
}
