// lib/crypto/envelope.ts
// Pure browser crypto for ark-hive encrypted summaries.
// Envelope: random DEK (XChaCha20-Poly1305) encrypts the payload; the DEK is
// wrapped per recipient via ECDH(ephemeral, recipientPub) -> HKDF-SHA256.
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { xchacha20poly1305 } from "@noble/ciphers/chacha.js";
import { randomBytes, hexToBytes } from "@noble/hashes/utils.js";

const utf8 = new TextEncoder();
const WRAP_INFO = utf8.encode("ark-hive/x25519-wrap/v1");
const IDENTITY_SALT = utf8.encode("ark-hive");
const IDENTITY_INFO = utf8.encode("ark-hive/x25519-identity/v1");

export function bytesToB64(b: Uint8Array): string {
  let s = "";
  for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]);
  return btoa(s);
}
export function b64ToBytes(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** Deterministically derive a 32-byte X25519 secret from a wallet signature hex. */
export function deriveSecretFromSignature(signatureHex: string): Uint8Array {
  const sig = hexToBytes(signatureHex.replace(/^0x/, ""));
  return hkdf(sha256, sig, IDENTITY_SALT, IDENTITY_INFO, 32);
}
export function x25519PublicKey(secretKey: Uint8Array): Uint8Array {
  return x25519.getPublicKey(secretKey);
}

export interface EncBlob { ciphertext: string; nonce: string; } // base64

/** Encrypt a JSON-able payload with a 32-byte DEK. */
export function encryptPayload(payload: unknown, dek: Uint8Array): EncBlob {
  const nonce = randomBytes(24);
  const pt = utf8.encode(JSON.stringify(payload));
  const ct = xchacha20poly1305(dek, nonce).encrypt(pt);
  return { ciphertext: bytesToB64(ct), nonce: bytesToB64(nonce) };
}
export function decryptPayload(blob: EncBlob, dek: Uint8Array): unknown {
  const pt = xchacha20poly1305(dek, b64ToBytes(blob.nonce)).decrypt(b64ToBytes(blob.ciphertext));
  return JSON.parse(new TextDecoder().decode(pt));
}

export interface WrappedKey { wrappedKey: string; ephemeralPub: string; nonce: string; } // base64

/** Wrap a DEK for a recipient's X25519 public key (base64). */
export function wrapKey(dek: Uint8Array, recipientPubB64: string): WrappedKey {
  const ephSk = x25519.utils.randomSecretKey();
  const ephPub = x25519.getPublicKey(ephSk);
  const shared = x25519.getSharedSecret(ephSk, b64ToBytes(recipientPubB64));
  const wrapKeyBytes = hkdf(sha256, shared, new Uint8Array(0), WRAP_INFO, 32);
  const nonce = randomBytes(24);
  const wrapped = xchacha20poly1305(wrapKeyBytes, nonce).encrypt(dek);
  return { wrappedKey: bytesToB64(wrapped), ephemeralPub: bytesToB64(ephPub), nonce: bytesToB64(nonce) };
}
/** Unwrap a DEK with my X25519 secret key. Throws if not for me / tampered. */
export function unwrapKey(w: WrappedKey, mySecret: Uint8Array): Uint8Array {
  const shared = x25519.getSharedSecret(mySecret, b64ToBytes(w.ephemeralPub));
  const wrapKeyBytes = hkdf(sha256, shared, new Uint8Array(0), WRAP_INFO, 32);
  return xchacha20poly1305(wrapKeyBytes, b64ToBytes(w.nonce)).decrypt(b64ToBytes(w.wrappedKey));
}
