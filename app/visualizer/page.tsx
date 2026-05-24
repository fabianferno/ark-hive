// app/visualizer/page.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import { ReactFlowProvider, useReactFlow } from "@xyflow/react";
import { getArkivClient } from "@/lib/arkiv/client";
import { createRepository } from "@/lib/arkiv/repo";
import type { AttrValue, Cipher } from "@/lib/arkiv/types";
import { agentCardSchema, type AgentCard } from "@/lib/arkiv/entities/agentCard";
import { snapshotSchema, type StateSnapshot } from "@/lib/arkiv/entities/stateSnapshot";
import { auditSchema, type AuditLog } from "@/lib/arkiv/entities/auditLog";
import { useEntityList, useDelete } from "@/lib/hooks/useEntity";
import { useEntityWatch } from "@/lib/hooks/useEntityWatch";
import { buildGraph, type GraphEntity, type EntityType } from "@/lib/graph/buildGraph";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { TimelineRail, type TimelineEvent } from "@/components/timeline/TimelineRail";
import { InspectorDrawer, type InspectorEntity } from "@/components/inspector/InspectorDrawer";

const ACTOR = "0xOperator"; // wallet wiring lands in a later plan; fixed for the slice
// Dev cipher: identity pass-through. The real AES/RSA keystore arrives in Plan 2 (M2 privacy).
const devCipher: Cipher = { available: true, async encrypt(s) { return s; }, async decrypt(s) { return s; } };

function VisualizerInner() {
  const client = useMemo(() => getArkivClient(), []);
  const repos = useMemo(() => ({
    agents: createRepository<AgentCard>(agentCardSchema, { client, cipher: devCipher, actor: ACTOR }),
    snaps: createRepository<StateSnapshot>(snapshotSchema, { client, cipher: devCipher, actor: ACTOR }),
    audits: createRepository<AuditLog>(auditSchema, { client, cipher: devCipher, actor: ACTOR }),
  }), [client]);

  useEntityWatch(repos.agents, "agents");
  useEntityWatch(repos.snaps, "snaps");
  useEntityWatch(repos.audits, "audits");

  const aList = useEntityList(repos.agents, "agents");
  const sList = useEntityList(repos.snaps, "snaps");
  const auList = useEntityList(repos.audits, "audits");
  const delSnap = useDelete(repos.snaps, "snaps");

  // Dev seed so the graph isn't empty on first load (no-op once data exists).
  useEffect(() => {
    if (aList.isLoading || (aList.data?.length ?? 0) > 0) return;
    void (async () => {
      const now = Date.now();
      await repos.agents.create({ agentId: "7", registryChainId: 11142220, status: "active", createdAt: now });
      const s1 = await repos.snaps.create({ agentId: "7", sessionKey: "sess-1", commitSeq: 1, commitHash: "0x9f1a2b", encPayload: "{}", payloadSize: 2 });
      await repos.snaps.create({ agentId: "7", sessionKey: "sess-1", commitSeq: 2, commitHash: "0x7c3d4e", encPayload: "{}", payloadSize: 4, prevSnapshotKey: s1.key });
      await repos.audits.create({ agentId: "7", action: "AGENT_CREATED", actorWallet: ACTOR, targetEntityKey: "7", ts: now });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aList.isLoading, aList.data?.length, repos]);

  const [selected, setSelected] = useState<InspectorEntity | null>(null);
  const flow = useReactFlow();

  const entities: GraphEntity[] = [
    ...(aList.data ?? []).map((e) => ({ key: e.key, type: "AgentCard" as EntityType, attrs: e as unknown as Record<string, AttrValue> })),
    ...(sList.data ?? []).map((e) => ({ key: e.key, type: "StateSnapshot" as EntityType, attrs: e as unknown as Record<string, AttrValue> })),
    ...(auList.data ?? []).map((e) => ({ key: e.key, type: "AuditLog" as EntityType, attrs: e as unknown as Record<string, AttrValue> })),
  ];
  const graph = buildGraph(entities);

  const events: TimelineEvent[] = entities.map((e) => ({
    id: e.key, nodeId: e.key, kind: e.type,
    ts: Number(e.attrs.createdAt ?? e.attrs.ts ?? 0),
    label: e.type === "StateSnapshot" ? `snapshot #${e.attrs.commitSeq}` : e.type,
  }));

  const focus = (nodeId: string) => {
    const n = flow.getNode(nodeId);
    if (n) flow.setCenter(n.position.x, n.position.y, { zoom: 1.4, duration: 400 });
    const ent = entities.find((e) => e.key === nodeId);
    if (ent) setSelected({ key: ent.key, type: ent.type, fields: ent.attrs as Record<string, string | number> });
  };

  return (
    <main className="flex h-dvh w-full">
      <div className="relative flex-1">
        <GraphCanvas graph={graph} onSelect={focus} />
      </div>
      <TimelineRail events={events} onFocus={focus} />
      <InspectorDrawer
        entity={selected} canEdit={selected?.type === "StateSnapshot"}
        onDelete={(key) => { delSnap.mutate(key); setSelected(null); }}
        onClose={() => setSelected(null)} />
    </main>
  );
}

export default function VisualizerPage() {
  return <ReactFlowProvider><VisualizerInner /></ReactFlowProvider>;
}
