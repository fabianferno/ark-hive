// lib/ens/__tests__/resolve.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveAgentByEns } from "../resolve";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";

vi.mock("@/lib/arkiv-client/repo", () => ({ queryGlobal: vi.fn() }));

// Import the mocked module so we can set return values.
import { queryGlobal } from "@/lib/arkiv-client/repo";

const mockQueryGlobal = vi.mocked(queryGlobal);

// Minimal stub – resolveAgentByEns only touches publicClient (via queryGlobal which
// is fully mocked) so the ctx fields don't matter here.
const ctx = {} as unknown as ClientCtx;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveAgentByEns", () => {
  it("returns agent data for a valid agent ENS name", async () => {
    const agentEnsName = "personal-5242.philo.ark-hive.eth";

    mockQueryGlobal.mockResolvedValueOnce([
      {
        key: "0xabc",
        payload: { name: "Personal" },
        attrs: { agentId: "5242" },
        creator: "0xowner",
        owner: undefined,
      },
    ]);

    const result = await resolveAgentByEns(ctx, agentEnsName);

    expect(result).not.toBeNull();
    expect(result?.agentId).toBe("5242");
    expect(result?.ownerAddress).toBe("0xowner");
    expect(result?.key).toBe("0xabc");
    expect(result?.card).toEqual({ name: "Personal" });

    // Verify queryGlobal was called with the ensName condition.
    expect(mockQueryGlobal).toHaveBeenCalledOnce();
    const [, conditions] = mockQueryGlobal.mock.calls[0];
    expect(conditions).toEqual(
      expect.arrayContaining([
        { key: "ensName", op: "eq", value: agentEnsName },
      ]),
    );
  });

  it("returns null for a user-level ENS name (kind === 'user') without calling queryGlobal", async () => {
    const result = await resolveAgentByEns(ctx, "philo.ark-hive.eth");

    expect(result).toBeNull();
    expect(mockQueryGlobal).not.toHaveBeenCalled();
  });

  it("returns null when queryGlobal returns an empty array", async () => {
    mockQueryGlobal.mockResolvedValueOnce([]);

    const result = await resolveAgentByEns(ctx, "personal-5242.philo.ark-hive.eth");

    expect(result).toBeNull();
  });
});
