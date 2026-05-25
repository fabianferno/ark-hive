// lib/wallet/useUserWallet.ts
// Arkiv walletClient (Braga) from the Privy embedded wallet for all Arkiv writes,
// + Privy's sendTransaction for the ERC-8004 mint on Eth Sepolia (prompts the
// embedded wallet), + a Sepolia public client for the mint receipt.
"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePrivy, useWallets, useSendTransaction } from "@privy-io/react-auth";
import { createWalletClient as createArkivWalletClient, createPublicClient as createArkivPublicClient, custom as arkivCustom, http as arkivHttp } from "@arkiv-network/sdk";
import { createPublicClient as createViemPublicClient, http as viemHttp, toHex } from "viem";
import { braga, sepolia, BRAGA_ID, SEPOLIA_ID } from "@/lib/wallet/chains";

export function useUserWallet() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  const { sendTransaction } = useSendTransaction();
  const wallet = wallets.find((w) => w.walletClientType === "privy") ?? wallets[0];
  const address = wallet?.address as `0x${string}` | undefined;

  const [arkivWallet, setArkivWallet] = useState<ReturnType<typeof createArkivWalletClient> | null>(null);

  // Stateless read clients — build once (a new ref each render would feed the loop).
  const publicArkiv = useMemo(() => createArkivPublicClient({ chain: braga, transport: arkivHttp() }), []);
  const publicSepolia = useMemo(() => createViemPublicClient({ chain: sepolia, transport: viemHttp() }), []);

  // Switch the embedded wallet's active chain (back to Braga after the mint).
  const switchChain = useCallback(async (id: number): Promise<void> => {
    if (!wallet) throw new Error("no wallet");
    await wallet.switchChain(id);
  }, [wallet]);

  // Sign a fixed message with the embedded wallet (personal_sign) to seed the
  // X25519 encryption key. Auto-signed (embeddedWallets.showWalletUIs=false).
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!wallet || !address) throw new Error("no wallet");
    const provider = await wallet.getEthereumProvider();
    return (await provider.request({ method: "personal_sign", params: [toHex(message), address] })) as string;
  }, [wallet, address]);

  // Build the Arkiv (Braga) wallet client ONLY when the address changes. Depending
  // on the Privy `wallet` object (fresh ref every render) re-runs this each render
  // and setState a new client → infinite render loop (froze the page).
  useEffect(() => {
    let active = true;
    if (!address) { setArkivWallet(null); return; }
    (async () => {
      const w = wallets.find((x) => x.walletClientType === "privy") ?? wallets[0];
      if (!w) return;
      try { await w.switchChain?.(BRAGA_ID); } catch { /* may already be on chain */ }
      const provider = await w.getEthereumProvider();
      if (!active) return;
      setArkivWallet(createArkivWalletClient({ chain: braga, transport: arkivCustom(provider), account: address }));
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return {
    ready,
    authenticated,
    login,
    logout,
    address,
    wallet,
    arkivWallet,
    publicArkiv,
    publicSepolia,
    sendTransaction,
    switchChain,
    signMessage,
    BRAGA_ID,
    SEPOLIA_ID,
  };
}
