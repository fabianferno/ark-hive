// components/chat/Composer.tsx
"use client";
import { Send } from "lucide-react";
import { useState } from "react";

export function Composer({ onSend, sending }: { onSend: (text: string) => void; sending: boolean }) {
  const [text, setText] = useState("");
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (text.trim()) { onSend(text.trim()); setText(""); } }}
      className="flex gap-2 border-t border-border p-3">
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Message the agent…"
        className="input flex-1" />
      <button type="submit" disabled={sending} aria-label="Send" className="btn-primary">
        <Send size={16} /> Send
      </button>
    </form>
  );
}
