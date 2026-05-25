// components/graph/AgentNode.tsx
import { Handle, Position } from "@xyflow/react";
import { StatusDot } from "./StatusDot";

export function AgentNode({ data }: { data: { agentId: string; status: string } }) {
  return (
    <div className="rounded-xl border border-accent/30 bg-surface px-3 py-2 font-sans text-fg shadow-[0_0_24px_-10px_rgb(var(--accent-rgb)/0.5)] backdrop-blur-md">
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center gap-2">
        <StatusDot status={data.status} />
        <span className="font-mono text-sm">Agent #{data.agentId}</span>
      </div>
    </div>
  );
}
