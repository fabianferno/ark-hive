// components/graph/StatusDot.tsx
const COLOR: Record<string, string> = {
  active: "bg-[#22C55E]", idle: "bg-slate-500", expiring: "bg-[#F59E0B]", revoked: "bg-[#EF4444]",
};
export function StatusDot({ status }: { status: string }) {
  return <span data-testid="status-dot" data-status={status}
    className={`inline-block h-2 w-2 rounded-full ${COLOR[status] ?? "bg-slate-500"}`} />;
}
