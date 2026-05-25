// components/ens/EnsBadge.tsx
"use client";
import { useState } from "react";
import { Copy, Check } from "lucide-react";

export function EnsBadge({ name, className = "" }: { name: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(name).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border border-accent/30 bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent ${className}`}
    >
      {name}
      <button
        type="button"
        onClick={handleCopy}
        aria-label={copied ? "Copied" : "Copy ENS name"}
        className="ml-0.5 rounded p-0.5 transition-colors hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent"
      >
        {copied ? <Check size={11} /> : <Copy size={11} />}
      </button>
    </span>
  );
}
