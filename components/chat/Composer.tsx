// components/chat/Composer.tsx
"use client";
import { Send } from "lucide-react";
import { useState } from "react";

export function Composer({ onSend, sending }: { onSend: (text: string) => void; sending: boolean }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(text.trim()); setText(""); } }}
      className="flex gap-2 border-t border-[#475569] p-3">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the agent…"
        className="flex-1 rounded border border-[#475569] bg-[#0F172A] px-3 py-2 font-sans text-sm text-[#F8FAFC]" />
      <button type="submit" disabled={sending} aria-label="Send"
        className="flex items-center gap-1 rounded bg-[#22C55E] px-3 py-2 font-sans text-sm font-medium text-[#0F172A] disabled:opacity-40">
        <Send size={16} /> Send
      </button>
    </form>
  );
}
