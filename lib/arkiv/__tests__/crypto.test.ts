// lib/arkiv/__tests__/crypto.test.ts
import { describe, it, expect } from "vitest";
import { createAesCipher, generateAesKey } from "@/lib/arkiv/crypto";

describe("crypto", () => {
  it("round-trips AES-GCM", async () => {
    const key = await generateAesKey();
    const cipher = createAesCipher(key);
    const ct = await cipher.encrypt("hello arkiv");
    expect(ct).not.toContain("hello");
    expect(await cipher.decrypt(ct)).toBe("hello arkiv");
  });
  it("produces distinct ciphertext per call (random IV)", async () => {
    const cipher = createAesCipher(await generateAesKey());
    expect(await cipher.encrypt("x")).not.toBe(await cipher.encrypt("x"));
  });
  it("throws a clear error on malformed ciphertext", async () => {
    const cipher = createAesCipher(await generateAesKey());
    await expect(cipher.decrypt("no-separator")).rejects.toThrow(/malformed/i);
  });
});
