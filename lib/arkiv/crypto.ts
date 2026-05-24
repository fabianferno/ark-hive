// lib/arkiv/crypto.ts
import type { Cipher } from "./types";

const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (b: ArrayBuffer) =>
  btoa(Array.from(new Uint8Array(b), (c) => String.fromCharCode(c)).join(""));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export function generateAesKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
}

export function createAesCipher(key: CryptoKey): Cipher {
  return {
    available: true,
    async encrypt(plaintext: string): Promise<string> {
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(plaintext));
      return `${b64(iv.buffer)}.${b64(ct)}`;
    },
    async decrypt(ciphertext: string): Promise<string> {
      const [ivB64, ctB64] = ciphertext.split(".");
      if (!ivB64 || ctB64 === undefined) throw new Error("malformed ciphertext");
      const pt = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: unb64(ivB64) }, key, unb64(ctB64),
      );
      return dec.decode(pt);
    },
  };
}

// Used when no key is available (renders a locked node, never throws on read).
export const lockedCipher: Cipher = {
  available: false,
  async encrypt() { throw new Error("no key"); },
  async decrypt() { return "🔒"; },
};
