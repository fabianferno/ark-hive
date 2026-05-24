"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink } from "lucide-react";
import { useState } from "react";
import { ipfsHttpUrl, type CreateAgentResult } from "@/lib/agentClient";

export interface NewAgentInput { name: string; description: string; domain: string; capabilities: string[]; version: string; image: string; contact: string; }

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
  const field = "w-full rounded border border-[#475569] bg-[#0F172A] px-2 py-1.5 font-sans text-sm text-[#F8FAFC]";
  const label = "mb-1 block font-sans text-xs text-slate-400";
  const submit = () => onCreate({
    name, description, domain,
    capabilities: capabilities.split(",").map((s) => s.trim()).filter(Boolean),
    version, image, contact,
  });
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="max-h-[90vh] w-[28rem] overflow-y-auto rounded-lg border border-[#475569] bg-[#1E293B] p-5"
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}>
            {result ? (
              <div className="space-y-3">
                <h2 className="font-sans text-lg font-semibold text-[#F8FAFC]">Agent Registered</h2>
                <p className="font-sans text-xs text-slate-400">ERC-8004 identity registered on-chain.</p>
                <div className="rounded border border-[#475569] bg-[#0F172A] p-3 font-mono text-xs text-slate-300">
                  <div>agentId <span className="text-[#22C55E]">{result.agentId}</span></div>
                  <div className="mt-1 break-all">txHash {result.txHash}</div>
                </div>
                {result.agentCardUri ? (
                  <a href={ipfsHttpUrl(result.agentCardUri)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs text-[#22C55E] hover:underline">
                    <ExternalLink size={12} /> {result.agentCardUri}
                  </a>
                ) : (
                  <p className="font-mono text-xs text-slate-500">No IPFS card URI (PINATA_JWT not configured).</p>
                )}
                <div className="flex justify-end">
                  <button onClick={onClose} className="rounded bg-[#22C55E] px-3 py-1.5 font-sans text-sm font-medium text-[#0F172A]">Done</button>
                </div>
              </div>
            ) : (
            <>
            <h2 className="mb-1 font-sans text-lg font-semibold text-[#F8FAFC]">New Agent</h2>
            <p className="mb-4 font-sans text-xs text-slate-400">These fields are written into the ERC-8004 agent card pinned to IPFS.</p>
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
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={onClose} className="rounded px-3 py-1.5 font-sans text-sm text-slate-300 hover:bg-[#272F42]">Cancel</button>
              <button disabled={!name || creating} onClick={submit}
                className="rounded bg-[#22C55E] px-3 py-1.5 font-sans text-sm font-medium text-[#0F172A] disabled:opacity-40">
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
