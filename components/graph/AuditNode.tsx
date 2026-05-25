// components/graph/AuditNode.tsx
import { Handle, Position } from "@xyflow/react";

export function AuditNode({ data }: { data: { action: string } }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-surface px-2 py-1 font-mono text-[10px] text-fg-muted backdrop-blur-md">
      <Handle type="target" position={Position.Top} />
      {data.action}
    </div>
  );
}
