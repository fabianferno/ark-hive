import { describe, it, expect, beforeEach, vi } from "vitest";
import { __clearKeyCache } from "@/lib/crypto/keys";

// Build a fake in-memory Arkiv: createEntity stores by a fake key; queryGlobal
// filters by eq attributes; getEntity returns payload by key.
function makeFakeWorld() {
  const store = new Map<string, { payload: any; attrs: Record<string, any>; owner: string }>();
  let n = 0;
  // Track the last pubkey owner so that entities created immediately after a
  // publishPubKey call (e.g. a direct agentCard write) inherit the correct owner
  // even when the wallet mock is shared between two contexts.
  let lastPubkeyOwner = "";
  const make = (address: string) => {
    const addr = address.toLowerCase();
    const wallet = {
      createEntity: vi.fn(async ({ payload, attributes }: any) => {
        const key = "0xK" + (n++);
        const attrs: Record<string, any> = {};
        for (const a of attributes) attrs[a.key] = a.value;
        // Derive owner: prefer the explicit `owner` attribute (pubkeys carry it),
        // then `callerId` (summaries/grants carry it), then fall back to the
        // most-recently-seen pubkey owner so that a directly-created agentCard
        // that follows publishPubKey(recipCtx) is attributed to the correct address.
        const owner: string = attrs.owner ?? attrs.callerId ?? (lastPubkeyOwner || addr);
        if (attrs.owner) lastPubkeyOwner = attrs.owner;
        store.set(key, { payload: JSON.parse(new TextDecoder().decode(payload)), attrs, owner });
        return { entityKey: key, txHash: "0xtx" };
      }),
      deleteEntity: vi.fn(async ({ entityKey }: any) => { store.delete(entityKey); }),
      extendEntity: vi.fn(async () => ({ txHash: "0xtx" })),
    };
    const publicClient = {
      getEntity: vi.fn(async (key: string) => {
        const e = store.get(key)!;
        return { key, owner: e.owner, creator: e.owner, attributes: Object.entries(e.attrs).map(([k, v]) => ({ key: k, value: v })), toJson: () => e.payload, toText: () => JSON.stringify(e.payload) };
      }),
      buildQuery: () => {
        const conds: { key: string; value: any }[] = [];
        const api: any = {
          where: (c: any) => { conds.push({ key: c.key ?? c[0], value: c.value ?? c[1] }); return api; },
          withPayload: () => api, withAttributes: () => api, withMetadata: () => api, limit: () => api,
          createdBy: () => api,
          fetch: async () => {
            const entities = [...store.entries()].filter(([, e]) =>
              conds.every((c) => String(e.attrs[c.key]) === String(c.value)))
              .map(([key, e]) => ({ key, owner: e.owner, creator: e.owner, attributes: Object.entries(e.attrs).map(([k, v]) => ({ key: k, value: v })), toJson: () => e.payload, toText: () => JSON.stringify(e.payload) }));
            return { entities };
          },
        };
        return api;
      },
    };
    return { wallet, publicClient, address: address as `0x${string}`, signMessage: async () => "0x" + addr.slice(2).padEnd(130, "0") };
  };
  return { make };
}

import { PROJECT_ATTRIBUTE } from "../project";

const OWNER = "0xAa00000000000000000000000000000000000001";
const RECIP = "0xBb00000000000000000000000000000000000002";

beforeEach(() => { __clearKeyCache(); localStorage.clear(); });

describe("access layer end-to-end (fake world)", () => {
  it("encrypts a summary, grants to a recipient, recipient reads, owner revokes", async () => {
    const { make } = makeFakeWorld();
    const ownerCtx = make(OWNER) as any;
    const recipCtx = make(RECIP) as any;
    // Share one store between the two ctxs by pointing recip at owner's clients,
    // but keep recip's OWN address/signMessage so its derived key differs:
    recipCtx.publicClient = ownerCtx.publicClient;
    recipCtx.wallet = ownerCtx.wallet;

    const access = await import("../access");

    // recipient publishes pubkey + owns an agent card (created by recip => owner=recip)
    await access.publishPubKey(recipCtx);
    await recipCtx.wallet.createEntity({ payload: new TextEncoder().encode("{}"), attributes: [
      { key: PROJECT_ATTRIBUTE.key, value: PROJECT_ATTRIBUTE.value },
      { key: "entityType", value: "agentCard" }, { key: "agentId", value: "AGENT_B" },
    ] });

    // owner publishes own pubkey, encrypts + shares with AGENT_B
    await access.publishPubKey(ownerCtx);
    const { summaryKey } = await access.encryptAndShareSummary(ownerCtx, {
      agentId: "AGENT_A", sessionKey: "0xS", summarySeq: 1,
      plain: { summary: "secret note", topics: ["finance"] },
      granteeAgentId: "AGENT_B", expiresInSec: 3600,
    });

    // recipient lists grants for them and decrypts
    const grants = await access.listGrantsForMe(recipCtx);
    const incoming = grants.filter((g) => g.granterAgentId === "AGENT_A");
    expect(incoming.length).toBe(1);
    const text = await access.readSharedSummary(recipCtx, incoming[0]);
    expect(text).toBe("secret note");

    // owner revokes -> recipient sees none
    const outgoing = await access.listOutgoingGrants(ownerCtx);
    const toRecip = outgoing.find((g) => g.granteeAddress === RECIP.toLowerCase());
    expect(toRecip).toBeTruthy();
    await access.revokeGrant(ownerCtx, toRecip!.grantKey);
    const after = (await access.listGrantsForMe(recipCtx)).filter((g) => g.granterAgentId === "AGENT_A");
    expect(after.length).toBe(0);
    expect(summaryKey).toMatch(/^0xK/);
  });
});
