"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { ExternalLink, Square } from "lucide-react";
import { AppShell } from "@/components/app/AppShell";
import { ChatView } from "@/components/chat/ChatView";
import {
  useAgent, useSessions, useStartSession, useMessages, useSendMessage, useCloseSession,
} from "@/lib/hooks/useAgents";
import { chainLabel, ipfsHttpUrl, type CloseSessionResult } from "@/lib/agentClient";

export default function WorkspacePage() {
  const agentId = String(useParams().agentId);
  const [sessionKey, setSessionKey] = useState<string>("");
  const [closed, setClosed] = useState<CloseSessionResult | null>(null);
  const agent = useAgent(agentId);
  const sessions = useSessions(agentId);
  const start = useStartSession(agentId);
  const messages = useMessages(sessionKey);
  const send = useSendMessage(sessionKey);
  const close = useCloseSession(agentId);
  const a = agent.data;

  return (
    <AppShell>
      <div className="flex h-full flex-col">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-[#475569] bg-[#1E293B] px-4 py-3">
          <span className="font-sans text-sm font-semibold text-[#F8FAFC]">{a?.name || "Agent"}</span>
          <span className="font-mono text-xs text-slate-400">8004 agentId {agentId}</span>
          {a && <span className="font-mono text-[11px] text-slate-500">{chainLabel(a.registryChainId)}</span>}
          {a?.status && (
            <span className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wide text-[#22C55E]">
              <span className="h-2 w-2 rounded-full bg-[#22C55E]" /> {a.status}
            </span>
          )}
          {a?.agentCardUri && (
            <a href={ipfsHttpUrl(a.agentCardUri)} target="_blank" rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono text-[11px] text-[#22C55E] hover:underline">
              <ExternalLink size={12} /> agent card (IPFS)
            </a>
          )}
        </header>
        <div className="flex min-h-0 flex-1">
          <aside className="w-60 border-r border-[#475569] p-3">
            <button onClick={() => start.mutate(undefined, { onSuccess: (r) => { setSessionKey(r.sessionKey); setClosed(null); } })}
              disabled={start.isPending}
              className="mb-3 w-full rounded bg-[#22C55E] px-3 py-2 font-sans text-sm font-medium text-[#0F172A] disabled:opacity-40">
              {start.isPending ? "Starting…" : "Start Session"}
            </button>
            {sessionKey && (
              <button onClick={() => close.mutate(sessionKey, { onSuccess: (r) => setClosed(r) })}
                disabled={close.isPending}
                className="mb-3 flex w-full items-center justify-center gap-1 rounded border border-[#475569] px-3 py-2 font-sans text-sm font-medium text-slate-200 hover:border-[#22C55E] disabled:opacity-40">
                <Square size={14} /> {close.isPending ? "Closing…" : "End Session"}
              </button>
            )}
            <div className="font-mono text-xs text-slate-400">agent {agentId}</div>
            <ul className="mt-2 space-y-1">
              {(sessions.data ?? []).map((s) => (
                <li key={s.key}>
                  <button onClick={() => { setSessionKey(s.key); setClosed(null); }}
                    className={`w-full truncate rounded px-2 py-1 text-left font-mono text-xs ${sessionKey === s.key ? "bg-[#272F42] text-[#F8FAFC]" : "text-slate-400 hover:bg-[#1E293B]"}`}>
                    {s.key.slice(0, 10)}… · {s.turnCount} turns
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <div className="flex-1 overflow-y-auto">
            {closed ? (
              <SessionDigestPanel result={closed} onDismiss={() => setClosed(null)} />
            ) : sessionKey ? (
              <ChatView messages={messages.data ?? []} sending={send.isPending} onSend={(t) => send.mutate(t)} />
            ) : (
              <div className="p-6 font-sans text-slate-400">Start or pick a session to chat.</div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function SessionDigestPanel({ result, onDismiss }: { result: CloseSessionResult; onDismiss: () => void }) {
  return (
    <div className="p-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-sans text-lg font-semibold text-[#F8FAFC]">Session Summary</h2>
        <button onClick={onDismiss} className="rounded px-3 py-1.5 font-sans text-sm text-slate-300 hover:bg-[#272F42]">Back to chat</button>
      </div>
      <p className="mb-3 font-mono text-xs text-slate-500">indexed as {result.summaryKey.slice(0, 14)}… — added to the agent&apos;s knowledge graph</p>
      <div className="rounded-lg border border-[#475569] bg-[#1E293B] p-4 font-sans text-sm text-slate-200">
        {result.digest.summary || "No summary produced."}
      </div>
      {result.digest.topics.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {result.digest.topics.map((t) => (
            <span key={t} className="rounded-full border border-[#475569] bg-[#0F172A] px-2.5 py-1 font-mono text-xs text-[#22C55E]">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}
