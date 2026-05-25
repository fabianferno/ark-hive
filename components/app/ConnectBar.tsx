// components/app/ConnectBar.tsx
"use client";
import { useUserWallet } from "@/lib/wallet/useUserWallet";
import { useWalletBalance } from "@/lib/hooks/useWalletBalance";
import { Wallet, Copy, Droplet } from "lucide-react";

export function ConnectBar() {
  const { ready, authenticated, login, logout, address } = useUserWallet();
  const { formatted: balance, isLoading: balanceLoading } = useWalletBalance();
  if (!ready) return <span className="font-mono text-xs text-fg-muted">…</span>;
  if (!authenticated)
    return (
      <button onClick={login} className="btn-primary px-3 py-1.5">
        <Wallet size={14} /> Connect
      </button>
    );
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-fg">
      <span className="rounded-lg border border-border bg-white/[0.03] px-2 py-1 text-accent">
        {balanceLoading ? "…" : balance ?? "—"}
      </span>
      <span className="rounded-lg border border-border bg-white/[0.03] px-2 py-1">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button
        title="Copy"
        onClick={() => address && navigator.clipboard.writeText(address)}
        className="text-fg-muted transition-colors hover:text-fg"
      >
        <Copy size={14} />
      </button>
      <a
        title="Claim GLM"
        href="https://braga.hoodi.arkiv.network/faucet/"
        target="_blank"
        rel="noreferrer"
        className="text-fg-muted transition-colors hover:text-accent"
      >
        <Droplet size={14} />
      </a>
      <button onClick={logout} className="text-fg-muted transition-colors hover:text-danger">
        logout
      </button>
    </div>
  );
}
