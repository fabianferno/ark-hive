// lib/arkiv-client/hashchain.ts
// Browser Web Crypto SHA-256 commit-hash chain (async), mirrors agent/src/hashchain.ts.
export async function computeCommitHash(prevHash: string | null, payload: string): Promise<string> {
  const data = new TextEncoder().encode((prevHash ?? "") + "\n" + payload);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return "0x" + Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
