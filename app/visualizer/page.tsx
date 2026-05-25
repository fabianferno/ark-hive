// app/visualizer/page.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { AppShell } from "@/components/app/AppShell";
import { GraphCanvas } from "@/components/graph/GraphCanvas";
import { NeuralGraph3D, type NeuralGraph3DHandle } from "@/components/graph/NeuralGraph3D";
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
  const [mode, setMode] = useState<"2d" | "3d">("3d");
  const flow = useReactFlow();
  const graph3d = useRef<NeuralGraph3DHandle>(null);

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
    if (mode === "2d") {
      const n = flow.getNode(nodeId);
      if (n) flow.setCenter(n.position.x, n.position.y, { zoom: 1.4, duration: 400 });
    } else {
      graph3d.current?.focus(nodeId);
    }
    const ent = entities.find((e) => e.key === nodeId);
    if (ent) setSelected({ key: ent.key, type: ent.type, fields: ent.attrs as Record<string, string | number> });
  };

  return (
    <div className="flex h-full w-full">
      <div className="relative flex-1">
        {mode === "2d" ? (
          <GraphCanvas graph={graph} onSelect={focus} />
        ) : (
          <NeuralGraph3D ref={graph3d} graph={graph} onSelect={focus} />
        )}

        {/* 2D / 3D toggle */}
        <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 gap-1 rounded-full border border-border bg-surface p-1 backdrop-blur-md">
          {(["3d", "2d"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full px-4 py-1 text-xs font-medium uppercase tracking-wide transition ${
                mode === m ? "bg-accent text-accent-ink" : "text-fg-muted hover:text-fg"
              }`}
            >
              {m === "3d" ? "3D Neural" : "2D Graph"}
            </button>
          ))}
        </div>
      </div>
      <TimelineRail events={events} onFocus={focus} />
      <InspectorDrawer
        entity={selected} canEdit={selected?.type === "StateSnapshot"}
        onDelete={(key) => { delSnap.mutate(key); setSelected(null); }}
        onClose={() => setSelected(null)} />
    </div>
  );
}

export default function VisualizerPage() {
  return (
    <AppShell>
      <ReactFlowProvider><VisualizerInner /></ReactFlowProvider>
    </AppShell>
  );
}
