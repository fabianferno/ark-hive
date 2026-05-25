import { describe, it, expect } from "vitest";
import { __toSummaryRowForTest } from "../rag";

describe("toSummaryRow with encrypted payloads", () => {
  it("yields an empty/embeddingless row for enc=v1 summaries (skipped by retrieval)", () => {
    const row = __toSummaryRowForTest({
      key: "0xK", attrs: { sessionKey: "0xS", enc: "v1" },
      payload: { enc: "v1", ciphertext: "AAAA", nonce: "BBBB" },
    });
    expect(row.summary).toBe("");
    expect(row.embedding.length).toBe(0);
    expect(row.encrypted).toBe(true);
  });
});
