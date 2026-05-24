// components/graph/AuditNode.tsx
import { Handle, Position } from "@xyflow/react";

export function AuditNode({ data }: { data: { action: string } }) {
  return (
    <div className="rounded-md border border-dashed border-[#475569] bg-[#1E293B] px-2 py-1 font-mono text-[10px] text-slate-300">
      <Handle type="target" position={Position.Top} />
      {data.action}
    </div>
  );
}
