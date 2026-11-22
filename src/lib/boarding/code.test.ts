import { describe, expect, it } from "vitest";
import { CODE_ALPHABET, formatCode, generateCode, hashCode, normalizeCode } from "./code";

const pepper = new Uint8Array(32).fill(7);

describe("generateCode", () => {
  it("makes 16 symbols from the Crockford alphabet (no I, L, O, U)", () => {
    for (let i = 0; i < 500; i++) {
      const c = generateCode();
      expect(c).toMatch(/^[0-9A-HJKMNP-TV-Z]{16}$/);
      expect(c).not.toMatch(/[ILOU]/);
    }
    expect(CODE_ALPHABET).toHaveLength(32); // 16 × 5 bits = 80 bits
  });

  it("does not repeat and uses every symbol", () => {
    const seen = new Set<string>();
    const symbols = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const c = generateCode();
      seen.add(c);
      for (const ch of c) symbols.add(ch);
    }
    expect(seen.size).toBe(2000);
    expect(symbols.size).toBe(32);
  });
});

describe("normalizeCode", () => {
  it("accepts lowercase, spaces and hyphens", () => {
    expect(normalizeCode("k7pm-4xq2-b9rt-6nwa")).toBe("K7PM4XQ2B9RT6NWA");
    expect(normalizeCode("  K7PM 4XQ2  B9RT 6NWA ")).toBe("K7PM4XQ2B9RT6NWA");
  });

  it("maps look-alikes O→0 and I/L→1", () => {
    expect(normalizeCode("OOOO-IIII-LLLL-AAAA")).toBe("000011111111AAAA");
  });

  it("rejects wrong lengths, foreign symbols, U, and oversized input", () => {
    expect(normalizeCode("K7PM-4XQ2-B9RT")).toBeNull();
    expect(normalizeCode("K7PM-4XQ2-B9RT-6NWAX")).toBeNull();
    expect(normalizeCode("K7PM-4XQ2-B9RT-6NWU")).toBeNull();
    expect(normalizeCode("K7PM_4XQ2_B9RT_6NWA")).toBeNull();
    expect(normalizeCode("K7PM-4XQ2-B9RT-6NW!")).toBeNull();
    expect(normalizeCode("-".repeat(100))).toBeNull();
    expect(normalizeCode("")).toBeNull();
  });
});

describe("hashCode", () => {
  it("is deterministic, pepper-dependent, and not the code itself", async () => {
    const a = await hashCode("K7PM4XQ2B9RT6NWA", pepper);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(await hashCode("K7PM4XQ2B9RT6NWA", pepper)).toBe(a);
    expect(await hashCode("K7PM4XQ2B9RT6NWA", new Uint8Array(32).fill(8))).not.toBe(a);
    expect(await hashCode("K7PM4XQ2B9RT6NWB", pepper)).not.toBe(a);
    expect(a.toUpperCase()).not.toContain("K7PM4XQ2B9RT6NWA");
  });

  it("gives every spelling of one code the same hash", async () => {
    const h = (s: string) => hashCode(normalizeCode(s)!, pepper);
    expect(await h("k7pm 4xq2 b9rt 6nwa")).toBe(await h("K7PM-4XQ2-B9RT-6NWA"));
  });
});

describe("formatCode", () => {
  it("groups in fours", () => {
    expect(formatCode("K7PM4XQ2B9RT6NWA")).toBe("K7PM-4XQ2-B9RT-6NWA");
  });
});
