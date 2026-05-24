// app/providers.tsx
"use client";
import { PrivyProvider } from "@privy-io/react-auth";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { braga, sepolia } from "@/lib/wallet/chains";

export function Providers({ children }: { children: ReactNode }) {
  const [qc] = useState(() => new QueryClient());
  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Embedded-wallet only: email/social login → app-managed wallet. Avoids
        // external connectors (e.g. Coinbase Smart Wallet) that reject Braga.
        loginMethods: ["email", "google"],
        embeddedWallets: { ethereum: { createOnLogin: "all-users" } },
        supportedChains: [braga as any, sepolia],
        defaultChain: braga as any,
        appearance: { theme: "dark", accentColor: "#22C55E", walletList: [] },
      }}
    >
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    </PrivyProvider>
  );
}
