"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { ipfsHttpUrl, type CreateAgentResult } from "@/lib/agentClient";
import { useMyEns } from "@/lib/hooks/useEns";
import { agentEns, fallbackUserLabel } from "@/lib/ens/labels";
import { EnsBadge } from "@/components/ens/EnsBadge";
import { useUserWallet } from "@/lib/wallet/useUserWallet";

export interface NewAgentInput { name: string; description: string; domain: string; capabilities: string[]; version: string; image: string; contact: string; endpoint: string; }

export function NewAgentDialog({ open, onClose, onCreate, creating, result }: {
  open: boolean; onClose: () => void; onCreate: (input: NewAgentInput) => void; creating: boolean; result?: CreateAgentResult | null;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [domain, setDomain] = useState("");
  const [capabilities, setCapabilities] = useState("chat, memory-search");
  const [version, setVersion] = useState("1.0.0");
  const [image, setImage] = useState("");
  const [contact, setContact] = useState("");
  const [endpoint, setEndpoint] = useState("");
  const myEns = useMyEns();
  const { address } = useUserWallet();
  const field = "input";
  const label = "mb-1 block font-sans text-xs text-fg-muted";
  const submit = () => onCreate({
    name, description, domain,
    capabilities: capabilities.split(",").map((s) => s.trim()).filter(Boolean),
    version, image, contact, endpoint,
  });
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="max-h-[90vh] w-[28rem] overflow-y-auto rounded-2xl border border-border bg-surface p-6 shadow-glow-neutral backdrop-blur-xl"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
            {result ? (
              <div className="space-y-3">
                <h2 className="font-display text-lg font-semibold text-fg">Agent Registered</h2>
                <p className="font-sans text-xs text-fg-muted">ERC-8004 identity registered on-chain.</p>
                <div className="rounded-xl border border-border bg-white/[0.03] p-3 font-mono text-xs text-fg-muted">
                  <div>agentId <span className="text-accent">{result.agentId}</span></div>
                  <div className="mt-1 break-all">txHash {result.txHash}</div>
                </div>
                {result.agentCardUri ? (
                  <a href={ipfsHttpUrl(result.agentCardUri)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline">
                    <ExternalLink size={12} /> {result.agentCardUri}
                  </a>
                ) : (
                  <p className="font-mono text-xs text-fg-faint">No IPFS card URI (PINATA_JWT not configured).</p>
                )}
                {(() => {
                  const userLabel = myEns.data?.label || (address ? fallbackUserLabel(address) : "");
                  return userLabel ? (
                    <div>
                      <p className="mb-1 font-sans text-xs text-fg-muted">ENS name</p>
                      <EnsBadge name={agentEns(name, userLabel, result.agentId)} />
                    </div>
                  ) : null;
                })()}
                <div className="flex justify-end">
                  <button onClick={onClose} className="btn-primary px-3 py-1.5">Done</button>
                </div>
              </div>
            ) : (
            <>
            <h2 className="mb-1 font-display text-lg font-semibold text-fg">New Agent</h2>
            <p className="mb-4 font-sans text-xs text-fg-muted">These fields are written into the ERC-8004 agent card pinned to IPFS.</p>
            <div className="space-y-3">
              <div><label className={label}>Name *</label><input className={field} value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><label className={label}>Description</label><textarea className={`${field} h-16`} value={description} onChange={(e) => setDescription(e.target.value)} /></div>
              <div><label className={label}>Domain</label><input className={field} placeholder="agent.example.com" value={domain} onChange={(e) => setDomain(e.target.value)} /></div>
              <div><label className={label}>Capabilities (comma-separated)</label><input className={field} value={capabilities} onChange={(e) => setCapabilities(e.target.value)} /></div>
              <div className="flex gap-3">
                <div className="flex-1"><label className={label}>Version</label><input className={field} value={version} onChange={(e) => setVersion(e.target.value)} /></div>
                <div className="flex-1"><label className={label}>Image URL</label><input className={field} value={image} onChange={(e) => setImage(e.target.value)} /></div>
              </div>
              <div><label className={label}>Contact</label><input className={field} placeholder="mailto:you@example.com" value={contact} onChange={(e) => setContact(e.target.value)} /></div>
              <div><label className={label}>Endpoint URL</label><input className={field} placeholder="https://my-agent.example.com/chat" value={endpoint} onChange={(e) => setEndpoint(e.target.value)} /></div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={onClose} className="btn-ghost border-transparent bg-transparent">Cancel</button>
              <button disabled={!name || creating} onClick={submit} className="btn-primary px-3 py-1.5">
                {creating ? "Registering…" : "Create + Register 8004"}
              </button>
            </div>
            </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
