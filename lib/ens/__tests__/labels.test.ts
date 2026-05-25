import { describe, it, expect } from "vitest";
import {
  sanitizeLabel,
  safeLabel,
  agentLabel,
  userEns,
  agentEns,
  parseEns,
  fallbackUserLabel,
} from "../labels";

describe("fallbackUserLabel", () => {
  it("derives a DNS-safe label from an address", () => {
    expect(fallbackUserLabel("0xAbCdEf1234567890")).toBe("user-abcdef");
  });
  it("composes into a 4-level agent ENS", () => {
    expect(agentEns("My Bot", fallbackUserLabel("0xAbCdEf1234567890"), "42")).toBe("my-bot-42.user-abcdef.ark-hive.eth");
  });
});

describe("sanitizeLabel", () => {
  it('converts "My Agent!" to "my-agent"', () => {
    expect(sanitizeLabel("My Agent!")).toBe("my-agent");
  });

  it('strips diacritics: "  Héllo  " → "hello"', () => {
    expect(sanitizeLabel("  Héllo  ")).toBe("hello");
  });

  it('collapses multiple separators: "a__b  c" → "a-b-c"', () => {
    expect(sanitizeLabel("a__b  c")).toBe("a-b-c");
  });

  it('trims edge hyphens: "---x---" → "x"', () => {
    expect(sanitizeLabel("---x---")).toBe("x");
  });

  it("returns empty string for empty input", () => {
    expect(sanitizeLabel("")).toBe("");
  });

  it('lowercases: "UPPER" → "upper"', () => {
    expect(sanitizeLabel("UPPER")).toBe("upper");
  });

  it("strips emoji and symbols", () => {
    expect(sanitizeLabel("🚀rocket🔥")).toBe("rocket");
  });

  it("caps output at 63 chars with no trailing hyphen", () => {
    const input = "a".repeat(70);
    const result = sanitizeLabel(input);
    expect(result.length).toBeLessThanOrEqual(63);
    expect(result.endsWith("-")).toBe(false);
  });

  it("caps at 63 chars and does not leave trailing hyphen when boundary falls on separator", () => {
    // Build a 70-char string where char 64 would be a hyphen after slicing to 63
    const input = "a".repeat(62) + "---" + "b".repeat(5);
    const result = sanitizeLabel(input);
    expect(result.length).toBeLessThanOrEqual(63);
    expect(result.endsWith("-")).toBe(false);
  });
});

describe("safeLabel", () => {
  it("returns sanitized value when non-empty", () => {
    expect(safeLabel("Hello World", "fallback")).toBe("hello-world");
  });

  it("returns fallback for input that sanitizes to empty", () => {
    expect(safeLabel("!!!", "fallback")).toBe("fallback");
  });
});

describe("agentLabel", () => {
  it('builds label: agentLabel("Personal Bot", 5242) → "personal-bot-5242"', () => {
    expect(agentLabel("Personal Bot", 5242)).toBe("personal-bot-5242");
  });

  it("accepts string agentId", () => {
    expect(agentLabel("Bot", "99")).toBe("bot-99");
  });
});

describe("userEns", () => {
  it('ends with ".ark-hive.eth"', () => {
    expect(userEns("philo")).toMatch(/\.ark-hive\.eth$/);
  });

  it('builds "philo.ark-hive.eth"', () => {
    expect(userEns("philo")).toBe("philo.ark-hive.eth");
  });
});

describe("agentEns", () => {
  it('builds "personal-5242.philo.ark-hive.eth"', () => {
    expect(agentEns("Personal", "philo", 5242)).toBe("personal-5242.philo.ark-hive.eth");
  });
});

describe("parseEns", () => {
  it('parses user ENS "philo.ark-hive.eth"', () => {
    const result = parseEns("philo.ark-hive.eth");
    expect(result.kind).toBe("user");
    expect(result.userLabel).toBe("philo");
    expect(result.rootMatches).toBe(true);
  });

  it('parses agent ENS "personal-5242.philo.ark-hive.eth"', () => {
    const result = parseEns("personal-5242.philo.ark-hive.eth");
    expect(result.kind).toBe("agent");
    expect(result.agentLabel).toBe("personal-5242");
    expect(result.userLabel).toBe("philo");
    expect(result.rootMatches).toBe(true);
  });

  it('parses root domain "ark-hive.eth" as kind "other"', () => {
    const result = parseEns("ark-hive.eth");
    expect(result.kind).toBe("other");
    expect(result.rootMatches).toBe(true);
  });

  it('parses unrelated domain "foo.bar.com" as rootMatches false, kind "other"', () => {
    const result = parseEns("foo.bar.com");
    expect(result.rootMatches).toBe(false);
    expect(result.kind).toBe("other");
  });
});
