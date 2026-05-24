"use client";
import Link from "next/link";
import { Bot, Search, Network, BookOpen, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { ConnectBar } from "@/components/app/ConnectBar";
import { useUserWallet } from "@/lib/wallet/useUserWallet";

const NAV = [
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/memory", label: "Memory", icon: Search },
  { href: "/visualizer", label: "Visualizer", icon: Network },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, authenticated, login } = useUserWallet();

  if (!ready) {
    return (
      <div className="flex h-dvh w-full items-center justify-center bg-[#0F172A] text-slate-400 font-mono text-sm">
        Loading…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex h-dvh w-full flex-col items-center justify-center gap-5 bg-[#0F172A] text-[#F8FAFC]">
        <div className="font-mono text-2xl font-semibold tracking-tight">AgentState</div>
        <p className="max-w-sm text-center font-sans text-sm text-slate-400">
          Connect your wallet to register agents, chat, and manage memory on Arkiv. Every action is signed by your own wallet.
        </p>
        <button
          onClick={login}
          className="flex items-center gap-2 rounded bg-[#22C55E] px-5 py-2.5 font-sans text-sm font-medium text-[#0F172A]"
        >
          <Wallet size={16} /> Connect Wallet
        </button>
      </div>
    );
  }

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
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-end border-b border-[#475569] bg-[#1E293B] px-4 py-2">
          <ConnectBar />
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
