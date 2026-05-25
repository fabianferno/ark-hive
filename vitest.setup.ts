import "@testing-library/jest-dom/vitest";

class RO { observe() {} unobserve() {} disconnect() {} }
globalThis.ResizeObserver = RO as unknown as typeof ResizeObserver;
if (!globalThis.DOMMatrixReadOnly) {
  // @ts-expect-error minimal stub for React Flow
  globalThis.DOMMatrixReadOnly = class { m22 = 1; constructor() {} };
}

// Node.js 25 adds a native `localStorage` global that lacks `clear()` unless
// `--localstorage-file` is set. Override with a real in-memory Storage so
// tests that call localStorage.clear() / setItem / getItem work correctly.
if (typeof globalThis.localStorage?.clear !== "function") {
  const store: Record<string, string> = {};
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => { store[k] = String(v); },
      removeItem: (k: string) => { delete store[k]; },
      clear: () => { for (const k in store) delete store[k]; },
      get length() { return Object.keys(store).length; },
      key: (i: number) => Object.keys(store)[i] ?? null,
    },
  });
}
