// components/app/AppShell.tsx
import Link from "next/link";
import { Bot, Search, Network } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/memory", label: "Memory", icon: Search },
  { href: "/visualizer", label: "Visualizer", icon: Network },
];

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh w-full bg-[#0F172A] text-[#F8FAFC]">
      <nav className="flex w-52 flex-col gap-1 border-r border-[#475569] bg-[#1E293B] p-3">
        <div className="mb-4 px-2 font-mono text-sm font-semibold tracking-tight">AgentState</div>
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link key={href} href={href}
            className="flex items-center gap-2 rounded px-2 py-2 font-sans text-sm text-slate-300 hover:bg-[#272F42] hover:text-[#F8FAFC]">
            <Icon size={16} /> {label}
          </Link>
        ))}
      </nav>
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
