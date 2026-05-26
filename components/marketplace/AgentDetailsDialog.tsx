// components/marketplace/AgentDetailsDialog.tsx
// Organized full-card view for a marketplace agent: identity, persona, capabilities,
// endpoints, on-chain registrations, raw AgentCard JSON. Opens when a card is clicked.
"use client";
import { AnimatePresence, motion } from "framer-motion";
import { ExternalLink, X, Copy, Check } from "lucide-react";
import { useState } from "react";
import { ipfsHttpUrl } from "@/lib/agentClient";
import type { MarketplaceAgent } from "@/lib/agent/registry";

function CopyBtn({ value }: { value: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1200); }}
      className="text-fg-faint transition hover:text-fg"
      aria-label="Copy"
    >
      {done ? <Check size={12} /> : <Copy size={12} />}
    </button>
  );
}

function Field({ label, value, mono = false }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div>
      <div className="mb-0.5 font-mono text-[10px] uppercase tracking-wide text-fg-faint">{label}</div>
      <div className={`break-all text-sm ${mono ? "font-mono text-fg-muted" : "font-sans text-fg"}`}>{value || <span className="text-fg-faint">—</span>}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-border pt-3">
      <h3 className="mb-2 font-mono text-[10px] uppercase tracking-wider text-fg-muted">{title}</h3>
      {children}
    </section>
  );
}

export function AgentDetailsDialog({
  agent, adopted, mine, onClose, onAdopt, adopting,
}: {
  agent: MarketplaceAgent | null;
  adopted: boolean;
  mine: boolean;
  onClose: () => void;
  onAdopt: () => void;
  adopting: boolean;
}) {
  const card = agent?.card;
  return (
    <AnimatePresence>
      {agent && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-surface shadow-glow-neutral backdrop-blur-xl"
            initial={{ scale: 0.96, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.96, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* header */}
            <div className="flex items-start gap-3 border-b border-border p-5">
              {agent.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={agent.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
              ) : (
                <div className="grid h-14 w-14 place-items-center rounded-lg bg-white/[0.04] font-mono text-sm text-fg-muted">#{agent.agentId}</div>
              )}
              <div className="min-w-0 flex-1">
                <h2 className="truncate font-display text-xl font-semibold text-fg">{agent.name}</h2>
                <p className="mt-0.5 line-clamp-2 font-sans text-sm text-fg-muted">{agent.description || "No description."}</p>
                <div className="mt-2 flex flex-wrap gap-2 font-mono text-[10px] text-fg-faint">
                  <span>id {agent.agentId}</span>
                  <span>owner {agent.owner.slice(0, 6)}…{agent.owner.slice(-4)}</span>
                  {card?.role && <span>role {card.role}</span>}
                  {card?.version && <span>v{card.version}</span>}
                </div>
              </div>
              <button onClick={onClose} aria-label="Close" className="text-fg-faint transition hover:text-fg">
                <X size={18} />
              </button>
            </div>

            {/* body */}
            <div className="space-y-4 p-5">
              <Section title="Identity">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="agentId" value={<span className="flex items-center gap-1.5"><span>{agent.agentId}</span><CopyBtn value={agent.agentId} /></span>} mono />
                  <Field label="domain" value={card?.domain} mono />
                  <Field label="owner" value={<span className="flex items-center gap-1.5"><span>{agent.owner}</span><CopyBtn value={agent.owner} /></span>} mono />
                  <Field label="contact" value={card?.contact} />
                </div>
              </Section>

              <Section title="Capabilities">
                {(card?.capabilities?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {card!.capabilities.map((c) => <span key={c} className="chip">{c}</span>)}
                  </div>
                ) : <span className="text-fg-faint">—</span>}
              </Section>

              <Section title="Trust">
                {(card?.supportedTrust?.length ?? 0) > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {card!.supportedTrust.map((t) => <span key={t} className="chip">{t}</span>)}
                  </div>
                ) : <span className="text-fg-faint">—</span>}
              </Section>

              <Section title="Endpoints">
                {(card?.endpoints?.length ?? 0) > 0 ? (
                  <ul className="space-y-1.5">
                    {card!.endpoints.map((ep, i) => (
                      <li key={i} className="rounded-lg border border-border bg-white/[0.02] px-3 py-2 font-mono text-xs">
                        <span className="text-fg-muted">{ep.name || "endpoint"}</span>
                        <span className="mx-2 text-fg-faint">→</span>
                        <a href={ep.url} target="_blank" rel="noreferrer" className="text-accent hover:underline">{ep.url}</a>
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-fg-faint">No endpoint declared (chat will use the platform persona fallback).</span>}
              </Section>

              <Section title="On-chain registrations">
                {(card?.registrations?.length ?? 0) > 0 ? (
                  <ul className="space-y-1.5">
                    {card!.registrations.map((r, i) => (
                      <li key={i} className="rounded-lg border border-border bg-white/[0.02] px-3 py-2 font-mono text-[11px] text-fg-muted">
                        <div>registry <span className="text-fg">{r.agentRegistry}</span></div>
                        <div>chain <span className="text-fg">{r.chainId}</span></div>
                        <div>agentAddress <span className="text-fg">{r.agentAddress}</span></div>
                        {r.agentId && <div>agentId <span className="text-fg">{r.agentId}</span></div>}
                      </li>
                    ))}
                  </ul>
                ) : <span className="text-fg-faint">—</span>}
              </Section>

              <Section title="Card source">
                <div className="space-y-2">
                  {agent.tokenURI && (
                    <a href={ipfsHttpUrl(agent.tokenURI)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-xs text-accent hover:underline">
                      <ExternalLink size={12} /> tokenURI (IPFS)
                    </a>
                  )}
                  <details className="rounded-lg border border-border bg-white/[0.02] p-3">
                    <summary className="cursor-pointer font-mono text-[11px] uppercase tracking-wide text-fg-muted">raw AgentCard JSON</summary>
                    <pre className="mt-2 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] text-fg-muted">{JSON.stringify(card ?? {}, null, 2)}</pre>
                  </details>
                </div>
              </Section>
            </div>

            {/* footer */}
            <div className="sticky bottom-0 flex justify-end gap-2 border-t border-border bg-surface/80 p-4 backdrop-blur-xl">
              <button onClick={onClose} className="btn-ghost border-transparent bg-transparent">Close</button>
              <button
                onClick={(e) => { e.stopPropagation(); onAdopt(); }}
                disabled={mine || adopted || adopting}
                className="btn-primary px-4 py-1.5 disabled:opacity-40"
              >
                {mine ? "Yours" : adopted ? "Adopted" : adopting ? "Adopting…" : "Adopt"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
