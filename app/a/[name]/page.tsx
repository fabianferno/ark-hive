// app/a/[name]/page.tsx
// Public share/resolve page for agent ENS names.
// Example: /a/personal-bot-5242.alice.ark-hive.eth
//
// NOTE: Agent resolution requires the Arkiv RPC to be reachable. If the Arkiv
// node is down the query will hang or error — a descriptive error state is shown.
"use client";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AppShell } from "@/components/app/AppShell";
import { GlowCard } from "@/components/ui/GlowCard";
import { EnsBadge } from "@/components/ens/EnsBadge";
import { useCtx } from "@/lib/hooks/useAgents";
import { resolveAgentByEns } from "@/lib/ens/resolve";
import { resolveUserEns } from "@/lib/ens/client";
import { userEns } from "@/lib/ens/labels";

export default function AgentSharePage() {
  const params = useParams();
  const name = typeof params.name === "string" ? params.name : Array.isArray(params.name) ? params.name[0] : "";
  const { ctx } = useCtx();
  const router = useRouter();

  const agentQuery = useQuery({
    queryKey: ["resolveAgent", name],
    enabled: !!ctx && !!name,
    queryFn: () => resolveAgentByEns(ctx!, name),
  });

  const ensInfoQuery = useQuery({
    queryKey: ["resolveUserEns", name],
    enabled: !!name,
    queryFn: () => resolveUserEns(name),
  });

  const isLoading = agentQuery.isLoading || !ctx;
  const agent = agentQuery.data;
  const ensInfo = ensInfoQuery.data;

  return (
    <AppShell>
      <div className="flex min-h-full flex-col items-center justify-center p-6">
        <div className="w-full max-w-md">
          {isLoading ? (
            <p className="font-mono text-sm text-fg-muted">
              Resolving {name}…
            </p>
          ) : agentQuery.isError ? (
            <GlowCard variant="danger" className="p-6">
              <p className="font-display text-base font-semibold text-fg">Resolution error</p>
              <p className="mt-1 font-mono text-xs text-fg-muted">
                {(agentQuery.error as Error).message}
              </p>
              <p className="mt-2 font-sans text-xs text-fg-faint">
                Agent resolution requires the Arkiv RPC. It may be temporarily unavailable.
              </p>
            </GlowCard>
          ) : agent ? (
            <GlowCard variant="accent" className="p-6">
              <h1 className="font-display text-xl font-bold text-fg">Agent</h1>
              <div className="mt-3 space-y-2">
                <div>
                  <p className="font-sans text-xs text-fg-muted">ENS name</p>
                  <div className="mt-1">
                    <EnsBadge name={name} />
                  </div>
                </div>
                <div>
                  <p className="font-sans text-xs text-fg-muted">Agent ID</p>
                  <p className="font-mono text-sm text-fg">{agent.agentId}</p>
                </div>
                {(ensInfo?.userLabel || agent.ownerAddress || ensInfo?.ownerAddress) && (
                  <div>
                    <p className="font-sans text-xs text-fg-muted">Owner</p>
                    {ensInfo?.userLabel ? (
                      <div className="mt-1">
                        <EnsBadge name={userEns(ensInfo.userLabel)} />
                      </div>
                    ) : (
                      <p className="font-mono text-xs text-fg-faint break-all">
                        {agent.ownerAddress ?? ensInfo?.ownerAddress}
                      </p>
                    )}
                  </div>
                )}
              </div>
              <div className="mt-5">
                <Link
                  href={`/agents/${agent.agentId}`}
                  className="btn-primary inline-flex"
                >
                  Open agent
                </Link>
              </div>
            </GlowCard>
          ) : (
            <GlowCard variant="neutral" className="p-6 text-center">
              <p className="font-display text-base font-semibold text-fg">Not found</p>
              <p className="mt-1 font-sans text-sm text-fg-muted">
                No agent resolves to{" "}
                <span className="font-mono text-accent">{name}</span>.
              </p>
              <p className="mt-3 font-sans text-xs text-fg-faint">
                The name may not be registered, or the Arkiv RPC may be temporarily unavailable.
              </p>
            </GlowCard>
          )}
        </div>
      </div>
    </AppShell>
  );
}
