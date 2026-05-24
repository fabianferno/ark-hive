// components/chat/MessageBubble.tsx
import type { UiMessage } from "@/lib/agentClient";

export function MessageBubble({ message }: { message: UiMessage }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[75%] rounded-lg px-3 py-2 font-sans text-sm ${isUser ? "bg-[#22C55E] text-[#0F172A]" : "bg-[#1E293B] text-[#F8FAFC] border border-[#475569]"}`}>
        {message.content}
      </div>
    </div>
  );
}
