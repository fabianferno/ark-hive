import { describe, it, expect } from "vitest";
import { cosine, topK } from "../vector";

describe("cosine", () => {
  it("is 1 for identical vectors", () => { expect(cosine([1, 0], [1, 0])).toBeCloseTo(1); });
  it("is 0 for orthogonal vectors", () => { expect(cosine([1, 0], [0, 1])).toBeCloseTo(0); });
  it("handles zero vectors without NaN", () => { expect(cosine([0, 0], [1, 1])).toBe(0); });
});

describe("topK", () => {
  it("returns the k items closest to the query, in order", () => {
    const items = [
      { vec: [0, 1], item: "ortho" },
      { vec: [1, 0], item: "exact" },
      { vec: [0.9, 0.1], item: "near" },
    ];
    expect(topK([1, 0], items, 2)).toEqual(["exact", "near"]);
  });
});
