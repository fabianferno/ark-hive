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
          className="fixed right-0 top-0 z-40 h-full w-80 border-l border-[#475569] bg-[#1E293B]/90 p-4 backdrop-blur-md">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-sans text-sm font-semibold text-[#F8FAFC]">{entity.type}</h2>
            <button aria-label="Close" onClick={onClose} className="text-slate-400 hover:text-[#F8FAFC]">
              <X size={16} />
            </button>
          </div>
          <dl className="space-y-1 font-mono text-xs text-[#F8FAFC]">
            {Object.entries(entity.fields).map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2">
                <dt className="text-slate-400">{k}</dt><dd className="tabular-nums">{String(v)}</dd>
              </div>
            ))}
          </dl>
          <button
            onClick={() => onDelete(entity.key)} disabled={!canEdit}
            className="mt-4 w-full rounded bg-[#EF4444] py-2 font-sans text-sm text-white disabled:opacity-40">
            Delete
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
