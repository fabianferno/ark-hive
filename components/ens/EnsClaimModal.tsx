// components/ens/EnsClaimModal.tsx
"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useMyEns, useEnsAvailability, useClaimEns } from "@/lib/hooks/useEns";
import { useUserWallet } from "@/lib/wallet/useUserWallet";
import { sanitizeLabel } from "@/lib/ens/labels";
import { ROOT_DOMAIN } from "@/lib/ens/config";

export function EnsClaimModal() {
  const { authenticated, address } = useUserWallet();
  const myEns = useMyEns();
  const claim = useClaimEns();
  const [dismissed, setDismissed] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const sanitized = sanitizeLabel(inputValue);
  const avail = useEnsAvailability(sanitized);

  // Only show when: authenticated, myEns loaded, user has no ENS, not dismissed
  const shouldShow =
    authenticated &&
    myEns.data !== undefined &&
    myEns.data.ensName === null &&
    !dismissed;

  async function handleClaim() {
    if (!sanitized || !address) return;
    await claim.mutateAsync({ label: sanitized, address });
    // Close immediately — the optimistic myEns cache update also flips shouldShow,
    // but dismissing here avoids the refetch-lag window where the modal lingered.
    setDismissed(true);
  }

  const isAvailable = avail.data?.available === true;
  const isTaken = avail.data?.available === false;
  const isChecking = avail.isFetching;
  const canClaim = isAvailable && !!address && !claim.isPending;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="w-[26rem] rounded-2xl border border-border bg-surface p-6 shadow-glow-accent backdrop-blur-xl"
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
          >
            <h2 className="font-display text-lg font-semibold text-fg">
              Claim your free ENS name
            </h2>
            <p className="mt-1 font-sans text-sm text-fg-muted">
              Register a human-readable name under{" "}
              <span className="font-mono text-accent">{ROOT_DOMAIN}</span>. Your
              agents will automatically get sub-names under it.
            </p>

            <div className="mt-4">
              <label className="mb-1 block font-sans text-xs text-fg-muted">
                Choose a label
              </label>
              <input
                className="input"
                placeholder="e.g. alice"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                autoFocus
              />
              {sanitized && (
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="font-mono text-xs text-fg-muted">
                    Preview:{" "}
                    <span className="text-accent">
                      {sanitized}.{ROOT_DOMAIN}
                    </span>
                  </span>
                  <span className="font-mono text-[11px]">
                    {isChecking ? (
                      <span className="text-fg-faint">checking…</span>
                    ) : isAvailable ? (
                      <span className="text-green-400">✓ available</span>
                    ) : isTaken ? (
                      <span className="text-red-400">✗ taken</span>
                    ) : null}
                  </span>
                </div>
              )}
              {avail.data?.reason && isTaken && (
                <p className="mt-1 font-mono text-[10px] text-fg-faint">
                  {avail.data.reason}
                </p>
              )}
            </div>

            {claim.error && (
              <p className="mt-2 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-2 font-mono text-xs text-red-400">
                {(claim.error as Error).message}
              </p>
            )}

            <div className="mt-5 flex justify-between gap-2">
              <button
                onClick={() => setDismissed(true)}
                className="btn-ghost border-transparent bg-transparent text-fg-muted"
              >
                Maybe later
              </button>
              <button
                disabled={!canClaim}
                onClick={handleClaim}
                className="btn-primary px-4 py-1.5"
              >
                {claim.isPending ? "Claiming…" : "Claim"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
