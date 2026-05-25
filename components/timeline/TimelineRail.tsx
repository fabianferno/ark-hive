// components/timeline/TimelineRail.tsx
"use client";
import { motion } from "framer-motion";
import { MOTION } from "@/lib/motion";

export interface TimelineEvent { id: string; nodeId: string; label: string; ts: number; kind: string; }

export function TimelineRail({ events, onFocus }: { events: TimelineEvent[]; onFocus: (nodeId: string) => void }) {
  const sorted = [...events].sort((a, b) => b.ts - a.ts);
  return (
    <aside className="h-full w-72 overflow-y-auto border-l border-border bg-bg/60 p-3 backdrop-blur-xl">
      <h2 className="mb-2 font-mono text-xs uppercase tracking-wide text-fg-muted">Activity</h2>
      <ul className="space-y-1">
        {sorted.map((e, i) => (
          <motion.li key={e.id}
            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
            transition={{ ...MOTION.spring, delay: i * MOTION.stagger }}>
            <button onClick={() => onFocus(e.nodeId)}
              className="w-full rounded-lg px-2 py-1 text-left font-mono text-xs text-fg transition-colors hover:bg-surface-2">
              <span className="text-fg-faint">{new Date(e.ts).toLocaleTimeString()}</span> {e.label}
            </button>
          </motion.li>
        ))}
      </ul>
    </aside>
  );
}
