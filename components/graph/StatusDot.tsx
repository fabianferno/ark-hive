// components/graph/StatusDot.tsx
const COLOR: Record<string, string> = {
  active: "bg-accent", idle: "bg-fg-faint", expiring: "bg-warning", revoked: "bg-danger",
};
export function StatusDot({ status }: { status: string }) {
  return <span data-testid="status-dot" data-status={status}
    className={`inline-block h-2 w-2 rounded-full ${COLOR[status] ?? "bg-fg-faint"}`} />;
}
