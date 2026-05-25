"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bot, Search, Network, BookOpen, Wallet } from "lucide-react";
import type { ReactNode } from "react";
import { ConnectBar } from "@/components/app/ConnectBar";
import { AppBrand } from "@/components/app/AppBrand";
import { GlowCard } from "@/components/ui/GlowCard";
import { useUserWallet } from "@/lib/wallet/useUserWallet";

const NAV = [
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/memory", label: "Memory", icon: Search },
  { href: "/visualizer", label: "Visualizer", icon: Network },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { ready, authenticated, login } = useUserWallet();
  const pathname = usePathname();

  if (!ready) {
    return (
      <div className="flex h-dvh w-full items-center justify-center font-mono text-sm text-fg-muted">
        Loading…
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="flex h-dvh w-full items-center justify-center p-6">
        <GlowCard variant="accent" className="w-full max-w-md p-8 text-center">
          <div className="flex justify-center">
            <AppBrand size="lg" />
          </div>
          <p className="mx-auto mt-4 max-w-sm font-sans text-sm text-fg-muted">
            Connect your wallet to register agents, chat, and manage memory on Arkiv. Every action is signed by your own wallet.
          </p>
          <button onClick={login} className="btn-primary mx-auto mt-6">
            <Wallet size={16} /> Connect Wallet
          </button>
        </GlowCard>
      </div>
    );
  }

  return (
    <div className="flex h-dvh w-full">
      <nav className="m-2 flex w-52 flex-col gap-1 rounded-2xl border border-border bg-surface p-3 backdrop-blur-xl">
        <div className="mb-4 px-2 pt-1">
          <AppBrand />
        </div>
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (pathname?.startsWith(`${href}/`) ?? false);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2 rounded-lg px-2.5 py-2 font-sans text-sm transition-colors ${
                active
                  ? "border border-accent/30 bg-accent/10 text-fg shadow-[inset_0_0_24px_-12px_rgb(var(--accent-rgb)/0.5)]"
                  : "text-fg-muted hover:bg-surface-2 hover:text-fg"
              }`}
            >
              <Icon size={16} className={active ? "text-accent" : undefined} /> {label}
            </Link>
          );
        })}
      </nav>
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-end border-b border-border px-4 py-2.5">
          <ConnectBar />
        </header>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  );
}
