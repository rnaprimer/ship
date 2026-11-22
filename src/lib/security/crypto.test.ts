import { describe, expect, it } from "vitest";
import { aesGcmDecryptHex, aesGcmEncryptHex, bytesToHex, hexToBytes } from "./crypto";

const key = new Uint8Array(32).fill(3);

describe("AES-GCM", () => {
  it("round-trips and uses a fresh IV each time", async () => {
    const a = await aesGcmEncryptHex(key, "K7PM4XQ2B9RT6NWA");
    const b = await aesGcmEncryptHex(key, "K7PM4XQ2B9RT6NWA");
    expect(a).not.toBe(b);
    expect(a.toUpperCase()).not.toContain("K7PM");
    expect(await aesGcmDecryptHex(key, a)).toBe("K7PM4XQ2B9RT6NWA");
  });

  it("rejects tampered ciphertext and the wrong key", async () => {
    const ct = await aesGcmEncryptHex(key, "K7PM4XQ2B9RT6NWA");
    const bytes = hexToBytes(ct);
    bytes[20] ^= 1;
    await expect(aesGcmDecryptHex(key, bytesToHex(bytes))).rejects.toThrow();
    await expect(aesGcmDecryptHex(new Uint8Array(32).fill(4), ct)).rejects.toThrow();
  });

  it("requires a 32-byte key", async () => {
    await expect(aesGcmEncryptHex(new Uint8Array(16), "x")).rejects.toThrow();
  });
});
