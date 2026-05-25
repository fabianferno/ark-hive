// components/chat/MessageBubble.tsx
import type { UiMessage } from "@/lib/agentClient";

export function MessageBubble({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 font-sans text-sm ${isUser ? "bg-accent text-accent-ink shadow-[0_6px_24px_-10px_rgb(var(--accent-rgb)/0.6)]" : "border border-border bg-surface text-fg backdrop-blur-md"}`}>
        {message.content}
      </div>
    </div>
  );
}
