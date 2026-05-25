// components/ui/IconChip.tsx
import type { ComponentType } from "react";
import type { GlowVariant } from "./GlowCard";

const ICON_COLOR: Record<GlowVariant, string> = {
  accent: "text-accent",
  neutral: "text-fg",
  danger: "text-danger",
  warning: "text-warning",
};

export function IconChip({
  icon: Icon,
  variant = "accent",
  size = 18,
  className = "",
}: {
  icon: ComponentType<{ size?: string | number; className?: string }>;
  variant?: GlowVariant;
  size?: number;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-border bg-white/[0.05] backdrop-blur-md ${className}`}
    >
      <Icon size={size} className={ICON_COLOR[variant]} />
    </span>
  );
}
