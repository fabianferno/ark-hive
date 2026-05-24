import "@testing-library/jest-dom/vitest";

class RO { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver;
if (!globalThis.DOMMatrixReadOnly) {
  // @ts-expect-error minimal stub for React Flow
  globalThis.DOMMatrixReadOnly = class { m22 = 1; constructor() {} };
}
