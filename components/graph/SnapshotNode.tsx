// components/graph/SnapshotNode.tsx
import { Handle, Position } from "@xyflow/react";

export function SnapshotNode({ data }: { data: { commitSeq: number; commitHash: string } }) {
  return (
    <div className="rounded-md border border-[#475569] bg-[#272F42] px-3 py-2 font-mono text-xs text-[#F8FAFC]">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div>snap #{data.commitSeq}</div>
      <div className="text-slate-400">{data.commitHash.slice(0, 6)}…</div>
    </div>
  );
}
