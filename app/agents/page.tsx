"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { AgentList } from "@/components/agents/AgentList";
import { NewAgentDialog } from "@/components/agents/NewAgentDialog";
import { useAgentsList, useCreateAgent } from "@/lib/hooks/useAgents";

export default function AgentsPage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const list = useAgentsList();
  const create = useCreateAgent();
  return (
    <AppShell>
      <AgentList agents={list.data ?? []} loading={list.isLoading}
        onOpen={(id) => router.push(`/agents/${id}`)} onNew={() => setOpen(true)} />
      <NewAgentDialog open={open} creating={create.isPending} onClose={() => setOpen(false)}
        onCreate={(input) => create.mutate(input, { onSuccess: () => setOpen(false) })} />
    </AppShell>
  );
}
