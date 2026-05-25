"use client";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { KnowledgePanel } from "@/components/knowledge/KnowledgePanel";
import { useAgentsList, useSummaries, useTopicFetch } from "@/lib/hooks/useAgents";

const CALLER = "0xOperator";

export default function KnowledgePage() {
  const agents = useAgentsList();
  const [agentId, setAgentId] = useState("");
  useEffect(() => {
    if (!agentId && agents.data?.[0]) setAgentId(agents.data[0].agentId);
  }, [agents.data, agentId]);

  const summaries = useSummaries(agentId, CALLER);
  const topicFetch = useTopicFetch();
  const [topicResults, setTopicResults] = useState<string[] | null>(null);

  return (
    <AppShell>
      <div className="border-b border-border px-6 py-3">
        <label className="mr-2 font-sans text-xs text-fg-muted">Agent</label>
        <select value={agentId} onChange={(e) => { setAgentId(e.target.value); setTopicResults(null); }}
          className="rounded-lg border border-border bg-white/[0.03] px-2 py-1.5 font-mono text-xs text-fg outline-none focus:border-accent/50">
          {(agents.data ?? []).map((a) => (
            <option key={a.key} value={a.agentId}>{a.name || "Unnamed"} · {a.agentId}</option>
          ))}
        </select>
      </div>
      <KnowledgePanel
        summaries={summaries.data ?? []}
        loading={summaries.isLoading && !!agentId}
        topicResults={topicResults}
        searching={topicFetch.isPending}
        onTopicSearch={(topic) => agentId && topicFetch.mutate({ agentId, callerId: CALLER, topic }, { onSuccess: setTopicResults })}
      />
    </AppShell>
  );
}
