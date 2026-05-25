import { describe, it, expect } from "vitest";
import {
  bytesToB64, b64ToBytes, deriveSecretFromSignature,
  encryptPayload, decryptPayload, wrapKey, unwrapKey, x25519PublicKey,
} from "../envelope";

describe("base64", () => {
  it("round-trips arbitrary bytes", () => {
    const b = new Uint8Array([0, 1, 2, 250, 255, 128]);
    expect(Array.from(b64ToBytes(bytesToB64(b)))).toEqual(Array.from(b));
  });
});

describe("deriveSecretFromSignature", () => {
  it("is deterministic for the same signature", () => {
    const sig = "0x" + "ab".repeat(65);
    const a = deriveSecretFromSignature(sig);
    const b = deriveSecretFromSignature(sig);
    expect(a.length).toBe(32);
    expect(Array.from(a)).toEqual(Array.from(b));
  });
  it("differs for different signatures", () => {
    const a = deriveSecretFromSignature("0x" + "ab".repeat(65));
    const b = deriveSecretFromSignature("0x" + "cd".repeat(65));
    expect(Array.from(a)).not.toEqual(Array.from(b));
  });
});

describe("envelope encryption", () => {
  it("encrypts and decrypts a JSON payload", () => {
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const enc = encryptPayload({ summary: "hello", topics: ["x"] }, dek);
    const out = decryptPayload({ ciphertext: enc.ciphertext, nonce: enc.nonce }, dek);
    expect(out).toEqual({ summary: "hello", topics: ["x"] });
  });

  it("wraps and unwraps a DEK between two parties", () => {
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const recipientSk = deriveSecretFromSignature("0x" + "11".repeat(65));
    const recipientPub = x25519PublicKey(recipientSk);
    const wrapped = wrapKey(dek, bytesToB64(recipientPub));
    const unwrapped = unwrapKey(wrapped, recipientSk);
    expect(Array.from(unwrapped)).toEqual(Array.from(dek));
  });

  it("fails to unwrap with the wrong key", () => {
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const recipientPub = x25519PublicKey(deriveSecretFromSignature("0x" + "11".repeat(65)));
    const wrong = deriveSecretFromSignature("0x" + "22".repeat(65));
    const wrapped = wrapKey(dek, bytesToB64(recipientPub));
    expect(() => unwrapKey(wrapped, wrong)).toThrow();
  });

  it("detects tampered ciphertext (AEAD)", () => {
    const dek = crypto.getRandomValues(new Uint8Array(32));
    const enc = encryptPayload({ a: 1 }, dek);
    const bytes = b64ToBytes(enc.ciphertext); bytes[0] ^= 0xff;
    expect(() => decryptPayload({ ciphertext: bytesToB64(bytes), nonce: enc.nonce }, dek)).toThrow();
  });
});
