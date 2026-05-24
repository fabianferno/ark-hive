import { createHash } from "node:crypto";

export function computeCommitHash(prevHash: string | null, payload: string): string {
  const h = createHash("sha256");
  h.update(prevHash ?? "");
  h.update("\n");
  h.update(payload);
  return "0x" + h.digest("hex");
}
