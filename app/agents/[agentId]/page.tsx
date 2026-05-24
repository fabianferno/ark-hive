"use client";
import { useParams } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { ChatView } from "@/components/chat/ChatView";
import { useSessions, useStartSession, useMessages, useSendMessage } from "@/lib/hooks/useAgents";

export default function WorkspacePage() {
  const agentId = String(useParams().agentId);
  const [sessionKey, setSessionKey] = useState<string>("");
  const sessions = useSessions(agentId);
  const start = useStartSession(agentId);
  const messages = useMessages(sessionKey);
  const send = useSendMessage(sessionKey);

  return (
    <AppShell>
      <div className="flex h-full">
        <aside className="w-60 border-r border-[#475569] p-3">
          <button onClick={() => start.mutate(undefined, { onSuccess: (r) => setSessionKey(r.sessionKey) })}
            disabled={start.isPending}
            className="mb-3 w-full rounded bg-[#22C55E] px-3 py-2 font-sans text-sm font-medium text-[#0F172A] disabled:opacity-40">
            {start.isPending ? "Starting…" : "Start Session"}
          </button>
          <div className="font-mono text-xs text-slate-400">agent {agentId}</div>
          <ul className="mt-2 space-y-1">
            {(sessions.data ?? []).map((s) => (
              <li key={s.key}>
                <button onClick={() => setSessionKey(s.key)}
                  className={`w-full truncate rounded px-2 py-1 text-left font-mono text-xs ${sessionKey === s.key ? "bg-[#272F42] text-[#F8FAFC]" : "text-slate-400 hover:bg-[#1E293B]"}`}>
                  {s.key.slice(0, 10)}… · {s.turnCount} turns
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="flex-1">
          {sessionKey
            ? <ChatView messages={messages.data ?? []} sending={send.isPending} onSend={(t) => send.mutate(t)} />
            : <div className="p-6 font-sans text-slate-400">Start or pick a session to chat.</div>}
        </div>
      </div>
    </AppShell>
  );
}
