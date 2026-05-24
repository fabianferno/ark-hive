// components/graph/AgentNode.tsx
import { Handle, Position } from "@xyflow/react";
import { StatusDot } from "./StatusDot";

export function AgentNode({ data }: { data: { agentId: string; status: string } }) {
  return (
    <div className="rounded-lg border border-[#475569] bg-[#1E293B] px-3 py-2 font-sans text-[#F8FAFC]">
      <Handle type="source" position={Position.Bottom} />
      <div className="flex items-center gap-2">
        <StatusDot status={data.status} />
        <span className="font-mono text-sm">Agent #{data.agentId}</span>
      </div>
    </div>
  );
}
