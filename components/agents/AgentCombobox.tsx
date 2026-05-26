// components/agents/AgentCombobox.tsx
// Searchable agent picker for sharing. Unlike a plain <select> of the user's own
// agents, this searches ALL agents across every user (queryGlobal) by name, ENS,
// agentId, or owner address — so knowledge can be shared to other users' agents.
// Also accepts a raw numeric agentId typed directly (for agents not in the page).
"use client";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAllAgentsList } from "@/lib/hooks/useAgents";
import { EnsBadge } from "@/components/ens/EnsBadge";

export function AgentCombobox({
  value,
  onChange,
  excludeAgentId,
  placeholder = "Search agent by name, ENS, or ID…",
}: {
  value: string;
  onChange: (agentId: string) => void;
  excludeAgentId?: string;
  placeholder?: string;
}) {
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [rect, setRect] = useState<{ top: number; left: number; width: number } | null>(null);
  const all = useAllAgentsList();

  useEffect(() => { setMounted(true); }, []);

  // Reposition the portal dropdown on open/scroll/resize so it tracks the input.
  useLayoutEffect(() => {
    if (!open || !inputRef.current) return;
    const update = () => {
      if (!inputRef.current) return;
      const r = inputRef.current.getBoundingClientRect();
      setRect({ top: r.bottom + 4, left: r.left, width: r.width });
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  const agents = useMemo(
    () => (all.data ?? []).filter((a) => a.agentId !== excludeAgentId),
    [all.data, excludeAgentId],
  );
  const selected = agents.find((a) => a.agentId === value);

  const matches = useMemo(() => {
    const t = term.trim().toLowerCase();
    if (!t) return agents.slice(0, 25);
    return agents
      .filter(
        (a) =>
          a.agentId.toLowerCase().includes(t) ||
          a.name?.toLowerCase().includes(t) ||
          a.ensName?.toLowerCase().includes(t) ||
          a.owner?.toLowerCase().includes(t),
      )
      .slice(0, 25);
  }, [agents, term]);

  const rawId = /^\d+$/.test(term.trim()) ? term.trim() : null;
  const showRaw = rawId && !matches.some((a) => a.agentId === rawId);

  // A grantee is chosen — show it with a "change" affordance.
  if (value) {
    return (
      <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-white/[0.03] px-2 py-1.5 text-xs">
        <span className="truncate font-sans text-fg">
          {selected?.name || "Agent"} <span className="font-mono text-fg-muted">· {value}</span>
        </span>
        {selected?.ensName && <EnsBadge name={selected.ensName} />}
        <button
          onClick={() => { onChange(""); setTerm(""); setOpen(true); }}
          className="ml-auto font-sans text-fg-muted transition hover:text-fg"
        >
          change
        </button>
      </div>
    );
  }

  const dropdown = open && rect && (matches.length > 0 || showRaw) ? (
    <ul
      style={{ position: "fixed", top: rect.top, left: rect.left, width: rect.width, zIndex: 9999 }}
      className="max-h-64 overflow-y-auto rounded-lg border border-border bg-surface p-1 shadow-glow-neutral backdrop-blur-xl"
    >
      {all.isLoading && <li className="px-2 py-1 font-mono text-[11px] text-fg-muted">Loading agents…</li>}
      {matches.map((a) => (
        <li key={a.key}>
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(a.agentId); setOpen(false); }}
            className="flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition hover:bg-surface-2"
          >
            <span className="font-sans text-xs text-fg">
              {a.name || "Unnamed"} <span className="font-mono text-fg-muted">· {a.agentId}</span>
            </span>
            <span className="flex items-center gap-2 font-mono text-[10px] text-fg-faint">
              {a.ensName ? <span className="text-accent">{a.ensName}</span> : null}
              {a.owner ? <span>owner {a.owner.slice(0, 6)}…{a.owner.slice(-4)}</span> : null}
            </span>
          </button>
        </li>
      ))}
      {showRaw && (
        <li>
          <button
            onMouseDown={(e) => { e.preventDefault(); onChange(rawId!); setOpen(false); }}
            className="w-full rounded-md px-2 py-1.5 text-left font-mono text-xs text-accent transition hover:bg-surface-2"
          >
            Use agent ID {rawId}
          </button>
        </li>
      )}
    </ul>
  ) : null;

  return (
    <div className="relative flex-1">
      <input
        ref={inputRef}
        value={term}
        onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        className="input w-full py-1.5 text-xs"
      />
      {mounted && dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}
