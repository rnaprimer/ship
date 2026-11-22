import type { Direction } from "../types";

/** Player walking speed in world pixels per second (5 tiles/s). */
export const PLAYER_SPEED = 80;
/** Ambient passengers stroll a little slower. */
export const PASSENGER_SPEED = 34;
/** Analog stick values below this magnitude are ignored. */
export const JOYSTICK_DEADZONE = 0.18;

export type Vec = { x: number; y: number };

/**
 * Turns raw input into a velocity. Keyboard input is -1/0/1 per axis; joystick
 * input is analog. The result never exceeds `speed`, so diagonals are not faster.
 */
export function inputToVelocity(input: Vec, speed: number, deadzone = 0): Vec {
  const { x, y } = input;
  if (!Number.isFinite(x) || !Number.isFinite(y)) return { x: 0, y: 0 };
  const len = Math.hypot(x, y);
  if (len === 0 || len < deadzone) return { x: 0, y: 0 };
  const scale = len > 1 ? 1 / len : 1;
  return { x: x * scale * speed, y: y * scale * speed };
}

/** Combines keyboard and joystick: keys win when any are held. */
export function combineInput(keys: Vec, stick: Vec): Vec {
  return keys.x !== 0 || keys.y !== 0 ? keys : stick;
}

/** Facing for a velocity: the dominant axis wins; idle keeps the previous facing. */
export function facingFrom(v: Vec, previous: Direction): Direction {
  if (v.x === 0 && v.y === 0) return previous;
  if (Math.abs(v.x) > Math.abs(v.y)) return v.x < 0 ? "left" : "right";
  if (Math.abs(v.y) > Math.abs(v.x)) return v.y < 0 ? "up" : "down";
  // Exact diagonal: keep the previous facing if it is one of the two axes.
  const horizontal: Direction = v.x < 0 ? "left" : "right";
  const vertical: Direction = v.y < 0 ? "up" : "down";
  return previous === horizontal || previous === vertical ? previous : vertical;
}

/** Moves `from` towards `to` by at most `maxDistance`. Frame-rate independent when maxDistance = speed × dt. */
export function moveToward(from: Vec, to: Vec, maxDistance: number): Vec & { arrived: boolean } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= maxDistance || dist === 0) return { x: to.x, y: to.y, arrived: true };
  const k = maxDistance / dist;
  return { x: from.x + dx * k, y: from.y + dy * k, arrived: false };
}
