import { describe, it, expect, beforeEach, vi } from "vitest";
import { deriveKeyPair, __clearKeyCache } from "../keys";

const ADDR = "0xAbC0000000000000000000000000000000000001" as `0x${string}`;
const SIG = "0x" + "ab".repeat(65);

function makeCtx(sign: () => Promise<string>) {
  return { wallet: {}, publicClient: {}, address: ADDR, signMessage: sign } as any;
}

beforeEach(() => { __clearKeyCache(); localStorage.clear(); });

describe("deriveKeyPair", () => {
  it("derives a 32-byte keypair and signs only once (cached)", async () => {
    const sign = vi.fn(async () => SIG);
    const a = await deriveKeyPair(makeCtx(sign));
    const b = await deriveKeyPair(makeCtx(sign));
    expect(a.secretKey.length).toBe(32);
    expect(a.publicKey.length).toBe(32);
    expect(a.publicKeyB64).toBe(b.publicKeyB64);
    expect(sign).toHaveBeenCalledTimes(1); // second call served from in-memory cache
  });

  it("reuses the persisted secret without re-signing after cache clear", async () => {
    const sign = vi.fn(async () => SIG);
    const first = await deriveKeyPair(makeCtx(sign));
    __clearKeyCache(); // simulate new page load; localStorage persists
    const second = await deriveKeyPair(makeCtx(vi.fn(async () => { throw new Error("should not sign"); })));
    expect(second.publicKeyB64).toBe(first.publicKeyB64);
  });
});
