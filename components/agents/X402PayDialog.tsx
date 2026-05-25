// components/agents/X402PayDialog.tsx
"use client";
import { AnimatePresence, motion } from "framer-motion";
import type { PaymentRequirement } from "@/lib/x402/config";

function fmtUsdc(v: string): string {
  const n = Number(v) / 1e6;
  return Number.isFinite(n) ? n.toFixed(n < 0.01 ? 6 : 2) : v;
}

export function X402PayDialog({ req, onPay, onDecline }: {
  req: PaymentRequirement | null;
  onPay: () => void;
  onDecline: () => void;
}) {
  return (
    <AnimatePresence>
      {req && (
        <motion.div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="w-[24rem] rounded-2xl border border-border bg-surface p-6 shadow-glow-neutral"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
            <h2 className="mb-1 font-display text-lg font-semibold text-fg">Payment required</h2>
            <p className="mb-4 font-sans text-sm text-fg-muted">
              This agent charges <span className="font-mono text-fg">{fmtUsdc(req.maxAmountRequired)} USDC</span> per message
              (Base Sepolia). Sign to pay, or decline to use the local fallback.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={onDecline} className="btn-ghost border-transparent bg-transparent">Decline</button>
              <button onClick={onPay} className="btn-primary px-3 py-1.5">Pay &amp; send</button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
