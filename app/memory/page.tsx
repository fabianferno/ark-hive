"use client";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { MemorySearch } from "@/components/memory/MemorySearch";
import { useAgentsList, useSearch } from "@/lib/hooks/useAgents";
import type { UiHit } from "@/lib/agentClient";

export default function MemoryPage() {
  const agents = useAgentsList();
  const search = useSearch();
  const [hits, setHits] = useState<UiHit[]>([]);
  const agentId = agents.data?.[0]?.agentId ?? "";
  return (
    <AppShell>
      <MemorySearch hits={hits} searching={search.isPending}
        onSearch={(term) => agentId && search.mutate({ agentId, term }, { onSuccess: setHits })} />
    </AppShell>
  );
}
