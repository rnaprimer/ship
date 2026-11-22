import { describe, expect, it } from "vitest";
import { combineInput, facingFrom, inputToVelocity, moveToward, PLAYER_SPEED } from "./movement";
import { pickZoom } from "./zoom";

describe("inputToVelocity", () => {
  it("moves at full speed on one axis", () => {
    expect(inputToVelocity({ x: 1, y: 0 }, PLAYER_SPEED)).toEqual({ x: PLAYER_SPEED, y: 0 });
    expect(inputToVelocity({ x: 0, y: -1 }, PLAYER_SPEED)).toEqual({ x: 0, y: -PLAYER_SPEED });
  });

  it("normalizes diagonals so they are not faster", () => {
    const v = inputToVelocity({ x: 1, y: 1 }, PLAYER_SPEED);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(PLAYER_SPEED, 6);
    expect(v.x).toBeCloseTo(v.y, 6);
  });

  it("keeps analog magnitude below 1 (gentle joystick = slow walk)", () => {
    const v = inputToVelocity({ x: 0.5, y: 0 }, PLAYER_SPEED);
    expect(v.x).toBeCloseTo(PLAYER_SPEED / 2, 6);
  });

  it("clamps oversized analog input to full speed", () => {
    const v = inputToVelocity({ x: 3, y: 4 }, PLAYER_SPEED);
    expect(Math.hypot(v.x, v.y)).toBeCloseTo(PLAYER_SPEED, 6);
  });

  it("returns zero for no input, deadzone input and garbage", () => {
    expect(inputToVelocity({ x: 0, y: 0 }, PLAYER_SPEED)).toEqual({ x: 0, y: 0 });
    expect(inputToVelocity({ x: 0.1, y: 0.05 }, PLAYER_SPEED, 0.18)).toEqual({ x: 0, y: 0 });
    expect(inputToVelocity({ x: Number.NaN, y: 1 }, PLAYER_SPEED)).toEqual({ x: 0, y: 0 });
  });
});

describe("combineInput", () => {
  it("prefers the keyboard when a key is held, otherwise the stick", () => {
    expect(combineInput({ x: 1, y: 0 }, { x: 0, y: 1 })).toEqual({ x: 1, y: 0 });
    expect(combineInput({ x: 0, y: 0 }, { x: 0, y: 1 })).toEqual({ x: 0, y: 1 });
  });
});

describe("facingFrom", () => {
  it("faces along the dominant axis", () => {
    expect(facingFrom({ x: -5, y: 1 }, "down")).toBe("left");
    expect(facingFrom({ x: 5, y: 1 }, "down")).toBe("right");
    expect(facingFrom({ x: 1, y: -5 }, "down")).toBe("up");
    expect(facingFrom({ x: 1, y: 5 }, "up")).toBe("down");
  });

  it("keeps the previous facing when idle, and on exact diagonals that include it", () => {
    expect(facingFrom({ x: 0, y: 0 }, "left")).toBe("left");
    expect(facingFrom({ x: 1, y: 1 }, "right")).toBe("right");
    expect(facingFrom({ x: 1, y: 1 }, "up")).toBe("down");
  });
});

describe("moveToward (frame-rate independence)", () => {
  it("covers the same distance at 30, 60 and 144 fps", () => {
    const distanceAfterOneSecond = (fps: number) => {
      let p = { x: 0, y: 0 };
      for (let i = 0; i < fps; i++) p = moveToward(p, { x: 1000, y: 0 }, PLAYER_SPEED / fps);
      return p.x;
    };
    expect(distanceAfterOneSecond(30)).toBeCloseTo(PLAYER_SPEED, 6);
    expect(distanceAfterOneSecond(60)).toBeCloseTo(PLAYER_SPEED, 6);
    expect(distanceAfterOneSecond(144)).toBeCloseTo(PLAYER_SPEED, 6);
  });

  it("stops exactly on the target without overshooting", () => {
    const r = moveToward({ x: 0, y: 0 }, { x: 3, y: 4 }, 10);
    expect(r).toEqual({ x: 3, y: 4, arrived: true });
    const partial = moveToward({ x: 0, y: 0 }, { x: 30, y: 40 }, 10);
    expect(partial.arrived).toBe(false);
    expect(Math.hypot(partial.x, partial.y)).toBeCloseTo(10, 6);
  });
});

describe("pickZoom", () => {
  const MAP_W = 768;
  const MAP_H = 448;
  it("uses 3× on phones and 4× on desktop", () => {
    expect(pickZoom(390, 844, true, MAP_W, MAP_H)).toBe(3);
    expect(pickZoom(1440, 900, false, MAP_W, MAP_H)).toBe(4);
  });

  it("steps down for small desktop windows", () => {
    expect(pickZoom(800, 500, false, MAP_W, MAP_H)).toBe(3);
    expect(pickZoom(500, 350, false, MAP_W, MAP_H)).toBe(2);
  });

  it("steps up on huge screens so the view never extends past the map", () => {
    const z = pickZoom(3840, 2160, false, MAP_W, MAP_H);
    expect(Number.isInteger(z)).toBe(true);
    expect(3840 / z).toBeLessThanOrEqual(MAP_W);
    expect(2160 / z).toBeLessThanOrEqual(MAP_H);
  });
});
