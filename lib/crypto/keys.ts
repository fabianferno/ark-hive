// lib/crypto/keys.ts
// Per-wallet X25519 identity key. Seeded once from a Privy wallet signature,
// then persisted to localStorage so it is stable across reloads regardless of
// signature determinism. The raw Privy private key is never exposed.
import { deriveSecretFromSignature, x25519PublicKey, bytesToB64, b64ToBytes } from "./envelope";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";

export const KEY_MESSAGE = "ark-hive encryption key v1";

export interface KeyPair { secretKey: Uint8Array; publicKey: Uint8Array; publicKeyB64: string; }

const cache = new Map<string, KeyPair>();
const lsKey = (addr: string) => `arkhive:x25519sk:${addr.toLowerCase()}`;

/** Test-only: drop the in-memory cache (localStorage is untouched). */
export function __clearKeyCache() { cache.clear(); }

function fromSecret(sk: Uint8Array): KeyPair {
  const publicKey = x25519PublicKey(sk);
  return { secretKey: sk, publicKey, publicKeyB64: bytesToB64(publicKey) };
}

export async function deriveKeyPair(ctx: ClientCtx): Promise<KeyPair> {
  const addr = ctx.address.toLowerCase();
  const hit = cache.get(addr);
  if (hit) return hit;

  const stored = typeof localStorage !== "undefined" ? localStorage.getItem(lsKey(addr)) : null;
  if (stored) {
    const kp = fromSecret(b64ToBytes(stored));
    cache.set(addr, kp);
    return kp;
  }

  if (!ctx.signMessage) throw new Error("ctx.signMessage is required to derive an encryption key");
  const sig = await ctx.signMessage(KEY_MESSAGE);
  const kp = fromSecret(deriveSecretFromSignature(sig));
  try { localStorage.setItem(lsKey(addr), bytesToB64(kp.secretKey)); } catch { /* ignore */ }
  cache.set(addr, kp);
  return kp;
}
