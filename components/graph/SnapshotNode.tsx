// components/graph/SnapshotNode.tsx
import { Handle, Position } from "@xyflow/react";

export function SnapshotNode({ data }: { data: { commitSeq: number; commitHash: string } }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-fg backdrop-blur-md">
      <Handle type="target" position={Position.Top} />
      <Handle type="source" position={Position.Bottom} />
      <div>snap #{data.commitSeq}</div>
      <div className="text-fg-muted">{data.commitHash.slice(0, 6)}…</div>
    </div>
  );
}
