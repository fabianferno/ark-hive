// lib/__tests__/motion.test.ts
import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { nodeEnter, MOTION, usePrefersReducedMotion } from "@/lib/motion";

describe("motion tokens", () => {
  it("exposes a shared rhythm", () => {
    expect(MOTION.dur.base).toBe(0.22);
    expect(MOTION.spring.stiffness).toBe(260);
  });
  it("nodeEnter animates scale+opacity normally", () => {
    const v = nodeEnter(false);
    expect(v.initial).toEqual({ scale: 0.9, opacity: 0 });
    expect(v.animate).toEqual({ scale: 1, opacity: 1 });
  });
  it("nodeEnter is instant under reduced motion", () => {
    const v = nodeEnter(true);
    expect(v.transition).toEqual({ duration: 0 });
    expect(v.initial).toEqual({ scale: 1, opacity: 1 });
  });

  it("usePrefersReducedMotion defaults false and reflects matchMedia", () => {
    const orig = window.matchMedia;
    // missing matchMedia → false
    // @ts-expect-error simulate absence
    delete window.matchMedia;
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(false);
    // matchMedia matching → true after effect runs
    window.matchMedia = ((q: string) => ({
      matches: true, media: q, onchange: null,
      addEventListener() {}, removeEventListener() {},
      addListener() {}, removeListener() {}, dispatchEvent() { return false; },
    })) as unknown as typeof window.matchMedia;
    expect(renderHook(() => usePrefersReducedMotion()).result.current).toBe(true);
    window.matchMedia = orig;
  });
});
