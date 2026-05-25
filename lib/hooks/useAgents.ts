// lib/hooks/useAgents.ts
// React-Query hooks wired to the CLIENT flows in lib/agent/* — every Arkiv read is
// scoped to, and every write signed by, the user's Privy embedded wallet. The old
// server-wallet HTTP client (lib/agentClient AgentClient) is retired; these hooks
// keep the SAME names + return shapes so the components are unchanged.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUserWallet } from "@/lib/wallet/useUserWallet";
import type { ClientCtx } from "@/lib/arkiv-client/ctx";
import type { CreateAgentWallets } from "@/lib/agent/createAgent";
import { listAgents, listAllAgents, getAgent } from "@/lib/agent/agents";
import { createAgent } from "@/lib/agent/createAgent";
import { adoptAgent } from "@/lib/agent/marketplace";
import type { MarketplaceAgent } from "@/lib/agent/registry";
import { listSessions, createSession, listMessages, closeSession } from "@/lib/agent/sessions";
import { chatTurn, type OnPaymentRequired } from "@/lib/agent/chat";
import { listSummaries, topicFetch, searchMemory } from "@/lib/agent/knowledge";
import type { CreateAgentInput } from "@/lib/agentClient";
import { useMyEns } from "@/lib/hooks/useEns";

/**
 * Build the per-user ClientCtx (Arkiv wallet + public client + address) from the
 * Privy wallet, plus the Sepolia/chain-switching wallets needed for the 8004 mint.
 * Returns `ctx: null` until the wallet is ready so query `enabled` can gate on it.
 */
export function useCtx(): {
  ctx: ClientCtx | null;
  mintWallets: CreateAgentWallets;
} {
  const w = useUserWallet();
  const ctx: ClientCtx | null =
    w.arkivWallet && w.address
      ? { wallet: w.arkivWallet, publicClient: w.publicArkiv, address: w.address, signMessage: w.signMessage, signTypedData: w.signTypedData }
      : null;
  const mintWallets: CreateAgentWallets = {
    sendTransaction: w.sendTransaction,
    publicSepolia: w.publicSepolia,
    switchChain: w.switchChain,
    BRAGA_ID: w.BRAGA_ID,
    SEPOLIA_ID: w.SEPOLIA_ID,
  };
  return { ctx, mintWallets };
}

export function useAgentsList() {
  const { ctx } = useCtx();
  return useQuery({ queryKey: ["agents"], enabled: !!ctx, queryFn: () => listAgents(ctx!) });
}

/** All agents across every user — for cross-user share discovery. */
export function useAllAgentsList() {
  const { ctx } = useCtx();
  return useQuery({ queryKey: ["allAgents"], enabled: !!ctx, queryFn: () => listAllAgents(ctx!), staleTime: 30_000 });
}

export function useAgent(agentId: string) {
  const { ctx } = useCtx();
  return useQuery({ queryKey: ["agent", agentId], enabled: !!ctx && !!agentId, queryFn: () => getAgent(ctx!, agentId) });
}

export function useCreateAgent() {
  const { ctx, mintWallets } = useCtx();
  const qc = useQueryClient();
  const myEns = useMyEns();
  const userLabel = myEns.data?.label;
  return useMutation({
    mutationFn: (input: CreateAgentInput) => {
      if (!ctx) throw new Error("Wallet not ready");
      return createAgent(ctx, mintWallets, { ...input, userLabel });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agents"] }),
  });
}

/** Adopt a marketplace (external 8004) agent into the user's namespace. */
export function useAdoptAgent() {
  const { ctx } = useCtx();
  const qc = useQueryClient();
  const myEns = useMyEns();
  return useMutation({
    mutationFn: (mkt: MarketplaceAgent) => {
      if (!ctx) throw new Error("Wallet not ready");
      return adoptAgent(ctx, mkt, myEns.data?.label ?? "");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agents"] });
      qc.invalidateQueries({ queryKey: ["allAgents"] });
    },
  });
}

export function useSessions(agentId: string) {
  const { ctx } = useCtx();
  return useQuery({ queryKey: ["sessions", agentId], enabled: !!ctx && !!agentId, queryFn: () => listSessions(ctx!, agentId) });
}

export function useStartSession(agentId: string) {
  const { ctx } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => createSession(ctx!, agentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions", agentId] }),
  });
}

export function useMessages(sessionKey: string) {
  const { ctx } = useCtx();
  return useQuery({ queryKey: ["messages", sessionKey], enabled: !!ctx && !!sessionKey, queryFn: () => listMessages(ctx!, sessionKey) });
}

export function useSendMessage(sessionKey: string) {
  const { ctx } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: { text: string; onPaymentRequired?: OnPaymentRequired }) =>
      chatTurn(ctx!, { sessionKey, text: vars.text, onPaymentRequired: vars.onPaymentRequired }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["messages", sessionKey] }),
  });
}

export function useSearch() {
  const { ctx } = useCtx();
  // `scope` is accepted for call-shape compatibility with the old client; the
  // client flow filters by term over the user-scoped memory entities.
  return useMutation({
    mutationFn: ({ agentId, term }: { agentId: string; term: string; scope?: string }) => searchMemory(ctx!, agentId, term),
  });
}

export function useCloseSession(agentId: string) {
  const { ctx } = useCtx();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sessionKey: string) => closeSession(ctx!, sessionKey),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sessions", agentId] });
      qc.invalidateQueries({ queryKey: ["summaries", agentId] });
    },
  });
}

export function useSummaries(agentId: string, callerId = "0xOperator") {
  // callerId is kept in the signature (callers pass it) but the client flow always
  // scopes summaries to the user's own address (ctx.address) — it is ignored here.
  const { ctx } = useCtx();
  return useQuery({ queryKey: ["summaries", agentId, callerId], enabled: !!ctx && !!agentId, queryFn: () => listSummaries(ctx!, agentId) });
}

export function useTopicFetch() {
  const { ctx } = useCtx();
  // callerId is accepted for call-shape compatibility; the client flow scopes to
  // the user's own address (ctx.address).
  return useMutation({
    mutationFn: ({ agentId, topic }: { agentId: string; callerId: string; topic: string }) => topicFetch(ctx!, agentId, topic),
  });
}
