// components/app/ConnectBar.tsx
"use client";
import { useUserWallet } from "@/lib/wallet/useUserWallet";
import { Wallet, Copy, Droplet } from "lucide-react";

export function ConnectBar() {
  const { ready, authenticated, login, logout, address } = useUserWallet();
  if (!ready) return <span className="font-mono text-xs text-slate-400">…</span>;
  if (!authenticated)
    return (
      <button
        onClick={login}
        className="flex items-center gap-1 rounded bg-[#22C55E] px-3 py-1.5 font-sans text-sm font-medium text-[#0F172A]"
      >
        <Wallet size={14} /> Connect
      </button>
    );
  return (
    <div className="flex items-center gap-2 font-mono text-xs text-[#F8FAFC]">
      <span className="rounded bg-[#1E293B] px-2 py-1">
        {address?.slice(0, 6)}…{address?.slice(-4)}
      </span>
      <button
        title="Copy"
        onClick={() => address && navigator.clipboard.writeText(address)}
        className="text-slate-400 hover:text-[#F8FAFC]"
      >
        <Copy size={14} />
      </button>
      <a
        title="Claim GLM"
        href="https://braga.hoodi.arkiv.network/faucet/"
        target="_blank"
        rel="noreferrer"
        className="text-slate-400 hover:text-[#22C55E]"
      >
        <Droplet size={14} />
      </a>
      <button onClick={logout} className="text-slate-400 hover:text-[#EF4444]">
        logout
      </button>
    </div>
  );
}
