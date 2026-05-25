// components/ui/GlowCard.tsx
import type { ReactNode } from "react";

export type GlowVariant = "accent" | "neutral" | "danger" | "warning";

const GLOW_SHADOW: Record<GlowVariant, string> = {
  accent: "shadow-glow-accent",
  neutral: "shadow-glow-neutral",
  danger: "shadow-glow-danger",
  warning: "shadow-glow-warning",
};

// colored hairline across the top edge, like the reference cards
const TOP_LINE: Record<GlowVariant, string> = {
  accent: "via-accent/60",
  neutral: "via-white/30",
  danger: "via-danger/60",
  warning: "via-warning/60",
};

export function GlowCard({
  variant = "accent",
  glow = true,
  interactive = false,
  className = "",
  children,
}: {
  variant?: GlowVariant;
  glow?: boolean;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-border bg-surface backdrop-blur-xl ${
        glow ? GLOW_SHADOW[variant] : ""
      } ${
        interactive ? "transition-transform duration-200 will-change-transform hover:-translate-y-0.5" : ""
      } ${className}`}
    >
      <span
        aria-hidden
        className={`pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent ${TOP_LINE[variant]} to-transparent`}
      />
      {children}
    </div>
  );
}
