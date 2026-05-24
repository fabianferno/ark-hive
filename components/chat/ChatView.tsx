// components/chat/ChatView.tsx
"use client";
import type { UiMessage } from "@/lib/agentClient";
import { MessageBubble } from "./MessageBubble";
import { Composer } from "./Composer";

export function ChatView({ messages, onSend, sending }: { messages: UiMessage[]; onSend: (text: string) => void; sending: boolean }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-4">
        {messages.length === 0 && <p className="font-mono text-sm text-slate-400">No messages yet — say hello.</p>}
        {messages.map((m) => <MessageBubble key={m.key} message={m} />)}
        {sending && <p className="font-mono text-xs text-slate-500">agent is thinking…</p>}
      </div>
      <Composer onSend={onSend} sending={sending} />
    </div>
  );
}
