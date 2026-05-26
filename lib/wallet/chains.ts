// lib/wallet/chains.ts
// Braga from the Arkiv SDK. Sepolia defined inline (do NOT import from "viem/chains":
// that barrel pulls ox/tempo with a broken dynamic require that crashes client hydration).
import { braga as bragaSdk } from "@arkiv-network/sdk/chains";
import { defineChain } from "viem";

// Route all Braga RPC traffic through the same-origin Next proxy (`/arkiv-rpc`)
// because the public braga.hoodi.arkiv.network endpoint blocks browser POSTs
// with a CORS/WAF 403. The proxy forwards server-side. Falls back to localhost
// in SSR (process.env.ARKIV_RPC overrides server-side).
const ARKIV_RPC = typeof window !== "undefined"
  ? `${window.location.origin}/arkiv-rpc`
  : (process.env.ARKIV_RPC ?? "http://localhost:3000/arkiv-rpc");

export const braga = {
  ...bragaSdk,
  rpcUrls: { default: { http: [ARKIV_RPC] } },
};

export const sepolia = defineChain({
  id: 11155111,
  name: "Ethereum Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://ethereum-sepolia-rpc.publicnode.com"] },
  },
  blockExplorers: {
    default: { name: "Etherscan", url: "https://sepolia.etherscan.io" },
  },
  testnet: true,
});

export const baseSepolia = defineChain({
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Sepolia Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: ["https://sepolia.base.org"] } },
  blockExplorers: { default: { name: "Basescan", url: "https://sepolia.basescan.org" } },
  testnet: true,
});

export const BRAGA_ID = 60138453102;
export const SEPOLIA_ID = 11155111;
export const BASE_SEPOLIA_ID = 84532;
// Circle USDC on Base Sepolia (6 decimals) — the x402 default test asset.
export const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as const;
