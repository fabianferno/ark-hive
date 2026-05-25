// components/inspector/InspectorDrawer.tsx
"use client";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { MOTION } from "@/lib/motion";

export interface InspectorEntity { key: string; type: string; fields: Record<string, string | number>; }

export function InspectorDrawer({
  entity, canEdit, onDelete, onClose,
}: {
  entity: InspectorEntity | null; canEdit: boolean;
  onDelete: (key: string) => void; onClose: () => void;
}) {
  return (
    <AnimatePresence>
      {entity && (
        <motion.div
          initial={{ x: 320, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 320, opacity: 0 }}
          transition={MOTION.spring}
          className="fixed right-0 top-0 z-40 h-full w-80 border-l border-border bg-bg/80 p-4 backdrop-blur-xl">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-sm font-semibold text-fg">{entity.type}</h2>
            <button aria-label="Close" onClick={onClose} className="text-fg-muted transition-colors hover:text-fg">
              <X size={16} />
            </button>
          </div>
          <dl className="space-y-1 font-mono text-xs text-fg">
            {Object.entries(entity.fields).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-fg-muted">{k}</dt><dd className="tabular-nums">{String(v)}</dd>
              </div>
            ))}
          </dl>
          <button
            onClick={() => onDelete(entity.key)} disabled={!canEdit}
            className="mt-4 w-full rounded-lg bg-danger py-2 font-sans text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40">
            Delete
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
